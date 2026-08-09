begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

alter table public.contents
  add column member_count integer not null default 0,
  add column celeb_count integer not null default 0,
  add column record_count integer not null default 0;

create table public.member_contents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.user_accounts(id) on delete cascade,
  content_id text not null references public.contents(id) on delete cascade,
  status text not null check (status = any (array['WANT', 'FINISHED']::text[])),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  contributor_member_id uuid references public.user_accounts(id) on delete set null,
  contributor_id_snapshot uuid,
  contributor_name_snapshot text,
  is_recommended boolean default false,
  completed_at timestamptz,
  rating numeric check (rating >= 0 and rating <= 5),
  review text,
  review_en text,
  is_spoiler boolean default false,
  is_pinned boolean default false,
  pinned_at timestamptz,
  visibility public.visibility_type default 'public'::public.visibility_type,
  source_url text,
  review_presets text[],
  unique (member_id, content_id)
);

create table public.celeb_contents (
  id uuid primary key default gen_random_uuid(),
  celeb_id uuid not null references public.celebs(id) on delete cascade,
  content_id text not null references public.contents(id) on delete cascade,
  status text not null check (status = any (array['WANT', 'FINISHED']::text[])),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  contributor_member_id uuid references public.user_accounts(id) on delete set null,
  contributor_id_snapshot uuid,
  contributor_name_snapshot text,
  is_recommended boolean default false,
  completed_at timestamptz,
  rating numeric check (rating >= 0 and rating <= 5),
  review text,
  review_en text,
  is_spoiler boolean default false,
  is_pinned boolean default false,
  pinned_at timestamptz,
  visibility public.visibility_type default 'public'::public.visibility_type,
  source_url text,
  review_presets text[],
  unique (celeb_id, content_id)
);

create table public.member_member_follows (
  id uuid primary key default gen_random_uuid(),
  follower_member_id uuid not null references public.user_accounts(id) on delete cascade,
  followed_member_id uuid not null references public.user_accounts(id) on delete cascade,
  created_at timestamptz default now(),
  check (follower_member_id <> followed_member_id),
  unique (follower_member_id, followed_member_id)
);

create table public.member_celeb_follows (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.user_accounts(id) on delete cascade,
  celeb_id uuid not null references public.celebs(id) on delete cascade,
  created_at timestamptz default now(),
  unique (member_id, celeb_id)
);

create table public.member_guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  owner_member_id uuid not null references public.user_accounts(id) on delete cascade,
  author_member_id uuid not null references public.user_accounts(id) on delete cascade,
  content text not null,
  is_private boolean default false,
  is_read boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.celeb_guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  celeb_id uuid not null references public.celebs(id) on delete cascade,
  author_member_id uuid not null references public.user_accounts(id) on delete cascade,
  content text not null,
  is_private boolean default false,
  is_read boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.member_social_stats (
  member_id uuid primary key references public.user_accounts(id) on delete cascade,
  follower_count integer default 0,
  following_count integer default 0,
  friend_count integer default 0,
  influence integer default 0,
  content_count integer default 0,
  updated_at timestamptz default now()
);

create table public.celeb_metrics (
  celeb_id uuid primary key references public.celebs(id) on delete cascade,
  follower_count integer default 0,
  content_count integer default 0,
  updated_at timestamptz default now()
);

create table public.member_scores (
  member_id uuid primary key references public.user_accounts(id) on delete cascade,
  activity_score integer default 0,
  title_bonus integer default 0,
  total_score integer default 0,
  updated_at timestamptz default now()
);

create table public.member_score_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.user_accounts(id) on delete cascade,
  type public.score_type not null,
  action text not null,
  amount integer not null,
  reference_id uuid,
  created_at timestamptz default now()
);

create table public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.user_accounts(id) on delete cascade,
  actor_member_id uuid references public.user_accounts(id) on delete set null,
  type text not null,
  title text,
  message text not null,
  link text,
  metadata jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table private.celeb_score_archive (
  celeb_id uuid primary key,
  activity_score integer,
  title_bonus integer,
  total_score integer,
  updated_at timestamptz,
  archived_at timestamptz not null default now()
);

create table private.celeb_score_log_archive (
  id uuid primary key,
  celeb_id uuid not null,
  type public.score_type not null,
  action text not null,
  amount integer not null,
  reference_id uuid,
  created_at timestamptz,
  archived_at timestamptz not null default now()
);

create table private.celeb_notification_archive (
  id uuid primary key,
  user_id uuid not null,
  actor_id uuid,
  type text not null,
  title text,
  message text not null,
  link text,
  metadata jsonb,
  is_read boolean,
  created_at timestamptz,
  archived_at timestamptz not null default now()
);

create index member_contents_member_id_idx on public.member_contents(member_id);
create index member_contents_content_id_idx on public.member_contents(content_id);
create index member_contents_contributor_idx on public.member_contents(contributor_member_id)
  where contributor_member_id is not null;
create index celeb_contents_celeb_id_idx on public.celeb_contents(celeb_id);
create index celeb_contents_content_id_idx on public.celeb_contents(content_id);
create index celeb_contents_contributor_idx on public.celeb_contents(contributor_member_id)
  where contributor_member_id is not null;
create index member_member_follows_followed_idx on public.member_member_follows(followed_member_id);
create index member_celeb_follows_celeb_idx on public.member_celeb_follows(celeb_id);
create index member_guestbook_owner_idx on public.member_guestbook_entries(owner_member_id, created_at desc);
create index member_guestbook_author_idx on public.member_guestbook_entries(author_member_id);
create index celeb_guestbook_celeb_idx on public.celeb_guestbook_entries(celeb_id, created_at desc);
create index celeb_guestbook_author_idx on public.celeb_guestbook_entries(author_member_id);
create index member_score_logs_member_idx on public.member_score_logs(member_id, created_at desc);
create index member_notifications_member_idx on public.member_notifications(member_id, created_at desc);
create index member_notifications_actor_idx on public.member_notifications(actor_member_id)
  where actor_member_id is not null;

alter table public.content_recommendations
  add column member_content_id uuid;

alter table public.content_recommendations
  add constraint content_recommendations_member_content_id_fkey
  foreign key (member_content_id) references public.member_contents(id) on delete cascade
  not valid;

create or replace function private.sync_content_recommendation_ids()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.member_content_id := coalesce(new.member_content_id, new.user_content_id);
  new.user_content_id := coalesce(new.user_content_id, new.member_content_id);

  if new.member_content_id is distinct from new.user_content_id then
    raise exception 'member_content_id and legacy user_content_id must match';
  end if;
  return new;
end;
$$;

create trigger content_recommendations_sync_content_ids
before insert or update of member_content_id, user_content_id on public.content_recommendations
for each row execute function private.sync_content_recommendation_ids();

-- Keep the legacy tables as the deployment write source while the new readers roll out.
-- The per-table GUC prevents recursion but still allows nested business side effects
-- (for example user_contents -> user_scores) to be captured by their own table sync.
create or replace function private.sync_legacy_profile_domain_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  previous_sync text := coalesce(current_setting('app.profile_domain_sync', true), '');
  skip_sync text := tg_table_name || ':new_to_legacy';
begin
  if previous_sync = skip_sync then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  perform set_config('app.profile_domain_sync', tg_table_name || ':legacy_to_new', true);

  if tg_table_name = 'user_contents' then
    if tg_op = 'DELETE' then
      delete from public.member_contents where id = old.id;
      delete from public.celeb_contents where id = old.id;
    elsif exists (select 1 from public.member_profiles where id = new.user_id) then
      delete from public.celeb_contents where id = new.id;
      insert into public.member_contents (
        id, member_id, content_id, status, created_at, updated_at,
        contributor_member_id, contributor_id_snapshot, contributor_name_snapshot,
        is_recommended, completed_at, rating, review, review_en, is_spoiler,
        is_pinned, pinned_at, visibility, source_url, review_presets
      ) values (
        new.id, new.user_id, new.content_id, new.status, new.created_at, new.updated_at,
        new.contributor_id, new.contributor_id,
        (select nickname from public.member_profiles where id = new.contributor_id),
        new.is_recommended, new.completed_at, new.rating, new.review, new.review_en,
        new.is_spoiler, new.is_pinned, new.pinned_at, new.visibility,
        new.source_url, new.review_presets
      )
      on conflict (id) do update set
        member_id = excluded.member_id,
        content_id = excluded.content_id,
        status = excluded.status,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        contributor_member_id = excluded.contributor_member_id,
        contributor_id_snapshot = coalesce(public.member_contents.contributor_id_snapshot, excluded.contributor_id_snapshot),
        contributor_name_snapshot = coalesce(public.member_contents.contributor_name_snapshot, excluded.contributor_name_snapshot),
        is_recommended = excluded.is_recommended,
        completed_at = excluded.completed_at,
        rating = excluded.rating,
        review = excluded.review,
        review_en = excluded.review_en,
        is_spoiler = excluded.is_spoiler,
        is_pinned = excluded.is_pinned,
        pinned_at = excluded.pinned_at,
        visibility = excluded.visibility,
        source_url = excluded.source_url,
        review_presets = excluded.review_presets;
    elsif exists (select 1 from public.celebs where id = new.user_id) then
      delete from public.member_contents where id = new.id;
      insert into public.celeb_contents (
        id, celeb_id, content_id, status, created_at, updated_at,
        contributor_member_id, contributor_id_snapshot, contributor_name_snapshot,
        is_recommended, completed_at, rating, review, review_en, is_spoiler,
        is_pinned, pinned_at, visibility, source_url, review_presets
      ) values (
        new.id, new.user_id, new.content_id, new.status, new.created_at, new.updated_at,
        new.contributor_id, new.contributor_id,
        (select nickname from public.member_profiles where id = new.contributor_id),
        new.is_recommended, new.completed_at, new.rating, new.review, new.review_en,
        new.is_spoiler, new.is_pinned, new.pinned_at, new.visibility,
        new.source_url, new.review_presets
      )
      on conflict (id) do update set
        celeb_id = excluded.celeb_id,
        content_id = excluded.content_id,
        status = excluded.status,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        contributor_member_id = excluded.contributor_member_id,
        contributor_id_snapshot = coalesce(public.celeb_contents.contributor_id_snapshot, excluded.contributor_id_snapshot),
        contributor_name_snapshot = coalesce(public.celeb_contents.contributor_name_snapshot, excluded.contributor_name_snapshot),
        is_recommended = excluded.is_recommended,
        completed_at = excluded.completed_at,
        rating = excluded.rating,
        review = excluded.review,
        review_en = excluded.review_en,
        is_spoiler = excluded.is_spoiler,
        is_pinned = excluded.is_pinned,
        pinned_at = excluded.pinned_at,
        visibility = excluded.visibility,
        source_url = excluded.source_url,
        review_presets = excluded.review_presets;
    else
      raise exception 'Unknown user_contents owner domain: %', new.user_id;
    end if;

  elsif tg_table_name = 'follows' then
    if tg_op = 'DELETE' then
      delete from public.member_member_follows where id = old.id;
      delete from public.member_celeb_follows where id = old.id;
    elsif exists (select 1 from public.member_profiles where id = new.follower_id)
      and exists (select 1 from public.member_profiles where id = new.following_id) then
      delete from public.member_celeb_follows where id = new.id;
      insert into public.member_member_follows(id, follower_member_id, followed_member_id, created_at)
      values (new.id, new.follower_id, new.following_id, new.created_at)
      on conflict (id) do update set
        follower_member_id = excluded.follower_member_id,
        followed_member_id = excluded.followed_member_id,
        created_at = excluded.created_at;
    elsif exists (select 1 from public.member_profiles where id = new.follower_id)
      and exists (select 1 from public.celebs where id = new.following_id) then
      delete from public.member_member_follows where id = new.id;
      insert into public.member_celeb_follows(id, member_id, celeb_id, created_at)
      values (new.id, new.follower_id, new.following_id, new.created_at)
      on conflict (id) do update set
        member_id = excluded.member_id,
        celeb_id = excluded.celeb_id,
        created_at = excluded.created_at;
    else
      raise exception 'Unsupported follow domains: % -> %', new.follower_id, new.following_id;
    end if;

  elsif tg_table_name = 'guestbook_entries' then
    if tg_op = 'DELETE' then
      delete from public.member_guestbook_entries where id = old.id;
      delete from public.celeb_guestbook_entries where id = old.id;
    elsif exists (select 1 from public.member_profiles where id = new.profile_id) then
      delete from public.celeb_guestbook_entries where id = new.id;
      insert into public.member_guestbook_entries(
        id, owner_member_id, author_member_id, content, is_private, is_read, created_at, updated_at
      ) values (
        new.id, new.profile_id, new.author_id, new.content, new.is_private,
        new.is_read, new.created_at, new.updated_at
      )
      on conflict (id) do update set
        owner_member_id = excluded.owner_member_id,
        author_member_id = excluded.author_member_id,
        content = excluded.content,
        is_private = excluded.is_private,
        is_read = excluded.is_read,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at;
    elsif exists (select 1 from public.celebs where id = new.profile_id) then
      delete from public.member_guestbook_entries where id = new.id;
      insert into public.celeb_guestbook_entries(
        id, celeb_id, author_member_id, content, is_private, is_read, created_at, updated_at
      ) values (
        new.id, new.profile_id, new.author_id, new.content, new.is_private,
        new.is_read, new.created_at, new.updated_at
      )
      on conflict (id) do update set
        celeb_id = excluded.celeb_id,
        author_member_id = excluded.author_member_id,
        content = excluded.content,
        is_private = excluded.is_private,
        is_read = excluded.is_read,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at;
    else
      raise exception 'Unknown guestbook owner domain: %', new.profile_id;
    end if;

  elsif tg_table_name = 'user_social' then
    if tg_op = 'DELETE' then
      delete from public.member_social_stats where member_id = old.user_id;
      delete from public.celeb_metrics where celeb_id = old.user_id;
    elsif exists (select 1 from public.member_profiles where id = new.user_id) then
      insert into public.member_social_stats(
        member_id, follower_count, following_count, friend_count, influence, content_count, updated_at
      ) values (
        new.user_id, new.follower_count, new.following_count, new.friend_count,
        new.influence, new.content_count, new.updated_at
      )
      on conflict (member_id) do update set
        follower_count = excluded.follower_count,
        following_count = excluded.following_count,
        friend_count = excluded.friend_count,
        influence = excluded.influence,
        content_count = excluded.content_count,
        updated_at = excluded.updated_at;
    elsif exists (select 1 from public.celebs where id = new.user_id) then
      insert into public.celeb_metrics(celeb_id, follower_count, content_count, updated_at)
      values (new.user_id, new.follower_count, new.content_count, new.updated_at)
      on conflict (celeb_id) do update set
        follower_count = excluded.follower_count,
        content_count = excluded.content_count,
        updated_at = excluded.updated_at;
    end if;

  elsif tg_table_name = 'user_scores' then
    if tg_op = 'DELETE' then
      delete from public.member_scores where member_id = old.user_id;
    elsif exists (select 1 from public.member_profiles where id = new.user_id) then
      insert into public.member_scores(member_id, activity_score, title_bonus, total_score, updated_at)
      values (new.user_id, new.activity_score, new.title_bonus, new.total_score, new.updated_at)
      on conflict (member_id) do update set
        activity_score = excluded.activity_score,
        title_bonus = excluded.title_bonus,
        total_score = excluded.total_score,
        updated_at = excluded.updated_at;
    elsif exists (select 1 from public.celebs where id = new.user_id) then
      insert into private.celeb_score_archive(
        celeb_id, activity_score, title_bonus, total_score, updated_at, archived_at
      ) values (
        new.user_id, new.activity_score, new.title_bonus, new.total_score, new.updated_at, now()
      )
      on conflict (celeb_id) do update set
        activity_score = excluded.activity_score,
        title_bonus = excluded.title_bonus,
        total_score = excluded.total_score,
        updated_at = excluded.updated_at,
        archived_at = excluded.archived_at;
    end if;

  elsif tg_table_name = 'score_logs' then
    if tg_op = 'DELETE' then
      delete from public.member_score_logs where id = old.id;
    elsif exists (select 1 from public.member_profiles where id = new.user_id) then
      insert into public.member_score_logs(id, member_id, type, action, amount, reference_id, created_at)
      values (new.id, new.user_id, new.type, new.action, new.amount, new.reference_id, new.created_at)
      on conflict (id) do update set
        member_id = excluded.member_id,
        type = excluded.type,
        action = excluded.action,
        amount = excluded.amount,
        reference_id = excluded.reference_id,
        created_at = excluded.created_at;
    elsif exists (select 1 from public.celebs where id = new.user_id) then
      insert into private.celeb_score_log_archive(
        id, celeb_id, type, action, amount, reference_id, created_at, archived_at
      ) values (
        new.id, new.user_id, new.type, new.action, new.amount,
        new.reference_id, new.created_at, now()
      )
      on conflict (id) do update set
        celeb_id = excluded.celeb_id,
        type = excluded.type,
        action = excluded.action,
        amount = excluded.amount,
        reference_id = excluded.reference_id,
        created_at = excluded.created_at,
        archived_at = excluded.archived_at;
    end if;

  elsif tg_table_name = 'notifications' then
    if tg_op = 'DELETE' then
      delete from public.member_notifications where id = old.id;
    elsif exists (select 1 from public.member_profiles where id = new.user_id)
      and (new.actor_id is null or exists (select 1 from public.member_profiles where id = new.actor_id)) then
      insert into public.member_notifications(
        id, member_id, actor_member_id, type, title, message, link, metadata, is_read, created_at
      ) values (
        new.id, new.user_id, new.actor_id, new.type, new.title, new.message,
        new.link, new.metadata, coalesce(new.is_read, false), new.created_at
      )
      on conflict (id) do update set
        member_id = excluded.member_id,
        actor_member_id = excluded.actor_member_id,
        type = excluded.type,
        title = excluded.title,
        message = excluded.message,
        link = excluded.link,
        metadata = excluded.metadata,
        is_read = excluded.is_read,
        created_at = excluded.created_at;
    elsif exists (select 1 from public.celebs where id = new.user_id)
      or exists (select 1 from public.celebs where id = new.actor_id) then
      delete from public.member_notifications where id = new.id;
      insert into private.celeb_notification_archive(
        id, user_id, actor_id, type, title, message, link, metadata, is_read, created_at, archived_at
      ) values (
        new.id, new.user_id, new.actor_id, new.type, new.title, new.message,
        new.link, new.metadata, new.is_read, new.created_at, now()
      )
      on conflict (id) do update set
        user_id = excluded.user_id,
        actor_id = excluded.actor_id,
        type = excluded.type,
        title = excluded.title,
        message = excluded.message,
        link = excluded.link,
        metadata = excluded.metadata,
        is_read = excluded.is_read,
        created_at = excluded.created_at,
        archived_at = excluded.archived_at;
    else
      raise exception 'Unknown notification member domain: %', new.user_id;
    end if;
  end if;

  perform set_config('app.profile_domain_sync', previous_sync, true);
  return case when tg_op = 'DELETE' then old else new end;
exception when others then
  perform set_config('app.profile_domain_sync', previous_sync, true);
  raise;
end;
$$;

create or replace function private.sync_new_profile_domain_row()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  previous_sync text := coalesce(current_setting('app.profile_domain_sync', true), '');
  legacy_table text;
  row_data jsonb;
begin
  if current_setting('app.profile_domain_backfill', true) = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  legacy_table := case tg_table_name
    when 'member_contents' then 'user_contents'
    when 'celeb_contents' then 'user_contents'
    when 'member_member_follows' then 'follows'
    when 'member_celeb_follows' then 'follows'
    when 'member_guestbook_entries' then 'guestbook_entries'
    when 'celeb_guestbook_entries' then 'guestbook_entries'
    when 'member_social_stats' then 'user_social'
    when 'celeb_metrics' then 'user_social'
    when 'member_scores' then 'user_scores'
    when 'member_score_logs' then 'score_logs'
    when 'member_notifications' then 'notifications'
  end;

  if previous_sync = legacy_table || ':legacy_to_new' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  perform set_config('app.profile_domain_sync', legacy_table || ':new_to_legacy', true);
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  if tg_table_name in ('member_contents', 'celeb_contents') then
    if tg_op = 'DELETE' then
      delete from public.user_contents where id = old.id;
    else
      insert into public.user_contents(
        id, user_id, content_id, status, created_at, updated_at, contributor_id,
        is_recommended, completed_at, rating, review, review_en, is_spoiler,
        is_pinned, pinned_at, visibility, source_url, review_presets
      ) values (
        new.id,
        coalesce((row_data ->> 'member_id')::uuid, (row_data ->> 'celeb_id')::uuid),
        new.content_id, new.status, new.created_at, new.updated_at,
        new.contributor_member_id, new.is_recommended, new.completed_at, new.rating,
        new.review, new.review_en, new.is_spoiler, new.is_pinned, new.pinned_at,
        new.visibility, new.source_url, new.review_presets
      )
      on conflict (id) do update set
        user_id = excluded.user_id,
        content_id = excluded.content_id,
        status = excluded.status,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        contributor_id = excluded.contributor_id,
        is_recommended = excluded.is_recommended,
        completed_at = excluded.completed_at,
        rating = excluded.rating,
        review = excluded.review,
        review_en = excluded.review_en,
        is_spoiler = excluded.is_spoiler,
        is_pinned = excluded.is_pinned,
        pinned_at = excluded.pinned_at,
        visibility = excluded.visibility,
        source_url = excluded.source_url,
        review_presets = excluded.review_presets;
    end if;

  elsif tg_table_name in ('member_member_follows', 'member_celeb_follows') then
    if tg_op = 'DELETE' then
      delete from public.follows where id = old.id;
    else
      insert into public.follows(id, follower_id, following_id, created_at)
      values (
        new.id,
        coalesce((row_data ->> 'follower_member_id')::uuid, (row_data ->> 'member_id')::uuid),
        coalesce((row_data ->> 'followed_member_id')::uuid, (row_data ->> 'celeb_id')::uuid),
        new.created_at
      )
      on conflict (id) do update set
        follower_id = excluded.follower_id,
        following_id = excluded.following_id,
        created_at = excluded.created_at;
    end if;

  elsif tg_table_name in ('member_guestbook_entries', 'celeb_guestbook_entries') then
    if tg_op = 'DELETE' then
      delete from public.guestbook_entries where id = old.id;
    else
      insert into public.guestbook_entries(
        id, profile_id, author_id, content, is_private, is_read, created_at, updated_at
      ) values (
        new.id,
        coalesce((row_data ->> 'owner_member_id')::uuid, (row_data ->> 'celeb_id')::uuid),
        new.author_member_id, new.content, new.is_private, new.is_read,
        new.created_at, new.updated_at
      )
      on conflict (id) do update set
        profile_id = excluded.profile_id,
        author_id = excluded.author_id,
        content = excluded.content,
        is_private = excluded.is_private,
        is_read = excluded.is_read,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at;
    end if;

  elsif tg_table_name in ('member_social_stats', 'celeb_metrics') then
    if tg_op = 'DELETE' then
      delete from public.user_social
      where user_id = coalesce((row_data ->> 'member_id')::uuid, (row_data ->> 'celeb_id')::uuid);
    else
      insert into public.user_social(
        user_id, follower_count, following_count, friend_count, influence, content_count, updated_at
      ) values (
        coalesce((row_data ->> 'member_id')::uuid, (row_data ->> 'celeb_id')::uuid),
        new.follower_count,
        coalesce((row_data ->> 'following_count')::integer, 0),
        coalesce((row_data ->> 'friend_count')::integer, 0),
        coalesce((row_data ->> 'influence')::integer, 0),
        new.content_count,
        new.updated_at
      )
      on conflict (user_id) do update set
        follower_count = excluded.follower_count,
        following_count = excluded.following_count,
        friend_count = excluded.friend_count,
        influence = excluded.influence,
        content_count = excluded.content_count,
        updated_at = excluded.updated_at;
    end if;

  elsif tg_table_name = 'member_scores' then
    if tg_op = 'DELETE' then
      delete from public.user_scores where user_id = old.member_id;
    else
      insert into public.user_scores(user_id, activity_score, title_bonus, total_score, updated_at)
      values (new.member_id, new.activity_score, new.title_bonus, new.total_score, new.updated_at)
      on conflict (user_id) do update set
        activity_score = excluded.activity_score,
        title_bonus = excluded.title_bonus,
        total_score = excluded.total_score,
        updated_at = excluded.updated_at;
    end if;

  elsif tg_table_name = 'member_score_logs' then
    if tg_op = 'DELETE' then
      delete from public.score_logs where id = old.id;
    else
      insert into public.score_logs(id, user_id, type, action, amount, reference_id, created_at)
      values (new.id, new.member_id, new.type, new.action, new.amount, new.reference_id, new.created_at)
      on conflict (id) do update set
        user_id = excluded.user_id,
        type = excluded.type,
        action = excluded.action,
        amount = excluded.amount,
        reference_id = excluded.reference_id,
        created_at = excluded.created_at;
    end if;

  elsif tg_table_name = 'member_notifications' then
    if tg_op = 'DELETE' then
      delete from public.notifications where id = old.id;
    else
      insert into public.notifications(
        id, user_id, actor_id, type, title, message, link, metadata, is_read, created_at
      ) values (
        new.id, new.member_id, new.actor_member_id, new.type, new.title,
        new.message, new.link, new.metadata, new.is_read, new.created_at
      )
      on conflict (id) do update set
        user_id = excluded.user_id,
        actor_id = excluded.actor_id,
        type = excluded.type,
        title = excluded.title,
        message = excluded.message,
        link = excluded.link,
        metadata = excluded.metadata,
        is_read = excluded.is_read,
        created_at = excluded.created_at;
    end if;
  end if;

  perform set_config('app.profile_domain_sync', previous_sync, true);
  return case when tg_op = 'DELETE' then old else new end;
exception when others then
  perform set_config('app.profile_domain_sync', previous_sync, true);
  raise;
end;
$$;

create trigger legacy_user_contents_capture
after insert or update or delete on public.user_contents
for each row execute function private.sync_legacy_profile_domain_row();
create trigger legacy_follows_capture
after insert or update or delete on public.follows
for each row execute function private.sync_legacy_profile_domain_row();
create trigger legacy_guestbook_capture
after insert or update or delete on public.guestbook_entries
for each row execute function private.sync_legacy_profile_domain_row();
create trigger legacy_user_social_capture
after insert or update or delete on public.user_social
for each row execute function private.sync_legacy_profile_domain_row();
create trigger legacy_user_scores_capture
after insert or update or delete on public.user_scores
for each row execute function private.sync_legacy_profile_domain_row();
create trigger legacy_score_logs_capture
after insert or update or delete on public.score_logs
for each row execute function private.sync_legacy_profile_domain_row();
create trigger legacy_notifications_capture
after insert or update or delete on public.notifications
for each row execute function private.sync_legacy_profile_domain_row();

create trigger member_contents_compat_sync
after insert or update or delete on public.member_contents
for each row execute function private.sync_new_profile_domain_row();
create trigger celeb_contents_compat_sync
after insert or update or delete on public.celeb_contents
for each row execute function private.sync_new_profile_domain_row();
create trigger member_member_follows_compat_sync
after insert or update or delete on public.member_member_follows
for each row execute function private.sync_new_profile_domain_row();
create trigger member_celeb_follows_compat_sync
after insert or update or delete on public.member_celeb_follows
for each row execute function private.sync_new_profile_domain_row();
create trigger member_guestbook_compat_sync
after insert or update or delete on public.member_guestbook_entries
for each row execute function private.sync_new_profile_domain_row();
create trigger celeb_guestbook_compat_sync
after insert or update or delete on public.celeb_guestbook_entries
for each row execute function private.sync_new_profile_domain_row();
create trigger member_social_stats_compat_sync
after insert or update or delete on public.member_social_stats
for each row execute function private.sync_new_profile_domain_row();
create trigger celeb_metrics_compat_sync
after insert or update or delete on public.celeb_metrics
for each row execute function private.sync_new_profile_domain_row();
create trigger member_scores_compat_sync
after insert or update or delete on public.member_scores
for each row execute function private.sync_new_profile_domain_row();
create trigger member_score_logs_compat_sync
after insert or update or delete on public.member_score_logs
for each row execute function private.sync_new_profile_domain_row();
create trigger member_notifications_compat_sync
after insert or update or delete on public.member_notifications
for each row execute function private.sync_new_profile_domain_row();

select set_config('app.profile_domain_backfill', 'on', true);

insert into public.member_contents (
  id, member_id, content_id, status, created_at, updated_at,
  contributor_member_id, contributor_id_snapshot, contributor_name_snapshot,
  is_recommended, completed_at, rating, review, review_en, is_spoiler,
  is_pinned, pinned_at, visibility, source_url, review_presets
)
select
  source.id, source.user_id, source.content_id, source.status, source.created_at, source.updated_at,
  source.contributor_id, source.contributor_id, contributor.nickname,
  source.is_recommended, source.completed_at, source.rating, source.review, source.review_en,
  source.is_spoiler, source.is_pinned, source.pinned_at, source.visibility,
  source.source_url, source.review_presets
from public.user_contents as source
join public.member_profiles as member on member.id = source.user_id
left join public.member_profiles as contributor on contributor.id = source.contributor_id
on conflict (id) do update set
  member_id = excluded.member_id,
  content_id = excluded.content_id,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  contributor_member_id = excluded.contributor_member_id,
  contributor_id_snapshot = coalesce(public.member_contents.contributor_id_snapshot, excluded.contributor_id_snapshot),
  contributor_name_snapshot = coalesce(public.member_contents.contributor_name_snapshot, excluded.contributor_name_snapshot),
  is_recommended = excluded.is_recommended,
  completed_at = excluded.completed_at,
  rating = excluded.rating,
  review = excluded.review,
  review_en = excluded.review_en,
  is_spoiler = excluded.is_spoiler,
  is_pinned = excluded.is_pinned,
  pinned_at = excluded.pinned_at,
  visibility = excluded.visibility,
  source_url = excluded.source_url,
  review_presets = excluded.review_presets;

insert into public.celeb_contents (
  id, celeb_id, content_id, status, created_at, updated_at,
  contributor_member_id, contributor_id_snapshot, contributor_name_snapshot,
  is_recommended, completed_at, rating, review, review_en, is_spoiler,
  is_pinned, pinned_at, visibility, source_url, review_presets
)
select
  source.id, source.user_id, source.content_id, source.status, source.created_at, source.updated_at,
  source.contributor_id, source.contributor_id, contributor.nickname,
  source.is_recommended, source.completed_at, source.rating, source.review, source.review_en,
  source.is_spoiler, source.is_pinned, source.pinned_at, source.visibility,
  source.source_url, source.review_presets
from public.user_contents as source
join public.celebs as celeb on celeb.id = source.user_id
left join public.member_profiles as contributor on contributor.id = source.contributor_id
on conflict (id) do update set
  celeb_id = excluded.celeb_id,
  content_id = excluded.content_id,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  contributor_member_id = excluded.contributor_member_id,
  contributor_id_snapshot = coalesce(public.celeb_contents.contributor_id_snapshot, excluded.contributor_id_snapshot),
  contributor_name_snapshot = coalesce(public.celeb_contents.contributor_name_snapshot, excluded.contributor_name_snapshot),
  is_recommended = excluded.is_recommended,
  completed_at = excluded.completed_at,
  rating = excluded.rating,
  review = excluded.review,
  review_en = excluded.review_en,
  is_spoiler = excluded.is_spoiler,
  is_pinned = excluded.is_pinned,
  pinned_at = excluded.pinned_at,
  visibility = excluded.visibility,
  source_url = excluded.source_url,
  review_presets = excluded.review_presets;

insert into public.member_member_follows (id, follower_member_id, followed_member_id, created_at)
select source.id, source.follower_id, source.following_id, source.created_at
from public.follows as source
join public.member_profiles as follower on follower.id = source.follower_id
join public.member_profiles as followed on followed.id = source.following_id
on conflict (id) do update set
  follower_member_id = excluded.follower_member_id,
  followed_member_id = excluded.followed_member_id,
  created_at = excluded.created_at;

insert into public.member_celeb_follows (id, member_id, celeb_id, created_at)
select source.id, source.follower_id, source.following_id, source.created_at
from public.follows as source
join public.member_profiles as member on member.id = source.follower_id
join public.celebs as celeb on celeb.id = source.following_id
on conflict (id) do update set
  member_id = excluded.member_id,
  celeb_id = excluded.celeb_id,
  created_at = excluded.created_at;

insert into public.member_guestbook_entries (
  id, owner_member_id, author_member_id, content, is_private, is_read, created_at, updated_at
)
select source.id, source.profile_id, source.author_id, source.content,
       source.is_private, source.is_read, source.created_at, source.updated_at
from public.guestbook_entries as source
join public.member_profiles as owner on owner.id = source.profile_id
join public.member_profiles as author on author.id = source.author_id
on conflict (id) do update set
  owner_member_id = excluded.owner_member_id,
  author_member_id = excluded.author_member_id,
  content = excluded.content,
  is_private = excluded.is_private,
  is_read = excluded.is_read,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into public.celeb_guestbook_entries (
  id, celeb_id, author_member_id, content, is_private, is_read, created_at, updated_at
)
select source.id, source.profile_id, source.author_id, source.content,
       source.is_private, source.is_read, source.created_at, source.updated_at
from public.guestbook_entries as source
join public.celebs as celeb on celeb.id = source.profile_id
join public.member_profiles as author on author.id = source.author_id
on conflict (id) do update set
  celeb_id = excluded.celeb_id,
  author_member_id = excluded.author_member_id,
  content = excluded.content,
  is_private = excluded.is_private,
  is_read = excluded.is_read,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into public.member_social_stats(member_id)
select id from public.member_profiles
on conflict (member_id) do nothing;

insert into public.celeb_metrics(celeb_id)
select id from public.celebs
on conflict (celeb_id) do nothing;

insert into public.member_scores(member_id)
select id from public.member_profiles
on conflict (member_id) do nothing;

insert into public.member_social_stats (
  member_id, follower_count, following_count, friend_count, influence, content_count, updated_at
)
select source.user_id, source.follower_count, source.following_count, source.friend_count,
       source.influence, source.content_count, source.updated_at
from public.user_social as source
join public.member_profiles as member on member.id = source.user_id
on conflict (member_id) do update set
  follower_count = excluded.follower_count,
  following_count = excluded.following_count,
  friend_count = excluded.friend_count,
  influence = excluded.influence,
  content_count = excluded.content_count,
  updated_at = excluded.updated_at;

insert into public.celeb_metrics (celeb_id, follower_count, content_count, updated_at)
select source.user_id, source.follower_count, source.content_count, source.updated_at
from public.user_social as source
join public.celebs as celeb on celeb.id = source.user_id
on conflict (celeb_id) do update set
  follower_count = excluded.follower_count,
  content_count = excluded.content_count,
  updated_at = excluded.updated_at;

insert into public.member_scores (member_id, activity_score, title_bonus, total_score, updated_at)
select source.user_id, source.activity_score, source.title_bonus, source.total_score, source.updated_at
from public.user_scores as source
join public.member_profiles as member on member.id = source.user_id
on conflict (member_id) do update set
  activity_score = excluded.activity_score,
  title_bonus = excluded.title_bonus,
  total_score = excluded.total_score,
  updated_at = excluded.updated_at;

insert into public.member_score_logs (id, member_id, type, action, amount, reference_id, created_at)
select source.id, source.user_id, source.type, source.action, source.amount,
       source.reference_id, source.created_at
from public.score_logs as source
join public.member_profiles as member on member.id = source.user_id
on conflict (id) do update set
  member_id = excluded.member_id,
  type = excluded.type,
  action = excluded.action,
  amount = excluded.amount,
  reference_id = excluded.reference_id,
  created_at = excluded.created_at;

insert into private.celeb_score_archive (
  celeb_id, activity_score, title_bonus, total_score, updated_at
)
select source.user_id, source.activity_score, source.title_bonus, source.total_score, source.updated_at
from public.user_scores as source
join public.celebs as celeb on celeb.id = source.user_id
on conflict (celeb_id) do update set
  activity_score = excluded.activity_score,
  title_bonus = excluded.title_bonus,
  total_score = excluded.total_score,
  updated_at = excluded.updated_at,
  archived_at = now();

insert into private.celeb_score_log_archive (
  id, celeb_id, type, action, amount, reference_id, created_at
)
select source.id, source.user_id, source.type, source.action, source.amount,
       source.reference_id, source.created_at
from public.score_logs as source
join public.celebs as celeb on celeb.id = source.user_id
on conflict (id) do update set
  celeb_id = excluded.celeb_id,
  type = excluded.type,
  action = excluded.action,
  amount = excluded.amount,
  reference_id = excluded.reference_id,
  created_at = excluded.created_at,
  archived_at = now();

insert into public.member_notifications (
  id, member_id, actor_member_id, type, title, message, link, metadata, is_read, created_at
)
select source.id, source.user_id, source.actor_id, source.type, source.title,
       source.message, source.link, source.metadata, coalesce(source.is_read, false), source.created_at
from public.notifications as source
join public.member_profiles as recipient on recipient.id = source.user_id
left join public.member_profiles as actor on actor.id = source.actor_id
where source.actor_id is null or actor.id is not null
on conflict (id) do update set
  member_id = excluded.member_id,
  actor_member_id = excluded.actor_member_id,
  type = excluded.type,
  title = excluded.title,
  message = excluded.message,
  link = excluded.link,
  metadata = excluded.metadata,
  is_read = excluded.is_read,
  created_at = excluded.created_at;

insert into private.celeb_notification_archive (
  id, user_id, actor_id, type, title, message, link, metadata, is_read, created_at
)
select source.id, source.user_id, source.actor_id, source.type, source.title,
       source.message, source.link, source.metadata, source.is_read, source.created_at
from public.notifications as source
where exists (select 1 from public.celebs where id = source.user_id)
   or exists (select 1 from public.celebs where id = source.actor_id)
on conflict (id) do update set
  user_id = excluded.user_id,
  actor_id = excluded.actor_id,
  type = excluded.type,
  title = excluded.title,
  message = excluded.message,
  link = excluded.link,
  metadata = excluded.metadata,
  is_read = excluded.is_read,
  created_at = excluded.created_at,
  archived_at = now();

update public.content_recommendations as recommendation
set member_content_id = recommendation.user_content_id
where exists (
  select 1 from public.member_contents as member_content
  where member_content.id = recommendation.user_content_id
);

alter table public.content_recommendations
  validate constraint content_recommendations_member_content_id_fkey;

alter table public.content_recommendations
  alter column member_content_id set not null;

do $$
begin
  if exists (
    select 1
    from public.user_contents as source
    left join public.member_profiles as member on member.id = source.user_id
    left join public.celebs as celeb on celeb.id = source.user_id
    where (member.id is null) = (celeb.id is null)
  ) then
    raise exception 'user_contents owner domain is missing or ambiguous';
  end if;

  if (select count(*) from public.user_contents) <>
     ((select count(*) from public.member_contents) + (select count(*) from public.celeb_contents)) then
    raise exception 'content split count mismatch';
  end if;

  if (select count(*) from public.follows) <>
     ((select count(*) from public.member_member_follows) + (select count(*) from public.member_celeb_follows)) then
    raise exception 'follow split count mismatch';
  end if;

  if (select count(*) from public.guestbook_entries) <>
     ((select count(*) from public.member_guestbook_entries) + (select count(*) from public.celeb_guestbook_entries)) then
    raise exception 'guestbook split count mismatch';
  end if;

  if (select count(*) from public.member_social_stats) <> (select count(*) from public.member_profiles)
    or (select count(*) from public.celeb_metrics) <> (select count(*) from public.celebs) then
    raise exception 'domain metric initialization count mismatch';
  end if;

  if (select count(*) from public.user_scores) <>
     ((select count(*) from public.member_scores) + (select count(*) from private.celeb_score_archive)) then
    raise exception 'score split count mismatch';
  end if;

  if (select count(*) from public.score_logs) <>
     ((select count(*) from public.member_score_logs) + (select count(*) from private.celeb_score_log_archive)) then
    raise exception 'score log split count mismatch';
  end if;

  if exists (
    select 1 from public.content_recommendations
    where member_content_id is null or member_content_id is distinct from user_content_id
  ) then
    raise exception 'content recommendation member content backfill mismatch';
  end if;

  if (select count(*) from public.notifications) <>
     ((select count(*) from public.member_notifications)
       + (select count(*) from private.celeb_notification_archive)) then
    raise exception 'notification split count mismatch';
  end if;
end;
$$;

update public.member_social_stats as stats
set content_count = source.total,
    follower_count = source.followers,
    following_count = source.following,
    friend_count = source.friends,
    updated_at = now()
from (
  select member.id,
         (select count(*) from public.member_contents where member_id = member.id)::integer as total,
         (select count(*) from public.member_member_follows where followed_member_id = member.id)::integer as followers,
         (
           (select count(*) from public.member_member_follows where follower_member_id = member.id)
           + (select count(*) from public.member_celeb_follows where member_id = member.id)
         )::integer as following,
         (
           select count(*)
           from public.member_member_follows as outgoing
           where outgoing.follower_member_id = member.id
             and exists (
               select 1 from public.member_member_follows as incoming
               where incoming.follower_member_id = outgoing.followed_member_id
                 and incoming.followed_member_id = member.id
             )
         )::integer as friends
  from public.member_profiles as member
) as source
where stats.member_id = source.id;

update public.celeb_metrics as metrics
set content_count = source.total,
    follower_count = source.followers,
    updated_at = now()
from (
  select celeb.id,
         (select count(*) from public.celeb_contents where celeb_id = celeb.id)::integer as total,
         (select count(*) from public.member_celeb_follows where celeb_id = celeb.id)::integer as followers
  from public.celebs as celeb
) as source
where metrics.celeb_id = source.id;

update public.contents as content
set member_count = counts.member_count,
    celeb_count = counts.celeb_count,
    record_count = counts.member_count + counts.celeb_count
from (
  select content_row.id,
         (select count(*)::integer from public.member_contents where content_id = content_row.id) as member_count,
         (select count(*)::integer from public.celeb_contents where content_id = content_row.id) as celeb_count
  from public.contents as content_row
) as counts
where content.id = counts.id;

select set_config('app.profile_domain_backfill', '', true);

create or replace function private.guard_member_content_identity()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if (select auth.uid()) is not null
    and not public.is_admin()
    and (
      new.id is distinct from old.id
      or new.member_id is distinct from old.member_id
      or new.content_id is distinct from old.content_id
      or new.contributor_member_id is distinct from old.contributor_member_id
      or new.created_at is distinct from old.created_at
    )
  then
    raise exception 'Members cannot move archive entries between owners or works'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.guard_celeb_content_identity()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if (select auth.uid()) is not null
    and not public.is_admin()
    and (
      new.id is distinct from old.id
      or new.celeb_id is distinct from old.celeb_id
      or new.content_id is distinct from old.content_id
      or new.contributor_member_id is distinct from old.contributor_member_id
      or new.created_at is distinct from old.created_at
    )
  then
    raise exception 'Members cannot move archive entries between owners or works'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.require_celeb_content_source()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.source_url is null or btrim(new.source_url) = '' then
    raise exception 'source_url is required for celeb contents';
  end if;
  return new;
end;
$$;

create or replace function private.set_content_contributor_snapshot()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT'
    or new.contributor_member_id is distinct from old.contributor_member_id then
    new.contributor_id_snapshot := new.contributor_member_id;
    new.contributor_name_snapshot := (
      select nickname from public.member_profiles where id = new.contributor_member_id
    );
  else
    new.contributor_id_snapshot := old.contributor_id_snapshot;
    new.contributor_name_snapshot := old.contributor_name_snapshot;
  end if;
  return new;
end;
$$;

create or replace function private.guard_domain_relation_identity()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_table_name = 'member_guestbook_entries' and (
    new.id is distinct from old.id
    or new.owner_member_id is distinct from old.owner_member_id
    or new.author_member_id is distinct from old.author_member_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Member guestbook identity is immutable' using errcode = '42501';
  elsif tg_table_name = 'celeb_guestbook_entries' and (
    new.id is distinct from old.id
    or new.celeb_id is distinct from old.celeb_id
    or new.author_member_id is distinct from old.author_member_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Celeb guestbook identity is immutable' using errcode = '42501';
  elsif tg_table_name = 'member_notifications' and (
    new.id is distinct from old.id
    or new.member_id is distinct from old.member_id
    or new.actor_member_id is distinct from old.actor_member_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Notification identity is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.update_domain_content_counts()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  old_owner_id uuid;
  new_owner_id uuid;
  old_work_id text;
  new_work_id text;
begin
  if tg_table_name = 'member_contents' then
    old_owner_id := case when tg_op = 'INSERT' then null else old.member_id end;
    new_owner_id := case when tg_op = 'DELETE' then null else new.member_id end;
    old_work_id := case when tg_op = 'INSERT' then null else old.content_id end;
    new_work_id := case when tg_op = 'DELETE' then null else new.content_id end;

    update public.member_social_stats
    set content_count = (
          select count(*)::integer from public.member_contents where member_id = old_owner_id
        ),
        updated_at = now()
    where member_id = old_owner_id;
    update public.member_social_stats
    set content_count = (
          select count(*)::integer from public.member_contents where member_id = new_owner_id
        ),
        updated_at = now()
    where member_id = new_owner_id
      and new_owner_id is distinct from old_owner_id;
  else
    old_owner_id := case when tg_op = 'INSERT' then null else old.celeb_id end;
    new_owner_id := case when tg_op = 'DELETE' then null else new.celeb_id end;
    old_work_id := case when tg_op = 'INSERT' then null else old.content_id end;
    new_work_id := case when tg_op = 'DELETE' then null else new.content_id end;

    update public.celeb_metrics
    set content_count = (
          select count(*)::integer from public.celeb_contents where celeb_id = old_owner_id
        ),
        updated_at = now()
    where celeb_id = old_owner_id;
    update public.celeb_metrics
    set content_count = (
          select count(*)::integer from public.celeb_contents where celeb_id = new_owner_id
        ),
        updated_at = now()
    where celeb_id = new_owner_id
      and new_owner_id is distinct from old_owner_id;
  end if;

  update public.contents
  set member_count = (select count(*)::integer from public.member_contents where content_id = old_work_id),
      celeb_count = (select count(*)::integer from public.celeb_contents where content_id = old_work_id),
      record_count = (
        (select count(*) from public.member_contents where content_id = old_work_id)
        + (select count(*) from public.celeb_contents where content_id = old_work_id)
      )::integer
  where id = old_work_id;

  update public.contents
  set member_count = (select count(*)::integer from public.member_contents where content_id = new_work_id),
      celeb_count = (select count(*)::integer from public.celeb_contents where content_id = new_work_id),
      record_count = (
        (select count(*) from public.member_contents where content_id = new_work_id)
        + (select count(*) from public.celeb_contents where content_id = new_work_id)
      )::integer
  where id = new_work_id
    and new_work_id is distinct from old_work_id;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.on_member_content_add()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if to_regclass('public.user_contents') is not null then
    return new;
  end if;

  insert into public.member_scores(member_id)
  values (new.member_id)
  on conflict (member_id) do nothing;

  insert into public.member_score_logs(member_id, type, action, amount, reference_id)
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
  if to_regclass('public.user_contents') is not null then
    return new;
  end if;

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

create or replace function private.update_member_influence(target_member_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog
as $$
  update public.member_social_stats as stats
  set influence = coalesce(stats.friend_count, 0) * 10
      + coalesce(stats.follower_count, 0) * 5
      + coalesce((
          select score.total_score
          from public.member_scores as score
          where score.member_id = target_member_id
        ), 0),
      updated_at = now()
  where stats.member_id = target_member_id;
$$;

create or replace function private.sync_member_member_follow()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  follower_id uuid := case when tg_op = 'DELETE' then old.follower_member_id else new.follower_member_id end;
  followed_id uuid := case when tg_op = 'DELETE' then old.followed_member_id else new.followed_member_id end;
begin
  if to_regclass('public.follows') is not null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  update public.member_social_stats
  set follower_count = (select count(*)::integer from public.member_member_follows where followed_member_id = followed_id),
      updated_at = now()
  where member_id = followed_id;

  update public.member_social_stats
  set following_count = (
        (select count(*) from public.member_member_follows where follower_member_id = follower_id)
        + (select count(*) from public.member_celeb_follows where member_id = follower_id)
      )::integer,
      friend_count = (
        select count(*)::integer
        from public.member_member_follows as outgoing
        where outgoing.follower_member_id = follower_id
          and exists (
            select 1 from public.member_member_follows as incoming
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
            select 1 from public.member_member_follows as incoming
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
  if to_regclass('public.follows') is not null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  update public.member_social_stats
  set following_count = (
        (select count(*) from public.member_member_follows where follower_member_id = follower_id)
        + (select count(*) from public.member_celeb_follows where member_id = follower_id)
      )::integer,
      updated_at = now()
  where member_id = follower_id;

  update public.celeb_metrics
  set follower_count = (select count(*)::integer from public.member_celeb_follows where celeb_id = followed_id),
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
  if to_regclass('public.user_scores') is not null then
    return new;
  end if;

  perform private.update_member_influence(new.member_id);
  return new;
end;
$$;

create or replace function private.initialize_profile_domain_rows()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_table_name = 'member_profiles' then
    insert into public.member_social_stats(member_id) values (new.id)
    on conflict (member_id) do nothing;
    insert into public.member_scores(member_id) values (new.id)
    on conflict (member_id) do nothing;
  else
    insert into public.celeb_metrics(celeb_id) values (new.id)
    on conflict (celeb_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger zz_member_profiles_initialize_domain_rows
after insert on public.member_profiles
for each row execute function private.initialize_profile_domain_rows();

create trigger zz_celebs_initialize_domain_rows
after insert on public.celebs
for each row execute function private.initialize_profile_domain_rows();

create trigger member_contents_guard_identity
before update on public.member_contents
for each row execute function private.guard_member_content_identity();

create trigger celeb_contents_guard_identity
before update on public.celeb_contents
for each row execute function private.guard_celeb_content_identity();

create trigger celeb_contents_require_source
before insert or update of source_url on public.celeb_contents
for each row execute function private.require_celeb_content_source();

create trigger member_contents_set_contributor_snapshot
before insert or update of contributor_member_id, contributor_id_snapshot, contributor_name_snapshot
on public.member_contents
for each row execute function private.set_content_contributor_snapshot();

create trigger celeb_contents_set_contributor_snapshot
before insert or update of contributor_member_id, contributor_id_snapshot, contributor_name_snapshot
on public.celeb_contents
for each row execute function private.set_content_contributor_snapshot();

create trigger member_guestbook_guard_identity
before update on public.member_guestbook_entries
for each row execute function private.guard_domain_relation_identity();

create trigger celeb_guestbook_guard_identity
before update on public.celeb_guestbook_entries
for each row execute function private.guard_domain_relation_identity();

create trigger member_notifications_guard_identity
before update on public.member_notifications
for each row execute function private.guard_domain_relation_identity();

create trigger member_contents_update_counts
after insert or update of status, content_id or delete on public.member_contents
for each row execute function private.update_domain_content_counts();

create trigger celeb_contents_update_counts
after insert or update of status, content_id or delete on public.celeb_contents
for each row execute function private.update_domain_content_counts();

create trigger member_contents_add_score
after insert on public.member_contents
for each row execute function private.on_member_content_add();

create trigger celeb_contents_update_celeb
after insert on public.celeb_contents
for each row execute function private.on_celeb_content_add();

create trigger member_member_follows_sync
after insert or delete on public.member_member_follows
for each row execute function private.sync_member_member_follow();

create trigger member_celeb_follows_sync
after insert or delete on public.member_celeb_follows
for each row execute function private.sync_member_celeb_follow();

create trigger member_scores_update_influence
after update on public.member_scores
for each row execute function private.on_member_score_change();

alter table public.member_contents enable row level security;
alter table public.celeb_contents enable row level security;
alter table public.member_member_follows enable row level security;
alter table public.member_celeb_follows enable row level security;
alter table public.member_guestbook_entries enable row level security;
alter table public.celeb_guestbook_entries enable row level security;
alter table public.member_social_stats enable row level security;
alter table public.celeb_metrics enable row level security;
alter table public.member_scores enable row level security;
alter table public.member_score_logs enable row level security;
alter table public.member_notifications enable row level security;

create policy member_contents_select_visible
on public.member_contents for select to anon, authenticated
using (
  public.is_admin()
  or member_id = (select auth.uid())
  or visibility = 'public'::public.visibility_type
  or (
    visibility = 'followers'::public.visibility_type
    and exists (
      select 1 from public.member_member_follows
      where follower_member_id = (select auth.uid())
        and followed_member_id = member_contents.member_id
    )
  )
);

create policy member_contents_insert_owner
on public.member_contents for insert to authenticated
with check (
  public.is_admin()
  or (
    public.is_current_account_active()
    and member_id = (select auth.uid())
    and contributor_member_id is null
  )
);

create policy member_contents_update_owner
on public.member_contents for update to authenticated
using (public.is_admin() or (public.is_current_account_active() and member_id = (select auth.uid())))
with check (public.is_admin() or (public.is_current_account_active() and member_id = (select auth.uid())));

create policy member_contents_delete_owner
on public.member_contents for delete to authenticated
using (public.is_admin() or (public.is_current_account_active() and member_id = (select auth.uid())));

create policy celeb_contents_select_published
on public.celeb_contents for select to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.celebs
    where id = celeb_contents.celeb_id
      and publication_status = 'active'
  )
);

create policy celeb_contents_insert_contributor
on public.celeb_contents for insert to authenticated
with check (public.is_admin());

create policy celeb_contents_update_contributor
on public.celeb_contents for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy celeb_contents_delete_contributor
on public.celeb_contents for delete to authenticated
using (public.is_admin());

create policy member_member_follows_select
on public.member_member_follows for select to anon, authenticated using (true);
create policy member_member_follows_insert
on public.member_member_follows for insert to authenticated
with check (public.is_current_account_active() and follower_member_id = (select auth.uid()));
create policy member_member_follows_delete
on public.member_member_follows for delete to authenticated
using (public.is_current_account_active() and follower_member_id = (select auth.uid()));

create policy member_celeb_follows_select
on public.member_celeb_follows for select to anon, authenticated using (true);
create policy member_celeb_follows_insert
on public.member_celeb_follows for insert to authenticated
with check (public.is_current_account_active() and member_id = (select auth.uid()));
create policy member_celeb_follows_delete
on public.member_celeb_follows for delete to authenticated
using (public.is_current_account_active() and member_id = (select auth.uid()));

create policy member_guestbook_select
on public.member_guestbook_entries for select to anon, authenticated
using (not coalesce(is_private, false) or owner_member_id = (select auth.uid()) or author_member_id = (select auth.uid()));
create policy member_guestbook_insert
on public.member_guestbook_entries for insert to authenticated
with check (
  public.is_current_account_active()
  and author_member_id = (select auth.uid())
  and not exists (
    select 1 from public.blocks
    where blocker_id = member_guestbook_entries.owner_member_id
      and blocked_id = (select auth.uid())
  )
);
create policy member_guestbook_update
on public.member_guestbook_entries for update to authenticated
using (owner_member_id = (select auth.uid()) or author_member_id = (select auth.uid()))
with check (owner_member_id = (select auth.uid()) or author_member_id = (select auth.uid()));
create policy member_guestbook_delete
on public.member_guestbook_entries for delete to authenticated
using (owner_member_id = (select auth.uid()) or author_member_id = (select auth.uid()));

create policy celeb_guestbook_select
on public.celeb_guestbook_entries for select to anon, authenticated
using (
  public.is_admin()
  or author_member_id = (select auth.uid())
  or (
    not coalesce(is_private, false)
    and exists (
      select 1 from public.celebs
      where id = celeb_guestbook_entries.celeb_id
        and publication_status = 'active'
    )
  )
);
create policy celeb_guestbook_insert
on public.celeb_guestbook_entries for insert to authenticated
with check (public.is_current_account_active() and author_member_id = (select auth.uid()));
create policy celeb_guestbook_update
on public.celeb_guestbook_entries for update to authenticated
using (public.is_admin() or author_member_id = (select auth.uid()))
with check (public.is_admin() or author_member_id = (select auth.uid()));
create policy celeb_guestbook_delete
on public.celeb_guestbook_entries for delete to authenticated
using (public.is_admin() or author_member_id = (select auth.uid()));

create policy member_social_stats_select
on public.member_social_stats for select to anon, authenticated using (true);

create policy celeb_metrics_select
on public.celeb_metrics for select to anon, authenticated
using (
  exists (
    select 1 from public.celebs
    where id = celeb_metrics.celeb_id and publication_status = 'active'
  )
  or public.is_admin()
);

create policy member_scores_select
on public.member_scores for select to anon, authenticated using (true);

create policy member_score_logs_select
on public.member_score_logs for select to authenticated
using (member_id = (select auth.uid()) or public.is_admin());

create policy member_notifications_select
on public.member_notifications for select to authenticated
using (member_id = (select auth.uid()) or public.is_admin());

create policy member_notifications_update
on public.member_notifications for update to authenticated
using (member_id = (select auth.uid()) or public.is_admin())
with check (member_id = (select auth.uid()) or public.is_admin());

create policy member_notifications_delete
on public.member_notifications for delete to authenticated
using (member_id = (select auth.uid()) or public.is_admin());

revoke all on table
  public.member_contents,
  public.celeb_contents,
  public.member_member_follows,
  public.member_celeb_follows,
  public.member_guestbook_entries,
  public.celeb_guestbook_entries,
  public.member_social_stats,
  public.celeb_metrics,
  public.member_scores,
  public.member_score_logs,
  public.member_notifications
from public, anon, authenticated, service_role;

grant select on table
  public.member_contents,
  public.celeb_contents,
  public.member_member_follows,
  public.member_celeb_follows,
  public.member_guestbook_entries,
  public.celeb_guestbook_entries,
  public.member_social_stats,
  public.celeb_metrics,
  public.member_scores,
  public.member_notifications
to anon, authenticated, service_role;

revoke select on table public.member_notifications from anon;

grant insert, update, delete on table
  public.member_contents,
  public.celeb_contents,
  public.member_member_follows,
  public.member_celeb_follows,
  public.member_guestbook_entries,
  public.celeb_guestbook_entries
to authenticated, service_role;

grant all on table public.member_score_logs to service_role;
grant all on table public.celeb_metrics to service_role;
grant all on table public.member_social_stats, public.member_scores to service_role;
grant update (is_read), delete on table public.member_notifications to authenticated;
grant all on table public.member_notifications to service_role;

revoke all on table
  private.celeb_score_archive,
  private.celeb_score_log_archive,
  private.celeb_notification_archive
from public, anon, authenticated, service_role;

revoke all on function
  private.sync_content_recommendation_ids(),
  private.sync_legacy_profile_domain_row(),
  private.sync_new_profile_domain_row(),
  private.guard_member_content_identity(),
  private.guard_celeb_content_identity(),
  private.require_celeb_content_source(),
  private.set_content_contributor_snapshot(),
  private.guard_domain_relation_identity(),
  private.update_domain_content_counts(),
  private.on_member_content_add(),
  private.on_celeb_content_add(),
  private.update_member_influence(uuid),
  private.sync_member_member_follow(),
  private.sync_member_celeb_follow(),
  private.on_member_score_change(),
  private.initialize_profile_domain_rows()
from public, anon, authenticated, service_role;

commit;
