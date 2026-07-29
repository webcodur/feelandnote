-- Light 콘텐츠 조사 상태 회수 작업의 최종 불변식을 읽기 전용으로 감사한다.
WITH celeb_counts AS (
  SELECT
    p.id,
    p.status,
    p.celeb_tier,
    p.content_research_status,
    p.content_research_updated_at,
    p.content_research_confirmed_empty_at,
    count(uc.content_id)::integer AS actual_content_count
  FROM public.profiles p
  LEFT JOIN public.user_contents uc
    ON uc.user_id = p.id
  WHERE p.profile_type = 'CELEB'
  GROUP BY p.id
),
inactive_light_zero AS (
  SELECT *
  FROM celeb_counts
  WHERE celeb_tier = 'light'
    AND status = 'inactive'
    AND actual_content_count = 0
),
defects AS (
  SELECT jsonb_build_object(
    'confirmed_empty_with_content', count(*) FILTER (
      WHERE content_research_status = 'confirmed_empty'
        AND actual_content_count > 0
    ),
    'confirmed_empty_missing_timestamp', count(*) FILTER (
      WHERE content_research_status = 'confirmed_empty'
        AND content_research_confirmed_empty_at IS NULL
    ),
    'nonempty_with_negative_display', count(*) FILTER (
      WHERE actual_content_count > 0
        AND CASE
          WHEN actual_content_count > 0 THEN actual_content_count
          WHEN content_research_status = 'confirmed_empty' THEN -1
          ELSE 0
        END < 0
    ),
    'inactive_zero_still_open', (
      SELECT count(*)
      FROM inactive_light_zero
      WHERE content_research_status = 'open'
    ),
    'inactive_zero_unexpected_status', (
      SELECT count(*)
      FROM inactive_light_zero
      WHERE content_research_status NOT IN ('queued', 'deferred', 'confirmed_empty')
    ),
    'queued_or_deferred_with_empty_timestamp', count(*) FILTER (
      WHERE content_research_status IN ('queued', 'deferred')
        AND content_research_updated_at IS NULL
    ),
    'queued_or_deferred_with_confirmed_empty_timestamp', count(*) FILTER (
      WHERE content_research_status IN ('queued', 'deferred')
        AND content_research_confirmed_empty_at IS NOT NULL
    ),
    'queued_or_deferred_with_content', count(*) FILTER (
      WHERE content_research_status IN ('queued', 'deferred')
        AND actual_content_count > 0
    ),
    'light_with_content', count(*) FILTER (
      WHERE celeb_tier = 'light'
        AND actual_content_count > 0
    ),
    'confirmed_empty_without_history_except_legacy', (
      SELECT count(*)
      FROM public.profiles p
      WHERE p.profile_type = 'CELEB'
        AND p.content_research_status = 'confirmed_empty'
        AND p.slug <> 'anthony-armstrong'
        AND NOT EXISTS (
          SELECT 1
          FROM public.celeb_content_research_runs r
          WHERE r.celeb_id = p.id
            AND r.status = 'completed'
        )
    ),
    'in_progress_run_without_researching_profile', (
      SELECT count(*)
      FROM public.celeb_content_research_runs r
      JOIN public.profiles p
        ON p.id = r.celeb_id
      WHERE r.status = 'in_progress'
        AND p.content_research_status <> 'researching'
    )
  ) AS value
  FROM celeb_counts
)
SELECT jsonb_build_object(
  'light_status_counts', (
    SELECT jsonb_object_agg(content_research_status, count)
    FROM (
      SELECT content_research_status, count(*) AS count
      FROM celeb_counts
      WHERE celeb_tier = 'light'
      GROUP BY content_research_status
      ORDER BY content_research_status
    ) counts
  ),
  'light_active_counts', (
    SELECT jsonb_object_agg(content_research_status, count)
    FROM (
      SELECT content_research_status, count(*) AS count
      FROM celeb_counts
      WHERE celeb_tier = 'light'
        AND status = 'active'
      GROUP BY content_research_status
      ORDER BY content_research_status
    ) counts
  ),
  'light_inactive_counts', (
    SELECT jsonb_object_agg(content_research_status, count)
    FROM (
      SELECT content_research_status, count(*) AS count
      FROM celeb_counts
      WHERE celeb_tier = 'light'
        AND status = 'inactive'
      GROUP BY content_research_status
      ORDER BY content_research_status
    ) counts
  ),
  'active_open_research_targets', (
    SELECT count(*)
    FROM celeb_counts
    WHERE celeb_tier = 'light'
      AND status = 'active'
      AND actual_content_count = 0
      AND content_research_status = 'open'
  ),
  'research_history', jsonb_build_object(
    'runs', (SELECT count(*) FROM public.celeb_content_research_runs),
    'in_progress', (
      SELECT count(*)
      FROM public.celeb_content_research_runs
      WHERE status = 'in_progress'
    ),
    'completed', (
      SELECT count(*)
      FROM public.celeb_content_research_runs
      WHERE status = 'completed'
    ),
    'legacy_confirmed_empty_without_history', (
      SELECT count(*)
      FROM public.profiles p
      WHERE p.profile_type = 'CELEB'
        AND p.slug = 'anthony-armstrong'
        AND p.content_research_status = 'confirmed_empty'
        AND NOT EXISTS (
          SELECT 1
          FROM public.celeb_content_research_runs r
          WHERE r.celeb_id = p.id
            AND r.status = 'completed'
        )
    )
  ),
  'confirmed_empty_profiles', (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'slug', p.slug,
        'nickname', p.nickname,
        'tier', p.celeb_tier,
        'status', p.status
      )
      ORDER BY p.slug
    )
    FROM public.profiles p
    WHERE p.profile_type = 'CELEB'
      AND p.content_research_status = 'confirmed_empty'
  ),
  'defects', (SELECT value FROM defects)
) AS audit;
