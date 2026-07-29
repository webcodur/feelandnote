-- 비활성 + 감상여정 없음 Light 전원을 빠르게 선별한다.
--
-- 최초 기준선은 186명이었으나 2026-07-29에 비활성 해커 6명이 새로 등록되어
-- 실제 적용 시점의 전원은 192명이다. 과거 186명만 잘라 처리하지 않는다.
--
-- 운영 화면과 같은 우선순위 신호:
--   - 영향력 50 이상 +3, 35 이상 +2
--   - 1850년 이후 자료 풍부 직군 +2
--   - 세력도 연결 +1
--   - 합계 2 이상 queued, 미만 deferred
--
-- 결과:
--   - queued 87명
--   - deferred 105명
--   - 콘텐츠·tier·감상여정은 변경하지 않으며 confirmed_empty도 만들지 않는다.

BEGIN;

CREATE TEMP TABLE inactive_full_triage_decisions ON COMMIT DROP AS
WITH candidates AS (
  SELECT
    p.id,
    p.slug,
    p.nickname,
    p.profession,
    p.birth_date,
    coalesce(i.total_score, 0) AS influence_total,
    EXISTS (
      SELECT 1
      FROM public.celeb_tag_assignments cta
      WHERE cta.celeb_id = p.id
    ) AS faction_linked
  FROM public.profiles p
  LEFT JOIN public.celeb_influence i
    ON i.celeb_id = p.id
  WHERE p.profile_type = 'CELEB'
    AND p.celeb_tier = 'light'
    AND p.status = 'inactive'
    AND p.content_research_status = 'open'
    AND nullif(btrim(p.consumption_philosophy), '') IS NULL
    AND nullif(btrim(p.cultural_journey), '') IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_contents uc
      WHERE uc.user_id = p.id
    )
),
scored AS (
  SELECT
    c.*,
    CASE
      WHEN c.influence_total >= 50 THEN 3
      WHEN c.influence_total >= 35 THEN 2
      ELSE 0
    END
    + CASE
        WHEN nullif(substring(c.birth_date from '-?\d{1,4}'), '')::integer >= 1850
         AND c.profession IN (
           'entrepreneur', 'investor', 'scientist', 'humanities_scholar',
           'social_scientist', 'director', 'musician', 'visual_artist',
           'author', 'actor', 'influencer', 'athlete', 'politician'
         )
        THEN 2
        ELSE 0
      END
    + CASE WHEN c.faction_linked THEN 1 ELSE 0 END AS triage_score
  FROM candidates c
)
SELECT
  s.*,
  CASE WHEN s.triage_score >= 2 THEN 'queued' ELSE 'deferred' END AS next_status,
  concat_ws(
    ' · ',
    CASE
      WHEN s.influence_total >= 50 THEN '영향력 50+'
      WHEN s.influence_total >= 35 THEN '영향력 35+'
    END,
    CASE
      WHEN nullif(substring(s.birth_date from '-?\d{1,4}'), '')::integer >= 1850
       AND s.profession IN (
         'entrepreneur', 'investor', 'scientist', 'humanities_scholar',
         'social_scientist', 'director', 'musician', 'visual_artist',
         'author', 'actor', 'influencer', 'athlete', 'politician'
       )
      THEN '현대·자료풍부 직군'
    END,
    CASE WHEN s.faction_linked THEN '세력도 연결' END,
    CASE WHEN s.triage_score = 0 THEN '뚜렷한 선행 신호 없음' END
  ) AS reason
FROM scored s;

DO $$
DECLARE
  affected integer;
  wrong_count integer;
BEGIN
  SELECT count(*) INTO wrong_count
  FROM inactive_full_triage_decisions;

  IF wrong_count <> 192 THEN
    RAISE EXCEPTION
      '비활성 무단서 후보가 적용 기준선 192명과 다릅니다. 실제=%',
      wrong_count;
  END IF;

  SELECT count(*) INTO wrong_count
  FROM inactive_full_triage_decisions
  WHERE next_status = 'queued';

  IF wrong_count <> 87 THEN
    RAISE EXCEPTION '비활성 무단서 queued가 87명이 아닙니다. 실제=%', wrong_count;
  END IF;

  SELECT count(*) INTO wrong_count
  FROM inactive_full_triage_decisions
  WHERE next_status = 'deferred';

  IF wrong_count <> 105 THEN
    RAISE EXCEPTION '비활성 무단서 deferred가 105명이 아닙니다. 실제=%', wrong_count;
  END IF;

  -- 오늘 새로 합류한 6명도 현재 전원 선별에 포함됐는지 고정한다.
  SELECT count(*) INTO wrong_count
  FROM inactive_full_triage_decisions
  WHERE slug IN (
    'wang-dong',
    'sun-kailiang',
    'viktor-netyksho',
    'yuriy-andrienko',
    'park-jin-hyok',
    'rim-jong-hyok'
  );

  IF wrong_count <> 6 THEN
    RAISE EXCEPTION '신규 비활성 해커 6명이 전원 선별표에 없습니다. 실제=%', wrong_count;
  END IF;

  -- 계산 뒤에도 원격 기준선이 바뀌지 않았는지 다시 잠근다.
  SELECT count(*)
  INTO wrong_count
  FROM inactive_full_triage_decisions d
  LEFT JOIN public.profiles p
    ON p.id = d.id
  WHERE p.id IS NULL
     OR p.slug IS DISTINCT FROM d.slug
     OR p.profile_type IS DISTINCT FROM 'CELEB'
     OR p.celeb_tier IS DISTINCT FROM 'light'
     OR p.status IS DISTINCT FROM 'inactive'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR nullif(btrim(p.consumption_philosophy), '') IS NOT NULL
     OR nullif(btrim(p.cultural_journey), '') IS NOT NULL
     OR EXISTS (
       SELECT 1
       FROM public.user_contents uc
       WHERE uc.user_id = p.id
     );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '비활성 무단서 192명의 기준선이 달라졌습니다. 차이=%', wrong_count;
  END IF;

  UPDATE public.profiles p
  SET content_research_status = d.next_status
  FROM inactive_full_triage_decisions d
  WHERE p.id = d.id
    AND p.profile_type = 'CELEB'
    AND p.celeb_tier = 'light'
    AND p.status = 'inactive'
    AND p.content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 192 THEN
    RAISE EXCEPTION '비활성 무단서 상태 변경 행 수가 192가 아닙니다. 실제=%', affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM inactive_full_triage_decisions d
  JOIN public.profiles p
    ON p.id = d.id
  WHERE p.content_research_status IS DISTINCT FROM d.next_status
     OR p.celeb_tier IS DISTINCT FROM 'light'
     OR p.status IS DISTINCT FROM 'inactive'
     OR p.content_research_updated_at IS NULL
     OR p.content_research_confirmed_empty_at IS NOT NULL
     OR EXISTS (
       SELECT 1
       FROM public.user_contents uc
       WHERE uc.user_id = p.id
     );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '비활성 무단서 선별 후 상태 불변식 위반 인물=%', wrong_count;
  END IF;
END;
$$;

COMMIT;
