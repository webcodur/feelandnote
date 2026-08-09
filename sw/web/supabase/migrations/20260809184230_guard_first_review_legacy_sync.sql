begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- During the expand/contract window an old web instance updates
-- user_contents and then writes the +5 score itself.  The compatibility
-- capture upserts that row into member_contents with this transaction-local
-- marker.  Skipping only that direction prevents a double award while a new
-- web instance can continue to earn the DB-owned score from a direct
-- member_contents update.
create or replace function private.award_first_member_review()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  inserted_count integer;
begin
  if current_setting('app.profile_domain_sync', true)
       = 'user_contents:legacy_to_new'
  then
    return new;
  end if;

  if not (
    old.rating is null
    and nullif(btrim(old.review), '') is null
    and (
      new.rating is not null
      or nullif(btrim(new.review), '') is not null
    )
  ) then
    return new;
  end if;

  insert into public.member_score_logs(
    member_id,
    type,
    action,
    amount,
    reference_id
  )
  values (
    new.member_id,
    'activity',
    'Review 작성',
    5,
    new.id
  )
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    return new;
  end if;

  insert into public.member_scores(member_id)
  values (new.member_id)
  on conflict (member_id) do nothing;

  update public.member_scores
  set activity_score = coalesce(activity_score, 0) + 5,
      total_score = coalesce(total_score, 0) + 5,
      updated_at = now()
  where member_id = new.member_id;

  return new;
end;
$$;

revoke all on function private.award_first_member_review()
  from public, anon, authenticated, service_role;

do $$
begin
  if not exists (
    select 1
    from pg_trigger as trigger_row
    where trigger_row.tgrelid = 'public.member_contents'::regclass
      and trigger_row.tgname = 'member_contents_award_first_review'
      and not trigger_row.tgisinternal
  ) then
    raise exception 'First-review score trigger is missing';
  end if;

  if not exists (
    select 1
    from pg_proc as function_row
    join pg_namespace as namespace_row
      on namespace_row.oid = function_row.pronamespace
    where namespace_row.nspname = 'private'
      and function_row.proname = 'award_first_member_review'
      and function_row.prosecdef
      and function_row.proconfig @> array['search_path=pg_catalog']
      and function_row.prosrc like '%user_contents:legacy_to_new%'
  ) then
    raise exception 'First-review compatibility guard is incomplete';
  end if;
end;
$$;

commit;
