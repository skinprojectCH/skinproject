-- 043: MWST-Satz und Saldosteuersatz mit Gültigkeitsdatum pro Location.
-- Beispiel: ab 01.01.2027 gilt ein neuer Satz -> Eintrag mit valid_from = '2027-01-01'.
-- Massgebend ist jeweils der letzte Eintrag mit valid_from <= Datum des Verkaufs.
-- Die Felder mwst_prozent / saldosteuersatz auf locations bleiben als Rückfallebene.

create table if not exists location_tax_rates (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  valid_from date not null,
  mwst_prozent numeric(5,2),
  saldosteuersatz numeric(5,2),
  created_at timestamptz not null default now(),
  unique (location_id, valid_from)
);

alter table location_tax_rates disable row level security;

-- Heutige Sätze als Startwert übernehmen (gültig seit jeher).
insert into location_tax_rates (location_id, valid_from, mwst_prozent, saldosteuersatz)
select id, date '2000-01-01', mwst_prozent, saldosteuersatz
  from locations
 where not exists (select 1 from location_tax_rates t where t.location_id = locations.id);
