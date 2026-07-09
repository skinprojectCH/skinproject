alter table locations add column if not exists strasse text;
alter table locations add column if not exists plz_ort text;
alter table locations add column if not exists telefon text;
alter table locations add column if not exists email text;
alter table locations add column if not exists mwst_prozent numeric(4,2);

-- Bestehende `address`-Freitextfelder (z.B. aus seed.sql) in strasse/plz_ort aufteilen,
-- damit nichts verloren geht.
update locations
set strasse = trim(split_part(address, ',', 1)),
    plz_ort = trim(split_part(address, ',', 2))
where strasse is null and address is not null;
