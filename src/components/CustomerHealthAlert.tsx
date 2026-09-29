import { useEffect, useState } from 'react';
import { fetchCustomerHealthAlert, type CustomerHealthAlert as Alert } from '../lib/queries';

// Gelber Hinweis-Kasten: Gesundheitsfragen mit "Ja", Gesundheitshinweis und Kunden-Notiz.
// Erscheint nur, wenn es etwas zu zeigen gibt. Verwendet bei Termin buchen/öffnen und in der Artist-App.
export default function CustomerHealthAlert({ customerId, compact = false }: { customerId: string | null | undefined; compact?: boolean }) {
  const [alert, setAlert] = useState<Alert | null>(null);

  useEffect(() => {
    setAlert(null);
    if (!customerId) return;
    let cancelled = false;
    fetchCustomerHealthAlert(customerId)
      .then((a) => !cancelled && setAlert(a))
      .catch(() => !cancelled && setAlert(null));
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (!alert) return null;

  return (
    <div
      style={{
        border: '1px solid #E3C46B',
        background: '#FFF7DC',
        borderRadius: 6,
        padding: compact ? '8px 10px' : '10px 12px',
        marginBottom: 14,
        fontSize: 12,
        color: '#5a4a20',
        lineHeight: 1.5,
      }}
    >
      {alert.yesAnswers.length > 0 && (
        <div style={{ marginBottom: alert.healthNotice || alert.notes ? 6 : 0 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>⚠ Gesundheitsfragen mit „Ja“</div>
          {alert.yesAnswers.map((a, i) => (
            <div key={i}>
              • {a.label}
              {a.detail ? `: ${a.detail}` : ''}
            </div>
          ))}
        </div>
      )}
      {alert.healthNotice && (
        <div style={{ marginBottom: alert.notes ? 6 : 0 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>⚠ Gesundheitshinweis</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{alert.healthNotice}</div>
        </div>
      )}
      {alert.notes && (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Notiz zum Kunden</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{alert.notes}</div>
        </div>
      )}
    </div>
  );
}
