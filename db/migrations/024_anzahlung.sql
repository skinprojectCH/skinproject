-- Anzahlung (Kunden-Guthaben): technisch ein Gutschein, der zwingend einem Kunden
-- gehört (buyer_customer_id) und beim Verkauf NICHT als Umsatz/Artist-Ertrag zählt --
-- erst wenn er später als Zahlungsart eingesetzt wird, zählt der Betrag normal.
alter table vouchers add column if not exists type text not null default 'gutschein' check (type in ('gutschein','anzahlung'));

-- Markiert Bestellungen, die reine Anzahlungs-Verkäufe sind (Geld ist geflossen, zählt
-- aber bewusst NICHT als Umsatz -- alle bestehenden Umsatz-Abfragen filtern is_anzahlung=false).
alter table orders add column if not exists is_anzahlung boolean not null default false;
