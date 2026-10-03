import type { Customer } from '../lib/queries';
import { useLocationContext } from '../lib/locationContext';

// Hinweis vor dem Anlegen: es gibt bereits Kunden mit dieser Nummer bzw. gleichem Namen +
// Geburtsdatum. Erlaubt "bestehenden verwenden" oder bewusst trotzdem neu anlegen
// (z.B. Geschwister / Kind mit Eltern-Nummer).
export default function DuplicateWarning({
  matches,
  useLabel,
  onUse,
  onCreateAnyway,
  onCancel,
  creating,
  vorname,
  name,
}: {
  matches: Customer[];
  useLabel: string;
  onUse: (c: Customer) => void;
  onCreateAnyway: () => void;
  onCancel: () => void;
  creating?: boolean;
  vorname: string;
  name: string;
}) {
  const { isAdmin } = useLocationContext();
  const norm = (v: string | null | undefined) => (v || '').trim().toLowerCase();
  // Gleicher Vor- UND Nachname = dieselbe Person -> nur Admin darf trotzdem ein zweites
  // Profil anlegen. Anderer Name (z.B. Kind mit Eltern-Nummer) bleibt für alle erlaubt.
  const sameName = matches.some((c) => norm(c.vorname) === norm(vorname) && norm(c.name) === norm(name));
  const canCreateAnyway = !sameName || isAdmin;
  return (
    <div style={{ border: '1px solid #E3C46B', background: '#FFF7DC', borderRadius: 6, padding: 12, marginBottom: 14, fontSize: 12, color: '#5a4a20' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠ Es gibt bereits {matches.length === 1 ? 'einen Kunden' : `${matches.length} Kunden`} mit dieser Nummer oder diesem Namen + Geburtsdatum</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {matches.map((c) => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #EFDDA6', borderRadius: 4, padding: '6px 8px' }}>
            <div>
              <strong>
                {c.vorname} {c.name}
              </strong>
              <div style={{ color: '#8a7a50', fontSize: 11 }}>
                {[c.phone, (c as any).parent_phone ? `Eltern: ${(c as any).parent_phone}` : null, c.birthdate ? new Date(`${c.birthdate}T12:00:00`).toLocaleDateString('de-CH') : null].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button className="btn btn-outline" style={{ fontSize: 11, padding: '5px 10px', whiteSpace: 'nowrap' }} onClick={() => onUse(c)}>
              {useLabel}
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '6px 10px' }} onClick={onCancel}>
          Abbrechen
        </button>
        {canCreateAnyway ? (
          <button className="btn btn-primary" style={{ fontSize: 11, padding: '6px 10px', opacity: creating ? 0.6 : 1 }} disabled={creating} onClick={onCreateAnyway}>
            {creating ? 'Speichert…' : sameName ? 'Trotzdem neu anlegen (nur Admin)' : 'Trotzdem neu anlegen (andere Person)'}
          </button>
        ) : (
          <div style={{ fontSize: 11, color: '#8a3b3b', alignSelf: 'center' }}>
            Gleiche Person existiert bereits – bitte das bestehende Profil verwenden.
          </div>
        )}
      </div>
    </div>
  );
}
