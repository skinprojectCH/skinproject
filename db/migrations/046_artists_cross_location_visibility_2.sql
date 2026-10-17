-- Bug: Ein Manager/Angestellter mit fester Location sah in artists NUR Artists, deren
-- eigener Stammdaten-Standort (artists.location_id) mit seinem Standort übereinstimmt
-- (migration 033, location_visible()). In der Praxis arbeiten Artists aber teilweise
-- standortübergreifend (z.B. Jorge Munoz, Stammdaten-Standort Oerlikon, hat auch Termine
-- in Wädenswil) -- für den Wädenswil-Manager war dieser Artist dadurch komplett unsichtbar
-- (fehlt als Kalender-Spalte, obwohl er dort einen Termin hat).
--
-- Fix: Lesen (SELECT) auf artists ist jetzt zusätzlich erlaubt, wenn der Artist am eigenen
-- Standort einen Termin ODER eine Schicht (shift_days) hat -- unabhängig von seinem fest
-- zugeordneten Stammdaten-Standort. Anlegen/Bearbeiten/Löschen (INSERT/UPDATE/DELETE) bleibt
-- bewusst wie bisher streng auf den eigenen Standort beschränkt (location_visible()), damit
-- ein Manager nicht die Stammdaten eines fremden Artists verändern/löschen kann, nur weil der
-- mal bei ihm aushilft.

create or replace function artist_location_visible(a_id uuid, a_location_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select location_visible(a_location_id)
    or exists (select 1 from appointments ap where ap.artist_id = a_id and ap.location_id = app_location_id())
    or exists (select 1 from shift_days sd where sd.artist_id = a_id and sd.location_id = app_location_id());
$$;
grant execute on function artist_location_visible to authenticated;

drop policy if exists "Standort-Zugriff auf artists" on artists;

create policy "Artists lesen (eigener Standort + Gast-Termine/Schichten)" on artists
  for select to authenticated
  using (artist_location_visible(id, location_id));

create policy "Artists anlegen (nur eigener Standort)" on artists
  for insert to authenticated
  with check (location_visible(location_id));

create policy "Artists bearbeiten (nur eigener Standort)" on artists
  for update to authenticated
  using (location_visible(location_id))
  with check (location_visible(location_id));

create policy "Artists löschen (nur eigener Standort)" on artists
  for delete to authenticated
  using (location_visible(location_id));
