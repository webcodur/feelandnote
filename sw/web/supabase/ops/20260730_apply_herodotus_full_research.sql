-- 헤로도토스 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택: BOOK 『일리아스』·『오뒷세이아』 — 『역사』 2.116에서 두 작품의 구체 구절을 직접 인용·비판
-- 기각: 프리니코스 비극·올림피아 경기·마네로스 노래는 역사 서술 대상이지 개인 관람·플레이·청취 기록이 아님
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'a3f2c584-2384-4e04-a267-5f57a6a19322'::uuid;
  iliad_content_id constant text := 'a357d566-f0b3-49bf-9d12-78b694e0c006';
  odyssey_content_id constant text := '7dac869b-c4b0-4473-88e0-1ca0156ad850';
  target_run_id constant uuid := '4112f8d9-2aaf-47e5-8e3d-6839f4d78ee9'::uuid;
  iliad_user_content_id constant uuid := '94ae7cb3-3ebe-4eee-a3c2-6594882d0a6b'::uuid;
  odyssey_user_content_id constant uuid := '5d2a8524-8457-4042-9587-0e3d857a9de6'::uuid;
  accepted_iliad_finding_id constant uuid := 'b991d441-798c-4621-98c0-a5ecb15dc043'::uuid;
  accepted_odyssey_finding_id constant uuid := 'e1e6d245-8e25-4770-8c95-84f589dc35b0'::uuid;
  rejected_video_finding_id constant uuid := 'af5360b9-047c-44d9-b885-dc61dd63cb67'::uuid;
  rejected_game_finding_id constant uuid := 'f47608a1-6bc1-4903-ae34-a717707aa9bd'::uuid;
  rejected_music_finding_id constant uuid := '27ed078a-5fb4-4724-b5e1-734d6b179e52'::uuid;
  affected integer;
  expected_iliad_user_count integer;
  expected_odyssey_user_count integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'herodotus'
      AND p.nickname = '헤로도토스'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '헤로도토스 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc
    WHERE uc.id IN (iliad_user_content_id, odyssey_user_content_id)
  ) THEN
    RAISE EXCEPTION '헤로도토스 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  SELECT count(*)::integer + 1
  INTO expected_iliad_user_count
  FROM public.user_contents uc
  WHERE uc.content_id = iliad_content_id;

  SELECT count(*)::integer + 1
  INTO expected_odyssey_user_count
  FROM public.user_contents uc
  WHERE uc.content_id = odyssey_content_id;

  IF expected_iliad_user_count <> 15 OR NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = iliad_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788991290167'
      AND ko.title = '일리아스'
      AND ko.creator = '호메로스'
      AND ko.verified = true
      AND en.title = 'Iliad'
      AND en.creator = 'Homer'
      AND en.verified = true
  ) THEN
    RAISE EXCEPTION '일리아스 기존 콘텐츠 기준선이 달라졌습니다. 예상 user_count=%',
      expected_iliad_user_count;
  END IF;

  IF expected_odyssey_user_count <> 2 OR NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = odyssey_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788991290150'
      AND ko.title = '오뒷세이아'
      AND ko.creator = '호메로스'
      AND ko.verified = true
      AND en.title = 'The Odyssey'
      AND en.creator = 'Homer'
      AND en.verified = true
  ) THEN
    RAISE EXCEPTION '오뒷세이아 기존 콘텐츠 기준선이 달라졌습니다. 예상 user_count=%',
      expected_odyssey_user_count;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES
    (
      iliad_user_content_id,
      target_celeb_id,
      iliad_content_id,
      'FINISHED',
      $ko$헤로도토스는 『역사』 2권 116장에서 헬레네의 이집트 체류를 논하며 호메로스도 이 전승을 알았다고 주장한다. 그는 근거로 『일리아스』 6권 289~292행의 시돈산 직물 대목을 직접 지목하고, 이 이야기가 작품의 다른 곳에는 나오지 않는다고 비판적으로 대조한다. 작품명과 구체 행을 이용한 직접 검토이므로 등록한다.$ko$,
      $en$In Histories 2.116, Herodotus argues that Homer knew the tradition of Helen's stay in Egypt. He identifies Iliad 6.289–292, the passage about Sidonian textiles, as evidence and observes that the story appears nowhere else in the poem. This is direct critical engagement with a named work and specific lines.$en$,
      'https://scaife.perseus.org/reader/urn%3Acts%3AgreekLit%3Atlg0016.tlg001.perseus-eng2%3A2.116/',
      false
    ),
    (
      odyssey_user_content_id,
      target_celeb_id,
      odyssey_content_id,
      'FINISHED',
      $ko$같은 『역사』 2권 116장에서 헤로도토스는 『오뒷세이아』 4권 227~230행과 351~352행을 직접 인용해 헬레네와 메넬라오스가 이집트를 거쳤다는 단서를 제시한다. 두 대목을 자신의 역사 논증에 결합한 구체적 작품 활용이므로 등록한다.$ko$,
      $en$In the same chapter, Herodotus directly quotes Odyssey 4.227–230 and 351–352 as evidence that Helen and Menelaus passed through Egypt. His use of two specific passages in a historical argument establishes direct engagement with the work.$en$,
      'https://scaife.perseus.org/reader/urn%3Acts%3AgreekLit%3Atlg0016.tlg001.perseus-eng2%3A2.116/',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '헤로도토스 user_contents 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id IN (iliad_content_id, odyssey_content_id);

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '헤로도토스 연결 콘텐츠 user_count 갱신 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  IF (
    SELECT c.user_count FROM public.contents c WHERE c.id = iliad_content_id
  ) <> expected_iliad_user_count OR (
    SELECT c.user_count FROM public.contents c WHERE c.id = odyssey_content_id
  ) <> expected_odyssey_user_count THEN
    RAISE EXCEPTION '헤로도토스 연결 콘텐츠 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-herodotus-full-v1',
    'Codex',
    ARRAY['헤로도토스', 'Herodotus', 'Herodotos', 'Hēródotos', 'Ἡρόδοτος'],
    '기원전 5세기 할리카르나소스 역사가 헤로도토스를 동명 현대인, 자신의 『역사』, 후대 헤로도토스 소재 책·영상·게임에서 분리했다.',
    '그리스어·영어·한국어 이름과 Homer·Iliad·Odyssey·theatre·games·song 조합으로 BOOK·VIDEO·GAME·MUSIC을 조사했다. 『역사』 2.116은 『일리아스』와 『오뒷세이아』의 작품명·권·구체 행을 직접 인용해 헬레네의 이집트 체류를 논하므로 BOOK 2건을 채택했다. 프리니코스의 「밀레토스 함락」 공연, 올림피아 경기, 이집트의 마네로스 노래는 역사·민속 서술 대상이며 헤로도토스 자신의 제목 있는 관람·플레이·청취 기록은 아니어서 나머지 유형에서 기각했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      accepted_iliad_finding_id, target_run_id, 'BOOK', 'accepted',
      '일리아스', '호메로스', iliad_content_id,
      '『역사』 2.116에서 『일리아스』 6.289~292를 직접 지목하고 해당 전승이 작품의 다른 곳에는 없다고 비판적으로 대조한다.',
      NULL
    ),
    (
      accepted_odyssey_finding_id, target_run_id, 'BOOK', 'accepted',
      '오뒷세이아', '호메로스', odyssey_content_id,
      '『역사』 2.116에서 『오뒷세이아』 4.227~230과 4.351~352를 직접 인용해 역사 논증의 근거로 사용한다.',
      NULL
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '밀레토스 함락', '프리니코스', NULL,
      '『역사』 6.21은 아테네인들이 프리니코스의 비극 「밀레토스 함락」을 보고 울었으며 작가에게 벌금을 물렸다고 기록한다.',
      '작품명과 관객 반응은 분명하지만 헤로도토스 자신이 그 공연을 보았다는 진술은 아니다. 역사 서술의 타인 관람을 개인 감상으로 전환하지 않았다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '올림피아 경기와 고대 그리스 경기 일반', NULL, NULL,
      '『역사』는 올림피아 경기와 체육 대회를 여러 역사적 장면에서 언급한다.',
      '고대 체육 경기는 디지털 GAME 작품이 아니며 헤로도토스 개인의 플레이 기록도 없다. 후대 올림픽 낭독 전승 역시 본인 게임 소비가 아니다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '마네로스의 노래와 리노스 노래', '고대 이집트·그리스 전승', NULL,
      '『역사』 2.79는 이집트의 마네로스 노래를 그리스 등의 리노스 노래와 비교하며 민속을 설명한다.',
      '명칭 있는 노래 전승을 보고하지만 헤로도토스가 특정 공연을 직접 들었다고 말하지 않고 작곡자·연주도 식별되지 않는다. 민속지식을 개인 청취작으로 확대하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '헤로도토스 조사 finding 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', accepted_iliad_finding_id,
      'https://scaife.perseus.org/reader/urn%3Acts%3AgreekLit%3Atlg0016.tlg001.perseus-eng2%3A2.116/',
      'primary', 'archive', 'accessible',
      'Herodotus, Histories 2.116 — Scaife Viewer',
      '『일리아스』 6.289~292를 작품 안의 구체 근거로 직접 지목하고 비판하는 본문을 확인했다.'
    ),
    (
      target_run_id, 'BOOK', accepted_iliad_finding_id,
      'https://chs.harvard.edu/chapter/1-the-epic-identity-of-the-iliad-and-odyssey-pindar-and-herodotus-lofty-legacy/',
      'secondary', 'article', 'accessible',
      'The Epic Identity of the Iliad and Odyssey — Center for Hellenic Studies',
      '헤로도토스 2.116이 『일리아스』와 『오뒷세이아』 구절을 병렬로 활용한다는 고전학 분석을 대조했다.'
    ),
    (
      target_run_id, 'BOOK', accepted_iliad_finding_id,
      'https://search.shopping.naver.com/book/catalog/32436116403',
      'secondary', 'official_profile', 'accessible',
      '일리아스 — 네이버 도서',
      '서비스에 이미 등록된 ISBN 9788991290167 한국어 판본과 표지를 확인했다.'
    ),
    (
      target_run_id, 'BOOK', accepted_odyssey_finding_id,
      'https://scaife.perseus.org/reader/urn%3Acts%3AgreekLit%3Atlg0016.tlg001.perseus-eng2%3A2.116/',
      'primary', 'archive', 'accessible',
      'Herodotus, Histories 2.116 — Scaife Viewer',
      '『오뒷세이아』 4.227~230과 4.351~352를 직접 인용해 논증하는 본문을 확인했다.'
    ),
    (
      target_run_id, 'BOOK', accepted_odyssey_finding_id,
      'https://chs.harvard.edu/chapter/1-the-epic-identity-of-the-iliad-and-odyssey-pindar-and-herodotus-lofty-legacy/',
      'secondary', 'article', 'accessible',
      'The Epic Identity of the Iliad and Odyssey — Center for Hellenic Studies',
      '두 작품의 구절을 같은 방식으로 역사 논증에 사용한다는 학술 해석을 교차 확인했다.'
    ),
    (
      target_run_id, 'BOOK', accepted_odyssey_finding_id,
      'https://search.shopping.naver.com/book/catalog/32453662193',
      'secondary', 'official_profile', 'accessible',
      '오뒷세이아 — 네이버 도서',
      '서비스에 이미 등록된 ISBN 9788991290150 한국어 판본과 표지를 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://scaife.perseus.org/reader/urn%3Acts%3AgreekLit%3Atlg0016.tlg001.perseus-eng2%3A6.21/',
      'primary', 'archive', 'accessible',
      'Herodotus, Histories 6.21 — Scaife Viewer',
      '「밀레토스 함락」과 아테네 관객 반응은 확인되지만 헤로도토스 본인의 관람 진술은 없다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://scaife.perseus.org/reader/urn%3Acts%3AgreekLit%3Atlg0016.tlg001.perseus-eng2%3A8.26/',
      'primary', 'archive', 'accessible',
      'Herodotus, Histories 8.26 — Scaife Viewer',
      '올림피아 경기의 역사적 일화를 확인하고 디지털 GAME 및 개인 플레이와 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://scaife.perseus.org/reader/urn%3Acts%3AgreekLit%3Atlg0016.tlg001.perseus-eng2%3A2.79/',
      'primary', 'archive', 'accessible',
      'Herodotus, Histories 2.79 — Scaife Viewer',
      '마네로스·리노스 노래의 민속 비교는 확인되지만 개인의 특정 공연 청취는 서술하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 9 THEN
    RAISE EXCEPTION '헤로도토스 조사 source 생성 행 수가 9가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'Herodotus·헤로도토스와 Homer·Iliad·Odyssey·read·quote 조합을 조사했다. 2.116에서 두 작품의 권·행을 직접 인용·비판한 근거를 확인했다.'
        WHEN 'VIDEO' THEN 'watched·theatre·tragedy·Phrynichus·Capture of Miletus 조합을 조사했다. 아테네 관객의 관람은 기록되지만 헤로도토스 자신의 관람은 아니다.'
        WHEN 'GAME' THEN 'game·played·Olympia·contest 조합을 조사했다. 고대 체육 경기와 올림픽 낭독 전승은 디지털 GAME 소비가 아니다.'
        WHEN 'MUSIC' THEN 'music·song·heard·Maneros·Linus 조합을 조사했다. 민속 노래의 명칭·분포 보고 외에 특정 공연을 들었다는 근거는 없다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '헤로도토스 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 2 THEN
    RAISE EXCEPTION '헤로도토스 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '헤로도토스 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '헤로도토스 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
