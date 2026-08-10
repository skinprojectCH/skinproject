import { useState } from 'react';
import Papa from 'papaparse';
import { fetchCustomers } from '../../lib/queries';

export default function KundenExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCount, setLastCount] = useState<number | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const customers = await fetchCustomers();
      const rows = customers.map((c) => ({
        Vorname: c.vorname,
        Nachname: c.name,
        Email: c.email || '',
        Telefon: c.phone || '',
        Telefon_Eltern: c.parent_phone || '',
        Geburtstag: c.birthdate || '',
        Adresse: c.strasse || '',
        PLZ_Ort: c.plz_ort || '',
        Gesundheitshinweis: c.health_notice || '',
        Notizen: c.notes || '',
      }));
      const csv = Papa.unparse(rows, { delimiter: ';' });
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `kunden-export-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastCount(customers.length);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ fontSize: 18, marginBottom: 6 }}>Kunden exportieren</h2>
      <p style={{ color: '#999', fontSize: 13, marginBottom: 20 }}>
        Exportiert alle Kunden als CSV-Datei (Semikolon-getrennt) -- Name, Kontaktdaten, Geburtstag, Gesundheitshinweis und Notizen.
      </p>

      <button className="btn btn-primary" onClick={handleExport} disabled={loading}>
        {loading ? 'Exportiere…' : 'CSV herunterladen'}
      </button>

      {lastCount !== null && !loading && (
        <div style={{ marginTop: 16, fontSize: 13, color: '#1a7a3f' }}>✓ {lastCount.toLocaleString('de-CH')} Kunden exportiert</div>
      )}
      {error && (
        <div style={{ marginTop: 16, padding: 14, background: '#F6ECEC', color: 'var(--color-destructive)', borderRadius: 6, fontSize: 13 }}>
          Fehler: {error}
        </div>
      )}
    </div>
  );
}
