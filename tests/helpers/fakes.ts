import type { AuthUser, LoginCodeRepo, UserRepo, ActivityRepo, ActivityEntry } from "@/types/auth";
import type { TelegramUser } from "@/lib/telegram/validateInitData";

export function makeUser(over: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "u-1",
    telegramUserId: 42n,
    firstName: "Abebe",
    lastName: null,
    username: null,
    preferredLocale: "en",
    role: "CUSTOMER",
    isActive: true,
    stationId: null,
    ...over,
  };
}

export class FakeUserRepo implements UserRepo {
  users = new Map<string, AuthUser>();
  constructor(initial: AuthUser[] = []) {
    for (const u of initial) this.users.set(u.id, u);
  }
  async upsertFromTelegram(tg: TelegramUser): Promise<AuthUser> {
    const existing = [...this.users.values()].find((u) => u.telegramUserId === BigInt(tg.id));
    if (existing) {
      existing.firstName = tg.first_name;
      return existing;
    }
    const u = makeUser({
      id: `u-${this.users.size + 1}`,
      telegramUserId: BigInt(tg.id),
      firstName: tg.first_name,
      preferredLocale: tg.language_code?.startsWith("am") ? "am" : "en",
    });
    this.users.set(u.id, u);
    return u;
  }
  async findById(id: string) {
    return this.users.get(id) ?? null;
  }
  async findByTelegramId(id: bigint) {
    return [...this.users.values()].find((u) => u.telegramUserId === id) ?? null;
  }
  async touchLogin() {}
  async recordBotUser(input: {
    id: number | bigint;
    first_name: string;
    last_name?: string | null;
    username?: string | null;
    language_code?: string | null;
  }) {
    const tgId = BigInt(input.id);
    const existing = [...this.users.values()].find((u) => u.telegramUserId === tgId);
    if (existing) {
      existing.firstName = input.first_name;
      return { user: existing, isFirstTime: false, totalUsers: this.users.size };
    }
    const u = makeUser({
      id: `u-${this.users.size + 1}`,
      telegramUserId: tgId,
      firstName: input.first_name,
      lastName: input.last_name ?? null,
      username: input.username ?? null,
      preferredLocale: input.language_code?.startsWith("am") ? "am" : "en",
    });
    this.users.set(u.id, u);
    return { user: u, isFirstTime: true, totalUsers: this.users.size };
  }
  async getTotalUserCount() {
    return this.users.size;
  }
  async getSuperAdminTelegramIds() {
    return [2074368152n];
  }
}

interface CodeRow {
  id: string;
  userId: string;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attempts: number;
  createdAt: number;
}

export class FakeLoginCodeRepo implements LoginCodeRepo {
  rows: CodeRow[] = [];
  private seq = 0;
  async invalidateActive(userId: string, now: Date) {
    for (const r of this.rows) if (r.userId === userId && !r.consumedAt && r.expiresAt > now) r.consumedAt = now;
  }
  async create(i: { userId: string; codeHash: string; expiresAt: Date }) {
    this.rows.push({ id: `c-${++this.seq}`, ...i, consumedAt: null, attempts: 0, createdAt: this.seq });
  }
  async findLatestActive(userId: string, now: Date, max: number) {
    const r = this.rows
      .filter((x) => x.userId === userId && !x.consumedAt && x.expiresAt > now && x.attempts < max)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    return r ? { id: r.id, codeHash: r.codeHash } : null;
  }
  async incrementAttempts(id: string) {
    this.rows.find((r) => r.id === id)!.attempts++;
  }
  async consume(id: string, now: Date) {
    const r = this.rows.find((x) => x.id === id)!;
    if (r.consumedAt) return false;
    r.consumedAt = now;
    return true;
  }
}

export class FakeActivityRepo implements ActivityRepo {
  entries: ActivityEntry[] = [];
  async log(e: ActivityEntry) {
    this.entries.push(e);
  }
}
