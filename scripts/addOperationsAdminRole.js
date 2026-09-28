require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Checking and updating Role enum in Postgres...");
  await pool.query(`
    DO $$ BEGIN
      ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OPERATIONS_ADMIN';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  console.log("✅ OPERATIONS_ADMIN added to Role enum in Supabase Postgres!");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration error:", err);
  pool.end();
  process.exit(1);
});
