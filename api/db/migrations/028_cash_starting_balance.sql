-- Ersetzt das Ledger-Modell durch einen einfachen, fixen Startbetrag pro Location
-- (z.B. 300 CHF Wechselgeld), den nur der Hauptadmin setzt. Der tatsächliche
-- Kassenbestand ergibt sich dann als Startbetrag + Bareinnahmen des jeweiligen Tages.
create table if not exists location_cash_settings (
  location_id uuid primary key references locations(id),
  starting_balance numeric(10,2) not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table location_cash_settings disable row level security;

-- Die vorherige Ledger-Tabelle wird nicht mehr verwendet, bleibt aber unangetastet
-- bestehen (kein Datenverlust, falls doch noch gebraucht).
