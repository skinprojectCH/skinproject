import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { fetchServiceCategories, fetchServices, type Service, type ServiceCategory } from '../../lib/queries';
import { supabase } from '../../lib/supabaseClient';

const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%' };

function EditServiceModal({ service, categories, onClose, onSaved }: { service: Service; categories: ServiceCategory[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(service.name);
  const [price, setPrice] = useState(String(service.price));
  const [duration, setDuration] = useState(String(service.duration_minutes));
  const [categoryId, setCategoryId] = useState(service.category_id || '');
  const [active, setActive] = useState(service.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from('services')
      .update({ name, price: parseFloat(price) || 0, duration_minutes: parseInt(duration) || 0, category_id: categoryId || null, active })
      .eq('id', service.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
  }

  return (
    <Modal title="Dienstleistung bearbeiten" onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Name
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Preis CHF
          </div>
          <input value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Dauer (min)
          </div>
          <input value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Kategorie
        </div>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
          <option value="">Keine</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Status</div>
        <div onClick={() => setActive((a) => !a)} style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', fontSize: 11, cursor: 'pointer' }}>
          <div style={{ padding: '4px 10px', background: active ? '#111' : 'transparent', color: active ? '#fff' : '#999' }}>Aktiv</div>
          <div style={{ padding: '4px 10px', background: !active ? '#111' : 'transparent', color: !active ? '#fff' : '#999' }}>Inaktiv</div>
        </div>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
      </div>
    </Modal>
  );
}

export default function Dienstleistungen() {
  const [categoryId, setCategoryId] = useState('Alle');
  const [editing, setEditing] = useState<Service | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    Promise.all([fetchServices(), fetchServiceCategories()])
      .then(([s, c]) => {
        setServices(s);
        setCategories(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  const filtered = services.filter((s) => categoryId === 'Alle' || s.category_id === categoryId);
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name || '—';

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <div style={{ width: 180, flexShrink: 0 }}>
        <div className="label-uppercase" style={{ marginBottom: 10 }}>
          Kategorie
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
          <div onClick={() => setCategoryId('Alle')} style={{ padding: '8px 10px', background: categoryId === 'Alle' ? '#111' : 'transparent', color: categoryId === 'Alle' ? '#fff' : '#555', borderRadius: 4, marginBottom: 4, cursor: 'pointer' }}>
            Alle
          </div>
          {categories.map((c) => (
            <div key={c.id} onClick={() => setCategoryId(c.id)} style={{ padding: '8px 10px', color: categoryId === c.id ? '#111' : '#555', fontWeight: categoryId === c.id ? 700 : 400, cursor: 'pointer' }}>
              {c.name}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 24 }}>Dienstleistungen</h1>
          <button className="btn btn-primary">+ Neuer Service</button>
        </div>

        {loading && <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>}
        {error && <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>}

        {!loading && !error && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 90px 90px 100px 80px 50px', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
              <div>Name</div>
              <div>Preis</div>
              <div>Dauer</div>
              <div>Kategorie</div>
              <div>Status</div>
              <div />
            </div>

            {filtered.map((s) => (
              <div
                key={s.id}
                onClick={() => setEditing(s)}
                style={{ display: 'grid', gridTemplateColumns: '1.5fr 90px 90px 100px 80px 50px', padding: '14px 12px', fontSize: 13, borderBottom: '1px solid #eee', alignItems: 'center', cursor: 'pointer' }}
              >
                <div>{s.name}</div>
                <div>CHF {s.price}</div>
                <div>{s.duration_minutes} min</div>
                <div>{categoryName(s.category_id)}</div>
                <div style={{ border: `1px solid ${s.active ? 'var(--color-accent)' : '#ddd'}`, color: s.active ? 'var(--color-accent)' : '#999', borderRadius: 10, padding: '2px 10px', fontSize: 11, fontWeight: 600, width: 'fit-content' }}>
                  {s.active ? 'aktiv' : 'inaktiv'}
                </div>
                <div />
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: '20px 12px', fontSize: 13, color: '#999' }}>Keine Dienstleistungen gefunden.</div>}
            <div style={{ fontSize: 11, color: '#999', marginTop: 10 }}>Klick auf eine Zeile öffnet die Bearbeitung.</div>
          </>
        )}
      </div>

      {editing && (
        <EditServiceModal
          service={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
