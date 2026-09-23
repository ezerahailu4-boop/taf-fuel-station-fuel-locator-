-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'VIEWER', 'BRANCH_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "FuelStatus" AS ENUM ('AVAILABLE', 'LIMITED', 'OUT_OF_STOCK', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StationStatus" AS ENUM ('OPEN', 'CLOSED', 'TEMPORARILY_CLOSED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FUEL_AVAILABLE', 'FUEL_UNAVAILABLE', 'ANNOUNCEMENT', 'MAINTENANCE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BLOCKED', 'SKIPPED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "telegram_user_id" BIGINT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "username" TEXT,
    "language_code" TEXT,
    "preferred_locale" TEXT NOT NULL DEFAULT 'en',
    "phone" TEXT,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "branch_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT,
    "phone" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "opening_hours" JSONB NOT NULL,
    "station_status" "StationStatus" NOT NULL DEFAULT 'OPEN',
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_types" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_am" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Ôø¢',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "fuel_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_fuel_status" (
    "id" UUID NOT NULL,
    "station_id" UUID NOT NULL,
    "fuel_type_id" UUID NOT NULL,
    "status" "FuelStatus" NOT NULL DEFAULT 'UNKNOWN',
    "note" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,

    CONSTRAINT "station_fuel_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_fuel_status_history" (
    "id" UUID NOT NULL,
    "station_id" UUID NOT NULL,
    "fuel_type_id" UUID NOT NULL,
    "old_status" "FuelStatus" NOT NULL,
    "new_status" "FuelStatus" NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "station_fuel_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_admins" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "station_id" UUID NOT NULL,

    CONSTRAINT "station_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_am" TEXT NOT NULL,
    "body_en" TEXT NOT NULL,
    "body_am" TEXT NOT NULL,
    "station_id" UUID,
    "fuel_type_id" UUID,
    "audience" JSONB NOT NULL DEFAULT '{}',
    "scheduled_at" TIMESTAMP(3),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "station_id" UUID NOT NULL,
    "fuel_type_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "in_app_notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "station_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "station_id" UUID,
    "fuel_type_id" UUID,
    "anon_user_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_user_id_key" ON "users"("telegram_user_id");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE INDEX "stations_city_area_idx" ON "stations"("city", "area");

-- CreateIndex
CREATE INDEX "stations_is_active_station_status_idx" ON "stations"("is_active", "station_status");

-- CreateIndex
CREATE INDEX "stations_latitude_longitude_idx" ON "stations"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_types_slug_key" ON "fuel_types"("slug");

-- CreateIndex
CREATE INDEX "fuel_types_is_active_display_order_idx" ON "fuel_types"("is_active", "display_order");

-- CreateIndex
CREATE INDEX "station_fuel_status_fuel_type_id_status_idx" ON "station_fuel_status"("fuel_type_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "station_fuel_status_station_id_fuel_type_id_key" ON "station_fuel_status"("station_id", "fuel_type_id");

-- CreateIndex
CREATE INDEX "station_fuel_status_history_station_id_fuel_type_id_changed_idx" ON "station_fuel_status_history"("station_id", "fuel_type_id", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "station_admins_user_id_key" ON "station_admins"("user_id");

-- CreateIndex
CREATE INDEX "station_admins_station_id_idx" ON "station_admins"("station_id");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notifications_scheduled_at_idx" ON "notifications"("scheduled_at");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_next_attempt_at_idx" ON "notification_deliveries"("status", "next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_notification_id_user_id_key" ON "notification_deliveries"("notification_id", "user_id");

-- CreateIndex
CREATE INDEX "notification_subscriptions_station_id_fuel_type_id_is_activ_idx" ON "notification_subscriptions"("station_id", "fuel_type_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "notification_subscriptions_user_id_station_id_fuel_type_id_key" ON "notification_subscriptions"("user_id", "station_id", "fuel_type_id");

-- CreateIndex
CREATE INDEX "in_app_notifications_user_id_read_at_idx" ON "in_app_notifications"("user_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "in_app_notifications_user_id_notification_id_key" ON "in_app_notifications"("user_id", "notification_id");

-- CreateIndex
CREATE INDEX "activity_logs_station_id_created_at_idx" ON "activity_logs"("station_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_actor_user_id_created_at_idx" ON "activity_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_action_created_at_idx" ON "activity_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_event_created_at_idx" ON "analytics_events"("event", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_station_id_created_at_idx" ON "analytics_events"("station_id", "created_at");

-- CreateIndex
CREATE INDEX "login_codes_user_id_created_at_idx" ON "login_codes"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "station_fuel_status" ADD CONSTRAINT "station_fuel_status_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_fuel_status" ADD CONSTRAINT "station_fuel_status_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "fuel_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_fuel_status" ADD CONSTRAINT "station_fuel_status_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_fuel_status_history" ADD CONSTRAINT "station_fuel_status_history_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_fuel_status_history" ADD CONSTRAINT "station_fuel_status_history_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "fuel_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_fuel_status_history" ADD CONSTRAINT "station_fuel_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_admins" ADD CONSTRAINT "station_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_admins" ADD CONSTRAINT "station_admins_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "fuel_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "notification_subscriptions_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "fuel_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "fuel_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_codes" ADD CONSTRAINT "login_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

