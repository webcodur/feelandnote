begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- 공개 클라이언트는 최종 사건을 읽기만 한다. 쓰기는 관리자 서버의 service role이 맡는다.
revoke all on table public.celeb_timeline_events from anon, authenticated;
grant select on table public.celeb_timeline_events to anon, authenticated;

-- 단순 updated_at 트리거도 호출자별 search_path에 영향받지 않게 고정한다.
alter function public.touch_celeb_timeline_events()
  set search_path = pg_catalog;

do $$
declare
  v_touch_function oid := to_regprocedure('public.touch_celeb_timeline_events()');
begin
  if not has_table_privilege('anon', 'public.celeb_timeline_events', 'SELECT')
     or not has_table_privilege('authenticated', 'public.celeb_timeline_events', 'SELECT')
     or has_table_privilege('anon', 'public.celeb_timeline_events', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
     or has_table_privilege('authenticated', 'public.celeb_timeline_events', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  then
    raise exception '타임라인 사건 테이블의 공개 읽기 전용 권한 계약이 맞지 않습니다.';
  end if;

  if v_touch_function is null
     or not exists (
       select 1
       from pg_proc
       where oid = v_touch_function
         and proconfig = array['search_path=pg_catalog']::text[]
     )
  then
    raise exception '타임라인 updated_at 트리거 함수의 search_path가 고정되지 않았습니다.';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
