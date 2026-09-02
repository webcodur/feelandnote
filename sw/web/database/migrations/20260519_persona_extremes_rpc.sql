-- 20260519_persona_extremes_rpc.sql
-- 탐색 허브 페이지의 "비범한 인물" 섹션 데이터(getPersonaExtremes)를 RPC로 흡수한다.
--
-- 배경: 기존 server action은 celeb_persona(1,175행) + profiles를 통째로 받아 JS에서 16축별 1·2·3위와
--       dispositions 최하위를 집계했다. anon role statement_timeout 3초에 비해 직렬화·전송 비용이
--       빠듯해 캐시 쿨드 스타트 시 "canceling statement due to statement timeout"이 재발했다.
-- 효과: 집계·정렬을 DB에서 끝내고 payload를 5MB+ → 200KB로 줄여 anon 한도 안에서 안정 응답.

DROP FUNCTION IF EXISTS public.get_persona_extremes(int);
CREATE OR REPLACE FUNCTION public.get_persona_extremes(p_runners_up_limit int DEFAULT 2)
RETURNS jsonb
LANGUAGE plpgsql STABLE
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  WITH axes(axis, grp, ord) AS (
    VALUES
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
  base AS (
    SELECT p.id, p.slug, p.nickname, p.nickname_en, p.avatar_url, p.profession,
           p.title, p.title_en, COALESCE(p.has_voice, false) AS has_voice, cp.persona
    FROM public.celeb_persona cp
    JOIN public.profiles p ON p.id = cp.celeb_id
    WHERE p.status = 'active' AND p.profile_type = 'CELEB' AND p.celeb_tier = 'full'
      AND cp.persona IS NOT NULL
  ),
  candidates AS (
    SELECT a.axis, a.grp, a.ord, b.id,
           (b.persona->a.grp->a.axis->>'score')::int AS score
    FROM base b
    CROSS JOIN axes a
    WHERE b.persona->a.grp->a.axis->>'score' IS NOT NULL
  ),
  with_rank AS (
    SELECT c.*,
      row_number() OVER (PARTITION BY axis ORDER BY score DESC, id) AS rk_desc,
      row_number() OVER (PARTITION BY axis ORDER BY score ASC, id) AS rk_asc,
      count(*) OVER (PARTITION BY axis) AS total
    FROM candidates c
  ),
  score_groups AS (
    SELECT axis, score, count(*)::int AS cnt
    FROM candidates GROUP BY axis, score
  ),
  score_counts AS (
    SELECT axis, score,
      COALESCE(SUM(cnt) OVER (PARTITION BY axis ORDER BY score ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)::int AS below_count,
      COALESCE(SUM(cnt) OVER (PARTITION BY axis ORDER BY score DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)::int AS above_count
    FROM score_groups
  ),
  selected AS (
    SELECT * FROM with_rank
    WHERE rk_desc <= 1 + p_runners_up_limit
       OR (grp = 'dispositions' AND rk_asc = 1)
  ),
  selected_meta AS (
    SELECT s.axis, s.grp, s.ord, s.id, s.score, s.rk_desc, s.rk_asc, s.total,
           b.slug, b.nickname, b.nickname_en, b.avatar_url, b.profession,
           b.title, b.title_en, b.has_voice, b.persona,
           sc.below_count, sc.above_count
    FROM selected s
    JOIN base b ON b.id = s.id
    LEFT JOIN score_counts sc ON sc.axis = s.axis AND sc.score = s.score
  ),
  stats_per_celeb AS (
    SELECT u.id, agg.stats_with_reasons
    FROM (SELECT DISTINCT id, persona FROM selected_meta) u,
    LATERAL (
      SELECT jsonb_object_agg(all_axes.k, jsonb_build_object(
        'score', (all_axes.v->>'score')::int,
        'reason_ko', COALESCE(all_axes.v->>'reason_ko', ''),
        'reason_en', COALESCE(all_axes.v->>'reason_en', '')
      )) AS stats_with_reasons
      FROM (
        SELECT je.key AS k, je.value AS v FROM jsonb_each(u.persona->'abilities') je
        UNION ALL SELECT je.key, je.value FROM jsonb_each(u.persona->'inner_virtues') je
        UNION ALL SELECT je.key, je.value FROM jsonb_each(u.persona->'outer_virtues') je
        UNION ALL SELECT je.key, je.value FROM jsonb_each(u.persona->'dispositions') je
      ) all_axes
    ) agg
  )
  SELECT jsonb_agg(entry ORDER BY ord)
  INTO v_result
  FROM (
    SELECT
      w.ord,
      jsonb_build_object(
        'axis', w.axis,
        'group', w.grp,
        'score', w.score,
        'percentile', round((1 - w.below_count::numeric / w.total) * 100 * 10) / 10,
        'reason', jsonb_build_object(
          'ko', COALESCE(w.persona->w.grp->w.axis->>'reason_ko', ''),
          'en', COALESCE(w.persona->w.grp->w.axis->>'reason_en', '')
        ),
        'celeb', jsonb_build_object(
          'id', w.id, 'slug', w.slug, 'nickname', COALESCE(w.nickname, ''),
          'nickname_en', w.nickname_en, 'avatar_url', w.avatar_url,
          'profession', w.profession, 'title', w.title,
          'title_en', w.title_en, 'has_voice', w.has_voice,
          'stats', sw.stats_with_reasons
        ),
        'runnersUp', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', ru.id, 'slug', ru.slug, 'nickname', COALESCE(ru.nickname, ''),
            'nickname_en', ru.nickname_en, 'avatar_url', ru.avatar_url,
            'score', ru.score,
            'reason', jsonb_build_object(
              'ko', COALESCE(ru.persona->ru.grp->ru.axis->>'reason_ko', ''),
              'en', COALESCE(ru.persona->ru.grp->ru.axis->>'reason_en', '')
            ),
            'stats', spc.stats_with_reasons
          ) ORDER BY ru.rk_desc)
          FROM selected_meta ru
          LEFT JOIN stats_per_celeb spc ON spc.id = ru.id
          WHERE ru.axis = w.axis AND ru.rk_desc BETWEEN 2 AND 1 + p_runners_up_limit
        ), '[]'::jsonb),
        'opposing', CASE WHEN w.grp = 'dispositions' THEN
          (SELECT jsonb_build_object(
            'score', lo.score,
            'percentile', round(lo.above_count::numeric / lo.total * 100 * 10) / 10,
            'reason', jsonb_build_object(
              'ko', COALESCE(lo.persona->lo.grp->lo.axis->>'reason_ko', ''),
              'en', COALESCE(lo.persona->lo.grp->lo.axis->>'reason_en', '')
            ),
            'celeb', jsonb_build_object(
              'id', lo.id, 'slug', lo.slug, 'nickname', COALESCE(lo.nickname, ''),
              'nickname_en', lo.nickname_en, 'avatar_url', lo.avatar_url,
              'profession', lo.profession, 'title', lo.title,
              'title_en', lo.title_en, 'has_voice', lo.has_voice,
              'stats', spc_lo.stats_with_reasons
            )
          )
          FROM selected_meta lo
          LEFT JOIN stats_per_celeb spc_lo ON spc_lo.id = lo.id
          WHERE lo.axis = w.axis AND lo.rk_asc = 1
          LIMIT 1)
        END
      ) AS entry
    FROM selected_meta w
    LEFT JOIN stats_per_celeb sw ON sw.id = w.id
    WHERE w.rk_desc = 1
  ) outer_q;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_persona_extremes(int) TO anon, authenticated;
