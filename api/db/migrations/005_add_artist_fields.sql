alter table artists add column if not exists strasse text;
alter table artists add column if not exists plz_ort text;
alter table artists add column if not exists ahv_nummer text;
alter table artists add column if not exists mwst_aktiv boolean not null default true;
alter table artists add column if not exists mwst_nummer text;
alter table artists add column if not exists mwst_prozent numeric(4,2);
