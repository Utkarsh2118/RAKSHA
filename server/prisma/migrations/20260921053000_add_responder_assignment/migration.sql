-- CreateEnum
CREATE TYPE "ResponderAssignmentStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ResponderAssignment" (
    "id" UUID NOT NULL,
    "emergencyRequestId" UUID NOT NULL,
    "responderProfileId" UUID NOT NULL,
    "assignedById" UUID NOT NULL,
    "status" "ResponderAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResponderAssignment_emergencyRequestId_idx" ON "ResponderAssignment"("emergencyRequestId");
CREATE INDEX "ResponderAssignment_responderProfileId_idx" ON "ResponderAssignment"("responderProfileId");
CREATE INDEX "ResponderAssignment_assignedById_idx" ON "ResponderAssignment"("assignedById");
CREATE INDEX "ResponderAssignment_status_idx" ON "ResponderAssignment"("status");
CREATE INDEX "ResponderAssignment_createdAt_idx" ON "ResponderAssignment"("createdAt");

-- Prevent duplicate active assignments for the same emergency and responder.
CREATE UNIQUE INDEX "ResponderAssignment_active_emergency_responder_key"
ON "ResponderAssignment"("emergencyRequestId", "responderProfileId")
WHERE "status" IN ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS');

-- AddForeignKey
ALTER TABLE "ResponderAssignment"
ADD CONSTRAINT "ResponderAssignment_emergencyRequestId_fkey"
FOREIGN KEY ("emergencyRequestId") REFERENCES "EmergencyRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResponderAssignment"
ADD CONSTRAINT "ResponderAssignment_responderProfileId_fkey"
FOREIGN KEY ("responderProfileId") REFERENCES "ResponderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResponderAssignment"
ADD CONSTRAINT "ResponderAssignment_assignedById_fkey"
FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
