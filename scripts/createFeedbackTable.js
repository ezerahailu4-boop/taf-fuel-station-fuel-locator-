require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Connecting to database...");
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackStatus') THEN
        CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'RESOLVED');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS "feedbacks" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
      "name" TEXT,
      "contact" TEXT,
      "message" TEXT NOT NULL,
      "station_id" UUID REFERENCES "stations"("id") ON DELETE SET NULL,
      "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
      "admin_notes" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS "feedbacks_status_created_at_idx" ON "feedbacks"("status", "created_at");
    CREATE INDEX IF NOT EXISTS "feedbacks_station_id_idx" ON "feedbacks"("station_id");
    ALTER TABLE "feedbacks" ENABLE ROW LEVEL SECURITY;
  `);

  console.log("✅ Feedbacks table & RLS successfully created/verified in Supabase Postgres!");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration error:", err);
  pool.end();
  process.exit(1);
});
