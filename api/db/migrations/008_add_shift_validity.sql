alter table shifts add column if not exists valid_from date not null default current_date;
alter table shifts add column if not exists valid_to date; -- NULL = unbefristet
