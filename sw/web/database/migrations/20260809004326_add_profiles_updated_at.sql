-- 프로필 행의 실제 수정 시각을 기록한다.
-- 기존 행은 작성 시각을 소급 추정하지 않고 null 로 둔다.

alter table public.profiles
  add column if not exists updated_at timestamptz;

comment on column public.profiles.updated_at is
  '프로필 내용이 실제로 변경된 시각. 마이그레이션 이전 행은 다음 변경 전까지 null.';

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  -- 조회수와 접속 시각은 운영 계수라 프로필 내용 수정으로 보지 않는다.
  if (to_jsonb(new) - array[
       'updated_at', 'view_count', 'last_seen_at',
       'slug', 'cultural_journey', 'cultural_journey_en'
     ])
     is distinct from
     (to_jsonb(old) - array[
       'updated_at', 'view_count', 'last_seen_at',
       'slug', 'cultural_journey', 'cultural_journey_en'
     ]) then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;

  return new;
end;
$$;

revoke all on function public.touch_profile_updated_at()
  from public, anon, authenticated;

drop trigger if exists trg_profiles_touch_updated_at on public.profiles;
create trigger trg_profiles_touch_updated_at
  before update on public.profiles
  for each row
  execute function public.touch_profile_updated_at();
