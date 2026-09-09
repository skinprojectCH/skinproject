-- Löst die bisherige wöchentlich wiederholende Schichtvorlage (Tabelle "shifts": Wochentag
-- + Gültigkeitszeitraum) durch konkrete Tages-Einträge ab, damit Monat für Monat geplant und
-- später Tag für Tag korrigiert werden kann (z.B. ein einzelner Montag abweichend von den
-- übrigen Montagen dieses Monats).
--
-- "shifts" wird NICHT gelöscht -- bleibt als Archiv/Fallback bestehen, falls etwas schiefgeht.
-- Ab jetzt liest/schreibt die App aber nur noch "shift_days".

create table if not exists shift_days (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

create index if not exists shift_days_artist_date_idx on shift_days (artist_id, shift_date);
create index if not exists shift_days_location_date_idx on shift_days (location_id, shift_date);

-- Verhindert exakte Doppel-Einträge und macht den Backfill unten (ON CONFLICT) idempotent,
-- falls diese Migration versehentlich ein zweites Mal läuft.
alter table shift_days drop constraint if exists shift_days_unique_slot;
alter table shift_days add constraint shift_days_unique_slot unique (artist_id, location_id, shift_date, start_time, end_time);

alter table shift_days enable row level security;
drop policy if exists "Standort-Zugriff auf shift_days" on shift_days;
create policy "Standort-Zugriff auf shift_days" on shift_days
  for all to authenticated
  using (location_visible(location_id))
  with check (location_visible(location_id));

-- ---------- Backfill ----------
-- Wandelt die bestehenden wöchentlichen Schichtvorlagen für den aktuellen und den nächsten
-- Kalendermonat in konkrete Tages-Einträge um -- damit beim Umstieg auf die Monatsplanung
-- niemand im Kalender/in der Kasse plötzlich verschwindet. Weiter in der Zukunft liegende
-- Monate plant man ab jetzt direkt in der neuen Monatsansicht (Schichtplan → Monat kopieren).
--
-- extract(isodow from d): Mo=1..So=7 -> "-1" ergibt Mo=0..So=6, passend zu shifts.weekday.
insert into shift_days (artist_id, location_id, shift_date, start_time, end_time)
select s.artist_id, s.location_id, d::date, s.start_time, s.end_time
from shifts s
cross join lateral generate_series(
  date_trunc('month', current_date)::date,
  (date_trunc('month', current_date) + interval '2 months - 1 day')::date,
  interval '1 day'
) as d
where s.location_id is not null
  and extract(isodow from d)::int - 1 = s.weekday
  and d::date >= s.valid_from
  and (s.valid_to is null or d::date <= s.valid_to)
on conflict (artist_id, location_id, shift_date, start_time, end_time) do nothing;
