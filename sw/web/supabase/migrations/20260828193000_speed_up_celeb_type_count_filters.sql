-- 인물 목록 RPC의 콘텐츠 타입 필터를 상관 서브쿼리에서 단일 집계 조인으로 바꾼다.
--
-- 문제: get_celebs_sorted·count_celebs_filtered는 p_content_type이 주어지면 인물 3,059명
-- 각각에 대해 celeb_contents ⋈ contents 를 세는 상관 서브쿼리를 돌리고(개수 + exists 두 번),
-- 그 뒤 전체를 정렬해 limit 를 적용했다. 결과 3행에 버퍼 61,768페이지를 읽어 단독 3.5초,
-- 탐색 화면의 4타입 병렬 호출이 콜드캐시 조회와 겹치면 anon statement_timeout 15초에
-- 걸려 "분야별 기록왕 조회 실패"가 났다. 실패는 캐시하지 않으므로 성공할 때까지 방문마다 반복됐다.
--
-- 조치: 타입별 인물 집계를 CTE 하나로 한 번만 계산해 left join 한다. exists 는 집계 행 존재로
-- 대체한다(count > 0 ⇔ exists). 반환 계약·인자·정렬 규칙·최종 동점 처리는 그대로다.
-- 실측(2026-08-28, 운영 DB, BOOK·content_count·limit 3): 3,504ms → 90ms, 버퍼 61,768 → 4,416.
--
-- 적용: 운영 DB에 SSH 로 psql -f 실행. 교체 전 _v2 그림자 함수로 타입×정렬 행렬을 대조했다.

begin;

create or replace function public.get_celebs_sorted(
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
  with type_counts as (
    -- 타입 필터가 있을 때만 채워진다. 'all'이면 빈 집합이라 조인 비용이 없다.
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
    and (v_tiers is null or coalesce(celeb.celeb_tier, 'full') = any(v_tiers));

  return result;
end;
$$;

commit;
