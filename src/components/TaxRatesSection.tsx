import { useEffect, useState } from 'react';
import { addTaxRate, deleteTaxRate, fetchTaxRates, type TaxRate } from '../lib/queries';

function fmt(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Steuersätze mit Gültigkeitsdatum (z.B. neuer MWST-Satz ab 01.01.2027).
export default function TaxRatesSection({ locationId }: { locationId: string }) {
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [validFrom, setValidFrom] = useState('');
  const [mwst, setMwst] = useState('');
  const [saldo, setSaldo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    fetchTaxRates(locationId).then(setRates);
  }
  useEffect(reload, [locationId]);

  const today = new Date().toISOString().slice(0, 10);
  const current = [...rates].reverse().find((r) => r.valid_from <= today) || null;

  async function handleAdd() {
    if (!validFrom) return setError('Bitte ein Datum "Gültig ab" wählen.');
    if (!mwst && !saldo) return setError('Bitte mindestens einen Satz eingeben.');
    setSaving(true);
    setError(null);
    try {
      // Nicht eingegebene Werte vom bis dahin gültigen Satz übernehmen.
      const before = [...rates].reverse().find((r) => r.valid_from <= validFrom) || null;
      await addTaxRate({
        location_id: locationId,
        valid_from: validFrom,
        mwst_prozent: mwst ? parseFloat(mwst.replace(',', '.')) : before?.mwst_prozent ?? null,
        saldosteuersatz: saldo ? parseFloat(saldo.replace(',', '.')) : before?.saldosteuersatz ?? null,
      });
      setValidFrom('');
      setMwst('');
      setSaldo('');
      reload();
    } catch (e: any) {
      setError(e.message?.includes('location_tax_rates') ? 'Bitte zuerst Migration 043 in Supabase ausführen.' : e.message);
    } finally {
      setSaving(false);
    }
  }

  const input: React.CSSProperties = { border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Steuersätze mit Gültigkeit</div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
        Für Satzänderungen im Voraus erfassen (z.B. ab 01.01.2027). Quittungen und MWST-Berechnung verwenden automatisch den Satz, der am Verkaufsdatum gilt.
      </div>

      {rates.length > 0 && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 40px', padding: '8px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', fontWeight: 600, borderBottom: '1px solid var(--color-border)' }}>
            <div>Gültig ab</div>
            <div>MWST %</div>
            <div>Saldosteuer %</div>
            <div />
          </div>
          {rates.map((r) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 40px', padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #eee', alignItems: 'center', background: current?.id === r.id ? '#F3F8F4' : 'transparent' }}>
              <div>
                {r.valid_from <= '2000-01-01' ? 'seit Beginn' : fmt(r.valid_from)}
                {current?.id === r.id && <span style={{ fontSize: 10, color: '#1a7a3f', fontWeight: 700, marginLeft: 6 }}>AKTUELL</span>}
                {r.valid_from > today && <span style={{ fontSize: 10, color: 'var(--color-accent)', fontWeight: 700, marginLeft: 6 }}>GEPLANT</span>}
              </div>
              <div>{r.mwst_prozent ?? '—'}</div>
              <div>{r.saldosteuersatz ?? '—'}</div>
              <div style={{ textAlign: 'right' }}>
                {r.valid_from > today && (
                  <span
                    onClick={async () => {
                      await deleteTaxRate(r.id);
                      reload();
                    }}
                    title="Geplanten Satz löschen"
                    style={{ cursor: 'pointer', color: '#999' }}
                  >
                    ✕
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>Gültig ab</div>
          <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} style={input} />
        </div>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>MWST %</div>
          <input value={mwst} onChange={(e) => setMwst(e.target.value)} style={input} inputMode="decimal" placeholder="z.B. 8.1" />
        </div>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>Saldosteuer %</div>
          <input value={saldo} onChange={(e) => setSaldo(e.target.value)} style={input} inputMode="decimal" placeholder="z.B. 5.3" />
        </div>
        <button className="btn btn-outline" disabled={saving} onClick={handleAdd} style={{ opacity: saving ? 0.6 : 1 }}>
          {saving ? '…' : '+ Erfassen'}
        </button>
      </div>
      {error && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 6 }}>{error}</div>}
    </div>
  );
}
