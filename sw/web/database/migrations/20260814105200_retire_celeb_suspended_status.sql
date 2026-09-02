-- 셀럽 공개 상태에서 'suspended'를 없앤다.
--
-- 'suspended'(정지)와 'inactive'(미검수)는 화면상 구분이 없었다. 둘 다 서비스에
-- 노출되지 않고, 공개 전환 감사는 'inactive'만 모집단으로 삼았다. 그런데 신규 등록
-- 기본값이 'suspended'라 새로 들어온 인물이 공개 대기열 밖에 서 있었다.
-- 상태는 '공개(active) / 공개 전(inactive)' 둘로 줄이고, 서비스에 필요 없는 인물은
-- 상태로 묶어두지 않고 행을 삭제한다.

update public.celebs
   set publication_status = 'inactive'
 where publication_status = 'suspended';

alter table public.celebs
  drop constraint if exists celebs_publication_status_check;

alter table public.celebs
  add constraint celebs_publication_status_check
    check (publication_status = any (array['active', 'inactive', 'deleted']::text[]));
