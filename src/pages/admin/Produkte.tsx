import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import {
  fetchProductCategories,
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  countProductsInCategory,
  type Product,
  type ProductCategory,
} from '../../lib/queries';

const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ---------- Artikel erstellen / bearbeiten ----------
function ProductModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null; // null = neu anlegen
  categories: ProductCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = product === null;
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [barcode, setBarcode] = useState(product?.barcode || '');
  const [description, setDescription] = useState(product?.description || '');
  const [categoryId, setCategoryId] = useState(product?.category_id || (categories[0]?.id ?? ''));
  const [active, setActive] = useState(product?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const nameValid = name.trim().length > 0;
  const priceValid = price !== '' && !isNaN(parseFloat(price));
  const canSave = nameValid && priceValid;
  const errorInputStyle: React.CSSProperties = { ...inputStyle, border: '1px solid var(--color-destructive)' };

  async function handleSave() {
    setAttempted(true);
    if (!canSave) {
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        price: parseFloat(price),
        barcode: barcode.trim() || null,
        description: description.trim() || null,
        category_id: categoryId || null,
        active,
      };
      if (isNew) {
        await createProduct(payload);
      } else {
        await updateProduct(product!.id, payload);
      }
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteProduct(product!.id);
      onSaved();
    } catch (e: any) {
      setError(
        e.message?.includes('foreign key')
          ? 'Dieser Artikel wurde bereits in Bestellungen verwendet und kann nicht gelöscht werden — stattdessen auf "Inaktiv" setzen.'
          : e.message
      );
      setDeleting(false);
    }
  }

  return (
    <Modal title={isNew ? 'Neuer Artikel' : 'Artikel bearbeiten'} onClose={onClose} width={440}>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Name
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} style={attempted && !nameValid ? errorInputStyle : inputStyle} placeholder="z.B. Heilsalbe 50ml" autoFocus />
        {attempted && !nameValid && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 4 }}>Bitte einen Namen eingeben.</div>}
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Preis CHF
        </div>
        <input value={price} onChange={(e) => setPrice(e.target.value)} style={attempted && !priceValid ? errorInputStyle : inputStyle} placeholder="0.00" inputMode="decimal" />
        {attempted && !priceValid && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 4 }}>Preis fehlt oder ungültig.</div>}
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Barcode
        </div>
        <input value={barcode} onChange={(e) => setBarcode(e.target.value)} style={inputStyle} placeholder="optional" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Beschreibung
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 44 }} placeholder="Kurze Beschreibung" />
      </div>
      <div style={{ marginBottom: 16 }}>
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
        <div style={{ fontSize: 12 }}>Status</div>
        <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', fontSize: 11 }}>
          <button onClick={() => setActive(true)} style={{ padding: '4px 10px', background: active ? '#111' : 'transparent', color: active ? '#fff' : '#999', border: 'none' }}>
            Aktiv
          </button>
          <button onClick={() => setActive(false)} style={{ padding: '4px 10px', background: !active ? '#111' : 'transparent', color: !active ? '#fff' : '#999', border: 'none' }}>
            Inaktiv
          </button>
        </div>
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: isNew ? 0 : 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
          {saving ? 'Speichert…' : isNew ? 'Erstellen' : 'Speichern'}
        </button>
      </div>

      {!isNew &&
        (!confirmDelete ? (
          <button className="btn btn-destructive" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setConfirmDelete(true)}>
            Artikel löschen
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDelete(false)}>
              Doch nicht
            </button>
            <button
              className="btn btn-destructive"
              style={{ flex: 1, justifyContent: 'center', background: 'var(--color-destructive)', color: '#fff', opacity: deleting ? 0.6 : 1 }}
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Löscht…' : 'Wirklich löschen'}
            </button>
          </div>
        ))}
    </Modal>
  );
}

// ---------- Kategorie erstellen / bearbeiten ----------
function CategoryModal({ category, onClose, onSaved }: { category: ProductCategory | null; onClose: () => void; onSaved: () => void }) {
  const isNew = category === null;
  const [name, setName] = useState(category?.name || '');
  const [active, setActive] = useState(category?.active ?? true);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isNew) {
      countProductsInCategory(category!.id).then(setProductCount).catch(() => setProductCount(null));
    }
  }, [isNew, category]);

  const willDeactivateProducts = !isNew && active === false && category!.active === true && !!productCount;
  const canDelete = productCount === 0;

  async function handleSave() {
    if (!name.trim()) {
      setError('Bitte einen Namen eingeben.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await createProductCategory(name.trim());
      } else {
        await updateProductCategory(category!.id, name.trim(), active);
      }
      onSaved();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      await deleteProductCategory(category!.id);
      onSaved();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Modal title={isNew ? 'Neue Kategorie' : 'Kategorie bearbeiten'} onClose={onClose} width={380}>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Name
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="z.B. Merch…" autoFocus />
      </div>

      {!isNew && (
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Status</div>
          <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', fontSize: 11 }}>
            <button onClick={() => setActive(true)} style={{ padding: '4px 10px', background: active ? '#111' : 'transparent', color: active ? '#fff' : '#999', border: 'none' }}>
              Aktiv
            </button>
            <button onClick={() => setActive(false)} style={{ padding: '4px 10px', background: !active ? '#111' : 'transparent', color: !active ? '#fff' : '#999', border: 'none' }}>
              Inaktiv
            </button>
          </div>
        </div>
      )}

      {willDeactivateProducts && (
        <div style={{ fontSize: 11, color: '#8A6D2E', background: 'var(--color-warn-bg)', border: '1px solid var(--color-warn-border)', borderRadius: 4, padding: '8px 10px', marginBottom: 14 }}>
          Diese Kategorie hat {productCount} Produkt{productCount === 1 ? '' : 'e'}. Beim Speichern werden alle automatisch mit auf "Inaktiv" gesetzt.
        </div>
      )}

      {!isNew && productCount !== null && productCount > 0 && (
        <div style={{ fontSize: 11, color: '#999', marginBottom: 14 }}>
          {productCount} Produkt{productCount === 1 ? '' : 'e'} zugeordnet.
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: isNew ? 0 : 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
          {saving ? 'Speichert…' : isNew ? 'Erstellen' : 'Speichern'}
        </button>
      </div>

      {!isNew &&
        (!confirmDelete ? (
          <button
            className="btn btn-destructive"
            style={{ width: '100%', justifyContent: 'center', opacity: canDelete ? 1 : 0.4, cursor: canDelete ? 'pointer' : 'not-allowed' }}
            onClick={() => (canDelete ? setConfirmDelete(true) : setError(`Diese Kategorie enthält noch ${productCount} Produkt${productCount === 1 ? '' : 'e'} und kann nicht gelöscht werden — stattdessen auf "Inaktiv" setzen.`))}
          >
            Kategorie löschen
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDelete(false)}>
              Doch nicht
            </button>
            <button className="btn btn-destructive" style={{ flex: 1, justifyContent: 'center', background: 'var(--color-destructive)', color: '#fff' }} onClick={handleDelete}>
              Wirklich löschen
            </button>
          </div>
        ))}
    </Modal>
  );
}

export default function Produkte() {
  const [categoryId, setCategoryId] = useState('Alle');
  const [statusFilter, setStatusFilter] = useState<'alle' | 'aktiv' | 'inaktiv'>('aktiv');
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    Promise.all([fetchProducts(), fetchProductCategories()])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryId !== 'Alle' && p.category_id !== categoryId) return false;
      if (statusFilter === 'aktiv' && !p.active) return false;
      if (statusFilter === 'inaktiv' && p.active) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [products, categoryId, statusFilter, search]);

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name || '—';

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="label-uppercase">Kategorien</div>
          <button onClick={() => setCreatingCategory(true)} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            + Neu
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
          <button
            onClick={() => setCategoryId('Alle')}
            onMouseEnter={() => setHoveredCategory('Alle')}
            onMouseLeave={() => setHoveredCategory(null)}
            style={{
              padding: '8px 10px',
              background: categoryId === 'Alle' ? '#111' : hoveredCategory === 'Alle' ? '#fbfaf8' : 'transparent',
              color: categoryId === 'Alle' ? '#fff' : '#555',
              borderRadius: 4,
              marginBottom: 4,
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            Alle
          </button>
          {categories.map((c) => (
            <div
              key={c.id}
              onMouseEnter={() => setHoveredCategory(c.id)}
              onMouseLeave={() => setHoveredCategory(null)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 4, background: categoryId === c.id ? '#f4f2ed' : hoveredCategory === c.id ? '#fbfaf8' : 'transparent' }}
            >
              <button
                onClick={() => setCategoryId(c.id)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  color: categoryId === c.id ? '#111' : c.active ? '#555' : '#bbb',
                  fontWeight: categoryId === c.id ? 700 : 400,
                  fontStyle: c.active ? 'normal' : 'italic',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {c.name}
                {!c.active && <span style={{ fontSize: 10, marginLeft: 4 }}>(inaktiv)</span>}
              </button>
              <button
                onClick={() => setEditingCategory(c)}
                title="Kategorie bearbeiten"
                style={{ background: 'none', border: 'none', color: hoveredCategory === c.id ? 'var(--color-accent)' : '#999', cursor: 'pointer', padding: '4px 8px', display: 'flex' }}
              >
                <EditIcon />
              </button>
            </div>
          ))}
        </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 24 }}>Produkte · Artikel</h1>
          <button className="btn btn-primary" onClick={() => setCreatingProduct(true)}>
            + Neuer Artikel
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--color-border)', padding: '8px 14px', fontSize: 12, borderRadius: 4, width: 220, color: '#555' }}>
            <SearchIcon />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Artikel suchen…"
              style={{ border: 'none', outline: 'none', fontSize: 12, width: '100%', fontFamily: 'var(--font-body)' }}
            />
          </div>
          <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
            {(['alle', 'aktiv', 'inaktiv'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                style={{ padding: '8px 14px', background: statusFilter === f ? '#111' : 'transparent', color: statusFilter === f ? '#fff' : '#555', border: 'none', textTransform: 'capitalize', cursor: 'pointer' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading && <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>}
        {error && <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>}

        {!loading && !error && (
          <>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.3fr 80px 1.3fr 100px 80px 40px',
                padding: '10px 12px',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: '#999',
                borderBottom: '1px solid var(--color-border)',
                fontWeight: 600,
              }}
            >
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
                onClick={() => setEditingProduct(p)}
                onMouseEnter={() => setHoveredRow(p.id)}
                onMouseLeave={() => setHoveredRow(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingProduct(p);
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.3fr 80px 1.3fr 100px 80px 40px',
                  padding: '14px 12px',
                  fontSize: 13,
                  borderBottom: '1px solid #eee',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: hoveredRow === p.id ? '#fbfaf8' : 'transparent',
                  outline: 'none',
                }}
              >
                <div style={{ fontWeight: 500 }}>{p.name}</div>
                <div>CHF {p.price}</div>
                <div style={{ color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || '—'}</div>
                <div>{categoryName(p.category_id)}</div>
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', color: hoveredRow === p.id ? 'var(--color-accent)' : '#ccc' }}>
                  <EditIcon />
                </div>
              </div>
            ))}

            {filtered.length === 0 && products.length > 0 && (
              <div style={{ padding: '24px 12px', fontSize: 13, color: '#999' }}>Keine Artikel entsprechen der Suche/dem Filter.</div>
            )}
            {products.length === 0 && (
              <div style={{ padding: '24px 12px', fontSize: 13, color: '#999' }}>
                Noch keine Artikel erfasst. <span onClick={() => setCreatingProduct(true)} style={{ color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>Jetzt anlegen</span>.
              </div>
            )}
            </div>
            {filtered.length > 0 && <div style={{ fontSize: 11, color: '#999', marginTop: 10 }}>Klick auf eine Zeile öffnet die Bearbeitung.</div>}
          </>
        )}
      </div>

      {editingProduct && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            reload();
          }}
        />
      )}
      {creatingProduct && (
        <ProductModal
          product={null}
          categories={categories}
          onClose={() => setCreatingProduct(false)}
          onSaved={() => {
            setCreatingProduct(false);
            reload();
          }}
        />
      )}
      {editingCategory && (
        <CategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSaved={() => {
            setEditingCategory(null);
            reload();
          }}
        />
      )}
      {creatingCategory && (
        <CategoryModal
          category={null}
          onClose={() => setCreatingCategory(false)}
          onSaved={() => {
            setCreatingCategory(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
