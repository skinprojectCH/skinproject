import { createClient } from '@supabase/supabase-js';

// Läuft als Vercel Serverless Function unter /api/staff-list.
// Liefert nur unkritische Basisdaten (Name, Rolle, Standort) für den PIN-Login-Screen
// der Hauptapp -- läuft VOR dem Login, daher kein RLS-Zugriff über den Browser-Client
// möglich. Gibt NIE pin_hash/pin_salt zurück. Artists sind hier bewusst nicht dabei --
// die loggen sich über ihren eigenen /artist/:id-Link ein, nicht über diesen Picker.
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
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
    const [adminsRes, managersRes] = await Promise.all([
      admin.from('admin_accounts').select('id, vorname, name, status, pin_hash').eq('status', 'active'),
      admin.from('location_managers').select('id, vorname, name, role, location_id, status, pin_hash').eq('status', 'active'),
    ]);
    if (adminsRes.error) throw adminsRes.error;
    if (managersRes.error) throw managersRes.error;

    const admins = (adminsRes.data || []).map((a: any) => ({ id: a.id, role: 'admin', vorname: a.vorname, name: a.name, locationId: null, pinConfigured: !!a.pin_hash }));
    const staff = (managersRes.data || []).map((m: any) => ({ id: m.id, role: m.role, vorname: m.vorname, name: m.name, locationId: m.location_id, pinConfigured: !!m.pin_hash }));

    res.status(200).json({ staff: [...admins, ...staff] });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unbekannter Fehler.' });
  }
}
