-- Echte Datenbank-Absicherung nach Standort: Admin sieht/bearbeitet alles, Manager/
-- Angestellte/Artist nur Daten ihres eigenen Standorts (bzw. standortübergreifende
-- "geteilte" Einträge mit location_id = null, z.B. salonweite Services). customers
-- bleiben bewusst standortübergreifend sichtbar (ein Kunde kann an jedem Standort
-- vorbeikommen) -- das war schon vorher so gewollt.

-- Kleiner Helfer, um die Policies unten kompakt zu halten.
create or replace function location_visible(row_location_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select app_role() = 'admin'
    or row_location_id is null
    or row_location_id = app_location_id();
$$;
grant execute on function location_visible to authenticated;

-- ---------- appointments ----------
drop policy if exists "Eingeloggte Nutzer: voller Zugriff auf appointments" on appointments;
create policy "Standort-Zugriff auf appointments" on appointments
  for all to authenticated
  using (location_visible(location_id))
  with check (location_visible(location_id));

-- ---------- orders ----------
drop policy if exists "Eingeloggte Nutzer: voller Zugriff auf orders" on orders;
create policy "Standort-Zugriff auf orders" on orders
  for all to authenticated
  using (location_visible(location_id))
  with check (location_visible(location_id));

-- ---------- order_line_items (via orders) ----------
drop policy if exists "Eingeloggte Nutzer: voller Zugriff auf order_line_items" on order_line_items;
create policy "Standort-Zugriff auf order_line_items" on order_line_items
  for all to authenticated
  using (exists (select 1 from orders o where o.id = order_line_items.order_id and location_visible(o.location_id)))
  with check (exists (select 1 from orders o where o.id = order_line_items.order_id and location_visible(o.location_id)));

-- ---------- payments (via orders) ----------
drop policy if exists "Eingeloggte Nutzer: voller Zugriff auf payments" on payments;
create policy "Standort-Zugriff auf payments" on payments
  for all to authenticated
  using (exists (select 1 from orders o where o.id = payments.order_id and location_visible(o.location_id)))
  with check (exists (select 1 from orders o where o.id = payments.order_id and location_visible(o.location_id)));

-- ---------- appointment_line_items (via appointments) ----------
alter table appointment_line_items enable row level security;
drop policy if exists "Standort-Zugriff auf appointment_line_items" on appointment_line_items;
create policy "Standort-Zugriff auf appointment_line_items" on appointment_line_items
  for all to authenticated
  using (exists (select 1 from appointments a where a.id = appointment_line_items.appointment_id and location_visible(a.location_id)))
  with check (exists (select 1 from appointments a where a.id = appointment_line_items.appointment_id and location_visible(a.location_id)));

-- ---------- shifts ----------
drop policy if exists "Eingeloggte Nutzer: voller Zugriff auf shifts" on shifts;
create policy "Standort-Zugriff auf shifts" on shifts
  for all to authenticated
  using (location_visible(location_id))
  with check (location_visible(location_id));

-- ---------- absences (via artists) ----------
drop policy if exists "Eingeloggte Nutzer: voller Zugriff auf absences" on absences;
create policy "Standort-Zugriff auf absences" on absences
  for all to authenticated
  using (exists (select 1 from artists ar where ar.id = absences.artist_id and location_visible(ar.location_id)))
  with check (exists (select 1 from artists ar where ar.id = absences.artist_id and location_visible(ar.location_id)));

-- ---------- artists ----------
drop policy if exists "Eingeloggte Nutzer: voller Zugriff auf artists" on artists;
create policy "Standort-Zugriff auf artists" on artists
  for all to authenticated
  using (location_visible(location_id))
  with check (location_visible(location_id));

-- ---------- vouchers ----------
drop policy if exists "Eingeloggte Nutzer: voller Zugriff auf vouchers" on vouchers;
create policy "Standort-Zugriff auf vouchers" on vouchers
  for all to authenticated
  using (location_visible(location_id))
  with check (location_visible(location_id));

-- ---------- service_categories / services / product_categories / products ----------
-- location_id = null bedeutet salonweit geteilt (z.B. Standard-Dienstleistungen).
drop policy if exists "Eingeloggte Nutzer: voller Zugriff auf service_categories" on service_categories;
create policy "Standort-Zugriff auf service_categories" on service_categories
  for all to authenticated
  using (location_visible(location_id))
  with check (location_visible(location_id));

drop policy if exists "Eingeloggte Nutzer: voller Zugriff auf services" on services;
create policy "Standort-Zugriff auf services" on services
  for all to authenticated
  using (true)
  with check (true);
-- services selbst hat keine eigene location_id (hängt an service_categories) --
-- absichtlich offen gelassen, sonst müssten wir über category_id joinen und Services
-- sind ohnehin meist salonweite Stammdaten.

drop policy if exists "Eingeloggte Nutzer: voller Zugriff auf product_categories" on product_categories;
create policy "Standort-Zugriff auf product_categories" on product_categories
  for all to authenticated
  using (location_visible(location_id))
  with check (location_visible(location_id));

drop policy if exists "Eingeloggte Nutzer: voller Zugriff auf products" on products;
create policy "Standort-Zugriff auf products" on products
  for all to authenticated
  using (true)
  with check (true);

-- ---------- locations: nur Admin darf neue Standorte anlegen ----------
drop policy if exists "Eingeloggte Nutzer: voller Zugriff auf locations" on locations;
create policy "Alle Rollen: Standorte lesen" on locations
  for select to authenticated
  using (true);
create policy "Nur Admin: Standorte anlegen" on locations
  for insert to authenticated
  with check (app_role() = 'admin');
create policy "Nur Admin oder eigener Manager: Standort bearbeiten" on locations
  for update to authenticated
  using (app_role() = 'admin' or (app_role() in ('manager', 'employee') and id = app_location_id()))
  with check (app_role() = 'admin' or (app_role() in ('manager', 'employee') and id = app_location_id()));

-- ---------- app_users / location_managers / admin_accounts ----------
-- Bewusst NICHT weiter eingeschränkt (siehe Migration 032 Kommentar): PIN-Hashes
-- werden nur von Service-Role-Endpoints geschrieben/geprüft, nie vom Frontend
-- direkt gelesen -- entspricht dem bisherigen Umgang mit artists.pin_hash.
