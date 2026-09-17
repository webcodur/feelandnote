-- 구 도감 스키마(celeb_tags 계열) 제거 — faction_lv1/lv2/lv3 + faction_members 이관·배포 검증 뒤 실행
--
-- celebs·celeb_contents·celeb_metrics의 공개 RLS가 옛 뷰 faction_atlas_members를 읽는다.
-- 「active 아니어도 보이는 배정이 있으면 공개」 규칙이므로 새 뷰 faction_member_rows로 갈아끼운 뒤
-- 같은 트랜잭션에서 옛 객체를 지운다.
begin;

alter policy celebs_select_published on public.celebs
  using (
    publication_status = 'active'
    or is_admin()
    or exists (
      select 1 from faction_member_rows
      where faction_member_rows.celeb_id = celebs.id
        and not coalesce(faction_member_rows.hidden, false)
    )
  );

alter policy celeb_contents_select_published on public.celeb_contents
  using (
    is_admin()
    or exists (
      select 1 from celebs
      where celebs.id = celeb_contents.celeb_id
        and celebs.publication_status = 'active'
    )
    or exists (
      select 1 from faction_member_rows
      where faction_member_rows.celeb_id = celeb_contents.celeb_id
        and not coalesce(faction_member_rows.hidden, false)
    )
  );

alter policy celeb_metrics_select on public.celeb_metrics
  using (
    is_admin()
    or exists (
      select 1 from celebs
      where celebs.id = celeb_metrics.celeb_id
        and celebs.publication_status = 'active'
    )
    or exists (
      select 1 from faction_member_rows
      where faction_member_rows.celeb_id = celeb_metrics.celeb_id
        and not coalesce(faction_member_rows.hidden, false)
    )
  );

drop view if exists public.faction_atlas_members;
drop view if exists private.faction_atlas_members_source;
drop function if exists public.get_tag_celeb_counts();
drop table if exists public.celeb_tag_assignments;
drop table if exists public.celeb_tag_groups;
drop table if exists public.celeb_tags;

commit;
