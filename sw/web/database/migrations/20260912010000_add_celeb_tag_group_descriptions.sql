-- 세력도감·신화 탐색의 그룹 설명(ko·en). 신화 탐색에서 그룹을 고르면 본문 그룹 개요에
-- 이 무리가 누구이고 작품에서 어떤 구실을 하는지 보인다(26.09.12 사용자 승인).
-- 뷰는 바꾸지 않는다 — 화면은 celeb_tag_groups를 직접 읽는다. 새 표의 캐시·웹 재검증 트리거가 이미 있다.

begin;

alter table public.celeb_tag_groups
  add column description text,
  add column description_en text;

notify pgrst, 'reload schema';

commit;
