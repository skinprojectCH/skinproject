// Normalisiert Telefonnummern auf Schweizer Format +41XXXXXXXXX (ohne Leerschläge, ohne Trennzeichen).
// Beispiele: "079 555 12 34" -> "+41795551234", "0041 79 555 12 34" -> "+41795551234"
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  let digits = trimmed.replace(/[^\d+]/g, '');
  digits = digits.replace(/\+/g, '');

  if (digits.startsWith('0041')) {
    digits = digits.slice(2); // "0041.." -> "41.."
  } else if (digits.startsWith('41')) {
    // bereits mit Landesvorwahl, nichts zu tun
  } else if (digits.startsWith('0')) {
    digits = '41' + digits.slice(1); // "079.." -> "4179.."
  } else if (digits.length > 0) {
    digits = '41' + digits; // "79.." -> "4179.."
  }

  return digits ? `+${digits}` : '';
}

// Formatiert einen Betrag als Schweizer Franken mit Tausender-Apostroph, z.B. "CHF 1'840"
export function formatCHF(amount: number): string {
  return `CHF ${Math.round(amount).toLocaleString('de-CH')}`;
}
