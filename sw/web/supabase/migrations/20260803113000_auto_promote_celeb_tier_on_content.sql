-- 감상 기록이 처음 들어온 인물을 light → full 로 자동 승격.
--
-- 배경: trg_celeb_full_requires_content(2026-06-22)가 "기록 0건이면 full 금지"를 강제한다.
-- 그래서 신규 등록은 언제나 light이고, 지금까지 full 승격은 목록 화면에서 사람이 눌러야 했다.
-- 실측(2026-08-03)상 full 1,456명은 전원 기록 보유, light 707명은 전원 기록 0건이라
-- "기록 유무 = 등급"이 이미 사실상의 규칙이다. 이 트리거가 그 규칙을 스스로 유지한다.
--
-- 범위: light 만 올린다. fiction은 성격이 다른 등급이라 건드리지 않는다.
-- 강등(마지막 기록 삭제 시 full → light)은 넣지 않았다. 사람이 판단할 일로 남긴다.
--
-- 순서 주의: AFTER INSERT 라 같은 트랜잭션에서 user_contents 행이 이미 보이므로
-- profiles 쪽 검증 트리거(EXISTS 검사)를 통과한다.

create or replace function public.promote_celeb_tier_on_first_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set celeb_tier = 'full'
  where id = new.user_id
    and profile_type = 'CELEB'
    and celeb_tier = 'light';

  return null;
end;
$$;

comment on function public.promote_celeb_tier_on_first_content() is
  '감상 기록이 생기면 light 인물을 full 로 올린다. fiction 등급은 제외.';

-- SECURITY DEFINER 트리거 함수는 직접 호출할 이유가 없다. PUBLIC 기본 EXECUTE를 회수해
-- Data API 역할이 함수 엔드포인트로 실행하지 못하게 한다.
revoke all on function public.promote_celeb_tier_on_first_content()
  from public, anon, authenticated;

drop trigger if exists trg_promote_celeb_tier_on_content on public.user_contents;
create trigger trg_promote_celeb_tier_on_content
  after insert on public.user_contents
  for each row
  execute function public.promote_celeb_tier_on_first_content();
