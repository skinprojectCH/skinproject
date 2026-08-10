-- cash_adjustments existiert bereits (Migration 027), ergänzt hier um einen Typ, damit
-- Auslagen (Bargeld-Entnahmen) und Differenzen (Kassensturz-Korrekturen am Morgen)
-- unterscheidbar sind. Beide dürfen vom Salon Manager erfasst werden (nicht nur Hauptadmin).
alter table cash_adjustments add column if not exists type text not null default 'auslage' check (type in ('auslage','differenz'));
