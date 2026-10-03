-- 045: Duplikate zusammenführen
--  * customer_duplicate_ignores: Telefonnummern, die als "verschiedene Personen / Familie"
--    geprüft wurden -> erscheinen nicht mehr in der Duplikate-Liste.
--  * find_duplicate_customers(): alle Kunden, deren Telefonnummer mehrfach vorkommt.
--  * merge_customers(keep, remove[]): verschiebt alles ins Hauptprofil, ergänzt leere
--    Felder, löscht die übrigen Profile -- atomar, nur Admin.
--  * cleanup_empty_duplicates(): löscht leere Profile (keine Termine/Verkäufe/Dokumente),
--    wenn es zur gleichen Person (Name + Nummer) ein weiteres Profil gibt -- nur Admin.

create table if not exists customer_duplicate_ignores (
  phone text primary key,
  created_at timestamptz not null default now()
);
alter table customer_duplicate_ignores disable row level security;

create or replace function find_duplicate_customers()
returns table (
  phone text, id uuid, vorname text, name text, birthdate date, email text, strasse text, plz_ort text,
  parent_phone text, notes text, health_notice text, created_at timestamptz,
  appt_count bigint, order_count bigint, doc_count bigint, photo_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select c.phone, c.id, c.vorname, c.name, c.birthdate, c.email, c.strasse, c.plz_ort,
         c.parent_phone, c.notes, c.health_notice, c.created_at,
         (select count(*) from appointments a where a.customer_id = c.id),
         (select count(*) from orders o where o.customer_id = c.id),
         (select count(*) from customer_documents d where d.customer_id = c.id and d.type <> 'photo'),
         (select count(*) from customer_documents d where d.customer_id = c.id and d.type = 'photo')
    from customers c
   where c.phone is not null
     and c.phone in (select phone from customers where phone is not null group by phone having count(*) > 1)
     and c.phone not in (select phone from customer_duplicate_ignores)
     and app_role() = 'admin'
   order by c.phone, c.created_at;
$$;
grant execute on function find_duplicate_customers() to authenticated;

create or replace function merge_customers(p_keep uuid, p_remove uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if app_role() is distinct from 'admin' then
    raise exception 'Nur Admins dürfen Kunden zusammenführen';
  end if;
  if p_keep = any(p_remove) then
    raise exception 'Hauptprofil darf nicht gelöscht werden';
  end if;

  -- Leere Felder im Hauptprofil aus den anderen Profilen ergänzen, Notizen anhängen.
  for r in select * from customers where id = any(p_remove) order by created_at desc loop
    update customers k set
      email = coalesce(nullif(k.email, ''), r.email),
      birthdate = coalesce(k.birthdate, r.birthdate),
      strasse = coalesce(nullif(k.strasse, ''), r.strasse),
      plz_ort = coalesce(nullif(k.plz_ort, ''), r.plz_ort),
      parent_phone = coalesce(nullif(k.parent_phone, ''), r.parent_phone),
      health_notice = coalesce(nullif(k.health_notice, ''), r.health_notice),
      notes = case
        when coalesce(r.notes, '') = '' or coalesce(k.notes, '') like '%' || r.notes || '%' then k.notes
        when coalesce(k.notes, '') = '' then r.notes
        else k.notes || E'\n' || r.notes end
    where k.id = p_keep;
  end loop;

  update appointments set customer_id = p_keep where customer_id = any(p_remove);
  update orders set customer_id = p_keep where customer_id = any(p_remove);
  update customer_documents set customer_id = p_keep where customer_id = any(p_remove);
  update consents set customer_id = p_keep where customer_id = any(p_remove);
  update vouchers set buyer_customer_id = p_keep where buyer_customer_id = any(p_remove);
  -- Gesundheitsfragen: nur übernehmen, wenn das Hauptprofil noch keine hat.
  if not exists (select 1 from health_questionnaire_responses where customer_id = p_keep) then
    update health_questionnaire_responses set customer_id = p_keep
     where customer_id = (
       select h.customer_id from health_questionnaire_responses h
        where h.customer_id = any(p_remove) order by h.created_at desc limit 1);
  end if;

  delete from customers where id = any(p_remove);
end;
$$;
grant execute on function merge_customers(uuid, uuid[]) to authenticated;

create or replace function cleanup_empty_duplicates()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  if app_role() is distinct from 'admin' then
    raise exception 'Nur Admins';
  end if;
  -- Pro Gruppe (gleiche Nummer + gleicher Vor- und Nachname) bleibt das Profil mit Daten
  -- bzw. das neueste. Leere übrige Profile werden via merge_customers zusammengeführt,
  -- damit z.B. ein Geburtsdatum oder eine Adresse aus dem Import nicht verloren geht.
  for r in
    with flagged as (
      select c.id,
             (exists (select 1 from appointments where customer_id = c.id)
           or exists (select 1 from orders where customer_id = c.id)
           or exists (select 1 from customer_documents where customer_id = c.id)
           or exists (select 1 from consents where customer_id = c.id)
           or exists (select 1 from vouchers where buyer_customer_id = c.id)) as used,
             c.phone, lower(trim(c.vorname)) v, lower(trim(c.name)) n, c.created_at
        from customers c
       where c.phone is not null
    ),
    ranked as (
      select f.*,
             row_number() over (partition by phone, v, n order by used desc, created_at desc, id desc) rk,
             first_value(id) over (partition by phone, v, n order by used desc, created_at desc, id desc) keep_id
        from flagged f
    )
    select id, keep_id from ranked where rk > 1 and not used
  loop
    perform merge_customers(r.keep_id, array[r.id]);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
grant execute on function cleanup_empty_duplicates() to authenticated;
