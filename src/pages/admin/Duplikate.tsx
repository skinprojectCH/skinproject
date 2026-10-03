import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDuplicateCustomers, mergeCustomers, ignoreDuplicatePhone, cleanupEmptyDuplicates, type DuplicateCustomerRow } from '../../lib/queries';

type Category = 'gleich' | 'anders' | 'familie';

function ageOf(birthdate: string | null) {
  if (!birthdate) return null;
  return Math.floor((Date.now() - new Date(`${birthdate}T12:00:00`).getTime()) / (365.25 * 24 * 3600 * 1000));
}

function nameKey(c: DuplicateCustomerRow) {
  return `${(c.vorname || '').trim().toLowerCase()}|${(c.name || '').trim().toLowerCase()}`;
}

// Hauptprofil-Vorschlag: das mit den meisten Daten (Termine/Verkäufe/Dokumente zählen viel).
function score(c: DuplicateCustomerRow) {
  const fields = ['email', 'birthdate', 'strasse', 'plz_ort'].filter((k) => (c as any)[k]).length;
  return c.appt_count * 10 + c.order_count * 10 + c.doc_count * 5 + c.photo_count * 2 + fields;
}

function categorize(group: DuplicateCustomerRow[]): Category {
  const names = new Set(group.map(nameKey));
  if (names.size === 1) return 'gleich';
  const hasMinor = group.some((c) => {
    const a = ageOf(c.birthdate);
    return a !== null && a < 18;
  });
  const hasParentLink = group.some((c) => c.parent_phone && c.parent_phone === c.phone);
  return hasMinor || hasParentLink ? 'familie' : 'anders';
}

const CAT_LABELS: Record<Category, string> = { gleich: 'Gleicher Name', anders: 'Anderer Name', familie: 'Familie (Kind unter 18)' };

function GroupCard({ phone, rows, onDone }: { phone: string; rows: DuplicateCustomerRow[]; onDone: () => void }) {
  const navigate = useNavigate();
  const sorted = useMemo(() => [...rows].sort((a, b) => score(b) - score(a) || b.created_at.localeCompare(a.created_at)), [rows]);
  const [keepId, setKeepId] = useState(sorted[0].id);
  const [mergeIds, setMergeIds] = useState<Set<string>>(() => {
    // Gleicher Name -> alle anderen vorausgewählt; sonst nur gleichnamige.
    const keepKey = nameKey(sorted[0]);
    return new Set(sorted.slice(1).filter((c) => nameKey(c) === keepKey).map((c) => c.id));
  });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = [...mergeIds].filter((id) => id !== keepId);

  async function handleMerge() {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    setError(null);
    try {
      await mergeCustomers(keepId, selected);
      onDone();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  async function handleIgnore() {
    setBusy(true);
    try {
      await ignoreDuplicatePhone(phone);
      onDone();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-surface)', padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{phone}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" style={{ fontSize: 12 }} disabled={busy} onClick={handleIgnore}>
            Verschiedene Personen
          </button>
          <button
            className="btn btn-primary"
            style={{ fontSize: 12, opacity: busy || selected.length === 0 ? 0.5 : 1, background: confirm ? 'var(--color-destructive)' : undefined }}
            disabled={busy || selected.length === 0}
            onClick={handleMerge}
          >
            {busy ? 'Führt zusammen…' : confirm ? `Wirklich ${selected.length} Profil${selected.length > 1 ? 'e' : ''} zusammenführen?` : 'Zusammenführen'}
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {sorted.map((c) => {
          const isKeep = c.id === keepId;
          const age = ageOf(c.birthdate);
          return (
            <div key={c.id} style={{ border: `1px solid ${isKeep ? 'var(--color-accent)' : 'var(--color-border)'}`, background: isKeep ? 'var(--color-accent-fill)' : 'transparent', borderRadius: 6, padding: 10, fontSize: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={isKeep}
                  onChange={() => {
                    setKeepId(c.id);
                    setConfirm(false);
                  }}
                />
                {isKeep ? 'Behalten (Hauptprofil)' : 'Behalten'}
              </label>
              {!isKeep && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, cursor: 'pointer', color: '#8a3b3b' }}>
                  <input
                    type="checkbox"
                    checked={mergeIds.has(c.id)}
                    onChange={(e) => {
                      const next = new Set(mergeIds);
                      if (e.target.checked) next.add(c.id);
                      else next.delete(c.id);
                      setMergeIds(next);
                      setConfirm(false);
                    }}
                  />
                  in Hauptprofil übernehmen & löschen
                </label>
              )}
              <div onClick={() => navigate(`/kunden/${c.id}`)} style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }} title="Profil öffnen">
                {c.vorname} {c.name}
              </div>
              <div style={{ color: '#777', lineHeight: 1.6 }}>
                Geb. {c.birthdate ? new Date(`${c.birthdate}T12:00:00`).toLocaleDateString('de-CH') : '—'}
                {age !== null && age < 18 && <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}> · unter 18</span>}
                <br />
                {c.email || '—'}
                <br />
                {[c.strasse, c.plz_ort].filter(Boolean).join(', ') || '—'}
                {c.parent_phone && (
                  <>
                    <br />
                    Eltern: {c.parent_phone}
                  </>
                )}
                <br />
                erstellt {new Date(c.created_at).toLocaleDateString('de-CH')}
              </div>
              <div style={{ marginTop: 6, fontWeight: 600 }}>
                Termine {c.appt_count} · Verkäufe {c.order_count} · Dok. {c.doc_count} · Fotos {c.photo_count}
              </div>
            </div>
          );
        })}
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginTop: 8 }}>Fehler: {error}</div>}
    </div>
  );
}

export default function Duplikate() {
  const [rows, setRows] = useState<DuplicateCustomerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Category>('gleich');
  const [limit, setLimit] = useState(30);
  const [cleanupConfirm, setCleanupConfirm] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<number | null>(null);

  function load() {
    setError(null);
    fetchDuplicateCustomers()
      .then(setRows)
      .catch((e) => setError(e.message?.includes('find_duplicate_customers') ? 'Bitte zuerst Migration 045 in Supabase ausführen.' : e.message));
  }
  useEffect(load, []);

  const groups = useMemo(() => {
    const map = new Map<string, DuplicateCustomerRow[]>();
    for (const r of rows || []) {
      if (!map.has(r.phone)) map.set(r.phone, []);
      map.get(r.phone)!.push(r);
    }
    const result: Record<Category, [string, DuplicateCustomerRow[]][]> = { gleich: [], anders: [], familie: [] };
    for (const [phone, g] of map) if (g.length > 1) result[categorize(g)].push([phone, g]);
    return result;
  }, [rows]);

  async function handleCleanup() {
    if (!cleanupConfirm) return setCleanupConfirm(true);
    setCleaning(true);
    try {
      const n = await cleanupEmptyDuplicates();
      setCleanupResult(n);
      setCleanupConfirm(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCleaning(false);
    }
  }

  const list = groups[tab];

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Duplikate</h1>
      <div style={{ fontSize: 12, color: '#777', marginBottom: 16 }}>
        Kunden mit gleicher Telefonnummer. „Zusammenführen“ verschiebt Termine, Verkäufe, Dokumente, Fotos, Gesundheitsfragen, Einverständnisse, Gutscheine und Anzahlungen ins Hauptprofil, ergänzt leere Felder und löscht die übrigen Profile. „Verschiedene Personen“ blendet die Nummer aus.
      </div>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-surface)', padding: 14, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: '#555', maxWidth: 620 }}>
          <strong>Leere Import-Duplikate bereinigen:</strong> löscht Profile mit gleichem Vor- und Nachnamen und gleicher Nummer, die <u>keine</u> Termine, Verkäufe, Dokumente, Einverständnisse oder Gutscheine haben – das vollständigste Profil bleibt, fehlende Angaben werden übernommen.
          {cleanupResult !== null && <div style={{ color: '#1a7a3f', fontWeight: 700, marginTop: 4 }}>✓ {cleanupResult} leere Duplikate bereinigt.</div>}
        </div>
        <button className="btn btn-outline" disabled={cleaning} onClick={handleCleanup} style={{ background: cleanupConfirm ? 'var(--color-destructive)' : undefined, color: cleanupConfirm ? '#fff' : undefined }}>
          {cleaning ? 'Bereinigt…' : cleanupConfirm ? 'Wirklich bereinigen?' : 'Leere Duplikate bereinigen'}
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 16, fontSize: 13 }}>
        {(['gleich', 'anders', 'familie'] as Category[]).map((c) => (
          <div
            key={c}
            onClick={() => {
              setTab(c);
              setLimit(30);
            }}
            style={{ padding: '10px 18px', cursor: 'pointer', borderBottom: tab === c ? '2px solid var(--color-accent)' : '2px solid transparent', fontWeight: tab === c ? 700 : 400, color: tab === c ? '#111' : '#777' }}
          >
            {CAT_LABELS[c]} ({groups[c].length})
          </div>
        ))}
      </div>

      {error && <div style={{ fontSize: 13, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}
      {!rows && !error && <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>}
      {rows && list.length === 0 && <div style={{ fontSize: 13, color: '#999' }}>Keine Einträge in dieser Kategorie.</div>}

      {list.slice(0, limit).map(([phone, g]) => (
        <GroupCard key={phone + g.map((x) => x.id).join()} phone={phone} rows={g} onDone={load} />
      ))}
      {list.length > limit && (
        <button className="btn btn-outline" onClick={() => setLimit((l) => l + 30)}>
          Weitere anzeigen ({list.length - limit})
        </button>
      )}
    </div>
  );
}
