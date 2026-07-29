-- 활성 상태지만 감상여정과 콘텐츠가 모두 없던 Light 4명을 처음부터 전면 조사한 결과를 반영한다.
--
-- 조사 결과:
--   - 존 허링: SimCity 1건
--   - 알렉스 스파이로: A Few Good Men, My Cousin Vinny 2건
--   - 얀 르쿤: 도서 9, 영화 1, 음악 2 = 12건
--   - 앤서니 암스트롱: 도서·영상·게임·음악·팟캐스트와 동명이인 보충 검색까지
--     완료했으나 유효 작품 0건
--
-- 반영:
--   - 신규 콘텐츠 7종과 ko/en locale 14행
--   - 기존 콘텐츠 8종 재사용
--   - 잘못된 책의 ISBN·표지가 붙어 있던 『Deep Learning』 한국어 locale 교정
--   - 양수 3명은 full/open, 전면 조사 0건 1명은 light/confirmed_empty

BEGIN;

DO $$
DECLARE
  simcity_id text := gen_random_uuid()::text;
  few_good_men_id text := gen_random_uuid()::text;
  smart_animals_id text := gen_random_uuid()::text;
  quantum_paths_id text := gen_random_uuid()::text;
  language_learning_id text := gen_random_uuid()::text;
  giant_steps_id text := gen_random_uuid()::text;
  ai_2041_id text := gen_random_uuid()::text;

  feynman_lectures_id text := '074bf8bc-8ebc-43b4-88df-89d79a1cea61';
  deep_learning_id text := '0bf5bf90-a595-489d-9f54-d27170b5b572';
  surely_joking_id text := '38614b74-efae-4877-a38c-fe85f5a329a8';
  cousin_vinny_id text := '6d6f016a-7b6b-4744-a1bb-526aa7521d30';
  open_society_id text := '7dadf5c2-3aa6-4e86-93f8-6e6b3a827580';
  space_odyssey_id text := '828d7c44-6c03-47e5-bb80-b69ff7af7c11';
  kind_of_blue_id text := '968a7ca1-6cac-49d7-8153-0a3e9e442535';
  qed_id text := 'ff262d8a-3f2e-4230-b8fa-9ba5475be096';

  affected integer;
  wrong_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'content_research_status'
  ) THEN
    RAISE EXCEPTION
      'content_research_status가 없습니다. 스키마 마이그레이션을 먼저 적용하세요.';
  END IF;

  -- 이름이 비슷한 현대 인물을 잘못 갱신하지 않도록 UUID·slug·닉네임과 운영 상태를 함께 잠근다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('02431479-7229-4218-8768-9aea37a5c783'::uuid, 'john-hering', '존 허링'),
      ('4d2958ed-824b-460e-b572-64a6129567bb'::uuid, 'alex-spiro', '알렉스 스파이로'),
      ('ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid, 'yann-lecun', '얀 르쿤'),
      ('e4531a0d-7b26-4160-8e10-c4ffee40092b'::uuid, 'anthony-armstrong', '앤서니 암스트롱')
  ) AS expected(id, slug, nickname)
  LEFT JOIN public.profiles p
    ON p.id = expected.id
  WHERE p.id IS NULL
     OR p.slug IS DISTINCT FROM expected.slug
     OR p.nickname IS DISTINCT FROM expected.nickname
     OR p.profile_type IS DISTINCT FROM 'CELEB'
     OR p.status IS DISTINCT FROM 'active'
     OR p.celeb_tier IS DISTINCT FROM 'light'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR p.cultural_journey IS NOT NULL
     OR p.consumption_philosophy IS NOT NULL;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '무단서 활성 4명의 id/slug/tier/research/journey 기준선이 달라졌습니다. 차이=%',
      wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.user_contents
  WHERE user_id IN (
    '02431479-7229-4218-8768-9aea37a5c783'::uuid,
    '4d2958ed-824b-460e-b572-64a6129567bb'::uuid,
    'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid,
    'e4531a0d-7b26-4160-8e10-c4ffee40092b'::uuid
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '무단서 활성 4명에게 이미 콘텐츠가 생겼습니다. 현재 연결 수=%',
      wrong_count;
  END IF;

  -- 재사용할 8종의 UUID와 외부 식별자가 조사 시점과 같아야 한다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      (feynman_lectures_id, 'BOOK', 'naver_book', '9788988907634'),
      (deep_learning_id, 'BOOK', 'naver_book', '9780262035613'),
      (surely_joking_id, 'BOOK', 'naver_book', '9788983710444'),
      (cousin_vinny_id, 'VIDEO', 'tmdb', 'tmdb-movie-10377'),
      (open_society_id, 'BOOK', 'naver_book', '9788937416170'),
      (space_odyssey_id, 'VIDEO', 'tmdb', 'tmdb-movie-62'),
      (kind_of_blue_id, 'MUSIC', 'spotify', 'spotify-1weenld61qoidwYuZ1GESA'),
      (qed_id, 'BOOK', 'naver_book', '9788988907184')
  ) AS expected(id, type, external_source, external_id)
  JOIN public.contents c
    ON c.id = expected.id
  WHERE c.type = expected.type
    AND c.external_source = expected.external_source
    AND c.external_id = expected.external_id;

  IF wrong_count <> 8 THEN
    RAISE EXCEPTION
      '재사용 콘텐츠 8종의 UUID/외부 식별자 기준선이 다릅니다. 일치=%',
      wrong_count;
  END IF;

  -- 『Deep Learning』 정본에 다른 책의 한국어 메타데이터가 붙은 현재 상태를 잠근다.
  IF NOT EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE content_id = deep_learning_id
      AND locale = 'ko'
      AND title = '딥러닝'
      AND creator IS NULL
      AND isbn = '9791169213608'
      AND thumbnail_url = 'https://shopping-phinf.pstatic.net/main_5368811/53688114533.20250322092309.jpg'
  ) THEN
    RAISE EXCEPTION '수선 전 『Deep Learning』 ko locale 기준선이 달라졌습니다.';
  END IF;

  -- 새 외부 식별자와 판본 ISBN은 아직 쓰이지 않아야 한다.
  SELECT count(*)
  INTO wrong_count
  FROM public.contents
  WHERE external_id IN (
    'igdb-1272',
    'tmdb-movie-881',
    '9788984076334',
    '9780486477220',
    '9780710200235',
    'spotify-3kxiL93hCFCIXkXJBLcYDi',
    '9791157846405'
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '무단서 활성 조사 신규 외부 ID가 이미 존재합니다. 중복=%', wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.content_locales
  WHERE isbn IN (
    '9788984076334',
    '9780393246186',
    '9780486477220',
    '9780710200235',
    '9791157846405',
    '9780593238295'
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '무단서 활성 조사 신규 ISBN이 이미 다른 locale에 있습니다. 중복=%', wrong_count;
  END IF;

  -- 정본 『Deep Learning』의 한국어판을 실제 번역본 『심층 학습』으로 교정한다.
  UPDATE public.content_locales
  SET title = '심층 학습',
      creator = '이안 굿펠로 · 요슈아 벤지오 · 에런 쿠르빌',
      thumbnail_url = 'https://shopping-phinf.pstatic.net/main_3244055/32440556839.20260331120558.jpg',
      isbn = '9791188621422',
      publisher = '제이펍',
      sources = jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'titlePolicy', 'edition_match'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = deep_learning_id
    AND locale = 'ko'
    AND title = '딥러닝'
    AND creator IS NULL
    AND isbn = '9791169213608';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '『Deep Learning』 ko locale 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.contents (
    id,
    type,
    release_date,
    external_source,
    external_id,
    metadata,
    user_count
  )
  VALUES
    (
      simcity_id,
      'GAME',
      '1989-10-03',
      'igdb',
      'igdb-1272',
      jsonb_build_object(
        'developer', 'Maxis',
        'publisher', 'Maxis',
        'releaseDate', '1989-10-03',
        'genres', jsonb_build_array('Simulator', 'Strategy'),
        'platforms', jsonb_build_array('DOS', 'Mac', 'Amiga', 'Windows'),
        'igdbUrl', 'https://www.igdb.com/games/simcity'
      ),
      0
    ),
    (
      few_good_men_id,
      'VIDEO',
      '1992-12-11',
      'tmdb',
      'tmdb-movie-881',
      jsonb_build_object(
        'mediaType', 'movie',
        'tmdbId', 881,
        'originalTitle', 'A Few Good Men',
        'releaseDate', '1992-12-11',
        'director', 'Rob Reiner',
        'genres', jsonb_build_array('Drama')
      ),
      0
    ),
    (
      smart_animals_id,
      'BOOK',
      '2017-07-25',
      'naver_book',
      '9788984076334',
      jsonb_build_object(
        'isbn', '9788984076334',
        'link', 'https://search.shopping.naver.com/book/catalog/32445553288',
        'publisher', '세종서적',
        'publishDate', '2017-07-25'
      ),
      0
    ),
    (
      quantum_paths_id,
      'BOOK',
      '2010-01-01',
      'openlibrary',
      '9780486477220',
      jsonb_build_object(
        'isbn', '9780486477220',
        'openLibraryEdition', '/books/OL24080281M',
        'openLibraryWork', '/works/OL10477081W',
        'publisher', 'Dover Publications',
        'publishDate', '2010'
      ),
      0
    ),
    (
      language_learning_id,
      'BOOK',
      '1983-01-01',
      'openlibrary',
      '9780710200235',
      jsonb_build_object(
        'isbn', '9780710200235',
        'openLibraryEdition', '/books/OL7780273M',
        'openLibraryWork', '/works/OL3037604W',
        'publisher', 'Routledge',
        'publishDate', '1983'
      ),
      0
    ),
    (
      giant_steps_id,
      'MUSIC',
      '1960-01-01',
      'spotify',
      'spotify-3kxiL93hCFCIXkXJBLcYDi',
      jsonb_build_object(
        'entityType', 'album',
        'albumType', 'album',
        'releaseDate', '1960',
        'totalTracks', 15,
        'spotifyUrl', 'https://open.spotify.com/album/3kxiL93hCFCIXkXJBLcYDi',
        'artists', jsonb_build_array('John Coltrane')
      ),
      0
    ),
    (
      ai_2041_id,
      'BOOK',
      '2023-01-09',
      'naver_book',
      '9791157846405',
      jsonb_build_object(
        'isbn', '9791157846405',
        'link', 'https://search.shopping.naver.com/book/catalog/37081845618',
        'publisher', '한빛비즈',
        'publishDate', '2023-01-09'
      ),
      0
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '무단서 활성 조사 신규 contents 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id,
    locale,
    title,
    creator,
    thumbnail_url,
    isbn,
    publisher,
    sources,
    verified
  )
  VALUES
    (
      simcity_id,
      'ko',
      '심시티',
      'Maxis',
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co1vwv.jpg',
      NULL,
      'Maxis',
      jsonb_build_object('primary', 'igdb', 'thumbnail', 'igdb', 'titlePolicy', 'ko_transliteration'),
      true
    ),
    (
      simcity_id,
      'en',
      'SimCity',
      'Maxis',
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co1vwv.jpg',
      NULL,
      'Maxis',
      jsonb_build_object('primary', 'igdb', 'thumbnail', 'igdb'),
      true
    ),
    (
      few_good_men_id,
      'ko',
      '어 퓨 굿 맨',
      '롭 라이너',
      'https://image.tmdb.org/t/p/w500/9aLwIOYLLrtzKqwieTlHrxXFOfk.jpg',
      NULL,
      'Columbia Pictures',
      jsonb_build_object('primary', 'tmdb', 'thumbnail', 'tmdb_ko'),
      true
    ),
    (
      few_good_men_id,
      'en',
      'A Few Good Men',
      'Rob Reiner',
      'https://image.tmdb.org/t/p/w500/rLOk4z9zL1tTukIYV56P94aZXKk.jpg',
      NULL,
      'Columbia Pictures',
      jsonb_build_object('primary', 'tmdb', 'thumbnail', 'tmdb_en'),
      true
    ),
    (
      smart_animals_id,
      'ko',
      '동물의 생각에 관한 생각',
      '프란스 드 발',
      'https://shopping-phinf.pstatic.net/main_3244555/32445553288.20260331103550.jpg',
      '9788984076334',
      '세종서적',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'titlePolicy', 'edition_match'
      ),
      true
    ),
    (
      smart_animals_id,
      'en',
      'Are We Smart Enough to Know How Smart Animals Are?',
      'Frans de Waal',
      'https://covers.openlibrary.org/b/id/12514840-L.jpg',
      '9780393246186',
      'W. W. Norton & Company',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryEdition', '/books/OL26359395M',
        'openLibraryWork', '/works/OL21299028W',
        'titlePolicy', 'edition_match'
      ),
      true
    ),
    (
      quantum_paths_id,
      'ko',
      'Quantum Mechanics and Path Integrals',
      'Richard P. Feynman · Albert R. Hibbs',
      'https://covers.openlibrary.org/b/id/8712508-L.jpg',
      '9780486477220',
      'Dover Publications',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryEdition', '/books/OL24080281M',
        'openLibraryWork', '/works/OL10477081W',
        'titlePolicy', 'original_title_no_ko_edition'
      ),
      true
    ),
    (
      quantum_paths_id,
      'en',
      'Quantum Mechanics and Path Integrals',
      'Richard P. Feynman · Albert R. Hibbs',
      'https://covers.openlibrary.org/b/id/8712508-L.jpg',
      '9780486477220',
      'Dover Publications',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryEdition', '/books/OL24080281M',
        'openLibraryWork', '/works/OL10477081W',
        'titlePolicy', 'edition_match'
      ),
      true
    ),
    (
      language_learning_id,
      'ko',
      'Language and Learning: The Debate Between Jean Piaget and Noam Chomsky',
      'Massimo Piattelli-Palmarini',
      'https://covers.openlibrary.org/b/id/4663902-L.jpg',
      '9780710200235',
      'Routledge',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryEdition', '/books/OL7780273M',
        'openLibraryWork', '/works/OL3037604W',
        'titlePolicy', 'original_title_no_ko_edition'
      ),
      true
    ),
    (
      language_learning_id,
      'en',
      'Language and Learning: The Debate Between Jean Piaget and Noam Chomsky',
      'Massimo Piattelli-Palmarini',
      'https://covers.openlibrary.org/b/id/4663902-L.jpg',
      '9780710200235',
      'Routledge',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryEdition', '/books/OL7780273M',
        'openLibraryWork', '/works/OL3037604W',
        'titlePolicy', 'edition_match'
      ),
      true
    ),
    (
      giant_steps_id,
      'ko',
      'Giant Steps (Deluxe Edition)',
      '존 콜트레인',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02a45f9f358eb8ff3a18622059',
      NULL,
      'Atlantic Records',
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      giant_steps_id,
      'en',
      'Giant Steps (Deluxe Edition)',
      'John Coltrane',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02a45f9f358eb8ff3a18622059',
      NULL,
      'Atlantic Records',
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      ai_2041_id,
      'ko',
      'AI 2041',
      '리카이푸 · 천치우판',
      'https://shopping-phinf.pstatic.net/main_3708184/37081845618.20260331114804.jpg',
      '9791157846405',
      '한빛비즈',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'titlePolicy', 'edition_match'
      ),
      true
    ),
    (
      ai_2041_id,
      'en',
      'AI 2041',
      'Kai-Fu Lee · Chen Qiufan',
      'https://covers.openlibrary.org/b/id/11101676-L.jpg',
      '9780593238295',
      'Currency',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryEdition', '/books/OL32442080M',
        'titlePolicy', 'edition_match'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 14 THEN
    RAISE EXCEPTION '무단서 활성 조사 content_locales 생성 행 수가 14가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    user_id,
    content_id,
    status,
    review,
    review_en,
    source_url,
    is_recommended
  )
  VALUES
    (
      '02431479-7229-4218-8768-9aea37a5c783'::uuid,
      simcity_id,
      'FINISHED',
      $ko$존 허링은 어린 시절 가장 좋아하던 게임 「SimCity」가 저장된 플로피디스크의 내용을 친구가 지우자, 암호를 우회해 다시 접근하는 방법을 알아냈다고 「포천」에 회고했다. 그는 이 일을 자신의 첫 해킹으로 설명한다. 좋아한 작품명과 실제 플레이 맥락이 본인 인터뷰로 확인돼 1989년 원작 게임을 연결했다.$ko$,
      $en$John Hering told *Fortune* that after a friend erased the floppy disk containing his favorite game, *SimCity*, he figured out how to bypass the password and regain access. He describes this as his first hack. The interview identifies both the game and his direct play, so the original 1989 title is linked.$en$,
      'https://fortune.com/2013/10/10/a-hacker-who-helps/',
      false
    ),
    (
      '4d2958ed-824b-460e-b572-64a6129567bb'::uuid,
      few_good_men_id,
      'FINISHED',
      $ko$알렉스 스파이로는 릭 루빈과의 인터뷰에서 어린 시절 「A Few Good Men」을 좋아했고, 이 영화와 「My Cousin Vinny」가 자신을 로스쿨 쪽으로 기울게 했다고 말했다. 법정영화라는 장르 일반이 아니라 작품명과 진로에 미친 방향을 본인이 함께 밝혔다.$ko$,
      $en$Alex Spiro told Rick Rubin that he loved *A Few Good Men* growing up and that it, together with *My Cousin Vinny*, predisposed him toward law school. His own account names the film and the direction it gave his career interest, rather than merely indicating a general taste for courtroom dramas.$en$,
      'https://podscripts.co/podcasts/tetragrammaton-with-rick-rubin/alex-spiro',
      false
    ),
    (
      '4d2958ed-824b-460e-b572-64a6129567bb'::uuid,
      cousin_vinny_id,
      'FINISHED',
      $ko$알렉스 스파이로는 같은 인터뷰에서 「My Cousin Vinny」를 어린 시절 좋아한 영화로 꼽고, 대화 후반에도 이 영화를 좋아한다고 다시 강조했다. 그는 「A Few Good Men」과 함께 이 작품이 자신을 로스쿨로 향하게 한 배경이었다고 설명했다.$ko$,
      $en$Alex Spiro named *My Cousin Vinny* among the films he loved growing up and later reiterated in the same interview that he loves the movie. He said it and *A Few Good Men* helped incline him toward law school.$en$,
      'https://podscripts.co/podcasts/tetragrammaton-with-rick-rubin/alex-spiro',
      false
    ),
    (
      'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid,
      smart_animals_id,
      'FINISHED',
      $ko$얀 르쿤은 프란스 드 발의 『동물의 생각에 관한 생각』을 읽고 있다며 “훌륭하다”고 직접 평가했다. 읽는 중이라는 상태와 긍정적 감상이 같은 본인 게시물에 있어 등록한다.$ko$,
      $en$Yann LeCun wrote that he was reading Frans de Waal's *Are We Smart Enough to Know How Smart Animals Are?* and called it great. His own post establishes both active reading and a positive assessment.$en$,
      'https://x.com/ylecun/status/1203846856712671233',
      false
    ),
    (
      'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid,
      open_society_id,
      'FINISHED',
      $ko$얀 르쿤은 칼 포퍼의 『열린사회와 그 적들』을 “훌륭한 책”이라고 직접 추천했다. 짧은 평가이지만 작품명이 명확하고 본인 계정의 평가가 확인돼 기존 콘텐츠를 연결했다.$ko$,
      $en$Yann LeCun directly described Karl Popper's *The Open Society and Its Enemies* as a great book. The comment is brief, but it clearly identifies the title and records his own favorable assessment.$en$,
      'https://x.com/ylecun/status/1797960382675386865',
      false
    ),
    (
      'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid,
      surely_joking_id,
      'FINISHED',
      $ko$얀 르쿤은 물리학을 이해하기 위한 파인만 독서 순서를 제안하며 첫 단계로 『파인만 씨 농담도 잘하시네!』를 꼽았다. 일화집에서 출발해 강의와 전문서로 올라가는 추천 경로의 입문서로 직접 제시했다.$ko$,
      $en$Yann LeCun proposed a reading path for understanding physics through Feynman and placed *Surely You're Joking, Mr. Feynman!* first. He presented it as the accessible entry point before moving to lectures and more technical books.$en$,
      'https://x.com/ylecun/status/1685556003582902272',
      false
    ),
    (
      'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid,
      qed_id,
      'FINISHED',
      $ko$얀 르쿤은 같은 파인만 독서 순서의 두 번째 단계로 『QED: 빛과 물질의 기묘한 이론』을 추천했다. 대중적 일화집 다음에 물리 개념으로 들어가는 책으로 작품명을 직접 지정했다.$ko$,
      $en$Yann LeCun placed *QED: The Strange Theory of Light and Matter* second in the same Feynman reading path. He explicitly selected it as the step from an accessible memoir toward the physics itself.$en$,
      'https://x.com/ylecun/status/1685556003582902272',
      false
    ),
    (
      'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid,
      feynman_lectures_id,
      'FINISHED',
      $ko$얀 르쿤은 파인만 독서 순서의 세 번째 단계로 『파인만의 물리학 강의』를 추천했다. QED 강의 뒤에 종합 강의를 읽고 마지막에 경로적분 전문서로 나아가도록 구성한 본인의 단계별 추천이다.$ko$,
      $en$Yann LeCun placed *The Feynman Lectures on Physics* third in his suggested sequence. His path moves from *QED* to the broader lectures and then to a specialist text on path integrals.$en$,
      'https://x.com/ylecun/status/1685556003582902272',
      false
    ),
    (
      'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid,
      quantum_paths_id,
      'FINISHED',
      $ko$얀 르쿤은 물리학을 깊게 이해하려는 독자에게 제시한 파인만 독서 순서의 마지막 단계로 『Quantum Mechanics and Path Integrals』를 꼽았다. 앞선 세 권을 거친 뒤 읽을 고급 과정으로 작품명을 직접 추천했다.$ko$,
      $en$Yann LeCun made *Quantum Mechanics and Path Integrals* the final step in his Feynman reading path for readers seeking a deeper understanding of physics. He explicitly recommended the title as the advanced destination after the preceding three books.$en$,
      'https://x.com/ylecun/status/1685556003582902272',
      false
    ),
    (
      'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid,
      deep_learning_id,
      'FINISHED',
      $ko$얀 르쿤은 MIT Press의 『Deep Learning』 추천사에서 이 책을 해당 분야 최초의 종합 교과서로 평가하고, 앞으로 여러 해 동안 참고문헌이 될 것이라고 내다봤다. 저자들과 같은 분야의 연구자라는 사실만으로 추정한 것이 아니라 출판사가 보존한 본인의 공식 추천사다.$ko$,
      $en$Yann LeCun's endorsement on the MIT Press page calls *Deep Learning* the field's first comprehensive textbook and predicts that it will remain a reference for years. This entry relies on his published endorsement, not an inference from his professional proximity to the authors.$en$,
      'https://mitpress.mit.edu/9780262337373/deep-learning/',
      false
    ),
    (
      'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid,
      language_learning_id,
      'FINISHED',
      $ko$얀 르쿤은 NYU 쿠란트연구소의 공식 소개에서 피아제와 촘스키의 논쟁을 담은 『Language and Learning』을 접한 뒤 인공지능 분야에 빠져들었다고 회고했다. 철학적 논쟁을 읽은 경험이 자신의 연구 진입점이었다는 관계가 기관 자료에 작품명과 함께 남아 있다.$ko$,
      $en$Yann LeCun recalled in an official NYU Courant profile that reading *Language and Learning*, the debate between Jean Piaget and Noam Chomsky, helped draw him into artificial intelligence. The institutional account identifies the book as an entry point into his field.$en$,
      'https://cims.nyu.edu/newsletters/Winter2018.pdf',
      false
    ),
    (
      'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid,
      ai_2041_id,
      'FINISHED',
      $ko$얀 르쿤은 『AI 2041』 공식 추천사에서 선구적 기술자와 SF 작가의 협업이 인공지능 기술이 삶에 미칠 영향에 관해 대담하고 시급한 통찰을 준다고 평가했다. 작품 공식 사이트가 이름과 직함을 함께 명시한 추천사이므로 등록한다.$ko$,
      $en$Yann LeCun's official endorsement of *AI 2041* says that the collaboration between a pioneering technologist and a science-fiction writer offers bold and urgent insight into how AI technologies may affect our lives. The book's official site attributes the assessment to him by name and title.$en$,
      'https://www.ai2041.com/endorsement',
      false
    ),
    (
      'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid,
      space_odyssey_id,
      'FINISHED',
      $ko$얀 르쿤은 HLF 인터뷰에서 아홉 살 무렵 「2001 스페이스 오디세이」를 보고 완전히 매료됐으며 큰 영향을 받았다고 회고했다. 어린 시절의 구체적 관람 시점과 감상이 본인 발언으로 확인돼 기존 영화 콘텐츠를 연결했다.$ko$,
      $en$Yann LeCun recalled in an HLF interview that he saw *2001: A Space Odyssey* at about age nine, found it absolutely fascinating, and was deeply influenced by it. His own account supplies both the viewing context and the reaction.$en$,
      'https://av.tib.eu/media/18527',
      false
    ),
    (
      'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid,
      giant_steps_id,
      'FINISHED',
      $ko$얀 르쿤은 뉴욕과학아카데미 소개에서 존 콜트레인의 「Giant Steps」를 자신의 역대 가장 좋아하는 재즈 음반 가운데 하나로 꼽았다. 작품 단위의 선호가 명시돼 스포티파이의 해당 음반을 연결했다.$ko$,
      $en$Yann LeCun identifies John Coltrane's *Giant Steps* as one of his favorite jazz albums of all time in a New York Academy of Sciences profile. The album-level preference is explicit, so the corresponding Spotify release is linked.$en$,
      'https://www.nyas.org/ideas-insights/blog/the-academy-recognizes-yann-lecun-for-advancing-ai/',
      false
    ),
    (
      'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid,
      kind_of_blue_id,
      'FINISHED',
      $ko$얀 르쿤은 같은 뉴욕과학아카데미 소개에서 마일스 데이비스의 「Kind of Blue」도 자신의 역대 가장 좋아하는 재즈 음반 가운데 하나로 꼽았다. 장르 선호에 그치지 않고 특정 음반명이 확인돼 기존 콘텐츠를 연결했다.$ko$,
      $en$Yann LeCun also identifies Miles Davis's *Kind of Blue* as one of his favorite jazz albums of all time in the same New York Academy of Sciences profile. Because the album is named rather than merely the genre, the existing content is linked.$en$,
      'https://www.nyas.org/ideas-insights/blog/the-academy-recognizes-yann-lecun-for-advancing-ai/',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 15 THEN
    RAISE EXCEPTION '무단서 활성 조사 user_contents 생성 행 수가 15가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id IN (
    '02431479-7229-4218-8768-9aea37a5c783'::uuid,
    '4d2958ed-824b-460e-b572-64a6129567bb'::uuid,
    'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid
  )
    AND profile_type = 'CELEB'
    AND status = 'active'
    AND celeb_tier = 'light'
    AND content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '무단서 활성 조사 full 승격 행 수가 3이 아닙니다. 실제=%', affected;
  END IF;

  -- 모든 유형·표기 변형·동명이인 보충 검색을 마친 유일한 0건 인물만 -1 상태로 닫는다.
  UPDATE public.profiles p
  SET content_research_status = 'confirmed_empty'
  WHERE p.id = 'e4531a0d-7b26-4160-8e10-c4ffee40092b'::uuid
    AND p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'open'
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_contents uc
      WHERE uc.user_id = p.id
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '앤서니 암스트롱 confirmed_empty 전환 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  -- 새 연결로 달라진 15개 콘텐츠의 저장 누적값을 실제 연결 수와 맞춘다.
  UPDATE public.contents c
  SET user_count = counts.actual_count
  FROM (
    SELECT touched.id, count(uc.content_id)::integer AS actual_count
    FROM (
      VALUES
        (simcity_id),
        (few_good_men_id),
        (smart_animals_id),
        (quantum_paths_id),
        (language_learning_id),
        (giant_steps_id),
        (ai_2041_id),
        (feynman_lectures_id),
        (deep_learning_id),
        (surely_joking_id),
        (cousin_vinny_id),
        (open_society_id),
        (space_odyssey_id),
        (kind_of_blue_id),
        (qed_id)
    ) AS touched(id)
    LEFT JOIN public.user_contents uc
      ON uc.content_id = touched.id
    GROUP BY touched.id
  ) counts
  WHERE c.id = counts.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 15 THEN
    RAISE EXCEPTION '무단서 활성 조사 touched contents user_count 동기화 행 수가 15가 아닙니다. 실제=%', affected;
  END IF;

  -- 인물별 실제 콘텐츠 수와 상태를 고정한다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('john-hering', 'full', 'open', 1),
      ('alex-spiro', 'full', 'open', 2),
      ('yann-lecun', 'full', 'open', 12),
      ('anthony-armstrong', 'light', 'confirmed_empty', 0)
  ) AS expected(slug, expected_tier, expected_status, expected_count)
  JOIN public.profiles p
    ON p.slug = expected.slug
  WHERE p.celeb_tier IS DISTINCT FROM expected.expected_tier
     OR p.content_research_status IS DISTINCT FROM expected.expected_status
     OR (
       SELECT count(*)
       FROM public.user_contents uc
       WHERE uc.user_id = p.id
     ) <> expected.expected_count;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '무단서 활성 조사 인물별 콘텐츠 수/상태 검증 실패 인물=%', wrong_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = 'e4531a0d-7b26-4160-8e10-c4ffee40092b'::uuid
      AND content_research_status = 'confirmed_empty'
      AND content_research_updated_at IS NOT NULL
      AND content_research_confirmed_empty_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION '앤서니 암스트롱의 -1 확정 시각이 기록되지 않았습니다.';
  END IF;

  -- 신규 7종과 교정·재사용 8종 모두 ko/en verified locale과 실제 표지를 가져야 한다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      (simcity_id),
      (few_good_men_id),
      (smart_animals_id),
      (quantum_paths_id),
      (language_learning_id),
      (giant_steps_id),
      (ai_2041_id),
      (feynman_lectures_id),
      (deep_learning_id),
      (surely_joking_id),
      (cousin_vinny_id),
      (open_society_id),
      (space_odyssey_id),
      (kind_of_blue_id),
      (qed_id)
  ) AS touched(id)
  WHERE (
    SELECT count(*)
    FROM public.content_locales cl
    WHERE cl.content_id = touched.id
      AND cl.locale IN ('ko', 'en')
      AND cl.verified = true
      AND NULLIF(btrim(cl.title), '') IS NOT NULL
      AND NULLIF(btrim(cl.creator), '') IS NOT NULL
      AND NULLIF(btrim(cl.thumbnail_url), '') IS NOT NULL
  ) <> 2;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '무단서 활성 조사 locale/thumbnail/verified 검증 실패 콘텐츠=%', wrong_count;
  END IF;

  -- 감상경위의 첫 문장 주어, 한영 본문, 출처 URL을 모두 강제한다.
  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    JOIN public.profiles p
      ON p.id = uc.user_id
    WHERE uc.user_id IN (
      '02431479-7229-4218-8768-9aea37a5c783'::uuid,
      '4d2958ed-824b-460e-b572-64a6129567bb'::uuid,
      'ce46d964-7582-4622-89b7-c97802fe1a7a'::uuid
    )
      AND (
        NULLIF(btrim(uc.review), '') IS NULL
        OR NULLIF(btrim(uc.review_en), '') IS NULL
        OR NULLIF(btrim(uc.source_url), '') IS NULL
        OR uc.source_url !~ '^https://'
        OR uc.review NOT LIKE p.nickname || '%'
        OR uc.review_en NOT LIKE p.nickname_en || '%'
      )
  ) THEN
    RAISE EXCEPTION '무단서 활성 조사 review/review_en/source_url/첫 문장 주어 검증에 실패했습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id IN (
      simcity_id,
      few_good_men_id,
      smart_animals_id,
      quantum_paths_id,
      language_learning_id,
      giant_steps_id,
      ai_2041_id,
      feynman_lectures_id,
      deep_learning_id,
      surely_joking_id,
      cousin_vinny_id,
      open_society_id,
      space_odyssey_id,
      kind_of_blue_id,
      qed_id
    )
      AND c.user_count IS DISTINCT FROM (
        SELECT count(*)::integer
        FROM public.user_contents uc
        WHERE uc.content_id = c.id
      )
  ) THEN
    RAISE EXCEPTION '무단서 활성 조사 touched contents의 저장 user_count와 실제 연결 수가 다릅니다.';
  END IF;
END;
$$;

COMMIT;
