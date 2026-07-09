import { useState } from 'react';

interface Slot {
  id: string;
  from: string;
  to: string;
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const INITIAL_SCHEDULE: Record<string, Slot[]> = {
  Mo: [
    { id: '1', from: '09:00', to: '12:00' },
    { id: '2', from: '14:00', to: '18:00' },
  ],
  Di: [{ id: '3', from: '09:00', to: '18:00' }],
  Mi: [{ id: '4', from: '09:00', to: '18:00' }],
  Do: [{ id: '5', from: '09:00', to: '18:00' }],
  Fr: [{ id: '6', from: '09:00', to: '18:00' }],
  Sa: [{ id: '7', from: '10:00', to: '16:00' }],
  So: [],
};

export default function Schichtplan() {
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);

  function addSlot(day: string) {
    setSchedule((prev) => ({
      ...prev,
      [day]: [...prev[day], { id: crypto.randomUUID(), from: '09:00', to: '18:00' }],
    }));
  }

  function removeSlot(day: string, id: string) {
    setSchedule((prev) => ({ ...prev, [day]: prev[day].filter((s) => s.id !== id) }));
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Schichtplan · Arbeitszeiten</h1>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <select style={{ border: '1px solid #ddd', padding: '8px 14px', fontSize: 12, borderRadius: 4 }}>
          <option>Location auswählen</option>
        </select>
        <select style={{ border: '1px solid #ddd', padding: '8px 14px', fontSize: 12, borderRadius: 4 }}>
          <option>Nina</option>
          <option>Tom</option>
        </select>
        <button className="btn btn-accent">Wochenplan übernehmen</button>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Wochenplan</div>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>Pro Tag können mehrere Zeitfenster erfasst werden.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {WEEKDAYS.map((day) => (
          <div key={day} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: schedule[day].length === 0 ? '#999' : '#111' }}>{day}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {schedule[day].length === 0 && <div style={{ fontSize: 12, color: '#ccc' }}>frei</div>}
              {schedule[day].map((slot) => (
                <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #ddd', borderRadius: 4, padding: '6px 10px', fontSize: 12 }}>
                  <div>{slot.from}</div>
                  <div>–</div>
                  <div>{slot.to}</div>
                  <div onClick={() => removeSlot(day, slot.id)} style={{ color: '#999', marginLeft: 6, cursor: 'pointer' }}>
                    ✕
                  </div>
                </div>
              ))}
              <div onClick={() => addSlot(day)} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
                + Zeitfenster
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
