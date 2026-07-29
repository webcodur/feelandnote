SELECT
  row_number() OVER (ORDER BY p.created_at, p.id) AS remaining_order,
  p.id,
  p.slug,
  p.nickname,
  p.nickname_en,
  p.birth_date,
  p.death_date,
  p.nationality,
  p.profession,
  p.content_research_status,
  (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) AS content_count,
  (SELECT count(*) FROM public.celeb_content_research_runs r WHERE r.celeb_id = p.id) AS run_count
FROM public.profiles p
WHERE p.profile_type = 'CELEB'
  AND p.status = 'active'
  AND p.celeb_tier = 'light'
  AND p.content_research_status = 'open'
ORDER BY p.created_at, p.id
LIMIT 3;
