import { createClient } from '@supabase/supabase-js';

// Läuft als Vercel Serverless Function unter /api/submit-registration.
// Der Kunde hat keine Supabase-Session (öffentlicher Link ohne Login), daher können
// die RLS-geschützten Tabellen (customers, health_questionnaire_responses, consents)
// nicht direkt vom Browser aus beschrieben werden — das läuft hier über den Service-Role-Key.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { customerId, locationId, profile, treatmentType, treatmentDetail, answers, healthNoticeText, consentAccepted } = req.body || {};

  if ((!customerId && !locationId) || !consentAccepted || !Array.isArray(answers)) {
    res.status(400).json({ error: 'Angaben unvollständig.' });
    return;
  }
  if (!customerId && (!profile?.vorname?.trim() || !profile?.name?.trim())) {
    res.status(400).json({ error: 'Vorname und Name sind erforderlich.' });
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
    let finalCustomerId: string = customerId || '';

    if (finalCustomerId) {
      const { data: existingCustomer, error: findError } = await admin.from('customers').select('id').eq('id', finalCustomerId).single();
      if (findError || !existingCustomer) {
        res.status(404).json({ error: 'Kunde nicht gefunden.' });
        return;
      }
    } else {
      const { data: location, error: locError } = await admin.from('locations').select('id').eq('id', locationId).single();
      if (locError || !location) {
        res.status(404).json({ error: 'Location nicht gefunden.' });
        return;
      }
      const { data: newCustomer, error: createError } = await admin
        .from('customers')
        .insert({
          vorname: profile.vorname.trim(),
          name: profile.name.trim(),
          email: profile?.email || null,
          phone: profile?.phone || null,
          birthdate: profile?.birthdate || null,
          strasse: profile?.strasse || null,
          plz_ort: profile?.plzOrt || null,
        })
        .select('id')
        .single();
      if (createError || !newCustomer) {
        res.status(400).json({ error: createError?.message || 'Kunde konnte nicht angelegt werden.' });
        return;
      }
      finalCustomerId = newCustomer.id;
    }

    const customerId_ = finalCustomerId;
    const customerPatch: Record<string, any> = { health_notice: healthNoticeText || null };
    if (profile?.email) customerPatch.email = profile.email;
    if (profile?.phone) customerPatch.phone = profile.phone;
    if (profile?.birthdate) customerPatch.birthdate = profile.birthdate;
    if (profile?.strasse) customerPatch.strasse = profile.strasse;
    if (profile?.plzOrt) customerPatch.plz_ort = profile.plzOrt;

    const { error: updateError } = await admin.from('customers').update(customerPatch).eq('id', customerId_);
    if (updateError) {
      res.status(400).json({ error: updateError.message });
      return;
    }

    // Vorherige Antworten ersetzen (falls der Kunde den Link ein zweites Mal ausfüllt).
    await admin.from('health_questionnaire_responses').delete().eq('customer_id', customerId_);

    const rows = [
      { customer_id: customerId_, question_key: 'treatment_type', answer: true, detail_text: treatmentType || null },
      { customer_id: customerId_, question_key: 'treatment_detail', answer: true, detail_text: treatmentDetail || null },
      ...answers.map((a: any) => ({ customer_id: customerId_, question_key: a.key, answer: !!a.answer, detail_text: a.detail || null })),
    ];
    const { error: insertError } = await admin.from('health_questionnaire_responses').insert(rows);
    if (insertError) {
      res.status(400).json({ error: insertError.message });
      return;
    }

    const { error: consentError } = await admin.from('consents').insert({
      customer_id: customerId_,
      consent_version: `registrierung-${new Date().toISOString().slice(0, 10)}`,
      signed_at: new Date().toISOString(),
    });
    if (consentError) {
      res.status(400).json({ error: consentError.message });
      return;
    }

    res.status(200).json({ ok: true, customerId: customerId_ });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
