import type { ActivityServiceDeps } from "@/services/activityService";
import type { ActivityRepo } from "@/types/auth";
import type { ActivityReadRepo } from "@/types/stations";

export const activityDepsFor = (read: ActivityReadRepo, activity: ActivityRepo): ActivityServiceDeps => ({ read, activity });
