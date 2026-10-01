-- 044: Zahlungsart "Gutschein ALT" (gutschein_alt) für Gutscheine aus der alten Kassensoftware
-- (ohne Code, manuell erfasster Betrag, nur Admin). Temporär.
alter table payments drop constraint if exists payments_method_check;
alter table payments add constraint payments_method_check
  check (method in ('karte', 'bar', 'gutschein', 'rechnung', 'online', 'anzahlung', 'anzahlung_alt', 'gutschein_alt'));
