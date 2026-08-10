-- Behebt die von Supabase gemeldete Sicherheitslücke: drei Tabellen hatten nie RLS
-- aktiviert (app_settings -- eigenes Versehen bei Migration 030; cash_adjustments --
-- nie gesetzt; location_cash_settings -- sogar explizit deaktiviert in Migration 028).
-- Ohne RLS konnte jeder mit dem Projekt-URL (anon-Key) diese Tabellen lesen/schreiben.

-- ---------- app_settings ----------
-- Salonweite Einstellungen (Pflegeanleitungen, Dankeschön-Rabatt) -- nur Admin/Manager
-- dürfen das sehen/ändern (entspricht der Einstellungen-Seite, die Angestellten schon
-- UI-seitig verborgen ist).
alter table app_settings enable row level security;
create policy "Nur Admin/Manager: app_settings" on app_settings
  for all to authenticated
  using (app_role() in ('admin', 'manager'))
  with check (app_role() in ('admin', 'manager'));

-- ---------- cash_adjustments ----------
-- Kassenbestand-Korrekturen pro Standort -- gleiche Standort-Logik wie orders/shifts.
alter table cash_adjustments enable row level security;
create policy "Standort-Zugriff auf cash_adjustments" on cash_adjustments
  for all to authenticated
  using (location_visible(location_id))
  with check (location_visible(location_id));

-- ---------- location_cash_settings ----------
-- War zuvor explizit deaktiviert (Migration 028) -- Startbetrag darf nur der Hauptadmin
-- ändern (steht bereits so im Kommentar der Ursprungsmigration), aber alle Rollen am
-- jeweiligen Standort dürfen ihn lesen (für die laufende Kassenbestand-Anzeige).
alter table location_cash_settings enable row level security;
create policy "Standort-Zugriff auf location_cash_settings lesen" on location_cash_settings
  for select to authenticated
  using (location_visible(location_id));
create policy "Nur Admin: location_cash_settings ändern" on location_cash_settings
  for insert to authenticated
  with check (app_role() = 'admin');
create policy "Nur Admin: location_cash_settings updaten" on location_cash_settings
  for update to authenticated
  using (app_role() = 'admin')
  with check (app_role() = 'admin');
