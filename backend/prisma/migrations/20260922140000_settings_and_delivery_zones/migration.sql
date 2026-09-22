-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "nameEn" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN     "email" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN     "addressEn" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN     "openingHoursText" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN     "paymentsCash" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Restaurant" ADD COLUMN     "paymentsCard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Restaurant" ADD COLUMN     "paymentsCliq" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Restaurant" ADD COLUMN     "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "fee" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeliveryZone" ADD CONSTRAINT "DeliveryZone_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
