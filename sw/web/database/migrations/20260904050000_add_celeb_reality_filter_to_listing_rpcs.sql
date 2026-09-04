-- count_celebs_filtered·get_celebs_sorted의 p_celeb_tiers는 지금까지 두 역할을 겸했다:
-- (1) 사용자가 고르는 등급 필터(full/light), (2) fiction 인물을 기본 노출에서 빼는 장치.
-- celeb_tier에서 fiction을 폐기하면 (2)가 통째로 사라진다 — 이 함수들이 celeb_reality를
-- 전혀 모르기 때문에, 폐기와 동시에 이 함수를 안 고치면 484명이 홈·서재탐방 기본 목록에
-- 그대로 노출된다. p_celeb_realities를 별도 파라미터로 추가해 이 역할을 넘겨받는다.
--
-- p_celeb_tiers는 그대로 둔다 — 이제 순수하게 "등급 선택 UI"(full/light) 역할만 남는다.
--
-- 순서 준수: 이 마이그레이션은 20260904040000(celeb_tier fiction 폐기·484행 이관)보다
-- 먼저 적용한다. 애플리케이션 코드가 p_celeb_realities를 채워 호출하도록 배포된 뒤에
-- 폐기 마이그레이션을 적용해야 노출 사고가 없다.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- 파라미터 개수가 바뀌므로 CREATE OR REPLACE는 옛 시그니처를 대체하지 못하고 오버로드를
-- 만든다(방금 실측: count_celebs_filtered(p_include_inactive => boolean) is not unique
-- 오류로 확인). 옛 시그니처를 명시적으로 지운 뒤 새로 만든다.
drop function if exists public.count_celebs_filtered(
  text, text, text, text, uuid, integer, text, boolean, text[]
);
drop function if exists public.get_celebs_sorted(
  text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[]
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
  p_celeb_realities text[] default null::text[]
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
    and (v_realities is null or coalesce(celeb.celeb_reality, 'REAL') = any(v_realities));

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
  p_celeb_realities text[] default null::text[]
)
returns table(
  id uuid, slug text, nickname text, nickname_en text, avatar_url text, portrait_url text,
  profession text, title text, title_en text, consumption_philosophy text,
  consumption_philosophy_en text, nationality text, birth_date text, death_date text,
  bio text, bio_en text, is_verified boolean, claimed_by_member_id uuid,
  follower_count bigint, total_score integer, content_count bigint,
  created_at timestamp with time zone, publication_status text, celeb_tier text, gender boolean
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

-- drop+create로 권한이 초기화되므로 기존 상태(anon·authenticated·service_role EXECUTE)를
-- 명시적으로 복원한다. 복원하지 않으면 PostgREST 경로에서 목록 조회가 막힌다.
alter function public.count_celebs_filtered(
  text, text, text, text, uuid, integer, text, boolean, text[], text[]
) owner to postgres;
alter function public.get_celebs_sorted(
  text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[], text[]
) owner to postgres;

grant execute on function public.count_celebs_filtered(
  text, text, text, text, uuid, integer, text, boolean, text[], text[]
) to anon, authenticated, service_role;
grant execute on function public.get_celebs_sorted(
  text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[], text[]
) to anon, authenticated, service_role;

-- 검증: 새 파라미터가 실제로 노출을 가르는지, 권한이 복원됐는지 확인한다.
do $verify$
declare
  v_all bigint;
  v_real_both bigint;
  v_missing_grant integer;
begin
  select public.count_celebs_filtered(p_include_inactive := true) into v_all;
  select public.count_celebs_filtered(
    p_include_inactive := true,
    p_celeb_realities := array['REAL','BOTH']
  ) into v_real_both;
  if v_real_both >= v_all then
    raise exception 'p_celeb_realities 필터가 아무 효과가 없습니다(all=%, real_both=%)', v_all, v_real_both;
  end if;

  select count(*) into v_missing_grant
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join unnest(array['anon','authenticated','service_role']) as needed(rolname)
  where n.nspname = 'public'
    and p.proname in ('count_celebs_filtered','get_celebs_sorted')
    and not has_function_privilege(needed.rolname, p.oid, 'execute');
  if v_missing_grant > 0 then
    raise exception 'EXECUTE 권한이 %건 빠졌습니다', v_missing_grant;
  end if;
end;
$verify$;

commit;
