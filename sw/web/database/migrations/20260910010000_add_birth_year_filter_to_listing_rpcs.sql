-- count_celebs_filtered·get_celebs_sorted에 생년(연도) 범위 필터를 추가한다.
-- /explore/figures 필터에 생년 range slider를 붙이기 위한 선행 작업이다.
--
-- birth_date는 text다("1963-08-06"·"1158"·"-660" 등 BC는 마이너스 부호).
-- 두 RPC의 ORDER BY birth_date_asc/desc는 이미 연도를 뽑는 정규식을 각자 갖고 있었는데,
-- `^\d+-`(양수만) 갈래라 "-3172-01-01" 같은 BC+월일(6건)을 split_part 부호 처리 실패로
-- null 처리하고 있었다. celeb_birth_year 헬퍼 하나로 합쳐 그 버그도 함께 고친다.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create or replace function public.celeb_birth_year(p_birth_date text)
returns integer
language sql
immutable
set search_path to 'pg_catalog'
as $function$
  select case
    when p_birth_date is null or p_birth_date !~ '^-?\d+' then null
    else (regexp_match(p_birth_date, '^(-?\d+)'))[1]::integer
  end;
$function$;

drop function if exists public.count_celebs_filtered(
  text, text, text, text, uuid, integer, text, boolean, text[], text[]
);
drop function if exists public.get_celebs_sorted(
  text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[], text[]
);

create or replace function public.count_celebs_filtered(
  p_profession text default null::text,
  p_nationality text default null::text,
  p_content_type text default null::text,
  p_search text default null::text,
  p_tag_id uuid default null::uuid,
  p_min_content_count integer default 0,
  p_gender text default null::text,
  p_include_inactive boolean default false,
  p_celeb_tiers text[] default null::text[],
  p_celeb_realities text[] default null::text[],
  p_birth_year_min integer default null::integer,
  p_birth_year_max integer default null::integer
)
returns bigint
language plpgsql
stable
set search_path to 'pg_catalog'
as $function$
declare
  result bigint;
  v_profession text := coalesce(nullif(p_profession, ''), 'all');
  v_nationality text := coalesce(nullif(p_nationality, ''), 'all');
  v_content_type text := coalesce(nullif(p_content_type, ''), 'all');
  v_search text := coalesce(p_search, '');
  v_gender text := coalesce(nullif(p_gender, ''), 'all');
  v_tiers text[] := nullif(p_celeb_tiers, '{}');
  v_realities text[] := nullif(p_celeb_realities, '{}');
begin
  with type_members as (
    select distinct content_row.celeb_id
    from public.celeb_contents as content_row
    join public.contents as content on content.id = content_row.content_id
    where v_content_type <> 'all'
      and content.type = v_content_type
  )
  select count(*)
  into result
  from public.celebs as celeb
  left join public.celeb_metrics as metrics on metrics.celeb_id = celeb.id
  left join type_members as type_member on type_member.celeb_id = celeb.id
  where (p_include_inactive or celeb.publication_status = 'active')
    and (v_profession = 'all' or celeb.profession = v_profession)
    and (v_nationality = 'all' or celeb.nationality = v_nationality)
    and (
      v_gender = 'all'
      or (v_gender = 'male' and celeb.gender = true)
      or (v_gender = 'female' and celeb.gender = false)
    )
    and (v_content_type = 'all' or type_member.celeb_id is not null)
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
    and (v_realities is null or coalesce(celeb.celeb_reality, 'REAL') = any(v_realities))
    and (p_birth_year_min is null or public.celeb_birth_year(celeb.birth_date) >= p_birth_year_min)
    and (p_birth_year_max is null or public.celeb_birth_year(celeb.birth_date) <= p_birth_year_max);

  return result;
end;
$function$;

create or replace function public.get_celebs_sorted(
  p_profession text default null::text,
  p_nationality text default null::text,
  p_content_type text default null::text,
  p_sort_by text default 'composite'::text,
  p_search text default ''::text,
  p_limit integer default 20,
  p_offset integer default 0,
  p_tag_id uuid default null::uuid,
  p_min_content_count integer default 0,
  p_gender text default null::text,
  p_include_inactive boolean default false,
  p_celeb_tiers text[] default null::text[],
  p_celeb_realities text[] default null::text[],
  p_birth_year_min integer default null::integer,
  p_birth_year_max integer default null::integer
)
returns table(
  id uuid, slug text, nickname text, nickname_en text, avatar_url text, portrait_url text,
  profession text, title text, title_en text, consumption_philosophy text,
  consumption_philosophy_en text, nationality text, birth_date text, death_date text,
  bio text, bio_en text, is_verified boolean, claimed_by_member_id uuid,
  follower_count bigint, total_score integer, content_count bigint,
  created_at timestamp with time zone, publication_status text, celeb_tier text,
  celeb_reality text, gender boolean
)
language plpgsql
stable
set search_path to 'pg_catalog'
as $function$
declare
  v_profession text := coalesce(nullif(p_profession, ''), 'all');
  v_nationality text := coalesce(nullif(p_nationality, ''), 'all');
  v_content_type text := coalesce(nullif(p_content_type, ''), 'all');
  v_search text := coalesce(p_search, '');
  v_gender text := coalesce(nullif(p_gender, ''), 'all');
  v_tiers text[] := nullif(p_celeb_tiers, '{}');
  v_realities text[] := nullif(p_celeb_realities, '{}');
begin
  return query
  with type_counts as (
    -- 필터가 있을 때만 채워진다. 'all'이면 빈 집합이라 조인 비용이 없다.
    select content_row.celeb_id, count(*)::bigint as n
    from public.celeb_contents as content_row
    join public.contents as content on content.id = content_row.content_id
    where v_content_type <> 'all'
      and content.type = v_content_type
    group by content_row.celeb_id
  ),
  candidates as (
    select
      celeb.*,
      coalesce(metrics.follower_count, 0)::bigint as computed_follower_count,
      case
        when v_content_type = 'all' then coalesce(metrics.content_count, 0)::bigint
        else coalesce(type_count.n, 0)::bigint
      end as computed_content_count,
      public.celeb_birth_year(celeb.birth_date) as computed_birth_year
    from public.celebs as celeb
    left join public.celeb_metrics as metrics on metrics.celeb_id = celeb.id
    left join type_counts as type_count on type_count.celeb_id = celeb.id
    where (p_include_inactive or celeb.publication_status = 'active')
      and (v_profession = 'all' or celeb.profession = v_profession)
      and (v_nationality = 'all' or celeb.nationality = v_nationality)
      and (
        v_gender = 'all'
        or (v_gender = 'male' and celeb.gender = true)
        or (v_gender = 'female' and celeb.gender = false)
      )
      and (v_content_type = 'all' or type_count.n > 0)
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
      and (v_realities is null or coalesce(celeb.celeb_reality, 'REAL') = any(v_realities))
      and (p_birth_year_min is null or public.celeb_birth_year(celeb.birth_date) >= p_birth_year_min)
      and (p_birth_year_max is null or public.celeb_birth_year(celeb.birth_date) <= p_birth_year_max)
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
    candidate.celeb_reality,
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
    case when p_sort_by = 'birth_date_asc' then candidate.computed_birth_year end asc nulls last,
    case when p_sort_by = 'birth_date_desc' then candidate.computed_birth_year end desc nulls last,
    candidate.nickname asc
  limit p_limit
  offset p_offset;
end;
$function$;

alter function public.count_celebs_filtered(
  text, text, text, text, uuid, integer, text, boolean, text[], text[], integer, integer
) owner to postgres;
alter function public.get_celebs_sorted(
  text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[], text[], integer, integer
) owner to postgres;

grant execute on function public.count_celebs_filtered(
  text, text, text, text, uuid, integer, text, boolean, text[], text[], integer, integer
) to anon, authenticated, service_role;
grant execute on function public.get_celebs_sorted(
  text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[], text[], integer, integer
) to anon, authenticated, service_role;

grant execute on function public.celeb_birth_year(text) to anon, authenticated, service_role;

do $verify$
declare
  v_all bigint;
  v_narrow bigint;
  v_wide_narrow bigint;
  v_missing_grant integer;
  v_bug_year integer;
begin
  select public.count_celebs_filtered(p_include_inactive := true) into v_all;
  select public.count_celebs_filtered(
    p_include_inactive := true, p_birth_year_min := 1900, p_birth_year_max := 1999
  ) into v_narrow;
  if v_narrow >= v_all or v_narrow <= 0 then
    raise exception 'p_birth_year_min/max 필터가 아무 효과가 없습니다(all=%, 1900s=%)', v_all, v_narrow;
  end if;

  select public.count_celebs_filtered(
    p_include_inactive := true, p_birth_year_min := -6000, p_birth_year_max := 2030
  ) into v_wide_narrow;
  if v_wide_narrow <> v_all then
    raise exception '전체 연도 범위인데 건수가 달라졌습니다(all=%, wide=%)', v_all, v_wide_narrow;
  end if;

  -- BC + 월일 포맷(예: -3172-01-01)의 부호 처리 버그가 고쳐졌는지 확인한다.
  select public.celeb_birth_year('-3172-01-01') into v_bug_year;
  if v_bug_year is distinct from -3172 then
    raise exception 'celeb_birth_year가 BC+월일 포맷을 잘못 파싱합니다: %', v_bug_year;
  end if;

  select count(*) into v_missing_grant
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join unnest(array['anon','authenticated','service_role']) as needed(rolname)
  where n.nspname = 'public'
    and p.proname in ('count_celebs_filtered', 'get_celebs_sorted', 'celeb_birth_year')
    and not has_function_privilege(needed.rolname, p.oid, 'execute');
  if v_missing_grant > 0 then
    raise exception 'EXECUTE 권한이 %건 빠졌습니다', v_missing_grant;
  end if;
end;
$verify$;

commit;
