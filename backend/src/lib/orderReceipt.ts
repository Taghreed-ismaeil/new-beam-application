import { env } from '../config/env';
import { prisma } from './prisma';

// ---------- WhatsApp order receipt ----------
// When a customer places (or edits) an order, the restaurant messages them a
// digital receipt on WhatsApp, on the phone number they signed in with. A
// business can only start a WhatsApp conversation with an approved *template*,
// so the text lives in Meta (template ORDER_TEMPLATE, see the body below) and we
// fill its variables. Template variables can't contain line breaks, so the items
// go on one line separated by "•" — every other field gets its own line.
//
// Template "order_receipt" (category Utility, language Arabic):
//   Header (text):  {{1}}                     ← "تم تأكيد طلبك ✅" / "تم تعديل طلبك ✏️"
//   Body:
//     أهلاً {{1}} 👋
//     رقم الطلب: #{{2}}
//     النوع: {{3}}
//     {{4}}                                   ← "العنوان: …" / "الطاولة: …" / "الاستلام من المطعم"
//     الطلبات: {{5}}
//     المجموع: {{6}} د.أ
//     طريقة الدفع: {{7}}
//
//     بدك تعدّل طلبك؟ اكبس على الزر تحت قبل ما نبلّش نحضّره.
//     شكراً لاختيارك بيم 🧡
//   Button (URL, dynamic): https://<backend>/o/{{1}}   ← order id → opens the app's cart
//
// Until WhatsApp is configured (OTP_PROVIDER isn't "whatsapp" or the token is
// empty) nothing is sent: the full message is printed to the server log instead.

const ORDER_TEMPLATE = process.env.WHATSAPP_ORDER_TEMPLATE ?? 'order_receipt';
const TEMPLATE_LANG = process.env.WHATSAPP_ORDER_TEMPLATE_LANG ?? 'ar';

const TYPE_AR: Record<string, string> = { delivery: 'توصيل', pickup: 'استلام من المطعم', dine_in: 'داخل المطعم', counter: 'من الكاشير' };
const PAY_AR: Record<string, string> = { cash: 'كاش', cliq: 'كليك (CliQ)', card: 'بطاقة' };

/** Jordanian numbers as WhatsApp wants them: country code, no "+" or leading 0 (0791234567 → 962791234567). */
export function toWhatsAppNumber(phone: string): string | null {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0') && d.length === 10) d = `962${d.slice(1)}`;
  else if (d.length === 9 && d.startsWith('7')) d = `962${d}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

// a template parameter can't hold newlines, tabs or 4+ spaces in a row
const clean = (s: string, max = 900) =>
  (s || '—').replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim().slice(0, max) || '—';

const money = (v: unknown) => Number(v).toFixed(2);

export async function sendOrderReceipt(orderId: number, kind: 'confirmed' | 'updated' = 'confirmed') {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, table: true, user: { select: { name: true, phone: true } } },
  });
  if (!order?.user) return; // counter sales have no customer account to message

  const to = toWhatsAppNumber(order.user.phone);
  if (!to) {
    console.warn(`[receipt] order #${order.id}: can't turn phone "${order.user.phone}" into a WhatsApp number`);
    return;
  }

  const firstName = order.user.name.trim().split(/\s+/)[0] || order.user.name;
  const place =
    order.orderType === 'delivery'
      ? `العنوان: ${order.deliveryAddress || '—'}`
      : order.orderType === 'dine_in'
        ? `الطاولة: ${order.table?.tableNumber ?? order.tableId ?? '—'}`
        : 'الاستلام من المطعم';
  const items = order.items
    .map((i) => `${i.quantity}× ${i.nameSnapshot}${i.notes ? ` (${i.notes})` : ''}`)
    .join(' • ');

  const header = kind === 'updated' ? 'تم تعديل طلبك ✏️' : 'تم تأكيد طلبك ✅';
  const body = [
    firstName,
    String(order.id),
    TYPE_AR[order.orderType] ?? order.orderType,
    place,
    items,
    money(order.total),
    PAY_AR[order.paymentMethod] ?? order.paymentMethod,
  ].map((p) => clean(p));

  const configured = env.otpProvider === 'whatsapp' && !!env.whatsapp.accessToken && !!env.whatsapp.phoneNumberId;
  if (!configured) {
    console.log(
      [
        `[receipt:console] → ${to}  (${kind}, WhatsApp not configured yet)`,
        header,
        `أهلاً ${body[0]} 👋`,
        `رقم الطلب: #${body[1]}`,
        `النوع: ${body[2]}`,
        body[3],
        `الطلبات: ${body[4]}`,
        `المجموع: ${body[5]} د.أ`,
        `طريقة الدفع: ${body[6]}`,
        `[عدّل طلبك] → /o/${order.id}`,
      ].join('\n'),
    );
    return;
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${env.whatsapp.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.whatsapp.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: ORDER_TEMPLATE,
        language: { code: TEMPLATE_LANG },
        components: [
          { type: 'header', parameters: [{ type: 'text', text: header }] },
          { type: 'body', parameters: body.map((text) => ({ type: 'text', text })) },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(order.id) }] },
        ],
      },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp receipt for order #${order.id} failed (${res.status}): ${await res.text()}`);
}

/** Fire-and-forget: a WhatsApp hiccup must never fail or slow down placing the order. */
export function queueOrderReceipt(orderId: number, kind: 'confirmed' | 'updated' = 'confirmed') {
  sendOrderReceipt(orderId, kind).catch((e) => console.error('[receipt]', e?.message ?? e));
}
