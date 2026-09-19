-- AlterTable
ALTER TABLE "EmergencyRequest" ADD COLUMN "assignedResponderId" UUID;

-- CreateIndex
CREATE INDEX "EmergencyRequest_assignedResponderId_idx" ON "EmergencyRequest"("assignedResponderId");

-- AddForeignKey
ALTER TABLE "EmergencyRequest"
ADD CONSTRAINT "EmergencyRequest_assignedResponderId_fkey"
FOREIGN KEY ("assignedResponderId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
