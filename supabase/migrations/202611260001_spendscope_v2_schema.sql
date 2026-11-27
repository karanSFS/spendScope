-- SpendScope v2 Cloud Schema (New Supabase Project)
-- Strict cross-platform compatibility with spend_scope_android:
--   * Shared tables (accounts, categories, transactions, buckets, bucket_transactions)
--     keep Android's exact column types, nullability, CHECKs, and unique indexes.
--   * Additive web columns on shared tables are strictly nullable and unconstrained.
--   * No server-side account or category seeding in handle_new_user() so Android
--     backups never collide with pre-seeded defaults.
--   * No passcode/lockout columns in cloud DB; App Lock remains device-local.

create extension if not exists pgcrypto;

-- ============================================================
-- 1. Tables
-- ============================================================

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null check (char_length(trim(display_name)) between 1 and 80),
    email text,
    phone text,
    avatar_key text,
    default_currency text not null default 'INR' check (default_currency ~ '^[A-Z]{3}$'),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.accounts (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(trim(name)) between 1 and 80),
    avatar_key text,
    currency_code text not null default 'INR' check (currency_code ~ '^[A-Z]{3}$'),
    is_default boolean not null default false,
    spending_period text not null default 'Monthly',
    budget_amount numeric(18,2),
    include_income boolean not null default false,
    budget_mode boolean not null default false,
    expense_amount numeric(18,2),
    reminders text not null default 'Never',
    reminder_hour smallint check (reminder_hour between 0 and 23),
    reminder_minute smallint check (reminder_minute between 0 and 59),
    hide_transactions boolean not null default false,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    deleted_at timestamptz
);

create index if not exists accounts_owner_id_idx
    on public.accounts (owner_id);
create unique index if not exists accounts_one_default_per_owner
    on public.accounts (owner_id) where is_default and deleted_at is null;
create unique index if not exists accounts_owner_name_active
    on public.accounts (owner_id, lower(name)) where deleted_at is null;

create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    kind text not null check (kind in ('income', 'expense')),
    name text not null check (char_length(trim(name)) between 1 and 80),
    icon_key text,
    color text,
    position integer not null default 0,
    is_default boolean,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    deleted_at timestamptz
);

create index if not exists categories_owner_id_idx
    on public.categories (owner_id);
create unique index if not exists categories_owner_kind_name_active
    on public.categories (owner_id, kind, lower(name)) where deleted_at is null;

create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    account_id uuid not null references public.accounts(id) on delete cascade,
    category_id uuid references public.categories(id) on delete set null,
    kind text not null check (kind in ('income', 'expense', 'transfer')),
    amount numeric(18,2) not null check (amount > 0),
    currency_code text not null default 'INR' check (currency_code ~ '^[A-Z]{3}$'),
    occurred_at timestamptz not null,
    note text,
    transfer_group_id uuid,
    counterparty_account_id uuid references public.accounts(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    deleted_at timestamptz
);

create index if not exists transactions_owner_occurred_at
    on public.transactions (owner_id, occurred_at desc);
create index if not exists transactions_account_occurred_at
    on public.transactions (account_id, occurred_at desc) where deleted_at is null;
create index if not exists transactions_category_id_idx
    on public.transactions (category_id) where deleted_at is null;
create index if not exists transactions_counterparty_account_id_idx
    on public.transactions (counterparty_account_id) where counterparty_account_id is not null;
create index if not exists transactions_transfer_group_idx
    on public.transactions (transfer_group_id) where transfer_group_id is not null;

create table if not exists public.buckets (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    account_id uuid not null references public.accounts(id) on delete cascade,
    name text not null check (char_length(trim(name)) between 1 and 80),
    image_key text,
    position integer not null default 0,
    fund_amount numeric(18,2) not null default 0,
    expense_amount numeric(18,2) not null default 0,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    deleted_at timestamptz
);

create index if not exists buckets_owner_id_idx
    on public.buckets (owner_id);
create index if not exists buckets_account_id_idx
    on public.buckets (account_id);

create table if not exists public.bucket_transactions (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    bucket_id uuid not null references public.buckets(id) on delete cascade,
    kind text not null check (kind in ('fund', 'expense')),
    amount numeric(18,2) not null check (amount > 0),
    occurred_at timestamptz not null,
    note text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    deleted_at timestamptz
);

create index if not exists bucket_transactions_owner_id_idx
    on public.bucket_transactions (owner_id);
create index if not exists bucket_transactions_bucket_occurred_at
    on public.bucket_transactions (bucket_id, occurred_at desc) where deleted_at is null;

-- Web-only table (Android stores loan profiles locally)
create table if not exists public.loan_profiles (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(trim(name)) between 1 and 120),
    account_name text,
    bank_name text,
    principal_amount numeric(18,2) not null check (principal_amount > 0),
    interest_rate numeric(6,3) not null check (interest_rate > 0 and interest_rate <= 30),
    tenure_months integer not null check (tenure_months > 0 and tenure_months <= 600),
    emi_amount numeric(18,2) not null check (emi_amount >= 0),
    processing_fees numeric(18,2) not null default 0 check (processing_fees >= 0),
    loan_date date not null,
    first_emi_date date not null,
    last_emi_date date not null,
    currency_code text not null default 'INR' check (currency_code ~ '^[A-Z]{3}$'),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    deleted_at timestamptz
);

create index if not exists loan_profiles_owner_id_idx
    on public.loan_profiles (owner_id);

-- Web-only table (App Lock / PIN / passkey remain strictly device-local)
create table if not exists public.user_preferences (
    owner_id uuid primary key references auth.users(id) on delete cascade,
    appearance_mode text not null default 'light' check (appearance_mode in ('light', 'dark')),
    accent_color text check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

-- ============================================================
-- 2. Trigger Functions & Triggers
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
    before update on public.accounts
    for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
    before update on public.categories
    for each row execute function public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
    before update on public.transactions
    for each row execute function public.set_updated_at();

drop trigger if exists buckets_set_updated_at on public.buckets;
create trigger buckets_set_updated_at
    before update on public.buckets
    for each row execute function public.set_updated_at();

drop trigger if exists bucket_transactions_set_updated_at on public.bucket_transactions;
create trigger bucket_transactions_set_updated_at
    before update on public.bucket_transactions
    for each row execute function public.set_updated_at();

drop trigger if exists loan_profiles_set_updated_at on public.loan_profiles;
create trigger loan_profiles_set_updated_at
    before update on public.loan_profiles
    for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
    before update on public.user_preferences
    for each row execute function public.set_updated_at();

-- Creates only profiles + user_preferences on signup.
-- Does NOT seed accounts or categories to avoid colliding with Android backups.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_display_name text;
    v_phone text;
    v_currency text;
begin
    v_display_name := coalesce(
        nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), ''),
        nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'SpendScope User'
    );
    v_display_name := left(v_display_name, 80);

    v_phone := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '');

    v_currency := upper(trim(coalesce(new.raw_user_meta_data->>'currency', '')));
    if v_currency !~ '^[A-Z]{3}$' then
        v_currency := 'INR';
    end if;

    insert into public.profiles (id, display_name, email, phone, default_currency)
    values (new.id, v_display_name, new.email, v_phone, v_currency)
    on conflict (id) do nothing;

    insert into public.user_preferences (owner_id)
    values (new.id)
    on conflict (owner_id) do nothing;

    return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Recomputes parent bucket fund/expense aggregates on bucket entry mutation.
create or replace function public.recalculate_bucket_totals()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_bucket_id uuid;
begin
    if tg_op = 'DELETE' then
        v_bucket_id := old.bucket_id;
    elsif tg_op = 'UPDATE' and old.bucket_id is distinct from new.bucket_id then
        update public.buckets b
        set
            fund_amount = coalesce((
                select sum(bt.amount)
                from public.bucket_transactions bt
                where bt.bucket_id = old.bucket_id
                  and bt.deleted_at is null
                  and bt.kind = 'fund'
            ), 0),
            expense_amount = coalesce((
                select sum(bt.amount)
                from public.bucket_transactions bt
                where bt.bucket_id = old.bucket_id
                  and bt.deleted_at is null
                  and bt.kind = 'expense'
            ), 0)
        where b.id = old.bucket_id;
        v_bucket_id := new.bucket_id;
    else
        v_bucket_id := new.bucket_id;
    end if;

    update public.buckets b
    set
        fund_amount = coalesce((
            select sum(bt.amount)
            from public.bucket_transactions bt
            where bt.bucket_id = v_bucket_id
              and bt.deleted_at is null
              and bt.kind = 'fund'
        ), 0),
        expense_amount = coalesce((
            select sum(bt.amount)
            from public.bucket_transactions bt
            where bt.bucket_id = v_bucket_id
              and bt.deleted_at is null
              and bt.kind = 'expense'
        ), 0)
    where b.id = v_bucket_id;

    return coalesce(new, old);
end;
$$;

drop trigger if exists bucket_transactions_recalculate_totals on public.bucket_transactions;
create trigger bucket_transactions_recalculate_totals
    after insert or update or delete on public.bucket_transactions
    for each row execute function public.recalculate_bucket_totals();

-- ============================================================
-- 3. Row Level Security & Least-Privilege Grants
-- ============================================================

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.buckets enable row level security;
alter table public.bucket_transactions enable row level security;
alter table public.loan_profiles enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile" on public.profiles
    for all to authenticated
    using (id = (select auth.uid()))
    with check (id = (select auth.uid()));

drop policy if exists "Users manage their own accounts" on public.accounts;
create policy "Users manage their own accounts" on public.accounts
    for all to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));

drop policy if exists "Users manage their own categories" on public.categories;
create policy "Users manage their own categories" on public.categories
    for all to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));

drop policy if exists "Users manage their own transactions" on public.transactions;
create policy "Users manage their own transactions" on public.transactions
    for all to authenticated
    using (owner_id = (select auth.uid()))
    with check (
        owner_id = (select auth.uid())
        and exists (
            select 1 from public.accounts account
            where account.id = transactions.account_id
              and account.owner_id = (select auth.uid())
              and (transactions.deleted_at is not null or account.deleted_at is null)
        )
        and (
            category_id is null or exists (
                select 1 from public.categories category
                where category.id = transactions.category_id
                  and category.owner_id = (select auth.uid())
                  and (transactions.deleted_at is not null or category.deleted_at is null)
            )
        )
        and (
            counterparty_account_id is null or exists (
                select 1 from public.accounts counter_account
                where counter_account.id = transactions.counterparty_account_id
                  and counter_account.owner_id = (select auth.uid())
                  and (transactions.deleted_at is not null or counter_account.deleted_at is null)
            )
        )
    );

drop policy if exists "Users manage their own buckets" on public.buckets;
create policy "Users manage their own buckets" on public.buckets
    for all to authenticated
    using (owner_id = (select auth.uid()))
    with check (
        owner_id = (select auth.uid())
        and exists (
            select 1 from public.accounts account
            where account.id = buckets.account_id
              and account.owner_id = (select auth.uid())
              and (buckets.deleted_at is not null or account.deleted_at is null)
        )
    );

drop policy if exists "Users manage their own bucket transactions" on public.bucket_transactions;
create policy "Users manage their own bucket transactions" on public.bucket_transactions
    for all to authenticated
    using (owner_id = (select auth.uid()))
    with check (
        owner_id = (select auth.uid())
        and exists (
            select 1 from public.buckets bucket
            where bucket.id = bucket_transactions.bucket_id
              and bucket.owner_id = (select auth.uid())
              and (bucket_transactions.deleted_at is not null or bucket.deleted_at is null)
        )
    );

drop policy if exists "Users manage their own loan profiles" on public.loan_profiles;
create policy "Users manage their own loan profiles" on public.loan_profiles
    for all to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));

drop policy if exists "Users manage their own preferences" on public.user_preferences;
create policy "Users manage their own preferences" on public.user_preferences
    for all to authenticated
    using (owner_id = (select auth.uid()))
    with check (owner_id = (select auth.uid()));

revoke all on public.profiles, public.accounts, public.categories,
    public.transactions, public.buckets, public.bucket_transactions,
    public.loan_profiles, public.user_preferences from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.accounts, public.categories,
    public.transactions, public.buckets, public.bucket_transactions,
    public.loan_profiles, public.user_preferences to authenticated;
