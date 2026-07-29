-- 2026-07-29 Light 콘텐츠 회수에서 검증을 마쳤지만 open/0으로 남겨 둔
-- 활성 167명을 confirmed_empty로 교정한다.
--
-- 감상여정은 당시 기존 조사 흔적을 회수하는 일회성 단서였을 뿐,
-- 최종 판정 조건이 아니다. 최종 표시값은 실제 user_contents 개수와
-- content_research_status만으로 결정한다.
--
-- 실행 전 실측:
--   - active/light/open: 167명
--   - 위 167명 중 실제 콘텐츠 보유: 0명
--   - active/light/confirmed_empty: 1명
--
-- 실행 후:
--   - active/light/open: 0명
--   - active/light/confirmed_empty: 168명
--   - inactive/light 상태는 불변

BEGIN;

DO $$
DECLARE
  candidate_count integer;
  candidate_with_content_count integer;
  updated_count integer;
BEGIN
  SELECT count(*)
  INTO candidate_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'open';

  IF candidate_count <> 167 THEN
    RAISE EXCEPTION
      '활성 Light open 대상이 예상 167명과 다릅니다. actual=%',
      candidate_count;
  END IF;

  SELECT count(DISTINCT p.id)
  INTO candidate_with_content_count
  FROM public.profiles p
  JOIN public.user_contents uc
    ON uc.user_id = p.id
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'open';

  IF candidate_with_content_count <> 0 THEN
    RAISE EXCEPTION
      '활성 Light open 대상 중 실제 콘텐츠 보유자가 있습니다. actual=%',
      candidate_with_content_count;
  END IF;

  UPDATE public.profiles p
  SET content_research_status = 'confirmed_empty'
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'open';

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count <> 167 THEN
    RAISE EXCEPTION
      '활성 Light 없음 확정 변경 수가 예상과 다릅니다. expected=167 actual=%',
      updated_count;
  END IF;
END;
$$;

DO $$
DECLARE
  active_open_count integer;
  active_confirmed_empty_count integer;
  inactive_confirmed_empty_count integer;
  confirmed_empty_with_content_count integer;
  confirmed_empty_without_timestamp_count integer;
BEGIN
  SELECT count(*)
  INTO active_open_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'open';

  SELECT count(*)
  INTO active_confirmed_empty_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'confirmed_empty';

  SELECT count(*)
  INTO inactive_confirmed_empty_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'inactive'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'confirmed_empty';

  SELECT count(DISTINCT p.id)
  INTO confirmed_empty_with_content_count
  FROM public.profiles p
  JOIN public.user_contents uc
    ON uc.user_id = p.id
  WHERE p.profile_type = 'CELEB'
    AND p.content_research_status = 'confirmed_empty';

  SELECT count(*)
  INTO confirmed_empty_without_timestamp_count
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.content_research_status = 'confirmed_empty'
    AND p.content_research_confirmed_empty_at IS NULL;

  IF active_open_count <> 0
     OR active_confirmed_empty_count <> 168
     OR inactive_confirmed_empty_count <> 0
     OR confirmed_empty_with_content_count <> 0
     OR confirmed_empty_without_timestamp_count <> 0 THEN
    RAISE EXCEPTION
      '교정 후 감사 실패: active_open=%, active_confirmed_empty=%, inactive_confirmed_empty=%, confirmed_with_content=%, confirmed_without_timestamp=%',
      active_open_count,
      active_confirmed_empty_count,
      inactive_confirmed_empty_count,
      confirmed_empty_with_content_count,
      confirmed_empty_without_timestamp_count;
  END IF;
END;
$$;

COMMIT;
