-- 공개 읽기 정책의 관리자 판정을 행마다가 아니라 쿼리당 1회만 실행한다.
--
-- 문제: 정책의 is_admin()은 행마다 실행된다. 탐색 기본 조건(도서·작품 있는 인물)은
-- celeb_contents 5만 7천 행을 훑으므로 쪽마다 개수 1.3초, 정렬 1.7초가 들었다(26.11.07 anon 실측).
-- 두 조회를 차례로 돌려 캐시가 없는 쪽을 처음 열면 운영에서 약 3.9초가 걸렸다.
--
-- 조치: is_admin()을 (select ...)로 감싸 InitPlan으로 한 번만 계산한다. 공개 범위와 역할은 그대로다.
-- 적용 후 anon 실측: 개수 약 620ms, 정렬 약 1,200ms. 운영의 첫 쪽 열기 약 3.9초 → 약 2초.
-- 남은 지연은 JIT 컴파일이다(20261107100000_disable_jit_in_listing_rpcs.sql).

begin;

set local lock_timeout = '2s';
set local statement_timeout = '5s';

alter policy celebs_select_published on public.celebs
  using ((publication_status = 'active'::text) or (select public.is_admin()));

alter policy celeb_contents_select_published on public.celeb_contents
  using ((select public.is_admin()) or exists (
    select 1 from public.celebs c
    where c.id = celeb_contents.celeb_id and c.publication_status = 'active'::text
  ));

alter policy celeb_metrics_select on public.celeb_metrics
  using ((select public.is_admin()) or exists (
    select 1 from public.celebs c
    where c.id = celeb_metrics.celeb_id and c.publication_status = 'active'::text
  ));

alter policy faction_members_select_all on public.faction_members
  using ((select public.is_admin()) or (hidden = false and exists (
    select 1 from public.celebs c
    where c.id = faction_members.celeb_id and c.publication_status = 'active'::text
  )));

commit;
