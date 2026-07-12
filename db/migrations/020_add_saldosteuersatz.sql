-- Saldosteuersatz (vereinfachte MWST-Abrechnungsmethode): separater Satz vom regulären
-- MWST-Satz (mwst_prozent), da dieser auf den eigenen Salon-Umsatz (ohne Artisten-Anteil)
-- angewendet wird, um die abzuliefernde Steuer zu berechnen.
alter table locations add column if not exists saldosteuersatz numeric(4,2);
