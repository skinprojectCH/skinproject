import { useEffect, useState } from 'react';
import { searchCustomers, type Customer } from '../lib/queries';

// Ersetzt <select> mit allen Kunden als <option> (unbrauchbar bei 8000+ Kunden) durch
// eine Autocomplete mit serverseitiger Suche. Wird in TerminModal/EditTerminModal
// verwendet.
export default function CustomerAutocomplete({
  selectedCustomer,
  onSelect,
  placeholder = 'Name oder Telefon suchen…',
}: {
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(selectedCustomer ? `${selectedCustomer.vorname} ${selectedCustomer.name}` : '');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setQuery(selectedCustomer ? `${selectedCustomer.vorname} ${selectedCustomer.name}` : '');
  }, [selectedCustomer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const q = query.trim();
    if (!q || (selectedCustomer && q === `${selectedCustomer.vorname} ${selectedCustomer.name}`)) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      searchCustomers(q, 20)
        .then(setResults)
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' }}
      />
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 4,
            marginTop: 4,
            maxHeight: 220,
            overflowY: 'auto',
            zIndex: 20,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <div
            onMouseDown={() => {
              onSelect(null);
              setQuery('');
              setOpen(false);
            }}
            style={{ padding: '9px 12px', fontSize: 13, color: '#777', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
          >
            Laufkunde (kein Kunde)
          </div>
          {searching && <div style={{ padding: '9px 12px', fontSize: 12, color: '#999' }}>Sucht…</div>}
          {!searching && results.length === 0 && query.trim() && (
            <div style={{ padding: '9px 12px', fontSize: 12, color: '#999' }}>Keine Treffer.</div>
          )}
          {results.map((c) => (
            <div
              key={c.id}
              onMouseDown={() => {
                onSelect(c);
                setQuery(`${c.vorname} ${c.name}`);
                setOpen(false);
              }}
              style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
            >
              <div>
                {c.vorname} {c.name}
              </div>
              {c.phone && <div style={{ color: '#999' }}>{c.phone}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
