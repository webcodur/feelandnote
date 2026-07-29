-- 현장 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택:
--   BOOK  유가사지론 — 현장이 나란다에서 계현에게 배우러 왔다고 직접 말하고 강의를 3회 들음
-- 기각:
--   VIDEO  후대 서유기·현장 소재 영상 — 사후 각색이며 생전 특정 관람작 없음
--   GAME   순례·논쟁·여행 — 실제 활동이며 디지털 GAME이 아님
--   MUSIC  독경·불교 의례 일반론 — 제목 있는 외부 음악 청취 근거 없음
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'f3a25dc0-4358-4008-bf03-a28373632325'::uuid;
  target_content_id constant text := '516b2661-b3c4-4819-b5fb-21417b763545';
  target_run_id constant uuid := '91452db8-11e1-40cb-aab4-68de2256e12d'::uuid;
  user_content_id constant uuid := '9cb36bf0-c22f-4ccc-968f-445fed24142a'::uuid;
  accepted_book_finding_id constant uuid := 'cdac77b4-5c5f-4e6a-ba07-cff5c37cf791'::uuid;
  rejected_video_finding_id constant uuid := '1ccce1ed-5a90-4eae-97bf-9785407723b3'::uuid;
  rejected_game_finding_id constant uuid := '7fa9a40e-e754-44c1-ba94-19847848137e'::uuid;
  rejected_music_finding_id constant uuid := '5d6cbd98-9c23-401a-bc11-e0ed908b8dd2'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'xuanzang'
      AND p.nickname = '현장'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '현장 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '현장에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      accepted_book_finding_id,
      rejected_video_finding_id,
      rejected_game_finding_id,
      rejected_music_finding_id
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = user_content_id
  ) OR EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = target_content_id
       OR (c.external_source = 'naver_book' AND c.external_id = '9791168561618')
  ) OR EXISTS (
    SELECT 1 FROM public.content_locales cl
    WHERE cl.isbn = '9791168561618'
       OR lower(cl.title) IN (
         lower('유가사지론'),
         lower('Yogācārabhūmi-śāstra')
       )
  ) THEN
    RAISE EXCEPTION '현장 조사 실행·반영 ID 또는 『유가사지론』 충돌 데이터가 이미 존재합니다.';
  END IF;

  INSERT INTO public.contents (
    id, type, metadata, release_date, external_source, external_id, user_count
  ) VALUES (
    target_content_id,
    'BOOK',
    jsonb_build_object(
      'publisher', '씨아이알',
      'originalTitle', 'Yogācārabhūmi-śāstra',
      'originalPublicationPeriod', '4th–5th century',
      'naverCatalogId', '44060919618'
    ),
    '2023-11-10',
    'naver_book',
    '9791168561618',
    0
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '현장 신규 contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id, locale, title, creator, thumbnail_url, description,
    isbn, publisher, sources, verified
  ) VALUES
    (
      target_content_id,
      'ko',
      '유가사지론',
      '안성두',
      'https://shopping-phinf.pstatic.net/main_4406091/44060919618.20260331120637.jpg',
      '불교 유가행파의 수행 단계와 인식론을 집대성한 고대 논서 『유가사지론』의 주요 부분을 산스크리트 자료에 따라 우리말로 옮긴 판본이다.',
      '9791168561618',
      '씨아이알',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'catalogId', '44060919618',
        'titlePolicy', 'canonical-work-title'
      ),
      true
    ),
    (
      target_content_id,
      'en',
      'Yogācārabhūmi-śāstra',
      'An Seong-du',
      'https://shopping-phinf.pstatic.net/main_4406091/44060919618.20260331120637.jpg',
      'A Korean translation and study edition of the foundational Yogācāra treatise on the stages and grounds of Buddhist practice.',
      '9791168561618',
      'CIR',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'catalogId', '44060919618',
        'titlePolicy', 'canonical-romanization'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '현장 신규 content_locales 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    user_content_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    $ko$혜립·언종이 편찬한 7세기 『대자은사삼장법사전』에서 현장은 나란다의 계현에게 “『유가사지론』을 배우고자 중국에서 왔다”고 직접 말한다. 전기는 계현이 현장을 위해 15개월 동안 논서를 강의했고, 현장이 그 해설을 세 차례 들었다고 기록한다. 단순히 번역한 책이 아니라 인도 유학의 목적이자 반복 학습한 외부 저작이므로 등록한다.$ko$,
    $en$In the seventh-century *Biography of the Tripiṭaka Master of the Great Ci’en Monastery*, Xuanzang tells Śīlabhadra that he came from China to study the *Yogācārabhūmi-śāstra*. The biography records a fifteen-month exposition delivered for him and says he heard the work explained three times. It was not merely a text he later translated, but a named external work he deliberately and repeatedly studied.$en$,
    'https://bdkamerica.org/download/1863',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '현장 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = target_content_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 OR (
    SELECT c.user_count FROM public.contents c WHERE c.id = target_content_id
  ) <> 1 THEN
    RAISE EXCEPTION '『유가사지론』 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-xuanzang-full-v1',
    'Codex',
    ARRAY['현장', '玄奘', '삼장법사', '현장삼장', 'Xuanzang', 'Hsüan-tsang', 'Hsuan-tsang', 'Chen Hui'],
    '당대 역경승 현장(602~664)을 『서유기』의 삼장법사 캐릭터, 동명 승려, 후대 현장 소재 영화·드라마·게임과 분리했다. 『대당서역기』와 번역 경전은 현장의 저술·번역 성과이지 그 자체로 외부 감상작이 아니다.',
    '한문·한국어·영어 이름 변형과 studied·read·learned·sutra·sastra·watched·performance·game·music 조합으로 네 유형을 조사했다. 혜립·언종의 근접 전기는 현장이 어려서 『대반열반경』·『섭대승론』·『아비달마구사론』 등을 공부했고, 인도에서는 『유가사지론』을 배우려 나란다에 왔다고 직접 말하며 계현의 15개월 강의를 세 차례 들었다고 기록한다. 분류의 가장 직접적이고 중심적인 작품인 『유가사지론』 1건을 BOOK으로 연결했다. 생전 특정 영상·극 관람, 디지털 GAME 이용, 제목 있는 외부 음악 청취는 확인되지 않았다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      accepted_book_finding_id,
      target_run_id,
      'BOOK',
      'accepted',
      '유가사지론',
      '미륵 전승·유가행파 편찬',
      target_content_id,
      '7세기 전기에서 현장이 계현에게 이 논서를 배우러 중국에서 왔다고 직접 말하고, 계현이 현장을 위해 15개월 동안 강의했으며 현장이 해설을 세 차례 들었다고 기록한다.',
      NULL
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '후대 서유기·현장 소재 영상과 공연',
      NULL,
      NULL,
      '현장의 순례는 후대 『서유기』와 다수 영화·드라마·공연의 소재가 되었다.',
      '모두 현장 사후의 각색물이다. 근접 전기와 현대 전기에서 현장이 생전에 관람한 제목 있는 특정 극·영상 작품은 확인되지 않는다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '순례·논쟁·여행 활동',
      NULL,
      NULL,
      '현장은 중앙아시아와 인도를 여행하고 나란다에서 학습했으며 카나우지 종교 논쟁에 참여했다.',
      '여행·토론·수행은 실제 활동이다. 후대 현장·서유기 게임은 본인이 플레이한 작품이 아니며 작품 단위 디지털 GAME 이용 기록도 없다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '독경과 불교 의례 일반론',
      NULL,
      NULL,
      '근접 전기는 경전 강의·암송·설법과 불교 의례를 자세히 기록한다.',
      '경전 암송과 설법은 음악 작품 감상이 아니다. 제목·창작자·청취 행위가 함께 확인되는 외부 음악은 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '현장 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://bdkamerica.org/download/1863',
      'primary',
      'archive',
      'accessible',
      'A Biography of the Tripiṭaka Master of the Great Ci’en Monastery',
      '혜립·언종 전기의 BDK 영문 완역 PDF 90~101쪽에서 현장의 학습 목적, 계현의 15개월 강의, 『유가사지론』 해설을 세 차례 들은 기록을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://www.bdkamerica.org/product/a-biography-of-the-tripitaka-master-of-the-great-cien-monastery/',
      'primary',
      'official_profile',
      'accessible',
      'A Biography of the Tripiṭaka Master of the Great Ci’en Monastery — BDK America',
      '7세기 현장 전기의 서지·번역본과 공식 PDF 배포 경로를 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://whc.unesco.org/uploads/nominations/1502.pdf',
      'secondary',
      'archive',
      'accessible',
      'Silk Roads: the Routes Network of Chang’an-Tianshan Corridor — UNESCO Nomination',
      '현장의 인도 유학과 불교 문헌 수집·번역, 『유가사지론』을 포함한 주요 번역 목록을 유네스코 등재 자료에서 교차 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://search.shopping.naver.com/book/catalog/44060919618',
      'secondary',
      'official_profile',
      'accessible',
      '유가사지론 — 네이버 도서',
      'ISBN 9791168561618, 안성두, 씨아이알, 2023-11-10 판본과 한국어 표지를 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://www.museum.go.kr/ENG/contents/E0402000000.do?relicId=3153&schM=view&searchId=search',
      'secondary',
      'official_profile',
      'accessible',
      'Yogacarabhumi Sastra — National Museum of Korea',
      '국립중앙박물관 소장 유가사지론 사본과 현장의 한역 전승을 대조했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://www.bdkamerica.org/product/a-biography-of-the-tripitaka-master-of-the-great-cien-monastery/',
      'primary',
      'official_profile',
      'accessible',
      'A Biography of the Tripiṭaka Master of the Great Ci’en Monastery — BDK America',
      '근접 전기 완역의 공식 배포본에서 생애·순례·학술 활동을 theatre·watched·performance 조합으로 대조했으나 제목 있는 생전 관람작은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://bdkamerica.org/download/1863',
      'primary',
      'archive',
      'accessible',
      'A Biography of the Tripiṭaka Master of the Great Ci’en Monastery',
      '여행·논쟁·수행 활동을 확인하고 후대 게임 및 작품 단위 디지털 GAME 소비와 분리했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://bdkamerica.org/download/1863',
      'primary',
      'archive',
      'accessible',
      'A Biography of the Tripiṭaka Master of the Great Ci’en Monastery',
      '전기의 강의·암송·설법·의례 기록을 전수 검색했으나 제목과 창작자가 특정되는 외부 음악 청취는 확인되지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 8 THEN
    RAISE EXCEPTION '현장 조사 source 생성 행 수가 8이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '현장·玄奘·Xuanzang·Hsuan-tsang과 studied·read·learned·sutra·sastra 조합으로 근접 전기 PDF와 현대 철학 백과를 조사했다. 여러 정확한 학습서가 확인되며 분류의 중심이자 직접성이 가장 강한 『유가사지론』을 네이버 판본에 연결했다.'
      WHEN 'VIDEO' THEN
        'watched·theatre·performance·spectacle·film·서유기 조합을 검색했다. 후대 각색물 외에 현장이 생전에 관람한 제목 있는 특정 작품은 없다.'
      WHEN 'GAME' THEN
        'game·played·chess·travel·debate 조합을 검색했다. 순례·논쟁·수행은 실제 활동이며 작품 단위 디지털 GAME 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·chant·heard·독경·의례 조합을 근접 전기에서 검색했다. 암송·설법은 음악 감상이 아니며 제목·창작자·청취가 함께 확인되는 곡은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '현장 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '현장 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '현장 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 1
      AND EXISTS (
        SELECT 1 FROM public.contents c
        JOIN public.content_locales ko ON ko.content_id = c.id AND ko.locale = 'ko'
        JOIN public.content_locales en ON en.content_id = c.id AND en.locale = 'en'
        WHERE c.id = target_content_id
          AND c.type = 'BOOK'
          AND c.external_source = 'naver_book'
          AND c.external_id = '9791168561618'
          AND c.user_count = 1
          AND ko.title = '유가사지론'
          AND ko.isbn = '9791168561618'
          AND ko.verified = true
          AND en.title = 'Yogācārabhūmi-śāstra'
          AND en.verified = true
      )
  ) THEN
    RAISE EXCEPTION '현장 프로필·콘텐츠 최종 검증에 실패했습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.run_id = target_run_id
      AND f.decision = 'accepted'
      AND (
        f.content_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.user_contents uc
          WHERE uc.user_id = target_celeb_id
            AND uc.content_id = f.content_id
        )
        OR NOT EXISTS (
          SELECT 1 FROM public.celeb_content_research_sources src
          WHERE src.finding_id = f.id
            AND src.source_tier = 'primary'
        )
      )
  ) THEN
    RAISE EXCEPTION '현장 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
