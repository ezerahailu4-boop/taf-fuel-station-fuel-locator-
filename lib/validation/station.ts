import { z } from "zod";
import { FUEL_STATUSES, SETTABLE_FUEL_STATUSES, STATION_STATUSES } from "@/lib/fuel/enums";

export const uuid = z.string().regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, "Invalid UUID");

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const timeRange = z.tuple([z.string().regex(HHMM), z.string().regex(HHMM)]);
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** { "is24h": true }  OR  { "mon": [["06:00","22:00"]], "tue": [...], ... } */
export const openingHoursSchema = z.union([
  z.object({ is24h: z.literal(true) }).strict(),
  z
    .object(Object.fromEntries(DAYS.map((d) => [d, z.array(timeRange).max(4).optional()])) as Record<
      (typeof DAYS)[number],
      z.ZodOptional<z.ZodArray<typeof timeRange>>
    >)
    .strict()
    .refine((o) => Object.keys(o).length > 0, "Provide at least one day or is24h"),
]);

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{6,20}$/, "Invalid phone number");

const text = (max: number) => z.string().trim().min(1).max(max);

export const stationFields = {
  name: text(120),
  branchName: text(120),
  address: text(300),
  city: text(80),
  area: text(80).nullish(),
  phone: phone.nullish(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  openingHours: openingHoursSchema,
  status: z.enum(STATION_STATUSES),
  services: z.array(text(60)).max(20),
  isActive: z.boolean(),
};

export const stationCreateSchema = z.object({
  ...stationFields,
  area: stationFields.area.default(null),
  phone: stationFields.phone.default(null),
  openingHours: stationFields.openingHours.default({ is24h: true }),
  status: stationFields.status.default("OPEN"),
  services: stationFields.services.default([]),
  isActive: stationFields.isActive.default(true),
});
export type StationCreateInput = z.infer<typeof stationCreateSchema>;

export const stationUpdateSchema = z
  .object(stationFields)
  .partial()
  .refine((o) => Object.keys(o).length > 0, "Provide at least one field to update");
export type StationUpdateInput = z.infer<typeof stationUpdateSchema>;

export const stationListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  area: z.string().trim().max(80).optional(),
  status: z.enum(STATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type StationListQuery = z.infer<typeof stationListQuerySchema>;

export const availabilityUpdateSchema = z
  .object({
    stationId: uuid.optional(),
    stationStatus: z.enum(STATION_STATUSES).optional(),
    fuels: z
      .array(
        z.object({
          fuelTypeId: uuid,
          status: z.enum(SETTABLE_FUEL_STATUSES),
          note: z.string().trim().max(200).nullish(),
        }),
      )
      .max(20)
      .default([]),
  })
  .refine((o) => o.fuels.length > 0 || o.stationStatus !== undefined, "Nothing to update");
export type AvailabilityUpdateInput = z.infer<typeof availabilityUpdateSchema>;

export const confirmSchema = z.object({ stationId: uuid.optional() });

export const assignAdminSchema = z.object({
  telegramUserId: z.string().regex(/^\d{1,15}$/, "Telegram user ID must be numeric"),
  firstName: z.string().trim().min(1).max(80).optional(),
});

export const activityQuerySchema = z.object({
  stationId: uuid.optional(),
  action: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export const fuelTypeCreateSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, digits and dashes").max(40),
  nameEn: text(60),
  nameAm: text(60),
  icon: z.string().trim().min(1).max(8).default("⛽"),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).max(1000).default(0),
});
export const fuelTypeUpdateSchema = fuelTypeCreateSchema
  .partial()
  .refine((o) => Object.keys(o).length > 0, "Provide at least one field to update");

export { FUEL_STATUSES };

export const nearbyBodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().positive().max(100).optional(),
  /** fuel slug, e.g. "diesel" */
  fuel: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40).optional(),
  openOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type NearbyBody = z.infer<typeof nearbyBodySchema>;

export const analyticsEventSchema = z.object({
  event: z.enum(["station_view", "fuel_search", "app_open"]),
  stationId: uuid.optional(),
  fuelSlug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40).optional(),
});
