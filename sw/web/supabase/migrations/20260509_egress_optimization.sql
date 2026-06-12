-- 20260509_egress_optimization.sql
-- Egress ?꾩닔 ?듭떖 ??ㅼ틪 4醫낆쓣 SQL ?⑥닔濡??≪닔???대씪?댁뼵??row ?≪텧 0?쇰줈 留뚮뱺??
-- ?곸슜 ???대씪?댁뼵??肄붾뱶 蹂寃?蹂꾨룄 PR)?먯꽌 RPC ?몄텧濡?援먯껜?쒕떎.
--
-- 諛곌꼍: scriptures/index.ts ??fetchUserContentCounts, getTodayFigure seed fallback,
--       getCelebBySlug ??typeCounts, getScripturesByProfession ??fetchAllUserContents
--       媛 移댁슫?몃쭔 ?꾩슂?섎㈃??row ?먯껜瑜??섏씠吏?ㅼ씠?섏쑝濡??앷퉴吏 諛쏆븘 ?≪텧?섎뜕 ?⑦꽩.
-- ?④낵: 罹먯떆 誘몄뒪 ?쒖젏?먮룄 egress 諛쒖깮 嫄곗쓽 0 (count/array_agg留??≪텧).

-- 1) USER ?꾨줈?꾩씠 ?묒꽦??肄섑뀗痢?ID蹂?移댁슫??(??fetchUserContentCounts ?泥?
DROP FUNCTION IF EXISTS public.get_user_content_counts(text);
CREATE OR REPLACE FUNCTION public.get_user_content_counts(p_category text DEFAULT NULL)
RETURNS TABLE(content_id text, user_count bigint)
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

-- 2) seed ?뚭퀬由ъ쬁 ?먭꺽(5媛??댁긽 怨듦컻 肄섑뀗痢?蹂댁쑀) ?쒖꽦 ???(??getTodayFigure fallback ?泥?
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

-- 3) ????쎌쓽 ??낅퀎 移댁슫??(??getCelebBySlug ??4 head:true count ?泥?
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

-- 4) 肄섑뀗痢?ID 紐⑸줉?????移댁슫??(??fetchGlobalCelebCounts ?泥?
DROP FUNCTION IF EXISTS public.get_celeb_content_counts(text[]);
CREATE OR REPLACE FUNCTION public.get_celeb_content_counts(p_content_ids text[])
RETURNS TABLE(content_id text, celeb_count bigint)
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

-- 沅뚰븳: anon, authenticated 紐⑤몢 ?몄텧 媛??(RLS 臾댁떆?섎뒗 SECURITY DEFINER ?꾨떂)
GRANT EXECUTE ON FUNCTION public.get_user_content_counts(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_seed_eligible_celebs() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_celeb_type_counts(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_celeb_content_counts(text[]) TO anon, authenticated;
