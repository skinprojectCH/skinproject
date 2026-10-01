import { useEffect, useState } from 'react';
import { isNoMoneyIn } from '../../lib/paymentMethods';
import { useLocationContext } from '../../lib/locationContext';
import { fetchLocationBilling, fetchLocationArtistBillingDetail, fetchLocations, fetchCashStartingBalance, setCashStartingBalance, fetchCashBalance, fetchCashBalanceDetail, type CashBalanceDetail, addCashAdjustment, fetchCashAdjustmentsForDay, fetchLocationManagers, fetchTaxRates, taxRateAt, type LocationManager, type LocationBilling, type LocationBillingArtistRow, type LocationArtistBillingEntry, type CashAdjustment, type RedeemedVoucherEntry } from '../../lib/queries';
import { formatCHF } from '../../lib/format';
import Modal from '../../components/Modal';

type Period = 'tag' | 'monat' | 'jahr' | 'mwst';

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shiftISO(dateISO: string, days: number) {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const navBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 15,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  fontSize: 15,
  cursor: 'pointer',
};

const summaryCardStyle: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: 6, padding: 16 };

function KassenbestandBox({ locationId, isHauptadmin, dateISO }: { locationId: string; isHauptadmin: boolean; dateISO: string }) {
  const [startingBalance, setStartingBalanceState] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [cashDetail, setCashDetail] = useState<CashBalanceDetail | null>(null);
  const [todayAdjustments, setTodayAdjustments] = useState<CashAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingStart, setEditingStart] = useState(false);
  const [startInput, setStartInput] = useState('');
  const [savingStart, setSavingStart] = useState(false);

  const [formType, setFormType] = useState<'auslage' | 'differenz' | null>(null);
  const [formAmount, setFormAmount] = useState('');
  const [formNote, setFormNote] = useState('');
  const [savingForm, setSavingForm] = useState(false);
  // Kassensturz: wer hat gezählt? (aktive Salon Manager dieses Standorts)
  const [managers, setManagers] = useState<LocationManager[]>([]);
  const [countedBy, setCountedBy] = useState('');

  useEffect(() => {
    fetchLocationManagers(locationId)
      .then((list) => setManagers(list.filter((m) => m.role === 'manager' && m.status === 'active').sort((a, b) => a.vorname.localeCompare(b.vorname))))
      .catch(() => setManagers([]));
  }, [locationId]);

  function todayLabel() {
    return new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function reload() {
    setLoading(true);
    setError(null);
    Promise.all([fetchCashBalanceDetail(locationId), fetchCashAdjustmentsForDay(locationId, dateISO)])
      .then(([detail, adj]) => {
        setStartingBalanceState(detail.startingBalance);
        setBalance(detail.balance);
        setCashDetail(detail);
        setTodayAdjustments(adj);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, [locationId, dateISO]);

  async function handleSaveStart() {
    const amount = parseFloat(startInput.replace(',', '.'));
    if (isNaN(amount) || amount < 0) return;
    setSavingStart(true);
    try {
      await setCashStartingBalance(locationId, amount);
      setEditingStart(false);
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingStart(false);
    }
  }

  // Kassensturz: Salon Manager gibt den GEZÄHLTEN Bestand ein, das System berechnet die
  // Differenz zum aktuellen Soll-Bestand und speichert sie wie bisher als 'differenz'.
  const parsedFormAmount = parseFloat(formAmount.replace(',', '.'));
  const countedValid = formType === 'differenz' && formAmount.trim() !== '' && !isNaN(parsedFormAmount) && parsedFormAmount >= 0;
  const previewDiff = countedValid ? Math.round((parsedFormAmount - balance) * 100) / 100 : null;

  async function handleSaveAdjustment() {
    if (!formType) return;
    const raw = parseFloat(formAmount.replace(',', '.'));
    if (isNaN(raw)) return;
    setSavingForm(true);
    try {
      if (formType === 'auslage') {
        if (raw === 0) return;
        // Auslage = Bargeld verlässt die Kasse -> immer negativ, unabhängig vom Vorzeichen.
        await addCashAdjustment(locationId, 'auslage', -Math.abs(raw), formNote.trim());
      } else {
        if (raw < 0) return;
        if (!countedBy) {
          setError('Bitte auswählen, wer gezählt hat.');
          return;
        }
        // Soll-Bestand frisch laden (falls seit dem Öffnen kassiert wurde), dann Differenz.
        const current = await fetchCashBalance(locationId);
        const diff = Math.round((raw - current) * 100) / 100;
        const note = `${formNote.trim() || `Kassensturz - ${todayLabel()}`} · Gezählt: ${formatCHF(raw)}`;
        // Auch 0 wird gespeichert -- dokumentiert, dass der Kassensturz gemacht wurde und stimmte.
        await addCashAdjustment(locationId, 'differenz', diff, note, countedBy);
      }
      setFormType(null);
      setFormAmount('');
      setFormNote('');
      setCountedBy('');
      setError(null);
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingForm(false);
    }
  }

  return (
    <div style={{ ...summaryCardStyle, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Start-Kassenbestand</div>
            {loading ? (
              <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
            ) : (
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700 }}>{formatCHF(startingBalance)}</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Kassenbestand aktuell</div>
            {!loading && <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{formatCHF(balance)}</div>}
            {!loading && cashDetail && (
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                Start {formatCHF(cashDetail.startingBalance)} + Bar-Einnahmen Salon {formatCHF(cashDetail.cashIn)} {cashDetail.adjustments < 0 ? '−' : '+'} Auslagen/Differenzen {formatCHF(Math.abs(cashDetail.adjustments))}
                {cashDetail.startSetAt && ` · seit ${new Date(cashDetail.startSetAt).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
              </div>
            )}
            {!loading && cashDetail && cashDetail.artistCash > 0.004 && (
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                Bar-Anteil Artists (direkt an Artists, nicht in der Kasse): {formatCHF(cashDetail.artistCash)}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline"
            onClick={() => {
              if (formType === 'auslage') return setFormType(null);
              setFormType('auslage');
              setFormAmount('');
              setFormNote('');
            }}
          >
            + Auslage
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              if (formType === 'differenz') return setFormType(null);
              setFormType('differenz');
              setFormAmount('');
              setFormNote(`Kassensturz - ${todayLabel()}`);
              setCountedBy('');
            }}
          >
            Kassensturz
          </button>
          {isHauptadmin && !editingStart && (
            <button
              className="btn btn-outline"
              onClick={() => {
                setStartInput(String(startingBalance));
                setEditingStart(true);
              }}
            >
              Startbetrag ändern
            </button>
          )}
        </div>
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)' }}>Fehler: {error}</div>}

      {formType && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              {formType === 'auslage' ? 'Auslage (Betrag)' : 'Gezählter Kassenbestand'}
            </div>
            <input
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder={formType === 'auslage' ? 'z.B. 50' : 'z.B. 146.50'}
              style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 10px', fontSize: 13, width: 160 }}
              inputMode="decimal"
              autoFocus
            />
          </div>
          {formType === 'differenz' && (
            <div style={{ minWidth: 120 }}>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                Differenz
              </div>
              <div
                style={{
                  padding: '8px 0',
                  fontSize: 15,
                  fontWeight: 700,
                  color: previewDiff === null ? '#999' : previewDiff > 0 ? '#1a7a3f' : previewDiff < 0 ? 'var(--color-destructive)' : 'inherit',
                }}
              >
                {previewDiff === null ? '—' : previewDiff === 0 ? 'Stimmt ✓' : `${previewDiff > 0 ? '+' : ''}${formatCHF(previewDiff)}`}
              </div>
            </div>
          )}
          {formType === 'differenz' && (
            <div>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                Gezählt von
              </div>
              <select
                value={countedBy}
                onChange={(e) => setCountedBy(e.target.value)}
                style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 10px', fontSize: 13, minWidth: 170, background: 'var(--color-surface)' }}
              >
                <option value="">— auswählen —</option>
                {managers.map((m) => (
                  <option key={m.id} value={`${m.vorname} ${m.name}`}>
                    {m.vorname} {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 180 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Notiz
            </div>
            <input
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder={formType === 'auslage' ? 'z.B. Materialeinkauf' : 'z.B. Kassensturz morgens'}
              style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 10px', fontSize: 13, width: '100%' }}
            />
          </div>
          <button className="btn btn-primary" style={{ opacity: savingForm ? 0.6 : 1 }} disabled={savingForm} onClick={handleSaveAdjustment}>
            {savingForm ? 'Speichert…' : 'Erfassen'}
          </button>
          <button className="btn btn-secondary" onClick={() => setFormType(null)}>
            Abbrechen
          </button>
        </div>
      )}

      {editingStart && isHauptadmin && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Neuer Start-Kassenbestand
            </div>
            <input
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              placeholder="z.B. 300"
              style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 10px', fontSize: 13, width: 160 }}
              inputMode="decimal"
              autoFocus
            />
          </div>
          <button className="btn btn-primary" style={{ opacity: savingStart ? 0.6 : 1 }} disabled={savingStart} onClick={handleSaveStart}>
            {savingStart ? 'Speichert…' : 'Speichern'}
          </button>
          <button className="btn btn-secondary" onClick={() => setEditingStart(false)}>
            Abbrechen
          </button>
        </div>
      )}

      {todayAdjustments.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Auslagen &amp; Differenzen heute</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {todayAdjustments.map((a) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <div>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{a.type}</span>
                  {a.note ? ` — ${a.note}` : ''}
                  {a.created_by ? ` · gezählt von ${a.created_by}` : ''}
                  <span style={{ color: '#999' }}> · {new Date(a.created_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ fontWeight: 700, color: a.amount >= 0 ? '#1a7a3f' : 'var(--color-destructive)' }}>
                  {a.amount >= 0 ? '+' : ''}
                  {formatCHF(a.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function periodLabel(period: Period, day: string, month: number, year: number) {
  if (period === 'tag') return new Date(day).toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (period === 'monat') return `${MONTH_NAMES[month]} ${year}`;
  return `${year}`;
}

async function downloadBillingPdf(opts: { title: string; subtitle: string; artistName: string; locationName: string; rows: { label: string; amount: number }[]; total: number }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(16);
  doc.text(opts.title, 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${opts.artistName} · ${opts.subtitle}`, 14, y);
  y += 12;
  doc.setTextColor(0);
  doc.setFontSize(10);
  for (const row of opts.rows) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    const wrapped = doc.splitTextToSize(row.label, 150);
    doc.text(wrapped, 14, y);
    doc.text(formatCHF(row.amount), 196, y, { align: 'right' });
    y += 6 * wrapped.length;
  }
  y += 4;
  doc.setDrawColor(200);
  doc.line(14, y, 196, y);
  y += 9;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', 14, y);
  doc.text(formatCHF(opts.total), 196, y, { align: 'right' });
  doc.save(`${opts.title.replace(/[^\w-]+/g, '_')}.pdf`);
}

async function downloadLocationSummaryPdf(opts: {
  locationName: string;
  periodLabel: string;
  billing: LocationBilling;
  cash?: { startingBalance: number; balance: number; adjustments: CashAdjustment[] } | null;
}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(16);
  doc.text('Abrechnung Salon', 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${opts.locationName} · ${opts.periodLabel}`, 14, y);
  y += 12;
  doc.setTextColor(0);

  const b = opts.billing;
  const salonTotal = b.salonServiceRevenue + b.productRevenue;

  doc.setFontSize(12);
  doc.text('Übersicht', 14, y);
  y += 8;
  doc.setFontSize(10);
  const summaryRows: [string, string][] = [
    ['Umsatz Salon (Total)', formatCHF(salonTotal)],
    ['  davon Dienstleistungen (Anteil)', formatCHF(b.salonServiceRevenue)],
    ['  davon Produkte', formatCHF(b.productRevenue)],
    ...(b.anzahlungRedeemedRevenue > 0 ? ([['  davon Anzahlung', formatCHF(b.anzahlungRedeemedRevenue)]] as [string, string][]) : []),
    ['Verkäufe (Termine + Kassenverkäufe)', String(b.orderCount)],
    ...(b.voucherRevenue > 0 ? ([['Gutschein-Verkäufe (kein Umsatz, erst beim Einlösen)', formatCHF(b.voucherRevenue)]] as [string, string][]) : []),
  ];
  for (const [label, value] of summaryRows) {
    doc.text(label, 14, y);
    doc.text(value, 196, y, { align: 'right' });
    y += 6;
  }

  if (opts.cash) {
    y += 6;
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 10;

    doc.setFontSize(12);
    doc.text('Kassenbestand', 14, y);
    y += 8;
    doc.setFontSize(10);
    const cashRows: [string, string][] = [
      ['Start-Kassenbestand', formatCHF(opts.cash.startingBalance)],
      ['Kassenbestand aktuell', formatCHF(opts.cash.balance)],
    ];
    for (const [label, value] of cashRows) {
      doc.text(label, 14, y);
      doc.text(value, 196, y, { align: 'right' });
      y += 6;
    }

    if (opts.cash.adjustments.length > 0) {
      y += 4;
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text('Auslagen & Differenzen heute', 14, y);
      y += 6;
      doc.setTextColor(0);
      for (const a of opts.cash.adjustments) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        const time = new Date(a.created_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
        const label = `${a.type === 'auslage' ? 'Auslage' : 'Differenz'}${a.note ? ' — ' + a.note : ''}${a.created_by ? ' · gezählt von ' + a.created_by : ''} · ${time}`;
        doc.text(label, 14, y);
        doc.text(`${a.amount >= 0 ? '+' : ''}${formatCHF(a.amount)}`, 196, y, { align: 'right' });
        y += 6;
      }
    }
  }

  if (b.redeemedVouchers.length > 0) {
    y += 6;
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Eingesetzte Gutschein-/Anzahlung-Codes', 14, y);
    y += 8;
    doc.setFontSize(9);
    for (const v of b.redeemedVouchers) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${v.code} · ${v.type} · ${v.customerLabel} · ${v.source === 'online' ? 'Online' : 'Kasse'}`, 14, y);
      doc.text(formatCHF(v.amount), 196, y, { align: 'right' });
      y += 6;
    }
  }

  const pdfList = (title: string, lines: { label: string; amount: number }[]) => {
    y += 6;
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 10;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(title, 14, y);
    y += 8;
    doc.setFontSize(9);
    for (const l of lines) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(l.label, 14, y);
      doc.text(formatCHF(l.amount), 196, y, { align: 'right' });
      y += 6;
    }
  };
  {
    const lbl: Record<string, string> = { bar: 'Bar', karte: 'Karte', twint: 'TWINT', rechnung: 'Rechnung', online: 'Online (Stripe)', gutschein: 'Gutschein eingelöst (kein Geldeingang)', anzahlung: 'Anzahlung eingelöst (kein Geldeingang)', anzahlung_alt: 'Anzahlung alte Kasse eingelöst (kein Geldeingang)', gutschein_alt: 'Gutschein alte Kasse eingelöst (kein Geldeingang)' };
    const totalIn = b.paymentsByMethod.filter((p) => !isNoMoneyIn(p.method)).reduce((s, p) => s + p.amount, 0);
    if (b.paymentsByMethod.length > 0) {
      pdfList(
        `Einnahmen nach Zahlungsart: ${formatCHF(totalIn)}`,
        b.paymentsByMethod.map((p) => ({ label: `${lbl[p.method] || p.method} (${p.count}×)`, amount: p.amount }))
      );
    }
  }
  if (b.legacyDeposits.length > 0) {
    pdfList(
      `Alte Kasse eingelöst (Anzahlungen & Gutscheine): ${formatCHF(b.legacyDepositsTotal)}`,
      b.legacyDeposits.map((d) => ({ label: `${d.type} alte Kasse · ${d.customerLabel} (manuell erfasst, kein Geldeingang)`, amount: d.amount }))
    );
  }
  if (b.openReceivables.length > 0) {
    pdfList(
      `Offene Debitoren (noch nicht bezahlt): ${formatCHF(b.openReceivablesTotal)}`,
      b.openReceivables.map((r) => ({ label: `${new Date(r.date).toLocaleDateString('de-CH')} ${r.time} · ${r.customerLabel} · ${r.artistName}`, amount: r.amount }))
    );
  }
  if (b.lateReceipts.length > 0) {
    pdfList(
      `Zahlungseingang offene Posten: ${formatCHF(b.lateReceiptsTotal)}`,
      b.lateReceipts.map((r) => ({ label: `Termin vom ${r.appointmentDate ? new Date(r.appointmentDate).toLocaleDateString('de-CH') : '—'} · ${r.customerLabel} · ${r.payments.map((p) => p.method).join(', ')}`, amount: r.amount }))
    );
  }

  doc.save(`Abrechnung_Salon_${opts.locationName.replace(/[^\w-]+/g, '_')}_${opts.periodLabel.replace(/[^\w-]+/g, '_')}.pdf`);
}

function ArtistDetailModal({
  row,
  locationId,
  locationName,
  period,
  day,
  month,
  year,
  onClose,
}: {
  row: LocationBillingArtistRow;
  locationId: string;
  locationName: string;
  period: Period;
  day: string;
  month: number;
  year: number;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<LocationArtistBillingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = (() => {
    if (period === 'tag') return { start: day, end: day };
    if (period === 'monat') {
      const start = `${year}-${pad2(month + 1)}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      return { start, end: `${year}-${pad2(month + 1)}-${pad2(lastDay)}` };
    }
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  })();

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchLocationArtistBillingDetail(locationId, row.artistId, range.start, range.end, row.sharePct)
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, row.artistId, range.start, range.end]);

  const total = entries.reduce((s, e) => s + e.payout, 0);
  const label = periodLabel(period, day, month, year);

  return (
    <Modal title={`${row.artistName} · Detail`} onClose={onClose} width={560}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
        {locationName} · {label}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>{error}</div>
      ) : entries.length === 0 ? (
        <div style={{ fontSize: 13, color: '#999' }}>Keine Termine in diesem Zeitraum.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxHeight: '50vh', overflowY: 'auto' }}>
          {entries.map((e) => (
            <div key={e.appointmentId} style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {new Date(e.date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })} · {e.time} · {e.customerLabel}
                </div>
                <div style={{ fontSize: 11, color: '#777' }}>{e.services.join(', ') || '—'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{formatCHF(e.payout)}</div>
                <div style={{ fontSize: 10, color: '#999' }}>von {formatCHF(e.revenue)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          Total Auszahlung: <span style={{ color: 'var(--color-accent)' }}>{formatCHF(total)}</span>
        </div>
        {entries.length > 0 && (
          <button
            className="btn btn-outline"
            onClick={() =>
              downloadBillingPdf({
                title: `Abrechnung ${row.artistName} ${label}`,
                subtitle: label,
                artistName: row.artistName,
                locationName,
                rows: entries.map((e) => ({
                  label: `${new Date(e.date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })} · ${e.customerLabel} · ${e.services.join(', ') || '—'}`,
                  amount: e.payout,
                })),
                total,
              })
            }
          >
            PDF herunterladen
          </button>
        )}
      </div>
    </Modal>
  );
}

function MwstBerechnung({ locationId, locationName }: { locationId: string; locationName: string }) {
  const [von, setVon] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
  });
  const [bis, setBis] = useState(todayISO());

  // Pro Abschnitt mit gleichem Saldosteuersatz (bei Satzwechsel im Zeitraum mehrere Abschnitte).
  const [segments, setSegments] = useState<{ von: string; bis: string; rate: number | null; salonRevenue: number; payout: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId || !von || !bis) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [locs, rates] = await Promise.all([fetchLocations(), fetchTaxRates(locationId)]);
        const fallback = locs.find((l) => l.id === locationId)?.saldosteuersatz ?? null;
        // Grenzen: Satzwechsel innerhalb des Zeitraums.
        const cuts = rates.map((r) => r.valid_from).filter((d) => d > von && d <= bis).sort();
        const bounds: { von: string; bis: string }[] = [];
        let cur = von;
        for (const c of cuts) {
          const prev = new Date(`${c}T12:00:00`);
          prev.setDate(prev.getDate() - 1);
          bounds.push({ von: cur, bis: prev.toISOString().slice(0, 10) });
          cur = c;
        }
        bounds.push({ von: cur, bis });
        const result = await Promise.all(
          bounds.map(async (b) => {
            const billing = await fetchLocationBilling(locationId, b.von, b.bis);
            const r = taxRateAt(rates, b.von);
            return {
              ...b,
              rate: r ? r.saldosteuersatz : fallback,
              salonRevenue: billing.salonRevenue,
              payout: billing.artistRows.reduce((s, x) => s + x.payout, 0),
            };
          })
        );
        setSegments(result);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [locationId, von, bis]);

  const salonRevenue = segments.reduce((s, x) => s + x.salonRevenue, 0);
  const totalPayout = segments.reduce((s, x) => s + x.payout, 0);
  const salonNetto = salonRevenue - totalPayout;
  const saldosteuer = segments.reduce((s, x) => s + (x.salonRevenue - x.payout) * ((x.rate || 0) / 100), 0);
  const missingRate = segments.some((x) => !x.rate);
  const fmtD = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('de-CH');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Von
          </div>
          <input type="date" value={von} onChange={(e) => setVon(e.target.value)} style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 10px', fontSize: 13, fontFamily: 'var(--font-body)' }} />
        </div>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Bis
          </div>
          <input type="date" value={bis} onChange={(e) => setBis(e.target.value)} style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 10px', fontSize: 13, fontFamily: 'var(--font-body)' }} />
        </div>
      </div>

      {!loading && missingRate && (
        <div style={{ border: '1px solid var(--color-warn-border)', background: 'var(--color-warn-bg)', borderRadius: 6, padding: '12px 14px', marginBottom: 20, fontSize: 12, color: '#5a4a20' }}>
          Für {locationName} ist (für diesen Zeitraum) kein Saldosteuersatz hinterlegt (Settings → Locations → MWST).
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>
      ) : (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden', maxWidth: 520 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ color: '#777' }}>Umsatz Salon (gesamt)</div>
            <div style={{ fontWeight: 600 }}>{formatCHF(salonRevenue)}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ color: '#777' }}>abzüglich Auszahlungen Artists</div>
            <div style={{ fontWeight: 600 }}>– {formatCHF(totalPayout)}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
            <div style={{ fontWeight: 700 }}>Salon-Umsatz ohne Artisten</div>
            <div style={{ fontWeight: 700 }}>{formatCHF(salonNetto)}</div>
          </div>
          {segments.length > 1 ? (
            segments.map((x, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', fontSize: 12, borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ color: '#777' }}>
                  {fmtD(x.von)} – {fmtD(x.bis)}: {formatCHF(x.salonRevenue - x.payout)} × {x.rate ?? '—'}%
                </div>
                <div style={{ fontWeight: 600 }}>{formatCHF((x.salonRevenue - x.payout) * ((x.rate || 0) / 100))}</div>
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', fontSize: 13, borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ color: '#777' }}>Saldosteuersatz</div>
              <div style={{ fontWeight: 600 }}>{segments[0]?.rate ? `${segments[0].rate}%` : '—'}</div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', fontSize: 15 }}>
            <div style={{ fontWeight: 700 }}>Abzurechnende MWST</div>
            <div style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{formatCHF(saldosteuer)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Abrechnung() {
  const { locations, locationsLoaded, isLocationLocked, accountLocationId } = useLocationContext();
  const [period, setPeriod] = useState<Period>('tag');
  const [locationId, setLocationId] = useState('');

  const now = new Date();
  const [day, setDay] = useState(todayISO());
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const [billing, setBilling] = useState<LocationBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<LocationBillingArtistRow | null>(null);

  // Standort-Auswahl: Hauptadmin darf frei wählen, Location-Manager ist fix auf die
  // eigene Location beschränkt (unabhängig davon, welchen Standort er im Kalender
  // gerade zum Buchen ausgewählt hat -- Umsatzzahlen anderer Standorte bleiben tabu).
  useEffect(() => {
    if (!locationsLoaded) return;
    if (isLocationLocked && accountLocationId) {
      setLocationId(accountLocationId);
    } else if (locations.length > 0 && !locationId) {
      setLocationId(locations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsLoaded, isLocationLocked, accountLocationId, locations]);

  const range = (() => {
    if (period === 'tag') return { start: day, end: day };
    if (period === 'monat') {
      const start = `${year}-${pad2(month + 1)}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      return { start, end: `${year}-${pad2(month + 1)}-${pad2(lastDay)}` };
    }
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  })();

  useEffect(() => {
    if (!locationId) return;
    setLoading(true);
    setError(null);
    fetchLocationBilling(locationId, range.start, range.end)
      .then(setBilling)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, range.start, range.end]);

  const currentLocationName = locations.find((l) => l.id === locationId)?.name || '—';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24 }}>Abrechnung</h1>

        {isLocationLocked ? (
          <div style={{ fontSize: 12, color: '#999' }}>
            Standort: <strong style={{ color: 'var(--color-primary)' }}>{currentLocationName}</strong>
          </div>
        ) : (
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 14px', fontSize: 12, fontFamily: 'var(--font-body)' }}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {locationId && period === 'tag' && <KassenbestandBox locationId={locationId} isHauptadmin={!isLocationLocked} dateISO={day} />}

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 20, fontSize: 13 }}>
        {(['tag', 'monat', 'jahr', 'mwst'] as const).map((p) => (
          <div
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '10px 18px',
              borderBottom: period === p ? '2px solid var(--color-accent)' : '2px solid transparent',
              fontWeight: period === p ? 700 : 400,
              color: period === p ? '#111' : '#777',
              cursor: 'pointer',
            }}
          >
            {p === 'tag' ? 'Tagesumsatz' : p === 'monat' ? 'Monatsumsatz' : p === 'jahr' ? 'Jahresabschluss' : 'MWST-Berechnung'}
          </div>
        ))}
      </div>

      {period === 'mwst' ? (
        <MwstBerechnung locationId={locationId} locationName={currentLocationName} />
      ) : (
        <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 20 }}>
        {period === 'tag' && (
          <>
            <button onClick={() => setDay(shiftISO(day, -1))} style={navBtnStyle}>
              ‹
            </button>
            <div style={{ fontSize: 14, fontWeight: 700, minWidth: 160, textAlign: 'center' }}>
              {new Date(day).toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <button onClick={() => setDay(shiftISO(day, 1))} style={navBtnStyle}>
              ›
            </button>
            {day !== todayISO() && (
              <div onClick={() => setDay(todayISO())} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
                Heute
              </div>
            )}
          </>
        )}
        {period === 'monat' && (
          <>
            <button
              onClick={() => {
                let m = month - 1;
                let y = year;
                if (m < 0) { m = 11; y -= 1; }
                setMonth(m);
                setYear(y);
              }}
              style={navBtnStyle}
            >
              ‹
            </button>
            <div style={{ fontSize: 14, fontWeight: 700, minWidth: 160, textAlign: 'center' }}>
              {MONTH_NAMES[month]} {year}
            </div>
            <button
              onClick={() => {
                let m = month + 1;
                let y = year;
                if (m > 11) { m = 0; y += 1; }
                setMonth(m);
                setYear(y);
              }}
              style={navBtnStyle}
            >
              ›
            </button>
          </>
        )}
        {period === 'jahr' && (
          <>
            <button onClick={() => setYear((y) => y - 1)} style={navBtnStyle}>
              ‹
            </button>
            <div style={{ fontSize: 14, fontWeight: 700, minWidth: 100, textAlign: 'center' }}>{year}</div>
            <button onClick={() => setYear((y) => y + 1)} style={navBtnStyle}>
              ›
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>
      ) : billing ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button
              className="btn btn-outline"
              onClick={async () => {
                let cash: { startingBalance: number; balance: number; adjustments: CashAdjustment[] } | null = null;
                if (period === 'tag' && locationId) {
                  try {
                    const [startingBalance, balance, adjustments] = await Promise.all([
                      fetchCashStartingBalance(locationId),
                      fetchCashBalance(locationId),
                      fetchCashAdjustmentsForDay(locationId, day),
                    ]);
                    cash = { startingBalance, balance, adjustments };
                  } catch {
                    cash = null;
                  }
                }
                downloadLocationSummaryPdf({
                  locationName: currentLocationName,
                  periodLabel: periodLabel(period, day, month, year),
                  billing,
                  cash,
                });
              }}
            >
              PDF herunterladen
            </button>
          </div>
          {(() => {
            const label: Record<string, string> = { bar: 'Bar', karte: 'Karte', twint: 'TWINT', rechnung: 'Rechnung', online: 'Online (Stripe)', gutschein: 'Gutschein eingelöst', anzahlung: 'Anzahlung eingelöst', anzahlung_alt: 'Anzahlung alte Kasse', gutschein_alt: 'Gutschein alte Kasse' };
            const moneyIn = billing.paymentsByMethod.filter((p) => !isNoMoneyIn(p.method));
            const redeemed = billing.paymentsByMethod.filter((p) => isNoMoneyIn(p.method));
            const totalIn = moneyIn.reduce((s, p) => s + p.amount, 0);
            const ensure = (m: string) => (moneyIn.some((p) => p.method === m) ? [] : [{ method: m, amount: 0, count: 0 }]);
            const rows = [...ensure('bar'), ...ensure('karte'), ...moneyIn].sort((a, b) => (a.method === 'bar' ? -1 : b.method === 'bar' ? 1 : a.method === 'karte' ? -1 : b.method === 'karte' ? 1 : 0));
            return (
              <div style={{ ...summaryCardStyle, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Einnahmen nach Zahlungsart</div>
                <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  {rows.map((p) => (
                    <div key={p.method}>
                      <div style={{ fontSize: 12, color: '#777' }}>
                        {label[p.method] || p.method}
                        {p.count > 0 && <span style={{ color: '#bbb' }}> · {p.count}×</span>}
                      </div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700 }}>{formatCHF(p.amount)}</div>
                    </div>
                  ))}
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#777' }}>Total Einnahmen</div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700 }}>{formatCHF(totalIn)}</div>
                  </div>
                </div>
                {redeemed.length > 0 && (
                  <div style={{ fontSize: 11, color: '#999', marginTop: 10 }}>
                    Zusätzlich mit Guthaben bezahlt (kein Geldeingang): {redeemed.map((p) => `${label[p.method]} ${formatCHF(p.amount)}`).join(' · ')}
                  </div>
                )}
                {(() => {
                  // Abgleich: wie setzen sich die Einnahmen aus Umsatz & Co. zusammen?
                  const redeemedTotal = redeemed.reduce((x, p) => x + p.amount, 0);
                  const parts: [string, number][] = [
                    ['Umsatz', billing.salonRevenue],
                    ['+ Gutschein-Verkäufe', billing.voucherRevenue],
                    ['+ Anzahlungs-Verkäufe', billing.anzahlungSalesTotal],
                    ['+ Zahlungseingang offene Posten', billing.lateReceiptsTotal],
                    ['− offene Debitoren', -billing.openReceivablesTotal],
                    ['− mit Guthaben bezahlt', -redeemedTotal],
                  ];
                  const expected = parts.reduce((x, [, v]) => x + v, 0);
                  const diff = Math.round((totalIn - expected) * 100) / 100;
                  return (
                    <div style={{ fontSize: 11, color: '#777', marginTop: 10, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
                      <strong>Abgleich:</strong>{' '}
                      {parts
                        .filter(([, v], i) => i === 0 || Math.abs(v) > 0.004)
                        .map(([l, v]) => `${l} ${formatCHF(Math.abs(v))}`)
                        .join(' ')}{' '}
                      = <strong>{formatCHF(expected)}</strong>
                      {Math.abs(diff) >= 0.05 ? (
                        <span style={{ color: 'var(--color-destructive)', fontWeight: 700 }}> · Abweichung zu Einnahmen: {formatCHF(diff)}</span>
                      ) : (
                        <span style={{ color: '#1a7a3f', fontWeight: 700 }}> ✓ stimmt mit Einnahmen überein</span>
                      )}
                    </div>
                  );
                })()}
                <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>Nach Zahlungsdatum – inkl. Anzahlungs-Verkäufe und nachträglich bezahlter Termine.</div>
              </div>
            );
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={summaryCardStyle}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Umsatz Salon</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                {formatCHF(billing.salonServiceRevenue + billing.productRevenue)}
              </div>
              <div style={{ fontSize: 11, color: '#777', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dienstleistungen (Anteil)</span>
                  <span>{formatCHF(billing.salonServiceRevenue)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Produkte</span>
                  <span>{formatCHF(billing.productRevenue)}</span>
                </div>
                {billing.anzahlungRedeemedRevenue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Anzahlung</span>
                    <span>{formatCHF(billing.anzahlungRedeemedRevenue)}</span>
                  </div>
                )}
                {billing.voucherRevenue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', marginTop: 4 }} title="Zählt erst beim Einlösen als Umsatz">
                    <span>Gutschein-Verkäufe (kein Umsatz)</span>
                    <span>{formatCHF(billing.voucherRevenue)}</span>
                  </div>
                )}
              </div>
            </div>
            <div style={summaryCardStyle}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Umsatz Artists</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{formatCHF(billing.artistRows.reduce((s, r) => s + r.payout, 0))}</div>
              <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>Auszahlungen gesamt</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Verkäufe</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{billing.orderCount}</div>
              <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>Termine + Kassenverkäufe</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Umsatz</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{formatCHF(billing.salonRevenue)}</div>
              <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>Salon + Artists</div>
            </div>
          </div>

          {(() => {
            const employeeRows = billing.artistRows.filter((r) => r.isEmployee);
            const artistRows = billing.artistRows.filter((r) => !r.isEmployee);

            const tableHeader = (
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 0.7fr', padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
                <div>Name</div>
                <div>Umsatz</div>
                <div>Miet- &amp; Serviceanteil</div>
                <div>Auszahlung</div>
                <div></div>
              </div>
            );

            const renderRow = (row: LocationBillingArtistRow) => (
              <div
                key={row.artistId}
                style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 0.7fr', padding: '14px', fontSize: 13, borderBottom: '1px solid var(--color-border-subtle, #eee)', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.calendarColor, display: 'inline-block', flexShrink: 0 }} />
                  {row.artistName}
                </div>
                <div>{formatCHF(row.revenue)}</div>
                <div>{row.sharePct}%</div>
                <div style={{ fontWeight: 600 }}>{formatCHF(row.payout)}</div>
                <div onClick={() => setDetailRow(row)} style={{ color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer', textAlign: 'right' }}>
                  Detail
                </div>
              </div>
            );

            return (
              <>
                {employeeRows.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--color-accent)' }}>Mitarbeiter</div>
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
                      {tableHeader}
                      {employeeRows.map(renderRow)}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>Umsatz fliesst zu 100% an den Salon, ist bereits im Salon-Total enthalten.</div>
                  </div>
                )}

                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Artists</div>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
                  {tableHeader}
                  {artistRows.length === 0 ? (
                    <div style={{ padding: 16, fontSize: 12, color: '#999' }}>Keine Dienstleistungsumsätze in diesem Zeitraum.</div>
                  ) : (
                    artistRows.map(renderRow)
                  )}
                </div>

                {billing.legacyDeposits.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#8a6a10' }}>
                      Alte Kasse eingelöst (Anzahlungen & Gutscheine) · {formatCHF(billing.legacyDepositsTotal)}
                    </div>
                    <div style={{ border: '1px solid #E3C46B', borderRadius: 6, background: '#FFF7DC', overflow: 'hidden' }}>
                      {billing.legacyDeposits.map((d, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: 13, borderBottom: i < billing.legacyDeposits.length - 1 ? '1px solid #EFDDA6' : 'none' }}>
                          <span>
                            <strong style={{ fontWeight: 600 }}>{d.type} alte Kasse</strong> · {d.customerLabel}
                          </span>
                          <strong>{formatCHF(d.amount)}</strong>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                      Manuell erfasst: Anzahlung bzw. Gutschein wurde noch in der alten Kasse bezahlt. Kein Geldeingang heute – der Umsatz der Leistung ist im Salon-Umsatz enthalten.
                    </div>
                  </div>
                )}

                {billing.openReceivables.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--color-destructive)' }}>
                      Offene Debitoren (noch nicht bezahlt) · {formatCHF(billing.openReceivablesTotal)}
                    </div>
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 110px', padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
                        <div>Termin</div>
                        <div>Kunde</div>
                        <div>Artist</div>
                        <div style={{ textAlign: 'right' }}>Betrag</div>
                      </div>
                      {billing.openReceivables.map((r) => (
                        <div key={r.appointmentId} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 110px', padding: '12px 14px', fontSize: 13, borderBottom: '1px solid var(--color-border-subtle, #eee)', alignItems: 'center' }}>
                          <div>
                            {new Date(r.date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })} {r.time}
                          </div>
                          <div>{r.customerLabel}</div>
                          <div>{r.artistName}</div>
                          <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-destructive)' }}>{formatCHF(r.amount)}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                      Umsatz ist bereits am Termintag enthalten (Salon &amp; Artist, geplanter Preis). Das Geld fehlt aber noch in der Kasse.
                    </div>
                  </div>
                )}

                {billing.lateReceipts.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#1a7a3f' }}>
                      Zahlungseingang offene Posten · {formatCHF(billing.lateReceiptsTotal)}
                    </div>
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 110px', padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
                        <div>Termin vom</div>
                        <div>Kunde</div>
                        <div>Zahlungsart</div>
                        <div style={{ textAlign: 'right' }}>Betrag</div>
                      </div>
                      {billing.lateReceipts.map((r) => (
                        <div key={r.orderId} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 110px', padding: '12px 14px', fontSize: 13, borderBottom: '1px solid var(--color-border-subtle, #eee)', alignItems: 'center' }}>
                          <div>{r.appointmentDate ? new Date(r.appointmentDate).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</div>
                          <div>{r.customerLabel}</div>
                          <div style={{ textTransform: 'capitalize' }}>{r.payments.map((p) => `${p.method} ${formatCHF(p.amount)}`).join(', ') || '—'}</div>
                          <div style={{ textAlign: 'right', fontWeight: 600, color: '#1a7a3f' }}>{formatCHF(r.amount)}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                      Kein Umsatz in diesem Zeitraum (wurde am Termintag verbucht) – nur Geldeingang, z.B. für den Kassenabgleich.
                    </div>
                  </div>
                )}

                {billing.redeemedVouchers.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Eingesetzte Gutschein-/Anzahlung-Codes</div>
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 90px 100px', padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
                        <div>Code</div>
                        <div>Typ</div>
                        <div>Kunde</div>
                        <div>Herkunft</div>
                        <div style={{ textAlign: 'right' }}>Betrag</div>
                      </div>
                      {billing.redeemedVouchers.map((v: RedeemedVoucherEntry, i: number) => (
                        <div
                          key={`${v.code}-${i}`}
                          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 90px 100px', padding: '12px 14px', fontSize: 13, borderBottom: '1px solid var(--color-border-subtle, #eee)', alignItems: 'center' }}
                        >
                          <div style={{ fontFamily: 'monospace' }}>{v.code}</div>
                          <div style={{ textTransform: 'capitalize' }}>{v.type}</div>
                          <div>{v.customerLabel}</div>
                          <div>
                            {v.source === 'online' ? (
                              <span style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>Online</span>
                            ) : (
                              <span style={{ border: '1px solid var(--color-border)', color: '#999', borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>Kasse</span>
                            )}
                          </div>
                          <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatCHF(v.amount)}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                      Zum Abgleich mit der Gutschein-/Anzahlung-Übersicht (Admin → Gutschein &amp; Anzahlung). "Online" = Geld ging schon damals per Stripe ein, nicht heute aus der Kasse.
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </>
      ) : null}

      {detailRow && (
        <ArtistDetailModal
          row={detailRow}
          locationId={locationId}
          locationName={currentLocationName}
          period={period}
          day={day}
          month={month}
          year={year}
          onClose={() => setDetailRow(null)}
        />
      )}
      </>
      )}
    </div>
  );
}
