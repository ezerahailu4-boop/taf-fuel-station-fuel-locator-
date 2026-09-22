import type { AuthUser } from "@/types/auth";
import type { Actor } from "./rbac";

export const toActor = (u: AuthUser): Actor => ({ id: u.id, role: u.role, stationId: u.stationId });
