-- 20260509_egress_optimization.sql
-- Egress 누수 핵심 풀스캔 4종을 SQL 함수로 흡수해 클라이언트 row 송출 0으로 만든다.
-- 적용 후 클라이언트 코드 변경(별도 PR)에서 RPC 호출로 교체한다.
--
-- 배경: scriptures/index.ts 의 fetchUserContentCounts, getTodayFigure seed fallback,
--       getCelebBySlug 의 typeCounts, getScripturesByProfession 의 fetchAllUserContents
--       가 카운트만 필요하면서 row 자체를 페이지네이션으로 끝까지 받아 송출하던 패턴.
-- 효과: 캐시 미스 시점에도 egress 발생 거의 0 (count/array_agg만 송출).

-- 1) USER 프로필이 작성한 콘텐츠 ID별 카운트 (현 fetchUserContentCounts 대체)
DROP FUNCTION IF EXISTS public.get_user_content_counts(text);
CREATE OR REPLACE FUNCTION public.get_user_content_counts(p_category text DEFAULT NULL)
RETURNS TABLE(content_id uuid, user_count bigint)
LANGUAGE sql STABLE
AS $function$
  SELECT uc.content_id, COUNT(*)::bigint AS user_count
  FROM public.user_contents uc
  INNER JOIN public.profiles p ON p.id = uc.user_id
  INNER JOIN public.contents c ON c.id = uc.content_id
  WHERE p.profile_type = 'USER'
    AND uc.status = 'FINISHED'
    AND (p_category IS NULL OR c.type = p_category)
  GROUP BY uc.content_id;
$function$;

-- 2) seed 알고리즘 자격(5개 이상 공개 콘텐츠 보유) 활성 셀럽 (현 getTodayFigure fallback 대체)
DROP FUNCTION IF EXISTS public.get_seed_eligible_celebs();
CREATE OR REPLACE FUNCTION public.get_seed_eligible_celebs()
RETURNS TABLE(celeb_id uuid, content_count bigint)
LANGUAGE sql STABLE
AS $function$
  SELECT uc.user_id AS celeb_id, COUNT(*)::bigint AS content_count
  FROM public.user_contents uc
  INNER JOIN public.profiles p ON p.id = uc.user_id
  WHERE p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND uc.status = 'FINISHED'
    AND uc.visibility = 'public'
  GROUP BY uc.user_id
  HAVING COUNT(*) >= 5;
$function$;

-- 3) 한 셀럽의 타입별 카운트 (현 getCelebBySlug 의 4 head:true count 대체)
DROP FUNCTION IF EXISTS public.get_celeb_type_counts(uuid);
CREATE OR REPLACE FUNCTION public.get_celeb_type_counts(p_user_id uuid)
RETURNS TABLE(content_type text, total bigint)
LANGUAGE sql STABLE
AS $function$
  SELECT c.type::text AS content_type, COUNT(*)::bigint AS total
  FROM public.user_contents uc
  INNER JOIN public.contents c ON c.id = uc.content_id
  WHERE uc.user_id = p_user_id
  GROUP BY c.type;
$function$;

-- 4) 콘텐츠 ID 목록의 셀럽 카운트 (현 fetchGlobalCelebCounts 대체)
DROP FUNCTION IF EXISTS public.get_celeb_content_counts(uuid[]);
CREATE OR REPLACE FUNCTION public.get_celeb_content_counts(p_content_ids uuid[])
RETURNS TABLE(content_id uuid, celeb_count bigint)
LANGUAGE sql STABLE
AS $function$
  SELECT uc.content_id, COUNT(*)::bigint AS celeb_count
  FROM public.user_contents uc
  INNER JOIN public.profiles p ON p.id = uc.user_id
  WHERE uc.content_id = ANY(p_content_ids)
    AND p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND uc.status = 'FINISHED'
  GROUP BY uc.content_id;
$function$;

-- 권한: anon, authenticated 모두 호출 가능 (RLS 무시되는 SECURITY DEFINER 아님)
GRANT EXECUTE ON FUNCTION public.get_user_content_counts(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_seed_eligible_celebs() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_celeb_type_counts(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_celeb_content_counts(uuid[]) TO anon, authenticated;
