begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- Public read RPCs now start from the physical member/celeb domains.  Keep
-- the established PostgREST signatures, but do not let the compatibility
-- tables remain a hidden runtime dependency.

create or replace function public.get_review_celeb_ids()
returns table(celeb_id uuid)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select distinct content_row.celeb_id
  from public.celeb_contents as content_row
  where nullif(btrim(content_row.review), '') is not null;
$$;

create or replace function public.get_celeb_content_counts(
  p_content_ids text[]
)
returns table(content_id text, celeb_count bigint)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select content_row.content_id, count(*)::bigint as celeb_count
  from public.celeb_contents as content_row
  join public.celebs as celeb on celeb.id = content_row.celeb_id
  where content_row.content_id = any(p_content_ids)
    and celeb.publication_status = 'active'
    and content_row.status = 'FINISHED'
  group by content_row.content_id;
$$;

create or replace function public.get_user_content_counts(
  p_category text default null
)
returns table(content_id text, user_count bigint)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select content_row.content_id, count(*)::bigint as user_count
  from public.member_contents as content_row
  join public.contents as content on content.id = content_row.content_id
  where content_row.status = 'FINISHED'
    and (p_category is null or content.type = p_category)
  group by content_row.content_id;
$$;

create or replace function public.get_content_celeb_user_counts(
  p_content_ids text[]
)
returns table(content_id text, celeb_count bigint, user_count bigint)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  with requested_content as (
    select distinct unnest(coalesce(p_content_ids, '{}'::text[])) as content_id
  ),
  celeb_counts as (
    select content_row.content_id, count(*)::bigint as celeb_count
    from public.celeb_contents as content_row
    join public.celebs as celeb on celeb.id = content_row.celeb_id
    where content_row.content_id = any(coalesce(p_content_ids, '{}'::text[]))
      and content_row.status = 'FINISHED'
      and celeb.publication_status = 'active'
    group by content_row.content_id
  ),
  member_counts as (
    select content_row.content_id, count(*)::bigint as user_count
    from public.member_contents as content_row
    where content_row.content_id = any(coalesce(p_content_ids, '{}'::text[]))
      and content_row.status = 'FINISHED'
    group by content_row.content_id
  )
  select requested_content.content_id,
         coalesce(celeb_counts.celeb_count, 0)::bigint,
         coalesce(member_counts.user_count, 0)::bigint
  from requested_content
  left join celeb_counts using (content_id)
  left join member_counts using (content_id);
$$;

create or replace function public.count_celebs_filtered(
  p_profession text default null,
  p_nationality text default null,
  p_content_type text default null,
  p_search text default null,
  p_tag_id uuid default null,
  p_min_content_count integer default 0,
  p_gender text default null,
  p_include_inactive boolean default false,
  p_celeb_tiers text[] default null
)
returns bigint
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  result bigint;
  v_profession text := coalesce(nullif(p_profession, ''), 'all');
  v_nationality text := coalesce(nullif(p_nationality, ''), 'all');
  v_content_type text := coalesce(nullif(p_content_type, ''), 'all');
  v_search text := coalesce(p_search, '');
  v_gender text := coalesce(nullif(p_gender, ''), 'all');
  v_tiers text[] := nullif(p_celeb_tiers, '{}');
begin
  select count(*)
  into result
  from public.celebs as celeb
  left join public.celeb_metrics as metrics on metrics.celeb_id = celeb.id
  where (p_include_inactive or celeb.publication_status = 'active')
    and (v_profession = 'all' or celeb.profession = v_profession)
    and (v_nationality = 'all' or celeb.nationality = v_nationality)
    and (
      v_gender = 'all'
      or (v_gender = 'male' and celeb.gender = true)
      or (v_gender = 'female' and celeb.gender = false)
    )
    and (
      v_content_type = 'all'
      or exists (
        select 1
        from public.celeb_contents as content_row
        join public.contents as content on content.id = content_row.content_id
        where content_row.celeb_id = celeb.id
          and content.type = v_content_type
      )
    )
    and (
      v_search = ''
      or celeb.nickname ilike '%' || v_search || '%'
      or celeb.nickname_en ilike '%' || v_search || '%'
    )
    and (
      p_tag_id is null
      or exists (
        select 1
        from public.celeb_tag_assignments as assignment
        where assignment.celeb_id = celeb.id
          and assignment.tag_id = p_tag_id
      )
    )
    and (
      coalesce(p_min_content_count, 0) <= 0
      or coalesce(metrics.content_count, 0) >= p_min_content_count
    )
    and (v_tiers is null or coalesce(celeb.celeb_tier, 'full') = any(v_tiers));

  return result;
end;
$$;

-- Return-column names changed with the physical domain (`claimed_by_member_id`
-- and `publication_status`), so these two functions must be recreated rather
-- than replaced in-place.
drop function public.get_celebs_sorted(
  text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[]
);

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
  id uuid,
  slug text,
  nickname text,
  nickname_en text,
  avatar_url text,
  portrait_url text,
  profession text,
  title text,
  title_en text,
  consumption_philosophy text,
  consumption_philosophy_en text,
  nationality text,
  birth_date text,
  death_date text,
  bio text,
  bio_en text,
  is_verified boolean,
  claimed_by_member_id uuid,
  follower_count bigint,
  total_score integer,
  content_count bigint,
  created_at timestamptz,
  publication_status text,
  celeb_tier text,
  gender boolean
)
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  v_profession text := coalesce(nullif(p_profession, ''), 'all');
  v_nationality text := coalesce(nullif(p_nationality, ''), 'all');
  v_content_type text := coalesce(nullif(p_content_type, ''), 'all');
  v_search text := coalesce(p_search, '');
  v_gender text := coalesce(nullif(p_gender, ''), 'all');
  v_tiers text[] := nullif(p_celeb_tiers, '{}');
begin
  return query
  with candidates as (
    select
      celeb.*,
      coalesce(metrics.follower_count, 0)::bigint as computed_follower_count,
      case
        when v_content_type = 'all' then coalesce(metrics.content_count, 0)::bigint
        else (
          select count(*)::bigint
          from public.celeb_contents as content_row
          join public.contents as content on content.id = content_row.content_id
          where content_row.celeb_id = celeb.id
            and content.type = v_content_type
        )
      end as computed_content_count
    from public.celebs as celeb
    left join public.celeb_metrics as metrics on metrics.celeb_id = celeb.id
    where (p_include_inactive or celeb.publication_status = 'active')
      and (v_profession = 'all' or celeb.profession = v_profession)
      and (v_nationality = 'all' or celeb.nationality = v_nationality)
      and (
        v_gender = 'all'
        or (v_gender = 'male' and celeb.gender = true)
        or (v_gender = 'female' and celeb.gender = false)
      )
      and (
        v_content_type = 'all'
        or exists (
          select 1
          from public.celeb_contents as content_row
          join public.contents as content on content.id = content_row.content_id
          where content_row.celeb_id = celeb.id
            and content.type = v_content_type
        )
      )
      and (
        v_search = ''
        or celeb.nickname ilike '%' || v_search || '%'
        or celeb.nickname_en ilike '%' || v_search || '%'
      )
      and (
        p_tag_id is null
        or exists (
          select 1
          from public.celeb_tag_assignments as assignment
          where assignment.celeb_id = celeb.id
            and assignment.tag_id = p_tag_id
        )
      )
      and (
        coalesce(p_min_content_count, 0) <= 0
        or coalesce(metrics.content_count, 0) >= p_min_content_count
      )
      and (v_tiers is null or coalesce(celeb.celeb_tier, 'full') = any(v_tiers))
  )
  select
    candidate.id,
    candidate.slug,
    candidate.nickname,
    candidate.nickname_en,
    candidate.avatar_url,
    candidate.portrait_url,
    candidate.profession,
    candidate.title,
    candidate.title_en,
    candidate.consumption_philosophy,
    candidate.consumption_philosophy_en,
    candidate.nationality,
    candidate.birth_date,
    candidate.death_date,
    candidate.bio,
    candidate.bio_en,
    candidate.is_verified,
    candidate.claimed_by_member_id,
    candidate.computed_follower_count,
    influence.total_score,
    candidate.computed_content_count,
    candidate.created_at,
    candidate.publication_status,
    candidate.celeb_tier,
    candidate.gender
  from candidates as candidate
  left join public.celeb_influence as influence on influence.celeb_id = candidate.id
  order by
    case when p_sort_by = 'composite' then
      coalesce(influence.total_score, 0) * ln(candidate.computed_content_count + 2)
    end desc nulls last,
    case when p_sort_by = 'daily_recommend' then
      abs(('x' || substr(md5(candidate.id::text || current_date::text), 1, 8))::bit(32)::bigint)
    end desc nulls last,
    case when p_sort_by = 'influence' then influence.total_score end desc nulls last,
    case when p_sort_by in ('name', 'name_asc') then candidate.nickname end asc,
    case when p_sort_by = 'profession_asc' then candidate.profession end asc nulls last,
    case when p_sort_by = 'profession_desc' then candidate.profession end desc nulls last,
    case when p_sort_by = 'status_asc' then candidate.publication_status end asc nulls last,
    case when p_sort_by = 'status_desc' then candidate.publication_status end desc nulls last,
    case when p_sort_by = 'nationality_asc' then candidate.nationality end asc nulls last,
    case when p_sort_by = 'nationality_desc' then candidate.nationality end desc nulls last,
    case when p_sort_by = 'created_at_desc' then candidate.created_at end desc nulls last,
    case when p_sort_by = 'created_at_asc' then candidate.created_at end asc nulls last,
    case when p_sort_by = 'content_count' then candidate.computed_content_count end desc,
    case when p_sort_by = 'follower' then candidate.computed_follower_count end desc,
    case when p_sort_by = 'birth_date_asc' then
      case
        when candidate.birth_date ~ '^-?\d+$' then candidate.birth_date::integer
        when candidate.birth_date ~ '^\d+-' then split_part(candidate.birth_date, '-', 1)::integer
        else null
      end
    end asc nulls last,
    case when p_sort_by = 'birth_date_desc' then
      case
        when candidate.birth_date ~ '^-?\d+$' then candidate.birth_date::integer
        when candidate.birth_date ~ '^\d+-' then split_part(candidate.birth_date, '-', 1)::integer
        else null
      end
    end desc nulls last,
    candidate.nickname asc
  limit p_limit
  offset p_offset;
end;
$$;

drop function public.get_celebs_trending(integer, integer);

create function public.get_celebs_trending(
  p_days integer default 30,
  p_limit integer default 12
)
returns table(
  id uuid,
  slug text,
  nickname text,
  nickname_en text,
  avatar_url text,
  portrait_url text,
  profession text,
  title text,
  title_en text,
  consumption_philosophy text,
  consumption_philosophy_en text,
  nationality text,
  birth_date text,
  death_date text,
  bio text,
  bio_en text,
  is_verified boolean,
  claimed_by_member_id uuid,
  follower_count bigint,
  total_score integer,
  content_count bigint,
  created_at timestamptz,
  publication_status text,
  celeb_tier text,
  gender boolean,
  recent_views bigint,
  view_count integer,
  window_start date,
  window_end date
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    celeb.id,
    celeb.slug,
    celeb.nickname,
    celeb.nickname_en,
    celeb.avatar_url,
    celeb.portrait_url,
    celeb.profession,
    celeb.title,
    celeb.title_en,
    celeb.consumption_philosophy,
    celeb.consumption_philosophy_en,
    celeb.nationality,
    celeb.birth_date,
    celeb.death_date,
    celeb.bio,
    celeb.bio_en,
    celeb.is_verified,
    celeb.claimed_by_member_id,
    coalesce(metrics.follower_count, 0)::bigint,
    influence.total_score,
    coalesce(metrics.content_count, 0)::bigint,
    celeb.created_at,
    celeb.publication_status,
    celeb.celeb_tier,
    celeb.gender,
    view_window.views,
    celeb.view_count,
    (current_date - greatest(coalesce(p_days, 30), 1))::date,
    current_date
  from public.celebs as celeb
  join (
    select daily.celeb_id, sum(daily.views)::bigint as views
    from public.celeb_views_daily as daily
    where daily.view_date >= current_date - greatest(coalesce(p_days, 30), 1)
    group by daily.celeb_id
    having sum(daily.views) > 0
  ) as view_window on view_window.celeb_id = celeb.id
  left join public.celeb_metrics as metrics on metrics.celeb_id = celeb.id
  left join public.celeb_influence as influence on influence.celeb_id = celeb.id
  where celeb.publication_status = 'active'
  order by view_window.views desc, celeb.id
  limit greatest(coalesce(p_limit, 12), 1);
$$;

create or replace function public.get_tracker_candidates(
  exclude_ids text[] default '{}'::text[]
)
returns table(
  id text,
  slug text,
  nickname text,
  nickname_en text,
  profession text,
  avatar_url text,
  nationality text,
  birth_date text,
  death_date text
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select
    celeb.id::text,
    celeb.slug,
    celeb.nickname,
    celeb.nickname_en,
    celeb.profession,
    celeb.avatar_url,
    celeb.nationality,
    celeb.birth_date,
    celeb.death_date
  from public.celebs as celeb
  where celeb.publication_status = 'active'
    and nullif(celeb.cultural_journey, '') is not null
    and nullif(celeb.death_date, '') is not null
    and (
      celeb.death_date like '-%'
      or (
        left(celeb.death_date, 4) ~ '^\d+$'
        and left(celeb.death_date, 4)::integer <= 1920
      )
    )
    and exists (
      select 1
      from public.celeb_persona as persona
      where persona.celeb_id = celeb.id
    )
    and (
      select count(*)
      from public.celeb_contents as content_row
      where content_row.celeb_id = celeb.id
        and nullif(btrim(content_row.review), '') is not null
    ) >= 4
    and celeb.id::text <> all(coalesce(exclude_ids, '{}'::text[]));
$$;

create or replace function public.get_top_celebs_across_eras(
  p_limit integer default 3
)
returns table(
  id uuid,
  nickname text,
  nickname_en text,
  avatar_url text,
  title text,
  title_en text,
  influence integer,
  content_count bigint
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  with celeb_counts as (
    select content_row.celeb_id, count(*)::bigint as content_count
    from public.celeb_contents as content_row
    join public.celebs as celeb on celeb.id = content_row.celeb_id
    where content_row.status = 'FINISHED'
      and celeb.publication_status = 'active'
    group by content_row.celeb_id
    having count(*) >= 5
  )
  select
    celeb.id,
    celeb.nickname,
    celeb.nickname_en,
    celeb.avatar_url,
    celeb.title,
    celeb.title_en,
    influence.total_score,
    celeb_counts.content_count
  from celeb_counts
  join public.celebs as celeb on celeb.id = celeb_counts.celeb_id
  join public.celeb_influence as influence on influence.celeb_id = celeb.id
  order by influence.total_score desc, celeb.id
  limit greatest(coalesce(p_limit, 3), 1);
$$;

create or replace function public.get_profession_content_samples(
  per_profession integer default 3
)
returns table(
  profession text,
  content_id text,
  content_type text,
  title text,
  creator text,
  thumbnail_url text
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  with aggregated as (
    select
      celeb.profession,
      content.id as content_id,
      content.type as content_type,
      locale.title,
      locale.creator,
      locale.thumbnail_url,
      count(*) as recommendation_count
    from public.celebs as celeb
    join public.celeb_contents as content_row on content_row.celeb_id = celeb.id
    join public.contents as content on content.id = content_row.content_id
    join public.content_locales as locale
      on locale.content_id = content.id
     and locale.locale = 'ko'
    where celeb.publication_status = 'active'
      and celeb.profession is not null
      and content_row.visibility = 'public'::public.visibility_type
      and content_row.status = 'FINISHED'
      and locale.thumbnail_url is not null
    group by
      celeb.profession,
      content.id,
      content.type,
      locale.title,
      locale.creator,
      locale.thumbnail_url
  ),
  ranked as (
    select aggregated.*,
           row_number() over (
             partition by aggregated.profession
             order by aggregated.recommendation_count desc, aggregated.content_id
           ) as rank
    from aggregated
  )
  select
    ranked.profession,
    ranked.content_id,
    ranked.content_type,
    ranked.title,
    ranked.creator,
    ranked.thumbnail_url
  from ranked
  where ranked.rank <= greatest(coalesce(per_profession, 3), 1);
$$;

create or replace function public.get_seed_eligible_celebs()
returns table(celeb_id uuid, content_count bigint)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select content_row.celeb_id, count(*)::bigint as content_count
  from public.celeb_contents as content_row
  join public.celebs as celeb on celeb.id = content_row.celeb_id
  where celeb.publication_status = 'active'
    and content_row.status = 'FINISHED'
    and content_row.visibility = 'public'::public.visibility_type
  group by content_row.celeb_id
  having count(*) >= 5;
$$;

create or replace function public.get_celeb_feed_type_counts()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'all', coalesce(count(*), 0),
    'BOOK', coalesce(count(*) filter (where content.type = 'BOOK'), 0),
    'VIDEO', coalesce(count(*) filter (where content.type = 'VIDEO'), 0),
    'GAME', coalesce(count(*) filter (where content.type = 'GAME'), 0),
    'MUSIC', coalesce(count(*) filter (where content.type = 'MUSIC'), 0)
  )
  from public.celeb_contents as content_row
  join public.celebs as celeb on celeb.id = content_row.celeb_id
  join public.contents as content on content.id = content_row.content_id
  where celeb.publication_status = 'active'
    and content_row.review is not null
    and content_row.visibility = 'public'::public.visibility_type;
$$;

create or replace function public.get_shared_contents_by_celebs(
  p_celeb_ids uuid[],
  p_content_type text default null,
  p_limit integer default 10
)
returns table(
  content_id text,
  title text,
  creator text,
  thumbnail_url text,
  content_type text,
  celeb_count bigint,
  avg_rating numeric,
  celeb_nicknames text[]
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select
    content_row.content_id,
    locale.title,
    locale.creator,
    locale.thumbnail_url,
    content.type,
    count(distinct content_row.celeb_id)::bigint,
    round(avg(content_row.rating) filter (where content_row.rating > 0), 1),
    array_agg(distinct celeb.nickname order by celeb.nickname)
  from public.celeb_contents as content_row
  join public.contents as content on content.id = content_row.content_id
  join public.celebs as celeb on celeb.id = content_row.celeb_id
  left join public.content_locales as locale
    on locale.content_id = content_row.content_id
   and locale.locale = 'ko'
  where content_row.celeb_id = any(p_celeb_ids)
    and content_row.visibility = 'public'::public.visibility_type
    and (p_content_type is null or content.type = p_content_type)
  group by
    content_row.content_id,
    locale.title,
    locale.creator,
    locale.thumbnail_url,
    content.type
  having count(distinct content_row.celeb_id) >= 2
  order by
    count(distinct content_row.celeb_id) desc,
    round(avg(content_row.rating) filter (where content_row.rating > 0), 1) desc nulls last,
    locale.title
  limit greatest(coalesce(p_limit, 10), 1);
$$;

create or replace function public.get_celeb_view_stats(
  p_celeb_id uuid,
  p_days integer default 30
)
returns table(
  recent_views bigint,
  view_count integer,
  window_start date,
  window_end date
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    coalesce((
      select sum(daily.views)::bigint
      from public.celeb_views_daily as daily
      where daily.celeb_id = celeb.id
        and daily.view_date >= current_date - greatest(coalesce(p_days, 30), 1)
    ), 0)::bigint,
    celeb.view_count,
    (current_date - greatest(coalesce(p_days, 30), 1))::date,
    current_date
  from public.celebs as celeb
  where celeb.id = p_celeb_id;
$$;

create or replace function public.increment_celeb_view(
  p_celeb_id uuid,
  p_increment boolean default true
)
returns integer
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $$
declare
  v_count integer;
begin
  if not exists (
    select 1
    from public.celebs as celeb
    where celeb.id = p_celeb_id
  ) then
    return null;
  end if;

  if not coalesce(p_increment, true) then
    select celeb.view_count
    into v_count
    from public.celebs as celeb
    where celeb.id = p_celeb_id;

    return v_count;
  end if;

  insert into public.celeb_views_daily(celeb_id, view_date, views)
  values (p_celeb_id, current_date, 1)
  on conflict (celeb_id, view_date)
  do update set views = public.celeb_views_daily.views + 1;

  update public.celebs as celeb
  set view_count = celeb.view_count + 1
  where celeb.id = p_celeb_id
  returning celeb.view_count into v_count;

  return v_count;
end;
$$;

drop function public.get_celeb_type_counts(uuid);

create function public.get_celeb_type_counts(
  p_celeb_id uuid
)
returns table(content_type text, total bigint)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select content.type::text, count(*)::bigint
  from public.celeb_contents as content_row
  join public.contents as content on content.id = content_row.content_id
  where content_row.celeb_id = p_celeb_id
  group by content.type;
$$;

create or replace function public.get_persona_extremes(
  p_runners_up_limit integer default 2
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog
set statement_timeout = '15s'
as $$
declare
  v_result jsonb;
begin
  with axes(axis, grp, ord) as (
    values
      ('temperance','inner_virtues', 1),
      ('diligence','inner_virtues', 2),
      ('reflection','inner_virtues', 3),
      ('courage','inner_virtues', 4),
      ('loyalty','outer_virtues', 5),
      ('benevolence','outer_virtues', 6),
      ('fairness','outer_virtues', 7),
      ('humility','outer_virtues', 8),
      ('command','abilities', 9),
      ('martial','abilities', 10),
      ('intellect','abilities', 11),
      ('charm','abilities', 12),
      ('pessimism_optimism','dispositions', 13),
      ('conservative_progressive','dispositions', 14),
      ('individual_social','dispositions', 15),
      ('cautious_bold','dispositions', 16)
  ),
  base as (
    select
      celeb.id,
      celeb.slug,
      celeb.nickname,
      celeb.nickname_en,
      celeb.avatar_url,
      celeb.profession,
      celeb.title,
      celeb.title_en,
      coalesce(celeb.has_voice, false) as has_voice,
      persona.persona
    from public.celeb_persona as persona
    join public.celebs as celeb on celeb.id = persona.celeb_id
    where celeb.publication_status = 'active'
      and celeb.celeb_tier = 'full'
      and persona.persona is not null
  ),
  candidates as (
    select axis.axis, axis.grp, axis.ord, base.id, values.score
    from base
    cross join lateral (
      select
        group_item.key as grp,
        axis_item.key as axis,
        (axis_item.value ->> 'score')::integer as score
      from jsonb_each(base.persona) as group_item
      cross join lateral jsonb_each(group_item.value) as axis_item
      where group_item.key in (
        'inner_virtues', 'outer_virtues', 'abilities', 'dispositions'
      )
        and axis_item.value ->> 'score' is not null
    ) as values
    join axes as axis on axis.axis = values.axis and axis.grp = values.grp
  ),
  with_rank as (
    select
      candidates.*,
      row_number() over (
        partition by axis order by score desc, id
      ) as rank_desc,
      row_number() over (
        partition by axis order by score asc, id
      ) as rank_asc,
      count(*) over (partition by axis) as total
    from candidates
  ),
  score_groups as (
    select axis, score, count(*)::integer as count
    from candidates
    group by axis, score
  ),
  score_counts as (
    select
      axis,
      score,
      coalesce(sum(count) over (
        partition by axis
        order by score asc
        rows between unbounded preceding and 1 preceding
      ), 0)::integer as below_count,
      coalesce(sum(count) over (
        partition by axis
        order by score desc
        rows between unbounded preceding and 1 preceding
      ), 0)::integer as above_count
    from score_groups
  ),
  selected as (
    select *
    from with_rank
    where rank_desc <= 1 + greatest(coalesce(p_runners_up_limit, 2), 0)
       or (grp = 'dispositions' and rank_asc = 1)
  ),
  selected_meta as (
    select
      selected.axis,
      selected.grp,
      selected.ord,
      selected.id,
      selected.score,
      selected.rank_desc,
      selected.rank_asc,
      selected.total,
      base.slug,
      base.nickname,
      base.nickname_en,
      base.avatar_url,
      base.profession,
      base.title,
      base.title_en,
      base.has_voice,
      base.persona,
      score_counts.below_count,
      score_counts.above_count
    from selected
    join base on base.id = selected.id
    left join score_counts
      on score_counts.axis = selected.axis
     and score_counts.score = selected.score
  ),
  stats_per_celeb as (
    select unique_celeb.id, aggregated.stats_with_reasons
    from (
      select distinct id, persona
      from selected_meta
    ) as unique_celeb,
    lateral (
      select jsonb_object_agg(
        all_axes.key,
        jsonb_build_object(
          'score', (all_axes.value ->> 'score')::integer,
          'reason_ko', coalesce(all_axes.value ->> 'reason_ko', ''),
          'reason_en', coalesce(all_axes.value ->> 'reason_en', '')
        )
      ) as stats_with_reasons
      from (
        select item.key, item.value
        from jsonb_each(unique_celeb.persona -> 'abilities') as item
        union all
        select item.key, item.value
        from jsonb_each(unique_celeb.persona -> 'inner_virtues') as item
        union all
        select item.key, item.value
        from jsonb_each(unique_celeb.persona -> 'outer_virtues') as item
        union all
        select item.key, item.value
        from jsonb_each(unique_celeb.persona -> 'dispositions') as item
      ) as all_axes
    ) as aggregated
  )
  select jsonb_agg(result_row.entry order by result_row.ord)
  into v_result
  from (
    select
      winner.ord,
      jsonb_build_object(
        'axis', winner.axis,
        'group', winner.grp,
        'score', winner.score,
        'percentile', round(
          (1 - winner.below_count::numeric / winner.total) * 100 * 10
        ) / 10,
        'reason', jsonb_build_object(
          'ko', coalesce(winner.persona -> winner.grp -> winner.axis ->> 'reason_ko', ''),
          'en', coalesce(winner.persona -> winner.grp -> winner.axis ->> 'reason_en', '')
        ),
        'celeb', jsonb_build_object(
          'id', winner.id,
          'slug', winner.slug,
          'nickname', coalesce(winner.nickname, ''),
          'nickname_en', winner.nickname_en,
          'avatar_url', winner.avatar_url,
          'profession', winner.profession,
          'title', winner.title,
          'title_en', winner.title_en,
          'has_voice', winner.has_voice,
          'stats', winner_stats.stats_with_reasons
        ),
        'runnersUp', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', runner.id,
              'slug', runner.slug,
              'nickname', coalesce(runner.nickname, ''),
              'nickname_en', runner.nickname_en,
              'avatar_url', runner.avatar_url,
              'score', runner.score,
              'reason', jsonb_build_object(
                'ko', coalesce(runner.persona -> runner.grp -> runner.axis ->> 'reason_ko', ''),
                'en', coalesce(runner.persona -> runner.grp -> runner.axis ->> 'reason_en', '')
              ),
              'stats', runner_stats.stats_with_reasons
            )
            order by runner.rank_desc
          )
          from selected_meta as runner
          left join stats_per_celeb as runner_stats on runner_stats.id = runner.id
          where runner.axis = winner.axis
            and runner.rank_desc between 2
              and 1 + greatest(coalesce(p_runners_up_limit, 2), 0)
        ), '[]'::jsonb),
        'opposing', case when winner.grp = 'dispositions' then (
          select jsonb_build_object(
            'score', opposing.score,
            'percentile', round(
              opposing.above_count::numeric / opposing.total * 100 * 10
            ) / 10,
            'reason', jsonb_build_object(
              'ko', coalesce(opposing.persona -> opposing.grp -> opposing.axis ->> 'reason_ko', ''),
              'en', coalesce(opposing.persona -> opposing.grp -> opposing.axis ->> 'reason_en', '')
            ),
            'celeb', jsonb_build_object(
              'id', opposing.id,
              'slug', opposing.slug,
              'nickname', coalesce(opposing.nickname, ''),
              'nickname_en', opposing.nickname_en,
              'avatar_url', opposing.avatar_url,
              'profession', opposing.profession,
              'title', opposing.title,
              'title_en', opposing.title_en,
              'has_voice', opposing.has_voice,
              'stats', opposing_stats.stats_with_reasons
            )
          )
          from selected_meta as opposing
          left join stats_per_celeb as opposing_stats on opposing_stats.id = opposing.id
          where opposing.axis = winner.axis
            and opposing.rank_asc = 1
          limit 1
        ) end
      ) as entry
    from selected_meta as winner
    left join stats_per_celeb as winner_stats on winner_stats.id = winner.id
    where winner.rank_desc = 1
  ) as result_row;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

-- Remaining app-facing helpers found by scanning pg_proc and current callers.
-- These are kept because their pages are live even though they were outside
-- the original shortlist.

create or replace function public.get_similar_users(
  target_user_id uuid,
  result_limit integer default 10
)
returns table(
  user_id uuid,
  nickname text,
  avatar_url text,
  content_count bigint,
  overlap_count bigint,
  similarity double precision
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  current_member_id uuid := (select auth.uid());
  own_content_count bigint;
begin
  if current_member_id is null
    or (
      target_user_id is distinct from current_member_id
      and not public.is_admin()
    )
  then
    raise exception 'Not allowed to inspect another member'
      using errcode = '42501';
  end if;

  select count(*)
  into own_content_count
  from public.member_contents as own_content
  where own_content.member_id = target_user_id;

  if own_content_count = 0 then
    return;
  end if;

  return query
  with own_contents as (
    select own_content.content_id
    from public.member_contents as own_content
    where own_content.member_id = target_user_id
  ),
  other_member_stats as (
    select
      other_content.member_id as other_member_id,
      count(*)::bigint as other_content_count,
      count(*) filter (
        where other_content.content_id in (select content_id from own_contents)
      )::bigint as overlap
    from public.member_contents as other_content
    where other_content.member_id <> target_user_id
      and other_content.visibility = 'public'::public.visibility_type
      and not exists (
        select 1
        from public.member_member_follows as followed
        where followed.follower_member_id = target_user_id
          and followed.followed_member_id = other_content.member_id
      )
      and not exists (
        select 1
        from public.blocks as blocked
        where blocked.blocker_id = target_user_id
          and blocked.blocked_id = other_content.member_id
      )
      and exists (
        select 1
        from public.member_profiles as member
        where member.id = other_content.member_id
      )
    group by other_content.member_id
    having count(*) filter (
      where other_content.content_id in (select content_id from own_contents)
    ) > 0
  )
  select
    stats.other_member_id,
    member.nickname::text,
    member.avatar_url::text,
    stats.other_content_count,
    stats.overlap,
    stats.overlap::double precision
      / sqrt(
          own_content_count::double precision
          * stats.other_content_count::double precision
        )
  from other_member_stats as stats
  join public.member_profiles as member on member.id = stats.other_member_id
  order by 6 desc, stats.overlap desc
  limit least(greatest(coalesce(result_limit, 10), 1), 50);
end;
$$;

create or replace function public.get_current_account_access_state()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select case
    when (select auth.uid()) is null then 'incomplete'
    when not exists (
      select 1
      from public.user_accounts as account
      where account.id = (select auth.uid())
    ) then 'incomplete'
    when not exists (
      select 1
      from public.member_profiles as member
      where member.id = (select auth.uid())
    ) then 'incomplete'
    when exists (
      select 1
      from public.user_accounts as account
      where account.id = (select auth.uid())
        and account.account_status = 'active'
    ) then 'active'
    else 'blocked'
  end;
$$;

create or replace function public.get_tag_celeb_counts()
returns table(
  tag_id uuid,
  tag_name text,
  tag_color text,
  tag_description text,
  celeb_count bigint
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select
    tag.id,
    tag.name,
    tag.color,
    tag.description,
    count(distinct assignment.celeb_id)::bigint
  from public.celeb_tags as tag
  left join public.celeb_tag_assignments as assignment on assignment.tag_id = tag.id
  group by tag.id, tag.name, tag.color, tag.description, tag.sort_order
  order by tag.sort_order, tag.name;
$$;

create or replace function public.get_trending_celebs(
  p_days integer default 30,
  p_limit integer default 12
)
returns table(celeb_id uuid, views bigint)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select daily.celeb_id, sum(daily.views)::bigint
  from public.celeb_views_daily as daily
  join public.celebs as celeb on celeb.id = daily.celeb_id
  where daily.view_date >= current_date - greatest(coalesce(p_days, 30), 1)
    and celeb.publication_status = 'active'
  group by daily.celeb_id
  having sum(daily.views) > 0
  order by sum(daily.views) desc, daily.celeb_id
  limit greatest(coalesce(p_limit, 12), 1);
$$;

create or replace function public.get_chosen_scriptures(
  p_category text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table(
  content_id text,
  title text,
  creator text,
  thumbnail_url text,
  content_type text,
  celeb_count bigint,
  user_count bigint,
  avg_rating numeric,
  total_count bigint,
  title_ko text,
  title_en text,
  creator_en text,
  isbn_en text,
  thumbnail_en text
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  with celeb_content_stats as (
    select
      content_row.content_id,
      count(distinct content_row.celeb_id)::bigint as celeb_count,
      avg(content_row.rating) as avg_rating
    from public.celeb_contents as content_row
    join public.celebs as celeb on celeb.id = content_row.celeb_id
    join public.contents as content on content.id = content_row.content_id
    where content_row.status = 'FINISHED'
      and celeb.publication_status = 'active'
      and (p_category is null or content.type = p_category)
    group by content_row.content_id
  ),
  member_counts as (
    select
      content_row.content_id,
      count(distinct content_row.member_id)::bigint as member_count
    from public.member_contents as content_row
    where content_row.status = 'FINISHED'
    group by content_row.content_id
  ),
  total as (
    select count(*)::bigint as count
    from celeb_content_stats
  )
  select
    content.id,
    coalesce(locale_ko.title, locale_en.title, '')::text,
    coalesce(locale_ko.creator, locale_en.creator, '')::text,
    coalesce(locale_ko.thumbnail_url, locale_en.thumbnail_url)::text,
    content.type::text,
    celeb_stats.celeb_count,
    coalesce(member_counts.member_count, 0)::bigint,
    celeb_stats.avg_rating,
    total.count,
    locale_ko.title::text,
    locale_en.title::text,
    locale_en.creator::text,
    locale_en.isbn::text,
    locale_en.thumbnail_url::text
  from public.contents as content
  join celeb_content_stats as celeb_stats on celeb_stats.content_id = content.id
  cross join total
  left join member_counts on member_counts.content_id = content.id
  left join public.content_locales as locale_ko
    on locale_ko.content_id = content.id
   and locale_ko.locale = 'ko'
  left join public.content_locales as locale_en
    on locale_en.content_id = content.id
   and locale_en.locale = 'en'
  order by
    celeb_stats.celeb_count desc,
    coalesce(locale_ko.title, locale_en.title, '')
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- The live era page reads `celeb_count_in_era`; the legacy function exposed
-- `era_celeb_count`, so recreate it with the caller contract while cutting
-- over its underlying tables.
drop function public.get_scriptures_by_era(text, text, integer, integer);

create function public.get_scriptures_by_era(
  p_era text default null,
  p_category text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table(
  era text,
  era_label text,
  era_period text,
  era_description text,
  celeb_count_in_era bigint,
  content_id text,
  title text,
  creator text,
  thumbnail_url text,
  content_type text,
  celeb_count bigint,
  user_count bigint,
  avg_rating numeric,
  total_count bigint,
  title_ko text,
  title_en text,
  creator_en text,
  isbn_en text,
  thumbnail_en text
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_era_keys text[] := case
    when p_era is not null then array[p_era]
    else array['ancient', 'medieval', 'modern', 'contemporary']
  end;
  v_current_era text;
  v_minimum_year integer;
  v_maximum_year integer;
  v_label text;
  v_period text;
  v_description text;
begin
  foreach v_current_era in array v_era_keys loop
    case v_current_era
      when 'ancient' then
        v_minimum_year := -9999;
        v_maximum_year := 500;
        v_label := '고대';
        v_period := '~500년';
        v_description := '철학과 사상의 씨앗이 뿌려진 시대입니다. 소크라테스, 공자, 붓다가 던진 근본적인 질문들이 오늘날까지 인류를 이끌고 있습니다.';
      when 'medieval' then
        v_minimum_year := 500;
        v_maximum_year := 1500;
        v_label := '중세';
        v_period := '500~1500년';
        v_description := '신앙과 기사도가 꽃피운 시대입니다. 어둠 속에서도 지혜의 불씨를 꺼뜨리지 않은 수도원과 학자들의 헌신이 오늘의 문명을 만들었습니다.';
      when 'modern' then
        v_minimum_year := 1500;
        v_maximum_year := 1900;
        v_label := '근대';
        v_period := '1500~1900년';
        v_description := '이성의 빛이 세상을 깨운 시대입니다. 르네상스, 계몽주의, 산업혁명을 통해 인류는 전례 없는 변화를 경험했습니다.';
      when 'contemporary' then
        v_minimum_year := 1900;
        v_maximum_year := 9999;
        v_label := '현대';
        v_period := '1900년~';
        v_description := '격변과 혁신의 세기입니다. 지금 우리의 생각과 삶의 방식을 형성한 거인들이 이 시대를 살아갔습니다.';
      else
        continue;
    end case;

    return query
    with era_celebs as (
      select celeb.id
      from public.celebs as celeb
      cross join lateral (
        select case
          when celeb.birth_date ~ '^-?\d+$' then celeb.birth_date::integer
          when celeb.birth_date ~ '^-?\d+' then
            (regexp_match(celeb.birth_date, '^(-?\d+)'))[1]::integer
          else null
        end as birth_year
      ) as parsed
      where celeb.publication_status = 'active'
        and celeb.birth_date is not null
        and parsed.birth_year >= v_minimum_year
        and parsed.birth_year < v_maximum_year
    ),
    era_celeb_total as (
      select count(*)::bigint as count
      from era_celebs
    ),
    era_content_stats as (
      select
        content_row.content_id,
        count(distinct content_row.celeb_id)::bigint as era_count,
        avg(content_row.rating) as era_average_rating
      from public.celeb_contents as content_row
      join era_celebs on era_celebs.id = content_row.celeb_id
      join public.contents as content on content.id = content_row.content_id
      where content_row.status = 'FINISHED'
        and (p_category is null or content.type = p_category)
      group by content_row.content_id
    ),
    global_celeb_counts as (
      select
        content_row.content_id,
        count(distinct content_row.celeb_id)::bigint as global_count
      from public.celeb_contents as content_row
      join public.celebs as celeb on celeb.id = content_row.celeb_id
      join era_content_stats on era_content_stats.content_id = content_row.content_id
      where content_row.status = 'FINISHED'
        and celeb.publication_status = 'active'
      group by content_row.content_id
    ),
    member_counts as (
      select
        content_row.content_id,
        count(distinct content_row.member_id)::bigint as member_count
      from public.member_contents as content_row
      join era_content_stats on era_content_stats.content_id = content_row.content_id
      where content_row.status = 'FINISHED'
      group by content_row.content_id
    ),
    total as (
      select count(*)::bigint as count
      from era_content_stats
    )
    select
      v_current_era::text,
      v_label::text,
      v_period::text,
      v_description::text,
      era_celeb_total.count,
      content.id::text,
      coalesce(locale_ko.title, locale_en.title, '')::text,
      coalesce(locale_ko.creator, locale_en.creator, '')::text,
      coalesce(locale_ko.thumbnail_url, locale_en.thumbnail_url)::text,
      content.type::text,
      coalesce(global_counts.global_count, era_stats.era_count)::bigint,
      coalesce(member_counts.member_count, 0)::bigint,
      round(era_stats.era_average_rating, 1),
      total.count,
      locale_ko.title::text,
      locale_en.title::text,
      locale_en.creator::text,
      locale_en.isbn::text,
      locale_en.thumbnail_url::text
    from public.contents as content
    join era_content_stats as era_stats on era_stats.content_id = content.id
    cross join era_celeb_total
    cross join total
    left join global_celeb_counts as global_counts
      on global_counts.content_id = content.id
    left join member_counts on member_counts.content_id = content.id
    left join public.content_locales as locale_ko
      on locale_ko.content_id = content.id
     and locale_ko.locale = 'ko'
    left join public.content_locales as locale_en
      on locale_en.content_id = content.id
     and locale_en.locale = 'en'
    order by
      coalesce(global_counts.global_count, era_stats.era_count) desc,
      coalesce(locale_ko.title, locale_en.title, '')
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
  end loop;
end;
$$;

-- Both helpers have no runtime caller.  Removing them prevents dead code from
-- retaining a dependency on the compatibility tables during the final drop.
drop function if exists public.count_contents_by_users(uuid[]);
drop function if exists public.get_friend_activity_type_counts(uuid);

revoke all on function
  public.get_review_celeb_ids(),
  public.get_celeb_content_counts(text[]),
  public.get_user_content_counts(text),
  public.get_content_celeb_user_counts(text[]),
  public.count_celebs_filtered(text, text, text, text, uuid, integer, text, boolean, text[]),
  public.get_celebs_sorted(text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[]),
  public.get_celebs_trending(integer, integer),
  public.get_tracker_candidates(text[]),
  public.get_top_celebs_across_eras(integer),
  public.get_profession_content_samples(integer),
  public.get_seed_eligible_celebs(),
  public.get_celeb_feed_type_counts(),
  public.get_shared_contents_by_celebs(uuid[], text, integer),
  public.get_celeb_view_stats(uuid, integer),
  public.increment_celeb_view(uuid, boolean),
  public.get_celeb_type_counts(uuid),
  public.get_persona_extremes(integer),
  public.get_tag_celeb_counts(),
  public.get_trending_celebs(integer, integer),
  public.get_chosen_scriptures(text, integer, integer),
  public.get_scriptures_by_era(text, text, integer, integer)
from public, anon, authenticated, service_role;

grant execute on function
  public.get_review_celeb_ids(),
  public.get_celeb_content_counts(text[]),
  public.get_user_content_counts(text),
  public.get_content_celeb_user_counts(text[]),
  public.count_celebs_filtered(text, text, text, text, uuid, integer, text, boolean, text[]),
  public.get_celebs_sorted(text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[]),
  public.get_celebs_trending(integer, integer),
  public.get_tracker_candidates(text[]),
  public.get_top_celebs_across_eras(integer),
  public.get_profession_content_samples(integer),
  public.get_seed_eligible_celebs(),
  public.get_celeb_feed_type_counts(),
  public.get_shared_contents_by_celebs(uuid[], text, integer),
  public.get_celeb_view_stats(uuid, integer),
  public.increment_celeb_view(uuid, boolean),
  public.get_celeb_type_counts(uuid),
  public.get_persona_extremes(integer),
  public.get_tag_celeb_counts(),
  public.get_trending_celebs(integer, integer),
  public.get_chosen_scriptures(text, integer, integer),
  public.get_scriptures_by_era(text, text, integer, integer)
to anon, authenticated, service_role;

revoke all on function
  public.get_similar_users(uuid, integer),
  public.get_current_account_access_state()
from public, anon, authenticated, service_role;

grant execute on function public.get_similar_users(uuid, integer)
to authenticated, service_role;

grant execute on function public.get_current_account_access_state()
to authenticated;

do $$
declare
  legacy_functions text;
begin
  select string_agg(
           routine.proname || '(' || pg_get_function_identity_arguments(routine.oid) || ')',
           ', ' order by routine.proname
         )
  into legacy_functions
  from pg_proc as routine
  join pg_namespace as namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = any(array[
      'get_review_celeb_ids',
      'get_celeb_content_counts',
      'get_user_content_counts',
      'get_content_celeb_user_counts',
      'count_celebs_filtered',
      'get_celebs_sorted',
      'get_celebs_trending',
      'get_tracker_candidates',
      'get_top_celebs_across_eras',
      'get_profession_content_samples',
      'get_seed_eligible_celebs',
      'get_celeb_feed_type_counts',
      'get_shared_contents_by_celebs',
      'get_celeb_view_stats',
      'increment_celeb_view',
      'get_celeb_type_counts',
      'get_persona_extremes',
      'get_similar_users',
      'get_current_account_access_state',
      'get_tag_celeb_counts',
      'get_trending_celebs',
      'get_chosen_scriptures',
      'get_scriptures_by_era'
    ])
    and routine.prosrc ~ '\m(profiles|user_contents|follows)\M';

  if legacy_functions is not null then
    raise exception 'RPC cutover left legacy table references: %', legacy_functions;
  end if;

  if pg_get_function_result(
       'public.get_celebs_sorted(text,text,text,text,text,integer,integer,uuid,integer,text,boolean,text[])'::regprocedure
     ) not like '%claimed_by_member_id uuid%publication_status text%'
  then
    raise exception 'get_celebs_sorted return contract was not updated';
  end if;

  if pg_get_function_result(
       'public.get_scriptures_by_era(text,text,integer,integer)'::regprocedure
     ) not like '%celeb_count_in_era bigint%'
  then
    raise exception 'get_scriptures_by_era return contract differs from the live caller';
  end if;
end;
$$;

commit;
