begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- 콘텐츠 조사 결과는 별도 장부가 아니라 celebs의 단순 상태 컬럼으로만 관리한다.
-- 실제 콘텐츠가 있는 인물을 confirmed_empty로 닫는 것만 막는다.
create or replace function public.guard_celeb_content_research_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.content_research_status is distinct from old.content_research_status then
    if new.content_research_status = 'confirmed_empty'
       and exists (
         select 1
         from public.celeb_contents
         where celeb_id = new.id
       )
    then
      raise exception
        '콘텐츠가 등록된 인물은 confirmed_empty로 변경할 수 없습니다. celeb_id=%',
        new.id;
    end if;

    new.content_research_updated_at := now();
    new.content_research_confirmed_empty_at := case
      when new.content_research_status = 'confirmed_empty' then now()
      else null
    end;
  end if;

  return new;
end;
$$;

alter function public.guard_celeb_content_research_status() owner to postgres;
revoke all on function public.guard_celeb_content_research_status()
  from public, anon, authenticated, service_role;

-- 장부 테이블에 의존하는 공개 RPC부터 명시적으로 제거한다.
drop function if exists public.complete_celeb_content_research_run(uuid);
drop function if exists public.assert_celeb_content_research_run_ready(uuid);
drop function if exists public.cancel_celeb_content_research_run(uuid);

-- 조사 장부 4개 테이블과 임시 음악 후보 테이블은 데이터와 함께 폐기한다.
drop table if exists public.celeb_content_research_sources;
drop table if exists public.celeb_content_research_findings;
drop table if exists public.celeb_content_research_scopes;
drop table if exists public.celeb_content_research_runs;
drop table if exists public.celeb_music_candidates;

-- 테이블 트리거가 사라진 뒤 더는 쓰이지 않는 장부 전용 함수를 제거한다.
drop function if exists public.touch_celeb_content_research_history();
drop function if exists public.initialize_celeb_content_research_scopes();
drop function if exists public.guard_celeb_content_research_run_celeb();
drop function if exists public.guard_celeb_content_research_run_completion();
drop function if exists public.mark_celeb_content_research_started();
drop function if exists public.guard_closed_celeb_content_research_run();
drop function if exists public.guard_celeb_content_research_child_mutation();

do $$
begin
  if to_regclass('public.contents') is null
     or to_regclass('public.content_locales') is null
     or to_regclass('public.celeb_contents') is null
  then
    raise exception '실제 콘텐츠 저장 테이블이 누락되었습니다.';
  end if;

  if to_regclass('public.celeb_content_research_runs') is not null
     or to_regclass('public.celeb_content_research_scopes') is not null
     or to_regclass('public.celeb_content_research_findings') is not null
     or to_regclass('public.celeb_content_research_sources') is not null
     or to_regclass('public.celeb_music_candidates') is not null
  then
    raise exception '폐기 대상 조사·후보 테이블이 남아 있습니다.';
  end if;

  if to_regprocedure('public.guard_celeb_content_research_status()') is null
     or to_regprocedure('public.reopen_celeb_content_research_on_content()') is null
  then
    raise exception '단순 조사 상태 보호 함수가 누락되었습니다.';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
