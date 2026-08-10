import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, emailLayout } from '../server/resend.js';

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
  const purchaseType = session.metadata?.purchaseType === 'anzahlung' ? 'anzahlung' : 'gutschein';
  const amount = Number(session.metadata?.amount || (session.amount_total ? session.amount_total / 100 : 0));

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

    if (purchaseType === 'anzahlung') {
      // Anzahlung muss zwingend einem Kundenprofil zugeordnet sein -- vorhandenen Kunden
      // per Telefonnummer suchen, sonst per E-Mail, sonst neu anlegen.
      const phone = session.metadata?.customerPhone || '';
      const email = session.metadata?.customerEmail || session.customer_details?.email || '';

      let customerId: string | null = null;

      if (phone) {
        const { data: byPhone } = await admin.from('customers').select('id').eq('phone', phone).maybeSingle();
        if (byPhone) customerId = byPhone.id;
      }
      if (!customerId && email) {
        const { data: byEmail } = await admin.from('customers').select('id').eq('email', email).maybeSingle();
        if (byEmail) customerId = byEmail.id;
      }

      if (!customerId) {
        const { data: newCustomer, error: customerError } = await admin
          .from('customers')
          .insert({
            vorname: session.metadata?.customerVorname || '',
            name: session.metadata?.customerName || '',
            birthdate: session.metadata?.customerBirthdate || null,
            phone: phone || null,
            email: email || null,
            strasse: session.metadata?.customerStrasse || null,
            plz_ort: session.metadata?.customerPlzOrt || null,
          })
          .select()
          .single();
        if (customerError || !newCustomer) {
          res.status(500).json({ error: customerError?.message || 'Kunde konnte nicht angelegt werden.' });
          return;
        }
        customerId = newCustomer.id;
      }

      const { data: voucher, error: voucherError } = await admin
        .from('vouchers')
        .insert({
          code,
          value: amount,
          remaining_value: amount,
          status: 'aktiv',
          source: 'online',
          type: 'anzahlung',
          buyer_customer_id: customerId,
          location_id: mainLocation.id,
          stripe_session_id: session.id,
        })
        .select()
        .single();
      if (voucherError || !voucher) {
        res.status(500).json({ error: voucherError?.message || 'Anzahlung konnte nicht angelegt werden.' });
        return;
      }

      const { data: order, error: orderError } = await admin
        .from('orders')
        .insert({ location_id: mainLocation.id, customer_id: customerId, subtotal: amount, total: amount, status: 'bezahlt', is_anzahlung: true })
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
        description: `Anzahlung ${code} (Online-Kauf)`,
        quantity: 1,
        unit_price: amount,
        line_total: amount,
      });

      await admin.from('payments').insert({ order_id: order.id, method: 'online', amount, voucher_id: null });

      if (email) {
        try {
          await sendEmail({
            to: email,
            subject: 'Bestätigung deiner Anzahlung',
            html: emailLayout(`
              <h2 style="font-size: 18px; margin: 0 0 4px;">Danke für deine Anzahlung!</h2>
              <p style="font-size: 14px; color: #555; margin: 0 0 20px;">Wir haben deine Zahlung erhalten und deinem Kundenkonto gutgeschrieben.</p>
              <div style="padding: 18px 20px; border: 1px solid #eee; border-radius: 8px;">
                <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                  <tr><td style="padding: 4px 0; color: #888;">Code</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${code}</td></tr>
                  <tr><td style="padding: 4px 0; color: #888;">Betrag</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">CHF ${amount.toFixed(2)}</td></tr>
                  <tr><td style="padding: 4px 0; color: #888;">Datum</td><td style="padding: 4px 0; text-align: right;">${new Date().toLocaleDateString('de-CH')}</td></tr>
                </table>
              </div>
              <p style="font-size: 13px; color: #888; margin-top: 16px;">Dein Guthaben kannst du bei deinem nächsten Termin einlösen.</p>
            `),
          });
        } catch (emailError: any) {
          // Zahlung ist bereits verbucht -- ein Mail-Fehler darf den Webhook nicht
          // fehlschlagen lassen (Stripe würde sonst unnötig erneut zustellen).
          // eslint-disable-next-line no-console
          console.error('Anzahlungs-Bestätigungsmail fehlgeschlagen:', emailError.message);
        }
      }

      res.status(200).json({ received: true, voucherCode: code });
      return;
    }

    // Gutschein (Standardfall)
    const buyerName = session.metadata?.buyerName || null;
    const buyerEmail = session.customer_details?.email || null;

    const { data: voucher, error: voucherError } = await admin
      .from('vouchers')
      .insert({
        code,
        value: amount,
        remaining_value: amount,
        status: 'aktiv',
        source: 'online',
        type: 'gutschein',
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

    await admin.from('payments').insert({ order_id: order.id, method: 'online', amount, voucher_id: null });

    if (buyerEmail) {
      try {
        await sendEmail({
          to: buyerEmail,
          subject: 'Dein SkinProject-Gutschein',
          html: emailLayout(`
            <h2 style="font-size: 18px; margin: 0 0 4px;">Danke für deinen Kauf!</h2>
            <p style="font-size: 14px; color: #555; margin: 0 0 20px;">Dein Gutschein ist bereit -- hier die Bestätigung und Quittung.</p>
            <div style="padding: 18px 20px; border: 2px dashed #111; border-radius: 8px; text-align: center;">
              <div style="font-size: 22px; font-weight: 700; letter-spacing: 1px;">${code}</div>
              <div style="font-size: 13px; color: #555; margin-top: 6px;">CHF ${amount.toFixed(2)}</div>
            </div>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-top: 16px;">
              <tr><td style="padding: 4px 0; color: #888;">Käufer</td><td style="padding: 4px 0; text-align: right;">${buyerName || '—'}</td></tr>
              <tr><td style="padding: 4px 0; color: #888;">Datum</td><td style="padding: 4px 0; text-align: right;">${new Date().toLocaleDateString('de-CH')}</td></tr>
            </table>
            <p style="font-size: 13px; color: #888; margin-top: 16px;">Die druckbare PDF-Quittung findest du auf der Bestätigungsseite direkt nach dem Kauf zum Download.</p>
          `),
        });
      } catch (emailError: any) {
        // eslint-disable-next-line no-console
        console.error('Gutschein-Bestätigungsmail fehlgeschlagen:', emailError.message);
      }
    }

    res.status(200).json({ received: true, voucherCode: code });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
