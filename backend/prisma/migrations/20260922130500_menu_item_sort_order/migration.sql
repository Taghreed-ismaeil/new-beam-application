-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill: give existing items a stable initial order within their category
UPDATE "MenuItem" m SET "sortOrder" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "categoryId" ORDER BY id) as rn
  FROM "MenuItem"
) sub
WHERE m.id = sub.id;
