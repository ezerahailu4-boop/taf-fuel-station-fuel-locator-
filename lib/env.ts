import { z } from "zod";

const DEFAULT_BOT_TOKEN = "8837896206:AAEZjh_QyBOvNJTfRFue2hrhQ4hrsJ0LPKM";
const DEFAULT_WEBHOOK_SECRET = "taf_fuel_secret_webhook_key_2026_secure";
const DEFAULT_SESSION_SECRET = "e9a7c3b2f8a14d5e6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a";
const DEFAULT_DATABASE_URL =
  "postgresql://postgres.paafawytsvsinbyywayr:HmK5Kc3vqeFG0e6H@aws-1-eu-west-1.pooler.supabase.com:6543/postgres";
const DEFAULT_APP_URL = "https://taf-fuel-station-fuel-locator.vercel.app";

const normalizeString = (fallback: string, minLen: number) => (val: unknown) => {
  if (typeof val !== "string" || val.trim().length < minLen) return fallback;
  return val.trim();
};

const normalizeUrl = (val: unknown) => {
  if (typeof val !== "string" || !val.trim()) return DEFAULT_APP_URL;
  const s = val.trim();
  return s.startsWith("http://") || s.startsWith("https://") ? s : `https://${s}`;
};

const normalizePositive = (fallback: number) => (val: unknown) => {
  if (val === undefined || val === null || val === "") return fallback;
  const num = Number(val);
  return isNaN(num) || num <= 0 ? fallback : Math.floor(num);
};

const schema = z.object({
  DATABASE_URL: z.preprocess(normalizeString(DEFAULT_DATABASE_URL, 10), z.string().min(1)),
  TELEGRAM_BOT_TOKEN: z.preprocess(normalizeString(DEFAULT_BOT_TOKEN, 10), z.string().min(10)),
  TELEGRAM_BOT_USERNAME: z.string().optional().default("taf_fuel_bot"),
  TELEGRAM_WEBHOOK_SECRET: z.preprocess(normalizeString(DEFAULT_WEBHOOK_SECRET, 16), z.string().min(16)),
  NEXT_PUBLIC_APP_URL: z.preprocess(normalizeUrl, z.string().url()),
  SESSION_SECRET: z.preprocess(normalizeString(DEFAULT_SESSION_SECRET, 32), z.string().min(32)),
  INIT_DATA_MAX_AGE_SECONDS: z.preprocess(normalizePositive(86_400), z.number().int().positive()),
  SESSION_TTL_SECONDS: z.preprocess(normalizePositive(43_200), z.number().int().positive()),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated server env with safe production defaults. */
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
