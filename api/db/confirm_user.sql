-- Manuell die E-Mail eines Users bestätigen (falls kein "Confirm"-Button im UI verfügbar ist)
update auth.users
set email_confirmed_at = now()
where email = '2ndskin.ch@gmail.com';
