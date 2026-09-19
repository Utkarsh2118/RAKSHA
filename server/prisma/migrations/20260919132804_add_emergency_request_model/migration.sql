-- CreateEnum
CREATE TYPE "EmergencyType" AS ENUM ('MEDICAL', 'FIRE', 'FLOOD', 'EARTHQUAKE', 'LANDSLIDE', 'ACCIDENT', 'CYCLONE', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EmergencyStatus" AS ENUM ('REPORTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "EmergencyRequest" (
    "id" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "emergencyType" "EmergencyType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "peopleAffected" INTEGER NOT NULL,
    "severity" "Severity" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "locationText" TEXT NOT NULL,
    "requiredHelp" TEXT[],
    "status" "EmergencyStatus" NOT NULL DEFAULT 'REPORTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmergencyRequest_reporterId_idx" ON "EmergencyRequest"("reporterId");

-- CreateIndex
CREATE INDEX "EmergencyRequest_status_idx" ON "EmergencyRequest"("status");

-- CreateIndex
CREATE INDEX "EmergencyRequest_severity_idx" ON "EmergencyRequest"("severity");

-- CreateIndex
CREATE INDEX "EmergencyRequest_createdAt_idx" ON "EmergencyRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
