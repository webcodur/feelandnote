-- 미궁(TrackerGame) 등용 후보 조회 RPC 교정
--
-- 기존 정의 결함:
--   1. profiles.quotes / quotes_en 참조 — 해당 컬럼 부재로 호출 시 항상 42703 에러
--      (명언은 celeb_dialogues.lines->quote 에서 별도 조회한다)
--   2. consumption_philosophy 반환 — 호출부(getTrackerRound)는 cultural_journey 를 읽는다
--   3. LIMIT 20 + random() — 결과가 unstable_cache 에 담겨 캐시 주기 내내 후보 20명 고정
--
-- 교정 방침:
--   - 자격 조건·반환 필드를 fallback 경로(getTrackerRoundFallback)와 일치시킨다
--   - 본문(cultural_journey·bio)은 반환하지 않는다 — 선정된 1명만 호출부가 별도 수신 (egress 절감)
--   - 전체 후보를 반환한다 — exclude 필터·랜덤 선택은 캐시 밖 호출부가 수행

DROP FUNCTION IF EXISTS public.get_tracker_candidates(text[]);

CREATE FUNCTION public.get_tracker_candidates(exclude_ids text[] DEFAULT '{}'::text[])
RETURNS TABLE(
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
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    p.id::text,
    p.slug,
    p.nickname,
    p.nickname_en,
    p.profession,
    p.avatar_url,
    p.nationality,
    p.birth_date,
    p.death_date
  FROM profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.cultural_journey IS NOT NULL
    AND p.cultural_journey != ''
    AND p.death_date IS NOT NULL
    AND p.death_date != ''
    AND (
      p.death_date LIKE '-%'
      OR (LEFT(p.death_date, 4) ~ '^\d+$' AND CAST(LEFT(p.death_date, 4) AS INT) <= 1920)
    )
    AND EXISTS (SELECT 1 FROM celeb_persona cp WHERE cp.celeb_id = p.id)
    AND (
      SELECT COUNT(*)
      FROM user_contents uc
      WHERE uc.user_id = p.id AND uc.review IS NOT NULL AND uc.review != ''
    ) >= 4
    AND p.id::text != ALL(exclude_ids);
$function$;
