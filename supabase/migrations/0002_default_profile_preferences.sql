-- Activar las preferencias útiles desde el primer acceso de cada cuenta nueva.
alter table public.profiles
  alter column alert_80_percent set default true,
  alter column auto_adjust_variable set default true,
  alter column smart_categorization set default true;
