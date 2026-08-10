// Normalisiert Telefonnummern auf Schweizer Format +41XXXXXXXXX (ohne Leerschläge, ohne Trennzeichen).
// Beispiele: "079 555 12 34" -> "+41795551234", "0041 79 555 12 34" -> "+41795551234"
// Wurde explizit eine andere Landesvorwahl mit "+" eingegeben (z.B. "+49 495 556 6633"),
// wird diese respektiert und NICHT mit +41 überschrieben.
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const hasExplicitCountryCode = trimmed.startsWith('+');
  let digits = trimmed.replace(/[^\d+]/g, '');
  digits = digits.replace(/\+/g, '');

  if (hasExplicitCountryCode) {
    return digits ? `+${digits}` : '';
  }

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

// Rundet auf die kleinste im Bargeldverkehr existierende Einheit (5 Rappen), z.B. für
// Totalbeträge, Rabatte, MWST-Beträge etc.
export function roundToRappen(amount: number): number {
  return Math.round(amount / 0.05) * 0.05;
}

// Formatiert einen Betrag als Schweizer Franken mit Tausender-Apostroph und immer zwei
// Nachkommastellen, gerundet auf 5 Rappen, z.B. "CHF 1'840.00" oder "CHF 12.05"
export function formatCHF(amount: number): string {
  const rounded = roundToRappen(amount);
  return `CHF ${rounded.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
