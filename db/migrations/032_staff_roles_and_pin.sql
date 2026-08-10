-- PIN-Login für alle Rollen (statt E-Mail/Passwort) -- Hauptadmin, Salon Manager und
-- Angestellte bekommen jetzt wie die Artists einen PIN-Code. Rollen:
--   admin    -- voller Zugriff auf alles, alle Standorte
--   manager  -- alles ausser neue Locations anlegen, an einen Standort gebunden
--   employee -- Kalender/Kasse/Kunden, an einen Standort gebunden
--   artist   -- nur die Artist-PWA (unverändert)

-- Neue Tabelle für Hauptadmin-Accounts (mehrere Admins möglich, alle PIN-basiert).
create table if not exists admin_accounts (
  id uuid primary key default gen_random_uuid(),
  vorname text not null,
  name text not null,
  pin_hash text,
  pin_salt text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);
alter table admin_accounts enable row level security;
-- Kein Client-Zugriff -- nur die Service-Role-Backend-Functions (create-staff-pin,
-- staff-pin-login, staff-list) dürfen lesen/schreiben.

-- location_managers wird zur allgemeinen "Team pro Standort"-Tabelle: bisher nur
-- Manager mit E-Mail/Passwort-Login, jetzt auch Angestellte, beide mit PIN.
alter table location_managers add column if not exists role text not null default 'manager' check (role in ('manager', 'employee'));
alter table location_managers add column if not exists pin_hash text;
alter table location_managers add column if not exists pin_salt text;
alter table location_managers add column if not exists status text not null default 'active' check (status in ('active', 'inactive'));

-- app_users.role erweitern und Rückverknüpfung zu admin_accounts/location_managers
-- ergänzen (artist_id existierte bereits für die Artist-Rolle).
alter table app_users drop constraint if exists app_users_role_check;
alter table app_users add constraint app_users_role_check check (role in ('admin', 'manager', 'employee', 'artist'));
alter table app_users add column if not exists admin_account_id uuid references admin_accounts(id);
alter table app_users add column if not exists manager_id uuid references location_managers(id);

-- Hilfsfunktionen für RLS-Policies: lesen Rolle/Standort des eingeloggten Nutzers aus
-- app_users. security definer, damit sie trotz RLS auf app_users selbst funktionieren.
create or replace function app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from app_users where id = auth.uid();
$$;

create or replace function app_location_id() returns uuid
language sql stable security definer set search_path = public as $$
  select location_id from app_users where id = auth.uid();
$$;

grant execute on function app_role to authenticated;
grant execute on function app_location_id to authenticated;
