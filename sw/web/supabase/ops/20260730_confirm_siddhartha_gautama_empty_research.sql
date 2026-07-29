-- 석가모니 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  두 수행 스승의 가르침 — 학습 기록은 있으나 제목 있는 저작이 아님
--   VIDEO 공연·경기 관람 목록 — 수행자가 삼가는 항목이며 특정 작품이 아님
--   GAME  여덟 줄·열 줄 판놀이 등 — 수행자가 삼가는 유희 목록이며 플레이 근거가 아님
--   MUSIC 노래·기악 연주 — 수행자가 삼가는 항목이며 특정 작품이 아님
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'd8b7bbec-0610-42bf-8970-8b0846f0b63e'::uuid;
  target_run_id constant uuid := '4e436349-2185-42cf-a608-3a119f053fb8'::uuid;
  rejected_book_finding_id constant uuid := 'ea327f87-0121-4cf1-844b-b2ea35db4885'::uuid;
  rejected_video_finding_id constant uuid := 'be1c0be0-9daa-4d3f-84ad-f274883d2f4c'::uuid;
  rejected_game_finding_id constant uuid := '7fe78fa2-06cb-46a0-bbaa-d51853fce6e6'::uuid;
  rejected_music_finding_id constant uuid := '16cb4e0d-7b69-465d-ba07-8a785c63448b'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'siddhartha-gautama'
      AND p.nickname = '석가모니'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '석가모니 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '석가모니에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id
       OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      rejected_book_finding_id,
      rejected_video_finding_id,
      rejected_game_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '석가모니 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id,
    celeb_id,
    batch_key,
    researcher_label,
    name_variants,
    homonym_notes,
    summary
  )
  VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-siddhartha-gautama-full-v1',
    'Codex',
    ARRAY[
      '석가모니',
      '고타마 붓다',
      '싯다르타 고타마',
      '샤카무니',
      'Siddhartha Gautama',
      'Gautama Buddha',
      'Shakyamuni Buddha'
    ],
    '석가모니의 가르침을 사후에 구전·편찬한 팔리 경전과 후대 불교 저술은 본인이 소비한 작품으로 세지 않았다. 제목에 Buddha·Siddhartha가 들어간 현대 영화·음악·게임과 불교 소재 작품도 후대 창작물이므로 제외했다.',
    '한국어·영어·산스크리트계 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 초기 불교 문헌의 자전적 대목과 현대 학술 개설을 대조했다. 두 스승의 가르침을 학습한 기록은 있으나 제목 있는 저작이 아니며, 베다·우파니샤드나 후대 불경을 읽었다는 작품 단위 근거도 없다. 공연·음악·판놀이는 오히려 출가 수행자가 삼가는 항목으로 열거된다. 네 유형 모두 채택 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id,
    run_id,
    content_type,
    decision,
    title,
    creator,
    content_id,
    evidence_summary,
    rejection_reason
  )
  VALUES
    (
      rejected_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '알라라 칼라마와 웃다카 라마풋타의 가르침(저작명 미상)',
      '알라라 칼라마 · 웃다카 라마풋타',
      NULL,
      '『맛지마 니까야』 26은 고타마가 두 스승에게서 가르침을 빠르게 배우고 직접 수행해 성취한 뒤 만족하지 못해 떠났다고 전한다.',
      '본문은 구전·수행 가르침만 기록하며 책·경전의 제목이나 판본을 제시하지 않는다. 팔리 경전 자체도 석가모니 사후 수세기 뒤 문자화된 전승이므로 그가 읽은 도서로 역등록할 수 없다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '춤·노래·연극·경기 관람 목록(작품명 미상)',
      NULL,
      NULL,
      '『디가 니까야』 2는 출가 수행자가 춤·노래·기악·연극·곡예·동물 경기와 무술 경기 관람을 삼간다고 열거한다.',
      '특정 공연·영상 작품을 실제로 관람했다는 기록이 아니라 피해야 할 범주의 규범적 목록이다. 작품명과 창작자도 없어 VIDEO 콘텐츠로 등록할 수 없다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '여덟 줄·열 줄 판놀이 등 유희 목록',
      NULL,
      NULL,
      '『디가 니까야』 2는 여덟 줄·열 줄 판놀이, 공중 판놀이, 주사위, 공놀이 등 당시 유희를 구체적으로 열거한다.',
      '본문은 출가 수행자가 이런 유희를 삼간다고 말한다. 석가모니가 실제로 플레이했다는 긍정 근거가 아니며 현대 DB 작품과 안전하게 동일시할 수도 없다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '노래·기악 연주(작품명 미상)',
      NULL,
      NULL,
      '초기 불교 문헌은 노래와 춤을 삼가는 수행 규범을 전하며, 『디가 니까야』 2도 노래·기악과 공연 관람을 피하는 항목으로 든다.',
      '좋아하거나 들은 특정 곡·연주·창작자를 밝힌 기록이 아니고, 오히려 출가자의 절제를 설명하는 부정적 근거이므로 MUSIC 작품으로 등록할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '석가모니 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id,
    content_type,
    finding_id,
    url,
    source_tier,
    source_kind,
    access_status,
    title,
    notes
  )
  VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.dhammatalks.org/suttas/MN/MN26.html',
      'primary',
      'transcript',
      'accessible',
      'MN 26 The Noble Search',
      '석가모니에게 귀속된 자전적 설법에서 두 스승의 가르침을 배우고 수행한 과정은 나오지만 제목 있는 저작은 나오지 않는다. 사후 구전 전승이라는 한계는 별도 학술 자료와 함께 적용했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://plato.stanford.edu/entries/buddha/',
      'secondary',
      'article',
      'accessible',
      'Buddha, Stanford Encyclopedia of Philosophy',
      '현대 학계가 석가모니 사후 수세기 뒤 문자화된 상이한 전승을 통해 그의 사상을 복원한다는 자료상 한계와 베다 권위에 대한 비판적 위치를 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://iep.utm.edu/buddha/',
      'secondary',
      'article',
      'accessible',
      'Buddha, Internet Encyclopedia of Philosophy',
      '팔리 문헌의 베다·성전 언급은 브라만의 구전 전통과 권위에 대한 논박이며, 석가모니가 특정 판본을 읽었다는 작품 소비 증거가 아님을 대조했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://www.dhammatalks.org/suttas/DN/DN02.html',
      'primary',
      'transcript',
      'accessible',
      'DN 2 The Fruits of the Contemplative Life',
      '춤·노래·기악·연극·곡예·경기 관람은 수행자가 삼가는 대상으로 열거되며 특정 관람 작품은 없다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://www.metmuseum.org/essays/life-of-the-buddha',
      'secondary',
      'article',
      'accessible',
      'Life of the Buddha, The Metropolitan Museum of Art',
      '역사적 활동 시기와 전승·전설의 층위를 확인하고 현대 영상 작품이나 특정 고대 공연 관람을 후대 서사에서 역추론하지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://www.dhammatalks.org/suttas/DN/DN02.html',
      'primary',
      'transcript',
      'accessible',
      'DN 2 The Fruits of the Contemplative Life',
      '여덟 줄·열 줄 판놀이, 주사위와 공놀이 등은 수행자가 삼가는 유희로 열거된다. 플레이했다는 진술과 반대 방향의 근거다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.dhammatalks.org/suttas/DN/DN02.html',
      'primary',
      'transcript',
      'accessible',
      'DN 2 The Fruits of the Contemplative Life',
      '노래·기악과 공연 관람을 삼가는 수행 규범만 있으며 특정 음악 작품이나 선호 발언은 없다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://suttacentral.net/an3.107/en/sujato',
      'primary',
      'transcript',
      'accessible',
      'AN 3.107 Wailing',
      '노래를 울음, 춤을 광기로 여겨 끊으라는 설법 전승을 대조했다. 특정 곡을 들었다거나 좋아했다는 근거가 아니다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 8 THEN
    RAISE EXCEPTION '석가모니 조사 source 생성 행 수가 8이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '석가모니·고타마 붓다·싯다르타 고타마·Siddhartha Gautama·Gautama Buddha와 read·book·text·Veda·Upanishad·teacher 조합을 검색했다. MN 26의 두 스승 학습 기록은 제목 있는 저작이 아니며, 후대 편찬 경전과 본인의 가르침은 소비 도서에서 제외했다. 베다·우파니샤드도 사상적 배경이나 논박 대상일 뿐 특정 작품 독서 근거가 없다.'
      WHEN 'VIDEO' THEN
        'watch·performance·play·drama·favorite show와 한국어 공연·관람 조합을 검색하고 생애 자료와 초기 문헌을 대조했다. DN 2에는 공연과 경기 관람을 삼가는 규범만 있고 실제로 본 특정 작품은 없다. 현대의 석가모니 소재 영화·TV는 후대 창작이라 제외했다.'
      WHEN 'GAME' THEN
        'game·board game·played·ashtapada와 놀이·판놀이·주사위 조합을 검색했다. DN 2의 여덟 줄·열 줄 판놀이 등은 하지 말아야 할 유희 목록이지 본인의 플레이 이력이 아니므로 전부 기각했다. 현대 불교 소재 게임도 후대 창작이라 제외했다.'
      WHEN 'MUSIC' THEN
        'music·song·chant·favorite music와 음악·노래·찬가·공연 조합을 검색했다. 초기 문헌은 노래·기악·춤을 삼가는 규범을 전할 뿐 특정 곡·창작자·청취 경험은 제시하지 않는다. 불교 찬가와 후대 의식 음악은 석가모니 사후 창작이라 제외했다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '석가모니 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT
    result.final_research_status,
    result.actual_content_count
  INTO
    completed_status,
    completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION
      '석가모니 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
      completed_status,
      completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (
        SELECT count(*)
        FROM public.user_contents uc
        WHERE uc.user_id = p.id
      ) = 0
  ) THEN
    RAISE EXCEPTION '석가모니 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.celeb_id = target_celeb_id
      AND r.status = 'completed'
      AND r.completed_at IS NOT NULL
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_scopes s
        WHERE s.run_id = r.id
          AND s.status = 'completed'
      ) = 4
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_findings f
        WHERE f.run_id = r.id
          AND f.decision = 'rejected'
      ) = 4
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_sources src
        WHERE src.run_id = r.id
      ) = 8
  ) THEN
    RAISE EXCEPTION '석가모니 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
