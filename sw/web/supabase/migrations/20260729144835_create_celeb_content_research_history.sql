-- 셀럽 콘텐츠 조사 이력 SSoT.
--
-- profiles.content_research_status는 현재 표시 상태만 보존한다. 이 네 테이블은
-- 어떤 이름과 범위로 무엇을 확인했고 왜 채택/기각했는지를 영속적으로 남긴다.
--
-- 구조:
--   runs     조사 실행 1회(인물·배치·조사자·표기 변형·동명이인 메모)
--   scopes   실행별 BOOK / VIDEO / GAME / MUSIC 완료 상태
--   findings 작품 후보의 채택·기각 판정
--   sources  확인한 출처 URL. finding_id가 NULL이면 유형 전체 조사 근거

CREATE TABLE public.celeb_content_research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  celeb_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  batch_key text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  researcher_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,
  researcher_label text NOT NULL,
  name_variants text[] NOT NULL,
  homonym_notes text,
  summary text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT celeb_content_research_runs_batch_key_check
    CHECK (length(btrim(batch_key)) > 0),
  CONSTRAINT celeb_content_research_runs_researcher_label_check
    CHECK (length(btrim(researcher_label)) > 0),
  CONSTRAINT celeb_content_research_runs_name_variants_check
    CHECK (cardinality(name_variants) > 0),
  CONSTRAINT celeb_content_research_runs_completed_at_check
    CHECK ((status = 'completed') = (completed_at IS NOT NULL)),
  CONSTRAINT celeb_content_research_runs_celeb_batch_key
    UNIQUE (celeb_id, batch_key)
);

CREATE UNIQUE INDEX celeb_content_research_runs_one_active_per_celeb_idx
  ON public.celeb_content_research_runs (celeb_id)
  WHERE status = 'in_progress';

CREATE INDEX celeb_content_research_runs_celeb_started_idx
  ON public.celeb_content_research_runs (celeb_id, started_at DESC);

CREATE TABLE public.celeb_content_research_scopes (
  run_id uuid NOT NULL
    REFERENCES public.celeb_content_research_runs(id) ON DELETE CASCADE,
  content_type text NOT NULL
    CHECK (content_type IN ('BOOK', 'VIDEO', 'GAME', 'MUSIC')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  search_notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, content_type),
  CONSTRAINT celeb_content_research_scopes_completed_at_check
    CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);

CREATE INDEX celeb_content_research_scopes_status_idx
  ON public.celeb_content_research_scopes (status, content_type, run_id);

CREATE TABLE public.celeb_content_research_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  content_type text NOT NULL
    CHECK (content_type IN ('BOOK', 'VIDEO', 'GAME', 'MUSIC')),
  decision text NOT NULL DEFAULT 'candidate'
    CHECK (decision IN ('candidate', 'accepted', 'rejected')),
  title text NOT NULL,
  creator text,
  content_id text
    REFERENCES public.contents(id) ON DELETE RESTRICT,
  evidence_summary text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT celeb_content_research_findings_scope_fkey
    FOREIGN KEY (run_id, content_type)
    REFERENCES public.celeb_content_research_scopes(run_id, content_type)
    ON DELETE CASCADE,
  CONSTRAINT celeb_content_research_findings_title_check
    CHECK (length(btrim(title)) > 0),
  CONSTRAINT celeb_content_research_findings_decision_shape_check
    CHECK (
      (
        decision = 'candidate'
        AND content_id IS NULL
        AND rejection_reason IS NULL
      )
      OR (
        decision = 'accepted'
        AND content_id IS NOT NULL
        AND evidence_summary IS NOT NULL
        AND length(btrim(evidence_summary)) > 0
        AND rejection_reason IS NULL
      )
      OR (
        decision = 'rejected'
        AND content_id IS NULL
        AND evidence_summary IS NOT NULL
        AND length(btrim(evidence_summary)) > 0
        AND rejection_reason IS NOT NULL
        AND length(btrim(rejection_reason)) > 0
      )
    ),
  CONSTRAINT celeb_content_research_findings_identity_key
    UNIQUE (id, run_id, content_type)
);

CREATE INDEX celeb_content_research_findings_run_type_idx
  ON public.celeb_content_research_findings (run_id, content_type, decision);

CREATE TABLE public.celeb_content_research_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  content_type text NOT NULL
    CHECK (content_type IN ('BOOK', 'VIDEO', 'GAME', 'MUSIC')),
  finding_id uuid,
  url text NOT NULL,
  source_tier text NOT NULL
    CHECK (source_tier IN ('primary', 'secondary')),
  source_kind text NOT NULL
    CHECK (
      source_kind IN (
        'direct_statement',
        'interview',
        'official_profile',
        'social_post',
        'transcript',
        'archive',
        'article',
        'other'
      )
    ),
  access_status text NOT NULL DEFAULT 'accessible'
    CHECK (access_status IN ('accessible', 'bot_blocked', 'archived', 'unavailable')),
  title text,
  notes text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT celeb_content_research_sources_scope_fkey
    FOREIGN KEY (run_id, content_type)
    REFERENCES public.celeb_content_research_scopes(run_id, content_type)
    ON DELETE CASCADE,
  CONSTRAINT celeb_content_research_sources_finding_fkey
    FOREIGN KEY (finding_id, run_id, content_type)
    REFERENCES public.celeb_content_research_findings(id, run_id, content_type)
    ON DELETE CASCADE,
  CONSTRAINT celeb_content_research_sources_url_check
    CHECK (url ~ '^https?://'),
  CONSTRAINT celeb_content_research_sources_run_url_finding_key
    UNIQUE NULLS NOT DISTINCT (run_id, url, finding_id)
);

CREATE INDEX celeb_content_research_sources_scope_idx
  ON public.celeb_content_research_sources (run_id, content_type);

CREATE INDEX celeb_content_research_sources_finding_idx
  ON public.celeb_content_research_sources (finding_id)
  WHERE finding_id IS NOT NULL;

COMMENT ON TABLE public.celeb_content_research_runs IS
  '셀럽별 콘텐츠 전면 조사 실행 이력. 감상여정과 분리된 조사 SSoT.';
COMMENT ON TABLE public.celeb_content_research_scopes IS
  '조사 실행별 BOOK/VIDEO/GAME/MUSIC 범위와 완료 여부.';
COMMENT ON TABLE public.celeb_content_research_findings IS
  '조사 중 확인한 작품 후보와 채택·기각 근거.';
COMMENT ON TABLE public.celeb_content_research_sources IS
  '조사 중 실제 확인한 출처 URL. primary/secondary를 구분한다.';

CREATE OR REPLACE FUNCTION public.touch_celeb_content_research_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_celeb_content_research_runs
BEFORE UPDATE ON public.celeb_content_research_runs
FOR EACH ROW
EXECUTE FUNCTION public.touch_celeb_content_research_history();

CREATE TRIGGER trg_touch_celeb_content_research_scopes
BEFORE UPDATE ON public.celeb_content_research_scopes
FOR EACH ROW
EXECUTE FUNCTION public.touch_celeb_content_research_history();

CREATE TRIGGER trg_touch_celeb_content_research_findings
BEFORE UPDATE ON public.celeb_content_research_findings
FOR EACH ROW
EXECUTE FUNCTION public.touch_celeb_content_research_history();

CREATE TRIGGER trg_touch_celeb_content_research_sources
BEFORE UPDATE ON public.celeb_content_research_sources
FOR EACH ROW
EXECUTE FUNCTION public.touch_celeb_content_research_history();

CREATE OR REPLACE FUNCTION public.initialize_celeb_content_research_scopes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.celeb_content_research_scopes (run_id, content_type)
  VALUES
    (NEW.id, 'BOOK'),
    (NEW.id, 'VIDEO'),
    (NEW.id, 'GAME'),
    (NEW.id, 'MUSIC');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_initialize_celeb_content_research_scopes
AFTER INSERT ON public.celeb_content_research_runs
FOR EACH ROW
EXECUTE FUNCTION public.initialize_celeb_content_research_scopes();

CREATE OR REPLACE FUNCTION public.guard_celeb_content_research_run_celeb()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status <> 'in_progress' THEN
    RAISE EXCEPTION
      '콘텐츠 조사 실행은 in_progress 상태로만 생성할 수 있습니다. status=%',
      NEW.status;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = NEW.celeb_id
      AND p.profile_type = 'CELEB'
  ) THEN
    RAISE EXCEPTION
      '콘텐츠 조사 실행은 CELEB 프로필에만 만들 수 있습니다. celeb_id=%',
      NEW.celeb_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_celeb_content_research_run_celeb
BEFORE INSERT OR UPDATE OF celeb_id ON public.celeb_content_research_runs
FOR EACH ROW
EXECUTE FUNCTION public.guard_celeb_content_research_run_celeb();

CREATE OR REPLACE FUNCTION public.assert_celeb_content_research_run_ready(
  target_run_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_celeb_id uuid;
  scope_count integer;
  completed_scope_count integer;
  scope_without_source_count integer;
  unresolved_finding_count integer;
  finding_without_source_count integer;
  accepted_without_primary_count integer;
  accepted_link_mismatch_count integer;
  accepted_type_mismatch_count integer;
BEGIN
  SELECT r.celeb_id
  INTO target_celeb_id
  FROM public.celeb_content_research_runs r
  WHERE r.id = target_run_id;

  IF target_celeb_id IS NULL THEN
    RAISE EXCEPTION '조사 실행을 찾을 수 없습니다. run_id=%', target_run_id;
  END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE s.status = 'completed')
  INTO scope_count, completed_scope_count
  FROM public.celeb_content_research_scopes s
  WHERE s.run_id = target_run_id;

  IF scope_count <> 4 OR completed_scope_count <> 4 THEN
    RAISE EXCEPTION
      'BOOK/VIDEO/GAME/MUSIC 네 유형을 모두 완료해야 합니다. total=% completed=%',
      scope_count,
      completed_scope_count;
  END IF;

  SELECT count(*)
  INTO scope_without_source_count
  FROM public.celeb_content_research_scopes s
  WHERE s.run_id = target_run_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.celeb_content_research_sources src
      WHERE src.run_id = s.run_id
        AND src.content_type = s.content_type
    );

  IF scope_without_source_count <> 0 THEN
    RAISE EXCEPTION
      '각 조사 유형에는 실제 확인한 출처 URL이 하나 이상 필요합니다. missing_scopes=%',
      scope_without_source_count;
  END IF;

  SELECT count(*)
  INTO unresolved_finding_count
  FROM public.celeb_content_research_findings f
  WHERE f.run_id = target_run_id
    AND f.decision = 'candidate';

  IF unresolved_finding_count <> 0 THEN
    RAISE EXCEPTION
      '미판정 후보가 남아 있습니다. unresolved=%',
      unresolved_finding_count;
  END IF;

  SELECT count(*)
  INTO finding_without_source_count
  FROM public.celeb_content_research_findings f
  WHERE f.run_id = target_run_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.celeb_content_research_sources src
      WHERE src.finding_id = f.id
    );

  IF finding_without_source_count <> 0 THEN
    RAISE EXCEPTION
      '채택·기각 판정마다 출처 URL이 하나 이상 필요합니다. missing_findings=%',
      finding_without_source_count;
  END IF;

  SELECT count(*)
  INTO accepted_without_primary_count
  FROM public.celeb_content_research_findings f
  WHERE f.run_id = target_run_id
    AND f.decision = 'accepted'
    AND NOT EXISTS (
      SELECT 1
      FROM public.celeb_content_research_sources src
      WHERE src.finding_id = f.id
        AND src.source_tier = 'primary'
    );

  IF accepted_without_primary_count <> 0 THEN
    RAISE EXCEPTION
      '채택 작품마다 1차 출처가 하나 이상 필요합니다. missing_accepted=%',
      accepted_without_primary_count;
  END IF;

  SELECT count(*)
  INTO accepted_link_mismatch_count
  FROM public.celeb_content_research_findings f
  WHERE f.run_id = target_run_id
    AND f.decision = 'accepted'
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_contents uc
      WHERE uc.user_id = target_celeb_id
        AND uc.content_id = f.content_id
    );

  IF accepted_link_mismatch_count <> 0 THEN
    RAISE EXCEPTION
      '채택 작품이 인물의 user_contents에 연결되지 않았습니다. missing_links=%',
      accepted_link_mismatch_count;
  END IF;

  SELECT count(*)
  INTO accepted_type_mismatch_count
  FROM public.celeb_content_research_findings f
  JOIN public.contents c
    ON c.id = f.content_id
  WHERE f.run_id = target_run_id
    AND f.decision = 'accepted'
    AND c.type IS DISTINCT FROM f.content_type;

  IF accepted_type_mismatch_count <> 0 THEN
    RAISE EXCEPTION
      '채택 작품의 조사 유형과 콘텐츠 메타 유형이 다릅니다. mismatches=%',
      accepted_type_mismatch_count;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_celeb_content_research_run_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION '완료된 콘텐츠 조사 실행은 수정할 수 없습니다. run_id=%', OLD.id;
  END IF;

  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.assert_celeb_content_research_run_ready(NEW.id);
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_celeb_content_research_run_completion
BEFORE UPDATE ON public.celeb_content_research_runs
FOR EACH ROW
EXECUTE FUNCTION public.guard_celeb_content_research_run_completion();

CREATE OR REPLACE FUNCTION public.complete_celeb_content_research_run(
  target_run_id uuid
)
RETURNS TABLE (
  celeb_id uuid,
  final_research_status text,
  actual_content_count bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_celeb_id uuid;
  target_run_status text;
  measured_content_count bigint;
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
      '진행 중인 조사만 완료할 수 있습니다. run_id=% status=%',
      target_run_id,
      target_run_status;
  END IF;

  -- 완료 전환 트리거가 네 유형·출처·후보 판정·실제 연결을 검증한다.
  UPDATE public.celeb_content_research_runs r
  SET status = 'completed'
  WHERE r.id = target_run_id;

  SELECT count(*)
  INTO measured_content_count
  FROM public.user_contents uc
  WHERE uc.user_id = target_celeb_id;

  UPDATE public.profiles p
  SET content_research_status =
    CASE
      WHEN measured_content_count = 0 THEN 'confirmed_empty'
      ELSE 'open'
    END
  WHERE p.id = target_celeb_id
    AND p.profile_type = 'CELEB';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CELEB 프로필을 찾을 수 없습니다. celeb_id=%', target_celeb_id;
  END IF;

  RETURN QUERY
  SELECT
    target_celeb_id,
    CASE
      WHEN measured_content_count = 0 THEN 'confirmed_empty'::text
      ELSE 'open'::text
    END,
    measured_content_count;
END;
$$;

-- 조사 이력 없는 수동 confirmed_empty 전환을 DB에서도 차단한다.
-- 기존 앤서니 암스트롱 1명은 이미 확정 상태이므로 이 변경의 영향을 받지 않는다.
CREATE OR REPLACE FUNCTION public.guard_celeb_content_research_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.content_research_status IS DISTINCT FROM OLD.content_research_status THEN
    IF NEW.content_research_status = 'confirmed_empty' THEN
      IF EXISTS (
        SELECT 1
        FROM public.user_contents uc
        WHERE uc.user_id = NEW.id
      ) THEN
        RAISE EXCEPTION
          '콘텐츠가 등록된 인물은 confirmed_empty로 변경할 수 없습니다. celeb_id=%',
          NEW.id;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM public.celeb_content_research_runs r
        WHERE r.celeb_id = NEW.id
          AND r.status = 'completed'
          AND r.completed_at = (
            SELECT max(latest.completed_at)
            FROM public.celeb_content_research_runs latest
            WHERE latest.celeb_id = NEW.id
              AND latest.status = 'completed'
          )
          AND NOT EXISTS (
            SELECT 1
            FROM public.celeb_content_research_findings f
            WHERE f.run_id = r.id
              AND f.decision = 'accepted'
          )
      ) THEN
        RAISE EXCEPTION
          '네 유형 조사 이력 없이 confirmed_empty로 변경할 수 없습니다. celeb_id=%',
          NEW.id;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.celeb_content_research_runs r
        WHERE r.celeb_id = NEW.id
          AND r.status = 'in_progress'
      ) THEN
        RAISE EXCEPTION
          '진행 중인 조사 실행이 있어 confirmed_empty로 변경할 수 없습니다. celeb_id=%',
          NEW.id;
      END IF;
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

ALTER TABLE public.celeb_content_research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celeb_content_research_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celeb_content_research_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celeb_content_research_sources ENABLE ROW LEVEL SECURITY;

-- 조사 이력은 관리자 작업 자료이며 사용자 Data API에 공개하지 않는다.
REVOKE ALL ON TABLE public.celeb_content_research_runs
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.celeb_content_research_scopes
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.celeb_content_research_findings
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.celeb_content_research_sources
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.celeb_content_research_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.celeb_content_research_scopes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.celeb_content_research_findings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.celeb_content_research_sources TO service_role;

REVOKE ALL ON FUNCTION public.touch_celeb_content_research_history()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.initialize_celeb_content_research_scopes()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_celeb_content_research_run_celeb()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_celeb_content_research_run_ready(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_celeb_content_research_run_completion()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_celeb_content_research_run(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_celeb_content_research_status()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.complete_celeb_content_research_run(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.assert_celeb_content_research_run_ready(uuid)
  TO service_role;
