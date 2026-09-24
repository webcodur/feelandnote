-- Today's Picks gains modest property bonuses: living figures (no recorded
-- death, born 1900+) and entrepreneurs rank slightly higher. Signature,
-- filters, and result columns are unchanged; the trend draw stays in the app
-- layer and is not part of this score.
begin;

CREATE OR REPLACE FUNCTION public.get_celebs_sorted(p_profession text DEFAULT NULL::text, p_nationality text DEFAULT NULL::text, p_content_type text DEFAULT NULL::text, p_sort_by text DEFAULT 'composite'::text, p_search text DEFAULT ''::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_tag_id uuid DEFAULT NULL::uuid, p_min_content_count integer DEFAULT 0, p_gender text DEFAULT NULL::text, p_include_inactive boolean DEFAULT false, p_celeb_tiers text[] DEFAULT NULL::text[], p_celeb_realities text[] DEFAULT NULL::text[], p_birth_year_min integer DEFAULT NULL::integer, p_birth_year_max integer DEFAULT NULL::integer, p_faction_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, slug text, nickname text, nickname_en text, avatar_url text, portrait_url text, profession text, title text, title_en text, consumption_philosophy text, consumption_philosophy_en text, nationality text, birth_date text, death_date text, bio text, bio_en text, is_verified boolean, claimed_by_member_id uuid, follower_count bigint, total_score integer, content_count bigint, created_at timestamp with time zone, publication_status text, celeb_tier text, celeb_reality text, gender boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_faction_id uuid := coalesce(p_faction_id, p_tag_id);
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
        v_faction_id is null
        or exists (
          select 1
          from public.faction_members as assignment
          where assignment.celeb_id = celeb.id
            and assignment.lv2_id = v_faction_id
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
      -- Influence and recorded works keep little-known figures from dominating
      -- the first page; the date hash rotates people of comparable merit.
      -- Living figures (no recorded death, born 1900 or later) and
      -- entrepreneurs get a small utility bonus on top of the merit score.
      0.50 * (least(greatest(coalesce(influence.total_score, 0), 30), 90) - 30) / 60.0
      + 0.15 * least(ln(candidate.computed_content_count + 1) / ln(51.0), 1.0)
      + 0.35 * (('x' || substr(md5(candidate.id::text || current_date::text), 1, 8))::bit(32)::bigint) / 4294967295.0
      + 0.08 * (case when candidate.death_date is null and candidate.computed_birth_year >= 1900 then 1 else 0 end)
      + 0.05 * (case when candidate.profession = 'entrepreneur' then 1 else 0 end)
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
