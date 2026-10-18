import { Router } from 'express';

// ---------- "Edit your order" link from the WhatsApp receipt ----------
// WhatsApp only makes https links tappable, so the receipt's button points here;
// this tiny page hands over to the app (beemres://cart?editOrder=<id>), which
// opens the cart loaded with that order. If the app isn't installed the page
// stays up with store buttons (APP_STORE_URL / PLAY_STORE_URL, when set).

const APP_SCHEME = process.env.APP_SCHEME ?? 'beemres';
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const orderLinkRouter = Router();

orderLinkRouter.get('/o/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).send('Not found');

  const deepLink = `${APP_SCHEME}://cart?editOrder=${id}`;
  const stores = [
    process.env.APP_STORE_URL && `<a class="store" href="${esc(process.env.APP_STORE_URL)}">App Store</a>`,
    process.env.PLAY_STORE_URL && `<a class="store" href="${esc(process.env.PLAY_STORE_URL)}">Google Play</a>`,
  ]
    .filter(Boolean)
    .join('');

  res.set('Cache-Control', 'no-store').type('html').send(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>تعديل الطلب #${id} — بيم</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       font-family:-apple-system,"Segoe UI",Tahoma,sans-serif;background:#FFF9F4;color:#17201F}
  .card{max-width:340px;margin:24px;padding:28px 22px;border-radius:24px;background:#fff;text-align:center;
        box-shadow:0 12px 30px rgba(0,87,81,.12)}
  h1{font-size:20px;margin:0 0 6px;color:#005751}
  p{margin:0 0 20px;color:#68706E;line-height:1.6;font-size:15px}
  .open{display:block;padding:14px;border-radius:999px;background:#FC4A14;color:#fff;font-weight:700;text-decoration:none}
  .store{display:inline-block;margin:14px 6px 0;color:#005751;font-weight:600}
</style>
</head>
<body>
  <div class="card">
    <h1>تعديل الطلب #${id}</h1>
    <p>عم نفتحلك تطبيق بيم على سلّة طلبك عشان تعدّل اللي بدك إياه.</p>
    <a class="open" href="${deepLink}">افتح التطبيق</a>
    ${stores}
  </div>
  <script>location.href = ${JSON.stringify(deepLink)};</script>
</body>
</html>`);
});
