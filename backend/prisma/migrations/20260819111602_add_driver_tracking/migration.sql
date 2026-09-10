-- AlterEnum
ALTER TYPE "StaffRole" ADD VALUE 'driver';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "driverId" INTEGER,
ADD COLUMN     "driverLat" DOUBLE PRECISION,
ADD COLUMN     "driverLng" DOUBLE PRECISION,
ADD COLUMN     "driverLocationAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
