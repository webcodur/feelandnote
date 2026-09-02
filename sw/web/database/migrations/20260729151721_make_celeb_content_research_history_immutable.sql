-- Starting a run and exposing the researching state must be one transaction.
CREATE OR REPLACE FUNCTION public.mark_celeb_content_research_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles p
  SET content_research_status = 'researching'
  WHERE p.id = NEW.celeb_id
    AND p.profile_type = 'CELEB';

  IF NOT FOUND THEN
    RAISE EXCEPTION '조사 대상 CELEB 프로필을 찾을 수 없습니다. celeb_id=%', NEW.celeb_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mark_celeb_content_research_started
AFTER INSERT ON public.celeb_content_research_runs
FOR EACH ROW
EXECUTE FUNCTION public.mark_celeb_content_research_started();

-- A closed run is an audit record. Neither its header nor children may be edited.
CREATE OR REPLACE FUNCTION public.guard_closed_celeb_content_research_run()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      '콘텐츠 조사 실행은 삭제할 수 없습니다. 취소 상태로 보존하세요. run_id=%',
      OLD.id;
  END IF;

  IF OLD.status <> 'in_progress' THEN
    RAISE EXCEPTION
      '완료·취소된 콘텐츠 조사 실행은 수정하거나 삭제할 수 없습니다. run_id=% status=%',
      OLD.id,
      OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_closed_celeb_content_research_run
BEFORE UPDATE OR DELETE ON public.celeb_content_research_runs
FOR EACH ROW
EXECUTE FUNCTION public.guard_closed_celeb_content_research_run();

CREATE OR REPLACE FUNCTION public.guard_celeb_content_research_child_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_run_id uuid;
  previous_run_id uuid;
  target_status text;
BEGIN
  target_run_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.run_id ELSE NEW.run_id END;
  previous_run_id := CASE WHEN TG_OP = 'UPDATE' THEN OLD.run_id ELSE NULL END;

  SELECT r.status
  INTO target_status
  FROM public.celeb_content_research_runs r
  WHERE r.id = target_run_id;

  IF target_status IS DISTINCT FROM 'in_progress' THEN
    RAISE EXCEPTION
      '진행 중인 조사 실행의 기록만 변경할 수 있습니다. run_id=% status=%',
      target_run_id,
      coalesce(target_status, 'missing');
  END IF;

  IF previous_run_id IS NOT NULL AND previous_run_id IS DISTINCT FROM target_run_id THEN
    SELECT r.status
    INTO target_status
    FROM public.celeb_content_research_runs r
    WHERE r.id = previous_run_id;

    IF target_status IS DISTINCT FROM 'in_progress' THEN
      RAISE EXCEPTION
        '닫힌 조사 실행에서 기록을 옮길 수 없습니다. run_id=% status=%',
        previous_run_id,
        coalesce(target_status, 'missing');
    END IF;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER trg_guard_celeb_content_research_scope_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.celeb_content_research_scopes
FOR EACH ROW
EXECUTE FUNCTION public.guard_celeb_content_research_child_mutation();

CREATE TRIGGER trg_guard_celeb_content_research_finding_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.celeb_content_research_findings
FOR EACH ROW
EXECUTE FUNCTION public.guard_celeb_content_research_child_mutation();

CREATE TRIGGER trg_guard_celeb_content_research_source_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.celeb_content_research_sources
FOR EACH ROW
EXECUTE FUNCTION public.guard_celeb_content_research_child_mutation();

-- Cancelling the run and reopening the profile are one transaction.
CREATE OR REPLACE FUNCTION public.cancel_celeb_content_research_run(
  target_run_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_celeb_id uuid;
  target_run_status text;
BEGIN
  SELECT r.celeb_id, r.status
  INTO target_celeb_id, target_run_status
  FROM public.celeb_content_research_runs r
  WHERE r.id = target_run_id
  FOR UPDATE;

  IF target_celeb_id IS NULL THEN
    RAISE EXCEPTION '조사 실행을 찾을 수 없습니다. run_id=%', target_run_id;
  END IF;

  IF target_run_status <> 'in_progress' THEN
    RAISE EXCEPTION
      '진행 중인 조사만 취소할 수 있습니다. run_id=% status=%',
      target_run_id,
      target_run_status;
  END IF;

  UPDATE public.celeb_content_research_runs r
  SET status = 'cancelled'
  WHERE r.id = target_run_id;

  UPDATE public.profiles p
  SET content_research_status = 'open'
  WHERE p.id = target_celeb_id
    AND p.profile_type = 'CELEB';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CELEB 프로필을 찾을 수 없습니다. celeb_id=%', target_celeb_id;
  END IF;

  RETURN target_celeb_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_celeb_content_research_started()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_closed_celeb_content_research_run()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_celeb_content_research_child_mutation()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_celeb_content_research_run(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cancel_celeb_content_research_run(uuid)
  TO service_role;
