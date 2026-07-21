import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Läuft als Vercel Serverless Function unter /api/stripe-webhook.
// Muss in Stripe als Webhook-Endpoint eingetragen werden, Event: checkout.session.completed.
// WICHTIG: liest den RAW Body für die Signaturprüfung, kein automatisches JSON-Parsing.
export const config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function generateVoucherCode() {
  return '2SK-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecretKey || !webhookSecret) {
    res.status(500).json({ error: 'Stripe nicht korrekt konfiguriert.' });
    return;
  }
  const stripe = new Stripe(stripeSecretKey);

  const rawBody = await readRawBody(req);
  const signature = req.headers['stripe-signature'];

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    res.status(400).json({ error: `Webhook-Signatur ungültig: ${err.message}` });
    return;
  }

  if (event.type !== 'checkout.session.completed') {
    res.status(200).json({ received: true, ignored: true });
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const amount = Number(session.metadata?.amount || (session.amount_total ? session.amount_total / 100 : 0));
  const buyerName = session.metadata?.buyerName || null;
  const buyerEmail = session.customer_details?.email || null;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server nicht korrekt konfiguriert.' });
    return;
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    // Idempotenz: Stripe kann denselben Webhook mehrfach zustellen (Retries) -- nicht
    // doppelt anlegen, falls diese Session bereits verarbeitet wurde.
    const { data: existing } = await admin.from('vouchers').select('id').eq('stripe_session_id', session.id).maybeSingle();
    if (existing) {
      res.status(200).json({ ok: true, alreadyProcessed: true });
      return;
    }

    const { data: mainLocation, error: mainLocationError } = await admin.from('locations').select('id').eq('is_main', true).maybeSingle();
    if (mainLocationError || !mainLocation) {
      res.status(500).json({ error: 'Keine Haupt-Location konfiguriert (Admin → Locations).' });
      return;
    }

    const code = generateVoucherCode();

    const { data: voucher, error: voucherError } = await admin
      .from('vouchers')
      .insert({
        code,
        value: amount,
        remaining_value: amount,
        status: 'aktiv',
        source: 'online',
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        stripe_session_id: session.id,
      })
      .select()
      .single();
    if (voucherError || !voucher) {
      res.status(500).json({ error: voucherError?.message || 'Gutschein konnte nicht angelegt werden.' });
      return;
    }

    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({ location_id: mainLocation.id, customer_id: null, subtotal: amount, total: amount, status: 'bezahlt' })
      .select()
      .single();
    if (orderError || !order) {
      res.status(500).json({ error: orderError?.message || 'Bestellung konnte nicht angelegt werden.' });
      return;
    }

    await admin.from('order_line_items').insert({
      order_id: order.id,
      service_id: null,
      product_id: null,
      description: `Gutschein ${code} (Online-Kauf)`,
      quantity: 1,
      unit_price: amount,
      line_total: amount,
    });

    await admin.from('payments').insert({ order_id: order.id, method: 'online', amount, voucher_id: voucher.id });

    res.status(200).json({ received: true, voucherCode: code });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
