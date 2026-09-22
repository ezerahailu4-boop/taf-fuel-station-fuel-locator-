import "dotenv/config";
import { getDb } from "../lib/db";
import { FuelStatus, StationStatus } from "../generated/prisma/client";

const STATIONS_DATA = [
  {
    branchName: "Tolroad",
    name: "Tolroad TAF Station",
    city: "Adama",
    area: "Adama-Finfinee Expressway",
    address: "Adama-Finfinee Rest Stop, Expressway, Oromia, Ethiopia",
    latitude: 8.751643,
    longitude: 39.0160711,
    phone: "+251911000000",
    status: StationStatus.OPEN,
    benzine: FuelStatus.AVAILABLE,
    diesel: FuelStatus.AVAILABLE,
  },
  {
    branchName: "Bole",
    name: "TAF Bole Station",
    city: "Addis Ababa",
    area: "Bole Medhanialem",
    address: "Cameroon St, near Medhanialem Cathedral, Bole",
    latitude: 8.9955,
    longitude: 38.7890,
    phone: "+251911223344",
    status: StationStatus.OPEN,
    benzine: FuelStatus.AVAILABLE,
    diesel: FuelStatus.AVAILABLE,
  },
  {
    branchName: "Saris",
    name: "TAF Saris Station",
    city: "Addis Ababa",
    area: "Saris Abo",
    address: "Debre Zeit Road, Saris, Nifas Silk-Lafto",
    latitude: 8.9536,
    longitude: 38.7465,
    phone: "+251911334455",
    status: StationStatus.OPEN,
    benzine: FuelStatus.AVAILABLE,
    diesel: FuelStatus.LIMITED,
  },
  {
    branchName: "Kaliti",
    name: "TAF Kaliti Station",
    city: "Addis Ababa",
    area: "Kaliti Customs",
    address: "Kaliti Main Ring Road, Akaki-Kality",
    latitude: 8.8985,
    longitude: 38.7612,
    phone: "+251911445566",
    status: StationStatus.OPEN,
    benzine: FuelStatus.LIMITED,
    diesel: FuelStatus.AVAILABLE,
  },
  {
    branchName: "Megenagna",
    name: "TAF Megenagna Station",
    city: "Addis Ababa",
    area: "Megenagna Roundabout",
    address: "CMC Road, near Megenagna Square, Yeka",
    latitude: 9.0205,
    longitude: 38.8021,
    phone: "+251911556677",
    status: StationStatus.OPEN,
    benzine: FuelStatus.AVAILABLE,
    diesel: FuelStatus.AVAILABLE,
  },
  {
    branchName: "Mexico",
    name: "TAF Mexico Station",
    city: "Addis Ababa",
    area: "Mexico Square",
    address: "Chad Street, near Mexico Square, Kirkos",
    latitude: 9.0108,
    longitude: 38.7445,
    phone: "+251911667788",
    status: StationStatus.OPEN,
    benzine: FuelStatus.AVAILABLE,
    diesel: FuelStatus.AVAILABLE,
  },
  {
    branchName: "Tor Hailoch",
    name: "TAF Tor Hailoch Station",
    city: "Addis Ababa",
    area: "Tor Hailoch",
    address: "Old Airport Road, Kolfe Keranio",
    latitude: 9.0089,
    longitude: 38.7214,
    phone: "+251911778899",
    status: StationStatus.OPEN,
    benzine: FuelStatus.LIMITED,
    diesel: FuelStatus.AVAILABLE,
  },
  {
    branchName: "Dire Dawa",
    name: "TAF Dire Dawa Station",
    city: "Dire Dawa",
    area: "Kezira",
    address: "Kezira Commercial Boulevard, Dire Dawa",
    latitude: 9.6012,
    longitude: 41.8541,
    phone: "+251911889900",
    status: StationStatus.OPEN,
    benzine: FuelStatus.AVAILABLE,
    diesel: FuelStatus.AVAILABLE,
  },
  {
    branchName: "Hawassa",
    name: "TAF Hawassa Station",
    city: "Hawassa",
    area: "Piazza / Lake View",
    address: "Lake Awassa Road, Piazza, Hawassa, Sidama",
    latitude: 7.0504,
    longitude: 38.4763,
    phone: "+251911990011",
    status: StationStatus.OPEN,
    benzine: FuelStatus.AVAILABLE,
    diesel: FuelStatus.AVAILABLE,
  },
  {
    branchName: "Bahir Dar",
    name: "TAF Bahir Dar Station",
    city: "Bahir Dar",
    area: "Gojjam Exit",
    address: "Bahir Dar - Debre Marqos Highway Exit, Amhara",
    latitude: 11.5830,
    longitude: 37.3876,
    phone: "+251911001122",
    status: StationStatus.OPEN,
    benzine: FuelStatus.AVAILABLE,
    diesel: FuelStatus.AVAILABLE,
  },
];

async function seed() {
  const db = getDb();
  console.log("Seeding full network of TAF stations...");

  const benzine = await db.fuelType.findUnique({ where: { slug: "benzine" } });
  const diesel = await db.fuelType.findUnique({ where: { slug: "diesel" } });

  if (!benzine || !diesel) {
    throw new Error("Benzine or Diesel fuel type not found in database");
  }

  for (const s of STATIONS_DATA) {
    let station = await db.station.findFirst({ where: { branchName: s.branchName } });

    const stationPayload = {
      name: s.name,
      branchName: s.branchName,
      city: s.city,
      area: s.area,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      phone: s.phone,
      openingHours: { is24h: true },
      status: s.status,
      services: ["Fuel", "Rest Stop", "Car Service", "Mosque", "Parking"],
      isActive: true,
    };

    if (station) {
      station = await db.station.update({
        where: { id: station.id },
        data: stationPayload,
      });
      console.log(`Updated station: TAF ${s.branchName}`);
    } else {
      station = await db.station.create({
        data: stationPayload,
      });
      console.log(`Created station: TAF ${s.branchName}`);
    }

    // Upsert Benzine status
    const existingBenz = await db.stationFuelStatus.findFirst({
      where: { stationId: station.id, fuelTypeId: benzine.id },
    });
    if (existingBenz) {
      await db.stationFuelStatus.update({
        where: { id: existingBenz.id },
        data: { status: s.benzine, lastUpdated: new Date() },
      });
    } else {
      await db.stationFuelStatus.create({
        data: {
          stationId: station.id,
          fuelTypeId: benzine.id,
          status: s.benzine,
        },
      });
    }

    // Upsert Diesel status
    const existingDiesel = await db.stationFuelStatus.findFirst({
      where: { stationId: station.id, fuelTypeId: diesel.id },
    });
    if (existingDiesel) {
      await db.stationFuelStatus.update({
        where: { id: existingDiesel.id },
        data: { status: s.diesel, lastUpdated: new Date() },
      });
    } else {
      await db.stationFuelStatus.create({
        data: {
          stationId: station.id,
          fuelTypeId: diesel.id,
          status: s.diesel,
        },
      });
    }
  }

  const count = await db.station.count({ where: { isActive: true } });
  console.log(`Successfully seeded! Total active TAF stations in database: ${count}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
