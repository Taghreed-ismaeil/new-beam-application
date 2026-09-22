-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order" ADD COLUMN     "customerName" TEXT;
ALTER TABLE "Order" ADD COLUMN     "cancelReason" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "nameEnSnapshot" TEXT;

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'card';
