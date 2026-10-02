-- 세력·신화(faction_lv2)의 「주제책」 명단. 종전 코드 상수(FACTION_OWN_WORK_IDS·MYTH_OWN_WORK_IDS)를
-- 서버 원장으로 옮긴 것이다. contents.id를 담으며 catalog 등록 id(book-978...)도 섞일 수 있어 text[]다.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.faction_lv2
  add column if not exists theme_book_ids text[] not null default '{}';

comment on column public.faction_lv2.theme_book_ids is
  '주제책 contents.id 명단 — 세력·신화 자체를 주인공으로 다루는 작품. 작품 선반의 앞 구간으로 선다';

notify pgrst, 'reload schema';
commit;
