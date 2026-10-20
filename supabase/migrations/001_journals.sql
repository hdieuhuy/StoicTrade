begin;
create table if not exists public.stoictrade_journals (
 user_id uuid primary key references auth.users(id) on delete cascade,
 document jsonb not null check (jsonb_typeof(document) = 'object' and document->>'version' = '1' and octet_length(document::text) <= 2097152),
 revision bigint not null default 1 check (revision > 0),
 updated_at timestamptz not null default now()
);
alter table public.stoictrade_journals enable row level security;
revoke all on public.stoictrade_journals from anon, authenticated;
grant select on public.stoictrade_journals to authenticated;
drop policy if exists own_journal on public.stoictrade_journals;
create policy own_journal on public.stoictrade_journals for select to authenticated using ((select auth.uid()) = user_id);
-- All writes pass through compare-and-swap, including direct Data API callers.
create or replace function public.save_stoictrade_journal(payload jsonb, expected_revision bigint)
returns setof public.stoictrade_journals
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 if expected_revision = 0 then
  return query insert into public.stoictrade_journals(user_id,document)
   values(auth.uid(),payload) on conflict (user_id) do nothing returning *;
 else
  return query update public.stoictrade_journals set document=payload, revision=revision+1, updated_at=now()
   where user_id=auth.uid() and revision=expected_revision returning *;
 end if;
end $$;
revoke all on function public.save_stoictrade_journal(jsonb,bigint) from public, anon;
grant execute on function public.save_stoictrade_journal(jsonb,bigint) to authenticated;
commit;
