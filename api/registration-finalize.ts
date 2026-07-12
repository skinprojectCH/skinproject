import { createClient } from '@supabase/supabase-js';

// Läuft als Vercel Serverless Function unter /api/registration-finalize.
// Letzter Schritt (N7 "Abschliessen"): schreibt Gesundheitsfragebogen-Antworten,
// Einverständnis und den Gesundheitshinweis-Callout-Text auf den Kunden.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { customerId, treatmentType, treatmentDetail, answers, healthNoticeText, consentAccepted, signatureDocumentId } = req.body || {};

  if (!customerId || !consentAccepted || !Array.isArray(answers)) {
    res.status(400).json({ error: 'Angaben unvollständig.' });
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
    const { data: customer, error: findError } = await admin.from('customers').select('id').eq('id', customerId).single();
    if (findError || !customer) {
      res.status(404).json({ error: 'Kunde nicht gefunden.' });
      return;
    }

    const { error: patchError } = await admin.from('customers').update({ health_notice: healthNoticeText || null }).eq('id', customerId);
    if (patchError) {
      res.status(400).json({ error: patchError.message });
      return;
    }

    // Vorherige Antworten ersetzen (falls der Kunde den Link ein zweites Mal ausfüllt).
    await admin.from('health_questionnaire_responses').delete().eq('customer_id', customerId);

    const rows = [
      { customer_id: customerId, question_key: 'treatment_type', answer: true, detail_text: treatmentType || null },
      { customer_id: customerId, question_key: 'treatment_detail', answer: true, detail_text: treatmentDetail || null },
      ...answers.map((a: any) => ({ customer_id: customerId, question_key: a.key, answer: !!a.answer, detail_text: a.detail || null })),
    ];
    const { error: insertError } = await admin.from('health_questionnaire_responses').insert(rows);
    if (insertError) {
      res.status(400).json({ error: insertError.message });
      return;
    }

    const { error: consentError } = await admin.from('consents').insert({
      customer_id: customerId,
      consent_version: `registrierung-${new Date().toISOString().slice(0, 10)}`,
      signed_at: new Date().toISOString(),
      signature_document_id: signatureDocumentId || null,
    });
    if (consentError) {
      res.status(400).json({ error: consentError.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
