-- 041: Zahlungsart "Anzahlung alte Kasse" (anzahlung_alt) für Anzahlungen, die Kunden noch
-- in der alten Kasse bezahlt haben und jetzt einlösen. Temporär, manuell erfasst.
-- Constraint neu setzen mit allen verwendeten Zahlungsarten.
alter table payments drop constraint if exists payments_method_check;
alter table payments add constraint payments_method_check
  check (method in ('karte', 'bar', 'gutschein', 'rechnung', 'online', 'anzahlung', 'anzahlung_alt'));
