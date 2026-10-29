-- 대표 사진 캡션 기능을 없앤다. 값은 2026-10-29에 모두 비웠다.
-- 웹이 portrait_caption(_en)을 더 이상 select하지 않는 버전이 배포된 뒤에 적용한다.
-- 구버전 웹이 남아 있는 동안 지우면 인물 상세 조회가 없는 컬럼 오류로 실패한다.
alter table public.celebs
  drop column if exists portrait_caption,
  drop column if exists portrait_caption_en;
