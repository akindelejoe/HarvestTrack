-- CreateEnum
CREATE TYPE "PlantingStatus" AS ENUM ('ACTIVE', 'HARVESTED', 'FAILED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('FROST', 'EXTREME_HEAT', 'HEAVY_RAIN', 'STRONG_WIND', 'DROUGHT');

-- CreateEnum
CREATE TYPE "HarvestUnit" AS ENUM ('KG', 'LB', 'TONS', 'BUSHELS', 'CRATES');

-- CreateEnum
CREATE TYPE "CropQuality" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('PLANTED', 'UPDATED', 'ALERT_RAISED', 'HARVESTED', 'NOTE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone_number" VARCHAR(20),
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "minimum_severity" "AlertSeverity" NOT NULL DEFAULT 'HIGH',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farms" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "location" VARCHAR(200) NOT NULL,
    "latitude" DECIMAL(8,5) NOT NULL,
    "longitude" DECIMAL(8,5) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'auto',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fields" (
    "id" UUID NOT NULL,
    "farm_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "area_acres" DECIMAL(10,2),
    "soil_type" VARCHAR(60),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_types" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "minimum_days_to_harvest" INTEGER NOT NULL,
    "maximum_days_to_harvest" INTEGER NOT NULL,
    "ideal_temperature_min" DECIMAL(4,1) NOT NULL,
    "ideal_temperature_max" DECIMAL(4,1) NOT NULL,
    "frost_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "excess_rain_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "drought_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "wind_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "crop_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantings" (
    "id" UUID NOT NULL,
    "field_id" UUID NOT NULL,
    "crop_type_id" UUID NOT NULL,
    "variety" VARCHAR(120),
    "planting_date" DATE NOT NULL,
    "estimated_harvest_start" DATE NOT NULL,
    "estimated_harvest_end" DATE NOT NULL,
    "status" "PlantingStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plantings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvests" (
    "id" UUID NOT NULL,
    "planting_id" UUID NOT NULL,
    "actual_harvest_date" DATE NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" "HarvestUnit" NOT NULL,
    "quality" "CropQuality" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "harvests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_snapshots" (
    "id" UUID NOT NULL,
    "farm_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "temperature_c" DECIMAL(5,1) NOT NULL,
    "humidity" INTEGER NOT NULL,
    "wind_speed_kph" DECIMAL(5,1) NOT NULL,
    "condition" VARCHAR(80) NOT NULL,
    "forecast" JSONB NOT NULL,
    "fetched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "weather_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "planting_id" UUID,
    "alert_type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" TEXT NOT NULL,
    "impact" TEXT,
    "recommendation" TEXT NOT NULL,
    "forecast_date" DATE NOT NULL,
    "dedupe_key" VARCHAR(200) NOT NULL,
    "sms_sent" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planting_activities" (
    "id" UUID NOT NULL,
    "planting_id" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planting_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "farms_user_id_idx" ON "farms"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "farms_user_id_name_key" ON "farms"("user_id", "name");

-- CreateIndex
CREATE INDEX "fields_farm_id_idx" ON "fields"("farm_id");

-- CreateIndex
CREATE UNIQUE INDEX "fields_farm_id_name_key" ON "fields"("farm_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "crop_types_name_key" ON "crop_types"("name");

-- CreateIndex
CREATE INDEX "plantings_field_id_idx" ON "plantings"("field_id");

-- CreateIndex
CREATE INDEX "plantings_crop_type_id_idx" ON "plantings"("crop_type_id");

-- CreateIndex
CREATE INDEX "plantings_status_estimated_harvest_start_idx" ON "plantings"("status", "estimated_harvest_start");

-- CreateIndex
CREATE UNIQUE INDEX "harvests_planting_id_key" ON "harvests"("planting_id");

-- CreateIndex
CREATE INDEX "harvests_actual_harvest_date_idx" ON "harvests"("actual_harvest_date");

-- CreateIndex
CREATE INDEX "weather_snapshots_farm_id_fetched_at_idx" ON "weather_snapshots"("farm_id", "fetched_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "alerts_dedupe_key_key" ON "alerts"("dedupe_key");

-- CreateIndex
CREATE INDEX "alerts_user_id_created_at_idx" ON "alerts"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "alerts_user_id_read_at_idx" ON "alerts"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "alerts_planting_id_idx" ON "alerts"("planting_id");

-- CreateIndex
CREATE INDEX "planting_activities_planting_id_created_at_idx" ON "planting_activities"("planting_id", "created_at");

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_crop_type_id_fkey" FOREIGN KEY ("crop_type_id") REFERENCES "crop_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "plantings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_snapshots" ADD CONSTRAINT "weather_snapshots_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "plantings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planting_activities" ADD CONSTRAINT "planting_activities_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "plantings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
