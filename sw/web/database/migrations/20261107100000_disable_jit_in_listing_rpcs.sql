-- 인물 목록 함수 두 개의 실행 직전 컴파일(JIT)을 끈다.
--
-- 문제: 공개 권한에서는 접근 정책 조건까지 더해 계획 비용이 50만을 넘고, JIT가 인라인·최적화까지 수행한다.
-- 탐색 기본 조건의 개수 조회 849ms 중 684ms가 컴파일이었다(26.11.07 anon 실측). 결과가 캐시되지
-- 않는 조회마다 다시 컴파일하므로 이득이 없다.
-- 세션 단위 비교(공개 권한): 개수 약 620ms → 150ms, 정렬 약 1,550ms → 240ms.
--
-- 되돌리기: alter function ... reset jit;

begin;

set local lock_timeout = '2s';
set local statement_timeout = '5s';

alter function public.get_celebs_sorted(text, text, text, text, text, integer, integer, uuid, integer, text, boolean, text[], text[], integer, integer, uuid)
  set jit = off;

alter function public.count_celebs_filtered(text, text, text, text, uuid, integer, text, boolean, text[], text[], integer, integer, uuid)
  set jit = off;

commit;
