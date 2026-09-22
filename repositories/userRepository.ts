import { getDb } from "@/lib/db";
import type { AuthUser, UserRepo } from "@/types/auth";
import type { Role } from "@/lib/auth/rbac";

const include = { stationAdmin: { select: { stationId: true } } } as const;

type Row = NonNullable<Awaited<ReturnType<typeof findRow>>>;

function findRow(where: { id: string } | { telegramUserId: bigint }) {
  return getDb().user.findUnique({ where, include });
}

function map(u: Row): AuthUser {
  return {
    id: u.id,
    telegramUserId: u.telegramUserId,
    firstName: u.firstName,
    lastName: u.lastName,
    username: u.username,
    preferredLocale: u.preferredLocale,
    role: u.role as Role,
    isActive: u.isActive,
    stationId: u.stationAdmin?.stationId ?? null,
  };
}

export const userRepository: UserRepo = {
  async upsertFromTelegram(tg, now) {
    const telegramUserId = BigInt(tg.id);
    const row = await getDb().user.upsert({
      where: { telegramUserId },
      create: {
        telegramUserId,
        firstName: tg.first_name,
        lastName: tg.last_name ?? null,
        username: tg.username ?? null,
        languageCode: tg.language_code ?? null,
        preferredLocale: tg.language_code?.toLowerCase().startsWith("am") ? "am" : "en",
        lastLoginAt: now,
      },
      // preferredLocale is deliberately NOT overwritten: the user's choice wins after first login.
      update: {
        firstName: tg.first_name,
        lastName: tg.last_name ?? null,
        username: tg.username ?? null,
        languageCode: tg.language_code ?? null,
        lastLoginAt: now,
      },
      include,
    });
    return map(row);
  },

  async findById(id) {
    const row = await findRow({ id });
    return row ? map(row) : null;
  },

  async findByTelegramId(telegramUserId) {
    const row = await findRow({ telegramUserId });
    return row ? map(row) : null;
  },

  async touchLogin(id, now) {
    await getDb().user.update({ where: { id }, data: { lastLoginAt: now } });
  },
};
