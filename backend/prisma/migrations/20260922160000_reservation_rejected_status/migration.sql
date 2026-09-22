-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'rejected';

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "reason" TEXT;
