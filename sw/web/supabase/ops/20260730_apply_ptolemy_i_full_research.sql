-- 프톨레마이오스 1세 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택:
--   BOOK  유클리드 원론 — 프로클로스가 전한 기하학 학습 질문에서 작품을 명시
-- 기각:
--   VIDEO / GAME / MUSIC — 생전 작품 단위 소비 근거 없음
--
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '1f0fb8ea-f698-4086-ba6d-fc13e954bebe'::uuid;
  target_content_id constant text := '361dca2e-8db6-4064-bc0b-263d7e01abaa';
  target_run_id constant uuid := 'da66908b-1880-4d45-bbd3-e098f4b2c672'::uuid;
  user_content_id constant uuid := '56293ddf-451a-464c-995d-a5b9cdfd22c4'::uuid;
  accepted_book_finding_id constant uuid := '214496fa-f769-4c67-92af-cb3bdc974979'::uuid;
  rejected_video_finding_id constant uuid := 'd30a813b-a287-4bf5-8a2b-1d7f7395ff52'::uuid;
  rejected_game_finding_id constant uuid := '1f33c553-d940-431d-9956-d1e5366a6659'::uuid;
  rejected_music_finding_id constant uuid := '3bd93ab6-4a76-438b-8794-0a3e32978213'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
  expected_user_count integer;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'ptolemy-i'
      AND p.nickname = '프톨레마이오스 1세'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '프톨레마이오스 1세 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = user_content_id
  ) THEN
    RAISE EXCEPTION '프톨레마이오스 1세 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  SELECT count(*)::integer + 1
  INTO expected_user_count
  FROM public.user_contents uc
  WHERE uc.content_id = target_content_id;

  IF expected_user_count <> 22 OR NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    WHERE c.id = target_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788957338216'
      AND ko.title = '유클리드 원론'
      AND ko.verified = true
  ) THEN
    RAISE EXCEPTION '유클리드 원론 기존 콘텐츠 기준선이 달라졌습니다. 예상 user_count=%', expected_user_count;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    user_content_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    $ko$프로클로스는 프톨레마이오스 1세가 유클리드에게 『원론』보다 기하학을 더 짧게 배우는 길이 있는지 물었다고 전한다. 유클리드는 “기하학에는 왕도가 없다”고 답했다. 이 이야기는 수백 년 뒤에 기록된 전승이라는 한계가 있지만, 왕이 특정 저작을 놓고 더 쉬운 학습법을 물었다는 점에서 작품 단위 독서·학습 근거로 채택한다.$ko$,
    $en$Proclus reports that Ptolemy I asked Euclid whether there was a shorter route to geometry than through the Elements, to which Euclid replied that there was no royal road to geometry. The anecdote was recorded centuries later and must be treated as a tradition, but it explicitly places a named work within Ptolemy’s attempt to learn the subject.$en$,
    'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0086%3Avolume%3D1&force=y',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '프톨레마이오스 1세 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = target_content_id;

  IF (
    SELECT c.user_count FROM public.contents c WHERE c.id = target_content_id
  ) <> expected_user_count THEN
    RAISE EXCEPTION '유클리드 원론 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-ptolemy-i-full-v1',
    'Codex',
    ARRAY['프톨레마이오스 1세', '프톨레마이오스 소테르', 'Ptolemy I', 'Ptolemy I Soter', 'Ptolemaios I'],
    '마케도니아 장군이자 이집트 왕 프톨레마이오스 1세(기원전 367/366~282)를 천문학자 클라우디오스 프톨레마이오스, 후대 같은 이름의 왕들, 현대 작품 속 캐릭터와 분리했다.',
    '그리스어·영어·한국어 이름과 read·book·Euclid·Elements·theatre·game·music 조합으로 네 유형을 조사했다. 프로클로스가 전한 “『원론』보다 짧은 기하학 학습법” 질문은 특정 저작과 학습 행위를 함께 명시하므로, 전승의 시간적 한계를 리뷰에 밝히고 BOOK 1건으로 연결했다. 후대 영상·게임 묘사와 궁정 종교·음악 일반론은 생전 특정 작품 소비 근거가 아니어서 기각했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      accepted_book_finding_id, target_run_id, 'BOOK', 'accepted',
      '유클리드 원론', '유클리드', target_content_id,
      '프로클로스는 프톨레마이오스가 유클리드에게 『원론』보다 기하학을 더 짧게 배우는 길을 물었고 “왕도는 없다”는 답을 들었다고 전한다. 후대 전승이라는 한계를 함께 기록했다.',
      NULL
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '후대 다큐멘터리·전기극 속 프톨레마이오스 1세', NULL, NULL,
      '프톨레마이오스 왕조와 알렉산드로스 후계자 전쟁은 후대 영상물의 소재가 되었다.',
      '모두 사후 재현이다. 생전에 관람한 제목 있는 극·영상 작품은 확인되지 않는다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '후대 전략 게임의 프톨레마이오스 진영', NULL, NULL,
      '그의 전쟁과 왕국은 현대 전략 게임에서 재현된다.',
      '현대 게임 속 등장과 본인의 이용 기록은 별개다. 작품 단위 디지털 GAME 소비 근거가 없다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '알렉산드리아 궁정 의례와 사라피스 숭배의 음악', NULL, NULL,
      '프톨레마이오스 1세는 알렉산드리아 궁정과 사라피스 숭배를 후원했다.',
      '문화·종교 후원은 개인의 특정 음악 청취 기록이 아니다. 제목과 창작자가 특정되는 외부 음악 작품은 확인되지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '프톨레마이오스 1세 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', accepted_book_finding_id,
      'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0086%3Avolume%3D1&force=y',
      'primary', 'archive', 'accessible',
      'Proclus: A Commentary on the First Book of Euclid’s Elements — Perseus',
      '프톨레마이오스의 질문과 유클리드의 “왕도는 없다”는 답을 원문 번역에서 확인했다.'
    ),
    (
      target_run_id, 'BOOK', accepted_book_finding_id,
      'https://www.gutenberg.org/cache/epub/74253/pg74253-images.html',
      'secondary', 'archive', 'accessible',
      'The First Book of Euclid’s Elements with Proclus’ Commentary — Project Gutenberg',
      '같은 일화의 번역과 문맥을 독립 공개본에서 교차 확인했다.'
    ),
    (
      target_run_id, 'BOOK', accepted_book_finding_id,
      'https://search.shopping.naver.com/book/catalog/35911996625',
      'secondary', 'official_profile', 'accessible',
      '유클리드 원론 — 네이버 도서',
      '서비스에 이미 등록된 ISBN 9788957338216 한국어 판본의 메타데이터를 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/ptolemyi.html',
      'secondary', 'official_profile', 'accessible',
      'Ptolemy I — UCL Digital Egypt',
      '생애·통치 기록을 대조하고 후대 영상 재현과 생전 관람을 분리했다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://www.britishmuseum.org/collection/term/BIOG55387',
      'secondary', 'official_profile', 'accessible',
      'Ptolemy I — British Museum',
      '인물 식별과 역사적 활동 범위를 확인했으며 현대 전략 게임 속 등장을 소비 근거로 쓰지 않았다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/ptolemyi.html',
      'secondary', 'official_profile', 'accessible',
      'Ptolemy I — UCL Digital Egypt',
      '궁정·종교 후원과 작품 단위 개인 청취를 구별했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '프톨레마이오스 1세 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Ptolemy I·Soter·프톨레마이오스와 Euclid·Elements·read·learn 조합을 조사했다. 프로클로스 주석에서 작품명과 학습 질문을 확인하고 후대 전승이라는 증거 강도를 함께 기록했다.'
      WHEN 'VIDEO' THEN
        'watched·theatre·spectacle·film 조합을 생애 자료와 대조했다. 후대 재현 외에 생전 제목 있는 관람작은 확인되지 않았다.'
      WHEN 'GAME' THEN
        'game·played·strategy 조합을 조사했다. 현대 게임의 등장인물·진영과 본인의 소비를 분리했으며 디지털 GAME 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·heard·court·Sarapis 조합을 조사했다. 궁정과 종교 후원은 확인되지만 특정 외부 음악의 개인 청취는 확인되지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '프톨레마이오스 1세 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '프톨레마이오스 1세 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id = target_celeb_id
    AND profile_type = 'CELEB'
    AND status = 'active'
    AND celeb_tier = 'light'
    AND content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '프톨레마이오스 1세 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.run_id = target_run_id
      AND f.decision = 'accepted'
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
    RAISE EXCEPTION '프톨레마이오스 1세 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.contents c ON c.id = target_content_id
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 1
      AND c.user_count = expected_user_count
  ) THEN
    RAISE EXCEPTION '프톨레마이오스 1세 최종 원장 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
