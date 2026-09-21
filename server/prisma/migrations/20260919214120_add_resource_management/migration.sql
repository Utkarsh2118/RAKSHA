-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('FOOD', 'WATER', 'MEDICINE', 'BLANKET', 'TENT', 'CLOTHING', 'FIRST_AID', 'VEHICLE', 'RESCUE_EQUIPMENT', 'POWER_SUPPLY', 'OTHER');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ResourceAllocationStatus" AS ENUM ('ALLOCATED', 'RELEASED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Resource" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "availableQuantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "locationText" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceAllocation" (
    "id" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "emergencyRequestId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ResourceAllocationStatus" NOT NULL DEFAULT 'ALLOCATED',
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Resource_ownerId_idx" ON "Resource"("ownerId");

-- CreateIndex
CREATE INDEX "Resource_type_idx" ON "Resource"("type");

-- CreateIndex
CREATE INDEX "Resource_status_idx" ON "Resource"("status");

-- CreateIndex
CREATE INDEX "Resource_createdAt_idx" ON "Resource"("createdAt");

-- CreateIndex
CREATE INDEX "ResourceAllocation_resourceId_idx" ON "ResourceAllocation"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceAllocation_emergencyRequestId_idx" ON "ResourceAllocation"("emergencyRequestId");

-- CreateIndex
CREATE INDEX "ResourceAllocation_status_idx" ON "ResourceAllocation"("status");

-- CreateIndex
CREATE INDEX "ResourceAllocation_createdAt_idx" ON "ResourceAllocation"("createdAt");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_emergencyRequestId_fkey" FOREIGN KEY ("emergencyRequestId") REFERENCES "EmergencyRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
