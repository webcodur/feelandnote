-- 20260308_fix_get_top_celebs_across_eras.sql
-- Fix get_top_celebs_across_eras to return nickname_en and title_en for i18n

DROP FUNCTION IF EXISTS public.get_top_celebs_across_eras(integer);

CREATE OR REPLACE FUNCTION public.get_top_celebs_across_eras(p_limit integer DEFAULT 3)
 RETURNS TABLE(id uuid, nickname text, nickname_en text, avatar_url text, title text, title_en text, influence integer, content_count bigint)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  WITH celeb_counts AS (
    SELECT 
      uc.user_id,
      COUNT(*) as cnt
    FROM user_contents uc
    INNER JOIN profiles p ON p.id = uc.user_id
    WHERE uc.status = 'FINISHED'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
    GROUP BY uc.user_id
    HAVING COUNT(*) >= 5
  )
  SELECT
    p.id,
    p.nickname,
    p.nickname_en,
    p.avatar_url,
    p.title,
    p.title_en,
    ci.total_score as influence,
    cc.cnt as content_count
  FROM celeb_counts cc
  INNER JOIN profiles p ON p.id = cc.user_id
  INNER JOIN celeb_influence ci ON ci.celeb_id = cc.user_id
  ORDER BY ci.total_score DESC
  LIMIT p_limit;
END;
$function$;
