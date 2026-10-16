require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Adding liters column to station_fuel_status and station_fuel_status_history...");
  await pool.query(`
    ALTER TABLE "station_fuel_status" 
    ADD COLUMN IF NOT EXISTS "liters" DOUBLE PRECISION;

    ALTER TABLE "station_fuel_status_history" 
    ADD COLUMN IF NOT EXISTS "old_liters" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "new_liters" DOUBLE PRECISION;
  `);

  console.log("Checking columns...");
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'station_fuel_status';
  `);
  console.log("station_fuel_status columns:", res.rows.map(r => `${r.column_name} (${r.data_type})`));

  console.log("✅ Liters column migration complete!");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration error:", err);
  pool.end();
  process.exit(1);
});
