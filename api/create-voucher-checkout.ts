import Stripe from 'stripe';

function normalizePhone(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  const hasExplicitCountryCode = trimmed.startsWith('+');
  let digits = trimmed.replace(/[^\d+]/g, '').replace(/\+/g, '');
  if (hasExplicitCountryCode) {
    if (digits.startsWith('410')) digits = '41' + digits.slice(3); // "+41 079…" -> führende 0 weg
    return digits ? `+${digits}` : '';
  }
  if (digits.startsWith('0041')) digits = digits.slice(2);
  else if (digits.startsWith('41')) {
    // schon mit Landesvorwahl
  } else if (digits.startsWith('0')) digits = '41' + digits.slice(1);
  else if (digits.length > 0) digits = '41' + digits;
  if (digits.startsWith('410')) digits = '41' + digits.slice(3); // "+41 079…" -> führende 0 weg
  return digits ? `+${digits}` : '';
}

// Verkaufsfenster Halloween-Special: ab sofort bis 1.11.2026 23:59 (Europe/Zurich = UTC+1
// im November). Serverseitig geprüft, damit sich das Ticket nach Ablauf nicht mehr kaufen
// lässt, selbst wenn die Aktions-Karte clientseitig noch sichtbar wäre (Cache etc.).
const HALLOWEEN_DEAL_CUTOFF = new Date('2026-11-01T23:59:00+01:00');
const HALLOWEEN_DEAL_PRICE = 31;
const HALLOWEEN_CAMPAIGN = 'halloween_piercing_2026';

// Läuft als Vercel Serverless Function unter /api/create-voucher-checkout.
// Erstellt eine Stripe-Checkout-Session für einen online gekauften Gutschein, eine online
// getätigte Anzahlung, ODER das Halloween-Piercing-Ticket (Fixpreis-Aktion), und gibt die
// Checkout-URL zurück, zu der der Browser weiterleiten soll. purchaseType steuert, welcher
// Fall es ist.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { purchaseType, amount, buyerName, buyerEmail, customer } = req.body || {};
  const type: 'gutschein' | 'anzahlung' | 'halloween' =
    purchaseType === 'anzahlung' ? 'anzahlung' : purchaseType === 'halloween' ? 'halloween' : 'gutschein';

  if (type === 'halloween' && new Date() > HALLOWEEN_DEAL_CUTOFF) {
    res.status(400).json({ error: 'Das Halloween-Special ist leider abgelaufen (gültig bis 1.11.2026, 23:59 Uhr).' });
    return;
  }

  // Beim Halloween-Ticket ist der Preis fix -- unabhängig davon, was der Client schickt.
  const parsedAmount = type === 'halloween' ? HALLOWEEN_DEAL_PRICE : Number(amount);
  if (!parsedAmount || !Number.isFinite(parsedAmount) || parsedAmount < 10 || parsedAmount > 2000) {
    res.status(400).json({ error: 'Ungültiger Betrag (10–2000 CHF).' });
    return;
  }

  let metadata: Record<string, string> = { purchaseType: type, amount: String(parsedAmount) };
  let customerEmailForStripe: string | undefined;

  if (type === 'gutschein' || type === 'halloween') {
    if (!buyerName || !String(buyerName).trim() || !buyerEmail || !String(buyerEmail).trim()) {
      res.status(400).json({ error: 'Name und E-Mail sind erforderlich.' });
      return;
    }
    metadata.buyerName = String(buyerName).trim();
    customerEmailForStripe = String(buyerEmail).trim();
    if (type === 'halloween') {
      metadata.campaign = HALLOWEEN_CAMPAIGN;
      metadata.dealFullCoverage = 'true';
    }
  } else {
    // Anzahlung: die Anzahlung muss zwingend einem Kundenprofil zugeordnet werden können,
    // daher braucht es alle Angaben, die für ein Kundenprofil nötig sind.
    const c = customer || {};
    const requiredFields = ['vorname', 'name', 'birthdate', 'phone', 'email', 'strasse', 'plzOrt'];
    const missing = requiredFields.filter((f) => !c[f] || !String(c[f]).trim());
    if (missing.length > 0) {
      res.status(400).json({ error: 'Bitte alle Kundenangaben ausfüllen.' });
      return;
    }
    const normalizedPhone = normalizePhone(c.phone);
    if (!normalizedPhone) {
      res.status(400).json({ error: 'Ungültige Telefonnummer.' });
      return;
    }
    metadata = {
      ...metadata,
      customerVorname: String(c.vorname).trim().slice(0, 200),
      customerName: String(c.name).trim().slice(0, 200),
      customerBirthdate: String(c.birthdate).trim().slice(0, 30),
      customerPhone: normalizedPhone.slice(0, 30),
      customerEmail: String(c.email).trim().slice(0, 200),
      customerStrasse: String(c.strasse).trim().slice(0, 200),
      customerPlzOrt: String(c.plzOrt).trim().slice(0, 200),
    };
    customerEmailForStripe = String(c.email).trim();
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    res.status(500).json({ error: 'Online-Zahlung ist noch nicht konfiguriert. Bitte später erneut versuchen.' });
    return;
  }
  const stripe = new Stripe(stripeSecretKey);

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const productName =
    type === 'anzahlung'
      ? `SkinProject Anzahlung — CHF ${parsedAmount.toFixed(2)}`
      : type === 'halloween'
        ? 'SkinProject Halloween-Piercing-Special'
        : `SkinProject Gutschein — CHF ${parsedAmount.toFixed(2)}`;
  const productDescription =
    type === 'anzahlung'
      ? 'Guthaben für einen künftigen Termin bei SkinProject.'
      : type === 'halloween'
        ? '1x Piercing deiner Wahl inkl. Titanschmuck, jederzeit einlösbar. Ausgenommen Intim-/Wohlfühl-Piercings.'
        : 'Einlösbar an jedem SkinProject-Standort.';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'chf',
            unit_amount: Math.round(parsedAmount * 100),
            product_data: { name: productName, description: productDescription },
          },
          quantity: 1,
        },
      ],
      metadata,
      customer_email: customerEmailForStripe || undefined,
      success_url: `${origin}/gutschein-kaufen/erfolg?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/gutschein-kaufen`,
    });

    res.status(200).json({ url: session.url });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Stripe-Fehler.' });
  }
}
