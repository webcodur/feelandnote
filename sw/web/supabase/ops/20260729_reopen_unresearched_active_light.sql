-- 전면 조사 없이 confirmed_empty로 잘못 닫힌 활성 Light 167명을 open으로 복구한다.
--
-- 앤서니 암스트롱(anthony-armstrong)만 BOOK / VIDEO / GAME / MUSIC 전 유형을
-- 실제로 조사한 0건 확정 인물이므로 confirmed_empty를 유지한다.
--
-- 기존 오적용 이력:
--   sw/web/supabase/ops/20260729_confirm_researched_active_light_empty.sql
--
-- 이 파일은 기존 SQL의 역실행이 아니다. 현재 실DB의 정확한 상태를 가드한 뒤
-- 의미상 잘못 닫힌 167명만 새 상태 변경으로 복구한다.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- 아래 사전 검사와 UPDATE 사이에 profiles/user_contents가 바뀌어 판정이
-- 엇갈리지 않도록 짧게 쓰기를 잠근다.
LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.user_contents IN SHARE MODE;

DO $$
DECLARE
  active_confirmed_empty_count integer;
  active_confirmed_empty_with_content_count integer;
  anthony_count integer;
  anthony_with_content_count integer;
  recovery_candidate_count integer;
  inactive_queued_count integer;
  inactive_deferred_count integer;
  inactive_unexpected_count integer;
  updated_count integer;
BEGIN
  SELECT count(*)
  INTO active_confirmed_empty_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'confirmed_empty';

  IF active_confirmed_empty_count <> 168 THEN
    RAISE EXCEPTION
      '복구 전 활성 Light confirmed_empty가 예상 168명과 다릅니다. actual=%',
      active_confirmed_empty_count;
  END IF;

  SELECT count(*)
  INTO anthony_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.slug = 'anthony-armstrong'
    AND p.content_research_status = 'confirmed_empty';

  IF anthony_count <> 1 THEN
    RAISE EXCEPTION
      '앤서니 암스트롱 확정 없음 행이 정확히 1개가 아닙니다. actual=%',
      anthony_count;
  END IF;

  SELECT count(DISTINCT p.id)
  INTO active_confirmed_empty_with_content_count
  FROM public.profiles p
  JOIN public.user_contents uc
    ON uc.user_id = p.id
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'confirmed_empty';

  IF active_confirmed_empty_with_content_count <> 0 THEN
    RAISE EXCEPTION
      '복구 대상군에 실제 콘텐츠 보유자가 있습니다. actual=%',
      active_confirmed_empty_with_content_count;
  END IF;

  SELECT count(*)
  INTO anthony_with_content_count
  FROM public.user_contents uc
  JOIN public.profiles p
    ON p.id = uc.user_id
  WHERE p.profile_type = 'CELEB'
    AND p.slug = 'anthony-armstrong';

  IF anthony_with_content_count <> 0 THEN
    RAISE EXCEPTION
      '앤서니 암스트롱에게 실제 콘텐츠가 생겼습니다. actual=%',
      anthony_with_content_count;
  END IF;

  SELECT count(*)
  INTO recovery_candidate_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'confirmed_empty'
    AND p.slug <> 'anthony-armstrong';

  IF recovery_candidate_count <> 167 THEN
    RAISE EXCEPTION
      '앤서니 제외 복구 대상이 예상 167명과 다릅니다. actual=%',
      recovery_candidate_count;
  END IF;

  SELECT
    count(*) FILTER (WHERE p.content_research_status = 'queued'),
    count(*) FILTER (WHERE p.content_research_status = 'deferred'),
    count(*) FILTER (
      WHERE p.content_research_status NOT IN ('queued', 'deferred')
    )
  INTO
    inactive_queued_count,
    inactive_deferred_count,
    inactive_unexpected_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'inactive'
    AND p.celeb_tier = 'light';

  IF inactive_queued_count <> 153
     OR inactive_deferred_count <> 148
     OR inactive_unexpected_count <> 0 THEN
    RAISE EXCEPTION
      '복구 전 비활성 Light 상태가 예상과 다릅니다. queued=% deferred=% unexpected=%',
      inactive_queued_count,
      inactive_deferred_count,
      inactive_unexpected_count;
  END IF;

  UPDATE public.profiles p
  SET content_research_status = 'open'
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'confirmed_empty'
    AND p.slug <> 'anthony-armstrong';

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count <> 167 THEN
    RAISE EXCEPTION
      '복구 변경 수가 예상과 다릅니다. expected=167 actual=%',
      updated_count;
  END IF;
END;
$$;

DO $$
DECLARE
  active_open_count integer;
  active_confirmed_empty_count integer;
  active_unexpected_count integer;
  anthony_confirmed_empty_count integer;
  reopened_with_content_count integer;
  reopened_with_confirmed_timestamp_count integer;
  reopened_without_updated_timestamp_count integer;
  inactive_queued_count integer;
  inactive_deferred_count integer;
  inactive_unexpected_count integer;
BEGIN
  SELECT
    count(*) FILTER (WHERE p.content_research_status = 'open'),
    count(*) FILTER (WHERE p.content_research_status = 'confirmed_empty'),
    count(*) FILTER (
      WHERE p.content_research_status NOT IN ('open', 'confirmed_empty')
    )
  INTO
    active_open_count,
    active_confirmed_empty_count,
    active_unexpected_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light';

  SELECT count(*)
  INTO anthony_confirmed_empty_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.slug = 'anthony-armstrong'
    AND p.content_research_status = 'confirmed_empty'
    AND p.content_research_confirmed_empty_at IS NOT NULL;

  SELECT count(DISTINCT p.id)
  INTO reopened_with_content_count
  FROM public.profiles p
  JOIN public.user_contents uc
    ON uc.user_id = p.id
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'open';

  SELECT count(*)
  INTO reopened_with_confirmed_timestamp_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'open'
    AND p.content_research_confirmed_empty_at IS NOT NULL;

  SELECT count(*)
  INTO reopened_without_updated_timestamp_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'open'
    AND p.content_research_updated_at IS NULL;

  SELECT
    count(*) FILTER (WHERE p.content_research_status = 'queued'),
    count(*) FILTER (WHERE p.content_research_status = 'deferred'),
    count(*) FILTER (
      WHERE p.content_research_status NOT IN ('queued', 'deferred')
    )
  INTO
    inactive_queued_count,
    inactive_deferred_count,
    inactive_unexpected_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'inactive'
    AND p.celeb_tier = 'light';

  IF active_open_count <> 167
     OR active_confirmed_empty_count <> 1
     OR active_unexpected_count <> 0
     OR anthony_confirmed_empty_count <> 1
     OR reopened_with_content_count <> 0
     OR reopened_with_confirmed_timestamp_count <> 0
     OR reopened_without_updated_timestamp_count <> 0
     OR inactive_queued_count <> 153
     OR inactive_deferred_count <> 148
     OR inactive_unexpected_count <> 0 THEN
    RAISE EXCEPTION
      '복구 후 감사 실패: active_open=%, active_confirmed_empty=%, active_unexpected=%, anthony_confirmed=%, reopened_with_content=%, reopened_with_confirmed_at=%, reopened_without_updated_at=%, inactive_queued=%, inactive_deferred=%, inactive_unexpected=%',
      active_open_count,
      active_confirmed_empty_count,
      active_unexpected_count,
      anthony_confirmed_empty_count,
      reopened_with_content_count,
      reopened_with_confirmed_timestamp_count,
      reopened_without_updated_timestamp_count,
      inactive_queued_count,
      inactive_deferred_count,
      inactive_unexpected_count;
  END IF;
END;
$$;

COMMIT;
