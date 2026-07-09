-- ============================================================
-- SkinProject — RLS Policies (Phase 1: jeder eingeloggte Nutzer = Staff)
-- Im Supabase SQL-Editor NACH schema.sql ausführen.
-- Später verfeinern: admin vs. artist unterscheiden (siehe app_users.role).
-- ============================================================

-- Tabellen, die bereits RLS aktiviert haben (aus schema.sql):
-- customers, appointments, orders, customer_documents,
-- health_questionnaire_responses, consents

create policy "Eingeloggte Nutzer: voller Zugriff auf customers"
  on customers for all
  to authenticated
  using (true)
  with check (true);

create policy "Eingeloggte Nutzer: voller Zugriff auf appointments"
  on appointments for all
  to authenticated
  using (true)
  with check (true);

create policy "Eingeloggte Nutzer: voller Zugriff auf orders"
  on orders for all
  to authenticated
  using (true)
  with check (true);

create policy "Eingeloggte Nutzer: voller Zugriff auf customer_documents"
  on customer_documents for all
  to authenticated
  using (true)
  with check (true);

create policy "Eingeloggte Nutzer: voller Zugriff auf health_questionnaire_responses"
  on health_questionnaire_responses for all
  to authenticated
  using (true)
  with check (true);

create policy "Eingeloggte Nutzer: voller Zugriff auf consents"
  on consents for all
  to authenticated
  using (true)
  with check (true);

-- Restliche Tabellen: RLS aktivieren + gleiche Policy
-- (waren bisher ganz ohne RLS = für jeden mit Publishable Key lesbar/schreibbar,
--  was für Stammdaten wie Services/Produkte meist ok wäre, aber wir sperren
--  aus Konsistenzgründen auch diese auf "eingeloggt".)
alter table locations enable row level security;
alter table location_managers enable row level security;
alter table artists enable row level security;
alter table app_users enable row level security;
alter table service_categories enable row level security;
alter table services enable row level security;
alter table artist_services enable row level security;
alter table product_categories enable row level security;
alter table products enable row level security;
alter table appointment_line_items enable row level security;
alter table shifts enable row level security;
alter table absences enable row level security;
alter table order_line_items enable row level security;
alter table vouchers enable row level security;
alter table payments enable row level security;

create policy "Eingeloggte Nutzer: voller Zugriff auf locations" on locations for all to authenticated using (true) with check (true);
create policy "Eingeloggte Nutzer: voller Zugriff auf location_managers" on location_managers for all to authenticated using (true) with check (true);
create policy "Eingeloggte Nutzer: voller Zugriff auf artists" on artists for all to authenticated using (true) with check (true);
create policy "Eingeloggte Nutzer: eigenen app_users-Eintrag lesen" on app_users for select to authenticated using (true);
create policy "Eingeloggte Nutzer: voller Zugriff auf service_categories" on service_categories for all to authenticated using (true) with check (true);
create policy "Eingeloggte Nutzer: voller Zugriff auf services" on services for all to authenticated using (true) with check (true);
create policy "Eingeloggte Nutzer: voller Zugriff auf artist_services" on artist_services for all to authenticated using (true) with check (true);
create policy "Eingeloggte Nutzer: voller Zugriff auf product_categories" on product_categories for all to authenticated using (true) with check (true);
create policy "Eingeloggte Nutzer: voller Zugriff auf products" on products for all to authenticated using (true) with check (true);
create policy "Eingeloggte Nutzer: voller Zugriff auf appointment_line_items" on appointment_line_items for all to authenticated using (true) with check (true);
create policy "Eingeloggte Nutzer: voller Zugriff auf shifts" on shifts for all to authenticated using (true) with check (true);
create policy "Eingeloggte Nutzer: voller Zugriff auf absences" on absences for all to authenticated using (true) with check (true);
create policy "Eingeloggte Nutzer: voller Zugriff auf order_line_items" on order_line_items for all to authenticated using (true) with check (true);
create policy "Eingeloggte Nutzer: voller Zugriff auf vouchers" on vouchers for all to authenticated using (true) with check (true);
create policy "Eingeloggte Nutzer: voller Zugriff auf payments" on payments for all to authenticated using (true) with check (true);
