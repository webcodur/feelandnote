-- faction 스키마 이관 후 남은 명명 잔재를 정리한다.
--
-- 1) RPC 인자 p_tag_id → p_faction_id
--    PostgREST는 인자를 이름으로 부르므로 인자명은 호출 계약의 일부다.
--    이 마이그레이션은 신 코드(p_faction_id 호출) 배포 직후에 적용한다 —
--    구 코드는 p_tag_id로 부르므로 적용 시점 이전 배포분은 그 함수를 부르지 못한다.
-- 2) 캐시 도메인 'tags' → 'factions'
--    web_revalidate_allowed_domains()는 cache-tags.ts(CACHE_TAGS)의 DB 사본이다.
--    트리거는 허용 목록에 없는 태그를 조용히 버리므로 둘을 함께 바꾼다.
--    구 트리거가 보낸 'tags'는 신 코드의 normalizeLegacyCacheTag가 'factions'로
--    정규화하므로 적용 순서와 무관하게 무효화는 끊기지 않는다.

begin;

-- ── 1) 캐시 도메인 허용 목록 ────────────────────────────────
create or replace function public.web_revalidate_allowed_domains()
returns text[]
language sql
immutable
set search_path = ''
as $function$
  select array['celebs', 'contents', 'dialogues', 'spectrum', 'factions', 'figure-books', 'curated']::text[]
$function$;

-- ── 2) faction 표 무효화 트리거의 태그 인자 ────────────────
drop trigger web_reval_ins on public.faction_lv1;
drop trigger web_reval_upd on public.faction_lv1;
drop trigger web_reval_del on public.faction_lv1;
drop trigger web_reval_ins on public.faction_lv2;
drop trigger web_reval_upd on public.faction_lv2;
drop trigger web_reval_del on public.faction_lv2;
drop trigger web_reval_ins on public.faction_lv3;
drop trigger web_reval_upd on public.faction_lv3;
drop trigger web_reval_del on public.faction_lv3;
drop trigger web_reval_ins on public.faction_members;
drop trigger web_reval_upd on public.faction_members;
drop trigger web_reval_del on public.faction_members;

create trigger web_reval_ins after insert on public.faction_lv1
  referencing new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''factions'']', 'updated_at', 'n.id = o.id');
create trigger web_reval_upd after update on public.faction_lv1
  referencing old table as old_rows new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''factions'']', 'updated_at', 'n.id = o.id');
create trigger web_reval_del after delete on public.faction_lv1
  referencing old table as old_rows for each statement
  execute function public.web_revalidate_trigger('array[''factions'']', 'updated_at', 'n.id = o.id');

create trigger web_reval_ins after insert on public.faction_lv2
  referencing new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''factions'']', 'updated_at', 'n.id = o.id');
create trigger web_reval_upd after update on public.faction_lv2
  referencing old table as old_rows new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''factions'']', 'updated_at', 'n.id = o.id');
create trigger web_reval_del after delete on public.faction_lv2
  referencing old table as old_rows for each statement
  execute function public.web_revalidate_trigger('array[''factions'']', 'updated_at', 'n.id = o.id');

create trigger web_reval_ins after insert on public.faction_lv3
  referencing new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''factions'']', 'updated_at', 'n.id = o.id');
create trigger web_reval_upd after update on public.faction_lv3
  referencing old table as old_rows new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''factions'']', 'updated_at', 'n.id = o.id');
create trigger web_reval_del after delete on public.faction_lv3
  referencing old table as old_rows for each statement
  execute function public.web_revalidate_trigger('array[''factions'']', 'updated_at', 'n.id = o.id');

create trigger web_reval_ins after insert on public.faction_members
  referencing new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''factions'']', '', 'n.id = o.id');
create trigger web_reval_upd after update on public.faction_members
  referencing old table as old_rows new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''factions'']', '', 'n.id = o.id');
create trigger web_reval_del after delete on public.faction_members
  referencing old table as old_rows for each statement
  execute function public.web_revalidate_trigger('array[''factions'']', '', 'n.id = o.id');

-- ── 3) RPC 인자명 p_tag_id → p_faction_id ──────────────────
-- PostgreSQL은 인자명만 다른 CREATE OR REPLACE를 거부하므로 DROP 후 재생성한다.
-- 같은 트랜잭션이라 다른 세션에는 원자적으로 보인다.

drop function public.count_celebs_filtered(text, text, text, text, uuid, integer, text, boolean, text[], text[], integer, integer);

CREATE OR REPLACE FUNCTION public.count_celebs_filtered(p_profession text DEFAULT NULL::text, p_nationality text DEFAULT NULL::text, p_content_type text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_faction_id uuid DEFAULT NULL::uuid, p_min_content_count integer DEFAULT 0, p_gender text DEFAULT NULL::text, p_include_inactive boolean DEFAULT false, p_celeb_tiers text[] DEFAULT NULL::text[], p_celeb_realities text[] DEFAULT NULL::text[], p_birth_year_min integer DEFAULT NULL::integer, p_birth_year_max integer DEFAULT NULL::integer)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
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
      p_faction_id is null
      or exists (
        select 1
        from public.faction_members as assignment
        where assignment.celeb_id = celeb.id
          and assignment.lv2_id = p_faction_id
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

drop function public.get_celebs_sorted(text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[], text[], integer, integer);

CREATE OR REPLACE FUNCTION public.get_celebs_sorted(p_profession text DEFAULT NULL::text, p_nationality text DEFAULT NULL::text, p_content_type text DEFAULT NULL::text, p_sort_by text DEFAULT 'composite'::text, p_search text DEFAULT ''::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_faction_id uuid DEFAULT NULL::uuid, p_min_content_count integer DEFAULT 0, p_gender text DEFAULT NULL::text, p_include_inactive boolean DEFAULT false, p_celeb_tiers text[] DEFAULT NULL::text[], p_celeb_realities text[] DEFAULT NULL::text[], p_birth_year_min integer DEFAULT NULL::integer, p_birth_year_max integer DEFAULT NULL::integer)
 RETURNS TABLE(id uuid, slug text, nickname text, nickname_en text, avatar_url text, portrait_url text, profession text, title text, title_en text, consumption_philosophy text, consumption_philosophy_en text, nationality text, birth_date text, death_date text, bio text, bio_en text, is_verified boolean, claimed_by_member_id uuid, follower_count bigint, total_score integer, content_count bigint, created_at timestamp with time zone, publication_status text, celeb_tier text, celeb_reality text, gender boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
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
        p_faction_id is null
        or exists (
          select 1
          from public.faction_members as assignment
          where assignment.celeb_id = celeb.id
            and assignment.lv2_id = p_faction_id
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

commit;
