// One spelling per phone number, so the same customer is always the same account
// however they type it: "0791234567", "791234567", "+962 79 123 4567",
// "00962791234567" and Arabic digits "٠٧٩١٢٣٤٥٦٧" all become "0791234567".
// Numbers that aren't Jordanian mobiles are kept as plain digits.
export function normalizePhone(raw: string): string {
  const latin = raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  let d = latin.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('962')) d = d.slice(3);
  if (d.length === 9 && d.startsWith('7')) d = `0${d}`;
  return d;
}

/** Every way an existing row might have stored this number (rows saved before normalizing). */
export function phoneVariants(raw: string): string[] {
  const n = normalizePhone(raw);
  const set = new Set([raw.trim(), n]);
  if (/^07\d{8}$/.test(n)) {
    const rest = n.slice(1);
    for (const v of [rest, `962${rest}`, `+962${rest}`, `00962${rest}`]) set.add(v);
  }
  return [...set];
}
