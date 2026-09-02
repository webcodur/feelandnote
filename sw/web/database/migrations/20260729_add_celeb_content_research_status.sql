-- 셀럽 콘텐츠 개수의 "열린 0 / 조사 완료 -1" 구분.
--
-- 실제 개수는 계속 user_contents에서 계산한다. 이 컬럼은 0건일 때만
-- "아직 열려 있음(open 등)"과 "조사했지만 없음(confirmed_empty)"을 가른다.
ALTER TABLE public.profiles
  ADD COLUMN content_research_status text NOT NULL DEFAULT 'open',
  ADD COLUMN content_research_updated_at timestamptz,
  ADD COLUMN content_research_confirmed_empty_at timestamptz;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_content_research_status_check
  CHECK (
    content_research_status IN (
      'open',
      'queued',
      'researching',
      'deferred',
      'confirmed_empty'
    )
  );

COMMENT ON COLUMN public.profiles.content_research_status IS
  '셀럽 콘텐츠 조사 상태. 실제 콘텐츠 0건일 때 open/queued/researching/deferred는 표시 0, confirmed_empty는 표시 -1.';

COMMENT ON COLUMN public.profiles.content_research_confirmed_empty_at IS
  '콘텐츠가 없음을 정식 조사로 확정한 시각. 단순 선별·검색 1회로는 채우지 않는다.';

CREATE INDEX profiles_celeb_content_research_queue_idx
  ON public.profiles (content_research_status, status, celeb_tier, id)
  WHERE profile_type = 'CELEB';

-- 콘텐츠가 있는 인물을 "확정 없음"으로 닫지 못하게 하고 상태 변경 시각을 기록한다.
CREATE OR REPLACE FUNCTION public.guard_celeb_content_research_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.content_research_status IS DISTINCT FROM OLD.content_research_status THEN
    IF NEW.content_research_status = 'confirmed_empty'
       AND EXISTS (
         SELECT 1
         FROM public.user_contents uc
         WHERE uc.user_id = NEW.id
       ) THEN
      RAISE EXCEPTION
        '콘텐츠가 등록된 인물은 confirmed_empty로 변경할 수 없습니다. celeb_id=%',
        NEW.id;
    END IF;

    NEW.content_research_updated_at := now();
    NEW.content_research_confirmed_empty_at :=
      CASE
        WHEN NEW.content_research_status = 'confirmed_empty' THEN now()
        ELSE NULL
      END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_celeb_content_research_status
BEFORE UPDATE OF content_research_status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_celeb_content_research_status();

-- "없음" 확정 뒤 콘텐츠가 발견되면 모순 상태를 자동으로 연다.
-- 실제 표시값은 이 트리거와 무관하게 user_contents 실측 양수를 우선한다.
CREATE OR REPLACE FUNCTION public.reopen_celeb_content_research_on_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET content_research_status = 'open'
  WHERE id = NEW.user_id
    AND profile_type = 'CELEB'
    AND content_research_status = 'confirmed_empty';

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reopen_celeb_content_research_on_content
AFTER INSERT OR UPDATE OF user_id ON public.user_contents
FOR EACH ROW
EXECUTE FUNCTION public.reopen_celeb_content_research_on_content();
