/**
 * Seed script for TAF Fuel Station.
 * Stations and fuels are created/updated in the database.
 * Run: npm run db:seed
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { FuelStatus, PrismaClient, Role, StationStatus } from "../generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DIRECT_URL or DATABASE_URL before seeding");
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

function telegramId(name: string, fallback: string): bigint {
  const raw = process.env[name] ?? fallback;
  if (!/^\d{1,15}$/.test(raw)) throw new Error(`${name} must be a numeric Telegram user ID`);
  return BigInt(raw);
}

const FUELS = [
  { slug: "benzine", nameEn: "Benzine", nameAm: "ቤንዚን", icon: "⛽", displayOrder: 1 },
  { slug: "diesel", nameEn: "Diesel", nameAm: "ናፍጣ", icon: "⛽", displayOrder: 2 },
  // { slug: "kerosene", nameEn: "Kerosene", nameAm: "ነጭ ጋዝ", icon: "⛽", displayOrder: 3 },
];

// Production branch location specified: Tollroad TAF Station (Adama-Finfinee Rest Stop)
const STATIONS = [
  {
    key: "tollroad",
    name: "Tollroad TAF Station",
    branchName: "Tollroad",
    area: "Adama-Finfinee Expressway",
    city: "Adama",
    address: "Adama-Finfinee Rest Stop, Expressway, Oromia, Ethiopia",
    lat: 8.751643,
    lng: 39.0160711,
    phone: "+251911000000",
    services: ["Fuel", "Rest Stop", "Cafeteria", "Car Service", "Mosque", "Parking"],
  },
] as const;

async function main() {
  console.log("Seeding fuels...");
  const fuelTypes = [];
  for (const f of FUELS) {
    fuelTypes.push(await db.fuelType.upsert({ where: { slug: f.slug }, update: f, create: f }));
  }

  console.log("Seeding Tollroad TAF Station...");
  // Deactivate any old stations so only Tollroad is active
  await db.station.updateMany({
    where: { branchName: { not: "Tollroad" } },
    data: { isActive: false },
  });

  const stations = new Map<string, { id: string }>();
  for (const s of STATIONS) {
    const existing = await db.station.findFirst({ where: { branchName: s.branchName } });
    const data = {
      name: s.name,
      branchName: s.branchName,
      address: s.address,
      city: s.city,
      area: s.area,
      phone: s.phone,
      latitude: s.lat,
      longitude: s.lng,
      openingHours: { is24h: true },
      status: StationStatus.OPEN,
      services: s.services as unknown as string[],
      isActive: true,
    };
    const station = existing
      ? await db.station.update({ where: { id: existing.id }, data })
      : await db.station.create({ data });
    stations.set(s.key, station);
  }

  const superAdminTgId = telegramId("SEED_SUPER_ADMIN_TELEGRAM_ID", "2074368152");
  console.log(`Setting up Super Admin with Telegram ID: ${superAdminTgId}...`);
  const superAdmin = await db.user.upsert({
    where: { telegramUserId: superAdminTgId },
    update: { role: Role.SUPER_ADMIN, isActive: true },
    create: {
      telegramUserId: superAdminTgId,
      firstName: "TAF",
      lastName: "Admin",
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  // Assign the admin to Tolroad station for direct branch management access
  const tolroadStation = stations.get("tolroad")!;
  await db.stationAdmin.upsert({
    where: { userId: superAdmin.id },
    update: { stationId: tolroadStation.id },
    create: { userId: superAdmin.id, stationId: tolroadStation.id },
  });

  // Initial fuel availability
  console.log("Setting initial fuel availability for Tolroad...");
  const initialAvailability: Record<string, FuelStatus> = {
    benzine: FuelStatus.AVAILABLE,
    diesel: FuelStatus.AVAILABLE,
    // kerosene: FuelStatus.LIMITED,
  };

  for (const fuel of fuelTypes) {
    const status = initialAvailability[fuel.slug] ?? FuelStatus.AVAILABLE;
    await db.stationFuelStatus.upsert({
      where: { stationId_fuelTypeId: { stationId: tolroadStation.id, fuelTypeId: fuel.id } },
      update: {
        status,
        lastUpdated: minutesAgo(5),
        lastConfirmedAt: minutesAgo(5),
        updatedById: superAdmin.id,
      },
      create: {
        stationId: tolroadStation.id,
        fuelTypeId: fuel.id,
        status,
        lastUpdated: minutesAgo(5),
        lastConfirmedAt: minutesAgo(5),
        updatedById: superAdmin.id,
      },
    });
  }

  const defaults: Record<string, unknown> = {
    company_name: "TAF Fuel Station",
    logo_url: "/brand/taf-logo.webp",
    default_radius_km: 25,
    stale_after_minutes: 120,
    auto_notify_enabled: true,
    auto_notify_cooldown_minutes: 30,
    auto_notify_fuel_type_ids: [],
    auto_notify_audience: "subscribers",
    map_provider: "osm",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value: value as never } });
  }

  console.log("✅ Seed complete: 1 active station (Tolroad TAF Station), 3 fuels, admin assigned.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
