begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- 콘텐츠 연결 시 light 셀럽을 full로 승격하는 기존 트리거 함수다.
-- 폐기된 조사 상태 컬럼을 함께 갱신하던 부분만 제거한다.
create or replace function private.on_celeb_content_add()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  update public.celebs
  set celeb_tier = case
    when celeb_tier = 'light' then 'full'
    else celeb_tier
  end
  where id = new.celeb_id;

  return new;
end;
$function$;

do $verify$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'on_celeb_content_add'
      and pg_get_function_identity_arguments(p.oid) = ''
      and pg_get_functiondef(p.oid) ilike '%content_research_status%'
  ) then
    raise exception 'private.on_celeb_content_add still references retired content_research_status';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace pn on pn.oid = p.pronamespace
    where not t.tgisinternal
      and n.nspname = 'public'
      and c.relname = 'celeb_contents'
      and t.tgname = 'celeb_contents_update_celeb'
      and pn.nspname = 'private'
      and p.proname = 'on_celeb_content_add'
  ) then
    raise exception 'celeb_contents_update_celeb trigger is not connected to private.on_celeb_content_add';
  end if;
end;
$verify$;

commit;
