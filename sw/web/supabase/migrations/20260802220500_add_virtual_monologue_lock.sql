-- 가상 독백 확정 잠금.
--
-- virtual_monologue_locked_at 에 값이 있으면 "이 독백은 확정본이니 수정하지 않는다"는 선언이다.
-- 트리거가 DB 차원에서 변경을 거부하므로 관리자 폼·게시 RPC·스크립트 등 어떤 경로로도
-- 일반적인 UPDATE 로는 바꿀 수 없다.
--
-- 해제와 수정은 반드시 별도 문장으로 나눠야 한다:
--   1) update profiles set virtual_monologue_locked_at = null where slug = ...;
--   2) update profiles set virtual_monologue = ... where slug = ...;
-- 잠금 해제와 본문 수정을 한 문장에 섞으면 그것도 차단된다(실수 방지).
-- 값 수정과 동시에 잠그는 것(set virtual_monologue = ..., virtual_monologue_locked_at = now())은
-- 잠겨 있지 않던 행에서만 허용된다 — "고치고 확정"이 한 번에 된다.

alter table public.profiles
  add column if not exists virtual_monologue_locked_at timestamptz;

comment on column public.profiles.virtual_monologue_locked_at is
  '가상 독백 확정 잠금 시각. 값이 있으면 트리거가 virtual_monologue 변경을 차단한다. 해제(null)와 수정은 별도 문장으로만 가능.';

create or replace function public.guard_virtual_monologue_lock()
returns trigger
language plpgsql
as $$
begin
  if old.virtual_monologue_locked_at is not null
     and new.virtual_monologue is distinct from old.virtual_monologue then
    raise exception
      'virtual_monologue is locked for % (locked at %). Unlock first in a separate statement: set virtual_monologue_locked_at = null.',
      coalesce(old.slug, old.id::text), old.virtual_monologue_locked_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_virtual_monologue_lock on public.profiles;
create trigger trg_guard_virtual_monologue_lock
  before update of virtual_monologue on public.profiles
  for each row
  execute function public.guard_virtual_monologue_lock();
