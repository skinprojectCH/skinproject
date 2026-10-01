// Zentrale Definition der Zahlungsarten (DB-Wert -> Anzeige).
// 'anzahlung_alt' = Anzahlung, die der Kunde noch in der ALTEN Kasse bezahlt hat und jetzt
// einlöst (temporär, bis alle alten Anzahlungen abgebaut sind). Wird manuell mit Betrag erfasst.
export const PAYMENT_LABELS: Record<string, string> = {
  bar: 'Bar',
  karte: 'Karte',
  twint: 'TWINT',
  rechnung: 'Rechnung',
  online: 'Online',
  gutschein: 'Gutschein',
  anzahlung: 'Anzahlung',
  anzahlung_alt: 'Anzahlung alte Kasse',
  gutschein_alt: 'Gutschein ALT',
};

export function paymentLabel(method: string) {
  return PAYMENT_LABELS[String(method || '').toLowerCase()] || method;
}

// Zahlungen, bei denen heute KEIN Geld eingeht (Guthaben wurde früher bezahlt).
export function isNoMoneyIn(method: string) {
  const m = String(method || '').toLowerCase();
  return m === 'gutschein' || m === 'anzahlung' || m === 'anzahlung_alt' || m === 'gutschein_alt';
}

// Anzeige-Name aus der Kasse ("Anzahlung alte Kasse") -> DB-Wert ("anzahlung_alt").
export function toDbMethod(uiMethod: string) {
  const m = String(uiMethod || '').toLowerCase();
  if (m === 'anzahlung alte kasse') return 'anzahlung_alt';
  if (m === 'gutschein alt') return 'gutschein_alt';
  return m;
}
