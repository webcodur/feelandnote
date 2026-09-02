-- 2026-08 일괄 입력에서 생긴 잘린 문장과 생성 로그 조각을 폐기한다.
-- 정상 후보는 569자 이상이라 300자 경계에 걸리는 값이 없다.

update public.profiles
set virtual_monologue = null
where virtual_monologue is not null
  and char_length(btrim(virtual_monologue)) < 300;
