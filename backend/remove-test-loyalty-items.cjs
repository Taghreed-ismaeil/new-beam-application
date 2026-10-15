// Removes the old test collectibles (Pizza/زنجر, Shawarma, Burger, and the Sandwiches group =
// Fajita + Steak) from the loyalty program. It does NOT delete the menu items, since they're
// linked to old orders and vouchers. It only clears their QR codes, which takes them out of the
// Loyalty page, the admin Rewards page, and the random gift QR.
// Run from the backend folder:  node -r dotenv/config remove-test-loyalty-items.cjs
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const ids = [1, 2, 3, 4, 20];
  const backup = await p.$queryRawUnsafe(
    `select id, name, "nameEn", "qrToken", "qrGroupToken" from "MenuItem" where id = any($1::int[])`,
    ids,
  );
  fs.writeFileSync("loyalty-test-items-backup.json", JSON.stringify(backup, null, 2));

  const n = await p.$executeRawUnsafe(
    `update "MenuItem" set "qrToken" = null, "qrGroupToken" = null where id = any($1::int[]) and "isAvailable" = false`,
    ids,
  );
  console.log("removed from loyalty:", n);

  const left = await p.$queryRawUnsafe(
    `select id, "nameEn" from "MenuItem" where "qrToken" is not null or "qrGroupToken" is not null order by id`,
  );
  console.log("loyalty items now:", left.map((r) => r.nameEn).join(", "));
  await p.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
