import { getEnv } from "@/lib/env";
import { userRepository } from "@/repositories/userRepository";
import { authenticate } from "./guards";

/** Convenience wrapper for route handlers. */
export function getCurrentUser(req: Request) {
  const env = getEnv();
  return authenticate(req, {
    users: userRepository,
    sessionSecret: env.SESSION_SECRET,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  });
}
