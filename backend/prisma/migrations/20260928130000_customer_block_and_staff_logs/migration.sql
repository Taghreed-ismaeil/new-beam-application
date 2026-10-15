-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "blockedReason" TEXT;

-- CreateTable
CREATE TABLE "StaffLoginLog" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER,
    "phone" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "reason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffLoginLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAuditLog" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffLoginLog_at_idx" ON "StaffLoginLog"("at");

-- CreateIndex
CREATE INDEX "StaffAuditLog_at_idx" ON "StaffAuditLog"("at");

-- AddForeignKey
ALTER TABLE "StaffLoginLog" ADD CONSTRAINT "StaffLoginLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAuditLog" ADD CONSTRAINT "StaffAuditLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

