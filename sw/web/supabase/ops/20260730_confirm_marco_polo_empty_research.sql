-- 마르코 폴로 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK   알렉산더 로망스 전승 — 문학적 흔적은 있으나 읽은 언어·판본·개별 작품을 식별할 수 없음
--   GAME   쿠빌라이 궁정의 사냥·유희 — 실제 활동이며 디지털 작품이 아님
--   MUSIC  쿠빌라이 궁정 연회·전투 음악 — 실제 청취 가능성은 있으나 곡명·창작자가 없음
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '3e21d6ff-e57d-42cd-89ff-048d814ee942'::uuid;
  target_run_id constant uuid := '25894848-2219-49f0-80f2-650feda4bf11'::uuid;
  rejected_book_finding_id constant uuid := 'bdc99cab-a4ba-460f-bdb9-121a52c461e5'::uuid;
  rejected_game_finding_id constant uuid := '7f1c9650-ead9-457f-8353-70e2d02d8f63'::uuid;
  rejected_music_finding_id constant uuid := '596d3a55-27fc-4929-b410-6edc0019b31c'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'marco-polo'
      AND p.nickname = '마르코 폴로'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '마르코 폴로 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '마르코 폴로에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      rejected_book_finding_id,
      rejected_game_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '마르코 폴로 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-marco-polo-full-v1',
    'Codex',
    ARRAY[
      '마르코 폴로', 'Marco Polo', 'Marco Paulo', 'Марко Поло',
      '馬可·波羅', '马可·波罗', 'Il Milione'
    ],
    '베네치아 여행가 마르코 폴로(1254~1324)를 수영장 놀이, 폴로 경기, 동명 현대인, 후대 소설·영화·드라마·게임 속 인물과 분리했다. 《동방견문록》은 루스티켈로 다 피사가 받아 적은 본인 여행담이므로 외부 독서 콘텐츠에서 제외했다.',
    '영어·이탈리아어·중국어·한국어 이름 변형으로 네 유형을 조사하고 《동방견문록》 원문·헨리 율 주석, 이란 백과사전과 스미스소니언 전기를 대조했다. 알렉산더 로망스의 문학적 흔적은 있으나 폴로가 읽은 개별 언어·판본·작품을 식별하지 못했다. 쿠빌라이 궁정의 음악·사냥·유희는 제목 있는 작품이 아니며 특정 영상·디지털 게임도 없다. 본인 여행담과 후대 각색물을 제외하고 등록 가능한 콘텐츠가 없어 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '알렉산더 로망스 전승',
      '익명·가탁 전승',
      NULL,
      '헨리 율 주석은 철문·곡과 마곡·태양과 달의 나무 같은 반복 모티프를 근거로 마르코의 독서에 알렉산더 모험 로망스가 포함됐을 가능성을 제시한다.',
      '이는 여러 언어·수많은 변형으로 퍼진 전승군이며 읽은 언어·개별 서명·저자·판본이 확인되지 않는다. 서술에는 루스티켈로의 로망스 문체가 섞였을 가능성도 있어 특정 BOOK으로 확정할 수 없다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '쿠빌라이 궁정의 사냥·유희',
      NULL,
      NULL,
      '《동방견문록》은 쿠빌라이의 사냥·잔치·궁정 오락을 자세히 묘사한다.',
      '실제 사냥·의례·물리 유희이며 작품 단위 디지털 GAME이 아니다. 마르코 폴로 수영장 놀이와 폴로 경기는 이름만 비슷한 후대·별개 대상이다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '쿠빌라이 궁정의 연회·전투 음악',
      NULL,
      NULL,
      '《동방견문록》은 대칸이 술을 마실 때 여러 악기가 연주되고 나얀 전투 전에 양군의 악기와 노래가 울렸다고 묘사한다.',
      '연주 상황과 악기군은 확인되지만 곡명·작곡가·연주자·가사가 전하지 않는다. 현대 음원 식별자를 임의로 붙일 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '마르코 폴로 조사 finding 생성 행 수가 3이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.gutenberg.org/files/10636/10636-h/10636-h.htm',
      'secondary',
      'archive',
      'accessible',
      'The Travels of Marco Polo, Volume I — Yule-Cordier edition',
      '편집자 주석 73절이 알렉산더 로망스 독서 가능성을 제시하지만 수많은 언어·판본 중 개별 작품을 특정하지 못한다.'
    ),
    (
      target_run_id,
      'BOOK',
      NULL,
      'https://www.iranicaonline.org/articles/polo-marco/',
      'secondary',
      'article',
      'accessible',
      'POLO, MARCO — Encyclopaedia Iranica',
      '루스티켈로가 감옥에서 폴로의 회고를 프랑스어로 적은 저술 관계를 확인해 본인 여행담과 외부 독서를 분리했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://festival.si.edu/2002/the-silk-road/venice-travelers/smithsonian',
      'secondary',
      'official_profile',
      'accessible',
      'Venice Piazza — Travelers, Smithsonian Folklife Festival',
      '생애와 귀환·수감·구술 저술을 film·play·watched 조합으로 대조했다. 본인이 감상한 특정 영상·극 작품은 없고 후대 Marco Polo 작품만 반복됐다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://festival.si.edu/2002/the-silk-road/venice-travelers/smithsonian',
      'secondary',
      'official_profile',
      'accessible',
      'Venice Piazza — Marco Polo name and games',
      '스미스소니언은 수영장 놀이의 기원은 불명이며 마르코 폴로의 이름이 아시아 폴로 경기와 무관하다고 명시한다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.gutenberg.org/files/10636/10636-h/10636-h.htm',
      'primary',
      'direct_statement',
      'accessible',
      'The Travels of Marco Polo — Kublai court music passages',
      '대칸의 음주 때 여러 악기가 연주되는 대목과 나얀 전투 전 음악·합창 대목을 확인했으나 작품명은 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '마르코 폴로 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Marco Polo·Marco Paulo·馬可波羅와 read·reading·book·romance·Alexander·libro 조합을 검색했다. 알렉산더 로망스 흔적은 전승군 수준이며 개별 작품·판본을 특정할 수 없고 《동방견문록》은 본인 구술 저술이라 제외했다.'
      WHEN 'VIDEO' THEN
        'watched·film·theatre·play·performance 조합을 공식 전기와 여행담에서 검색했다. 생전 특정 작품 관람은 없고 검색 결과는 후대 영화·드라마·뮤지컬로만 이어졌다.'
      WHEN 'GAME' THEN
        'game·played·chess·polo·hunt·놀이 조합을 검색했다. 궁정 사냥·유희는 실제 활동이고 수영장 Marco Polo와 폴로 경기는 인물과 무관해 디지털 GAME 0건이다.'
      WHEN 'MUSIC' THEN
        'music·song·instrument·court·feast·연회·악기 조합을 여행담 원문에서 대조했다. 궁정·전투 음악 상황은 있으나 곡명·창작자·연주자가 없어 식별 가능한 MUSIC은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '마르코 폴로 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '마르코 폴로 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '마르코 폴로 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 3
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 5
  ) THEN
    RAISE EXCEPTION '마르코 폴로 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
