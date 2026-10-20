-- MiPlata: schema inicial para Supabase
-- Ejecutar después de revisar en el SQL Editor del proyecto.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'MiPlata',
  email text unique not null,
  avatar_url text,
  plan text not null default 'Plan Personal Activo',
  member_since date not null default current_date,
  monthly_salary numeric(14, 2) not null default 0,
  initial_balance numeric(14, 2) not null default 0,
  monthly_budget_limit numeric(14, 2) not null default 0,
  budget_needs numeric(5, 2) not null default 50,
  budget_wants numeric(5, 2) not null default 30,
  budget_savings numeric(5, 2) not null default 20,
  alert_80_percent boolean not null default true,
  auto_adjust_variable boolean not null default true,
  currency text not null default 'COP',
  reset_day integer not null default 1,
  smart_categorization boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('gasto', 'ingreso')),
  amount numeric(14, 2) not null check (amount >= 0),
  category text not null,
  description text not null,
  date date not null,
  time time not null,
  account_method text,
  is_recurring boolean not null default false,
  fixed_obligation_id text,
  created_at timestamptz not null default now()
);

create table public.fixed_obligations (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  due_day integer not null check (due_day between 1 and 31),
  category text not null,
  status text not null default 'pending' check (status in ('paid', 'pending')),
  paid_date date,
  reminder_days_before integer not null default 3,
  is_automatic boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.savings_goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null check (target_amount >= 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  deadline date,
  icon text not null,
  color text not null,
  category text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goal_contributions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id text not null references public.savings_goals(id) on delete cascade,
  goal_name text not null,
  amount numeric(14, 2) not null check (amount > 0),
  date date not null,
  type text not null,
  timestamp bigint not null
);

create table public.category_budgets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  limit_amount numeric(14, 2) not null check (limit_amount >= 0),
  icon text,
  unique (user_id, category)
);

create index transactions_user_date_idx on public.transactions(user_id, date desc);
create index fixed_obligations_user_idx on public.fixed_obligations(user_id);
create index savings_goals_user_idx on public.savings_goals(user_id);
create index goal_contributions_user_date_idx on public.goal_contributions(user_id, date desc);
create index category_budgets_user_idx on public.category_budgets(user_id);

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.fixed_obligations enable row level security;
alter table public.savings_goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.category_budgets enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

create policy "transactions_select_own" on public.transactions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "transactions_update_own" on public.transactions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "fixed_obligations_select_own" on public.fixed_obligations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "fixed_obligations_insert_own" on public.fixed_obligations
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "fixed_obligations_update_own" on public.fixed_obligations
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "fixed_obligations_delete_own" on public.fixed_obligations
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "savings_goals_select_own" on public.savings_goals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "savings_goals_insert_own" on public.savings_goals
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "savings_goals_update_own" on public.savings_goals
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "savings_goals_delete_own" on public.savings_goals
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "goal_contributions_select_own" on public.goal_contributions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "goal_contributions_insert_own" on public.goal_contributions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "goal_contributions_update_own" on public.goal_contributions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goal_contributions_delete_own" on public.goal_contributions
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "category_budgets_select_own" on public.category_budgets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "category_budgets_insert_own" on public.category_budgets
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "category_budgets_update_own" on public.category_budgets
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "category_budgets_delete_own" on public.category_budgets
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'MiPlata'),
    new.email,
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false), ('goal-images', 'goal-images', false)
on conflict (id) do nothing;

create policy "avatars_read_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "goal_images_read_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'goal-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "goal_images_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'goal-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "goal_images_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'goal-images' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'goal-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "goal_images_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'goal-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
