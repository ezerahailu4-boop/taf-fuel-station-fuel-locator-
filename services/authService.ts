import { forbidden, unauthorized } from "@/lib/api/errors";
import { codeMatches, generateCode, hashCode, OTP_MAX_ATTEMPTS, OTP_TTL_MS } from "@/lib/auth/otp";
import { isStaff } from "@/lib/auth/rbac";
import { signSession } from "@/lib/auth/session";
import { LoginWidgetError, verifyLoginWidget } from "@/lib/telegram/loginWidget";
import { InitDataError, validateInitData } from "@/lib/telegram/validateInitData";
import { toPublicUser, type LoginCodeRepo, type PublicUser, type UserRepo } from "@/types/auth";

export interface AuthDeps {
  users: UserRepo;
  codes: LoginCodeRepo;
  botToken: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
  initDataMaxAgeSeconds: number;
  sendMessage: (chatId: number, text: string) => Promise<void>;
  now?: () => Date;
}

export interface LoginResult {
  token: string;
  user: PublicUser;
  expiresInSeconds: number;
}

const clock = (d: AuthDeps) => (d.now ?? (() => new Date()))();

async function issue(d: AuthDeps, user: Parameters<typeof toPublicUser>[0]): Promise<LoginResult> {
  const token = await signSession(user.id, d.sessionSecret, d.sessionTtlSeconds);
  return { token, user: toPublicUser(user), expiresInSeconds: d.sessionTtlSeconds };
}

/** Customers (and staff) opening the Mini App. Server-side validation only. */
export async function loginWithInitData(d: AuthDeps, initData: string): Promise<LoginResult> {
  let validated;
  try {
    validated = validateInitData(initData, {
      botToken: d.botToken,
      maxAgeSeconds: d.initDataMaxAgeSeconds,
      now: () => clock(d).getTime(),
    });
  } catch (err) {
    if (err instanceof InitDataError) throw unauthorized("Telegram authentication failed");
    throw err;
  }
  const user = await d.users.upsertFromTelegram(validated.user, clock(d));
  if (!user.isActive) throw forbidden("This account has been disabled");
  return issue(d, user);
}

/** Web admin via Telegram Login Widget. Staff only; unknown users get the same generic error. */
export async function loginWithWidget(
  d: AuthDeps,
  payload: Record<string, string | number>,
): Promise<LoginResult> {
  let verified;
  try {
    verified = verifyLoginWidget(payload, { botToken: d.botToken, now: () => clock(d).getTime() });
  } catch (err) {
    if (err instanceof LoginWidgetError) throw unauthorized("Telegram authentication failed");
    throw err;
  }
  const user = await d.users.findByTelegramId(BigInt(verified.user.id));
  if (!user || !user.isActive || !isStaff(user.role)) throw forbidden("This Telegram account is not an administrator");
  await d.users.touchLogin(user.id, clock(d));
  return issue(d, user);
}

/**
 * Sends a 6-digit one-time code via the bot to a known, active staff member.
 * Always resolves the same way to avoid revealing which Telegram IDs are administrators.
 */
export async function requestLoginCode(d: AuthDeps, telegramUserId: bigint): Promise<void> {
  const user = await d.users.findByTelegramId(telegramUserId);
  if (!user || !user.isActive || !isStaff(user.role)) return;

  const now = clock(d);
  await d.codes.invalidateActive(user.id, now);
  const code = generateCode();
  await d.codes.create({
    userId: user.id,
    codeHash: hashCode(code, user.id, d.sessionSecret),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
  });
  try {
    await d.sendMessage(
      Number(user.telegramUserId),
      `Your TAF admin login code: ${code}\nIt expires in 10 minutes. If you did not request it, ignore this message.`,
    );
  } catch (err) {
    console.error("[auth] failed to deliver login code", err instanceof Error ? err.message : err);
  }
}

export async function verifyLoginCode(d: AuthDeps, telegramUserId: bigint, code: string): Promise<LoginResult> {
  const fail = () => unauthorized("Invalid or expired code");
  const now = clock(d);

  const user = await d.users.findByTelegramId(telegramUserId);
  if (!user || !user.isActive || !isStaff(user.role)) throw fail();

  const active = await d.codes.findLatestActive(user.id, now, OTP_MAX_ATTEMPTS);
  if (!active) throw fail();

  // Count the attempt BEFORE comparing so parallel guesses cannot bypass the limit.
  await d.codes.incrementAttempts(active.id);
  if (!codeMatches(code, user.id, d.sessionSecret, active.codeHash)) throw fail();

  const consumed = await d.codes.consume(active.id, now);
  if (!consumed) throw fail();

  await d.users.touchLogin(user.id, now);
  return issue(d, user);
}
