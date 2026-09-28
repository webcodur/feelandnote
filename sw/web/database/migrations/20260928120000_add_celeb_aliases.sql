-- 인물의 다른 이름(별칭). 검색만 읽고 인물 소개란에는 보이지 않는다.
-- 넣는 기준은 docs/project/celeb/celeb-01-01-profile-facts.md 「다른 이름」이 쥔다.
-- 수식어(title)와 겹쳐도 된다 — 수식어는 화면 표시, 별칭은 검색이라 하는 일이 다르다.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.celebs
  add column aliases text[] not null default '{}'::text[];

-- 빈 값은 검색에서 모든 이름에 걸린다. 앞뒤 공백 정리는 저장하는 쪽이 한다
alter table public.celebs
  add constraint celebs_aliases_no_blank
  check (array_position(aliases, null) is null and array_position(aliases, '') is null);

comment on column public.celebs.aliases is
  '다른 이름(별칭). 본명·예명·개명 전 이름·호·자·시호·한자 독음·널리 쓰인 옛 표기·다른 언어의 이름처럼 이름 자리에 대신 들어가 이 사람을 가리키는 말. 검색만 읽는다';

notify pgrst, 'reload schema';
commit;
