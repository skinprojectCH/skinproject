import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchCustomer, type Customer } from '../lib/queries';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ margin: '14px 0 6px' }}>
      <div className="label-uppercase" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ borderBottom: '1.5px solid #ccc', padding: '8px 2px', fontSize: 13 }}>{value}</div>
    </div>
  );
}

export default function KundeDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchCustomer(id)
      .then(setCustomer)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>;
  if (error) return <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>;
  if (!customer) return <div style={{ fontSize: 13, color: '#999' }}>Kunde nicht gefunden.</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 28 }}>
        <div style={{ width: 340, flexShrink: 0 }}>
          <h2 style={{ fontSize: 19, marginBottom: 16 }}>Kunde bearbeiten</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Name" value={customer.name} />
            <Field label="Vorname" value={customer.vorname} />
          </div>
          <Field label="Geburtsdatum" value={customer.birthdate || '—'} />
          <Field label="Mobile" value={customer.phone || '—'} />
          <Field label="E-Mail" value={customer.email || '—'} />

          <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 14, marginBottom: 20, marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Notizen</div>
            <div style={{ fontSize: 12, color: '#555', border: '1px solid #eee', borderRadius: 4, padding: 10, marginBottom: 8, minHeight: 60 }}>
              {customer.notes || 'Keine Notizen erfasst.'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 }}>+ Notiz hinzufügen</div>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Dokumente</div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>Noch keine Dokumente hochgeladen.</div>
            <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 }}>+ Dokument hochladen</div>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Fotos</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ aspectRatio: '1', background: 'repeating-linear-gradient(45deg,#f4f3f0,#f4f3f0 6px,#EFEEEA 6px,#EFEEEA 12px)', borderRadius: 4 }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 }}>+ Foto hochladen</div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Speichern
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {customer.health_notice && (
            <div style={{ border: '1px solid var(--color-warn-border)', background: 'var(--color-warn-bg)', borderRadius: 6, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8A6D2E', fontWeight: 700, marginBottom: 6 }}>
                Gesundheitshinweise (aus Anmeldeformular)
              </div>
              <div style={{ fontSize: 12, color: '#5a4a20', lineHeight: 1.6 }}>{customer.health_notice}</div>
            </div>
          )}

          <h3 style={{ fontSize: 16, marginBottom: 2 }}>Vergangene Termine</h3>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>Wird aus `appointments` + `orders` geladen, sobald Termine mit diesem Kunden kassiert wurden.</div>
        </div>
      </div>
    </div>
  );
}
