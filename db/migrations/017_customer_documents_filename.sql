-- Ursprünglicher Dateiname ging beim Upload verloren, da storage_path aus einer
-- UUID besteht (Kollisionsschutz). Jetzt zusätzlich den Originalnamen speichern,
-- damit er in der UI angezeigt werden kann statt der UUID.
alter table customer_documents add column if not exists file_name text;
