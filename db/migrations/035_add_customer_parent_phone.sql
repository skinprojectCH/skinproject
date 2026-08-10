-- Mobile-Nummer der Eltern -- relevant bei minderjährigen Kunden (Einverständnis/
-- Rückfragen bei den Erziehungsberechtigten). Optional, da nicht jeder Kunde minderjährig ist.
alter table customers add column if not exists parent_phone text;
