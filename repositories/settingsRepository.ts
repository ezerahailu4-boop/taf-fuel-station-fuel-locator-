import { getDb } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { SettingsRepo } from "@/types/stations";

const TTL_MS = 30_000;
const cache = new Map<string, { at: number; value: unknown }>();

/** In-memory cached settings repository. */
export const settingsRepository: SettingsRepo = {
  async getMany(keys) {
    const now = Date.now();
    const out: Record<string, unknown> = {};
    const missing: string[] = [];
    for (const k of keys) {
      const hit = cache.get(k);
      if (hit && now - hit.at < TTL_MS) out[k] = hit.value;
      else missing.push(k);
    }
    if (missing.length > 0) {
      const rows = await getDb().setting.findMany({ where: { key: { in: missing } } });
      for (const r of rows) {
        out[r.key] = r.value;
        cache.set(r.key, { at: now, value: r.value });
      }
    }
    return out;
  },

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await getDb().setting.findMany();
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      out[r.key] = r.value;
      cache.set(r.key, { at: Date.now(), value: r.value });
    }
    return out;
  },

  async setMany(updates: Record<string, unknown>): Promise<void> {
    const db = getDb();
    await db.$transaction(
      Object.entries(updates).map(([key, value]) =>
        db.setting.upsert({
          where: { key },
          update: { value: value as Prisma.InputJsonValue },
          create: { key, value: value as Prisma.InputJsonValue },
        })
      )
    );
    cache.clear();
  },
};

export function invalidateSettingsCache() {
  cache.clear();
}
