-- 신규 활성화와 active 프로필의 아바타 제거를 DB에서 차단한다.
-- 기존 active/avatar_url NULL 행은 소급 비활성화하지 않으며, 다른 필드 수정도 허용한다.

create or replace function public.enforce_active_celeb_avatar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.profile_type = 'CELEB'
     and new.status = 'active'
     and nullif(btrim(new.avatar_url), '') is null
     and (
       tg_op = 'INSERT'
       or old.status is distinct from 'active'
       or old.avatar_url is distinct from new.avatar_url
       or old.profile_type is distinct from 'CELEB'
     ) then
    raise exception 'active CELEB requires avatar_url: %', coalesce(new.slug, new.id::text)
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_active_celeb_requires_avatar on public.profiles;

create trigger trg_active_celeb_requires_avatar
before insert or update of status, avatar_url, profile_type
on public.profiles
for each row
execute function public.enforce_active_celeb_avatar();

comment on function public.enforce_active_celeb_avatar() is
  'Blocks new active CELEB rows and active transitions without avatar_url; does not retroactively deactivate legacy rows.';
