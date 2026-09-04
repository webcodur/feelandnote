-- 신화 전승의 공개 여부를 코드에서 데이터로 옮긴다.
--
-- 지금은 getMythAtlas.ts의 PUBLISHED_TRADITION_NAMES에 전승 이름을 적어 두고 그 목록에
-- 있는 것만 연다. 그래서 전승 하나를 잠그거나 여는 데 코드 수정과 운영 배포가 필요했다.
-- 오디세이아를 잠그려고 배포를 한 번 더 돌린 자리다.
--
-- celeb_tags에 표시 한 칸을 두고 조회가 그 값을 읽게 한다. 앞으로는 값만 켜고 끄면 되고,
-- 태그 행이 바뀌면 DB가 스스로 캐시를 비우므로 화면에도 곧바로 반영된다.
--
-- is_featured를 재사용하지 않는다. 그쪽은 세력도감 미리보기와 게임이 이미 쓰고 있어
-- 겸용하면 다른 화면이 함께 흔들린다.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.celeb_tags
  add column if not exists atlas_published boolean not null default false;

comment on column public.celeb_tags.atlas_published is
  '신화 아틀라스에서 이 전승을 공개하는가. 거짓이면 칩이 잠기고 「작업 예정」이 붙는다.';

-- 지금 열려 있는 두 전승을 그대로 옮긴다. 오디세이아는 인물 구성을 손볼 것이 있어 잠근 상태다.
update public.celeb_tags
   set atlas_published = true
 where slug in ('greek-roman-myth', 'homer-iliad');

commit;
