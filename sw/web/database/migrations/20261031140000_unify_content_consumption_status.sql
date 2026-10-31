begin;

-- FINISHED = 감상함, WANT = 감상 안함. 기존 클라이언트와 호환되는 두 저장값만 사용한다.
alter table public.member_contents alter column status set default 'WANT';
alter table public.member_contents alter column status set not null;
alter table public.celeb_contents drop constraint celeb_contents_status_check;
alter table public.celeb_contents add constraint celeb_contents_status_check
  check (status in ('WANT', 'FINISHED'));
comment on column public.member_contents.status is '감상 여부: FINISHED=감상함, WANT=감상 안함. 리뷰 유무와 독립적으로 선택한다.';
comment on column public.celeb_contents.status is '감상 여부: FINISHED=감상함, WANT=감상 안함. 공개 감상 목록과 권수는 FINISHED만 사용한다.';

-- 과거의 리뷰 기반 저장이 상태를 갱신하지 않은 기록을 교정한다. 감상문·별점은 보존한다.
update public.member_contents set status = 'FINISHED'
where status = 'WANT' and (
  rating > 0 or nullif(btrim(review), '') is not null
  or exists (select 1 from unnest(review_presets) preset where nullif(btrim(preset), '') is not null)
);

-- 별점·감상을 저장하는 모든 입력 경로에서 감상함으로 전환한다.
-- 상태만 수정하는 경로는 이 트리거를 거치지 않으므로 명시적인 감상 안함 선택도 보존한다.
create or replace function private.mark_member_content_consumed()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if new.rating > 0 or nullif(btrim(new.review), '') is not null
    or exists (select 1 from unnest(new.review_presets) preset where nullif(btrim(preset), '') is not null)
  then new.status := 'FINISHED';
  end if;
  return new;
end;
$$;
revoke all on function private.mark_member_content_consumed() from public;
create trigger member_contents_mark_consumed
before insert or update of rating, review, review_presets on public.member_contents
for each row execute function private.mark_member_content_consumed();

create or replace function public.get_celeb_type_counts(p_celeb_id uuid)
returns table(content_type text, total bigint)
language sql stable security invoker set search_path = pg_catalog as $$
  select content.type::text, count(*)::bigint
  from public.celeb_contents content_row
  join public.contents content on content.id = content_row.content_id
  where content_row.celeb_id = p_celeb_id and content_row.status = 'FINISHED'
  group by content.type;
$$;

create or replace function private.update_domain_content_counts()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare
  owner_ids uuid[];
  work_ids text[];
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status
    and new.content_id is not distinct from old.content_id then
    return new;
  end if;
  if tg_table_name = 'member_contents' then
    owner_ids := array[case when tg_op <> 'INSERT' then old.member_id end,
                       case when tg_op <> 'DELETE' then new.member_id end];
    update public.member_social_stats s set content_count = (
      select count(*)::integer from public.member_contents c
      where c.member_id = s.member_id and c.status = 'FINISHED'
    ), updated_at = now() where s.member_id = any(owner_ids);
  else
    owner_ids := array[case when tg_op <> 'INSERT' then old.celeb_id end,
                       case when tg_op <> 'DELETE' then new.celeb_id end];
    update public.celeb_metrics s set content_count = (
      select count(*)::integer from public.celeb_contents c
      where c.celeb_id = s.celeb_id and c.status = 'FINISHED'
    ), updated_at = now() where s.celeb_id = any(owner_ids);
  end if;
  work_ids := array[case when tg_op <> 'INSERT' then old.content_id end,
                    case when tg_op <> 'DELETE' then new.content_id end];
  update public.contents w set
    member_count = (select count(*)::integer from public.member_contents c where c.content_id = w.id and c.status = 'FINISHED'),
    celeb_count = (select count(*)::integer from public.celeb_contents c where c.content_id = w.id and c.status = 'FINISHED'),
    record_count = (select count(*)::integer from public.member_contents c where c.content_id = w.id and c.status = 'FINISHED')
      + (select count(*)::integer from public.celeb_contents c where c.content_id = w.id and c.status = 'FINISHED')
  where w.id = any(work_ids);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- BEFORE 트리거가 리뷰 저장을 감상함으로 바꾼 경우도 집계해야 한다.
-- UPDATE OF status는 SET 절만 보고 판단하므로 이 변경을 놓친다.
drop trigger member_contents_update_counts on public.member_contents;
create trigger member_contents_update_counts after insert or delete or update on public.member_contents
for each row execute function private.update_domain_content_counts();

-- 기존 보관 기록이 감상자 집계에 들어간 값을 실제 감상 상태로 정리한다.
update public.member_social_stats s set content_count = (
  select count(*)::integer from public.member_contents c where c.member_id = s.member_id and c.status = 'FINISHED'
) where s.content_count is distinct from (
  select count(*)::integer from public.member_contents c where c.member_id = s.member_id and c.status = 'FINISHED'
);
update public.celeb_metrics s set content_count = (
  select count(*)::integer from public.celeb_contents c where c.celeb_id = s.celeb_id and c.status = 'FINISHED'
) where s.content_count is distinct from (
  select count(*)::integer from public.celeb_contents c where c.celeb_id = s.celeb_id and c.status = 'FINISHED'
);
with counts as (
  select w.id,
    (select count(*)::integer from public.member_contents c where c.content_id=w.id and c.status='FINISHED') members,
    (select count(*)::integer from public.celeb_contents c where c.content_id=w.id and c.status='FINISHED') celebs
  from public.contents w
)
update public.contents w set member_count=c.members, celeb_count=c.celebs, record_count=c.members+c.celebs
from counts c where w.id=c.id and (w.member_count,w.celeb_count,w.record_count)
  is distinct from (c.members,c.celebs,c.members+c.celebs);

notify pgrst, 'reload schema';
commit;
