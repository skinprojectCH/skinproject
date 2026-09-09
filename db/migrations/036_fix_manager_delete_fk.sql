-- Behebt: Löschen eines Salon Managers/Angestellten schlägt fehl, sobald für ihn
-- bereits ein PIN eingerichtet wurde (= es existiert eine app_users-Zeile mit
-- manager_id = location_managers.id). Ohne ON DELETE-Regel verweigert Postgres das
-- DELETE auf location_managers mit einer Fremdschlüssel-Verletzung -- das Frontend
-- zeigt den Eintrag dann fälschlich als "gelöscht" an (Papierkorb-Klick entfernt ihn
-- nur lokal), bis ein echter Refresh den unveränderten DB-Stand neu lädt.
--
-- Lösung: manager_id bekommt ON DELETE CASCADE -- wird ein Teammitglied gelöscht,
-- verschwindet auch dessen PIN-Login-Verknüpfung (app_users-Zeile) automatisch mit.
-- Der zugehörige "unsichtbare" Supabase-Auth-Account (internal.skinproject.ch) bleibt
-- als Karteileiche stehen, ist aber harmlos, da er ohne app_users-Zeile keinen
-- Zugriff mehr hat.

do $$
declare
  conname text;
begin
  select tc.constraint_name into conname
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'app_users'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'manager_id'
  limit 1;

  if conname is not null then
    execute format('alter table app_users drop constraint %I', conname);
  end if;
end $$;

alter table app_users
  add constraint app_users_manager_id_fkey
  foreign key (manager_id) references location_managers(id) on delete cascade;
