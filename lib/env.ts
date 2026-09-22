import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(10),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16).regex(/^[A-Za-z0-9_-]+$/, "Only A-Z a-z 0-9 _ - allowed"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  INIT_DATA_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(86_400),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(43_200),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated server env. Throws a readable error at first use if anything is missing. */
export function getEnv(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid environment configuration: ${problems}`);
    }
    cached = parsed.data;
  }
  return cached;
}
