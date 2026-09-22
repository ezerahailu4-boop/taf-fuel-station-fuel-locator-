import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient; __pool?: Pool };

/** Prisma singleton over the pooled Supabase connection (DATABASE_URL). */
export function getDb(): PrismaClient {
  if (!globalForPrisma.__prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");

    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 10000,
    });
    globalForPrisma.__pool = pool;

    globalForPrisma.__prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
    });
  }
  return globalForPrisma.__prisma;
}
