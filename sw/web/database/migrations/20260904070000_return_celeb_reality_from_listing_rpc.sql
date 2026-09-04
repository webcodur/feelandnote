-- get_celebs_sorted가 celeb_reality를 반환하게 한다.
--
-- 20260904050000은 p_celeb_realities를 필터 파라미터로만 더하고 반환 컬럼에는 넣지 않았다.
-- 그래서 백오피스 목록이 이 값을 못 읽고 전원 REAL로 표시했다(다른 세션이 화면에서 발견).
-- 필터로 거르는 축이면 목록이 그 값을 되읽을 수 있어야 한다.
--
-- 파라미터는 그대로다. 반환 컬럼만 하나 늘어나므로 기존 호출부는 그대로 동작한다.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

drop function if exists public.get_celebs_sorted(
  text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[], text[]
);

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
  p_celeb_realities text[] default null::text[]
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
      end as computed_content_count
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
$function$;

alter function public.get_celebs_sorted(
  text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[], text[]
) owner to postgres;

grant execute on function public.get_celebs_sorted(
  text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[], text[]
) to anon, authenticated, service_role;

do $verify$
declare
  v_reality text;
  v_missing integer;
begin
  select celeb_reality into v_reality
  from public.get_celebs_sorted(p_limit := 1, p_include_inactive := true);
  if v_reality is null then
    raise exception 'get_celebs_sorted가 celeb_reality를 반환하지 않습니다';
  end if;

  select count(*) into v_missing
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join unnest(array['anon','authenticated','service_role']) as needed(rolname)
  where n.nspname = 'public'
    and p.proname = 'get_celebs_sorted'
    and not has_function_privilege(needed.rolname, p.oid, 'execute');
  if v_missing > 0 then
    raise exception 'EXECUTE 권한이 %건 빠졌습니다', v_missing;
  end if;
end;
$verify$;

commit;
