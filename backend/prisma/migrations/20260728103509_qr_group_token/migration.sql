-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "qrGroupToken" TEXT;

-- CreateIndex
CREATE INDEX "MenuItem_qrGroupToken_idx" ON "MenuItem"("qrGroupToken");
