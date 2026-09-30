-- 신화·세력 카드(faction_lv2)의 한 줄 정의. 화면에서 이름 바로 아래에 보이고, 검색 설명의 첫 문장이 된다.
-- 쓰는 규칙은 docs/project/service/service-01-explore.md 「한 줄 정의」가 쥔다. 분류(faction_lv1)에는 두지 않는다.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.faction_lv2
  add column if not exists headline text,
  add column if not exists headline_en text;

comment on column public.faction_lv2.headline is
  '한 줄 정의 — 이름 뒤에 붙여 무엇인지 바로 알리는 명사구(12~28자). 신화는 누가 무엇을 하는 이야기인지, 세력은 무엇으로 묶인 사람들인지';
comment on column public.faction_lv2.headline_en is
  'English one-line definition. Written separately from the Korean, not translated; 90 characters or fewer';

notify pgrst, 'reload schema';
commit;
