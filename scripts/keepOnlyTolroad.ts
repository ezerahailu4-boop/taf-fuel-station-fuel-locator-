import "dotenv/config";
import { getDb } from "../lib/db";
import { FuelStatus, StationStatus } from "../generated/prisma/client";

async function main() {
  const db = getDb();
  console.log("Cleaning database to keep ONLY Tolroad TAF Station...");

  // Delete any stations that are NOT Tolroad
  const nonTolroad = await db.station.findMany({
    where: { branchName: { not: "Tolroad" } },
  });

  console.log(`Found ${nonTolroad.length} non-Tolroad stations to remove.`);

  for (const st of nonTolroad) {
    // Delete related records
    await db.stationFuelStatus.deleteMany({ where: { stationId: st.id } });
    await db.stationFuelStatusHistory.deleteMany({ where: { stationId: st.id } });
    await db.stationAdmin.deleteMany({ where: { stationId: st.id } });
    await db.notificationSubscription.deleteMany({ where: { stationId: st.id } });
    await db.activityLog.deleteMany({ where: { stationId: st.id } });
    await db.analyticsEvent.deleteMany({ where: { stationId: st.id } });
    await db.station.delete({ where: { id: st.id } });
    console.log(`Removed: TAF ${st.branchName}`);
  }

  // Ensure Tollroad station exists and is fully configured
  let tollroad = await db.station.findFirst({ where: { branchName: "Tollroad" } });

  const tollroadData = {
    name: "Tollroad TAF Station",
    branchName: "Tollroad",
    city: "Adama",
    area: "Adama-Finfinee Expressway",
    address: "Adama-Finfinee Rest Stop, Expressway, Oromia, Ethiopia",
    latitude: 8.751643,
    longitude: 39.0160711,
    phone: "+251911000000",
    openingHours: { is24h: true },
    status: StationStatus.OPEN,
    services: ["Fuel", "Rest Stop", "Cafeteria", "Car Service", "Mosque", "Parking"],
    isActive: true,
  };

  if (tollroad) {
    tollroad = await db.station.update({
      where: { id: tollroad.id },
      data: tollroadData,
    });
    console.log("Updated Tollroad station to active OPEN status.");
  } else {
    tollroad = await db.station.create({
      data: tollroadData,
    });
    console.log("Created Tollroad station.");
  }

  // Ensure Benzine and Diesel are AVAILABLE at Tolroad
  const benzine = await db.fuelType.findUnique({ where: { slug: "benzine" } });
  const diesel = await db.fuelType.findUnique({ where: { slug: "diesel" } });

  if (benzine) {
    const existing = await db.stationFuelStatus.findFirst({
      where: { stationId: tollroad.id, fuelTypeId: benzine.id },
    });
    if (existing) {
      await db.stationFuelStatus.update({
        where: { id: existing.id },
        data: { status: FuelStatus.AVAILABLE, lastUpdated: new Date() },
      });
    } else {
      await db.stationFuelStatus.create({
        data: { stationId: tollroad.id, fuelTypeId: benzine.id, status: FuelStatus.AVAILABLE },
      });
    }
  }

  if (diesel) {
    const existing = await db.stationFuelStatus.findFirst({
      where: { stationId: tollroad.id, fuelTypeId: diesel.id },
    });
    if (existing) {
      await db.stationFuelStatus.update({
        where: { id: existing.id },
        data: { status: FuelStatus.AVAILABLE, lastUpdated: new Date() },
      });
    } else {
      await db.stationFuelStatus.create({
        data: { stationId: tollroad.id, fuelTypeId: diesel.id, status: FuelStatus.AVAILABLE },
      });
    }
  }

  // Deactivate any kerosene status if present
  const kerosene = await db.fuelType.findUnique({ where: { slug: "kerosene" } });
  if (kerosene) {
    await db.stationFuelStatus.deleteMany({
      where: { stationId: tollroad.id, fuelTypeId: kerosene.id },
    });
  }

  const remaining = await db.station.findMany({ select: { branchName: true, isActive: true } });
  console.log("Database now only has:", remaining);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error keeping only Tollroad:", err);
    process.exit(1);
  });
