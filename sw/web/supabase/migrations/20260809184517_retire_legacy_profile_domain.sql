-- DEPLOYMENT GATE: run only after every web, backoffice, and worker process
-- has been deployed against the physical member/celeb domain tables.  This
-- contraction is intentionally irreversible; the private historical archives
-- remain available for audit and recovery.
-- The obsolete one-event timeline seeder at
-- sw/web-bo/scripts/auto-seed-birth.mjs was retired before this contraction.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

do $$
declare
  required_relation text;
begin
  foreach required_relation in array array[
    'public.profiles',
    'public.profiles_compat',
    'public.user_contents',
    'public.follows',
    'public.guestbook_entries',
    'public.user_social',
    'public.user_scores',
    'public.score_logs',
    'public.notifications',
    'public.user_accounts',
    'public.member_profiles',
    'public.celebs',
    'public.member_contents',
    'public.celeb_contents',
    'public.member_member_follows',
    'public.member_celeb_follows',
    'public.member_guestbook_entries',
    'public.celeb_guestbook_entries',
    'public.member_social_stats',
    'public.celeb_metrics',
    'public.member_scores',
    'public.member_score_logs',
    'public.member_notifications',
    'private.celeb_score_archive',
    'private.celeb_score_log_archive',
    'private.celeb_notification_archive'
  ]
  loop
    if to_regclass(required_relation) is null then
      raise exception 'Legacy retirement prerequisite is missing: %',
        required_relation using errcode = '42P01';
    end if;
  end loop;

  if to_regprocedure('public.celebs_guard_faction_references()') is null
     or to_regprocedure('public.celebs_guard_discourse_references()') is null
     or to_regprocedure('public.delete_auth_user(uuid)') is null
     or to_regprocedure('private.award_first_member_review()') is null
     or exists (
       select 1
       from pg_proc as function_row
       join pg_namespace as function_namespace
         on function_namespace.oid = function_row.pronamespace
       where function_namespace.nspname = 'private'
         and function_row.proname = 'award_first_member_review'
         and function_row.prosrc like '%user_contents:legacy_to_new%'
     )
     or to_regprocedure('private.guard_domain_relation_identity()') is null
     or exists (
       select 1
       from pg_proc as function_row
       join pg_namespace as function_namespace
         on function_namespace.oid = function_row.pronamespace
       where function_namespace.nspname = 'private'
         and function_row.proname = 'guard_domain_relation_identity'
         and function_row.prosrc like
           '%tg_table_name = ''member_guestbook_entries'' and%'
     )
     or has_table_privilege(
       'authenticated', 'public.user_scores', 'UPDATE'
     )
     or has_table_privilege(
       'authenticated', 'public.user_social', 'UPDATE'
     )
     or has_table_privilege(
       'authenticated', 'public.score_logs', 'INSERT'
     )
  then
    raise exception
      'profile-domain trigger and compatibility hardening must precede retirement'
      using errcode = '55000';
  end if;
end;
$$;

-- Final trigger bodies.  These are kept, but their expand-phase existence
-- checks are removed so no executable routine retains a legacy relation name.
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

create or replace function private.on_member_content_add()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.member_scores(member_id)
  values (new.member_id)
  on conflict (member_id) do nothing;

  insert into public.member_score_logs(
    member_id, type, action, amount, reference_id
  )
  values (new.member_id, 'activity', 'content_add', 1, new.id);

  update public.member_scores
  set activity_score = coalesce(activity_score, 0) + 1,
      total_score = coalesce(total_score, 0) + 1,
      updated_at = now()
  where member_id = new.member_id;
  return new;
end;
$$;

create or replace function private.on_celeb_content_add()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.celebs
  set celeb_tier = case when celeb_tier = 'light' then 'full' else celeb_tier end,
      content_research_status = case
        when content_research_status = 'confirmed_empty' then 'open'
        else content_research_status
      end
  where id = new.celeb_id;
  return new;
end;
$$;

create or replace function private.sync_member_member_follow()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  follower_id uuid := case
    when tg_op = 'DELETE' then old.follower_member_id
    else new.follower_member_id
  end;
  followed_id uuid := case
    when tg_op = 'DELETE' then old.followed_member_id
    else new.followed_member_id
  end;
begin
  update public.member_social_stats
  set follower_count = (
        select count(*)::integer
        from public.member_member_follows
        where followed_member_id = followed_id
      ),
      updated_at = now()
  where member_id = followed_id;

  update public.member_social_stats
  set following_count = (
        (select count(*) from public.member_member_follows
         where follower_member_id = follower_id)
        + (select count(*) from public.member_celeb_follows
           where member_id = follower_id)
      )::integer,
      friend_count = (
        select count(*)::integer
        from public.member_member_follows as outgoing
        where outgoing.follower_member_id = follower_id
          and exists (
            select 1
            from public.member_member_follows as incoming
            where incoming.follower_member_id = outgoing.followed_member_id
              and incoming.followed_member_id = follower_id
          )
      ),
      updated_at = now()
  where member_id = follower_id;

  update public.member_social_stats
  set friend_count = (
        select count(*)::integer
        from public.member_member_follows as outgoing
        where outgoing.follower_member_id = followed_id
          and exists (
            select 1
            from public.member_member_follows as incoming
            where incoming.follower_member_id = outgoing.followed_member_id
              and incoming.followed_member_id = followed_id
          )
      ),
      updated_at = now()
  where member_id = followed_id;

  perform private.update_member_influence(follower_id);
  perform private.update_member_influence(followed_id);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.sync_member_celeb_follow()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  follower_id uuid := case when tg_op = 'DELETE' then old.member_id else new.member_id end;
  followed_id uuid := case when tg_op = 'DELETE' then old.celeb_id else new.celeb_id end;
begin
  update public.member_social_stats
  set following_count = (
        (select count(*) from public.member_member_follows
         where follower_member_id = follower_id)
        + (select count(*) from public.member_celeb_follows
           where member_id = follower_id)
      )::integer,
      updated_at = now()
  where member_id = follower_id;

  update public.celeb_metrics
  set follower_count = (
        select count(*)::integer
        from public.member_celeb_follows
        where celeb_id = followed_id
      ),
      updated_at = now()
  where celeb_id = followed_id;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.on_member_score_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.update_member_influence(new.member_id);
  return new;
end;
$$;

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
    member_id, type, action, amount, reference_id
  )
  values (
    new.member_id, 'activity', 'Review 작성', 5, new.id
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

create or replace function private.handle_new_member_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.insert_member_follow_notification(
    new.id, new.follower_member_id, new.followed_member_id
  );
  return new;
end;
$$;

create or replace function private.handle_delete_member_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.delete_member_follow_notification(old.id);
  return old;
end;
$$;

create or replace function private.handle_new_member_guestbook_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.insert_member_guestbook_notification(
    new.id, new.owner_member_id, new.author_member_id
  );
  return new;
end;
$$;

create or replace function private.handle_delete_member_guestbook_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.delete_member_guestbook_notification(old.id);
  return old;
end;
$$;

revoke all on function
  private.guard_content_recommendation_update(),
  private.on_member_content_add(),
  private.on_celeb_content_add(),
  private.sync_member_member_follow(),
  private.sync_member_celeb_follow(),
  private.on_member_score_change(),
  private.award_first_member_review(),
  private.handle_new_member_follow_notification(),
  private.handle_delete_member_follow_notification(),
  private.handle_new_member_guestbook_notification(),
  private.handle_delete_member_guestbook_notification()
from public, anon, authenticated, service_role;

-- Freeze both sides of every bidirectional compatibility pair.  A five-second
-- lock timeout turns unexpected live traffic into a safe abort rather than a
-- partially retired schema.
lock table
  public.celeb_contents,
  public.celeb_guestbook_entries,
  public.celeb_metrics,
  public.celebs,
  public.content_recommendations,
  public.contents,
  public.follows,
  public.guestbook_entries,
  public.member_celeb_follows,
  public.member_contents,
  public.member_guestbook_entries,
  public.member_member_follows,
  public.member_notifications,
  public.member_profiles,
  public.member_score_logs,
  public.member_scores,
  public.member_social_stats,
  public.notifications,
  public.profiles,
  public.score_logs,
  public.user_accounts,
  public.user_contents,
  public.user_scores,
  public.user_social
in access exclusive mode;

-- Exact profile-domain parity: counts and IDs must partition cleanly, and all
-- retained member/celeb columns must have the same canonical JSON hash.
do $$
begin
  if exists (
    select 1 from public.profiles
    where profile_type is null or profile_type not in ('USER', 'CELEB')
  ) then
    raise exception 'profiles contains an unsupported profile_type';
  end if;

  if (select count(*) from public.profiles where profile_type = 'USER')
       <> (select count(*) from public.member_profiles)
     or (select count(*) from public.profiles where profile_type = 'USER')
       <> (select count(*) from public.user_accounts)
  then
    raise exception 'Member profile count mismatch before legacy retirement';
  end if;

  if (select count(*) from public.profiles where profile_type = 'CELEB')
       <> (select count(*) from public.celebs)
  then
    raise exception 'Celeb profile count mismatch before legacy retirement';
  end if;

  if (select count(*) from public.profiles)
       <> ((select count(*) from public.member_profiles)
           + (select count(*) from public.celebs))
  then
    raise exception 'Profile partition count mismatch before legacy retirement';
  end if;

  if exists (
    (select id from public.profiles where profile_type = 'USER'
     except select id from public.member_profiles)
    union all
    (select id from public.member_profiles
     except select id from public.profiles where profile_type = 'USER')
    union all
    (select id from public.profiles where profile_type = 'CELEB'
     except select id from public.celebs)
    union all
    (select id from public.celebs
     except select id from public.profiles where profile_type = 'CELEB')
    union all
    (select id from public.member_profiles
     except select id from public.user_accounts)
    union all
    (select id from public.user_accounts
     except select id from public.member_profiles)
  ) then
    raise exception 'Profile partition ID mismatch before legacy retirement';
  end if;

  if exists (
    select 1
    from public.profiles as legacy
    join public.member_profiles as member on member.id = legacy.id
    join public.user_accounts as account on account.id = legacy.id
    where legacy.profile_type = 'USER'
      and md5(jsonb_build_object(
        'id', legacy.id,
        'nickname', legacy.nickname,
        'avatar_url', legacy.avatar_url,
        'bio', legacy.bio,
        'birth_date', legacy.birth_date,
        'nationality', legacy.nationality,
        'is_verified', legacy.is_verified,
        'selected_title', legacy.selected_title,
        'showcase_titles', legacy.showcase_titles,
        'created_at', legacy.created_at,
        'updated_at', legacy.updated_at,
        'account_status', legacy.status
      )::text) is distinct from md5(jsonb_build_object(
        'id', member.id,
        'nickname', member.nickname,
        'avatar_url', member.avatar_url,
        'bio', member.bio,
        'birth_date', member.birth_date,
        'nationality', member.nationality,
        'is_verified', member.is_verified,
        'selected_title', member.selected_title,
        'showcase_titles', member.showcase_titles,
        'created_at', member.created_at,
        'updated_at', member.updated_at,
        'account_status', account.account_status
      )::text)
  ) then
    raise exception 'Member profile hash mismatch before legacy retirement';
  end if;

  if exists (
    select 1
    from public.profiles as legacy
    join public.celebs as celeb on celeb.id = legacy.id
    where legacy.profile_type = 'CELEB'
      and md5((
        (to_jsonb(legacy) - array[
          'profile_type', 'status', 'claimed_by',
          'selected_title', 'showcase_titles'
        ]::text[])
        || jsonb_build_object(
          'publication_status', legacy.status,
          'claimed_by_member_id', legacy.claimed_by
        )
      )::text) is distinct from md5(to_jsonb(celeb)::text)
  ) then
    raise exception 'Celeb profile hash mismatch before legacy retirement';
  end if;
end;
$$;

-- Derived member rows and private celeb archives cover every legacy row.  New
-- domain tables may contain initialized zero rows that never existed in the
-- mixed table, so parity is checked over the legacy ID population.
do $$
begin
  if exists (
    select 1
    from public.user_social as legacy
    left join public.member_profiles as member on member.id = legacy.user_id
    left join public.celebs as celeb on celeb.id = legacy.user_id
    where (member.id is null) = (celeb.id is null)
  ) then
    raise exception 'user_social contains a missing or ambiguous owner domain';
  end if;

  if (select count(*) from public.user_social)
       <> (
         (select count(*)
          from public.user_social as legacy
          join public.member_social_stats as stats
            on stats.member_id = legacy.user_id)
         +
         (select count(*)
          from public.user_social as legacy
          join public.celeb_metrics as metrics
            on metrics.celeb_id = legacy.user_id)
       )
  then
    raise exception 'Social metric split count mismatch before legacy retirement';
  end if;

  if exists (
    select 1
    from public.user_social as legacy
    join public.member_social_stats as stats
      on stats.member_id = legacy.user_id
    where md5(jsonb_build_object(
      'user_id', legacy.user_id,
      'content_count', legacy.content_count,
      'follower_count', legacy.follower_count,
      'influence', legacy.influence
    )::text) is distinct from md5(jsonb_build_object(
      'user_id', stats.member_id,
      'content_count', stats.content_count,
      'follower_count', stats.follower_count,
      'influence', stats.influence
    )::text)
  ) then
    raise exception 'Member social metric hash mismatch before legacy retirement';
  end if;

  -- following_count and friend_count are derived caches.  Three legacy rows
  -- contain historic double-counts, so the final values are proven against the
  -- physical follow relations rather than copied from the stale mixed cache.
  if exists (
    select 1
    from public.member_social_stats as stats
    where stats.content_count is distinct from (
            select count(*)::integer
            from public.member_contents
            where member_id = stats.member_id
          )
       or stats.follower_count is distinct from (
            select count(*)::integer
            from public.member_member_follows
            where followed_member_id = stats.member_id
          )
       or stats.following_count is distinct from (
            (select count(*) from public.member_member_follows
             where follower_member_id = stats.member_id)
            +
            (select count(*) from public.member_celeb_follows
             where member_id = stats.member_id)
          )::integer
       or stats.friend_count is distinct from (
            select count(*)::integer
            from public.member_member_follows as outgoing
            where outgoing.follower_member_id = stats.member_id
              and exists (
                select 1
                from public.member_member_follows as incoming
                where incoming.follower_member_id = outgoing.followed_member_id
                  and incoming.followed_member_id = stats.member_id
              )
          )
  ) then
    raise exception 'Final member social counters do not match physical relations';
  end if;

  -- All legacy celeb social fields were derived caches: following/friend/
  -- influence have no celeb-domain meaning, and six legacy content_count rows
  -- are historically stale.  Ownership was proved above; retained counters
  -- are therefore proved against their physical final relations below.
  if exists (
    select 1
    from public.celeb_metrics as metrics
    where metrics.content_count is distinct from (
            select count(*)::integer
            from public.celeb_contents
            where celeb_id = metrics.celeb_id
          )
       or metrics.follower_count is distinct from (
            select count(*)::integer
            from public.member_celeb_follows
            where celeb_id = metrics.celeb_id
          )
  ) then
    raise exception 'Final celeb counters do not match physical relations';
  end if;

  if (select count(*) from public.user_scores)
       <> ((select count(*) from public.member_scores)
           + (select count(*) from private.celeb_score_archive))
  then
    raise exception 'Score split count mismatch before legacy retirement';
  end if;

  if exists (
    select 1
    from public.user_scores as legacy
    left join public.member_scores as member_score
      on member_score.member_id = legacy.user_id
    left join private.celeb_score_archive as celeb_score
      on celeb_score.celeb_id = legacy.user_id
    where (member_score.member_id is null) = (celeb_score.celeb_id is null)
       or md5(to_jsonb(legacy)::text) is distinct from md5(
         case when member_score.member_id is not null then
           (to_jsonb(member_score) - 'member_id')
             || jsonb_build_object('user_id', member_score.member_id)
         else
           (to_jsonb(celeb_score) - array['celeb_id', 'archived_at']::text[])
             || jsonb_build_object('user_id', celeb_score.celeb_id)
         end::text
       )
  ) then
    raise exception 'Score split hash mismatch before legacy retirement';
  end if;

  if (select count(*) from public.score_logs)
       <> ((select count(*) from public.member_score_logs)
           + (select count(*) from private.celeb_score_log_archive))
  then
    raise exception 'Score-log split count mismatch before legacy retirement';
  end if;

  if exists (
    select 1
    from public.score_logs as legacy
    left join public.member_score_logs as member_log
      on member_log.id = legacy.id
    left join private.celeb_score_log_archive as celeb_log
      on celeb_log.id = legacy.id
    where (member_log.id is null) = (celeb_log.id is null)
       or md5(to_jsonb(legacy)::text) is distinct from md5(
         case when member_log.id is not null then
           (to_jsonb(member_log) - 'member_id')
             || jsonb_build_object('user_id', member_log.member_id)
         else
           (to_jsonb(celeb_log) - array['celeb_id', 'archived_at']::text[])
             || jsonb_build_object('user_id', celeb_log.celeb_id)
         end::text
       )
  ) then
    raise exception 'Score-log split hash mismatch before legacy retirement';
  end if;

  if (select count(*) from public.notifications)
       <> ((select count(*) from public.member_notifications)
           + (select count(*) from private.celeb_notification_archive))
  then
    raise exception 'Notification split count mismatch before legacy retirement';
  end if;

  if exists (
    select 1
    from public.notifications as legacy
    left join public.member_notifications as member_notice
      on member_notice.id = legacy.id
    left join private.celeb_notification_archive as celeb_notice
      on celeb_notice.id = legacy.id
    where (member_notice.id is null) = (celeb_notice.id is null)
       or md5((to_jsonb(legacy)
             || jsonb_build_object('is_read', coalesce(legacy.is_read, false)))::text)
          is distinct from md5(
            case when member_notice.id is not null then
              (to_jsonb(member_notice) - array[
                'member_id', 'actor_member_id'
              ]::text[])
                || jsonb_build_object(
                  'user_id', member_notice.member_id,
                  'actor_id', member_notice.actor_member_id
                )
            else
              to_jsonb(celeb_notice) - 'archived_at'
            end::text
          )
  ) then
    raise exception 'Notification split hash mismatch before legacy retirement';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from public.content_recommendations
    where member_content_id is null
       or member_content_id is distinct from user_content_id
  ) then
    raise exception 'Recommendation content ID mismatch before legacy retirement';
  end if;

  if exists (
    select 1
    from public.contents as content
    where content.member_count is distinct from (
            select count(*)::integer
            from public.member_contents
            where content_id = content.id
          )
       or content.celeb_count is distinct from (
            select count(*)::integer
            from public.celeb_contents
            where content_id = content.id
          )
       or content.record_count is distinct from
          content.member_count + content.celeb_count
  ) then
    raise exception 'Final content counters do not match physical relations';
  end if;
end;
$$;

-- Every external legacy FK has a validated, single-column replacement with
-- the same delete action.  Only after this catalog proof succeeds are the old
-- constraints removed.
do $$
declare
  item record;
begin
  for item in
    select *
    from (values
      ('academy_lesson_progress','user_id','academy_lesson_progress_user_id_fkey','profiles','user_id','academy_progress_accounts_fkey','user_accounts','c'),
      ('activity_logs','user_id','activity_logs_user_id_fkey','profiles','user_id','activity_logs_accounts_fkey','user_accounts','c'),
      ('blind_game_scores','user_id','blind_game_scores_user_id_fkey','profiles','user_id','blind_scores_accounts_fkey','user_accounts','c'),
      ('blocks','blocked_id','blocks_blocked_id_fkey','profiles','blocked_id','blocks_blocked_accounts_fkey','user_accounts','c'),
      ('blocks','blocker_id','blocks_blocker_id_fkey','profiles','blocker_id','blocks_blocker_accounts_fkey','user_accounts','c'),
      ('board_comments','author_id','board_comments_author_id_fkey','profiles','author_id','board_comments_accounts_fkey','user_accounts','c'),
      ('celeb_content_research_runs','celeb_id','celeb_content_research_runs_celeb_id_fkey','profiles','celeb_id','ccrr_celeb_celebs_fkey','celebs','c'),
      ('celeb_dialogues','celeb_id','celeb_dialogues_celeb_id_fkey','profiles','celeb_id','celeb_dialogues_celebs_fkey','celebs','c'),
      ('celeb_explanations','profile_id','celeb_explanations_profile_id_fkey','profiles','profile_id','celeb_explanations_celebs_fkey','celebs','c'),
      ('celeb_influence','celeb_id','celeb_influence_celeb_id_fkey','profiles','celeb_id','celeb_influence_celebs_fkey','celebs','c'),
      ('celeb_music_candidates','celeb_id','celeb_music_candidates_celeb_id_fkey','profiles','celeb_id','cmc_celeb_celebs_fkey','celebs','c'),
      ('celeb_persona','celeb_id','celeb_persona_celeb_id_fkey','profiles','celeb_id','celeb_persona_celebs_fkey','celebs','c'),
      ('celeb_relations','from_id','celeb_relations_from_id_fkey','profiles','from_id','celeb_relations_from_celebs_fkey','celebs','c'),
      ('celeb_relations','to_id','celeb_relations_to_id_fkey','profiles','to_id','celeb_relations_to_celebs_fkey','celebs','c'),
      ('celeb_relations_external','from_id','celeb_relations_external_from_id_fkey','profiles','from_id','celeb_rel_external_celebs_fkey','celebs','c'),
      ('celeb_tag_assignments','celeb_id','celeb_tag_assignments_celeb_id_fkey','profiles','celeb_id','celeb_tags_celebs_fkey','celebs','c'),
      ('celeb_task_queue','celeb_id','celeb_task_queue_celeb_id_fkey','profiles','celeb_id','celeb_task_queue_celebs_fkey','celebs','c'),
      ('celeb_timeline_events','celeb_id','celeb_timeline_events_celeb_id_fkey','profiles','celeb_id','celeb_timeline_celebs_fkey','celebs','c'),
      ('celeb_views_daily','celeb_id','celeb_views_daily_celeb_id_fkey','profiles','celeb_id','celeb_views_celebs_fkey','celebs','c'),
      ('content_recommendations','receiver_id','content_recommendations_receiver_id_fkey','profiles','receiver_id','recommendations_receiver_accounts_fkey','user_accounts','c'),
      ('content_recommendations','sender_id','content_recommendations_sender_id_fkey','profiles','sender_id','recommendations_sender_accounts_fkey','user_accounts','c'),
      ('content_recommendations','user_content_id','content_recommendations_user_content_id_fkey','user_contents','member_content_id','content_recommendations_member_content_id_fkey','member_contents','c'),
      ('daily_figures','celeb_id','daily_figures_celeb_id_fkey','profiles','celeb_id','daily_figures_celebs_fkey','celebs','c'),
      ('discourse_speakers','celeb_id','discourse_speakers_celeb_id_fkey','profiles','celeb_id','discourse_speakers_celebs_fkey','celebs','r'),
      ('faction_people','celeb_id','faction_people_celeb_id_fkey','profiles','celeb_id','faction_people_celebs_fkey','celebs','r'),
      ('feedbacks','author_id','feedbacks_author_id_fkey','profiles','author_id','feedbacks_author_accounts_fkey','user_accounts','c'),
      ('feedbacks','resolved_by','feedbacks_resolved_by_fkey','profiles','resolved_by','feedbacks_resolver_accounts_fkey','user_accounts','n'),
      ('fiction_source_characters','celeb_id','fiction_source_characters_celeb_id_fkey','profiles','celeb_id','fiction_characters_celebs_fkey','celebs','c'),
      ('flow_progress','user_id','flow_progress_user_id_fkey','profiles','user_id','flow_progress_accounts_fkey','user_accounts','c'),
      ('flows','user_id','playlists_user_id_fkey','profiles','user_id','flows_accounts_fkey','user_accounts','c'),
      ('free_post_comments','author_id','free_post_comments_author_id_fkey','profiles','author_id','free_comments_accounts_fkey','user_accounts','n'),
      ('free_posts','author_id','free_posts_author_id_fkey','profiles','author_id','free_posts_accounts_fkey','user_accounts','n'),
      ('notes','user_id','notes_user_id_fkey','profiles','user_id','notes_accounts_fkey','user_accounts','c'),
      ('notices','author_id','notices_author_id_fkey','profiles','author_id','notices_author_accounts_fkey','user_accounts','c'),
      ('record_comments','user_id','record_comments_user_id_fkey','profiles','user_id','record_comments_accounts_fkey','user_accounts','c'),
      ('record_likes','user_id','record_likes_user_id_fkey','profiles','user_id','record_likes_accounts_fkey','user_accounts','c'),
      ('records','contributor_id','records_contributor_id_fkey','profiles','contributor_id','records_contributor_accounts_fkey','user_accounts','a'),
      ('records','user_id','records_user_id_fkey','profiles','user_id','records_user_accounts_fkey','user_accounts','c'),
      ('reports','reporter_id','reports_reporter_id_fkey','profiles','reporter_id','reports_reporter_accounts_fkey','user_accounts','c'),
      ('reports','resolved_by','reports_resolved_by_fkey','profiles','resolved_by','reports_resolver_accounts_fkey','user_accounts','a'),
      ('reports','target_user_id','reports_target_user_id_fkey','profiles','target_user_id','reports_target_accounts_fkey','user_accounts','n'),
      ('tier_lists','user_id','tier_lists_user_id_fkey','profiles','user_id','tier_lists_accounts_fkey','user_accounts','c')
    ) as mapping(
      table_name, old_column, old_constraint, old_parent,
      new_column, new_constraint, new_parent, delete_action
    )
  loop
    if not exists (
      select 1
      from pg_constraint as constraint_row
      join pg_attribute as attribute_row
        on attribute_row.attrelid = constraint_row.conrelid
       and attribute_row.attnum = any(constraint_row.conkey)
      join pg_attribute as parent_attribute_row
        on parent_attribute_row.attrelid = constraint_row.confrelid
       and parent_attribute_row.attnum = any(constraint_row.confkey)
      where constraint_row.contype = 'f'
        and constraint_row.conname = item.old_constraint
        and constraint_row.conrelid = to_regclass('public.' || item.table_name)
        and constraint_row.confrelid = to_regclass('public.' || item.old_parent)
        and constraint_row.confdeltype = item.delete_action::"char"
        and cardinality(constraint_row.conkey) = 1
        and cardinality(constraint_row.confkey) = 1
        and attribute_row.attname = item.old_column
        and parent_attribute_row.attname = 'id'
    ) then
      raise exception 'Expected legacy FK is missing or changed: %.%',
        item.table_name, item.old_constraint;
    end if;

    if not exists (
      select 1
      from pg_constraint as constraint_row
      join pg_attribute as attribute_row
        on attribute_row.attrelid = constraint_row.conrelid
       and attribute_row.attnum = any(constraint_row.conkey)
      join pg_attribute as parent_attribute_row
        on parent_attribute_row.attrelid = constraint_row.confrelid
       and parent_attribute_row.attnum = any(constraint_row.confkey)
      where constraint_row.contype = 'f'
        and constraint_row.convalidated
        and constraint_row.conname = item.new_constraint
        and constraint_row.conrelid = to_regclass('public.' || item.table_name)
        and constraint_row.confrelid = to_regclass('public.' || item.new_parent)
        and constraint_row.confdeltype = item.delete_action::"char"
        and cardinality(constraint_row.conkey) = 1
        and cardinality(constraint_row.confkey) = 1
        and attribute_row.attname = item.new_column
        and parent_attribute_row.attname = 'id'
    ) then
      raise exception 'Validated replacement FK is missing or changed: %.%',
        item.table_name, item.new_constraint;
    end if;

    execute format(
      'alter table public.%I drop constraint %I',
      item.table_name,
      item.old_constraint
    );
  end loop;
end;
$$;

-- Split-table parity.  Snapshot-only columns are deliberately excluded from
-- the comparison because they preserve attribution after an account deletion.
do $$
begin
  if (select count(*) from public.user_contents)
       <> ((select count(*) from public.member_contents)
           + (select count(*) from public.celeb_contents))
  then
    raise exception 'Content split count mismatch before legacy retirement';
  end if;

  if exists (
    (select id from public.user_contents
     except
     (select id from public.member_contents
      union all select id from public.celeb_contents))
    union all
    ((select id from public.member_contents
      union all select id from public.celeb_contents)
     except select id from public.user_contents)
  ) then
    raise exception 'Content split ID mismatch before legacy retirement';
  end if;

  if exists (
    select 1
    from public.user_contents as legacy
    join (
      select
        content_row.id,
        (to_jsonb(content_row) - array[
          'member_id', 'contributor_member_id',
          'contributor_id_snapshot', 'contributor_name_snapshot'
        ]::text[])
        || jsonb_build_object(
          'user_id', content_row.member_id,
          'contributor_id', content_row.contributor_member_id
        ) as comparable
      from public.member_contents as content_row
      union all
      select
        content_row.id,
        (to_jsonb(content_row) - array[
          'celeb_id', 'contributor_member_id',
          'contributor_id_snapshot', 'contributor_name_snapshot'
        ]::text[])
        || jsonb_build_object(
          'user_id', content_row.celeb_id,
          'contributor_id', content_row.contributor_member_id
        ) as comparable
      from public.celeb_contents as content_row
    ) as domain on domain.id = legacy.id
    where md5(to_jsonb(legacy)::text)
      is distinct from md5(domain.comparable::text)
  ) then
    raise exception 'Content split hash mismatch before legacy retirement';
  end if;

  if (select count(*) from public.follows)
       <> ((select count(*) from public.member_member_follows)
           + (select count(*) from public.member_celeb_follows))
  then
    raise exception 'Follow split count mismatch before legacy retirement';
  end if;

  if exists (
    select 1
    from public.follows as legacy
    left join public.member_member_follows as member_follow
      on member_follow.id = legacy.id
    left join public.member_celeb_follows as celeb_follow
      on celeb_follow.id = legacy.id
    where (member_follow.id is null) = (celeb_follow.id is null)
       or md5(to_jsonb(legacy)::text) is distinct from md5(
         case when member_follow.id is not null then
           (to_jsonb(member_follow) - array[
             'follower_member_id', 'followed_member_id'
           ]::text[])
           || jsonb_build_object(
             'follower_id', member_follow.follower_member_id,
             'following_id', member_follow.followed_member_id
           )
         else
           (to_jsonb(celeb_follow) - array['member_id', 'celeb_id']::text[])
           || jsonb_build_object(
             'follower_id', celeb_follow.member_id,
             'following_id', celeb_follow.celeb_id
           )
         end::text
       )
  ) then
    raise exception 'Follow split hash mismatch before legacy retirement';
  end if;

  if (select count(*) from public.guestbook_entries)
       <> ((select count(*) from public.member_guestbook_entries)
           + (select count(*) from public.celeb_guestbook_entries))
  then
    raise exception 'Guestbook split count mismatch before legacy retirement';
  end if;

  if exists (
    select 1
    from public.guestbook_entries as legacy
    left join public.member_guestbook_entries as member_entry
      on member_entry.id = legacy.id
    left join public.celeb_guestbook_entries as celeb_entry
      on celeb_entry.id = legacy.id
    where (member_entry.id is null) = (celeb_entry.id is null)
       or md5(to_jsonb(legacy)::text) is distinct from md5(
         case when member_entry.id is not null then
           (to_jsonb(member_entry) - array[
             'owner_member_id', 'author_member_id'
           ]::text[])
           || jsonb_build_object(
             'profile_id', member_entry.owner_member_id,
             'author_id', member_entry.author_member_id
           )
         else
           (to_jsonb(celeb_entry) - array[
             'celeb_id', 'author_member_id'
           ]::text[])
           || jsonb_build_object(
             'profile_id', celeb_entry.celeb_id,
             'author_id', celeb_entry.author_member_id
           )
         end::text
       )
  ) then
    raise exception 'Guestbook split hash mismatch before legacy retirement';
  end if;
end;
$$;

-- Retire every compatibility trigger explicitly.  Strict DROP statements are
-- deliberate deployment gates: a renamed or missing object means the catalog
-- no longer matches the reviewed expand/contract sequence.
drop trigger member_profiles_delete_compat on public.member_profiles;
drop trigger celebs_delete_profile_compat on public.celebs;
drop trigger trg_member_profiles_sync_profile_compat on public.member_profiles;
drop trigger trg_celebs_sync_profile_compat on public.celebs;
drop trigger member_contents_compat_sync on public.member_contents;
drop trigger celeb_contents_compat_sync on public.celeb_contents;
drop trigger member_member_follows_compat_sync on public.member_member_follows;
drop trigger member_celeb_follows_compat_sync on public.member_celeb_follows;
drop trigger member_guestbook_compat_sync on public.member_guestbook_entries;
drop trigger celeb_guestbook_compat_sync on public.celeb_guestbook_entries;
drop trigger member_social_stats_compat_sync on public.member_social_stats;
drop trigger celeb_metrics_compat_sync on public.celeb_metrics;
drop trigger member_scores_compat_sync on public.member_scores;
drop trigger member_score_logs_compat_sync on public.member_score_logs;
drop trigger member_notifications_compat_sync on public.member_notifications;
drop trigger content_recommendations_sync_content_ids
  on public.content_recommendations;

-- Retire all 24 triggers owned by the mixed legacy tables.  Business behavior
-- now lives exclusively on the final domain tables.
drop trigger legacy_follows_capture on public.follows;
drop trigger on_follow_change on public.follows;
drop trigger on_follow_created on public.follows;
drop trigger on_follow_deleted on public.follows;

drop trigger legacy_guestbook_capture on public.guestbook_entries;
drop trigger on_guestbook_created on public.guestbook_entries;
drop trigger on_guestbook_deleted on public.guestbook_entries;

drop trigger legacy_notifications_capture on public.notifications;

drop trigger on_profile_created_scores on public.profiles;
drop trigger on_profile_created_social on public.profiles;
drop trigger trg_guard_member_profile_domain on public.profiles;
drop trigger trg_guard_profile_account_domain on public.profiles;
drop trigger trg_profiles_sync_profile_split on public.profiles;
drop trigger trg_profiles_touch_updated_at on public.profiles;

drop trigger legacy_score_logs_capture on public.score_logs;

drop trigger legacy_user_contents_capture on public.user_contents;
drop trigger on_user_content_insert on public.user_contents;
drop trigger trg_celeb_source_url on public.user_contents;
drop trigger trg_guard_user_content_identity on public.user_contents;
drop trigger trigger_update_content_count on public.user_contents;
drop trigger trigger_update_content_user_count on public.user_contents;

drop trigger legacy_user_scores_capture on public.user_scores;
drop trigger on_user_scores_update on public.user_scores;

drop trigger legacy_user_social_capture on public.user_social;

-- These five policies are the remaining explicitly legacy policy contract.
drop policy guestbook_insert on public.guestbook_entries;
drop policy user_contents_delete_owner_or_contributor on public.user_contents;
drop policy user_contents_insert_member_or_contribution on public.user_contents;
drop policy user_contents_select_visible on public.user_contents;
drop policy user_contents_update_owner_or_contributor on public.user_contents;

-- Contract content recommendations onto member_content_id.  The replacement
-- FK was validated in the explicit FK map above; the unique contract is also
-- checked before the nullable expand-phase column is made required.
do $$
begin
  if not exists (
    select 1
    from pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.content_recommendations'::regclass
      and constraint_row.conname =
        'content_recommendations_sender_receiver_member_content_key'
      and constraint_row.contype = 'u'
      and constraint_row.convalidated
      and constraint_row.conkey = array[
        (select attnum from pg_attribute
         where attrelid = 'public.content_recommendations'::regclass
           and attname = 'sender_id'),
        (select attnum from pg_attribute
         where attrelid = 'public.content_recommendations'::regclass
           and attname = 'receiver_id'),
        (select attnum from pg_attribute
         where attrelid = 'public.content_recommendations'::regclass
           and attname = 'member_content_id')
      ]::smallint[]
  ) then
    raise exception 'Validated member-content recommendation uniqueness is missing';
  end if;
end;
$$;

alter table public.content_recommendations
  drop constraint content_recommendations_sender_id_receiver_id_user_content__key;
drop index public.idx_content_recommendations_user_content_id;
alter table public.content_recommendations
  alter column member_content_id set not null,
  drop column user_content_id;

-- Drop the 24 compatibility-only functions only after their triggers and the
-- one old recommendation column have been detached.  Final-domain routines
-- rewritten above remain installed.
drop function private.delete_member_profile_compat_row();
drop function private.delete_celeb_profile_compat_row();
drop function private.guard_profile_account_domain();
drop function private.sync_celeb_to_compat();
drop function private.sync_legacy_profile_domain_row();
drop function private.sync_member_profile_from_account();
drop function private.sync_member_profile_to_compat();
drop function private.sync_new_profile_domain_row();
drop function private.sync_profile_split();
drop function private.sync_content_recommendation_ids();

drop function public.check_celeb_source_url();
drop function public.handle_new_user_scores();
drop function public.handle_new_user_social();
drop function public.on_content_add();
drop function public.sync_follow_counts();
drop function public.update_user_content_count();
drop function public.guard_member_profile_domain();
drop function public.guard_user_content_identity();
drop function public.update_content_user_count();
drop function public.on_score_change();
drop function public.handle_new_follow();
drop function public.handle_delete_follow();
drop function public.handle_new_guestbook_entry();
drop function public.handle_delete_guestbook_entry();

drop view public.profiles_compat restrict;

-- RESTRICT would stop each destructive DROP, but this catalog gate produces a
-- useful object list before any table is removed.  It covers declarative and
-- source-level dependencies because PL/pgSQL relation references are not all
-- represented in pg_depend.
do $$
declare
  legacy_relations oid[] := array[
    'public.profiles'::regclass,
    'public.user_contents'::regclass,
    'public.follows'::regclass,
    'public.guestbook_entries'::regclass,
    'public.user_social'::regclass,
    'public.user_scores'::regclass,
    'public.score_logs'::regclass,
    'public.notifications'::regclass
  ];
  unexpected text;
begin
  select string_agg(
           format('%I.%I:%I', child_namespace.nspname,
                  child_table.relname, constraint_row.conname),
           ', ' order by child_namespace.nspname,
                         child_table.relname,
                         constraint_row.conname
         )
  into unexpected
  from pg_constraint as constraint_row
  join pg_class as child_table on child_table.oid = constraint_row.conrelid
  join pg_namespace as child_namespace
    on child_namespace.oid = child_table.relnamespace
  where constraint_row.contype = 'f'
    and constraint_row.confrelid = any(legacy_relations)
    and not (constraint_row.conrelid = any(legacy_relations));

  if unexpected is not null then
    raise exception 'Surviving FKs still depend on legacy parents: %', unexpected;
  end if;

  select string_agg(
           distinct format('%I.%I', view_namespace.nspname, view_row.relname),
           ', '
         )
  into unexpected
  from pg_depend as dependency_row
  join pg_rewrite as rewrite_row on rewrite_row.oid = dependency_row.objid
  join pg_class as view_row on view_row.oid = rewrite_row.ev_class
  join pg_namespace as view_namespace
    on view_namespace.oid = view_row.relnamespace
  where dependency_row.classid = 'pg_rewrite'::regclass
    and dependency_row.refclassid = 'pg_class'::regclass
    and dependency_row.refobjid = any(legacy_relations)
    and view_row.relkind in ('v', 'm');

  if unexpected is not null then
    raise exception 'Surviving views still depend on legacy relations: %', unexpected;
  end if;

  select string_agg(
           distinct function_namespace.nspname || '.'
             || function_row.oid::regprocedure::text,
           ', '
         )
  into unexpected
  from pg_depend as dependency_row
  join pg_proc as function_row on function_row.oid = dependency_row.objid
  join pg_namespace as function_namespace
    on function_namespace.oid = function_row.pronamespace
  where dependency_row.classid = 'pg_proc'::regclass
    and dependency_row.refclassid = 'pg_class'::regclass
    and dependency_row.refobjid = any(legacy_relations)
    and function_namespace.nspname in ('public', 'private');

  if unexpected is not null then
    raise exception 'Surviving functions still depend on legacy relations: %', unexpected;
  end if;

  select string_agg(
           function_namespace.nspname || '.'
             || function_row.oid::regprocedure::text,
           ', ' order by function_namespace.nspname,
                         function_row.oid::regprocedure::text
         )
  into unexpected
  from pg_proc as function_row
  join pg_namespace as function_namespace
    on function_namespace.oid = function_row.pronamespace
  where function_namespace.nspname in ('public', 'private')
    and function_row.prosrc ~
      '\m(profiles_compat|profile_type|profiles|user_contents|follows|guestbook_entries|user_social|user_scores|score_logs|notifications)\M';

  if unexpected is not null then
    raise exception 'Surviving function source names legacy objects: %', unexpected;
  end if;

  select string_agg(
           format('%I.%I:%I', policy_namespace.nspname,
                  policy_table.relname, policy_row.polname),
           ', '
         )
  into unexpected
  from pg_policy as policy_row
  join pg_class as policy_table on policy_table.oid = policy_row.polrelid
  join pg_namespace as policy_namespace
    on policy_namespace.oid = policy_table.relnamespace
  where not (policy_row.polrelid = any(legacy_relations))
    and (
      coalesce(pg_get_expr(policy_row.polqual, policy_row.polrelid), '')
      || ' '
      || coalesce(pg_get_expr(policy_row.polwithcheck, policy_row.polrelid), '')
    ) ~ '\m(profiles_compat|profile_type|profiles|user_contents|follows|guestbook_entries|user_social|user_scores|score_logs|notifications)\M';

  if unexpected is not null then
    raise exception 'Surviving policies still name legacy objects: %', unexpected;
  end if;
end;
$$;

-- Remove mixed relations without CASCADE.  profiles is deliberately last so
-- every child FK and compatibility dependency has already proved removable.
drop table public.notifications restrict;
drop table public.score_logs restrict;
drop table public.user_scores restrict;
drop table public.user_social restrict;
drop table public.guestbook_entries restrict;
drop table public.follows restrict;
drop table public.user_contents restrict;

alter table public.contents drop column user_count;

drop table public.profiles restrict;

-- Final catalog proof: no mixed relation, discriminator, executable reference,
-- or recommendation compatibility column survives.  Private celeb archives
-- are positively asserted so contraction can never erase historical records.
do $$
declare
  legacy_name text;
  unexpected text;
begin
  foreach legacy_name in array array[
    'public.profiles',
    'public.profiles_compat',
    'public.user_contents',
    'public.follows',
    'public.guestbook_entries',
    'public.user_social',
    'public.user_scores',
    'public.score_logs',
    'public.notifications'
  ]
  loop
    if to_regclass(legacy_name) is not null then
      raise exception 'Legacy relation survived contraction: %', legacy_name;
    end if;
  end loop;

  if exists (
    select 1
    from pg_attribute as attribute_row
    join pg_class as relation_row on relation_row.oid = attribute_row.attrelid
    join pg_namespace as relation_namespace
      on relation_namespace.oid = relation_row.relnamespace
    where attribute_row.attnum > 0
      and not attribute_row.attisdropped
      and attribute_row.attname = 'profile_type'
      and relation_namespace.nspname not in
        ('pg_catalog', 'information_schema', 'pg_toast')
  ) then
    raise exception 'A stored profile_type discriminator survived contraction';
  end if;

  if exists (
    select 1
    from pg_attribute
    where attrelid = 'public.contents'::regclass
      and attname = 'user_count'
      and attnum > 0
      and not attisdropped
  ) then
    raise exception 'contents.user_count survived contraction';
  end if;

  if exists (
    select 1
    from pg_attribute
    where attrelid = 'public.content_recommendations'::regclass
      and attname = 'user_content_id'
      and attnum > 0
      and not attisdropped
  ) then
    raise exception 'content_recommendations.user_content_id survived contraction';
  end if;

  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.content_recommendations'::regclass
      and attname = 'member_content_id'
      and attnum > 0
      and not attisdropped
      and attnotnull
  ) then
    raise exception 'member_content_id is not the required recommendation contract';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.content_recommendations'::regclass
      and conname = 'content_recommendations_member_content_id_fkey'
      and confrelid = 'public.member_contents'::regclass
      and contype = 'f'
      and convalidated
  ) then
    raise exception 'Final recommendation FK did not survive contraction';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.content_recommendations'::regclass
      and conname =
        'content_recommendations_sender_receiver_member_content_key'
      and contype = 'u'
      and convalidated
  ) then
    raise exception 'Final recommendation uniqueness did not survive contraction';
  end if;

  foreach legacy_name in array array[
    'private.celeb_score_archive',
    'private.celeb_score_log_archive',
    'private.celeb_notification_archive'
  ]
  loop
    if to_regclass(legacy_name) is null then
      raise exception 'Required private archive was removed: %', legacy_name;
    end if;
  end loop;

  select string_agg(
           function_namespace.nspname || '.'
             || function_row.oid::regprocedure::text,
           ', ' order by function_namespace.nspname,
                         function_row.oid::regprocedure::text
         )
  into unexpected
  from pg_proc as function_row
  join pg_namespace as function_namespace
    on function_namespace.oid = function_row.pronamespace
  where function_namespace.nspname in ('public', 'private')
    and function_row.prosrc ~
      '\m(profiles_compat|profile_type|profiles|user_contents|follows|guestbook_entries|user_social|user_scores|score_logs|notifications)\M';

  if unexpected is not null then
    raise exception 'Post-drop function source names legacy objects: %', unexpected;
  end if;

  select string_agg(
           format('%I.%I:%I', view_namespace.nspname,
                  view_row.viewname, 'definition'),
           ', '
         )
  into unexpected
  from pg_views as view_row
  join pg_namespace as view_namespace
    on view_namespace.nspname = view_row.schemaname
  where view_namespace.nspname in ('public', 'private')
    and view_row.definition ~
      '\m(profiles_compat|profile_type|profiles|user_contents|follows|guestbook_entries|user_social|user_scores|score_logs|notifications)\M';

  if unexpected is not null then
    raise exception 'Post-drop view definition names legacy objects: %', unexpected;
  end if;

  select string_agg(
           format('%I.%I:%I', policy_namespace.nspname,
                  policy_table.relname, policy_row.polname),
           ', '
         )
  into unexpected
  from pg_policy as policy_row
  join pg_class as policy_table on policy_table.oid = policy_row.polrelid
  join pg_namespace as policy_namespace
    on policy_namespace.oid = policy_table.relnamespace
  where (
      coalesce(pg_get_expr(policy_row.polqual, policy_row.polrelid), '')
      || ' '
      || coalesce(pg_get_expr(policy_row.polwithcheck, policy_row.polrelid), '')
    ) ~ '\m(profiles_compat|profile_type|profiles|user_contents|follows|guestbook_entries|user_social|user_scores|score_logs|notifications)\M';

  if unexpected is not null then
    raise exception 'Post-drop policy names legacy objects: %', unexpected;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
