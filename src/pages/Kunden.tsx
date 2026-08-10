import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchCustomers, fetchCustomerIdsWithMissingDocs, fetchCustomersByIds, type Customer } from '../lib/queries';
import { useLocationContext } from '../lib/locationContext';

function EditIcon() {
return (
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="M12 20h9" />
<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
</svg>
);
}

const SEARCH_LIMIT = 50;

export default function Kunden() {
const { isAdmin } = useLocationContext();
const [search, setSearch] = useState('');
const [results, setResults] = useState<Customer[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [hoveredRow, setHoveredRow] = useState<string | null>(null);
const [missingDocsFilter, setMissingDocsFilter] = useState(false);
const [missingDocsCustomers, setMissingDocsCustomers] = useState<Customer[] | null>(null);
const [missingDocsLoading, setMissingDocsLoading] = useState(false);
const navigate = useNavigate();

useEffect(() => {
if (missingDocsFilter) return;
const q = search.trim();
if (!q) {
setResults([]);
setLoading(false);
return;
}
setLoading(true);
setError(null);
const timeout = setTimeout(() => {
searchCustomers(q, SEARCH_LIMIT)
.then(setResults)
.catch((e) => setError(e.message))
.finally(() => setLoading(false));
}, 300);
return () => clearTimeout(timeout);
}, [search, missingDocsFilter]);

function toggleMissingDocsFilter() {
if (missingDocsFilter) {
setMissingDocsFilter(false);
return;
}
setMissingDocsFilter(true);
if (!missingDocsCustomers) {
setMissingDocsLoading(true);
fetchCustomerIdsWithMissingDocs()
.then((ids) => fetchCustomersByIds(Array.from(ids)))
.then(setMissingDocsCustomers)
.catch((e) => setError(e.message))
.finally(() => setMissingDocsLoading(false));
}
}

const baseList = missingDocsFilter ? missingDocsCustomers || [] : results;
const filtered = missingDocsFilter
? baseList.filter((c) => `${c.name} ${c.vorname}`.toLowerCase().includes(search.toLowerCase()))
: baseList;

const hasSearched = missingDocsFilter || search.trim().length > 0;

return (
<div>
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
<h1 style={{ fontSize: 24 }}>Kunden</h1>
<div style={{ display: 'flex', gap: 10 }}>
<button
onClick={toggleMissingDocsFilter}
title="Kunden mit vergangenen Terminen, bei denen Dokumente oder Fotos fehlen"
style={{
border: `1px solid ${missingDocsFilter ? 'var(--color-destructive)' : 'var(--color-border)'}`,
background: missingDocsFilter ? '#F6ECEC' : 'transparent',
color: missingDocsFilter ? 'var(--color-destructive)' : '#555',
padding: '8px 14px',
fontSize: 12,
fontWeight: 600,
borderRadius: 4,
cursor: 'pointer',
whiteSpace: 'nowrap',
}}
>
{missingDocsLoading ? 'Prüft…' : '⚠ Dokumente fehlen'}
</button>
<input
placeholder="Suche Name, Vorname…"
value={search}
onChange={(e) => setSearch(e.target.value)}
style={{ border: '1px solid var(--color-border)', padding: '8px 14px', fontSize: 12, borderRadius: 4, width: 220 }}
/>
<button className="btn btn-primary" onClick={() => navigate('/kunden/new')}>
+ Neu
</button>
{isAdmin && (
<>
<button className="btn btn-secondary" onClick={() => navigate('/admin/kundenexport')}>
Exportieren
</button>
<button className="btn btn-secondary" onClick={() => navigate('/admin/kundenimport')}>
Importieren
</button>
</>
)}
</div>
</div>

{error && <div style={{ fontSize: 13, color: 'var(--color-destructive)', marginBottom: 16 }}>Fehler beim Laden: {error}</div>}

{!hasSearched && !loading && (
<div style={{ padding: '48px 12px', textAlign: 'center', fontSize: 13, color: '#999' }}>
Tippe oben einen Namen ein, um einen Kunden zu suchen.
</div>
)}

{loading && <div style={{ fontSize: 13, color: '#999' }}>Sucht…</div>}

{hasSearched && !loading && !error && (
<>
<div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
<div
style={{
display: 'grid',
gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 40px',
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
<div>Vorname</div>
<div>Mobile</div>
<div>E-Mail</div>
<div>Geburtsdatum</div>
<div />
</div>

{filtered.map((c) => (
<div
key={c.id}
onClick={() => navigate(`/kunden/${c.id}`)}
onMouseEnter={() => setHoveredRow(c.id)}
onMouseLeave={() => setHoveredRow(null)}
role="button"
tabIndex={0}
onKeyDown={(e) => {
if (e.key === 'Enter') navigate(`/kunden/${c.id}`);
}}
style={{
display: 'grid',
gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 40px',
padding: '14px 12px',
fontSize: 13,
borderBottom: '1px solid #eee',
alignItems: 'center',
cursor: 'pointer',
background: hoveredRow === c.id ? '#fbfaf8' : 'transparent',
outline: 'none',
}}
>
<div>{c.name}</div>
<div>{c.vorname}</div>
<div>{c.phone || '—'}</div>
<div>{c.email || '—'}</div>
<div>{c.birthdate || '—'}</div>
<div style={{ display: 'flex', justifyContent: 'flex-end', color: hoveredRow === c.id ? 'var(--color-accent)' : '#ccc' }}>
<EditIcon />
</div>
</div>
))}

{filtered.length === 0 && (
<div style={{ padding: '24px 12px', fontSize: 13, color: '#999' }}>
{missingDocsFilter ? 'Keine Kunden mit fehlenden Dokumenten gefunden.' : 'Keine Kunden entsprechen der Suche.'}
</div>
)}
</div>
{!missingDocsFilter && results.length === SEARCH_LIMIT && (
<div style={{ marginTop: 10, fontSize: 12, color: '#999' }}>
Zeigt die ersten {SEARCH_LIMIT} Treffer -- bitte genauer suchen, falls der gesuchte Kunde nicht dabei ist.
</div>
)}
</>
)}
</div>
);
}
