-- 루이 16세 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택:
--   BOOK  호러스 월폴의 《Historic Doubts on the Life and Reign of King Richard the Third》
--   BOOK  데이비드 흄의 《The History of England》
-- 기각:
--   GAME  자물쇠 제작·사냥·체스 — 취미·물리 활동이며 작품 단위 디지털 GAME이 아님

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '2bbb5d80-b0f5-4af0-8218-8c2ed13fb2be'::uuid;
  hume_content_id constant text := 'e1eced02-da9a-44bf-8a6a-4feb85a4db85';
  historic_doubts_content_id constant text := '066be34b-b500-4253-bd81-76c3c4537c8a';
  target_run_id constant uuid := '86c47c97-770a-441c-9aaf-395c8a5c71cc'::uuid;
  historic_doubts_user_content_id constant uuid := '1279f86e-c1fe-4a0f-83bd-5e9cb5c03e53'::uuid;
  hume_user_content_id constant uuid := '4c31dfdb-633d-46ff-8625-941cb3192925'::uuid;
  accepted_historic_doubts_id constant uuid := '65de4f2f-9814-471d-975c-e2f79730ed7e'::uuid;
  accepted_hume_id constant uuid := 'e5108c23-ca4f-4b71-8c57-cb57a96d7218'::uuid;
  rejected_game_hobbies_id constant uuid := 'c3890c11-072d-4214-90dc-43d62a0c97f5'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'louis-xvi'
      AND p.nickname = '루이 16세'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '루이 16세 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '루이 16세에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      accepted_historic_doubts_id,
      accepted_hume_id,
      rejected_game_hobbies_id
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc
    WHERE uc.id IN (historic_doubts_user_content_id, hume_user_content_id)
  ) THEN
    RAISE EXCEPTION '루이 16세 조사 실행 또는 이번 반영 ID가 이미 존재합니다.';
  END IF;

  IF (
    SELECT count(*)
    FROM public.contents c
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = hume_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9781379442363'
      AND c.user_count = 1
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 1
      AND en.title = 'The History of England'
      AND en.creator = 'David Hume'
      AND en.isbn = '9780344167232'
      AND en.thumbnail_url = 'https://covers.openlibrary.org/b/id/5813575-L.jpg'
      AND en.verified = true
  ) <> 1 THEN
    RAISE EXCEPTION '기존 흄 《The History of England》 콘텐츠 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = historic_doubts_content_id
       OR (c.external_source = 'openlibrary' AND c.external_id = '9781421970004')
  ) OR EXISTS (
    SELECT 1 FROM public.content_locales cl
    WHERE cl.isbn = '9781421970004'
       OR lower(cl.title) IN (
         lower('Historic Doubts on the Life and Reign of King Richard the Third'),
         lower('리처드 3세의 생애와 통치에 관한 역사적 의혹')
       )
  ) THEN
    RAISE EXCEPTION '《Historic Doubts》와 충돌하는 콘텐츠 ID, 외부 ID, ISBN 또는 제목이 이미 존재합니다.';
  END IF;

  INSERT INTO public.contents (
    id, type, metadata, release_date, external_source, external_id, user_count
  ) VALUES (
    historic_doubts_content_id,
    'BOOK',
    jsonb_build_object(
      'openLibraryEditionKey', 'OL9873689M',
      'openLibraryWorkKey', 'OL183736W',
      'originalPublicationYear', 1768,
      'numberOfPages', 112
    ),
    '2006-03-30',
    'openlibrary',
    '9781421970004',
    0
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '루이 16세 신규 contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id, locale, title, creator, thumbnail_url, description,
    isbn, publisher, sources, verified
  ) VALUES
    (
      historic_doubts_content_id,
      'ko',
      '리처드 3세의 생애와 통치에 관한 역사적 의혹',
      '호러스 월폴',
      'https://covers.openlibrary.org/b/id/1816613-L.jpg',
      '호러스 월폴이 리처드 3세를 둘러싼 튜더 시대의 악평과 역사 서술을 재검토한 1768년 역사 논고다.',
      '9781421970004',
      'IndyPublish.com',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'edition', 'OL9873689M',
        'work', 'OL183736W',
        'titlePolicy', 'manual-ko-translation'
      ),
      true
    ),
    (
      historic_doubts_content_id,
      'en',
      'Historic Doubts on the Life and Reign of King Richard the Third',
      'Horace Walpole',
      'https://covers.openlibrary.org/b/id/1816613-L.jpg',
      'Horace Walpole''s 1768 historical essay reassessing the Tudor-era accusations and historical reputation of Richard III.',
      '9781421970004',
      'IndyPublish.com',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'edition', 'OL9873689M',
        'work', 'OL183736W'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '루이 16세 신규 content_locales 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES
    (
      historic_doubts_user_content_id,
      target_celeb_id,
      historic_doubts_content_id,
      'FINISHED',
      $ko$예일대 루이스 월폴 도서관에는 루이 16세가 호러스 월폴의 《Historic Doubts on the Life and Reign of King Richard the Third》를 프랑스어로 옮긴 82쪽 분량의 친필 원고가 남아 있다. 취미나 장서 소유를 넘어 작품 전체를 읽고 번역한 물증이므로 등록한다.$ko$,
      $en$The Lewis Walpole Library at Yale preserves an 82-page manuscript in Louis XVI's hand translating Horace Walpole's *Historic Doubts on the Life and Reign of King Richard the Third* into French. This is physical evidence that he read and worked through the text, not merely owned it.$en$,
      'https://campuspress.yale.edu/walpole300/10-doutes-historiques-sur-la-vie-et-le-regne-de-richard-iii/',
      false
    ),
    (
      hume_user_content_id,
      target_celeb_id,
      hume_content_id,
      'FINISHED',
      $ko$루이 16세의 시종 장바티스트 클레리는 국왕이 사형 선고를 들은 뒤 데이비드 흄의 《영국사》에서 찰스 1세의 죽음을 다룬 권을 가져오게 하고 며칠 동안 읽었다고 기록했다. 감금 중의 직접 독서와 작품이 명확히 대응해 등록한다.$ko$,
      $en$Louis XVI's valet Jean-Baptiste Cléry recorded that, after learning of his death sentence, the king asked for the volume of David Hume's *History of England* covering the death of Charles I and read it over the following days. The firsthand prison account identifies both the act of reading and the work.$en$,
      'https://digital.library.upenn.edu/women/wormeley/princess/princess.html',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '루이 16세 user_contents 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id IN (historic_doubts_content_id, hume_content_id);

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '루이 16세 콘텐츠 user_count 동기화 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  IF (
    SELECT count(*) FROM public.contents c
    WHERE (c.id = historic_doubts_content_id AND c.user_count = 1)
       OR (c.id = hume_content_id AND c.user_count = 2)
  ) <> 2 THEN
    RAISE EXCEPTION '루이 16세 콘텐츠 user_count 최종값이 예상과 다릅니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-louis-xvi-full-v1',
    'Codex',
    ARRAY['루이 16세', 'Louis XVI', 'Louis XVI de France', 'Louis-Auguste', 'Louis Capet'],
    '프랑스 국왕 루이 16세(1754~1793)를 다른 루이 왕들, 동명 후손·가공 인물, 후대 영화·오페라·게임 속 루이 16세와 분리했다. 왕을 소재로 한 사후 작품은 본인의 감상 기록에서 제외했다.',
    '프랑스어·영어·한국어 이름 변형으로 네 유형을 조사하고 예일대 소장 친필 원고, 시종 클레리의 감금 일지, 흄 수용사 연구를 교차 대조했다. 루이 16세가 월폴의 《Historic Doubts》 전체를 프랑스어로 번역한 친필 원고가 현존하고, 사형 선고 뒤 흄의 《영국사》에서 찰스 1세의 죽음을 다룬 권을 가져오게 해 며칠 동안 읽었다는 1차 증언도 확인했다. 두 작품을 BOOK으로 연결했다. 자물쇠 제작·사냥·체스 같은 취미는 디지털 GAME 작품이 아니며, 특정 영상 관람이나 제목 있는 음악 감상은 확인되지 않았다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      accepted_historic_doubts_id,
      target_run_id,
      'BOOK',
      'accepted',
      'Historic Doubts on the Life and Reign of King Richard the Third',
      'Horace Walpole',
      historic_doubts_content_id,
      '예일대 루이스 월폴 도서관이 소장한 82쪽 친필 원고는 루이 16세가 월폴의 책을 프랑스어로 완역하며 교정한 물증이다.',
      NULL
    ),
    (
      accepted_hume_id,
      target_run_id,
      'BOOK',
      'accepted',
      'The History of England',
      'David Hume',
      hume_content_id,
      '시종 장바티스트 클레리는 루이 16세가 사형 선고 뒤 찰스 1세의 죽음을 다룬 《영국사》 권을 요청해 다음 며칠 동안 읽었다고 기록했다.',
      NULL
    ),
    (
      rejected_game_hobbies_id,
      target_run_id,
      'GAME',
      'rejected',
      'Locksmithing, hunting, and chess',
      'Physical activities',
      NULL,
      '공인 전기는 루이 16세의 기계·자물쇠 제작 관심과 사냥 같은 궁정 취미를 기록하고, 체스 일화도 후대 전기에서 반복된다.',
      '자물쇠 제작·사냥은 게임 작품이 아니고 체스도 물리 보드게임 일반 활동이다. 작품 단위 디지털 GAME 타이틀과 플레이 기록이 없어 등록하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '루이 16세 조사 finding 생성 행 수가 3이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      accepted_historic_doubts_id,
      'https://campuspress.yale.edu/walpole300/10-doutes-historiques-sur-la-vie-et-le-regne-de-richard-iii/',
      'primary',
      'archive',
      'accessible',
      'King Louis XVI’s Translation of Horace Walpole’s Historic Doubts',
      '예일대 소장 친필 번역 원고의 작품명, 82쪽 물리 형식, 필체·교정 흔적과 소장 이력을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_historic_doubts_id,
      'https://openlibrary.org/books/OL9873689M',
      'secondary',
      'official_profile',
      'accessible',
      'Historic Doubts on the Life and Reign of King Richard the Third — Open Library',
      '호러스 월폴, ISBN 9781421970004, IndyPublish.com, 112쪽, OL9873689M 판본과 표지를 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_hume_id,
      'https://digital.library.upenn.edu/women/wormeley/princess/princess.html',
      'primary',
      'archive',
      'accessible',
      'Journal of the Tower of the Temple, by Cléry',
      '클레리의 1차 감금 일지에서 루이 16세가 찰스 1세의 죽음을 다룬 《History of England》 권을 요청해 다음 며칠 동안 읽은 대목을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_hume_id,
      'https://oll-resources.s3.us-east-2.amazonaws.com/oll3/store/titles/673/Bongie_0101_EBk_v6.0.pdf',
      'secondary',
      'archive',
      'accessible',
      'David Hume: Prophet of the Counter-revolution',
      '클레리의 기록과 사원 감옥 장서 목록을 대조해 작품을 데이비드 흄의 《History of England》로 식별하는 학술 연구를 확인했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://www.britannica.com/biography/Louis-XVI',
      'secondary',
      'official_profile',
      'accessible',
      'Louis XVI — Britannica',
      '생애·교육·궁정 활동을 watched·play·theatre·performance 조합으로 대조했으나 제목 있는 외부 극·영상 관람 기록은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_hobbies_id,
      'https://en.chateauversailles.fr/discover/history/great-characters/louis-xvi',
      'secondary',
      'official_profile',
      'accessible',
      'Louis XVI — Palace of Versailles',
      '국왕의 기계 기술·자물쇠 제작과 사냥 등 취미를 공인 전기에서 대조했지만 디지털 GAME 작품은 아니다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://en.chateauversailles-spectacles.fr/page/the-royal-opera_a174/1',
      'secondary',
      'official_profile',
      'accessible',
      'The Royal Opera of Versailles',
      '루이 16세 시기 왕실 오페라의 제도·공연 맥락을 대조했으나 국왕 개인이 감상한 제목 있는 특정 작품을 입증하지 못했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '루이 16세 조사 source 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Louis XVI·Louis-Auguste·Louis Capet와 read·livre·lecture·translated·traduit·Hume·Walpole·Richard III 조합을 조사했다. 친필 완역 원고와 클레리의 직접 독서 증언으로 두 작품을 채택했다.'
      WHEN 'VIDEO' THEN
        'watched·spectacle·théâtre·opera performance·film 조합을 전기·베르사유 자료에서 대조했다. 후대 루이 16세 소재 작품 외에 본인이 관람한 제목 있는 극·영상은 확인되지 않았다.'
      WHEN 'GAME' THEN
        'game·played·chess·locksmithing·hunting 조합을 조사했다. 확인되는 활동은 물리 취미·기술·스포츠이며 작품 단위 디지털 GAME은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·opera·concert·écouté·aimait 조합을 왕실 오페라·궁정 자료에서 검색했다. 특정 공연명과 루이 16세 개인의 감상 행위가 함께 확인되는 곡은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '루이 16세 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 2 THEN
    RAISE EXCEPTION '루이 16세 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '루이 16세 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 2
      AND EXISTS (
        SELECT 1 FROM public.contents c
        JOIN public.content_locales ko ON ko.content_id = c.id AND ko.locale = 'ko'
        JOIN public.content_locales en ON en.content_id = c.id AND en.locale = 'en'
        WHERE c.id = historic_doubts_content_id
          AND c.external_source = 'openlibrary'
          AND c.external_id = '9781421970004'
          AND c.user_count = 1
          AND ko.isbn = '9781421970004'
          AND en.title = 'Historic Doubts on the Life and Reign of King Richard the Third'
      )
      AND EXISTS (
        SELECT 1 FROM public.contents c
        WHERE c.id = hume_content_id AND c.user_count = 2
      )
  ) THEN
    RAISE EXCEPTION '루이 16세 프로필·콘텐츠 최종 검증에 실패했습니다.';
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
    RAISE EXCEPTION '루이 16세 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f WHERE f.run_id = r.id AND f.decision = 'accepted') = 2
      AND (SELECT count(*) FROM public.celeb_content_research_findings f WHERE f.run_id = r.id AND f.decision = 'rejected') = 1
      AND (SELECT count(*) FROM public.celeb_content_research_sources src WHERE src.run_id = r.id) = 7
  ) THEN
    RAISE EXCEPTION '루이 16세 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
