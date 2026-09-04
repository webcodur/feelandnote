-- celeb_reality를 NOT NULL·기본값 없이 추가한 20260904020000의 결함을 고친다.
--
-- 증상: celeb_reality를 명시하지 않는 모든 신규 등록 경로가 not-null 위반으로 실패했다.
-- 백오피스 createCeleb(sw/web-bo/src/actions/admin/celebs.ts)에는 celeb_reality가 아예
-- 없어 인물 신규 등록이 통째로 막혀 있었고, scripts/fiction/seed-inactive.ts도 같은 이유로
-- 깨져 있었다(다른 세션이 그 스크립트에는 값을 직접 넣어 우회함).
--
-- 조치: celeb_tier가 'full'을 기본값으로 갖는 것과 같은 방식으로 celeb_reality에 'REAL'을
-- 기본값으로 준다. 새로 등록하는 인물은 별도 판단이 없으면 실존 인물이라는 뜻이고,
-- 전승·허구 인물은 등록 시 BOTH·FICTION을 명시한다. CHECK 제약은 그대로 둔다.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.celebs
  alter column celeb_reality set default 'REAL';

do $verify$
declare
  v_default text;
begin
  select column_default into v_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'celebs' and column_name = 'celeb_reality';

  if v_default is null or position('REAL' in v_default) = 0 then
    raise exception 'celeb_reality 기본값이 설정되지 않았습니다(현재: %)', coalesce(v_default, '(없음)');
  end if;
end;
$verify$;

commit;
