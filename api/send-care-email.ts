import { createClient } from '@supabase/supabase-js';
import { sendEmail, emailLayout } from '../server/resend.js';

// Läuft als Vercel Serverless Function unter /api/send-care-email.
// Wird von der Kasse (Kasse.tsx) fire-and-forget nach einem erfolgreichen Checkout
// aufgerufen -- aber nur, wenn der Checkout zu einem konkreten Termin gehört UND
// diesem Termin explizit eine Einverständniserklärung zugewiesen wurde (Kunden-
// Detailseite -> Dokument -> "Termin zuweisen"). Laufkunden-Verkäufe ohne Termin
// und Termine ohne zugewiesenes Formular lösen NIE eine Mail aus.
// Schickt die zum Behandlungstyp (Tattoo/Piercing) passende Pflegeanleitung an
// den Kunden, plus einen als reinen Hinweistext angezeigten Dankeschön-Rabatt
// (Prozentsatz + Kleingedrucktes, kein Code, kein einlösbarer Gutschein-Datensatz)
// -- Konfiguration erfolgt in den Einstellungen.
//
// Bricht überall dort still ab (200 OK, kein Versand), wo Bedingungen fehlen --
// der Checkout an der Kasse darf dadurch nie fehlschlagen oder blockiert werden.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { orderId } = req.body || {};
  if (!orderId) {
    res.status(400).json({ error: 'orderId fehlt.' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server nicht korrekt konfiguriert.' });
    return;
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data: order } = await admin.from('orders').select('id, customer_id, appointment_id, care_email_sent_at').eq('id', orderId).maybeSingle();
    if (!order || !order.customer_id || !order.appointment_id || order.care_email_sent_at) {
      // Kein Termin verknüpft (z.B. Laufkunden-Verkauf) -> kein automatischer Versand.
      res.status(200).json({ ok: true, skipped: true, reason: !order?.appointment_id ? 'no-appointment' : undefined });
      return;
    }

    // Die Einverständniserklärung muss dem Personal explizit diesem Termin zugewiesen
    // worden sein (Kunden-Detailseite -> Dokument -> "Termin zuweisen") -- ein
    // irgendwann in der Vergangenheit ausgefülltes Formular reicht nicht, wenn es
    // nicht für DIESEN Besuch zugeordnet wurde.
    const { data: assignedConsentDoc } = await admin
      .from('customer_documents')
      .select('id')
      .eq('appointment_id', order.appointment_id)
      .eq('type', 'document')
      .limit(1)
      .maybeSingle();
    if (!assignedConsentDoc) {
      res.status(200).json({ ok: true, skipped: true, reason: 'no-consent-form-assigned-to-appointment' });
      return;
    }

    const { data: customer } = await admin.from('customers').select('id, vorname, name, email').eq('id', order.customer_id).maybeSingle();
    if (!customer || !customer.email) {
      res.status(200).json({ ok: true, skipped: true, reason: 'no-email' });
      return;
    }

    const { data: treatmentRow } = await admin
      .from('health_questionnaire_responses')
      .select('detail_text, created_at')
      .eq('customer_id', customer.id)
      .eq('question_key', 'treatment_type')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const treatmentType = treatmentRow?.detail_text === 'piercing' ? 'piercing' : treatmentRow?.detail_text === 'tattoo' ? 'tattoo' : null;
    if (!treatmentType) {
      res.status(200).json({ ok: true, skipped: true, reason: 'no-consent-form' });
      return;
    }

    const { data: settingsRows } = await admin
      .from('app_settings')
      .select('key, value')
      .in('key', ['care_instructions_tattoo', 'care_instructions_piercing', 'thank_you_voucher_enabled', 'thank_you_discount_percent', 'thank_you_discount_text']);
    const settingsMap = new Map((settingsRows || []).map((r: any) => [r.key, r.value as string | null]));

    const careText = treatmentType === 'tattoo' ? settingsMap.get('care_instructions_tattoo') : settingsMap.get('care_instructions_piercing');
    if (!careText || !careText.trim()) {
      res.status(200).json({ ok: true, skipped: true, reason: 'no-care-text-configured' });
      return;
    }

    const discountEnabled = settingsMap.get('thank_you_voucher_enabled') === 'true';
    const discountPercent = Number(settingsMap.get('thank_you_discount_percent') || 0);
    const discountText = settingsMap.get('thank_you_discount_text') || '';

    let voucherHtml = '';
    if (discountEnabled && discountPercent > 0) {
      voucherHtml = `
        <div style="margin-top: 24px; padding: 18px 20px; border: 2px dashed #111; border-radius: 8px; text-align: center;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 6px;">Als kleines Dankeschön</div>
          <div style="font-size: 28px; font-weight: 700; letter-spacing: 1px;">${discountPercent}% Rabatt</div>
          ${discountText ? `<div style="font-size: 12px; color: #888; margin-top: 8px;">${discountText}</div>` : ''}
        </div>`;
    }

    const careTextHtml = careText
      .split(/\n{2,}/)
      .map((para) => `<p style="margin: 0 0 12px; line-height: 1.6; font-size: 14px;">${para.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    const html = emailLayout(`
      <h2 style="font-size: 18px; margin: 0 0 4px;">Hallo ${customer.vorname},</h2>
      <p style="font-size: 14px; color: #555; margin: 0 0 20px;">danke für deinen Besuch! Hier ist deine Pflegeanleitung für dein ${treatmentType === 'tattoo' ? 'Tattoo' : 'Piercing'}.</p>
      ${careTextHtml}
      ${voucherHtml}
    `);

    await sendEmail({
      to: customer.email,
      subject: treatmentType === 'tattoo' ? 'Deine Pflegeanleitung fürs Tattoo' : 'Deine Pflegeanleitung fürs Piercing',
      html,
    });

    await admin.from('orders').update({ care_email_sent_at: new Date().toISOString() }).eq('id', order.id);

    res.status(200).json({ ok: true, sent: true });
  } catch (e: any) {
    // Absichtlich 200 statt 500: der Aufruf ist fire-and-forget von der Kasse aus,
    // ein Fehler hier soll im Frontend nicht auffallen. Für Diagnose steht die
    // Fehlermeldung trotzdem im Vercel-Log (via console.error).
    // eslint-disable-next-line no-console
    console.error('send-care-email fehlgeschlagen:', e.message);
    res.status(200).json({ ok: false, error: e.message });
  }
}
