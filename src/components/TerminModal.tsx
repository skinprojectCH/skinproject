import { useEffect, useState } from 'react';
import Modal from './Modal';
import { fetchArtists, fetchCustomers, fetchServices, createAppointment, createAbsence, type Artist, type Customer, type Service } from '../lib/queries';

const ABSENCE_TYPES: { key: 'ferien' | 'krank' | 'abwesend'; label: string }[] = [
  { key: 'ferien', label: 'Ferien' },
  { key: 'krank', label: 'Krank' },
  { key: 'abwesend', label: 'Abwesend' },
];

function fieldLabel(text: string) {
  return (
    <div className="label-uppercase" style={{ marginBottom: 4 }}>
      {text}
    </div>
  );
}

const boxStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13 };

export default function TerminModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [tab, setTab] = useState<'termin' | 'absenz'>('termin');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [artists, setArtists] = useState<Artist[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    Promise.all([fetchArtists(), fetchCustomers(), fetchServices()])
      .then(([a, c, s]) => {
        setArtists(a);
        setCustomers(c);
        setServices(s.filter((sv) => sv.active));
        if (a.length) setSelectedArtist(a[0].id);
        if (s.length) setSelectedServices([s[0].id]);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Termin-State
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>('14:00');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const totalDuration = selectedServices.reduce((sum, id) => sum + (services.find((s) => s.id === id)?.duration_minutes || 0), 0);
  const totalPrice = selectedServices.reduce((sum, id) => sum + (services.find((s) => s.id === id)?.price || 0), 0);

  // Absenz-State
  const [absenceType, setAbsenceType] = useState<'ferien' | 'krank' | 'abwesend'>('ferien');
  const [absenceArtist, setAbsenceArtist] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().slice(0, 10));
  const [halfDay, setHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<'vormittag' | 'nachmittag'>('vormittag');

  useEffect(() => {
    if (artists.length && !absenceArtist) setAbsenceArtist(artists[0].id);
  }, [artists, absenceArtist]);

  async function handleSaveTermin() {
    if (!selectedArtist || !time || !date) {
      setError('Bitte Artist, Datum und Zeit auswählen.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const startISO = `${date}T${time}:00`;
      const endDate = new Date(startISO);
      endDate.setMinutes(endDate.getMinutes() + (totalDuration || 30));
      await createAppointment({
        customer_id: selectedCustomer || null,
        artist_id: selectedArtist,
        start_time: startISO,
        end_time: endDate.toISOString(),
        type: 'termin',
      });
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAbsenz() {
    if (!absenceArtist) {
      setError('Bitte Artist auswählen.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAbsence({
        artist_id: absenceArtist,
        type: absenceType,
        start_date: dateFrom,
        end_date: dateTo,
        half_day: halfDay ? (halfDayPeriod === 'vormittag' ? 'am' : 'pm') : 'none',
      });
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={tab === 'termin' ? 'Neuer Termin' : 'Neue Absenz'} onClose={onClose}>
      <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontSize: 12, marginBottom: 16 }}>
        <button
          onClick={() => setTab('termin')}
          style={{ flex: 1, textAlign: 'center', padding: 8, background: tab === 'termin' ? '#111' : 'transparent', color: tab === 'termin' ? '#fff' : '#777', border: 'none', fontWeight: tab === 'termin' ? 600 : 400 }}
        >
          Termin
        </button>
        <button
          onClick={() => setTab('absenz')}
          style={{ flex: 1, textAlign: 'center', padding: 8, background: tab === 'absenz' ? '#111' : 'transparent', color: tab === 'absenz' ? '#fff' : '#777', border: 'none', fontWeight: tab === 'absenz' ? 600 : 400 }}
        >
          Absenz
        </button>
      </div>

      {tab === 'termin' ? (
        <>
          <div style={{ marginBottom: 14 }}>
            {fieldLabel('Kunde auswählen')}
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} style={{ ...boxStyle, width: '100%' }}>
              <option value="">Laufkunde (kein Kunde)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.vorname} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            {fieldLabel('Artist auswählen')}
            <select value={selectedArtist} onChange={(e) => setSelectedArtist(e.target.value)} style={{ ...boxStyle, width: '100%' }}>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              {fieldLabel('Datum auswählen')}
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...boxStyle, width: '100%' }} />
            </div>
            <div>
              {fieldLabel('Startzeit')}
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...boxStyle, width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            {fieldLabel('Services')}
            {selectedServices.map((id) => (
              <div key={id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <select
                  value={id}
                  onChange={(e) => setSelectedServices((prev) => prev.map((sid) => (sid === id ? e.target.value : sid)))}
                  style={{ ...boxStyle, flex: 1 }}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button onClick={() => setSelectedServices((prev) => prev.filter((sid) => sid !== id))} style={{ background: 'none', border: 'none', fontSize: 14, color: '#999' }}>
                  ✕
                </button>
              </div>
            ))}
            {services.length > 0 && (
              <div onClick={() => setSelectedServices((prev) => [...prev, services[0].id])} style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
                + Weiteren Service hinzufügen
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777', marginBottom: 14, borderTop: '1px solid #eee', paddingTop: 10 }}>
            <div>Gesamtdauer: {totalDuration} min</div>
            <div style={{ fontWeight: 600, color: '#111' }}>Total: CHF {totalPrice}</div>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            {fieldLabel('Artist')}
            <select value={absenceArtist} onChange={(e) => setAbsenceArtist(e.target.value)} style={{ ...boxStyle, width: '100%' }}>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            {fieldLabel('Art der Absenz')}
            <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
              {ABSENCE_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setAbsenceType(t.key)}
                  style={{ flex: 1, textAlign: 'center', padding: 8, background: absenceType === t.key ? '#111' : 'transparent', color: absenceType === t.key ? '#fff' : '#777', border: 'none' }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              {fieldLabel('Datum von')}
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...boxStyle, width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              {fieldLabel('Datum bis')}
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...boxStyle, width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            {fieldLabel('Dauer')}
            <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontSize: 12, marginBottom: 8 }}>
              <button onClick={() => setHalfDay(false)} style={{ flex: 1, textAlign: 'center', padding: 8, background: !halfDay ? '#111' : 'transparent', color: !halfDay ? '#fff' : '#777', border: 'none' }}>
                Ganzer Tag
              </button>
              <button onClick={() => setHalfDay(true)} style={{ flex: 1, textAlign: 'center', padding: 8, background: halfDay ? '#111' : 'transparent', color: halfDay ? '#fff' : '#777', border: 'none' }}>
                Halber Tag
              </button>
            </div>
            {halfDay && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: halfDayPeriod === 'vormittag' ? 600 : 400 }}>Vormittag</div>
                <div
                  onClick={() => setHalfDayPeriod((p) => (p === 'vormittag' ? 'nachmittag' : 'vormittag'))}
                  style={{ width: 42, height: 24, background: 'var(--color-accent)', borderRadius: 12, position: 'relative', cursor: 'pointer' }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      background: '#fff',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: 3,
                      left: halfDayPeriod === 'vormittag' ? 3 : 21,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                      transition: 'left 0.15s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: halfDayPeriod === 'nachmittag' ? '#111' : '#999', fontWeight: halfDayPeriod === 'nachmittag' ? 600 : 400 }}>Nachmittag</div>
              </div>
            )}
          </div>
        </>
      )}

      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }}
          disabled={saving}
          onClick={tab === 'termin' ? handleSaveTermin : handleSaveAbsenz}
        >
          {saving ? 'Speichert…' : tab === 'termin' ? 'Speichern' : 'Absenz speichern'}
        </button>
      </div>
    </Modal>
  );
}
