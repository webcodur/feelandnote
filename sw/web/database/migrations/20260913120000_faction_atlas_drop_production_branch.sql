-- 세력도감 공개 뷰에서 영상 제작 표를 읽는 부분을 뗀다.
--
-- 배경: 세력도감 명단을 테마 단위로 웹 전용 배정(celeb_tag_assignments)에 모두 옮겼다(26.09.13).
-- 마지막까지 남아 있던 K-pop 아이돌·기획사 여덟도 옮겨 faction_groups.tag_id는 전부 끊겼고,
-- 원천 뷰의 영상 갈래는 0행을 낸다.
--
-- 그런데 코드는 남아 있어 위험이 하나 있다. 원천 뷰의 웹 갈래는
-- 「같은 테마·인물의 영상 행이 있으면 그 배정을 버린다」는 조건을 달고 있어서,
-- 누가 faction_groups.tag_id를 다시 이으면 그 테마의 웹 명단이 통째로 밀려나고
-- 옛 자막 문구가 화면을 차지한다. 26.09.13에 새로 쓴 상세 소개 3,943건이 그렇게 되돌아간다.
-- 그 길을 막는다.
--
-- 영상 제작 표(faction_episodes·faction_episode_parts·faction_groups·faction_clusters·faction_people)는
-- 지우지 않는다. 백오피스 영상 편집 화면이 그 표를 직접 읽고 있고, 자산 회수가 아직 남았다.
-- 보관본은 D:\feelandnote-backups\faction-video 에 있다. 폐기 순서는 docs/todo/faction-video-salvage.md가 쥔다.

begin;

-- 1) 원천 뷰를 웹 배정만 보게 다시 짠다.
--    sort_order의 10000 오프셋은 웹 행을 영상 행 뒤로 밀려고 두었던 것이다. 영상 행이 없으니 걷는다.
--    같은 테마 안의 차례는 바뀌지 않는다.
create or replace view private.faction_atlas_members_source as
select
  a.tag_id,
  a.celeb_id,
  a.short_desc,
  a.short_desc_en,
  a.long_desc,
  a.long_desc_en,
  a.quote,
  a.quote_en,
  a.faction_image_url,
  a.hidden,
  a.sort_order,
  'manual'::text as source,
  null::uuid as person_id,
  a.id as assignment_id,
  wg.name as group_label,
  wg.name_en as group_label_en,
  wg.sort_order as group_position,
  null::text as group_subtitle,
  null::text as group_subtitle_en,
  null::text as group_color,
  null::text as group_logo_url,
  a.quote_media as faction_quote_media
from public.celeb_tag_assignments a
left join public.celeb_tag_groups wg on wg.id = a.group_id;

-- 2) 영상 제작 표가 도감 캐시를 갱신하던 트리거를 걷는다.
--    표는 남지만 그 표를 고쳐도 이제 도감 화면은 흔들리지 않는다.
drop trigger if exists trg_refresh_faction_atlas_from_people on public.faction_people;
drop trigger if exists trg_refresh_faction_atlas_from_clusters on public.faction_clusters;
drop trigger if exists trg_refresh_faction_atlas_from_groups on public.faction_groups;

-- 3) 캐시를 새 정의로 다시 채운다.
delete from private.faction_atlas_members_cache where true;
insert into private.faction_atlas_members_cache (
  tag_id, celeb_id, short_desc, short_desc_en, long_desc, long_desc_en,
  quote, quote_en, faction_image_url, hidden, sort_order, source,
  person_id, assignment_id, group_label, group_label_en, group_position,
  group_subtitle, group_subtitle_en, group_color, group_logo_url, faction_quote_media
)
select
  tag_id, celeb_id, short_desc, short_desc_en, long_desc, long_desc_en,
  quote, quote_en, faction_image_url, hidden, sort_order, source,
  person_id, assignment_id, group_label, group_label_en, group_position,
  group_subtitle, group_subtitle_en, group_color, group_logo_url, faction_quote_media
from private.faction_atlas_members_source;

-- 4) 인원이 그대로인지 확인한다. 어긋나면 통째로 되돌린다.
do $v$
declare
  n_cache integer;
  n_web integer;
begin
  select count(*) into n_cache from private.faction_atlas_members_cache;
  select count(*) into n_web from public.celeb_tag_assignments;
  if n_cache <> n_web then
    raise exception '도감 인원이 어긋난다 — 캐시 %, 웹 배정 %', n_cache, n_web;
  end if;
  if exists (select 1 from private.faction_atlas_members_cache where source <> 'manual') then
    raise exception '영상 갈래 행이 남았다';
  end if;
end $v$;

commit;
