import { useState } from 'react';
import Modal from '../../components/Modal';

const CATEGORIES = ['Pflege', 'Schmuck', 'Merch'];

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  barcode: string;
  active: boolean;
}

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Heilsalbe 50ml', price: 18, description: 'Nachpflege-Salbe', category: 'Pflege', barcode: '7 640123 456789', active: true },
  { id: 'p2', name: 'Ohrstecker Titan', price: 25, description: 'Hypoallergen', category: 'Schmuck', barcode: '7 640123 456790', active: true },
  { id: 'p3', name: 'Studio T-Shirt', price: 35, description: 'S–XL', category: 'Merch', barcode: '7 640123 456791', active: false },
];

const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%' };

function EditProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [active, setActive] = useState(product.active);
  return (
    <Modal title="Artikel bearbeiten" onClose={onClose} width={440}>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Name
        </div>
        <input defaultValue={product.name} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Preis
        </div>
        <input defaultValue={`CHF ${product.price}`} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Barcode
        </div>
        <div style={{ ...inputStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>{product.barcode}</div>
          <div style={{ color: '#999' }}>▤</div>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Beschreibung
        </div>
        <textarea defaultValue={product.description} style={{ ...inputStyle, minHeight: 44, fontFamily: 'var(--font-body)' }} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Kategorie
        </div>
        <select defaultValue={product.category} style={inputStyle}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12 }}>Status</div>
        <div onClick={() => setActive((a) => !a)} style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', fontSize: 11, cursor: 'pointer' }}>
          <div style={{ padding: '4px 10px', background: active ? '#111' : 'transparent', color: active ? '#fff' : '#999' }}>Aktiv</div>
          <div style={{ padding: '4px 10px', background: !active ? '#111' : 'transparent', color: !active ? '#fff' : '#999' }}>Inaktiv</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Speichern
        </button>
      </div>
    </Modal>
  );
}

export default function Produkte() {
  const [category, setCategory] = useState('Alle');
  const [editing, setEditing] = useState<Product | null>(null);

  const filtered = MOCK_PRODUCTS.filter((p) => category === 'Alle' || p.category === category);

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <div style={{ width: 180, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="label-uppercase">Kategorien</div>
          <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>+ Neu</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
          <div
            onClick={() => setCategory('Alle')}
            style={{ padding: '8px 10px', background: category === 'Alle' ? '#111' : 'transparent', color: category === 'Alle' ? '#fff' : '#555', borderRadius: 4, marginBottom: 4, cursor: 'pointer' }}
          >
            Alle
          </div>
          {CATEGORIES.map((c) => (
            <div key={c} onClick={() => setCategory(c)} style={{ padding: '8px 10px', color: category === c ? '#111' : '#555', fontWeight: category === c ? 700 : 400, cursor: 'pointer' }}>
              {c}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 24 }}>Produkte · Artikel</h1>
          <button className="btn btn-primary">+ Neuer Artikel</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 90px 1.5fr 100px 80px 50px', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
          <div>Name</div>
          <div>Preis</div>
          <div>Beschreibung</div>
          <div>Kategorie</div>
          <div>Status</div>
          <div />
        </div>

        {filtered.map((p) => (
          <div
            key={p.id}
            onClick={() => setEditing(p)}
            style={{ display: 'grid', gridTemplateColumns: '1.5fr 90px 1.5fr 100px 80px 50px', padding: '14px 12px', fontSize: 13, borderBottom: '1px solid #eee', alignItems: 'center', cursor: 'pointer' }}
          >
            <div>{p.name}</div>
            <div>CHF {p.price}</div>
            <div style={{ color: '#777' }}>{p.description}</div>
            <div>{p.category}</div>
            <div
              style={{
                border: `1px solid ${p.active ? 'var(--color-accent)' : '#ddd'}`,
                color: p.active ? 'var(--color-accent)' : '#999',
                borderRadius: 10,
                padding: '2px 10px',
                fontSize: 11,
                fontWeight: 600,
                width: 'fit-content',
              }}
            >
              {p.active ? 'aktiv' : 'inaktiv'}
            </div>
            <div />
          </div>
        ))}
      </div>

      {editing && <EditProductModal product={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
