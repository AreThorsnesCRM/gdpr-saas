-- DPA (databehandleravtale) acceptance log.
-- One row per actual acceptance click. Never update/overwrite an existing row's
-- accepted_at/version — a future re-acceptance (e.g. after a DPA version bump)
-- inserts a new row so the history is preserved.
--
-- account_id is nullable because a new signup only gets an account_id once the
-- email-confirmation callback creates the account (see app/(auth)/callback/route.ts).
-- The row is inserted at signup time with account_id = NULL and backfilled by the
-- callback route right after the account is created.

create table if not exists dpa_acceptances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  user_id uuid not null,
  dpa_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address text,
  user_agent text
);

create index if not exists dpa_acceptances_account_id_idx on dpa_acceptances(account_id);
create index if not exists dpa_acceptances_user_id_idx on dpa_acceptances(user_id);
