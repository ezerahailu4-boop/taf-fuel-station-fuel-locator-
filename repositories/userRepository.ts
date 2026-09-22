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

  async recordBotUser(input) {
    const telegramUserId = BigInt(input.id);
    const db = getDb();
    const existing = await db.user.findUnique({
      where: { telegramUserId },
      include,
    });

    const isFirstTime = !existing || existing.lastLoginAt === null;
    const now = new Date();

    let row;
    if (!existing) {
      row = await db.user.create({
        data: {
          telegramUserId,
          firstName: input.first_name || "Customer",
          lastName: input.last_name ?? null,
          username: input.username ?? null,
          languageCode: input.language_code ?? null,
          preferredLocale: input.language_code?.toLowerCase().startsWith("am") ? "am" : "en",
          role: "CUSTOMER",
          isActive: true,
          lastLoginAt: now,
        },
        include,
      });

      // Background activity log
      db.activityLog
        .create({
          data: {
            actorUserId: row.id,
            action: "USER_STARTED_BOT",
            entity: "USER",
            newValue: {
              telegramUserId: telegramUserId.toString(),
              name: `${input.first_name || ""} ${input.last_name || ""}`.trim(),
              username: input.username ?? null,
            },
          },
        })
        .catch((err) => {
          console.warn("[userRepo] Failed to log user start activity:", err);
        });
    } else {
      row = await db.user.update({
        where: { telegramUserId },
        data: {
          firstName: input.first_name || existing.firstName,
          lastName: input.last_name !== undefined ? input.last_name : existing.lastName,
          username: input.username !== undefined ? input.username : existing.username,
          languageCode: input.language_code !== undefined ? input.language_code : existing.languageCode,
          lastLoginAt: now,
        },
        include,
      });
    }

    const totalUsers = await db.user.count({ where: { isActive: true } });

    return {
      user: map(row),
      isFirstTime,
      totalUsers,
    };
  },

  async getTotalUserCount() {
    return getDb().user.count({ where: { isActive: true } });
  },

  async getSuperAdminTelegramIds() {
    const ids = new Set<bigint>();
    const envSuperAdmin =
      process.env.SUPER_ADMIN_TELEGRAM_ID ||
      process.env.SEED_SUPER_ADMIN_TELEGRAM_ID ||
      "2074368152";
    if (envSuperAdmin && /^\d+$/.test(envSuperAdmin)) {
      ids.add(BigInt(envSuperAdmin));
    }
    try {
      const superAdmins = await getDb().user.findMany({
        where: { role: "SUPER_ADMIN", isActive: true },
        select: { telegramUserId: true },
      });
      for (const sa of superAdmins) {
        ids.add(sa.telegramUserId);
      }
    } catch (e) {
      console.warn("[userRepo] Could not query superadmins from db:", e);
    }
    return Array.from(ids);
  },
};
