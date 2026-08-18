-- AlterTable
ALTER TABLE "MenuCategory" ADD COLUMN     "nameEn" TEXT;

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "nameEn" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT;
