alter table payments drop constraint if exists payments_method_check;
alter table payments add constraint payments_method_check
  check (method in ('karte', 'bar', 'gutschein', 'rechnung'));
