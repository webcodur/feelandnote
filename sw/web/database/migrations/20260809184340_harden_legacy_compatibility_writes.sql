begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- The old web bundle still attempts to write derived score/social rows after
-- the legacy relation event.  Those writes are both forgeable and duplicate
-- the database triggers.  Make the triggers the only writer during the
-- compatibility window; the old bundle ignores the now-denied redundant DML.
create or replace function private.award_first_member_review()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  inserted_count integer;
begin
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

create or replace function public.handle_new_user_scores()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.user_scores(user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.handle_new_user_social()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.user_social(user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.on_content_add()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.score_logs(
    user_id, type, action, amount, reference_id
  )
  values (new.user_id, 'activity', 'content_add', 1, new.id);

  update public.user_scores
  set activity_score = coalesce(activity_score, 0) + 1,
      total_score = coalesce(total_score, 0) + 1,
      updated_at = now()
  where user_id = new.user_id;

  return new;
end;
$$;

create or replace function public.on_score_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform public.update_influence(new.user_id);
  return new;
end;
$$;

create or replace function public.sync_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    update public.user_social
    set follower_count = coalesce(follower_count, 0) + 1,
        updated_at = now()
    where user_id = new.following_id;

    update public.user_social
    set following_count = coalesce(following_count, 0) + 1,
        updated_at = now()
    where user_id = new.follower_id;

    if exists (
      select 1
      from public.follows
      where follower_id = new.following_id
        and following_id = new.follower_id
    ) then
      update public.user_social
      set friend_count = coalesce(friend_count, 0) + 1,
          updated_at = now()
      where user_id in (new.follower_id, new.following_id);
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.user_social
    set follower_count = greatest(coalesce(follower_count, 0) - 1, 0),
        updated_at = now()
    where user_id = old.following_id;

    update public.user_social
    set following_count = greatest(coalesce(following_count, 0) - 1, 0),
        updated_at = now()
    where user_id = old.follower_id;

    if exists (
      select 1
      from public.follows
      where follower_id = old.following_id
        and following_id = old.follower_id
    ) then
      update public.user_social
      set friend_count = greatest(coalesce(friend_count, 0) - 1, 0),
          updated_at = now()
      where user_id in (old.follower_id, old.following_id);
    end if;

    return old;
  end if;

  return null;
end;
$$;

revoke all on function
  private.award_first_member_review(),
  public.handle_new_user_scores(),
  public.handle_new_user_social(),
  public.on_content_add(),
  public.on_score_change(),
  public.sync_follow_counts()
from public, anon, authenticated, service_role;

drop policy if exists user_scores_update on public.user_scores;
drop policy if exists user_social_update on public.user_social;
drop policy if exists score_logs_insert on public.score_logs;

revoke all on table
  public.user_scores,
  public.user_social,
  public.score_logs
from public, anon, authenticated;

grant select on table public.user_scores, public.user_social
  to anon, authenticated;
grant select on table public.score_logs to authenticated;
grant all on table public.user_scores, public.user_social, public.score_logs
  to service_role;

-- The old recommendation actions still insert their localized notification
-- text directly.  Preserve that one flow, but derive authorization from the
-- canonical recommendation participants and state instead of trusting the
-- caller-supplied recipient or actor.
drop policy if exists "System can insert notifications"
  on public.notifications;
drop policy if exists "Users can update their own notifications"
  on public.notifications;
drop policy if exists notifications_insert_recommendation_compat
  on public.notifications;
drop policy if exists notifications_update_read_own_compat
  on public.notifications;
drop policy if exists notifications_delete_own_compat
  on public.notifications;

create policy notifications_insert_recommendation_compat
on public.notifications
for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and user_id is distinct from actor_id
  and type in ('recommendation', 'recommendation_accepted')
  and message is not null
  and char_length(message) between 1 and 2000
  and (title is null or char_length(title) <= 200)
  and (
    link is null
    or (
      char_length(link) <= 500
      and left(link, 1) = '/'
      and left(link, 2) <> '//'
    )
  )
  and jsonb_typeof(metadata) = 'object'
  and octet_length(metadata::text) <= 8192
  and exists (
    select 1
    from public.content_recommendations as recommendation
    where recommendation.id::text = metadata ->> 'recommendation_id'
      and (
        (
          type = 'recommendation'
          and recommendation.status = 'pending'
          and recommendation.sender_id = (select auth.uid())
          and recommendation.receiver_id = user_id
        )
        or (
          type = 'recommendation_accepted'
          and recommendation.status = 'accepted'
          and recommendation.receiver_id = (select auth.uid())
          and recommendation.sender_id = user_id
        )
      )
  )
);

create policy notifications_update_read_own_compat
on public.notifications
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy notifications_delete_own_compat
on public.notifications
for delete
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.notifications
  from public, anon, authenticated;
grant select, delete on table public.notifications to authenticated;
grant insert (
  user_id, actor_id, type, title, message, link, metadata
) on table public.notifications to authenticated;
grant update (is_read) on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

do $$
declare
  function_name regprocedure;
begin
  if has_table_privilege('authenticated', 'public.user_scores', 'UPDATE')
     or has_table_privilege('authenticated', 'public.user_social', 'UPDATE')
     or has_table_privilege('authenticated', 'public.score_logs', 'INSERT')
     or has_table_privilege('anon', 'public.notifications', 'INSERT')
     or has_table_privilege('authenticated', 'public.notifications', 'UPDATE')
     or not has_column_privilege(
       'authenticated', 'public.notifications', 'is_read', 'UPDATE'
     )
     or has_column_privilege(
       'authenticated', 'public.notifications', 'message', 'UPDATE'
     )
  then
    raise exception 'Legacy derived-table grants remain forgeable';
  end if;

  foreach function_name in array array[
    'private.award_first_member_review()'::regprocedure,
    'public.handle_new_user_scores()'::regprocedure,
    'public.handle_new_user_social()'::regprocedure,
    'public.on_content_add()'::regprocedure,
    'public.on_score_change()'::regprocedure,
    'public.sync_follow_counts()'::regprocedure
  ]
  loop
    if exists (
      select 1
      from pg_proc as function_row
      where function_row.oid = function_name
        and (
          not function_row.prosecdef
          or not function_row.proconfig @> array['search_path=pg_catalog']
        )
    )
    then
      raise exception 'Unsafe legacy trigger function: %', function_name;
    end if;

    if has_function_privilege('public', function_name, 'EXECUTE')
       or has_function_privilege('anon', function_name, 'EXECUTE')
       or has_function_privilege('authenticated', function_name, 'EXECUTE')
    then
      raise exception 'Legacy trigger function remains API-callable: %',
        function_name;
    end if;
  end loop;

  if exists (
    select 1
    from pg_proc as function_row
    join pg_namespace as namespace_row
      on namespace_row.oid = function_row.pronamespace
    where namespace_row.nspname = 'private'
      and function_row.proname = 'award_first_member_review'
      and function_row.prosrc like '%user_contents:legacy_to_new%'
  ) then
    raise exception 'First-review trigger still skips legacy-origin events';
  end if;
end;
$$;

commit;
