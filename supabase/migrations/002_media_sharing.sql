begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('trade-attachments','trade-attachments',false,3145728,array['image/webp','image/png','image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=3145728,allowed_mime_types=array['image/webp','image/png','image/jpeg'];
create table if not exists public.trade_attachments(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 trade_id text not null,path text not null unique,stage text not null check(stage in ('before','after')),
 note text not null default '' check(length(note)<=2000),annotations jsonb not null default '[]' check(jsonb_typeof(annotations)='array' and jsonb_array_length(annotations)<=30),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists attachments_owner_trade on public.trade_attachments(user_id,trade_id);
alter table public.trade_attachments enable row level security;
revoke all on public.trade_attachments from anon;grant select,insert,update,delete on public.trade_attachments to authenticated;
drop policy if exists own_attachments on public.trade_attachments;
create policy own_attachments on public.trade_attachments to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and split_part(path,'/',1)=auth.uid()::text and exists(select 1 from public.stoictrade_journals j where j.user_id=auth.uid() and j.document->'trades' @> jsonb_build_array(jsonb_build_object('id',trade_id))));
drop policy if exists stoictrade_private_read on storage.objects;
create policy stoictrade_private_read on storage.objects for select to authenticated using(bucket_id='trade-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists stoictrade_private_insert on storage.objects;
create policy stoictrade_private_insert on storage.objects for insert to authenticated with check(bucket_id='trade-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists stoictrade_private_delete on storage.objects;
create policy stoictrade_private_delete on storage.objects for delete to authenticated using(bucket_id='trade-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);
create table if not exists public.journey_shares(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 token uuid not null unique default gen_random_uuid(),snapshot jsonb not null check(octet_length(snapshot::text)<=524288),
 theme text not null,expires_at timestamptz not null,revoked_at timestamptz,created_at timestamptz not null default now()
);
create index if not exists shares_owner_created on public.journey_shares(user_id,created_at desc);
alter table public.journey_shares enable row level security;
revoke all on public.journey_shares from anon;grant select,insert on public.journey_shares to authenticated;
grant update(revoked_at) on public.journey_shares to authenticated;
drop policy if exists own_shares on public.journey_shares;
create policy own_shares on public.journey_shares to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and expires_at>now() and expires_at<=now()+interval '91 days');
create or replace function public.read_journey_share(share_token uuid) returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('snapshot',snapshot,'theme',theme,'expiresAt',expires_at)
 from public.journey_shares where token=share_token and revoked_at is null and expires_at>now();
$$;
revoke all on function public.read_journey_share(uuid) from public;
grant execute on function public.read_journey_share(uuid) to anon,authenticated;
commit;
