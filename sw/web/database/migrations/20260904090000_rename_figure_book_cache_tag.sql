-- 캐시 무효화 태그 'fiction-sources'를 'figure-books'로 바꾼다.
--
-- 이 태그는 DB 트리거가 내보내고 웹이 revalidateTag로 받는다. 양쪽 문자열이 같아야
-- 캐시가 비워지므로 코드(CACHE_TAGS.FIGURE_BOOKS)와 이 마이그레이션은 같은 배포 창에
-- 함께 나가야 한다. 어긋난 동안에는 해당 화면 캐시가 다음 주기까지 늦게 갱신될 뿐
-- 데이터가 상하지는 않는다.
--
-- 적용 순서: 코드 배포 → 이 마이그레이션. 코드가 먼저 나가면 새로 쓰인 캐시가 새 태그를
-- 달고, 트리거가 옛 태그를 내보내는 짧은 창만 생긴다. 반대 순서면 그 창이 더 길어진다.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $migrate$
declare
  trg record;
  new_def text;
  fixed integer := 0;
begin
  for trg in
    select t.oid, t.tgname, c.relname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and not t.tgisinternal
      and position('fiction-sources' in pg_get_triggerdef(t.oid)) > 0
  loop
    new_def := replace(pg_get_triggerdef(trg.oid), 'fiction-sources', 'figure-books');
    execute format('drop trigger %I on public.%I', trg.tgname, trg.relname);
    execute new_def;
    fixed := fixed + 1;
    raise notice '트리거 태그 정정: %.%', trg.relname, trg.tgname;
  end loop;

  raise notice '정정한 트리거 %건', fixed;
end;
$migrate$;

do $verify$
declare
  leftover integer;
  renamed integer;
begin
  select count(*) into leftover
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
    and position('fiction-sources' in pg_get_triggerdef(t.oid)) > 0;
  if leftover > 0 then
    raise exception 'fiction-sources 태그가 트리거 %건에 남았습니다', leftover;
  end if;

  select count(*) into renamed
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
    and position('figure-books' in pg_get_triggerdef(t.oid)) > 0;
  if renamed = 0 then
    raise exception 'figure-books 태그를 내보내는 트리거가 하나도 없습니다';
  end if;
end;
$verify$;

commit;
