import { Prisma } from '@prisma/client';

// Automatic stock keeping for orders: placing an order takes each item's recipe out of inventory,
// cancelling it puts back exactly what that order took. Every change is an InventoryMovement tied
// to the order, so the Inventory → Log tab shows it and a refund never depends on today's recipe.

type Tx = Prisma.TransactionClient;

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Deducts the recipe of every line in `orderId` from stock. No-op for items without a recipe. */
export async function deductStockForOrder(tx: Tx, orderId: number, staffId: number | null = null) {
  const lines = await tx.orderItem.findMany({
    where: { orderId },
    select: { quantity: true, menuItem: { select: { recipe: { select: { ingredientId: true, quantity: true } } } } },
  });

  const totals = new Map<number, number>();
  for (const line of lines) {
    for (const r of line.menuItem.recipe) {
      totals.set(r.ingredientId, (totals.get(r.ingredientId) ?? 0) + Number(r.quantity) * line.quantity);
    }
  }

  for (const [ingredientId, amount] of totals) {
    const change = round3(amount);
    if (change <= 0) continue;
    await tx.inventoryItem.update({ where: { id: ingredientId }, data: { quantityOnHand: { decrement: change } } });
    await tx.inventoryMovement.create({
      data: { itemId: ingredientId, change: -change, reason: 'order', orderId, staffId },
    });
  }
}

/** Returns whatever `orderId` still has deducted (net of any earlier refund) — safe to call twice. */
export async function restoreStockForOrder(tx: Tx, orderId: number, staffId: number | null = null) {
  const net = await tx.inventoryMovement.groupBy({
    by: ['itemId'],
    where: { orderId, reason: { in: ['order', 'order_cancelled'] } },
    _sum: { change: true },
  });

  for (const row of net) {
    const owed = round3(-Number(row._sum.change ?? 0));
    if (owed <= 0) continue;
    await tx.inventoryItem.update({ where: { id: row.itemId }, data: { quantityOnHand: { increment: owed } } });
    await tx.inventoryMovement.create({
      data: { itemId: row.itemId, change: owed, reason: 'order_cancelled', orderId, staffId },
    });
  }
}
