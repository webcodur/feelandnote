-- 20260904010000 리네임 마이그레이션이 놓친 잔여 fiction_source_* 참조를 정정한다.
--
-- 배경: 그 마이그레이션의 4단계는 pg_get_functiondef()로 "함수 본문"만 스캔했다.
-- web_reval_ins/upd/del 트리거는 태그 표현식을 web_revalidate_trigger()의 인자 문자열로
-- 트리거 정의(tgargs) 자체에 리터럴로 담고 있어 함수 본문 스캔에 걸리지 않았다.
-- 그 결과 figure_book_editions·figure_book_products의 INSERT/UPDATE/DELETE가
-- "function public.fiction_source_related_celeb_cache_tags(text) does not exist"로
-- 전량 실패하는 상태였다. ALTER TRIGGER로는 인자를 못 바꾸므로 드롭 후 재생성한다.
--
-- 적용: 운영 DB에 SSH로 docker exec ... psql -f 실행. 애플리케이션 코드 변경은 없다 —
-- 이 트리거들은 DB 내부에서만 실행되며 배포와 무관하게 즉시 적용해도 안전하다.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- figure_book_editions

drop trigger if exists web_reval_ins on public.figure_book_editions;
create trigger web_reval_ins
  after insert on public.figure_book_editions
  referencing new table as new_rows
  for each statement
  execute function web_revalidate_trigger($tag$array[
    'fiction-sources',
    'contents:' || r.content_id,
    'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
  ] || public.figure_book_related_celeb_cache_tags(r.content_id)$tag$, '', 'n.id = o.id');

drop trigger if exists web_reval_upd on public.figure_book_editions;
create trigger web_reval_upd
  after update on public.figure_book_editions
  referencing old table as old_rows new table as new_rows
  for each statement
  execute function web_revalidate_trigger($tag$array[
    'fiction-sources',
    'contents:' || r.content_id,
    'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
  ] || public.figure_book_related_celeb_cache_tags(r.content_id)$tag$, 'updated_at', 'n.id = o.id');

drop trigger if exists web_reval_del on public.figure_book_editions;
create trigger web_reval_del
  after delete on public.figure_book_editions
  referencing old table as old_rows
  for each statement
  execute function web_revalidate_trigger($tag$array[
    'fiction-sources',
    'contents:' || r.content_id,
    'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
  ] || public.figure_book_related_celeb_cache_tags(r.content_id)$tag$, '', 'n.id = o.id');

-- figure_book_products (구 fiction_source_editions 조인도 함께 정정)

drop trigger if exists web_reval_ins on public.figure_book_products;
create trigger web_reval_ins
  after insert on public.figure_book_products
  referencing new table as new_rows
  for each statement
  execute function web_revalidate_trigger($tag$array[
    'fiction-sources',
    'contents:' || (select e.content_id from public.figure_book_editions as e where e.id = r.edition_id),
    'contents:' || (
      select c.external_id
      from public.figure_book_editions as e
      join public.contents as c on c.id = e.content_id
      where e.id = r.edition_id
    )
  ] || public.figure_book_related_celeb_cache_tags((
    select e.content_id
    from public.figure_book_editions as e
    where e.id = r.edition_id
  ))$tag$, '', 'n.id = o.id');

drop trigger if exists web_reval_upd on public.figure_book_products;
create trigger web_reval_upd
  after update on public.figure_book_products
  referencing old table as old_rows new table as new_rows
  for each statement
  execute function web_revalidate_trigger($tag$array[
    'fiction-sources',
    'contents:' || (select e.content_id from public.figure_book_editions as e where e.id = r.edition_id),
    'contents:' || (
      select c.external_id
      from public.figure_book_editions as e
      join public.contents as c on c.id = e.content_id
      where e.id = r.edition_id
    )
  ] || public.figure_book_related_celeb_cache_tags((
    select e.content_id
    from public.figure_book_editions as e
    where e.id = r.edition_id
  ))$tag$, 'updated_at', 'n.id = o.id');

drop trigger if exists web_reval_del on public.figure_book_products;
create trigger web_reval_del
  after delete on public.figure_book_products
  referencing old table as old_rows
  for each statement
  execute function web_revalidate_trigger($tag$array[
    'fiction-sources',
    'contents:' || (select e.content_id from public.figure_book_editions as e where e.id = r.edition_id),
    'contents:' || (
      select c.external_id
      from public.figure_book_editions as e
      join public.contents as c on c.id = e.content_id
      where e.id = r.edition_id
    )
  ] || public.figure_book_related_celeb_cache_tags((
    select e.content_id
    from public.figure_book_editions as e
    where e.id = r.edition_id
  ))$tag$, '', 'n.id = o.id');

-- 검증: 남은 fiction_source_ 참조가 트리거 정의에 없는지 확인

do $verify$
declare
  leftover integer;
begin
  select count(*) into leftover
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and not t.tgisinternal
    and position('fiction_source_' in pg_get_triggerdef(t.oid)) > 0;

  if leftover > 0 then
    raise exception '트리거 정의에 fiction_source_ 참조가 %건 남았습니다', leftover;
  end if;
end;
$verify$;

commit;
