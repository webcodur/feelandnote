-- contents.metadata의 'fictionSource' 키를 'figureBook'으로 옮긴다.
--
-- 이 키는 인물 등장·연관 도서의 작품 정체성(workIdentity·workTitle·workCreator·
-- koTranslationStatus)을 담는다. 테이블이 figure_book_*으로 개명된 뒤에도 이 키만
-- 옛 이름으로 남아 "픽션 전용"이라는 같은 오해를 계속 만든다. 실제로 담긴 값은
-- 『일본서기』나 『홍길동전』처럼 픽션 여부와 무관한 작품 정체성이다.
--
-- 코드(scripts/figure-books/source-book-batch-contract.ts)의 키 참조를 함께 바꾼다.
-- 데이터와 코드가 같은 배포 창에서 넘어가야 작품 재사용 판정이 끊기지 않는다.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

update public.contents
set metadata = (metadata - 'fictionSource') || jsonb_build_object('figureBook', metadata -> 'fictionSource')
where metadata ? 'fictionSource';

do $verify$
declare
  v_old integer;
  v_new integer;
begin
  select count(*) into v_old from public.contents where metadata ? 'fictionSource';
  select count(*) into v_new from public.contents where metadata ? 'figureBook';

  if v_old > 0 then
    raise exception 'fictionSource 키가 %건 남았습니다', v_old;
  end if;
  if v_new = 0 then
    raise exception 'figureBook 키가 하나도 만들어지지 않았습니다';
  end if;

  -- 작품 정체성이 보존됐는지 확인한다. 이 값이 끊기면 같은 작품이 중복 생성된다.
  if exists (
    select 1 from public.contents
    where metadata ? 'figureBook'
      and nullif(btrim(coalesce(metadata -> 'figureBook' ->> 'workIdentity', '')), '') is null
  ) then
    raise exception 'workIdentity가 비어 있는 행이 있습니다';
  end if;

  raise notice 'figureBook 키 %건으로 이관 완료', v_new;
end;
$verify$;

commit;
