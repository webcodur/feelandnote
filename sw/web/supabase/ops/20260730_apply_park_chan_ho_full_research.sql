-- 박찬호 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 원장과 함께 반영한다.
-- 채택:
--   MUSIC 지누션의 「말해줘 (feat. 엄정화)」
-- 기각:
--   BOOK  장훈의 책(제목 미상) — 직접 독서 발언은 있으나 정확한 서명을 식별할 수 없음
--   VIDEO 영화 감상(작품명 미상) — 취미만 확인되고 특정 작품이 없음
--   GAME  미국식 당구(포켓볼) — 실제 스포츠 활동이며 작품 단위 GAME이 아님
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'fd05e449-0a58-4e5b-b8b3-11ba7eaafa8d'::uuid;
  content_id constant text := 'ddc2244b-8444-46ca-a6ef-4f22f9367d24';
  user_content_id constant uuid := '2a49b398-3502-4b88-a73f-4996e3c2213e'::uuid;
  target_run_id constant uuid := '7970b804-3a88-41c0-ae43-1f6f01edca71'::uuid;
  accepted_music_finding_id constant uuid := '44640104-af79-48a6-bf66-c2eea842b49c'::uuid;
  rejected_book_finding_id constant uuid := '5d4c8fb2-b764-481b-848f-42961000e0f0'::uuid;
  rejected_video_finding_id constant uuid := '649956cf-c7b0-4eeb-9228-c0a96cc8c157'::uuid;
  rejected_game_finding_id constant uuid := '912e097c-9e34-4545-a9fe-c28bbc9f9e8f'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'park-chan-ho'
      AND p.nickname = '박찬호'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '박찬호 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '박찬호에게 이미 연결된 콘텐츠가 있습니다.';
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
      accepted_music_finding_id,
      rejected_book_finding_id,
      rejected_video_finding_id,
      rejected_game_finding_id
    )
  ) THEN
    RAISE EXCEPTION '박찬호 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id = content_id
       OR c.external_id IN (
         'spotify-4ebC0oQEzTTNTpCDM1IBWD',
         '4ebC0oQEzTTNTpCDM1IBWD'
       )
  ) OR EXISTS (
    SELECT 1
    FROM public.content_locales cl
    WHERE lower(cl.title) IN (
      lower('말해줘'),
      lower('말해줘 (feat. 엄정화)'),
      lower('Tell Me (feat. Uhm Jung-hwa)'),
      lower('Tell me (feat. 엄정화)')
    )
  ) OR EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.id = user_content_id
  ) THEN
    RAISE EXCEPTION '말해줘와 충돌하는 콘텐츠·외부 ID·제목·연결 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.contents (
    id,
    type,
    metadata,
    release_date,
    external_source,
    external_id,
    user_count
  )
  VALUES (
    content_id,
    'MUSIC',
    jsonb_build_object(
      'entityType', 'track',
      'releaseDate', '1997-03-01',
      'durationMs', 233000,
      'album', 'Jinusean',
      'albumSpotifyId', '07cn1DunxVqvA3JINM9HKt',
      'spotifyUrl', 'https://open.spotify.com/track/4ebC0oQEzTTNTpCDM1IBWD',
      'artists', jsonb_build_array('JINUSEAN', 'Uhm Jung-hwa')
    ),
    '1997-03-01',
    'spotify',
    'spotify-4ebC0oQEzTTNTpCDM1IBWD',
    0
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '박찬호 신규 contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id,
    locale,
    title,
    creator,
    thumbnail_url,
    description,
    isbn,
    publisher,
    sources,
    verified
  )
  VALUES
    (
      content_id,
      'ko',
      '말해줘 (feat. 엄정화)',
      '지누션 · 엄정화',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0261335e73d2f06ab1f55539ae',
      '지누션의 1997년 데뷔 음반에 수록된 엄정화 피처링 곡이다.',
      NULL,
      NULL,
      jsonb_build_object(
        'primary', 'spotify',
        'thumbnail', 'spotify_oembed',
        'titlePolicy', 'ko_common_title',
        'url', 'https://open.spotify.com/track/4ebC0oQEzTTNTpCDM1IBWD'
      ),
      true
    ),
    (
      content_id,
      'en',
      'Tell Me (feat. Uhm Jung-hwa)',
      'JINUSEAN · Uhm Jung-hwa',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0261335e73d2f06ab1f55539ae',
      'A 1997 JINUSEAN track featuring Uhm Jung-hwa, released on the duo''s debut album.',
      NULL,
      NULL,
      jsonb_build_object(
        'primary', 'spotify',
        'thumbnail', 'spotify_oembed',
        'titlePolicy', 'en_translation',
        'url', 'https://open.spotify.com/track/4ebC0oQEzTTNTpCDM1IBWD'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '박찬호 신규 content_locales 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id,
    user_id,
    content_id,
    status,
    review,
    review_en,
    source_url,
    is_recommended
  )
  VALUES (
    user_content_id,
    target_celeb_id,
    content_id,
    'FINISHED',
    $ko$박찬호는 1997년 인터뷰에서 잠들기 전에 늘 음악을 듣는다고 말한 뒤, 특별한 애창곡은 없지만 좋아하는 노래로 지누션의 「말해줘」를 직접 꼽았다. 작품명이 확인되는 당사자 발언이므로 선호 콘텐츠로 등록한다.$ko$,
    $en$In a 1997 interview, Park Chan-ho said he always listened to music before bed and directly named JINUSEAN's "Tell Me" as a song he liked, although he did not have a particular song he regularly sang. Because the work is identified in Park's own words, it is registered as a liked piece of music.$en$,
    'https://www.chosun.com/site/data/html_dir/1997/09/09/1997090970521.html',
    true
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '박찬호 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer
    FROM public.user_contents uc
    WHERE uc.content_id = c.id
  )
  WHERE c.id = content_id;

  IF (
    SELECT c.user_count
    FROM public.contents c
    WHERE c.id = content_id
  ) <> 1 THEN
    RAISE EXCEPTION '말해줘 user_count 동기화에 실패했습니다.';
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
    '2026-07-30-park-chan-ho-full-v1',
    'Codex',
    ARRAY[
      '박찬호',
      '박찬호 야구',
      '박찬호 코리안 특급',
      'Park Chan-ho',
      'Chan Ho Park'
    ],
    '야구선수 박찬호가 아닌 영화감독 박찬욱, 배우 박찬호와 비슷한 이름, 송강호 관련 검색 결과를 제외했다. 야구 경기·스포츠 활동은 콘텐츠 작품으로 오인하지 않았다.',
    '한국어·영어 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색했다. 본인이 직접 좋아한다고 밝힌 지누션의 「말해줘」 1건을 채택했다. 장훈의 책은 독서 사실만 확인되고 서명이 없어서 기각했으며, 영화 감상과 미국식 당구는 각각 작품명 부재와 실제 스포츠 활동이라는 이유로 등록하지 않았다.'
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
      accepted_music_finding_id,
      target_run_id,
      'MUSIC',
      'accepted',
      '말해줘',
      '지누션 (feat. 엄정화)',
      content_id,
      '1997년 조선일보 문답 인터뷰에서 박찬호가 좋아하는 노래로 지누션의 「말해줘」를 직접 지목했다.',
      NULL
    ),
    (
      rejected_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '장훈의 책(제목 미상)',
      '장훈',
      NULL,
      '박찬호는 2013년 자서전 출간 기자회견에서 야구를 시작한 자신에게 장훈의 책이 매력적이었고 훌륭한 선수가 되는 길을 일깨웠다고 직접 말했다.',
      '기사와 영문판 기사 모두 서명을 밝히지 않는다. 장훈의 1976년·1983년·1991년 일본어 저서와 1993년 한국어판 등 복수 후보가 있어 어느 작품인지 독립적으로 식별할 수 없다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '영화 감상(작품명 미상)',
      NULL,
      NULL,
      '박찬호는 1997년 인터뷰에서 영화 감상을 취미라고 직접 밝혔다.',
      '영화 제목·감독·관람 경험이 특정되지 않아 작품 단위 VIDEO 콘텐츠로 등록할 수 없다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '미국식 당구(포켓볼)',
      NULL,
      NULL,
      '박찬호는 1997년 인터뷰에서 미국에 와서 포켓볼을 배웠고 한인 타운 당구장에서 미국식 당구를 친다고 직접 말했다.',
      '포켓볼은 실제 공간에서 하는 큐 스포츠 활동이며 식별 가능한 디지털·콘솔·보드게임 작품이 아니다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '박찬호 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
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
      'https://www.khan.co.kr/article/201306182151085',
      'primary',
      'direct_statement',
      'accessible',
      '집착·두려움 벗어나 이젠 자유로워 박찬호, 야구 인생 30년 담은 자서전',
      '자서전 출간 기자회견에서 박찬호가 장훈의 책을 읽은 경험과 영향을 직접 설명하지만 서명은 말하지 않는다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.kosho.or.jp/products/search_list.php?search_word=%E5%BC%B5%E6%9C%AC+%E5%8B%B2',
      'secondary',
      'archive',
      'accessible',
      '日本の古本屋 張本勲 저서 검색',
      '『バット一筋』(1976), 『張本勲の勇気をもってぶつかれ』(1983), 『闘魂のバット』(1991) 등 시기상 가능한 복수 저서를 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.aladin.co.kr/shop/wproduct.aspx?itemid=124448531',
      'secondary',
      'official_profile',
      'accessible',
      '일본을 이긴 한국인 1993년 한국어판',
      '장훈 저·성일만 역의 한국어판이 1993년 출간됐음을 확인했지만 박찬호가 이 판본을 뜻했다는 연결 근거는 없다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://www.chosun.com/site/data/html_dir/1997/09/09/1997090970521.html',
      'primary',
      'interview',
      'accessible',
      '박찬호 인터뷰 인기 얻기보다 실력 키우겠다',
      '박찬호가 영화 감상을 취미라고 답하지만 작품명은 제시하지 않는다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://www.chosun.com/site/data/html_dir/1997/09/09/1997090970521.html',
      'primary',
      'interview',
      'accessible',
      '박찬호 인터뷰 인기 얻기보다 실력 키우겠다',
      '박찬호가 미국식 당구와 포켓볼을 직접 언급하지만 이는 작품 단위 게임이 아닌 실제 스포츠 활동이다.'
    ),
    (
      target_run_id,
      'MUSIC',
      accepted_music_finding_id,
      'https://www.chosun.com/site/data/html_dir/1997/09/09/1997090970521.html',
      'primary',
      'direct_statement',
      'accessible',
      '박찬호 인터뷰 인기 얻기보다 실력 키우겠다',
      '좋아하는 노래를 묻는 문답에서 박찬호가 지누션의 「말해줘」를 직접 답한다.'
    ),
    (
      target_run_id,
      'MUSIC',
      accepted_music_finding_id,
      'https://open.spotify.com/track/4ebC0oQEzTTNTpCDM1IBWD',
      'secondary',
      'official_profile',
      'accessible',
      'Tell me (feat. 엄정화) Spotify',
      'Spotify 공개 페이지와 oEmbed에서 트랙 ID, 지누션, 1997-03-01, 233초, 앨범 Jinusean과 표지를 대조했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '박찬호 조사 source 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '박찬호·Park Chan-ho와 추천 책·읽은 책·독서·자서전·favorite book·reading 조합을 검색했다. 장훈의 책을 읽고 영향을 받았다는 직접 발언은 확인했지만 서명이 없고 당시 가능한 장훈 저서가 복수라 기각했다. 박찬호 본인의 자서전은 자기 작품이므로 대상에서 제외했다.'
      WHEN 'VIDEO' THEN
        '좋아하는 영화·추천 영화·본 영화·영화 감상·favorite movie·film 조합과 장문 인터뷰를 확인했다. 영화 감상이라는 취미만 확인되고 특정 작품명은 없어서 기각했다.'
      WHEN 'GAME' THEN
        '게임·비디오게임·플레이·e스포츠·video game·plays 조합을 검색했다. 미국식 당구와 포켓볼 발언은 확인했지만 실제 큐 스포츠이므로 작품 단위 GAME에서 제외했다. 야구 경기와 방송 예능의 게임도 콘텐츠 이용 근거로 세지 않았다.'
      WHEN 'MUSIC' THEN
        '좋아하는 음악·노래·애창곡·favorite music·song 조합을 검색했다. 1997년 본인 문답에서 지누션의 「말해줘」를 직접 확인하고 Spotify 공개 메타와 oEmbed로 작품을 식별했다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '박찬호 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT
    result.final_research_status,
    result.actual_content_count
  INTO
    completed_status,
    completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION
      '박찬호 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
      completed_status,
      completed_content_count;
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
    RAISE EXCEPTION '박찬호 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (
        SELECT count(*)
        FROM public.user_contents uc
        WHERE uc.user_id = p.id
      ) = 1
  ) THEN
    RAISE EXCEPTION '박찬호 프로필·콘텐츠 최종 검증에 실패했습니다.';
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
      ) = 4
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_sources src
        WHERE src.run_id = r.id
      ) = 7
  ) THEN
    RAISE EXCEPTION '박찬호 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
