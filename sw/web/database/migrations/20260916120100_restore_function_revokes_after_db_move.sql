-- DB VM 이전 때 풀린 함수 실행 권한을 원래 의도대로 되돌린다.
--
-- 원인: public 스키마의 함수 기본 권한(pg_default_acl)이 새로 만든 함수마다
-- anon·authenticated·service_role 에 EXECUTE 를 붙인다. 26.09.11 dump → restore 로
-- 함수가 전부 다시 생성되면서, 앞선 마이그레이션이 회수해 둔 권한이 되살아났다.
-- 그 결과 익명 사용자가 공개 키만으로 운영 캐시 퍼지(web_revalidate_send)를
-- 반복 호출할 수 있었다(26.09.16 빈 태그 배열로 HTTP 204 확인).
--
-- 범위: 마이그레이션이 익명 회수를 의도했고, 앱이 익명으로 부르지 않으며,
-- RLS 정책이 참조하지 않는 함수만 되돌린다. 아래 셋은 회수하면 장애 위험이 있어 남긴다.
--   is_current_account_active          RLS 정책 16개가 익명 조회 중에 호출한다
--   get_current_account_access_state   로그인·OAuth 콜백 흐름에서 호출한다
--   create_recommendation_notification 호출 경로의 로그인 확인을 확정하지 못했다

-- 캐시 퍼지 경로는 트리거가 postgres 권한으로만 부른다. 가입하면 누구나 authenticated 가
-- 되므로 익명과 같이 막아 원래 계약(postgres 전용)으로 되돌린다.
revoke all on function public.web_revalidate_send(text[])
from public, anon, authenticated, service_role;
revoke all on function public.web_revalidate_trigger()
from public, anon, authenticated, service_role;
revoke all on function public.web_revalidate_celebs_list()
from public, anon, authenticated, service_role;
grant execute on function public.web_revalidate_send(text[]) to postgres;
grant execute on function public.web_revalidate_trigger() to postgres;
grant execute on function public.web_revalidate_celebs_list() to postgres;

-- 트리거 함수는 RPC 로 직접 부를 수 없고, 트리거 발동은 EXECUTE 권한을 검사하지 않는다.
revoke execute on function public.guard_celeb_content_research_confirmed_empty() from public, anon;
revoke execute on function public.guard_celeb_explanation_profile() from public, anon;
revoke execute on function public.lock_celeb_explanation_publication_writes() from public, anon;
revoke execute on function public.set_celeb_explanation_published_at() from public, anon;
revoke execute on function public.sync_celeb_explanation_publication_from_celebs() from public, anon;
revoke execute on function public.clear_celeb_content_research_confirmed_empty() from public, anon;
revoke execute on function public.promote_celeb_tier_on_first_content() from public, anon;
revoke execute on function public.touch_celeb_explanation_updated_at() from public, anon;
revoke execute on function public.touch_profile_updated_at() from public, anon;

-- 앱이 로그인 사용자·service_role 로만 부르는 함수다. 익명만 회수한다.
revoke execute on function public.apply_virtual_monologue_candidate(text, text, text) from public, anon;
revoke execute on function public.set_figure_book_relations(text, jsonb) from public, anon;
revoke execute on function public.get_similar_users(uuid, integer) from public, anon;
