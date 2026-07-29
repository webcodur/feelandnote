-- 투키디데스 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택: BOOK 『일리아스』 — 1.10에서 함선 목록과 승선 인원을 직접 계산·비판
-- 기각: 델로스 공연·경기·아폴론 찬가는 역사 서술의 인용 대상이지 개인 관람·플레이·청취 기록이 아님
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '2b98ba7b-6948-45ee-8832-60f49d4ccc27'::uuid;
  target_content_id constant text := 'a357d566-f0b3-49bf-9d12-78b694e0c006';
  target_run_id constant uuid := '03cb3c60-f26b-4bca-a13f-3cea2dc3ea89'::uuid;
  user_content_id constant uuid := 'e4289566-e2a2-46fc-842a-0bd7bb71db39'::uuid;
  accepted_book_finding_id constant uuid := '86e07b0b-6ccd-4ef4-b7d0-bfc8a33c6780'::uuid;
  rejected_video_finding_id constant uuid := '78055f91-ec05-439f-96d9-1a926c96912f'::uuid;
  rejected_game_finding_id constant uuid := '88971f45-c2ea-4cf3-964d-0c6d5224d071'::uuid;
  rejected_music_finding_id constant uuid := 'c2cda4b9-dd29-45c8-b935-d2163a4cd63d'::uuid;
  affected integer;
  expected_user_count integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'thucydides'
      AND p.nickname = '투키디데스'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '투키디데스 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = user_content_id
  ) THEN
    RAISE EXCEPTION '투키디데스 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  SELECT count(*)::integer + 1
  INTO expected_user_count
  FROM public.user_contents uc
  WHERE uc.content_id = target_content_id;

  IF expected_user_count <> 14 OR NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    WHERE c.id = target_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788991290167'
      AND ko.title = '일리아스'
      AND ko.verified = true
  ) THEN
    RAISE EXCEPTION '일리아스 기존 콘텐츠 기준선이 달라졌습니다. 예상 user_count=%', expected_user_count;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    user_content_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    $ko$투키디데스는 『펠로폰네소스 전쟁사』 1권 10장에서 “호메로스의 시”를 증거로 삼되 시인의 과장을 감안해야 한다고 선을 긋는다. 이어 『일리아스』 2권의 함선 목록에서 1,200척, 보이오티아 배의 120명, 필록테테스 배의 50명을 뽑아 평균 병력을 계산한다. 작품의 구체적인 대목을 읽고 비판적으로 분석한 직접 근거이므로 등록한다.$ko$,
    $en$In Book 1.10 of the History, Thucydides invokes “Homer’s poems” as evidence while warning that a poet may exaggerate. He then extracts the twelve hundred ships and the crew figures for the Boeotian and Philoctetean vessels from the Catalogue of Ships in Iliad Book 2 and uses them to estimate the force. This is direct, critical engagement with a specific part of the work.$en$,
    'https://www.perseus.tufts.edu/hopper/text.jsp?doc=Thuc.+1.10&fromdoc=Perseus%3Atext%3A1999.01.0200',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '투키디데스 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = target_content_id;

  IF (
    SELECT c.user_count FROM public.contents c WHERE c.id = target_content_id
  ) <> expected_user_count THEN
    RAISE EXCEPTION '일리아스 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-thucydides-full-v1',
    'Codex',
    ARRAY['투키디데스', '투퀴디데스', 'Thucydides', 'Thoukydides', 'Θουκυδίδης'],
    '기원전 5세기 아테네 역사가·장군 투키디데스를 동명 후대 인물, 자신의 『펠로폰네소스 전쟁사』, 현대 전쟁사 영상·게임과 분리했다.',
    '그리스어·영어·한국어 이름과 Homer·Iliad·read·theatre·games·hymn 조합으로 네 유형을 조사했다. 『전쟁사』 1.10에서 『일리아스』 2권 함선 목록의 수치를 뽑아 계산하고 시적 과장을 비판한 직접 근거를 BOOK 1건으로 채택했다. 델로스의 공연·경기와 「아폴론 찬가」는 과거 관습을 설명하기 위해 인용한 자료이며, 본인의 특정 관람·플레이·청취 기록은 아니어서 나머지 유형에서 기각했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      accepted_book_finding_id, target_run_id, 'BOOK', 'accepted',
      '일리아스', '호메로스', target_content_id,
      '『전쟁사』 1.10에서 『일리아스』 2권 함선 목록의 선박·승선 인원을 직접 추출해 평균 병력을 계산하고 시적 과장을 비판한다.',
      NULL
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '델로스 제전의 합창·춤·공연', NULL, NULL,
      '『전쟁사』 3.104는 델로스의 옛 제전에 합창과 춤, 공연이 있었다고 서술한다.',
      '역사적 제전 관습의 서술이며 투키디데스 본인이 관람한 제목 있는 극·영상 작품이 아니다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '델로스의 체육 경기와 펠로폰네소스 전쟁', NULL, NULL,
      '델로스 제전의 체육 경기와 실제 전쟁·전략 활동이 저술에 등장한다.',
      '신체 경기와 실제 전쟁은 작품 단위 디지털 GAME이 아니며 본인의 플레이 기록도 없다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '호메로스의 아폴론 찬가', '호메로스 전승', NULL,
      '『전쟁사』 3.104에서 델로스 제전의 옛 모습을 증명하기 위해 「아폴론 찬가」 구절을 직접 인용한다.',
      '가사 텍스트를 역사 사료로 인용한 근거는 있으나 특정 선율·연주를 본인이 들었다는 기록은 아니다. BOOK과 MUSIC을 중복 등록하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '투키디데스 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', accepted_book_finding_id,
      'https://www.perseus.tufts.edu/hopper/text.jsp?doc=Thuc.+1.10&fromdoc=Perseus%3Atext%3A1999.01.0200',
      'primary', 'archive', 'accessible',
      'Thucydides, The Peloponnesian War, Book 1, chapter 10 — Perseus',
      '호메로스 시의 과장 가능성을 논하고 함선 목록의 수치로 병력을 계산하는 본문을 확인했다.'
    ),
    (
      target_run_id, 'BOOK', accepted_book_finding_id,
      'https://www.cambridge.org/core/books/poetry-and-number-in-graecoroman-antiquity/numbers-up/5B8C3F5E4A6D85D17DDEE95A133C6AEB',
      'secondary', 'article', 'accessible',
      'Numbers Up — Poetry and Number in Graeco-Roman Antiquity',
      '투키디데스 1.10이 『일리아스』 2권 함선 목록을 수치적으로 읽은 대목임을 현대 고전학 연구로 교차 확인했다.'
    ),
    (
      target_run_id, 'BOOK', accepted_book_finding_id,
      'https://search.shopping.naver.com/book/catalog/32496299812',
      'secondary', 'official_profile', 'accessible',
      '일리아스 — 네이버 도서',
      '서비스에 이미 등록된 ISBN 9788991290167 한국어 판본과 표지를 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://scaife-reader.perseus.tufts.edu/reader/urn%3Acts%3AgreekLit%3Atlg0003.tlg001.1st1K-eng1%3A3.104/',
      'primary', 'archive', 'accessible',
      'Thucydides, History of the Peloponnesian War 3.104 — Scaife Viewer',
      '델로스 제전의 합창·춤·공연 서술을 확인하고 개인 관람작과 분리했다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://fdz.bib.uni-mannheim.de/cynisca/items/show/79',
      'primary', 'archive', 'accessible',
      'Thucydides 3.104.3–5: spectators at the Delian games — Cynisca',
      '음악·체육 경기가 열린 역사적 제전 기록이며 디지털 GAME이 아님을 확인했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://scaife-reader.perseus.tufts.edu/reader/urn%3Acts%3AgreekLit%3Atlg0003.tlg001.1st1K-eng1%3A3.104/',
      'primary', 'archive', 'accessible',
      'Thucydides, History of the Peloponnesian War 3.104 — Scaife Viewer',
      '「아폴론 찬가」의 가사 인용은 확인되나 투키디데스가 특정 연주를 들었다는 기록은 아니다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '투키디데스 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'Thucydides·투키디데스와 Homer·Iliad·read·catalogue of ships 조합을 조사했다. 1.10에서 『일리아스』 2권의 수치를 직접 계산·비판한 근거를 확인했다.'
        WHEN 'VIDEO' THEN 'theatre·spectacle·performance·watched 조합과 3.104를 대조했다. 델로스 공연은 역사 서술이며 개인의 제목 있는 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·contest·strategy 조합을 조사했다. 체육 경기와 실제 전쟁을 디지털 GAME에서 분리했다.'
        WHEN 'MUSIC' THEN 'music·song·hymn·heard 조합을 조사했다. 「아폴론 찬가」 가사 인용은 텍스트 활용이며 특정 연주 청취 근거는 아니다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '투키디데스 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '투키디데스 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id = target_celeb_id
    AND profile_type = 'CELEB' AND status = 'active'
    AND celeb_tier = 'light' AND content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '투키디데스 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.run_id = target_run_id AND f.decision = 'accepted'
      AND (
        f.content_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.user_contents uc
          WHERE uc.user_id = target_celeb_id AND uc.content_id = f.content_id
        )
        OR NOT EXISTS (
          SELECT 1 FROM public.celeb_content_research_sources src
          WHERE src.finding_id = f.id AND src.source_tier = 'primary'
        )
      )
  ) THEN
    RAISE EXCEPTION '투키디데스 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
