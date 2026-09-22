const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    "postgresql://postgres.paafawytsvsinbyywayr:HmK5Kc3vqeFG0e6H@aws-1-eu-west-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const res = await pool.query(
      "UPDATE fuel_types SET is_active = false WHERE slug = 'kerosene'"
    );
    console.log("Updated rows:", res.rowCount);
    const check = await pool.query(
      "SELECT id, slug, name_en, is_active FROM fuel_types ORDER BY display_order"
    );
    console.log("Current fuel types in DB:", check.rows);
  } catch (err) {
    console.error("Error updating:", err);
  } finally {
    await pool.end();
  }
}

run();
