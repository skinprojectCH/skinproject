import { createClient } from '@supabase/supabase-js';

// Läuft als Vercel Serverless Function unter /api/registration-upload.
// Der Kunde hat während der Registrierung keine Supabase-Session, daher läuft
// der Storage-Upload + die customer_documents-Zeile hier über den Service-Role-Key.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { customerId, type, fileName, mimeType, dataBase64 } = req.body || {};
  if (!customerId || !type || !dataBase64 || !['id_photo', 'signature', 'document'].includes(type)) {
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

    const ext = (fileName || '').split('.').pop() || (mimeType === 'image/png' ? 'png' : 'jpg');
    const path = `${customerId}/${type}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(dataBase64, 'base64');

    const { error: uploadError } = await admin.storage.from('customer-files').upload(path, buffer, { contentType: mimeType || 'image/jpeg' });
    if (uploadError) {
      res.status(400).json({ error: uploadError.message });
      return;
    }

    const { data: doc, error: insertError } = await admin
      .from('customer_documents')
      .insert({ customer_id: customerId, type, storage_path: path, file_name: fileName || null })
      .select('id')
      .single();
    if (insertError || !doc) {
      res.status(400).json({ error: insertError?.message || 'Dokument konnte nicht gespeichert werden.' });
      return;
    }

    res.status(200).json({ ok: true, documentId: doc.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
