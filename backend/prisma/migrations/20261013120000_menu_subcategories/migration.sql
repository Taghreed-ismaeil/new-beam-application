-- Sub-categories: a category can sit inside another one.
ALTER TABLE "MenuCategory" ADD COLUMN "parentId" INTEGER;

ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
