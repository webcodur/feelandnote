-- 세력도감 영상 제작 표를 지운다.
--
-- 영상 시리즈는 끝났고 세력도감은 웹 배정(celeb_tag_assignments·celeb_tag_groups)만 읽는다(26.09.13 뷰 분리).
-- 표 원본·스키마·함수 정의 보관본: D:\feelandnote-backups\faction-video\final-2026-09-16
--
-- celebs 에 걸린 두 트리거는 faction_people 을 본문에서 읽는다. plpgsql 본문은 의존성으로 잡히지 않아
-- 표만 지우면 셀럽 수정이 전부 실패하므로 함께 걷는다.

begin;

drop trigger if exists trg_celebs_guard_faction_references on public.celebs;
drop trigger if exists trg_celebs_sync_faction_slug on public.celebs;
drop function if exists public.celebs_guard_faction_references();
drop function if exists public.celebs_sync_faction_slug();

drop function if exists public.faction_replace_episode(text, jsonb, jsonb, jsonb, jsonb, jsonb, timestamp with time zone);

drop table if exists
  public.faction_people,
  public.faction_clusters,
  public.faction_groups,
  public.faction_episode_parts,
  public.faction_episodes;

drop function if exists public.faction_group_auto_theme();
drop function if exists public.assert_faction_individual_subject();
drop function if exists public.faction_people_require_celeb();

commit;
