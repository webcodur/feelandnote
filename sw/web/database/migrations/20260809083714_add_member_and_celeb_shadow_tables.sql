begin;

alter table public.user_accounts
  add constraint user_accounts_auth_user_id_fkey
  foreign key (id)
  references auth.users(id)
  on delete restrict
  not valid;

alter table public.user_accounts
  validate constraint user_accounts_auth_user_id_fkey;

create table public.member_profiles (
  id uuid primary key
    references public.user_accounts(id) on delete cascade,
  nickname text not null,
  avatar_url text,
  bio text,
  birth_date text,
  nationality text,
  is_verified boolean not null default false,
  selected_title text,
  showcase_titles text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz
);

create table public.celebs (
  like public.profiles
    including defaults
    including generated
    including storage
    including comments
);

alter table public.celebs
  drop column profile_type,
  drop column selected_title,
  drop column showcase_titles;

alter table public.celebs
  rename column status to publication_status;

alter table public.celebs
  rename column claimed_by to claimed_by_member_id;

alter table public.celebs
  add constraint celebs_pkey primary key (id),
  add constraint celebs_claimed_by_member_id_fkey
    foreign key (claimed_by_member_id)
    references public.user_accounts(id)
    on delete set null,
  add constraint celebs_publication_status_check
    check (publication_status = any (array['active', 'inactive', 'suspended', 'deleted']::text[])),
  add constraint celebs_profession_check
    check (
      profession is null
      or profession = any (
        array[
          'leader',
          'politician',
          'commander',
          'entrepreneur',
          'investor',
          'humanities_scholar',
          'social_scientist',
          'scientist',
          'director',
          'musician',
          'visual_artist',
          'author',
          'actor',
          'influencer',
          'athlete',
          'other'
        ]::text[]
      )
    ),
  add constraint celebs_content_research_status_check
    check (content_research_status = any (array['open', 'researching', 'confirmed_empty']::text[])),
  add constraint celebs_speech_tone_check
    check (
      speech_tone is null
      or speech_tone = any (array['loyal', 'composed', 'bold', 'humble', 'gentle', 'free']::text[])
    );

create unique index celebs_slug_idx
  on public.celebs (slug)
  where slug is not null;

create index celebs_claimed_by_member_id_idx
  on public.celebs (claimed_by_member_id)
  where claimed_by_member_id is not null;

create index celebs_gender_idx
  on public.celebs (gender)
  where gender is not null;

create index celebs_publication_status_idx
  on public.celebs (publication_status);

create index celebs_content_research_queue_idx
  on public.celebs (content_research_status, publication_status, celeb_tier, id);

alter table public.member_profiles enable row level security;
alter table public.celebs enable row level security;

revoke all on table public.member_profiles, public.celebs
from public, anon, authenticated, service_role;

grant select on table public.member_profiles, public.celebs
to anon, authenticated, service_role;

create policy member_profiles_select_visible
on public.member_profiles
for select
to anon, authenticated
using (
  id = (select auth.uid())
  or public.is_admin()
  or exists (
    select 1
    from public.user_accounts as account
    where account.id = member_profiles.id
      and account.account_status = 'active'
  )
);

create policy celebs_select_published
on public.celebs
for select
to anon, authenticated
using (
  publication_status = 'active'
  or public.is_admin()
);

create or replace function private.sync_profile_split()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.member_profiles where id = old.id;
    delete from public.celebs where id = old.id;
    return old;
  end if;

  if new.profile_type = 'USER' then
    if exists (
      select 1
      from public.user_accounts as account
      where account.id = new.id
    ) then
      insert into public.member_profiles (
        id,
        nickname,
        avatar_url,
        bio,
        birth_date,
        nationality,
        is_verified,
        selected_title,
        showcase_titles,
        created_at,
        updated_at
      )
      values (
        new.id,
        new.nickname,
        new.avatar_url,
        new.bio,
        new.birth_date,
        new.nationality,
        coalesce(new.is_verified, false),
        new.selected_title,
        coalesce(new.showcase_titles, '{}'::text[]),
        new.created_at,
        new.updated_at
      )
      on conflict (id) do update set
        nickname = excluded.nickname,
        avatar_url = excluded.avatar_url,
        bio = excluded.bio,
        birth_date = excluded.birth_date,
        nationality = excluded.nationality,
        is_verified = excluded.is_verified,
        selected_title = excluded.selected_title,
        showcase_titles = excluded.showcase_titles,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at;
    end if;

    delete from public.celebs where id = new.id;
    return new;
  end if;

  if new.profile_type = 'CELEB' then
    insert into public.celebs (
      id,
      nickname,
      avatar_url,
      created_at,
      publication_status,
      claimed_by_member_id,
      is_verified,
      bio,
      profession,
      portrait_url,
      nationality,
      birth_date,
      death_date,
      title,
      consumption_philosophy,
      gender,
      nickname_en,
      slug_suffix,
      speech_tone,
      title_en,
      bio_en,
      consumption_philosophy_en,
      celeb_tier,
      has_voice,
      voice_id_ko,
      voice_id_en,
      voice_v,
      wikidata_qid,
      voice_speed,
      youtube_videos,
      virtual_monologue,
      virtual_monologue_en,
      view_count,
      content_research_status,
      content_research_updated_at,
      content_research_confirmed_empty_at,
      portrait_caption,
      portrait_caption_en,
      virtual_monologue_locked_at,
      updated_at
    )
    values (
      new.id,
      new.nickname,
      new.avatar_url,
      new.created_at,
      new.status,
      new.claimed_by,
      new.is_verified,
      new.bio,
      new.profession,
      new.portrait_url,
      new.nationality,
      new.birth_date,
      new.death_date,
      new.title,
      new.consumption_philosophy,
      new.gender,
      new.nickname_en,
      new.slug_suffix,
      new.speech_tone,
      new.title_en,
      new.bio_en,
      new.consumption_philosophy_en,
      new.celeb_tier,
      new.has_voice,
      new.voice_id_ko,
      new.voice_id_en,
      new.voice_v,
      new.wikidata_qid,
      new.voice_speed,
      new.youtube_videos,
      new.virtual_monologue,
      new.virtual_monologue_en,
      new.view_count,
      new.content_research_status,
      new.content_research_updated_at,
      new.content_research_confirmed_empty_at,
      new.portrait_caption,
      new.portrait_caption_en,
      new.virtual_monologue_locked_at,
      new.updated_at
    )
    on conflict (id) do update set
      nickname = excluded.nickname,
      avatar_url = excluded.avatar_url,
      created_at = excluded.created_at,
      publication_status = excluded.publication_status,
      claimed_by_member_id = excluded.claimed_by_member_id,
      is_verified = excluded.is_verified,
      bio = excluded.bio,
      profession = excluded.profession,
      portrait_url = excluded.portrait_url,
      nationality = excluded.nationality,
      birth_date = excluded.birth_date,
      death_date = excluded.death_date,
      title = excluded.title,
      consumption_philosophy = excluded.consumption_philosophy,
      gender = excluded.gender,
      nickname_en = excluded.nickname_en,
      slug_suffix = excluded.slug_suffix,
      speech_tone = excluded.speech_tone,
      title_en = excluded.title_en,
      bio_en = excluded.bio_en,
      consumption_philosophy_en = excluded.consumption_philosophy_en,
      celeb_tier = excluded.celeb_tier,
      has_voice = excluded.has_voice,
      voice_id_ko = excluded.voice_id_ko,
      voice_id_en = excluded.voice_id_en,
      voice_v = excluded.voice_v,
      wikidata_qid = excluded.wikidata_qid,
      voice_speed = excluded.voice_speed,
      youtube_videos = excluded.youtube_videos,
      virtual_monologue = excluded.virtual_monologue,
      virtual_monologue_en = excluded.virtual_monologue_en,
      view_count = excluded.view_count,
      content_research_status = excluded.content_research_status,
      content_research_updated_at = excluded.content_research_updated_at,
      content_research_confirmed_empty_at = excluded.content_research_confirmed_empty_at,
      portrait_caption = excluded.portrait_caption,
      portrait_caption_en = excluded.portrait_caption_en,
      virtual_monologue_locked_at = excluded.virtual_monologue_locked_at,
      updated_at = excluded.updated_at;

    delete from public.member_profiles where id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_profile_split()
from public, anon, authenticated, service_role;

create or replace function private.sync_member_profile_from_account()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.member_profiles (
    id,
    nickname,
    avatar_url,
    bio,
    birth_date,
    nationality,
    is_verified,
    selected_title,
    showcase_titles,
    created_at,
    updated_at
  )
  select
    profile.id,
    profile.nickname,
    profile.avatar_url,
    profile.bio,
    profile.birth_date,
    profile.nationality,
    coalesce(profile.is_verified, false),
    profile.selected_title,
    coalesce(profile.showcase_titles, '{}'::text[]),
    profile.created_at,
    profile.updated_at
  from public.profiles as profile
  where profile.id = new.id
    and profile.profile_type = 'USER'
  on conflict (id) do update set
    nickname = excluded.nickname,
    avatar_url = excluded.avatar_url,
    bio = excluded.bio,
    birth_date = excluded.birth_date,
    nationality = excluded.nationality,
    is_verified = excluded.is_verified,
    selected_title = excluded.selected_title,
    showcase_titles = excluded.showcase_titles,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

revoke all on function private.sync_member_profile_from_account()
from public, anon, authenticated, service_role;

create trigger trg_profiles_sync_profile_split
after insert or update or delete on public.profiles
for each row execute function private.sync_profile_split();

create trigger trg_user_accounts_sync_member_profile
after insert or update on public.user_accounts
for each row execute function private.sync_member_profile_from_account();

insert into public.member_profiles (
  id,
  nickname,
  avatar_url,
  bio,
  birth_date,
  nationality,
  is_verified,
  selected_title,
  showcase_titles,
  created_at,
  updated_at
)
select
  profile.id,
  profile.nickname,
  profile.avatar_url,
  profile.bio,
  profile.birth_date,
  profile.nationality,
  coalesce(profile.is_verified, false),
  profile.selected_title,
  coalesce(profile.showcase_titles, '{}'::text[]),
  profile.created_at,
  profile.updated_at
from public.profiles as profile
join public.user_accounts as account on account.id = profile.id
where profile.profile_type = 'USER'
on conflict (id) do update set
  nickname = excluded.nickname,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio,
  birth_date = excluded.birth_date,
  nationality = excluded.nationality,
  is_verified = excluded.is_verified,
  selected_title = excluded.selected_title,
  showcase_titles = excluded.showcase_titles,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into public.celebs (
  id,
  nickname,
  avatar_url,
  created_at,
  publication_status,
  claimed_by_member_id,
  is_verified,
  bio,
  profession,
  portrait_url,
  nationality,
  birth_date,
  death_date,
  title,
  consumption_philosophy,
  gender,
  nickname_en,
  slug_suffix,
  speech_tone,
  title_en,
  bio_en,
  consumption_philosophy_en,
  celeb_tier,
  has_voice,
  voice_id_ko,
  voice_id_en,
  voice_v,
  wikidata_qid,
  voice_speed,
  youtube_videos,
  virtual_monologue,
  virtual_monologue_en,
  view_count,
  content_research_status,
  content_research_updated_at,
  content_research_confirmed_empty_at,
  portrait_caption,
  portrait_caption_en,
  virtual_monologue_locked_at,
  updated_at
)
select
  profile.id,
  profile.nickname,
  profile.avatar_url,
  profile.created_at,
  profile.status,
  profile.claimed_by,
  profile.is_verified,
  profile.bio,
  profile.profession,
  profile.portrait_url,
  profile.nationality,
  profile.birth_date,
  profile.death_date,
  profile.title,
  profile.consumption_philosophy,
  profile.gender,
  profile.nickname_en,
  profile.slug_suffix,
  profile.speech_tone,
  profile.title_en,
  profile.bio_en,
  profile.consumption_philosophy_en,
  profile.celeb_tier,
  profile.has_voice,
  profile.voice_id_ko,
  profile.voice_id_en,
  profile.voice_v,
  profile.wikidata_qid,
  profile.voice_speed,
  profile.youtube_videos,
  profile.virtual_monologue,
  profile.virtual_monologue_en,
  profile.view_count,
  profile.content_research_status,
  profile.content_research_updated_at,
  profile.content_research_confirmed_empty_at,
  profile.portrait_caption,
  profile.portrait_caption_en,
  profile.virtual_monologue_locked_at,
  profile.updated_at
from public.profiles as profile
where profile.profile_type = 'CELEB'
on conflict (id) do update set
  nickname = excluded.nickname,
  avatar_url = excluded.avatar_url,
  created_at = excluded.created_at,
  publication_status = excluded.publication_status,
  claimed_by_member_id = excluded.claimed_by_member_id,
  is_verified = excluded.is_verified,
  bio = excluded.bio,
  profession = excluded.profession,
  portrait_url = excluded.portrait_url,
  nationality = excluded.nationality,
  birth_date = excluded.birth_date,
  death_date = excluded.death_date,
  title = excluded.title,
  consumption_philosophy = excluded.consumption_philosophy,
  gender = excluded.gender,
  nickname_en = excluded.nickname_en,
  slug_suffix = excluded.slug_suffix,
  speech_tone = excluded.speech_tone,
  title_en = excluded.title_en,
  bio_en = excluded.bio_en,
  consumption_philosophy_en = excluded.consumption_philosophy_en,
  celeb_tier = excluded.celeb_tier,
  has_voice = excluded.has_voice,
  voice_id_ko = excluded.voice_id_ko,
  voice_id_en = excluded.voice_id_en,
  voice_v = excluded.voice_v,
  wikidata_qid = excluded.wikidata_qid,
  voice_speed = excluded.voice_speed,
  youtube_videos = excluded.youtube_videos,
  virtual_monologue = excluded.virtual_monologue,
  virtual_monologue_en = excluded.virtual_monologue_en,
  view_count = excluded.view_count,
  content_research_status = excluded.content_research_status,
  content_research_updated_at = excluded.content_research_updated_at,
  content_research_confirmed_empty_at = excluded.content_research_confirmed_empty_at,
  portrait_caption = excluded.portrait_caption,
  portrait_caption_en = excluded.portrait_caption_en,
  virtual_monologue_locked_at = excluded.virtual_monologue_locked_at,
  updated_at = excluded.updated_at;

alter table public.celebs
  alter column nickname set not null,
  alter column publication_status set not null,
  alter column celeb_tier set not null;

analyze public.member_profiles;
analyze public.celebs;

do $$
begin
  if (
    select count(*)
    from public.member_profiles
  ) <> (
    select count(*)
    from public.profiles as profile
    join public.user_accounts as account on account.id = profile.id
    where profile.profile_type = 'USER'
  ) then
    raise exception 'member profile count mismatch';
  end if;

  if (
    select count(*)
    from public.celebs
  ) <> (
    select count(*)
    from public.profiles
    where profile_type = 'CELEB'
  ) then
    raise exception 'celeb count mismatch';
  end if;

  if exists (
    select 1
    from public.profiles as profile
    join public.member_profiles as member on member.id = profile.id
    where profile.profile_type <> 'USER'
      or row(
        profile.id,
        profile.nickname,
        profile.avatar_url,
        profile.bio,
        profile.birth_date,
        profile.nationality,
        coalesce(profile.is_verified, false),
        profile.selected_title,
        coalesce(profile.showcase_titles, '{}'::text[]),
        profile.created_at,
        profile.updated_at
      ) is distinct from row(
        member.id,
        member.nickname,
        member.avatar_url,
        member.bio,
        member.birth_date,
        member.nationality,
        member.is_verified,
        member.selected_title,
        member.showcase_titles,
        member.created_at,
        member.updated_at
      )
  ) then
    raise exception 'member profile field mismatch';
  end if;

  if exists (
    select 1
    from public.profiles as profile
    join public.celebs as celeb on celeb.id = profile.id
    where profile.profile_type <> 'CELEB'
      or row(
        profile.nickname,
        profile.avatar_url,
        profile.created_at,
        profile.status,
        profile.claimed_by,
        profile.is_verified,
        profile.bio,
        profile.profession,
        profile.portrait_url,
        profile.nationality,
        profile.birth_date,
        profile.death_date,
        profile.title,
        profile.consumption_philosophy,
        profile.gender,
        profile.nickname_en,
        profile.slug_suffix,
        profile.slug,
        profile.speech_tone,
        profile.title_en,
        profile.bio_en,
        profile.consumption_philosophy_en,
        profile.celeb_tier,
        profile.has_voice,
        profile.voice_id_ko,
        profile.voice_id_en,
        profile.voice_v,
        profile.wikidata_qid,
        profile.cultural_journey,
        profile.cultural_journey_en,
        profile.voice_speed,
        profile.youtube_videos,
        profile.virtual_monologue,
        profile.virtual_monologue_en,
        profile.view_count,
        profile.content_research_status,
        profile.content_research_updated_at,
        profile.content_research_confirmed_empty_at,
        profile.portrait_caption,
        profile.portrait_caption_en,
        profile.virtual_monologue_locked_at,
        profile.updated_at
      ) is distinct from row(
        celeb.nickname,
        celeb.avatar_url,
        celeb.created_at,
        celeb.publication_status,
        celeb.claimed_by_member_id,
        celeb.is_verified,
        celeb.bio,
        celeb.profession,
        celeb.portrait_url,
        celeb.nationality,
        celeb.birth_date,
        celeb.death_date,
        celeb.title,
        celeb.consumption_philosophy,
        celeb.gender,
        celeb.nickname_en,
        celeb.slug_suffix,
        celeb.slug,
        celeb.speech_tone,
        celeb.title_en,
        celeb.bio_en,
        celeb.consumption_philosophy_en,
        celeb.celeb_tier,
        celeb.has_voice,
        celeb.voice_id_ko,
        celeb.voice_id_en,
        celeb.voice_v,
        celeb.wikidata_qid,
        celeb.cultural_journey,
        celeb.cultural_journey_en,
        celeb.voice_speed,
        celeb.youtube_videos,
        celeb.virtual_monologue,
        celeb.virtual_monologue_en,
        celeb.view_count,
        celeb.content_research_status,
        celeb.content_research_updated_at,
        celeb.content_research_confirmed_empty_at,
        celeb.portrait_caption,
        celeb.portrait_caption_en,
        celeb.virtual_monologue_locked_at,
        celeb.updated_at
      )
  ) then
    raise exception 'celeb field mismatch';
  end if;

  if exists (
    select 1
    from public.member_profiles as member
    left join public.profiles as profile on profile.id = member.id
    where profile.id is null or profile.profile_type <> 'USER'
  ) then
    raise exception 'unexpected member shadow row';
  end if;

  if exists (
    select 1
    from public.celebs as celeb
    left join public.profiles as profile on profile.id = celeb.id
    where profile.id is null or profile.profile_type <> 'CELEB'
  ) then
    raise exception 'unexpected celeb shadow row';
  end if;
end;
$$;

commit;
