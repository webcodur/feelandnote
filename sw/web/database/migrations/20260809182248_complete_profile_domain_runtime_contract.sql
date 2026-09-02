begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- A review/rating earns its activity score exactly once.  The former web
-- action performed two independent writes, which could leave the review and
-- score out of sync and required unsafe direct DML grants on derived tables.
create unique index member_score_logs_first_review_once_idx
  on public.member_score_logs(member_id, reference_id)
  where type = 'activity'
    and action = 'Review 작성'
    and reference_id is not null;

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

create trigger member_contents_award_first_review
after update of rating, review on public.member_contents
for each row execute function private.award_first_member_review();

-- Keep the original record and participants immutable.  A receiver may only
-- make the single pending -> accepted/declined transition.
create or replace function private.guard_content_recommendation_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    if new.id is distinct from old.id
      or new.sender_id is distinct from old.sender_id
      or new.receiver_id is distinct from old.receiver_id
      or new.user_content_id is distinct from old.user_content_id
      or new.member_content_id is distinct from old.member_content_id
      or new.message is distinct from old.message
      or new.created_at is distinct from old.created_at
      or old.status <> 'pending'
      or new.status not in ('accepted', 'declined')
    then
      raise exception 'Only the pending recommendation status can be changed'
        using errcode = '42501';
    end if;

    new.responded_at := coalesce(new.responded_at, now());
  end if;

  return new;
end;
$$;

create trigger content_recommendations_guard_update
before update on public.content_recommendations
for each row execute function private.guard_content_recommendation_update();

alter table public.content_recommendations
  add constraint content_recommendations_sender_receiver_member_content_key
  unique (sender_id, receiver_id, member_content_id);

drop policy if exists "Users can create recommendations"
  on public.content_recommendations;
drop policy if exists "Receivers can update status"
  on public.content_recommendations;

create policy content_recommendations_insert_sender
on public.content_recommendations
for insert
to authenticated
with check (
  public.is_admin()
  or (
    public.is_current_account_active()
    and sender_id = (select auth.uid())
    and receiver_id <> (select auth.uid())
    and exists (
      select 1
      from public.member_contents
      where id = content_recommendations.member_content_id
        and member_id = (select auth.uid())
        and status = 'FINISHED'
    )
  )
);

create policy content_recommendations_update_receiver
on public.content_recommendations
for update
to authenticated
using (
  public.is_admin()
  or (
    public.is_current_account_active()
    and receiver_id = (select auth.uid())
    and status = 'pending'
  )
)
with check (
  public.is_admin()
  or receiver_id = (select auth.uid())
);

revoke update on table public.content_recommendations from anon, authenticated;
grant update (status, responded_at) on table public.content_recommendations
  to authenticated;

grant select on table public.member_score_logs to authenticated;
revoke select on table public.member_score_logs from anon;

-- Notification text remains localized by the application, but the database
-- derives both participants from the recommendation and permits one row per
-- event.  This avoids granting arbitrary cross-member INSERT privileges.
create unique index member_notifications_recommendation_event_idx
  on public.member_notifications(
    ((metadata ->> 'recommendation_id')),
    type
  )
  where type in ('recommendation', 'recommendation_accepted')
    and metadata ? 'recommendation_id';

create or replace function public.create_recommendation_notification(
  p_recommendation_id uuid,
  p_type text,
  p_message text,
  p_title text default null,
  p_link text default null,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_member_id uuid := (select auth.uid());
  recommendation_row public.content_recommendations%rowtype;
  notification_id uuid;
  target_member_id uuid;
  safe_metadata jsonb;
begin
  if current_member_id is null or not public.is_current_account_active() then
    raise exception 'An active member session is required'
      using errcode = '42501';
  end if;

  if p_type not in ('recommendation', 'recommendation_accepted') then
    raise exception 'Unsupported recommendation notification type'
      using errcode = '22023';
  end if;

  if nullif(btrim(p_message), '') is null
    or length(p_message) > 1000
    or length(coalesce(p_title, '')) > 200
    or length(coalesce(p_link, '')) > 500
    or pg_column_size(coalesce(p_metadata, '{}'::jsonb)) > 8192
  then
    raise exception 'Invalid recommendation notification payload'
      using errcode = '22023';
  end if;

  select *
  into recommendation_row
  from public.content_recommendations
  where id = p_recommendation_id;

  if not found then
    raise exception 'Recommendation not found'
      using errcode = 'P0002';
  end if;

  if p_type = 'recommendation' then
    if recommendation_row.sender_id <> current_member_id
      or recommendation_row.status <> 'pending'
    then
      raise exception 'Only the sender can notify a pending recommendation'
        using errcode = '42501';
    end if;
    target_member_id := recommendation_row.receiver_id;
  else
    if recommendation_row.receiver_id <> current_member_id
      or recommendation_row.status <> 'accepted'
    then
      raise exception 'Only the receiver can notify an accepted recommendation'
        using errcode = '42501';
    end if;
    target_member_id := recommendation_row.sender_id;
  end if;

  safe_metadata := case
    when jsonb_typeof(p_metadata) = 'object' then p_metadata
    else '{}'::jsonb
  end;
  safe_metadata := (safe_metadata - 'recommendation_id')
    || jsonb_build_object('recommendation_id', recommendation_row.id);

  insert into public.member_notifications(
    member_id,
    actor_member_id,
    type,
    title,
    message,
    link,
    metadata
  )
  values (
    target_member_id,
    current_member_id,
    p_type,
    nullif(btrim(p_title), ''),
    p_message,
    nullif(btrim(p_link), ''),
    safe_metadata
  )
  on conflict do nothing
  returning id into notification_id;

  if notification_id is null then
    select id
    into notification_id
    from public.member_notifications
    where type = p_type
      and metadata ->> 'recommendation_id' = recommendation_row.id::text;
  end if;

  return notification_id;
end;
$$;

revoke all on function public.create_recommendation_notification(
  uuid, text, text, text, text, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.create_recommendation_notification(
  uuid, text, text, text, text, jsonb
) to authenticated, service_role;

-- The faction atlas is already a public, filtered publishing surface.  Keep
-- its explicitly visible assignments available even while the general celeb
-- profile remains inactive; generic lists still filter active rows themselves.
drop policy if exists celebs_select_published on public.celebs;
create policy celebs_select_published
on public.celebs
for select
to anon, authenticated
using (
  publication_status = 'active'
  or public.is_admin()
  or exists (
    select 1
    from public.faction_atlas_members
    where celeb_id = celebs.id
      and not coalesce(hidden, false)
  )
);

drop policy if exists celeb_contents_select_published
  on public.celeb_contents;
create policy celeb_contents_select_published
on public.celeb_contents
for select
to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.celebs
    where id = celeb_contents.celeb_id
      and publication_status = 'active'
  )
  or exists (
    select 1
    from public.faction_atlas_members
    where celeb_id = celeb_contents.celeb_id
      and not coalesce(hidden, false)
  )
);

drop policy if exists celeb_metrics_select on public.celeb_metrics;
create policy celeb_metrics_select
on public.celeb_metrics
for select
to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.celebs
    where id = celeb_metrics.celeb_id
      and publication_status = 'active'
  )
  or exists (
    select 1
    from public.faction_atlas_members
    where celeb_id = celeb_metrics.celeb_id
      and not coalesce(hidden, false)
  )
);

revoke all on function
  private.award_first_member_review(),
  private.guard_content_recommendation_update()
from public, anon, authenticated, service_role;

commit;
