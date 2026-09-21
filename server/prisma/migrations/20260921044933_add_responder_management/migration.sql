-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MOTORCYCLE', 'CAR', 'VAN', 'AMBULANCE', 'TRUCK', 'BOAT', 'OTHER');

-- CreateTable
CREATE TABLE "ResponderProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "designation" TEXT,
    "bio" TEXT,
    "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'OFFLINE',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationText" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponderSkill" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponderSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponderProfileSkill" (
    "profileId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResponderProfileSkill_pkey" PRIMARY KEY ("profileId","skillId")
);

-- CreateTable
CREATE TABLE "ResponderVehicle" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "vehicleNumber" TEXT,
    "capacity" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponderVehicle_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ResponderVehicle"
ADD CONSTRAINT "ResponderVehicle_capacity_non_negative"
CHECK ("capacity" >= 0);

-- CreateIndex
CREATE UNIQUE INDEX "ResponderProfile_userId_key" ON "ResponderProfile"("userId");

-- CreateIndex
CREATE INDEX "ResponderProfile_availabilityStatus_idx" ON "ResponderProfile"("availabilityStatus");

-- CreateIndex
CREATE INDEX "ResponderProfile_isVerified_idx" ON "ResponderProfile"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "ResponderSkill_name_key" ON "ResponderSkill"("name");

-- CreateIndex
CREATE INDEX "ResponderProfileSkill_profileId_idx" ON "ResponderProfileSkill"("profileId");

-- CreateIndex
CREATE INDEX "ResponderProfileSkill_skillId_idx" ON "ResponderProfileSkill"("skillId");

-- CreateIndex
CREATE INDEX "ResponderVehicle_profileId_idx" ON "ResponderVehicle"("profileId");

-- CreateIndex
CREATE INDEX "ResponderVehicle_isAvailable_idx" ON "ResponderVehicle"("isAvailable");

-- CreateIndex
CREATE INDEX "ResponderVehicle_vehicleType_idx" ON "ResponderVehicle"("vehicleType");

-- AddForeignKey
ALTER TABLE "ResponderProfile" ADD CONSTRAINT "ResponderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponderProfileSkill" ADD CONSTRAINT "ResponderProfileSkill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ResponderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponderProfileSkill" ADD CONSTRAINT "ResponderProfileSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "ResponderSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponderVehicle" ADD CONSTRAINT "ResponderVehicle_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ResponderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
