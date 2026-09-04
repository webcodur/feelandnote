-- celeb_tier에서 fiction을 완전히 폐기한다. 원래 설계(20260904020000 주석 참고)대로
-- celeb_tier는 파이프라인 분기(full/light)만 남기고, 실존·전승 판단은 celeb_reality가 전담한다.
--
-- 이제 인물 등장·연관 도서(figure_book_*)가 celeb_tier와 무관하게 모든 인물을 연결할 수
-- 있어(20260903110000) fiction 티어가 원래 하던 라우팅 역할 자체가 없어졌다 — 관우도
-- 『삼국지연의』 원전 관계를 가질 수 있는데 실존 인물이라 fiction일 수 없는 모순이 그 증거다.
--
-- 순서 준수: 이 마이그레이션은 애플리케이션 코드가 celeb_reality 기준으로 이미 전환된
-- 뒤에만 적용한다. 코드가 아직 celeb_tier='fiction'을 참조하는 상태로 이걸 먼저 적용하면
-- 홈피드·게임·검색 35곳 이상의 노출 필터가 무력화되어 484명이 한꺼번에 노출된다.
--
-- 적용: 운영 DB에 SSH로 docker exec ... psql -f 실행.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- 1. 연표 형식 가드를 celeb_tier 대신 celeb_reality 기준으로 재설계한다.
--    FICTION: 서사 순서 라벨만(연도 금지) — 기존 fiction 티어와 동일한 제약.
--    REAL: 달력 날짜만(순서 라벨 금지) — 기존 비fiction 티어와 동일한 제약.
--    BOTH: 한 행 안에서 두 형식 중 하나로 완결되면 허용 — 실존 핵심 사건은 달력 날짜로,
--          전승 사건은 서사 순서 라벨로, 인물 안에서 섞어 쓸 수 있게 연다.
create or replace function private.timeline_event_position_guard()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  v_reality text;
  v_is_sequence_row boolean;
  v_is_calendar_row boolean;
begin
  select celeb.celeb_reality
  into v_reality
  from public.celebs as celeb
  where celeb.id = new.celeb_id
  for update;

  if not found then
    raise exception 'timeline event celeb does not exist';
  end if;

  v_is_sequence_row := (
    new.year is null
    and new.year_end is null
    and new.month is null
    and nullif(btrim(new.sequence_label), '') is not null
    and nullif(btrim(new.sequence_label_en), '') is not null
  );

  v_is_calendar_row := (
    new.sequence_label is null
    and new.sequence_label_en is null
    and (new.year is not null or (new.year_end is null and new.month is null))
  );

  if v_reality = 'FICTION' then
    if not v_is_sequence_row then
      raise exception 'FICTION reality timeline events require bilingual sequence labels and no calendar date';
    end if;
  elsif v_reality = 'REAL' then
    if not v_is_calendar_row then
      raise exception 'REAL reality timeline events require null sequence labels and no date residue when undated';
    end if;
  else -- BOTH
    if not (v_is_sequence_row or v_is_calendar_row) then
      raise exception 'BOTH reality timeline events must be a complete sequence-label row or a complete calendar-date row, not mixed';
    end if;
  end if;

  return new;
end;
$function$;

-- 2. celeb_tier='fiction' 행을 light로 옮긴다. celeb_reality는 그대로 둔다 — 이미
--    BOTH/FICTION으로 정확히 분류돼 있고(20260904020000 백필 + 이번 세션 수동 분류),
--    fiction 티어였던 행은 정의상 celeb_contents가 없으므로 light 승격 트리거와 충돌하지 않는다.
update public.celebs
set celeb_tier = 'light'
where celeb_tier = 'fiction';

-- 3. 검증: fiction 티어가 완전히 사라졌는지, BOTH·FICTION 인물의 연표가 새 가드를
--    그대로 통과하는지 확인한다.
do $verify$
declare
  leftover_tier integer;
  bad_timeline integer;
begin
  select count(*) into leftover_tier from public.celebs where celeb_tier = 'fiction';
  if leftover_tier > 0 then
    raise exception 'celeb_tier=fiction이 %건 남았습니다', leftover_tier;
  end if;

  select count(*) into bad_timeline
  from public.celeb_timeline_events e
  join public.celebs c on c.id = e.celeb_id
  where not (
    case c.celeb_reality
      when 'FICTION' then (
        e.year is null and e.year_end is null and e.month is null
        and nullif(btrim(e.sequence_label), '') is not null
        and nullif(btrim(e.sequence_label_en), '') is not null
      )
      when 'REAL' then (
        e.sequence_label is null and e.sequence_label_en is null
        and (e.year is not null or (e.year_end is null and e.month is null))
      )
      else (
        (e.year is null and e.year_end is null and e.month is null
          and nullif(btrim(e.sequence_label), '') is not null
          and nullif(btrim(e.sequence_label_en), '') is not null)
        or (e.sequence_label is null and e.sequence_label_en is null
          and (e.year is not null or (e.year_end is null and e.month is null)))
      )
    end
  );
  if bad_timeline > 0 then
    raise exception '새 연표 가드를 통과 못하는 기존 행이 %건 있습니다', bad_timeline;
  end if;
end;
$verify$;

commit;
