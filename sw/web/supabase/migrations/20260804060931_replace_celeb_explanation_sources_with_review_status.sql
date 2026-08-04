-- 읽어보기의 참고 URL 저장을 폐기하고, 원고 검수 상태만 본문 행에 보관한다.
-- NULL은 아직 새 기준으로 검수하지 않았다는 뜻이다.

begin;

alter table public.celeb_explanations
  add column review_status text;

alter table public.celeb_explanations
  add constraint celeb_explanations_review_status_check
  check (review_status in ('ai_reviewed', 'human_reviewed'));

comment on column public.celeb_explanations.review_status is
  '읽어보기 검수 상태. NULL=미검수, ai_reviewed=AI 검수 완료, human_reviewed=인간 검수 완료';

drop table if exists public.celeb_explanation_sources;

commit;
