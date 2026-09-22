const { execSync } = require('child_process');
const fs = require('fs');

console.log('Running prisma migrate diff...');
const diffSql = execSync('npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script', {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});

const rlsSql = fs.readFileSync('prisma/sql/enable_rls.sql', 'utf8');

const seedSql = `
-- Seed Fuel Types
INSERT INTO "fuel_types" ("id", "slug", "name_en", "name_am", "icon", "display_order", "is_active", "created_at", "updated_at")
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'benzine', 'Benzine', 'ቤንዚን', '⛽', 1, true, NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000002', 'diesel', 'Diesel', 'ናፍጣ', '⛽', 2, true, NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000003', 'kerosene', 'Kerosene', 'ነጭ ጋዝ', '⛽', 3, true, NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE SET "name_en" = EXCLUDED."name_en", "name_am" = EXCLUDED."name_am";

-- Seed Station: Tolroad TAF Station
INSERT INTO "stations" ("id", "name", "branch_name", "address", "city", "area", "phone", "latitude", "longitude", "opening_hours", "station_status", "services", "is_active", "created_at", "updated_at")
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Tolroad TAF Station',
  'Tolroad',
  'Adama-Finfinee Rest Stop, Expressway, Oromia, Ethiopia',
  'Adama',
  'Adama-Finfinee Expressway',
  '+251911000000',
  8.751643,
  39.0160711,
  '{"is24h": true}'::jsonb,
  'OPEN',
  ARRAY['Fuel', 'Rest Stop', 'Cafeteria', 'Car Service', 'Mosque', 'Parking']::text[],
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Seed Super Admin User (Telegram ID 2074368152)
INSERT INTO "users" ("id", "telegram_user_id", "first_name", "last_name", "role", "is_active", "created_at", "updated_at")
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  2074368152,
  'TAF',
  'Admin',
  'SUPER_ADMIN',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("telegram_user_id") DO UPDATE SET "role" = 'SUPER_ADMIN', "is_active" = true;

-- Assign Admin to Station
INSERT INTO "station_admins" ("id", "station_id", "user_id", "assigned_at")
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  NOW()
)
ON CONFLICT ("user_id") DO UPDATE SET "station_id" = EXCLUDED."station_id";

-- Seed Initial Fuel Availability
INSERT INTO "station_fuel_status" ("id", "station_id", "fuel_type_id", "status", "last_updated", "last_confirmed_at", "updated_by_id", "created_at", "updated_at")
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'AVAILABLE', NOW(), NOW(), 'c0000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'AVAILABLE', NOW(), NOW(), 'c0000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'LIMITED', NOW(), NOW(), 'c0000000-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT ("station_id", "fuel_type_id") DO UPDATE SET "status" = EXCLUDED."status", "last_updated" = NOW();

-- Seed Default Settings
INSERT INTO "settings" ("key", "value", "created_at", "updated_at")
VALUES
  ('company_name', '"TAF Fuel Station"'::jsonb, NOW(), NOW()),
  ('logo_url', '"/brand/taf-logo.webp"'::jsonb, NOW(), NOW()),
  ('default_radius_km', '25'::jsonb, NOW(), NOW()),
  ('stale_after_minutes', '120'::jsonb, NOW(), NOW()),
  ('auto_notify_enabled', 'true'::jsonb, NOW(), NOW()),
  ('auto_notify_cooldown_minutes', '30'::jsonb, NOW(), NOW()),
  ('map_provider', '"osm"'::jsonb, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
`;

let cleanDiff = diffSql
  .replace(/^\uFEFF/, '')
  .replace(/-- CreateSchema\s+CREATE SCHEMA IF NOT EXISTS "public";\s*/g, '');

const finalSql = cleanDiff.trim() + '\n\n-- RLS Policies\n' + rlsSql.trim() + '\n\n-- Seed Data\n' + seedSql.trim() + '\n';

fs.writeFileSync('prisma/init_supabase.sql', finalSql, { encoding: 'utf8' });
console.log('✅ Wrote clean UTF-8 prisma/init_supabase.sql! Size:', finalSql.length);
