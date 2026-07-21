import Stripe from 'stripe';

// Läuft als Vercel Serverless Function unter /api/create-voucher-checkout.
// Erstellt eine Stripe-Checkout-Session für einen online gekauften Gutschein und
// gibt die Checkout-URL zurück, zu der der Browser weiterleiten soll.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { amount, buyerName, buyerEmail } = req.body || {};
  const parsedAmount = Number(amount);
  if (!parsedAmount || !Number.isFinite(parsedAmount) || parsedAmount < 10 || parsedAmount > 2000) {
    res.status(400).json({ error: 'Ungültiger Betrag (10–2000 CHF).' });
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    res.status(500).json({ error: 'Online-Zahlung ist noch nicht konfiguriert. Bitte später erneut versuchen.' });
    return;
  }
  const stripe = new Stripe(stripeSecretKey);

  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'chf',
            unit_amount: Math.round(parsedAmount * 100),
            product_data: {
              name: `SkinProject Gutschein — CHF ${parsedAmount.toFixed(2)}`,
              description: 'Einlösbar an jedem SkinProject-Standort.',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        amount: String(parsedAmount),
        buyerName: buyerName || '',
      },
      customer_email: buyerEmail || undefined,
      success_url: `${origin}/gutschein-kaufen/erfolg?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/gutschein-kaufen`,
    });

    res.status(200).json({ url: session.url });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Stripe-Fehler.' });
  }
}
