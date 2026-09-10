-- DropForeignKey
ALTER TABLE "Voucher" DROP CONSTRAINT "Voucher_menuItemId_fkey";

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "label" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'loyalty',
ALTER COLUMN "menuItemId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
