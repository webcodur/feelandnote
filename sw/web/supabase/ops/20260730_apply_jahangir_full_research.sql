-- 자한기르 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택: 『바부르나마』, 『하디카트 알하키카』.
-- 보류·기각: 자미의 『마흔 가지 말씀』은 직접 읽은 기록은 있으나 허용 메타 원천에서 판본을 식별하지 못했다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'afd58ef3-cafa-488b-a7c4-3e3cf19adcae'::uuid;
  baburnama_content_id constant text := '5923f1c2-8960-4d42-85ee-f784f783a85a';
  hadiqa_content_id constant text := '333e7dc6-c544-4dc0-bac6-f4682cf7498f';
  target_run_id constant uuid := 'dcee5c71-cd84-4386-af63-d5045dcd6deb'::uuid;
  baburnama_uc_id constant uuid := 'f2b2aca2-0254-4c10-b225-a8df18b22f48'::uuid;
  hadiqa_uc_id constant uuid := 'f8ff29b2-27f6-4658-9110-70ebd49b4669'::uuid;
  baburnama_finding_id constant uuid := '7a79d16b-180e-4773-81f0-c3755bdff309'::uuid;
  hadiqa_finding_id constant uuid := '2a32f326-2118-49b5-8d13-6a1b9492c922'::uuid;
  forty_finding_id constant uuid := '8c92a031-8cfe-4210-bc60-80bfc1898f91'::uuid;
  video_finding_id constant uuid := 'ee7474d0-c821-4295-8ca8-5562031992fa'::uuid;
  game_finding_id constant uuid := '11433814-5ad0-4460-86fe-14c1885dbf03'::uuid;
  music_finding_id constant uuid := 'ec205f1a-71cf-480c-bc9a-4e7285239881'::uuid;
  expected_baburnama_user_count integer;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'jahangir'
      AND p.nickname = '자한기르'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '자한기르 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc
    WHERE uc.id IN (baburnama_uc_id, hadiqa_uc_id)
  ) OR EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = hadiqa_content_id
       OR c.external_id IN ('9780525474142', '0525474145', 'OL62899W')
  ) THEN
    RAISE EXCEPTION '자한기르 조사 실행·연결 또는 하디카 콘텐츠 ID가 이미 존재합니다.';
  END IF;

  SELECT count(*)::integer + 1
  INTO expected_baburnama_user_count
  FROM public.user_contents uc
  WHERE uc.content_id = baburnama_content_id;

  IF expected_baburnama_user_count <> 2 OR NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = baburnama_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9780375761379'
      AND ko.title = '바부르나마'
      AND ko.creator = '바부르'
      AND ko.verified = true
      AND en.title = 'The Baburnama'
      AND en.verified = true
  ) THEN
    RAISE EXCEPTION '바부르나마 기존 콘텐츠 기준선이 달라졌습니다. 예상 user_count=%',
      expected_baburnama_user_count;
  END IF;

  INSERT INTO public.contents (
    id, type, release_date, external_source, external_id, metadata, user_count
  ) VALUES (
    hadiqa_content_id,
    'BOOK',
    '1976-01-01',
    'openlibrary',
    '9780525474142',
    jsonb_build_object(
      'isbn', '9780525474142',
      'isbn10', '0525474145',
      'openLibraryEdition', '/books/OL5206665M',
      'openLibraryWork', '/works/OL62899W',
      'publisher', 'Dutton',
      'publishDate', '1976'
    ),
    0
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '하디카트 알하키카 contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id, locale, title, creator, thumbnail_url, description,
    isbn, publisher, sources, verified
  ) VALUES
    (
      hadiqa_content_id, 'ko', '하디카트 알하키카', '사나이',
      'https://covers.openlibrary.org/b/id/8582967-L.jpg',
      '페르시아 수피 시인 사나이가 쓴 교훈적 마스나비. 영어권에서는 The Walled Garden of Truth로 알려졌다.',
      '9780525474142', 'Dutton',
      jsonb_build_object(
        'primary', 'openlibrary',
        'url', 'https://openlibrary.org/books/OL5206665M/The_walled_garden_of_truth',
        'work', 'https://openlibrary.org/works/OL62899W',
        'thumbnail', 'openlibrary',
        'titlePolicy', 'original_transliteration'
      ),
      true
    ),
    (
      hadiqa_content_id, 'en', 'The Walled Garden of Truth', 'Sanai',
      'https://covers.openlibrary.org/b/id/8582967-L.jpg',
      'An English edition of Sanai''s Persian Sufi didactic poem Hadiqat al-Haqiqa.',
      '9780525474142', 'Dutton',
      jsonb_build_object(
        'primary', 'openlibrary',
        'url', 'https://openlibrary.org/books/OL5206665M/The_walled_garden_of_truth',
        'work', 'https://openlibrary.org/works/OL62899W',
        'thumbnail', 'openlibrary',
        'titlePolicy', 'edition_match'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '하디카트 알하키카 locale 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES
    (
      baburnama_uc_id,
      target_celeb_id,
      baburnama_content_id,
      'FINISHED',
      $ko$자한기르는 카불에 관한 대목을 쓰다가 바부르의 회고록 원고를 직접 살펴보았다고 기록했다. 원고 대부분이 바부르의 친필이었고 네 구획은 자신이 베껴 썼으며, 그 사실을 튀르크 문자로 덧붙였다고 설명한다. 작품을 직접 검토하고 일부를 필사한 기록이므로 『바부르나마』를 등록한다.$ko$,
      $en$Jahangir records that Babur's memoirs came before him while he was writing about Kabul. Most of the manuscript was in Babur's own hand, while four sections had been copied by Jahangir, who added a note in Turki identifying his handwriting. Direct examination and copying establish engagement with the Baburnama.$en$,
      'https://www.gutenberg.org/cache/epub/53674/pg53674.txt',
      false
    ),
    (
      hadiqa_uc_id,
      target_celeb_id,
      hadiqa_content_id,
      'FINISHED',
      $ko$자한기르는 고사인 자드루프의 비좁은 거처를 묘사하며 사나이의 구절이 그 장면에 꼭 맞는다고 떠올리고 여섯 행을 인용했다. 로저스·베버리지 판의 주석은 이 구절이 『하디카트 알하키카』 제5권 또는 제7권에 실린 대목임을 판본 대조로 확인한다. 작품의 문장을 기억해 자신의 관찰에 적용한 직접 향유 기록이다.$ko$,
      $en$Describing the cramped dwelling of the ascetic Jadrup, Jahangir recalls six lines by Hakim Sanai as especially apt. The Rogers–Beveridge notes identify the passage in manuscript witnesses as belonging to Book V or VII of the Hadiqa. His remembered quotation and application of the poem to what he observed establish direct engagement.$en$,
      'https://www.gutenberg.org/cache/epub/53716/pg53716.txt',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '자한기르 user_contents 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id IN (baburnama_content_id, hadiqa_content_id);

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 OR (
    SELECT c.user_count FROM public.contents c WHERE c.id = baburnama_content_id
  ) <> expected_baburnama_user_count OR (
    SELECT c.user_count FROM public.contents c WHERE c.id = hadiqa_content_id
  ) <> 1 THEN
    RAISE EXCEPTION '자한기르 연결 콘텐츠 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-jahangir-full-v1',
    'Codex',
    ARRAY['자한기르', 'Jahangir', 'Nur-ud-din Muhammad Salim', 'Salim Mirza', 'جهانگیر'],
    '무굴 황제 자한기르(1569~1627)를 동명 현대인과 그의 자서전 자체, 후대 영화·게임의 자한기르 캐릭터에서 분리했다.',
    $s$영어·페르시아어 표기와 read·book·poem·music·play 조합 및 정본 『투주크 이 자한기리』 2권을 전수 검색했다. 바부르의 회고록 원고를 직접 살펴보고 네 구획을 필사한 기록과, 사나이의 시구를 자신의 관찰에 적용한 기록을 확인해 BOOK 2건을 채택했다. 어린 시절 자미의 『마흔 가지 말씀』을 읽었다는 더 직접적인 기록도 있으나, 네이버·OpenLibrary에서 작품 단위 판본을 식별하지 못해 메타데이터를 지어내지 않고 보류 finding으로 남겼다. 회고록의 회화 감상, 실제 검술·사냥, 제목 없는 궁정 음악은 각각 서비스 VIDEO·GAME·MUSIC 작품으로 변환하지 않았다.$s$
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      baburnama_finding_id, target_run_id, 'BOOK', 'accepted',
      '바부르나마', '바부르', baburnama_content_id,
      '『투주크 이 자한기리』에서 바부르의 친필 회고록을 살펴보고 네 구획을 자신이 필사했다고 직접 기록한다.',
      NULL
    ),
    (
      hadiqa_finding_id, target_run_id, 'BOOK', 'accepted',
      '하디카트 알하키카', '사나이', hadiqa_content_id,
      '자드루프의 거처에 어울린다며 사나이의 여섯 행을 기억해 인용하며, 정본 주석이 해당 구절을 『하디카』 제5권 또는 제7권으로 식별한다.',
      NULL
    ),
    (
      forty_finding_id, target_run_id, 'BOOK', 'rejected',
      '마흔 가지 말씀', '압드 알라흐만 자미', NULL,
      '자한기르는 어린 시절 샤이크 압드 알나비와 함께 “Forty Sayings”를 읽었다고 직접 회고하고, 편집자 주석은 이를 자미의 책으로 식별한다.',
      '직접 독서 증거는 강하지만 허용된 도서 메타 원천인 네이버와 OpenLibrary에서 이 작품의 독립 판본을 식별하지 못했다. 다른 자미 선집으로 억지 매칭하지 않고 메타 확보 전까지 보류한다.'
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '궁정 회화·초상 감상과 주문 제작 일반', NULL, NULL,
      '회고록에는 화가의 작품을 감정하고 초상과 자연물을 그리게 한 기록이 풍부하다.',
      '회화와 삽화는 서비스의 영화·TV·온라인 영상 VIDEO가 아니다. 후대 자한기르 소재 영화도 본인의 감상작이 아니다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '검술·사냥·구기와 궁정 오락 일반', NULL, NULL,
      '자한기르는 무르타자 칸에게 검술을 배웠다고 쓰고 사냥과 실제 궁정 오락을 상세히 기록한다.',
      '실제 무예·사냥·구기 활동은 디지털 GAME 작품이 아니며 전자게임 제목이나 플레이 기록은 없다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '무함마드 나이의 무제 선율과 궁정 카왈리', '우스타드 무함마드 나이 외', NULL,
      '자한기르는 무함마드 나이의 여러 음악을 들었고 자신을 위한 송시에 새 선율을 붙여 연주했다고 기록하며, 카왈리 공연도 묘사한다.',
      '직접 청취는 확인되지만 작품 제목·고정된 녹음·현대 음원 식별자가 없다. 이름 없는 즉흥·궁정 공연을 임의의 MUSIC 엔터티에 붙이지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '자한기르 finding 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', baburnama_finding_id,
      'https://www.gutenberg.org/cache/epub/53674/pg53674.txt',
      'primary', 'archive', 'accessible',
      'The Tuzuk-i-Jahangiri, Volume 1 — Project Gutenberg',
      '본문 3349~3355행에서 바부르 친필 회고록 검토와 자한기르 자신의 네 구획 필사를 확인했다.'
    ),
    (
      target_run_id, 'BOOK', baburnama_finding_id,
      'https://openlibrary.org/works/OL35678W',
      'secondary', 'official_profile', 'accessible',
      'Bāburnāmah — Open Library',
      '기존 서비스 판본과 작품 단위 메타데이터를 교차 확인했다.'
    ),
    (
      target_run_id, 'BOOK', hadiqa_finding_id,
      'https://www.gutenberg.org/cache/epub/53716/pg53716.txt',
      'primary', 'archive', 'accessible',
      'The Tuzuk-i-Jahangiri, Volume 2 — Project Gutenberg',
      '본문 3256~3267행의 사나이 구절과 주석 10018~10023행의 『하디카』 권차 식별을 함께 확인했다.'
    ),
    (
      target_run_id, 'BOOK', hadiqa_finding_id,
      'https://openlibrary.org/books/OL5206665M/The_walled_garden_of_truth',
      'secondary', 'official_profile', 'accessible',
      'The Walled Garden of Truth — Open Library',
      '1976 Dutton 판, ISBN 0525474145, 표지 ID 8582967을 확인했다.'
    ),
    (
      target_run_id, 'BOOK', forty_finding_id,
      'https://www.gutenberg.org/cache/epub/53674/pg53674.txt',
      'primary', 'archive', 'accessible',
      'The Tuzuk-i-Jahangiri, Volume 1 — Project Gutenberg',
      '본문 908~910행은 어린 시절 독서를, 주석 13172~13178행은 저자를 자미로 식별한다. 허용 메타 원천의 독립 판본은 찾지 못했다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://www.gutenberg.org/ebooks/53674',
      'primary', 'archive', 'accessible',
      'The Tuzuk-i-Jahangiri, Volume 1 — Project Gutenberg',
      '정본의 회화·초상 감상 기록을 영상 소비와 구분했다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://www.gutenberg.org/cache/epub/53674/pg53674.txt',
      'primary', 'archive', 'accessible',
      'The Tuzuk-i-Jahangiri, Volume 1 — Project Gutenberg',
      '검술을 직접 배웠다는 기록은 확인되지만 디지털 GAME은 아니다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://www.gutenberg.org/cache/epub/53674/pg53674.txt',
      'primary', 'archive', 'accessible',
      'The Tuzuk-i-Jahangiri, Volume 1 — Project Gutenberg',
      '무함마드 나이와 카왈리의 직접 청취는 확인되지만 고정된 작품 제목·음원 식별자가 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 8 THEN
    RAISE EXCEPTION '자한기르 source 생성 행 수가 8이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Jahangir·자한기르·read·book·Baburnama·Jami·Sanai·Hadiqa 조합과 회고록 2권을 검색했다. 『바부르나마』와 『하디카』를 채택하고, 자미의 『마흔 가지 말씀』은 직접 독서 증거는 보존하되 허용 메타 판본 미확보로 보류했다.'
      WHEN 'VIDEO' THEN
        'watched·film·painting·portrait·illustration 조합을 조사했다. 직접 회화 감상은 풍부하지만 서비스 VIDEO 작품 소비는 아니다.'
      WHEN 'GAME' THEN
        'game·played·chess·polo·hunting·sword-play 조합을 조사했다. 실제 검술·사냥·궁정 오락을 디지털 GAME으로 전환하지 않았다.'
      WHEN 'MUSIC' THEN
        'music·song·heard·qawwali·Muhammad Nayi 조합을 조사했다. 직접 청취는 있으나 제목·고정 녹음·음원 식별자가 없어 등록 가능한 MUSIC은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '자한기르 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 2 THEN
    RAISE EXCEPTION '자한기르 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '자한기르 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '자한기르 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
