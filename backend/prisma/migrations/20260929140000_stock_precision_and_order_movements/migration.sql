-- AlterTable
ALTER TABLE "InventoryItem" ALTER COLUMN "quantityOnHand" SET DATA TYPE DECIMAL(12,3),
ALTER COLUMN "minQuantity" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "orderId" INTEGER,
ALTER COLUMN "change" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "MenuItemIngredient" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3);

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,3);

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateIndex
CREATE INDEX "InventoryMovement_orderId_idx" ON "InventoryMovement"("orderId");
