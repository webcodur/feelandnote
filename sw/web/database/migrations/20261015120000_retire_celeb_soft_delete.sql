-- 인물 삭제는 행을 영구 삭제한다. 공개 상태는 active/inactive만 유지한다.
begin;

delete from public.celebs where publication_status = 'deleted';

alter table public.celebs
  drop constraint celebs_publication_status_check;

alter table public.celebs
  add constraint celebs_publication_status_check
    check (publication_status = any (array['active', 'inactive']::text[]));

-- 삭제는 discourse_speakers의 ON DELETE RESTRICT가 보호한다.
create or replace function public.celebs_guard_discourse_references()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $function$
begin
  if exists (
    select 1 from public.discourse_speakers where celeb_id = new.id
  ) and nullif(btrim(new.nickname_en), '') is null then
    raise exception '담화에 연결된 CELEB는 영문 이름을 유지해야 한다: %', new.id;
  end if;
  return new;
end;
$function$;

commit;
