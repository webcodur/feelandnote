-- 20260803203600의 캐시 갱신 함수가 조건절 없는 DELETE를 사용해
-- 프로젝트의 안전 가드에 차단됐다. 전체 캐시 교체 의도는 유지하되
-- 명시적인 조건절을 두어 팩션 저장 RPC가 다시 원자적으로 동작하게 한다.

create or replace function private.refresh_faction_atlas_members_cache()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.faction_atlas_members_cache
  where true;

  insert into private.faction_atlas_members_cache (
    tag_id,
    celeb_id,
    short_desc,
    short_desc_en,
    long_desc,
    long_desc_en,
    quote,
    quote_en,
    faction_image_url,
    hidden,
    sort_order,
    source,
    person_id,
    assignment_id,
    group_label,
    group_label_en,
    group_position,
    group_subtitle,
    group_subtitle_en,
    group_color,
    group_logo_url,
    faction_quote_media
  )
  select
    tag_id,
    celeb_id,
    short_desc,
    short_desc_en,
    long_desc,
    long_desc_en,
    quote,
    quote_en,
    faction_image_url,
    hidden,
    sort_order,
    source,
    person_id,
    assignment_id,
    group_label,
    group_label_en,
    group_position,
    group_subtitle,
    group_subtitle_en,
    group_color,
    group_logo_url,
    faction_quote_media
  from private.faction_atlas_members_source;

  return null;
end
$$;

revoke all privileges on function private.refresh_faction_atlas_members_cache()
  from public, anon, authenticated, service_role;
