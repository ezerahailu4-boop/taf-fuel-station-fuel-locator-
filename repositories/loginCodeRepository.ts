import { getDb } from "@/lib/db";
import type { LoginCodeRepo } from "@/types/auth";

export const loginCodeRepository: LoginCodeRepo = {
  async invalidateActive(userId, now) {
    await getDb().loginCode.updateMany({
      where: { userId, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
  },

  async create({ userId, codeHash, expiresAt }) {
    await getDb().loginCode.create({ data: { userId, codeHash, expiresAt } });
  },

  async findLatestActive(userId, now, maxAttempts) {
    const row = await getDb().loginCode.findFirst({
      where: { userId, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: maxAttempts } },
      orderBy: { createdAt: "desc" },
      select: { id: true, codeHash: true },
    });
    return row;
  },

  async incrementAttempts(id) {
    await getDb().loginCode.update({ where: { id }, data: { attempts: { increment: 1 } } });
  },

  async consume(id, now) {
    const res = await getDb().loginCode.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: now },
    });
    return res.count === 1;
  },
};
