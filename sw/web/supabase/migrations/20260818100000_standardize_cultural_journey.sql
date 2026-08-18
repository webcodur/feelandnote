begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- cultural_journey was previously a generated read alias for the legacy
-- consumption_philosophy columns. Make the domain name writable first so the
-- application no longer depends on the legacy storage name.
alter table public.celebs
  drop column if exists cultural_journey,
  drop column if exists cultural_journey_en;

alter table public.celebs
  add column cultural_journey text,
  add column cultural_journey_en text;

update public.celebs
set cultural_journey = consumption_philosophy,
    cultural_journey_en = consumption_philosophy_en;

comment on column public.celebs.cultural_journey is
  '인물의 감상여정. consumption_philosophy에서 이관된 정식 저장 컬럼.';
comment on column public.celebs.cultural_journey_en is
  '영문 감상여정. consumption_philosophy_en에서 이관된 정식 저장 컬럼.';
comment on column public.celebs.consumption_philosophy is
  '레거시 호환 컬럼. 신규 코드에서 읽거나 쓰지 않는다.';
comment on column public.celebs.consumption_philosophy_en is
  '레거시 호환 컬럼. 신규 코드에서 읽거나 쓰지 않는다.';

create or replace function public.sync_cultural_journey_legacy_columns()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.cultural_journey := coalesce(new.cultural_journey, new.consumption_philosophy);
    new.cultural_journey_en := coalesce(new.cultural_journey_en, new.consumption_philosophy_en);
  elsif new.cultural_journey is distinct from old.cultural_journey
     or new.cultural_journey_en is distinct from old.cultural_journey_en then
    new.consumption_philosophy := new.cultural_journey;
    new.consumption_philosophy_en := new.cultural_journey_en;
  elsif new.consumption_philosophy is distinct from old.consumption_philosophy
     or new.consumption_philosophy_en is distinct from old.consumption_philosophy_en then
    new.cultural_journey := new.consumption_philosophy;
    new.cultural_journey_en := new.consumption_philosophy_en;
  end if;

  new.consumption_philosophy := new.cultural_journey;
  new.consumption_philosophy_en := new.cultural_journey_en;
  return new;
end;
$$;

drop trigger if exists sync_cultural_journey_legacy_columns on public.celebs;
create trigger sync_cultural_journey_legacy_columns
before insert or update of cultural_journey, cultural_journey_en,
  consumption_philosophy, consumption_philosophy_en on public.celebs
for each row execute function public.sync_cultural_journey_legacy_columns();

-- Keep the existing filtering and ranking implementation, but expose the
-- canonical field names to every current caller.
alter function public.get_celebs_sorted(
  text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[]
) rename to get_celebs_sorted_legacy;

create function public.get_celebs_sorted(
  p_profession text default null,
  p_nationality text default null,
  p_content_type text default null,
  p_sort_by text default 'composite',
  p_search text default '',
  p_limit integer default 20,
  p_offset integer default 0,
  p_tag_id uuid default null,
  p_min_content_count integer default 0,
  p_gender text default null,
  p_include_inactive boolean default false,
  p_celeb_tiers text[] default null
)
returns table(
  id uuid, slug text, nickname text, nickname_en text, avatar_url text,
  portrait_url text, profession text, title text, title_en text,
  cultural_journey text, cultural_journey_en text, nationality text,
  birth_date text, death_date text, bio text, bio_en text, is_verified boolean,
  claimed_by_member_id uuid, follower_count bigint, total_score integer,
  content_count bigint, created_at timestamptz, publication_status text,
  celeb_tier text, gender boolean
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select id, slug, nickname, nickname_en, avatar_url, portrait_url,
    profession, title, title_en, consumption_philosophy,
    consumption_philosophy_en, nationality, birth_date, death_date, bio,
    bio_en, is_verified, claimed_by_member_id, follower_count, total_score,
    content_count, created_at, publication_status, celeb_tier, gender
  from public.get_celebs_sorted_legacy(
    p_profession, p_nationality, p_content_type, p_sort_by, p_search,
    p_limit, p_offset, p_tag_id, p_min_content_count, p_gender,
    p_include_inactive, p_celeb_tiers
  );
$$;

alter function public.get_celebs_trending(integer, integer)
  rename to get_celebs_trending_legacy;

create function public.get_celebs_trending(
  p_days integer default 30,
  p_limit integer default 12
)
returns table(
  id uuid, slug text, nickname text, nickname_en text, avatar_url text,
  portrait_url text, profession text, title text, title_en text,
  cultural_journey text, cultural_journey_en text, nationality text,
  birth_date text, death_date text, bio text, bio_en text, is_verified boolean,
  claimed_by_member_id uuid, follower_count bigint, total_score integer,
  content_count bigint, created_at timestamptz, publication_status text,
  celeb_tier text, gender boolean, recent_views bigint, view_count integer,
  window_start date, window_end date
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select id, slug, nickname, nickname_en, avatar_url, portrait_url,
    profession, title, title_en, consumption_philosophy,
    consumption_philosophy_en, nationality, birth_date, death_date, bio,
    bio_en, is_verified, claimed_by_member_id, follower_count, total_score,
    content_count, created_at, publication_status, celeb_tier, gender,
    recent_views, view_count, window_start, window_end
  from public.get_celebs_trending_legacy(p_days, p_limit);
$$;

commit;
