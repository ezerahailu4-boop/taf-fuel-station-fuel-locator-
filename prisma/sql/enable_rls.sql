-- Enable Row Level Security on every application table and add NO policies.
-- Result: Supabase's public (anon/authenticated) API cannot read or write anything.
-- Our server connects as the database owner via Prisma, which bypasses RLS.
-- Run after migrations:  npm run db:rls
ALTER TABLE "users"                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stations"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fuel_types"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "station_fuel_status"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "station_fuel_status_history"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "station_admins"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_deliveries"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_subscriptions"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "in_app_notifications"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings"                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_events"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "login_codes"                  ENABLE ROW LEVEL SECURITY;
