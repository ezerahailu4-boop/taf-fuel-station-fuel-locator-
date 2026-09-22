import type { Role } from "@/lib/auth/rbac";
import type { TelegramUser } from "@/lib/telegram/validateInitData";

/** Domain user, decoupled from Prisma types so services are unit-testable without a database. */
export interface AuthUser {
  id: string;
  telegramUserId: bigint;
  firstName: string;
  lastName: string | null;
  username: string | null;
  preferredLocale: string;
  role: Role;
  isActive: boolean;
  stationId: string | null;
}

export interface PublicUser {
  id: string;
  telegramUserId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  preferredLocale: string;
  role: Role;
  stationId: string | null;
}

export function toPublicUser(u: AuthUser): PublicUser {
  return {
    id: u.id,
    telegramUserId: u.telegramUserId.toString(),
    firstName: u.firstName,
    lastName: u.lastName,
    username: u.username,
    preferredLocale: u.preferredLocale,
    role: u.role,
    stationId: u.stationId,
  };
}

export interface UserRepo {
  /** Creates a CUSTOMER if the Telegram user is new; otherwise refreshes profile fields + last login. */
  upsertFromTelegram(user: TelegramUser, now: Date): Promise<AuthUser>;
  findById(id: string): Promise<AuthUser | null>;
  findByTelegramId(telegramUserId: bigint): Promise<AuthUser | null>;
  touchLogin(id: string, now: Date): Promise<void>;
}

export interface LoginCodeRepo {
  invalidateActive(userId: string, now: Date): Promise<void>;
  create(input: { userId: string; codeHash: string; expiresAt: Date }): Promise<void>;
  findLatestActive(userId: string, now: Date, maxAttempts: number): Promise<{ id: string; codeHash: string } | null>;
  incrementAttempts(id: string): Promise<void>;
  /** Atomic: returns true only for the single caller that consumed the code. */
  consume(id: string, now: Date): Promise<boolean>;
}

export interface ActivityEntry {
  actorUserId: string | null;
  stationId: string | null;
  action: string;
  entity: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string | null;
}

export interface ActivityRepo {
  log(entry: ActivityEntry): Promise<void>;
}
