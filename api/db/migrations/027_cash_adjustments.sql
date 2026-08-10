-- Kassenbestand pro Location: manuelle Anpassungen (Start-Bargeld, Korrekturen,
-- Entnahmen). Der laufende Kassenbestand ergibt sich aus der Summe aller Anpassungen
-- plus der Summe aller Bar-Zahlungen, die je an dieser Location eingegangen sind.
create table if not exists cash_adjustments (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id),
  amount numeric(10,2) not null,
  note text,
  created_by text,
  created_at timestamptz not null default now()
);
