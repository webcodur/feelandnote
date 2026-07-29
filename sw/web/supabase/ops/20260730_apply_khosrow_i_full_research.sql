-- 호스로 1세의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과와 콘텐츠 1건을 반영한다.
-- 채택은 후대 전승임을 명시하며, 현존 필사본의 《칼릴라와 딤나》 궁정 낭독 장면을 근거로 한다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '6f941508-3efe-4bfa-8a77-0c6744ea1a18'::uuid;
  target_content_id constant text := 'd5ad35ac-107d-4c07-9485-6c1fed4d08f8';
  target_run_id constant uuid := '58bc03a5-eb11-4570-ab26-1563602169fc'::uuid;
  target_uc_id constant uuid := '33207541-4039-45da-bd43-1d536e56b8cf'::uuid;
  book_finding_id constant uuid := 'db845e68-2fc7-4dd2-89f7-0b8d7f24c89d'::uuid;
  video_finding_id constant uuid := '8ce8f883-4897-4636-a3f7-7677a48516c2'::uuid;
  game_finding_id constant uuid := '9d829687-fedf-461c-9d01-281f016ef7a9'::uuid;
  music_finding_id constant uuid := 'ab712110-82c4-4bc4-b753-3ed3769897c2'::uuid;
  expected_user_count integer;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'khosrow-i'
      AND p.nickname = '호스로 1세'
      AND p.nickname_en = 'Khosrow I'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '호스로 1세 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = target_uc_id
  ) THEN
    RAISE EXCEPTION '호스로 1세 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  SELECT count(*)::integer + 1
  INTO expected_user_count
  FROM public.user_contents uc
  WHERE uc.content_id = target_content_id;

  IF expected_user_count <> 2 OR NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = target_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788989370413'
      AND ko.title = '세계의 지혜 판차탄트라 세트'
      AND ko.creator IS NULL
      AND ko.thumbnail_url = 'https://shopping-phinf.pstatic.net/main_5391562/53915625592.20250402090045.jpg'
      AND ko.verified = true
      AND en.title = 'Panchatantra'
      AND en.creator = 'Shivkumar.'
      AND en.verified = true
  ) THEN
    RAISE EXCEPTION '판차탄트라 기존 콘텐츠 기준선이 달라졌습니다. 예상 user_count=%',
      expected_user_count;
  END IF;

  UPDATE public.content_locales
  SET creator = '비슈누 샤르마', updated_at = now()
  WHERE content_id = target_content_id
    AND locale = 'ko'
    AND creator IS NULL
    AND verified = true;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '판차탄트라 한국어 creator 보완 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    target_uc_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    '호스로 1세가 이 책을 접했다는 이야기는 그의 시대보다 뒤에 정리된 전승이다. 현존 《칼릴라와 딤나》 필사본은 의사 부르조에가 인도에서 가져온 우화를 왕과 신하들에게 읽어 주는 장면을 그린다. 동시대 기록은 아니지만, 《판차탄트라》 계통의 지혜 문학이 왕 앞에서 낭독되었다는 구체적인 작품 단위 전승이다.',
    'The account belongs to a later transmission tradition rather than a contemporary record. A surviving Kalila wa-Dimna manuscript depicts the physician Bursuya reading the Indian fables to Khosrow I and his courtiers, preserving a specific work-level tradition of the king hearing the Panchatantra-derived collection.',
    'https://www.loc.gov/item/2021667397',
    true
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '호스로 1세 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = target_content_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 OR (
    SELECT c.user_count FROM public.contents c WHERE c.id = target_content_id
  ) <> expected_user_count THEN
    RAISE EXCEPTION '판차탄트라 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-khosrow-i-full-v1',
    'Codex',
    ARRAY['호스로 1세', '아누시르반', 'Khosrow I', 'Khusraw I', 'Chosroes I', 'Anushirvan', 'Ḵosrow Anōširavān'],
    '사산 왕조 호스로 1세(재위 531~579)를 음악 후원으로 유명한 호스로 2세 파르비즈, 서사시의 케이 호스로, 시인 나세르 호스로와 분리했다.',
    '미 의회도서관이 공개한 《칼릴라와 딤나》 필사본의 궁정 낭독 장면과 이슬람연구소·이란백과의 전승사를 교차했다. 동시대 사료가 아닌 후대 전승이라는 한계를 감상경위에 명시하고 『판차탄트라』 계통 BOOK 1건을 채택했다. 플라톤·아리스토텔레스 번역 후원은 개인 독서로 확정하지 않았다. 체스는 왕이 게임을 했다는 기록이 아니라 재상 보조르메흐가 인도 수수께끼를 푼 전설이며, 유명 궁정 음악가 바르바드는 호스로 2세 인물이므로 제외했다. 제목 있는 영상·공연도 확인되지 않았다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'accepted',
      '판차탄트라·칼릴라와 딤나', '비슈누 샤르마 전승·이븐 알무카파 번역', target_content_id,
      '16~17세기 《칼릴라와 딤나》 필사본 17r는 부르조에가 인도에서 가져온 우화를 호스로 1세와 신하들 앞에서 읽는 장면을 담고 있으며, 의회도서관이 인물과 행위를 명시한다. 동시대 사실이라기보다 후대 문헌 전승이라는 한계를 함께 보존한다.',
      NULL
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '호스로 1세 소재 후대 영상·공연 일반', NULL, NULL,
      '호스로 1세를 다룬 후대 역사 영상과 문학적 재현은 있으나 생전 감상 작품이 아니다.',
      '본인이 관람한 제목 있는 공연·영상 기록이 없어 등록하지 않는다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '차투랑가·체스와 주사위놀이 전승', '인도 사절·보조르메흐 전승', NULL,
      '중세 팔라비 문헌은 인도 왕이 체스를 수수께끼로 호스로 궁정에 보내고 재상 보조르메흐가 규칙을 풀었다고 전한다.',
      '호스로 자신이 게임을 플레이했다는 기록이 아니며 이란백과도 이 이야기를 명백한 전설로 평가한다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '바르바드의 궁정 음악·호스로바니 선법 일반', '바르바드', NULL,
      '페르시아 궁정 음악의 대표 인물 바르바드와 일곱 호스로바니는 호스로 1세가 아니라 호스로 2세 파르비즈의 궁정에 속한다.',
      '동명이 군주 자료를 호스로 1세에게 잘못 귀속할 수 없고, 호스로 1세의 제목 있는 곡 청취 기록은 확인되지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '호스로 1세 finding 생성 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.loc.gov/item/2021667397',
      'primary', 'archive', 'accessible',
      'Kalīla wa-Dimna — Library of Congress',
      '16~17세기 아랍어 필사본 17r의 그림이 부르조에가 호스로 1세와 신하들에게 책을 읽는 장면임을 기관 설명으로 확인했다. 사건과 동시대인 자료는 아니다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.iis.ac.uk/scholarly-contributions/kalila-wa-dimna/',
      'secondary', 'official_profile', 'accessible',
      'Kalila wa Dimna — Institute of Ismaili Studies',
      '《판차탄트라》에서 중세 페르시아 《칼릴라와 딤나》로 이어진 작품 계보와 호스로의 번역 의뢰 전승을 교차 확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.iranicaonline.org/articles/kalila-demna-i/',
      'secondary', 'article', 'accessible',
      'KALILA WA DEMNA i. Redactions and circulation — Encyclopaedia Iranica',
      '호스로와 부르조에 이야기가 여러 후대 판본에 전하는 반면 타바리의 호스로 치세 기록에는 나타나지 않는다는 사료 한계를 확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://search.shopping.naver.com/book/catalog/53915625592',
      'secondary', 'official_profile', 'accessible',
      '세계의 지혜 판차탄트라 세트 — 네이버 도서',
      'DB에 연결한 ISBN 9788989370413 판본의 제목·출판사·표지를 확인했다. API 설명의 원저자 정보를 바탕으로 비어 있던 한국어 creator를 보완했다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://www.iranicaonline.org/articles/kosrow/',
      'secondary', 'official_profile', 'accessible',
      'ḴOSROW I — Encyclopaedia Iranica',
      '인물 식별과 생애 범위를 확인해 후대 영상 재현을 생전 감상에서 분리했다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://www.iranicaonline.org/articles/chess-a-board-game/',
      'primary', 'archive', 'accessible',
      'CHESS — Encyclopaedia Iranica',
      '팔라비 《체스 설명과 주사위놀이 발명》 전승은 체스를 호스로에게 보낸 수수께끼와 보조르메흐의 해결로 서술하며, 역사적 사실로 받아들일 수 없는 전설임을 명시한다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://www.iranicaonline.org/articles/iran-xi-persian-music/',
      'secondary', 'article', 'accessible',
      'IRAN xi. MUSIC — Encyclopaedia Iranica',
      '바르바드를 호스로 2세 파르비즈의 궁정 음악가로 명시해 호스로 1세 동명이인 오귀속을 차단했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '호스로 1세 source 생성 행 수가 7개가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Khosrow I·Anushirvan·read·book·Kalila wa Dimna·Panchatantra·Plato·Aristotle 조합을 조사했다. 후대 필사본의 궁정 낭독 장면을 사료 한계와 함께 1건 채택했다.'
      WHEN 'VIDEO' THEN
        'performance·spectacle·theatre·watched 조합을 조사했다. 후대 재현물 외에 제목 있는 생전 감상 기록은 없다.'
      WHEN 'GAME' THEN
        'game·chess·chatrang·nard·played 조합과 팔라비 전승을 조사했다. 체스 수수께끼를 푼 인물은 재상이며 왕의 플레이 기록이 아니다.'
      WHEN 'MUSIC' THEN
        'music·song·Barbad·Khosravani·listened 조합을 조사했다. 유명 음악 자료는 호스로 2세의 것이며 호스로 1세의 작품 단위 청취는 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '호스로 1세 scope 완료 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '호스로 1세 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  UPDATE public.profiles p
  SET celeb_tier = 'full'
  WHERE p.id = target_celeb_id
    AND p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '호스로 1세 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '호스로 1세 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
