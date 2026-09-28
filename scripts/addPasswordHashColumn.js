require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Adding password_hash column and username index in Supabase Postgres...");
  await pool.query(`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;
  `);

  console.log("Checking index...");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users"("username");
  `);

  console.log("✅ Column password_hash added successfully!");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration error:", err);
  pool.end();
  process.exit(1);
});
