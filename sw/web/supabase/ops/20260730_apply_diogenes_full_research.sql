-- 디오게네스의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 반영한다.
-- 채택: 『일리아스』, 『오뒷세이아』, 『메데이아』, 『포이니케 여인들』
-- 근거: 디오게네스 라에르티오스 6.55·57·67·104에 보존된 작품별 직접 인용.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'eb0aa2b6-89e2-484c-8648-4e7c71141ea0'::uuid;
  target_run_id constant uuid := '70ef0f99-27da-4143-8d5d-13c81ac7bbb9'::uuid;
  iliad_content_id constant text := 'a357d566-f0b3-49bf-9d12-78b694e0c006';
  odyssey_content_id constant text := '7dac869b-c4b0-4473-88e0-1ca0156ad850';
  medea_content_id constant text := '4c82861d-e47e-4c33-b9e8-a9f9ad1a50eb';
  phoenician_content_id constant text := '93c10333-fd21-466a-9fd3-b94f13052006';
  iliad_uc_id constant uuid := '1cfb05d7-b2c3-4560-a195-21d76ebaf627'::uuid;
  odyssey_uc_id constant uuid := '90ee2ca7-64c2-464e-8fc3-feef717fdb97'::uuid;
  medea_uc_id constant uuid := '78a895ed-53cb-453e-8312-37242a602060'::uuid;
  phoenician_uc_id constant uuid := '7f249cde-72ef-421c-a2e3-40851f1cec3d'::uuid;
  iliad_finding_id constant uuid := '5c670fdb-7b59-4797-b2b9-13e6dffa6019'::uuid;
  odyssey_finding_id constant uuid := '8a418fdf-edd4-4ae5-8c2c-1f46d18183cd'::uuid;
  medea_finding_id constant uuid := '249b31b9-4b8b-49ea-9882-dd41ba84e6ff'::uuid;
  phoenician_finding_id constant uuid := '6505efa9-3d7b-4ffa-91a0-9c95bcc1abdd'::uuid;
  video_finding_id constant uuid := '9a153484-7faa-4512-b9ab-97af892c07f0'::uuid;
  game_finding_id constant uuid := '92a2e004-5c9a-41c4-99fe-d21b0b94ffb9'::uuid;
  music_finding_id constant uuid := '441a9d6e-4660-4ed3-b157-05c9e89b8f48'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'diogenes'
      AND p.nickname = '디오게네스'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '디오게네스 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc
    WHERE uc.id IN (iliad_uc_id, odyssey_uc_id, medea_uc_id, phoenician_uc_id)
  ) THEN
    RAISE EXCEPTION '디오게네스 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        (iliad_content_id, '일리아스', '호메로스', 15),
        (odyssey_content_id, '오뒷세이아', '호메로스', 2),
        (medea_content_id, '메데이아', '에우리피데스', 2),
        (phoenician_content_id, '포이니케 여인들', '에우리피데스', 0)
    ) AS expected(content_id, ko_title, ko_creator, expected_count)
    LEFT JOIN public.contents c
      ON c.id = expected.content_id
     AND c.type = 'BOOK'
     AND c.external_source = 'naver_book'
     AND c.user_count = expected.expected_count
    LEFT JOIN public.content_locales ko
      ON ko.content_id = expected.content_id
     AND ko.locale = 'ko'
     AND ko.title = expected.ko_title
     AND ko.creator = expected.ko_creator
     AND ko.verified = true
    LEFT JOIN public.content_locales en
      ON en.content_id = expected.content_id
     AND en.locale = 'en'
     AND en.verified = true
    WHERE c.id IS NULL OR ko.content_id IS NULL OR en.content_id IS NULL
  ) THEN
    RAISE EXCEPTION '디오게네스 채택 BOOK 4건의 기존 메타데이터 또는 user_count가 달라졌습니다.';
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES
    (
      iliad_uc_id, target_celeb_id, iliad_content_id, 'FINISHED',
      '디오게네스 라에르티오스의 전기에는 디오게네스가 대화 중 『일리아스』의 구절을 거듭 끌어온 장면이 남아 있다. 그는 보라색 물감을 훔친 사람을 보며 5권 83행을 인용했고, 선물을 받아도 된다는 말에는 3권 65행을 답으로 삼았다. 특정 작품의 여러 대목을 상황에 맞게 변주한 기록이므로 직접적인 작품 향유 근거로 채택한다.',
      'Diogenes Laertius preserves several occasions on which Diogenes adapted lines from the Iliad to the situation at hand, including Iliad 5.83 when he saw a thief of purple and Iliad 3.65 when defending his acceptance of a cloak. His repeated, context-sensitive use of specific verses establishes direct engagement with the poem.',
      'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0258%3Abook%3D6%3Achapter%3D2',
      false
    ),
    (
      odyssey_uc_id, target_celeb_id, odyssey_content_id, 'FINISHED',
      '같은 전기는 디오게네스가 고개를 숙인 사람을 두고 『오뒷세이아』 1권 157행과 4권 70행을 합쳐 인용했다고 전한다. 작품 속 동일한 표현이 놓인 두 대목을 알아보고 재치 있게 결합한 사례라서 작품을 구체적으로 알고 활용한 근거가 된다.',
      'The same biography records Diogenes combining wording from Odyssey 1.157 and 4.70 in a joke about a man lowering his head. Recognizing and recombining two specific passages is concrete evidence that he knew and used the poem.',
      'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0258%3Abook%3D6%3Achapter%3D2',
      false
    ),
    (
      medea_uc_id, target_celeb_id, medea_content_id, 'FINISHED',
      '디오게네스가 자신을 산 크세니아데스에게 복종을 요구하자 상대가 에우리피데스의 『메데이아』 410행을 인용했고, 디오게네스는 그 구절을 받아 다시 논박했다는 일화가 전한다. 대화 속에서 작품의 정확한 한 행을 알아듣고 즉시 논리적으로 되받은 기록이어서 직접 향유로 판단한다.',
      'When Xeniades answered him with Medea 410, Diogenes recognized the line and immediately turned it back into an argument about obeying a purchased doctor. His ability to answer a precisely identified verse in context provides direct evidence of engagement with Euripides'' play.',
      'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0258%3Abook%3D6%3Achapter%3D2',
      false
    ),
    (
      phoenician_uc_id, target_celeb_id, phoenician_content_id, 'FINISHED',
      '올리브 사이에 놓인 과자를 내던지며 디오게네스가 외친 말은 에우리피데스의 『포이니케 여인들』 40행으로 전한다. 짧은 인용이지만 작품과 행 번호가 식별되고, 원문의 왕족을 향한 말을 눈앞의 음식에 맞춰 희화화한 구체적 활용이므로 채택한다.',
      'Diogenes Laertius identifies the line Diogenes addressed to a cake among his olives as Phoenician Women 40. Though brief, the quotation is tied to a named play and a specific verse, which Diogenes humorously repurposed for the immediate scene.',
      'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0258%3Abook%3D6%3Achapter%3D2',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '디오게네스 user_contents 생성 수가 4건이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer
    FROM public.user_contents uc
    WHERE uc.content_id = c.id
  )
  WHERE c.id IN (iliad_content_id, odyssey_content_id, medea_content_id, phoenician_content_id);

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '디오게네스 연결 콘텐츠 user_count 갱신 수가 4건이 아닙니다. 실제=%', affected;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        (iliad_content_id, 16),
        (odyssey_content_id, 3),
        (medea_content_id, 3),
        (phoenician_content_id, 1)
    ) AS expected(content_id, expected_count)
    JOIN public.contents c ON c.id = expected.content_id
    WHERE c.user_count <> expected.expected_count
  ) THEN
    RAISE EXCEPTION '디오게네스 연결 콘텐츠의 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-diogenes-full-v1',
    'Codex',
    ARRAY['디오게네스', 'Diogenes', 'Diogenes of Sinope', 'Διογένης ὁ Σινωπεύς', '시노페의 디오게네스'],
    '고대 전기 작가 디오게네스 라에르티오스와 조사 대상인 기원전 4세기 견유학자 디오게네스를 분리했다.',
    '그리스어·영어·한국어 이름과 read·quote·Homer·Euripides·theatre·Dionysia·Olympia·music 조합으로 네 유형을 조사했다. 디오게네스 라에르티오스 6.55·57·67·104의 편집 주석이 각각 『메데이아』, 『포이니케 여인들』, 『일리아스』, 『오뒷세이아』의 구체적 행을 식별하므로 BOOK 4건을 채택했다. 디오니시아 공연 비판, 올림피아 방문, 무명 낭독·연주 일화는 작품 식별 또는 현대 유형 요건을 충족하지 못해 나머지 유형에서 기각했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      iliad_finding_id, target_run_id, 'BOOK', 'accepted',
      '일리아스', '호메로스', iliad_content_id,
      '디오게네스 라에르티오스 6.55·57·67과 편집 주석은 디오게네스가 『일리아스』 3.65, 5.83, 5.366, 8.45 등의 구절을 상황에 맞춰 인용했다고 식별한다.',
      NULL
    ),
    (
      odyssey_finding_id, target_run_id, 'BOOK', 'accepted',
      '오뒷세이아', '호메로스', odyssey_content_id,
      '6.67의 인용을 편집 주석이 『오뒷세이아』 1.157과 4.70으로 식별하며, 6.104에도 4.392 인용이 전한다.',
      NULL
    ),
    (
      medea_finding_id, target_run_id, 'BOOK', 'accepted',
      '메데이아', '에우리피데스', medea_content_id,
      '6.36에서 크세니아데스가 인용한 『메데이아』 410행을 디오게네스가 알아듣고 즉석에서 논박한다.',
      NULL
    ),
    (
      phoenician_finding_id, target_run_id, 'BOOK', 'accepted',
      '포이니케 여인들', '에우리피데스', phoenician_content_id,
      '6.55에서 디오게네스가 과자에 건넨 말을 편집 주석이 『포이니케 여인들』 40행으로 식별한다.',
      NULL
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '디오니시아의 공연', NULL, NULL,
      '6.24는 디오게네스가 디오니시아 공연을 바보들을 위한 구경거리라고 불렀다고 전한다.',
      '특정 희곡·공연명과 관람 장면이 없고 장르 전체에 대한 풍자적 평가뿐이라 개별 VIDEO 작품으로 등록하지 않는다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '올림피아 경기', NULL, NULL,
      '6.43·60은 올림피아 우승자와 귀환길에 관한 일화를 전한다.',
      '고대 체육 경기와 방문 일화는 디지털 GAME 작품 또는 특정 게임 플레이 기록이 아니다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '무명 노래·플루트·음악 연주', NULL, NULL,
      '전기에는 노래와 플루트에 관한 농담, 무명의 음악 연주를 들은 뒤 한 평가가 보존돼 있다.',
      '곡명·작곡가·공연 식별자가 없어서 개별 MUSIC 콘텐츠로 확정할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '디오게네스 조사 finding 생성 수가 7건이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (target_run_id, 'BOOK', iliad_finding_id,
     'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0258%3Abook%3D6%3Achapter%3D2',
     'primary', 'archive', 'accessible',
     'Diogenes Laertius, Lives of Eminent Philosophers 6.55, 57, 67',
     '본문과 Loeb 편집 주석이 디오게네스의 여러 인용을 『일리아스』의 구체적 행으로 식별한다.'),
    (target_run_id, 'BOOK', iliad_finding_id,
     'https://search.shopping.naver.com/book/catalog/32436116403',
     'secondary', 'official_profile', 'accessible',
     '일리아스 — 네이버 도서',
     '서비스 기존 콘텐츠 ISBN 9788991290167의 한국어 판본 메타데이터를 확인한다.'),
    (target_run_id, 'BOOK', odyssey_finding_id,
     'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0258%3Abook%3D6%3Achapter%3D2',
     'primary', 'archive', 'accessible',
     'Diogenes Laertius, Lives of Eminent Philosophers 6.67, 104',
     '본문과 편집 주석이 『오뒷세이아』 1.157, 4.70, 4.392 인용을 식별한다.'),
    (target_run_id, 'BOOK', odyssey_finding_id,
     'https://www.yes24.com/Product/Goods/2148271',
     'secondary', 'official_profile', 'accessible',
     '오뒷세이아 — YES24',
     '서비스 기존 콘텐츠 ISBN 9788991290150의 판본과 표지를 확인한다.'),
    (target_run_id, 'BOOK', medea_finding_id,
     'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0258%3Abook%3D6%3Achapter%3D2',
     'primary', 'archive', 'accessible',
     'Diogenes Laertius, Lives of Eminent Philosophers 6.36',
     '크세니아데스와 디오게네스가 주고받은 문장을 『메데이아』 410행으로 식별한다.'),
    (target_run_id, 'BOOK', medea_finding_id,
     'https://search.shopping.naver.com/book/catalog/32718362636',
     'secondary', 'official_profile', 'accessible',
     '메데이아 — 네이버 도서',
     '서비스 기존 콘텐츠 ISBN 9788937470240의 한국어 판본 메타데이터를 확인한다.'),
    (target_run_id, 'BOOK', phoenician_finding_id,
     'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0258%3Abook%3D6%3Achapter%3D2',
     'primary', 'archive', 'accessible',
     'Diogenes Laertius, Lives of Eminent Philosophers 6.55',
     '디오게네스가 과자에 한 말을 『포이니케 여인들』 40행으로 식별한다.'),
    (target_run_id, 'BOOK', phoenician_finding_id,
     'https://search.shopping.naver.com/book/catalog/32441626008',
     'secondary', 'official_profile', 'accessible',
     '포이니케 여인들 — 네이버 도서',
     '서비스 기존 콘텐츠 ISBN 9791128857195의 한국어 판본 메타데이터를 확인한다.'),
    (target_run_id, 'VIDEO', video_finding_id,
     'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0258%3Abook%3D6%3Achapter%3D2',
     'primary', 'archive', 'accessible',
     'Diogenes Laertius, Lives of Eminent Philosophers 6.24',
     '디오니시아 공연 일반을 풍자한 기록은 있으나 특정 작품 관람은 식별되지 않는다.'),
    (target_run_id, 'GAME', game_finding_id,
     'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0258%3Abook%3D6%3Achapter%3D2',
     'primary', 'archive', 'accessible',
     'Diogenes Laertius, Lives of Eminent Philosophers 6.43, 60',
     '올림피아 관련 기록은 고대 체육 행사이며 디지털 게임이 아니다.'),
    (target_run_id, 'MUSIC', music_finding_id,
     'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0258%3Abook%3D6',
     'primary', 'archive', 'accessible',
     'Diogenes Laertius, Lives of Eminent Philosophers 6.68, 104',
     '노래·플루트·연주를 언급하지만 작품명은 전하지 않는다.');

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 11 THEN
    RAISE EXCEPTION '디오게네스 조사 source 생성 수가 11건이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed',
      completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'Diogenes·Διογένης·Homer·Iliad·Odyssey·Euripides·Medea·Phoenician Women·read·quote 조합을 조사했다. 고대 전기 본문과 편집 주석이 식별한 작품별 직접 인용 4건을 채택했다.'
        WHEN 'VIDEO' THEN 'theatre·Dionysia·tragedy·watched·performance 조합을 조사했다. 디오니시아 공연 일반에 대한 풍자는 있으나 작품명과 개별 관람 기록이 없다.'
        WHEN 'GAME' THEN 'game·played·Olympia·contest 조합을 조사했다. 올림피아 관련 일화는 고대 체육 행사이며 디지털 GAME이 아니다.'
        WHEN 'MUSIC' THEN 'music·song·flute·recital·heard 조합을 조사했다. 무명 노래와 연주 일화만 있어 곡 단위로 식별하지 못했다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '디오게네스 조사 scope 완료 수가 4건이 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 4 THEN
    RAISE EXCEPTION '디오게네스 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '디오게네스 light→full 승격 수가 1건이 아닙니다. 실제=%', affected;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
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
    RAISE EXCEPTION '디오게네스 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
