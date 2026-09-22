import { z } from "zod";

const normalizeUrl = (val: unknown) => {
  if (typeof val !== "string" || !val.trim()) return "https://taf-fuel-station-fuel-locator.vercel.app";
  const s = val.trim();
  return s.startsWith("http://") || s.startsWith("https://") ? s : `https://${s}`;
};

const normalizePositive = (fallback: number) => (val: unknown) => {
  if (val === undefined || val === null || val === "") return fallback;
  const num = Number(val);
  return isNaN(num) || num <= 0 ? fallback : Math.floor(num);
};

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(10),
  TELEGRAM_BOT_USERNAME: z.string().optional().default("taf_fuel_bot"),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16).default("taf_fuel_secret_webhook_key_2026_secure"),
  NEXT_PUBLIC_APP_URL: z.preprocess(normalizeUrl, z.string().url()),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters").default("e9a7c3b2f8a14d5e6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a"),
  INIT_DATA_MAX_AGE_SECONDS: z.preprocess(normalizePositive(86_400), z.number().int().positive()),
  SESSION_TTL_SECONDS: z.preprocess(normalizePositive(43_200), z.number().int().positive()),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated server env. Throws a readable error at first use if anything is missing. */
export function getEnv(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      console.error(`[env] Invalid environment configuration: ${problems}`);
      throw new Error(`Invalid environment configuration: ${problems}`);
    }
    cached = parsed.data;
  }
  return cached;
}
