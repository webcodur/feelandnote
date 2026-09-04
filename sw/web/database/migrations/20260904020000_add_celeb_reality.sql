-- celeb_reality 축 추가: 이 인물을 세상이 실존·전승·양쪽 다로 다루는지.
--
-- 배경: celeb_tier(light/full/fiction)는 파이프라인 분기(celeb_contents 스펙트럼을 쓰는가,
-- 원전 관계를 쓰는가)와 실존 여부 판단을 한 값에 함께 실어 왔다. 그래서 예수·홍길동처럼
-- 실존 코어가 확인되면서 별도 문학·신화 자료도 있는 인물, 단군왕검처럼 학계 정설이 갈리는
-- 인물을 tier 하나로는 정직하게 표시할 자리가 없었다.
--
-- 이 마이그레이션은 celeb_tier 값을 하나도 건드리지 않는다 — REAL/BOTH/FICTION 축을
-- 새로 추가하고 지금 tier에서 기계적으로 역산해 채울 뿐이다. 기존 코드는 여전히
-- celeb_tier만 보고 그대로 동작하므로, 이 마이그레이션은 뒤따르는 애플리케이션 배포와
-- 순서를 맞출 필요 없이 지금 바로 적용해도 안전하다.
--
-- 뒤에 남는 일(이 마이그레이션이 하지 않는 것):
--   1. 코드가 celeb_tier==='fiction' 대신 celeb_reality==='FICTION'을 보도록 전환
--      (LISTING_DEFAULT_TIERS·SEARCHABLE_CELEB_TIERS·getCelebSidePresence 등)
--   2. 코드 전환이 끝난 뒤에만: celeb_tier='fiction'인 행을 'light'로 옮기고
--      packages/shared/src/constants/celeb-tiers.ts에서 'fiction'을 제거
--   3. BOTH로 올릴 경계 인물(예수·홍길동 등) 선정 — 이건 사용자가 맨 마지막에 직접 정한다.
--      이 마이그레이션은 아무도 BOTH로 만들지 않는다.
--
-- 적용: 운영 DB에 SSH로 psql -f 실행. 20260904010000(리네임)과 독립적이라 순서 무관.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.celebs
  add column celeb_reality text;

update public.celebs
set celeb_reality = case when celeb_tier = 'fiction' then 'FICTION' else 'REAL' end;

alter table public.celebs
  alter column celeb_reality set not null,
  add constraint celebs_celeb_reality_check
    check (celeb_reality in ('REAL', 'BOTH', 'FICTION'));

comment on column public.celebs.celeb_reality is
  '이 인물을 세상이 실존(REAL)·전승(FICTION)·양쪽 다(BOTH)로 다루는가. celeb_tier(파이프라인
   분기)와 독립된 축이다. 기본값은 tier에서 역산하며, BOTH는 사람이 직접 판정해 올린다.';

create index celebs_celeb_reality_idx
  on public.celebs (celeb_reality);

do $verify$
declare
  mismatched integer;
begin
  select count(*) into mismatched
  from public.celebs
  where (celeb_tier = 'fiction' and celeb_reality <> 'FICTION')
     or (celeb_tier <> 'fiction' and celeb_reality = 'FICTION');

  if mismatched > 0 then
    raise exception 'celeb_reality 역산이 tier와 어긋난 행이 %건 있습니다', mismatched;
  end if;
end;
$verify$;

commit;
