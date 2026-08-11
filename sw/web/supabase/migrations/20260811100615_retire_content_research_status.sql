begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- 0건 확정은 별도 상태 머신이 아니라 확정 시각 하나로 충분하다.
-- 기존 confirmed_empty 행 가운데 시각이 비어 있으면 삭제 전에 보존한다.
update public.celebs
set content_research_confirmed_empty_at = coalesce(
  content_research_confirmed_empty_at,
  content_research_updated_at,
  now()
)
where content_research_status = 'confirmed_empty'
  and content_research_confirmed_empty_at is null;

do $$
begin
  if exists (
    select 1
    from public.celebs as celeb
    where celeb.content_research_confirmed_empty_at is not null
      and exists (
        select 1
        from public.celeb_contents as celeb_content
        where celeb_content.celeb_id = celeb.id
      )
  ) then
    raise exception '콘텐츠 보유 인물에 0건 확정 시각이 남아 있습니다.';
  end if;
end;
$$;

drop trigger if exists trg_celebs_guard_content_research_status
  on public.celebs;
drop trigger if exists celeb_contents_reopen_research
  on public.celeb_contents;

drop function if exists public.guard_celeb_content_research_status();
drop function if exists public.reopen_celeb_content_research_on_content();

drop index if exists public.celebs_content_research_queue_idx;

alter table public.celebs
  drop constraint if exists celebs_content_research_status_check,
  drop column if exists content_research_status,
  drop column if exists content_research_updated_at;

comment on column public.celebs.content_research_confirmed_empty_at is
  'BOOK·VIDEO·GAME·MUSIC 조사 결과 유효한 콘텐츠가 0건임을 확정한 시각. NULL이면 미확정.';

-- 콘텐츠가 있는 인물을 0건으로 확정하지 못하게 한다.
create function public.guard_celeb_content_research_confirmed_empty()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.content_research_confirmed_empty_at is not null
     and (
       tg_op = 'INSERT'
       or new.content_research_confirmed_empty_at
         is distinct from old.content_research_confirmed_empty_at
     )
     and exists (
       select 1
       from public.celeb_contents as celeb_content
       where celeb_content.celeb_id = new.id
     )
  then
    raise exception
      '콘텐츠가 등록된 인물은 0건으로 확정할 수 없습니다. celeb_id=%',
      new.id;
  end if;

  return new;
end;
$$;

alter function public.guard_celeb_content_research_confirmed_empty()
  owner to postgres;
revoke all on function public.guard_celeb_content_research_confirmed_empty()
  from public, anon, authenticated, service_role;

create trigger trg_celebs_guard_content_research_confirmed_empty
before insert or update of content_research_confirmed_empty_at
on public.celebs
for each row
execute function public.guard_celeb_content_research_confirmed_empty();

-- 확정 뒤 실제 콘텐츠가 추가되면 확정 시각만 비운다.
create function public.clear_celeb_content_research_confirmed_empty()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  update public.celebs
  set content_research_confirmed_empty_at = null
  where id = new.celeb_id
    and content_research_confirmed_empty_at is not null;

  return new;
end;
$$;

alter function public.clear_celeb_content_research_confirmed_empty()
  owner to postgres;
revoke all on function public.clear_celeb_content_research_confirmed_empty()
  from public, anon, authenticated, service_role;

create trigger celeb_contents_clear_research_confirmed_empty
after insert or update of celeb_id
on public.celeb_contents
for each row
execute function public.clear_celeb_content_research_confirmed_empty();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'celebs'
      and column_name in (
        'content_research_status',
        'content_research_updated_at'
      )
  ) then
    raise exception '폐기 대상 콘텐츠 조사 상태 컬럼이 남아 있습니다.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'celebs'
      and column_name = 'content_research_confirmed_empty_at'
  ) then
    raise exception '0건 확정 시각 컬럼이 누락되었습니다.';
  end if;

  if to_regprocedure('public.guard_celeb_content_research_status()') is not null
     or to_regprocedure('public.reopen_celeb_content_research_on_content()') is not null
     or to_regclass('public.celebs_content_research_queue_idx') is not null
  then
    raise exception '폐기 대상 콘텐츠 조사 상태 객체가 남아 있습니다.';
  end if;

  if to_regprocedure('public.guard_celeb_content_research_confirmed_empty()') is null
     or to_regprocedure('public.clear_celeb_content_research_confirmed_empty()') is null
  then
    raise exception '0건 확정 보호 함수가 누락되었습니다.';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
