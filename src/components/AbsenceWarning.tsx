import { useEffect, useState } from 'react';
import { fetchAbsencesForDate, type Absence } from '../lib/queries';

const TYPE_LABELS: Record<string, string> = { ferien: 'Ferien', krank: 'Krank', abwesend: 'Abwesend' };

function fmt(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Roter Hinweis, wenn der gewählte Artist am gewählten Datum eine Absenz hat.
// Buchen bleibt möglich -- es ist nur eine Warnung.
export default function AbsenceWarning({ artistId, date, time }: { artistId: string | null | undefined; date: string; time?: string }) {
  const [absences, setAbsences] = useState<Absence[]>([]);

  useEffect(() => {
    setAbsences([]);
    if (!artistId || !date) return;
    let cancelled = false;
    fetchAbsencesForDate([artistId], date)
      .then((list) => !cancelled && setAbsences(list))
      .catch(() => !cancelled && setAbsences([]));
    return () => {
      cancelled = true;
    };
  }, [artistId, date]);

  if (absences.length === 0) return null;

  return (
    <div style={{ border: '1px solid var(--color-destructive)', background: '#F6ECEC', color: 'var(--color-destructive)', borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 12, lineHeight: 1.5 }}>
      {absences.map((a) => {
        const half = a.half_day === 'am' ? 'Vormittag' : a.half_day === 'pm' ? 'Nachmittag' : 'ganzer Tag';
        // Bei halbem Tag prüfen, ob die gewählte Startzeit in die Absenz fällt (Grenze 12:00).
        const hour = time ? Number(time.slice(0, 2)) : null;
        const clash = a.half_day === 'none' || hour === null || (a.half_day === 'am' ? hour < 12 : hour >= 12);
        const range = a.start_date === a.end_date ? fmt(a.start_date) : `${fmt(a.start_date)} – ${fmt(a.end_date)}`;
        return (
          <div key={a.id}>
            <strong>⚠ Achtung: Artist hat eine Absenz</strong> – {TYPE_LABELS[a.type] || a.type} ({half}), {range}
            {a.notes ? ` · ${a.notes}` : ''}
            {!clash && <span style={{ color: '#8a6a10' }}> · gewählte Zeit liegt ausserhalb der Absenz</span>}
          </div>
        );
      })}
    </div>
  );
}
