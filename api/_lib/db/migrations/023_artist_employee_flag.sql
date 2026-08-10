-- Mitarbeiter (Angestellte statt freischaffende Artists): deren Umsatz fliesst zu 100%
-- an den Salon. Setzt technisch einfach revenue_share_pct auf 100, ist aber als eigenes
-- Flag erfasst, damit es in der UI klar unterscheidbar bleibt und das Prozentfeld für
-- Mitarbeiter gesperrt werden kann (kein versehentliches Verändern).
alter table artists add column if not exists is_employee boolean not null default false;
