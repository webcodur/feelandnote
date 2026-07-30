-- User-directed administrative collapse of the legacy inactive Light queue.
--
-- This is not a synthetic research run. The 301 inactive Light celebrities with
-- zero user_contents are administratively marked confirmed_empty, and the legacy
-- queued/deferred states are removed from the database status model.
--
-- Safety contract:
--   - exact baseline: queued=153, deferred=148, total=301
--   - every target is inactive/Light/CELEB with zero user_contents and zero runs
--   - active profiles, contents, user_contents, and all research ledger tables
--     remain byte-for-byte unchanged
--   - only the research-status guard is disabled, only for the guarded update,
--     and it is restored immediately
--   - no research run, scope, finding, or source is created
--
-- Keep ROLLBACK for the first execution. Change only the final statement to
-- COMMIT after the dry-run result is verified.

BEGIN ISOLATION LEVEL SERIALIZABLE;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

LOCK TABLE
  public.profiles,
  public.user_contents,
  public.contents,
  public.celeb_content_research_runs,
  public.celeb_content_research_scopes,
  public.celeb_content_research_findings,
  public.celeb_content_research_sources
IN SHARE ROW EXCLUSIVE MODE;

DO $assert_baseline$
DECLARE
  v_target_count integer;
  v_queued_count integer;
  v_deferred_count integer;
  v_legacy_count integer;
  v_target_contents integer;
  v_target_runs integer;
  v_target_updated_at integer;
  v_target_confirmed_empty_at integer;
  v_constraint_def text;
BEGIN
  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE p.content_research_status = 'queued')::integer,
    count(*) FILTER (WHERE p.content_research_status = 'deferred')::integer,
    count(*) FILTER (WHERE p.content_research_updated_at IS NOT NULL)::integer,
    count(*) FILTER (
      WHERE p.content_research_confirmed_empty_at IS NOT NULL
    )::integer
  INTO
    v_target_count,
    v_queued_count,
    v_deferred_count,
    v_target_updated_at,
    v_target_confirmed_empty_at
  FROM public.profiles p
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'inactive'
    AND p.celeb_tier = 'light'
    AND p.content_research_status IN ('queued', 'deferred');

  IF v_target_count <> 301
     OR v_queued_count <> 153
     OR v_deferred_count <> 148
     OR v_target_updated_at <> 301
     OR v_target_confirmed_empty_at <> 0
  THEN
    RAISE EXCEPTION
      'inactive Light baseline mismatch: total=%, queued=%, deferred=%, updated_at=%, confirmed_empty_at=%',
      v_target_count,
      v_queued_count,
      v_deferred_count,
      v_target_updated_at,
      v_target_confirmed_empty_at;
  END IF;

  SELECT count(*)::integer
  INTO v_legacy_count
  FROM public.profiles p
  WHERE p.content_research_status IN ('queued', 'deferred');

  IF v_legacy_count <> 301 THEN
    RAISE EXCEPTION
      'queued/deferred exists outside the exact 301 targets: global legacy count=%',
      v_legacy_count;
  END IF;

  SELECT count(*)::integer
  INTO v_target_contents
  FROM public.user_contents uc
  JOIN public.profiles p ON p.id = uc.user_id
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'inactive'
    AND p.celeb_tier = 'light'
    AND p.content_research_status IN ('queued', 'deferred');

  IF v_target_contents <> 0 THEN
    RAISE EXCEPTION
      'administrative collapse target has user_contents rows: %',
      v_target_contents;
  END IF;

  SELECT count(*)::integer
  INTO v_target_runs
  FROM public.celeb_content_research_runs r
  JOIN public.profiles p ON p.id = r.celeb_id
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'inactive'
    AND p.celeb_tier = 'light'
    AND p.content_research_status IN ('queued', 'deferred');

  IF v_target_runs <> 0 THEN
    RAISE EXCEPTION
      'administrative collapse must not rewrite celebrities with research runs: %',
      v_target_runs;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.profiles'::regclass
      AND t.tgname = 'trg_guard_celeb_content_research_status'
      AND NOT t.tgisinternal
      AND t.tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION
      'trg_guard_celeb_content_research_status is missing or not enabled normally';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.profiles'::regclass
      AND t.tgname = 'trg_celeb_full_requires_content'
      AND NOT t.tgisinternal
      AND t.tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION
      'trg_celeb_full_requires_content is missing or not enabled normally';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.user_contents'::regclass
      AND t.tgname = 'trg_reopen_celeb_content_research_on_content'
      AND NOT t.tgisinternal
      AND t.tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION
      'trg_reopen_celeb_content_research_on_content is missing or not enabled normally';
  END IF;

  SELECT pg_get_constraintdef(c.oid, true)
  INTO v_constraint_def
  FROM pg_constraint c
  WHERE c.conrelid = 'public.profiles'::regclass
    AND c.conname = 'profiles_content_research_status_check'
    AND c.contype = 'c';

  IF v_constraint_def IS NULL
     OR position('queued' IN v_constraint_def) = 0
     OR position('deferred' IN v_constraint_def) = 0
     OR position('confirmed_empty' IN v_constraint_def) = 0
  THEN
    RAISE EXCEPTION
      'unexpected pre-collapse content research constraint: %',
      coalesce(v_constraint_def, '<missing>');
  END IF;
END
$assert_baseline$;

CREATE TEMP TABLE collapse_inactive_light_targets
ON COMMIT DROP
AS
SELECT
  p.id,
  p.content_research_status AS original_research_status,
  md5(
    (
      to_jsonb(p)
      - 'content_research_status'
      - 'content_research_updated_at'
      - 'content_research_confirmed_empty_at'
    )::text
  ) AS immutable_profile_hash
FROM public.profiles p
WHERE p.profile_type = 'CELEB'
  AND p.status = 'inactive'
  AND p.celeb_tier = 'light'
  AND p.content_research_status IN ('queued', 'deferred');

ALTER TABLE collapse_inactive_light_targets
  ADD PRIMARY KEY (id);

CREATE TEMP TABLE collapse_inactive_light_baseline
ON COMMIT DROP
AS
SELECT
  (
    SELECT md5(
      coalesce(
        string_agg(md5(to_jsonb(p)::text), '' ORDER BY p.id::text),
        ''
      )
    )
    FROM public.profiles p
    WHERE p.status = 'active'
  ) AS active_profiles_hash,
  (
    SELECT md5(
      coalesce(
        string_agg(md5(to_jsonb(c)::text), '' ORDER BY c.id::text),
        ''
      )
    )
    FROM public.contents c
  ) AS contents_hash,
  (
    SELECT md5(
      coalesce(
        string_agg(md5(to_jsonb(uc)::text), '' ORDER BY uc.id::text),
        ''
      )
    )
    FROM public.user_contents uc
  ) AS user_contents_hash,
  (
    SELECT md5(
      coalesce(
        string_agg(md5(to_jsonb(r)::text), '' ORDER BY r.id::text),
        ''
      )
    )
    FROM public.celeb_content_research_runs r
  ) AS runs_hash,
  (
    SELECT md5(
      coalesce(
        string_agg(
          md5(to_jsonb(s)::text),
          ''
          ORDER BY s.run_id::text, s.content_type
        ),
        ''
      )
    )
    FROM public.celeb_content_research_scopes s
  ) AS scopes_hash,
  (
    SELECT md5(
      coalesce(
        string_agg(md5(to_jsonb(f)::text), '' ORDER BY f.id::text),
        ''
      )
    )
    FROM public.celeb_content_research_findings f
  ) AS findings_hash,
  (
    SELECT md5(
      coalesce(
        string_agg(md5(to_jsonb(s)::text), '' ORDER BY s.id::text),
        ''
      )
    )
    FROM public.celeb_content_research_sources s
  ) AS sources_hash;

ALTER TABLE public.profiles
  DISABLE TRIGGER trg_guard_celeb_content_research_status;

DO $collapse$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.profiles p
  SET
    content_research_status = 'confirmed_empty',
    content_research_updated_at = transaction_timestamp(),
    content_research_confirmed_empty_at = transaction_timestamp()
  FROM collapse_inactive_light_targets t
  WHERE p.id = t.id
    AND p.profile_type = 'CELEB'
    AND p.status = 'inactive'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = t.original_research_status;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated <> 301 THEN
    RAISE EXCEPTION
      'administrative collapse updated % profiles instead of 301',
      v_updated;
  END IF;
END
$collapse$;

ALTER TABLE public.profiles
  ENABLE TRIGGER trg_guard_celeb_content_research_status;

DO $assert_guard_restored$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.profiles'::regclass
      AND t.tgname = 'trg_guard_celeb_content_research_status'
      AND NOT t.tgisinternal
      AND t.tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION
      'trg_guard_celeb_content_research_status was not restored immediately';
  END IF;
END
$assert_guard_restored$;

ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_content_research_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_content_research_status_check
  CHECK (
    content_research_status IN ('open', 'researching', 'confirmed_empty')
  );

DO $verify$
DECLARE
  v_target_count integer;
  v_invalid_target_count integer;
  v_legacy_count integer;
  v_target_contents integer;
  v_target_runs integer;
  v_target_immutable_mismatch integer;
  v_constraint_def text;
  v_baseline collapse_inactive_light_baseline%ROWTYPE;
  v_current_hash text;
BEGIN
  SELECT *
  INTO STRICT v_baseline
  FROM collapse_inactive_light_baseline;

  SELECT
    count(*)::integer,
    count(*) FILTER (
      WHERE p.content_research_status IS DISTINCT FROM 'confirmed_empty'
         OR p.content_research_updated_at IS NULL
         OR p.content_research_confirmed_empty_at IS NULL
         OR p.content_research_updated_at
              IS DISTINCT FROM p.content_research_confirmed_empty_at
    )::integer
  INTO v_target_count, v_invalid_target_count
  FROM public.profiles p
  JOIN collapse_inactive_light_targets t ON t.id = p.id;

  IF v_target_count <> 301 OR v_invalid_target_count <> 0 THEN
    RAISE EXCEPTION
      'collapsed target verification failed: total=%, invalid=%',
      v_target_count,
      v_invalid_target_count;
  END IF;

  SELECT count(*)::integer
  INTO v_legacy_count
  FROM public.profiles p
  WHERE p.content_research_status IN ('queued', 'deferred');

  IF v_legacy_count <> 0 THEN
    RAISE EXCEPTION
      'legacy queued/deferred statuses remain after collapse: %',
      v_legacy_count;
  END IF;

  SELECT count(*)::integer
  INTO v_target_contents
  FROM public.user_contents uc
  JOIN collapse_inactive_light_targets t ON t.id = uc.user_id;

  IF v_target_contents <> 0 THEN
    RAISE EXCEPTION
      'collapsed target unexpectedly has user_contents rows: %',
      v_target_contents;
  END IF;

  SELECT count(*)::integer
  INTO v_target_runs
  FROM public.celeb_content_research_runs r
  JOIN collapse_inactive_light_targets t ON t.id = r.celeb_id;

  IF v_target_runs <> 0 THEN
    RAISE EXCEPTION
      'synthetic research runs were created for administrative targets: %',
      v_target_runs;
  END IF;

  SELECT count(*)::integer
  INTO v_target_immutable_mismatch
  FROM public.profiles p
  JOIN collapse_inactive_light_targets t ON t.id = p.id
  WHERE md5(
    (
      to_jsonb(p)
      - 'content_research_status'
      - 'content_research_updated_at'
      - 'content_research_confirmed_empty_at'
    )::text
  ) IS DISTINCT FROM t.immutable_profile_hash;

  IF v_target_immutable_mismatch <> 0 THEN
    RAISE EXCEPTION
      'non-research profile fields changed for % administrative targets',
      v_target_immutable_mismatch;
  END IF;

  SELECT md5(
    coalesce(
      string_agg(md5(to_jsonb(p)::text), '' ORDER BY p.id::text),
      ''
    )
  )
  INTO v_current_hash
  FROM public.profiles p
  WHERE p.status = 'active';

  IF v_current_hash IS DISTINCT FROM v_baseline.active_profiles_hash THEN
    RAISE EXCEPTION 'active profiles changed during administrative collapse';
  END IF;

  SELECT md5(
    coalesce(
      string_agg(md5(to_jsonb(c)::text), '' ORDER BY c.id::text),
      ''
    )
  )
  INTO v_current_hash
  FROM public.contents c;

  IF v_current_hash IS DISTINCT FROM v_baseline.contents_hash THEN
    RAISE EXCEPTION 'contents changed during administrative collapse';
  END IF;

  SELECT md5(
    coalesce(
      string_agg(md5(to_jsonb(uc)::text), '' ORDER BY uc.id::text),
      ''
    )
  )
  INTO v_current_hash
  FROM public.user_contents uc;

  IF v_current_hash IS DISTINCT FROM v_baseline.user_contents_hash THEN
    RAISE EXCEPTION 'user_contents changed during administrative collapse';
  END IF;

  SELECT md5(
    coalesce(
      string_agg(md5(to_jsonb(r)::text), '' ORDER BY r.id::text),
      ''
    )
  )
  INTO v_current_hash
  FROM public.celeb_content_research_runs r;

  IF v_current_hash IS DISTINCT FROM v_baseline.runs_hash THEN
    RAISE EXCEPTION 'research runs changed during administrative collapse';
  END IF;

  SELECT md5(
    coalesce(
      string_agg(
        md5(to_jsonb(s)::text),
        ''
        ORDER BY s.run_id::text, s.content_type
      ),
      ''
    )
  )
  INTO v_current_hash
  FROM public.celeb_content_research_scopes s;

  IF v_current_hash IS DISTINCT FROM v_baseline.scopes_hash THEN
    RAISE EXCEPTION 'research scopes changed during administrative collapse';
  END IF;

  SELECT md5(
    coalesce(
      string_agg(md5(to_jsonb(f)::text), '' ORDER BY f.id::text),
      ''
    )
  )
  INTO v_current_hash
  FROM public.celeb_content_research_findings f;

  IF v_current_hash IS DISTINCT FROM v_baseline.findings_hash THEN
    RAISE EXCEPTION 'research findings changed during administrative collapse';
  END IF;

  SELECT md5(
    coalesce(
      string_agg(md5(to_jsonb(s)::text), '' ORDER BY s.id::text),
      ''
    )
  )
  INTO v_current_hash
  FROM public.celeb_content_research_sources s;

  IF v_current_hash IS DISTINCT FROM v_baseline.sources_hash THEN
    RAISE EXCEPTION 'research sources changed during administrative collapse';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.profiles'::regclass
      AND t.tgname = 'trg_guard_celeb_content_research_status'
      AND NOT t.tgisinternal
      AND t.tgenabled = 'O'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.profiles'::regclass
      AND t.tgname = 'trg_celeb_full_requires_content'
      AND NOT t.tgisinternal
      AND t.tgenabled = 'O'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.user_contents'::regclass
      AND t.tgname = 'trg_reopen_celeb_content_research_on_content'
      AND NOT t.tgisinternal
      AND t.tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'one or more content research guard triggers are not enabled';
  END IF;

  SELECT pg_get_constraintdef(c.oid, true)
  INTO v_constraint_def
  FROM pg_constraint c
  WHERE c.conrelid = 'public.profiles'::regclass
    AND c.conname = 'profiles_content_research_status_check'
    AND c.contype = 'c';

  IF v_constraint_def IS NULL
     OR position('queued' IN v_constraint_def) > 0
     OR position('deferred' IN v_constraint_def) > 0
     OR position('open' IN v_constraint_def) = 0
     OR position('researching' IN v_constraint_def) = 0
     OR position('confirmed_empty' IN v_constraint_def) = 0
  THEN
    RAISE EXCEPTION
      'post-collapse content research constraint mismatch: %',
      coalesce(v_constraint_def, '<missing>');
  END IF;
END
$verify$;

SELECT jsonb_build_object(
  'operation', 'user_directed_administrative_collapse',
  'synthetic_research_runs_created', 0,
  'collapsed_profiles', (
    SELECT count(*)::integer
    FROM collapse_inactive_light_targets
  ),
  'confirmed_empty_profiles', (
    SELECT count(*)::integer
    FROM public.profiles
    WHERE content_research_status = 'confirmed_empty'
  ),
  'legacy_queued_deferred_profiles', (
    SELECT count(*)::integer
    FROM public.profiles
    WHERE content_research_status IN ('queued', 'deferred')
  ),
  'research_table_counts', jsonb_build_object(
    'runs', (SELECT count(*)::integer FROM public.celeb_content_research_runs),
    'scopes', (SELECT count(*)::integer FROM public.celeb_content_research_scopes),
    'findings', (SELECT count(*)::integer FROM public.celeb_content_research_findings),
    'sources', (SELECT count(*)::integer FROM public.celeb_content_research_sources)
  ),
  'guard_trigger_enabled', (
    SELECT t.tgenabled = 'O'
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.profiles'::regclass
      AND t.tgname = 'trg_guard_celeb_content_research_status'
      AND NOT t.tgisinternal
  )
) AS result;

COMMIT;
