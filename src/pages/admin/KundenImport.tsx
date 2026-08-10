import { useState } from 'react';
import Papa from 'papaparse';
import { processImportRows, type ImportCustomer, type RawImportRow } from '../../lib/customerImport';
import { fetchExistingCustomerEmails, bulkInsertCustomers } from '../../lib/queries';

type Phase = 'idle' | 'parsed' | 'importing' | 'done' | 'error';

export default function KundenImport() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState('');
  const [rawCount, setRawCount] = useState(0);
  const [processed, setProcessed] = useState<ImportCustomer[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [withHealthNotice, setWithHealthNotice] = useState(0);
  const [progress, setProgress] = useState(0);
  const [importedTotal, setImportedTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [toImport, setToImport] = useState<ImportCustomer[]>([]);

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    Papa.parse<RawImportRow>(file, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data;
          setRawCount(rows.length);
          const deduped = processImportRows(rows);
          setProcessed(deduped);
          setWithHealthNotice(deduped.filter((c) => c.health_notice).length);

          const existingEmails = await fetchExistingCustomerEmails();
          const fresh = deduped.filter((c) => !c.email || !existingEmails.has(c.email.toLowerCase()));
          setToImport(fresh);
          setNewCount(fresh.length);
          setDuplicateCount(deduped.length - fresh.length);
          setPhase('parsed');
        } catch (e: any) {
          setError(e.message);
          setPhase('error');
        }
      },
      error: (e: any) => {
        setError(e.message);
        setPhase('error');
      },
    });
  }

  async function handleImport() {
    setPhase('importing');
    setError(null);
    try {
      const total = await bulkInsertCustomers(toImport, 300, (done) => setProgress(done));
      setImportedTotal(total);
      setPhase('done');
    } catch (e: any) {
      setError(e.message);
      setPhase('error');
    }
  }

  function reset() {
    setPhase('idle');
    setFileName('');
    setRawCount(0);
    setProcessed([]);
    setToImport([]);
    setNewCount(0);
    setDuplicateCount(0);
    setWithHealthNotice(0);
    setProgress(0);
    setImportedTotal(0);
    setError(null);
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ fontSize: 18, marginBottom: 6 }}>Kunden importieren</h2>
      <p style={{ color: '#999', fontSize: 13, marginBottom: 20 }}>
        CSV-Export aus dem alten Buchungssystem hochladen (Semikolon-getrennt, Spalten wie Vorname, Nachname, Email, Telefon, Geburtstag,
        Gesundheitsfragen). Mehrfachbuchungen derselben Person werden automatisch zusammengeführt; bereits vorhandene Kunden (gleiche E-Mail)
        werden übersprungen.
      </p>

      {phase === 'idle' && (
        <div style={{ border: '2px dashed var(--color-border)', borderRadius: 8, padding: 40, textAlign: 'center' }}>
          <input
            type="file"
            accept=".csv"
            id="csv-input"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <label htmlFor="csv-input" className="btn btn-primary" style={{ cursor: 'pointer' }}>
            CSV-Datei auswählen
          </label>
        </div>
      )}

      {phase === 'parsed' && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 20, background: 'var(--color-surface)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{fileName}</div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <div>{rawCount.toLocaleString('de-CH')} Zeilen in der Datei</div>
            <div>{processed.length.toLocaleString('de-CH')} eindeutige Personen (nach Zusammenführung von Mehrfachbuchungen)</div>
            <div>{withHealthNotice.toLocaleString('de-CH')} davon mit Gesundheitshinweis</div>
            <div style={{ color: '#1a7a3f', fontWeight: 600 }}>{newCount.toLocaleString('de-CH')} neu zu importieren</div>
            {duplicateCount > 0 && (
              <div style={{ color: '#999' }}>{duplicateCount.toLocaleString('de-CH')} bereits vorhanden (übersprungen, gleiche E-Mail)</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-primary" onClick={handleImport} disabled={newCount === 0}>
              {newCount.toLocaleString('de-CH')} Kunden importieren
            </button>
            <button className="btn btn-secondary" onClick={reset}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {phase === 'importing' && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 20, background: 'var(--color-surface)' }}>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            Importiere… {progress.toLocaleString('de-CH')} / {newCount.toLocaleString('de-CH')}
          </div>
          <div style={{ height: 8, borderRadius: 4, background: '#eee', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(progress / Math.max(newCount, 1)) * 100}%`, background: 'var(--color-accent)', transition: 'width 0.2s' }} />
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 20, background: 'var(--color-surface)' }}>
          <div style={{ fontSize: 14, color: '#1a7a3f', fontWeight: 700, marginBottom: 10 }}>
            ✓ {importedTotal.toLocaleString('de-CH')} Kunden erfolgreich importiert
          </div>
          <button className="btn btn-secondary" onClick={reset}>
            Weitere Datei importieren
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, padding: 14, background: '#F6ECEC', color: 'var(--color-destructive)', borderRadius: 6, fontSize: 13 }}>
          Fehler: {error}
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-secondary" onClick={reset}>
              Nochmal versuchen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
