import { normalizePhone } from './format';

// Erwartet das CSV-Format des alten Buchungssystems (Spalten wie im Export vom
// 10.08.2026: Typ;Vorname;Nachname;Adresse;Postleitzahl;Stadt;Email;Telefon;
// Telefon_Eltern;Geburtstag;...Gesundheitsfragen...;Registrierungsdatum;Studio;...).
// Semikolon-getrennt, Datum dd.mm.yyyy bzw. dd.mm.yyyy hh:mm.

export interface RawImportRow {
  [key: string]: string | undefined;
}

export interface ImportCustomer {
  vorname: string;
  name: string;
  email: string | null;
  phone: string | null;
  parent_phone: string | null;
  birthdate: string | null;
  strasse: string | null;
  plz_ort: string | null;
  health_notice: string | null;
}

function parseRegDate(s: string | undefined): number {
  if (!s) return 0;
  const m = s.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!m) return 0;
  const [, dd, mm, yyyy, hh, min] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh || 0), Number(min || 0)).getTime();
}

function parseBirthdate(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const year = Number(yyyy);
  const d = new Date(year, Number(mm) - 1, Number(dd));
  if (year < 1900 || d.getTime() > Date.now()) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function buildHealthNotice(r: RawImportRow): string | null {
  const parts: string[] = [];
  function yn(field: string, label: string, descField?: string) {
    if ((r[field] || '').trim() === 'Yes') {
      const desc = descField ? (r[descField] || '').trim() : '';
      parts.push(desc && desc !== '.' ? `${label}: ${desc}` : label);
    }
  }
  yn('Schwanger', 'Schwanger');
  yn('Stillzeit', 'Stillzeit');
  yn('Epilepsie', 'Epilepsie');
  yn('HIV', 'HIV');
  yn('Diabetes', 'Diabetes');
  yn('Hepatitis', 'Hepatitis');
  yn('Narben', 'Narben', 'Narben Beschreibung');
  yn('Kreislauf', 'Kreislaufprobleme', 'Kreislauf Beschreibung');
  yn('Allergien', 'Allergien', 'Allergien Beschreibung');
  yn('Chronisch', 'Chronische Erkrankung', 'Chronisch Beschreibung');
  const sonstiges = (r['Sonstiges'] || '').trim();
  if (sonstiges && !['.', '-', 'nein', 'nei', 'no', 'n/a'].includes(sonstiges.toLowerCase())) {
    parts.push(`Sonstiges: ${sonstiges}`);
  }
  return parts.length ? parts.join('; ') : null;
}

/**
 * Dedupliziert Rohzeilen (Mehrfachbuchungen derselben Person) und wandelt sie in
 * fertige Kunden-Datensätze um. Gruppiert nach E-Mail (case-insensitive), sonst nach
 * Vorname+Name+Geburtstag. Bei mehreren Zeilen pro Person gewinnt die mit dem
 * neuesten Registrierungsdatum.
 */
export function processImportRows(rows: RawImportRow[]): ImportCustomer[] {
  const groups = new Map<string, { regDate: number; row: RawImportRow }>();

  for (const row of rows) {
    const email = (row['Email'] || '').trim().toLowerCase();
    const key = email
      ? `email:${email}`
      : `noemail:${(row['Vorname'] || '').trim().toLowerCase()}:${(row['Nachname'] || '').trim().toLowerCase()}:${(row['Geburtstag'] || '').trim()}`;
    const regDate = parseRegDate(row['Registrierungsdatum']);
    const existing = groups.get(key);
    if (!existing || regDate > existing.regDate) {
      groups.set(key, { regDate, row });
    }
  }

  const result: ImportCustomer[] = [];
  for (const { row } of groups.values()) {
    const vorname = (row['Vorname'] || '').trim() || '?';
    const name = (row['Nachname'] || '').trim() || '?';
    const email = (row['Email'] || '').trim() || null;
    const phone = row['Telefon'] ? normalizePhone(row['Telefon']) || null : null;
    const parentPhone = row['Telefon_Eltern'] ? normalizePhone(row['Telefon_Eltern']) || null : null;
    const birthdate = parseBirthdate(row['Geburtstag']);
    const strasse = (row['Adresse'] || '').trim() || null;
    const plz = (row['Postleitzahl'] || '').trim();
    const stadt = (row['Stadt'] || '').trim();
    const plzOrt = `${plz} ${stadt}`.trim() || null;
    const healthNotice = buildHealthNotice(row);

    result.push({ vorname, name, email, phone, parent_phone: parentPhone, birthdate, strasse, plz_ort: plzOrt, health_notice: healthNotice });
  }
  return result;
}
