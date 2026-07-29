-- 활성 + 감상여정 명시 작품군 56~75번의 근거 통과분을 원자적으로 반영한다.
--
-- 조사 결과:
--   - 20명, 추출 후보 43건 가운데 5명 9건만 등록 기준 통과
--   - 포카혼타스 1, 알 킨디 1, 푸치니 1, 비베카난다 2, 이치로 4
--   - 이치로와 『캡틴』의 관계는 근거를 통과했지만, 네이버·OpenLibrary에
--     적격 판본 메타데이터가 없어 이번 등록에서는 보류
--   - 알 킨디의 『아리스토텔레스의 신학』도 관계 근거는 확인했으나,
--     해당 고대 아랍어 저작과 일치하는 적격 판본을 찾지 못해 보류
--   - 본인 저작·본인 출연작·일반적 영향 추정·도상 자료는 제외
--
-- 기존 데이터 수선:
--   - 『형이상학』의 잘못 붙은 하이데거 영어 locale을 아리스토텔레스판으로 교체
--   - 『브리태니커 백과사전』의 잘못 붙은 동명 해설서 한국어 locale과
--     서로 다른 판본이 섞인 contents 메타데이터를 한 판본으로 통일
--
-- 반영:
--   - 신규 도서 3종, 음악 4종과 ko/en locale 14행
--   - 기존 『형이상학』·『브리태니커 백과사전』 재사용
--   - 5명에게 콘텐츠 9건 연결 후 light에서 full로 승격
--
-- 이 파일은 20260729_correct_active_target_batch_04_journeys.sql보다 먼저 실행한다.

BEGIN;

DO $$
DECLARE
  complete_masques_id text := gen_random_uuid()::text;
  aida_id text := gen_random_uuid()::text;
  green_history_id text := gen_random_uuid()::text;
  men_at_work_id text := gen_random_uuid()::text;
  amagi_goe_id text := gen_random_uuid()::text;
  jump_id text := gen_random_uuid()::text;
  in_the_ayer_id text := gen_random_uuid()::text;

  metaphysics_id text := '2c4fb84d-3f46-4ac3-8a61-71adccac8eb9';
  britannica_id text := '53061433-86a0-4571-a785-b141fcc3ddea';

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

  -- UUID가 다른 인물을 승격하지 못하도록 id·slug·닉네임과 운영 상태를 함께 잠근다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('60b59a7f-94de-4eb7-9264-52d6712d363b'::uuid, 'pocahontas', '포카혼타스'),
      ('2ffe22f7-9a30-4f76-a4a5-1e0e592ae6f4'::uuid, 'al-kindi', '알 킨디'),
      ('b713216d-d931-47e1-819b-051bf8f92773'::uuid, 'giacomo-puccini', '자코모 푸치니'),
      ('e4f57a9e-a5c5-4303-b26d-390a10397c15'::uuid, 'vivekananda', '비베카난다'),
      ('ef589d79-4ae5-4fee-bdba-baf76130189c'::uuid, 'ichiro-suzuki', '스즈키 이치로')
  ) AS expected(id, slug, nickname)
  LEFT JOIN public.profiles p
    ON p.id = expected.id
  WHERE p.id IS NULL
     OR p.slug IS DISTINCT FROM expected.slug
     OR p.nickname IS DISTINCT FROM expected.nickname
     OR p.profile_type IS DISTINCT FROM 'CELEB'
     OR p.status IS DISTINCT FROM 'active'
     OR p.celeb_tier IS DISTINCT FROM 'light'
     OR p.content_research_status IS DISTINCT FROM 'open';

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '4차 통과자 5명의 id/slug/tier/research 기준선이 달라졌습니다. 차이=%',
      wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.user_contents
  WHERE user_id IN (
    '60b59a7f-94de-4eb7-9264-52d6712d363b'::uuid,
    '2ffe22f7-9a30-4f76-a4a5-1e0e592ae6f4'::uuid,
    'b713216d-d931-47e1-819b-051bf8f92773'::uuid,
    'e4f57a9e-a5c5-4303-b26d-390a10397c15'::uuid,
    'ef589d79-4ae5-4fee-bdba-baf76130189c'::uuid
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '4차 통과자 중 이미 user_contents가 생긴 인물이 있습니다. 기존 행=%',
      wrong_count;
  END IF;

  -- 재사용할 두 항목은 UUID와 현재 핵심 정체성이 모두 맞아야 한다.
  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales cl
      ON cl.content_id = c.id
     AND cl.locale = 'ko'
    WHERE c.id = metaphysics_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788930606431'
      AND cl.isbn = '9788930606431'
      AND cl.title = '아리스토텔레스의 형이상학'
  ) THEN
    RAISE EXCEPTION '재사용할 아리스토텔레스 『형이상학』 기준선이 달라졌습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales cl
      ON cl.content_id = c.id
     AND cl.locale = 'en'
    WHERE c.id = britannica_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9781024304992'
      AND cl.isbn = '9781020033650'
      AND cl.title = 'Encyclopaedia Britannica'
  ) THEN
    RAISE EXCEPTION '재사용할 『Encyclopaedia Britannica』 기준선이 달라졌습니다.';
  END IF;

  -- 새 외부 ID와 새 ISBN은 아직 어떤 콘텐츠에도 쓰이지 않아야 한다.
  SELECT count(*)
  INTO wrong_count
  FROM public.contents
  WHERE external_id IN (
    '9780300105384',
    'spotify-1DzOlDcp25jxdtz6Qafldl',
    '9780460007276',
    '9780060973728',
    'spotify-2vNgdLi9QiYKHOql5ivsGf',
    'spotify-0WhIQ7V7DDO5cqv0KzZamm',
    'spotify-7l3aCYB41adDUhuIJmGdun',
    '9781020033650'
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '4차 신규 외부 ID가 이미 존재합니다. 중복=%', wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.content_locales
  WHERE isbn IN (
    '9780140446197',
    '9780300105384',
    '9780460007276',
    '9780060973728'
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '4차 신규/수선 ISBN이 이미 다른 locale에 존재합니다. 중복=%', wrong_count;
  END IF;

  -- 아리스토텔레스 작품에 잘못 붙은 하이데거 영어판을 바로잡는다.
  UPDATE public.contents
  SET release_date = '2022-06-30',
      metadata = jsonb_build_object(
        'isbn', '9788930606431',
        'originalTitle', 'Metaphysica',
        'publisher', '서광사',
        'publishDate', '2022-06-30',
        'link', 'https://search.shopping.naver.com/book/catalog/33046117620'
      )
  WHERE id = metaphysics_id
    AND external_source = 'naver_book'
    AND external_id = '9788930606431';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '『형이상학』 contents 수선 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET creator = '아리스토텔레스',
      thumbnail_url = 'https://shopping-phinf.pstatic.net/main_3304611/33046117620.20260331113339.jpg',
      isbn = '9788930606431',
      publisher = '서광사',
      sources = jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = metaphysics_id
    AND locale = 'ko'
    AND title = '아리스토텔레스의 형이상학';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '『형이상학』 ko locale 수선 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET title = 'Metaphysics',
      creator = 'Aristotle',
      thumbnail_url = 'https://covers.openlibrary.org/b/id/14368419-L.jpg',
      isbn = '9780140446197',
      publisher = 'Penguin Books',
      sources = jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryKey', '/books/OL117863M'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = metaphysics_id
    AND locale = 'en'
    AND title = 'Metaphysics'
    AND creator = 'Martin Heidegger'
    AND isbn = '9780300083286';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '『형이상학』 en locale 수선 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  -- 브리태니커 항목을 영어판 한 판본으로 통일한다.
  UPDATE public.contents
  SET release_date = '2023-01-01',
      external_source = 'openlibrary',
      external_id = '9781020033650',
      metadata = jsonb_build_object(
        'isbn', '9781020033650',
        'openLibraryKey', '/books/OL51423912M',
        'publisher', 'Creative Media Partners, LLC',
        'publishDate', '2023'
      )
  WHERE id = britannica_id
    AND external_source = 'naver_book'
    AND external_id = '9781024304992';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '『브리태니커』 contents 수선 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET title = '브리태니커 백과사전',
      creator = '토머스 스펜서 베인스',
      thumbnail_url = 'https://covers.openlibrary.org/b/id/11041477-L.jpg',
      isbn = '9781020033650',
      publisher = 'Creative Media Partners, LLC',
      sources = jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryKey', '/books/OL51423912M',
        'titlePolicy', 'ko_transliteration'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = britannica_id
    AND locale = 'ko'
    AND title = '브리태니커 백과사전'
    AND creator = '장경식'
    AND isbn = '9788966801664';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '『브리태니커』 ko locale 수선 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET creator = 'Thomas Spencer Baynes',
      thumbnail_url = 'https://covers.openlibrary.org/b/id/11041477-L.jpg',
      isbn = '9781020033650',
      publisher = 'Creative Media Partners, LLC',
      sources = jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryKey', '/books/OL51423912M'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = britannica_id
    AND locale = 'en'
    AND title = 'Encyclopaedia Britannica'
    AND creator = 'Thomas Spencer Baynes'
    AND isbn = '9781020033650';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '『브리태니커』 en locale 수선 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.contents (
    id,
    type,
    release_date,
    external_source,
    external_id,
    metadata
  )
  VALUES
    (
      complete_masques_id,
      'BOOK',
      '1969-05-11',
      'openlibrary',
      '9780300105384',
      jsonb_build_object(
        'isbn', '9780300105384',
        'openLibraryKey', '/books/OL28430815M',
        'publisher', 'Yale University Press',
        'publishDate', '1969-05-11'
      )
    ),
    (
      aida_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-1DzOlDcp25jxdtz6Qafldl',
      jsonb_build_object(
        'entityType', 'album',
        'spotifyUrl', 'https://open.spotify.com/album/1DzOlDcp25jxdtz6Qafldl',
        'artists', jsonb_build_array('Giuseppe Verdi')
      )
    ),
    (
      green_history_id,
      'BOOK',
      '1960-07-01',
      'openlibrary',
      '9780460007276',
      jsonb_build_object(
        'isbn', '9780460007276',
        'openLibraryKey', '/books/OL7591868M',
        'publisher', 'Dutton Adult',
        'publishDate', '1960-07-01'
      )
    ),
    (
      men_at_work_id,
      'BOOK',
      '1991-01-01',
      'openlibrary',
      '9780060973728',
      jsonb_build_object(
        'isbn', '9780060973728',
        'openLibraryKey', '/books/OL18295861M',
        'publisher', 'HarperPerennial',
        'publishDate', '1991'
      )
    ),
    (
      amagi_goe_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-2vNgdLi9QiYKHOql5ivsGf',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/2vNgdLi9QiYKHOql5ivsGf',
        'artists', jsonb_build_array('Sayuri Ishikawa')
      )
    ),
    (
      jump_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-0WhIQ7V7DDO5cqv0KzZamm',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/0WhIQ7V7DDO5cqv0KzZamm',
        'artists', jsonb_build_array('Flo Rida', 'Nelly Furtado')
      )
    ),
    (
      in_the_ayer_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-7l3aCYB41adDUhuIJmGdun',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/7l3aCYB41adDUhuIJmGdun',
        'artists', jsonb_build_array('Flo Rida', 'will.i.am')
      )
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '4차 contents 생성 행 수가 7이 아닙니다. 실제=%', affected;
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
      complete_masques_id,
      'ko',
      '벤 존슨 가면극 전집',
      '벤 존슨·스티븐 오겔',
      'https://yale-press-us.imgix.net/covers/9780300105384.jpg?auto=format&w=1500',
      '9780300105384',
      'Yale University Press',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'yalebooks',
        'openLibraryKey', '/books/OL28430815M',
        'titlePolicy', 'ko_translation'
      ),
      true
    ),
    (
      complete_masques_id,
      'en',
      'Ben Jonson: The Complete Masques',
      'Ben Jonson · Stephen Orgel',
      'https://yale-press-us.imgix.net/covers/9780300105384.jpg?auto=format&w=1500',
      '9780300105384',
      'Yale University Press',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'yalebooks',
        'openLibraryKey', '/books/OL28430815M'
      ),
      true
    ),
    (
      aida_id,
      'ko',
      '베르디: 아이다',
      '주세페 베르디',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02997641f1942fbcca21017423',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      aida_id,
      'en',
      'Verdi: Aida',
      'Giuseppe Verdi',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02997641f1942fbcca21017423',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      green_history_id,
      'ko',
      '영국민의 짧은 역사',
      '존 리처드 그린',
      'https://covers.openlibrary.org/b/id/8345229-L.jpg',
      '9780460007276',
      'Dutton Adult',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryKey', '/books/OL7591868M',
        'titlePolicy', 'ko_translation'
      ),
      true
    ),
    (
      green_history_id,
      'en',
      'A Short History of the English People',
      'J. R. Green',
      'https://covers.openlibrary.org/b/id/8345229-L.jpg',
      '9780460007276',
      'Dutton Adult',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryKey', '/books/OL7591868M'
      ),
      true
    ),
    (
      men_at_work_id,
      'ko',
      '맨 앳 워크: 야구의 장인정신',
      '조지 F. 윌',
      'https://covers.openlibrary.org/b/id/12957089-L.jpg',
      '9780060973728',
      'HarperPerennial',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryKey', '/books/OL18295861M',
        'titlePolicy', 'ko_translation'
      ),
      true
    ),
    (
      men_at_work_id,
      'en',
      'Men at Work: The Craft of Baseball',
      'George F. Will',
      'https://covers.openlibrary.org/b/id/12957089-L.jpg',
      '9780060973728',
      'HarperPerennial',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryKey', '/books/OL18295861M'
      ),
      true
    ),
    (
      amagi_goe_id,
      'ko',
      '아마기고에(天城越え)',
      '이시카와 사유리',
      'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0212aff4eec0ee08ce18da25ba',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      amagi_goe_id,
      'en',
      'Amagi-goe',
      'Sayuri Ishikawa',
      'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0212aff4eec0ee08ce18da25ba',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      jump_id,
      'ko',
      'Jump (feat. Nelly Furtado)',
      '플로 라이다 feat. 넬리 퍼타도',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e027eb51e495a5d31e24e0847cf',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      jump_id,
      'en',
      'Jump (feat. Nelly Furtado)',
      'Flo Rida feat. Nelly Furtado',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e027eb51e495a5d31e24e0847cf',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      in_the_ayer_id,
      'ko',
      'In the Ayer (feat. will.i.am)',
      '플로 라이다 feat. 윌아이엠',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0249ebebcf0bd7042e5ef931be',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      in_the_ayer_id,
      'en',
      'In the Ayer (feat. will.i.am)',
      'Flo Rida feat. will.i.am',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0249ebebcf0bd7042e5ef931be',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 14 THEN
    RAISE EXCEPTION '4차 content_locales 생성 행 수가 14가 아닙니다. 실제=%', affected;
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
      '60b59a7f-94de-4eb7-9264-52d6712d363b'::uuid,
      complete_masques_id,
      'FINISHED',
      '버지니아 백과사전의 연표는 포카혼타스가 1617년 1월 6일 화이트홀에서 벤 존슨의 가면극 「환희의 비전」을 관람했다고 기록한다. 당대 존 체임벌린의 편지에도 포카혼타스와 동행인이 공연에서 눈에 띄는 자리에 앉았다는 내용이 남아 있다. DB에는 「환희의 비전」을 수록한 예일대학교 출판부의 가면극 전집을 가장 가까운 적격 판본으로 연결했다. 공연을 보며 어떤 감정을 느꼈는지는 자료에 없어 추정하지 않는다.',
      'Encyclopedia Virginia records that Pocahontas attended Ben Jonson''s masque *The Vision of Delight* at Whitehall on January 6, 1617. A contemporary letter by John Chamberlain also notes that Pocahontas and her companion were prominently seated at the performance. The database uses Yale University Press''s complete collection of Jonson''s masques as the nearest eligible edition containing the work. The sources do not record her reaction, so none is inferred.',
      'https://encyclopediavirginia.org/entries/pocahontas-d-1617/',
      false
    ),
    (
      '2ffe22f7-9a30-4f76-a4a5-1e0e592ae6f4'::uuid,
      metaphysics_id,
      'FINISHED',
      '스탠퍼드 철학백과의 그리스어-아랍어 번역사 항목은 아리스토텔레스 『형이상학』의 가장 이른 아랍어 번역이 알 킨디를 위해 만들어졌고 그 번역이 현존한다고 설명한다. 알 킨디는 이 번역가 집단을 이끌었으며, 자신의 『제1철학에 관하여』에서도 아리스토텔레스의 형이상학을 비판적으로 받아들였다. 단순한 후대 영향이 아니라 그를 위해 마련된 텍스트를 직접 검토하고 자기 철학에 사용한 사례라 등록한다.',
      'The Stanford Encyclopedia of Philosophy''s account of Greek-to-Arabic translation states that the earliest Arabic translation of Aristotle''s *Metaphysics* was made for al-Kindi and survives. Al-Kindi led the translation circle and engaged critically with Aristotelian metaphysics in his own *On First Philosophy*. This is not a later inference of influence: the text was prepared for him and used within his philosophical work.',
      'https://plato.stanford.edu/entries/arabic-islamic-greek/',
      false
    ),
    (
      'b713216d-d931-47e1-819b-051bf8f92773'::uuid,
      aida_id,
      'FINISHED',
      '이탈리아 인명사전의 푸치니 항목은 그가 1876년 피사에서 베르디의 오페라 「아이다」를 보았다고 기록한다. 이어 밀라노 유학에서 여러 극장의 오페라를 관람한 경험이 작곡 기술 자체보다 중요했고, 관객의 자리에서 오페라가 무엇인지 배웠다고 설명한다. DB에는 작품 식별을 위해 스포티파이의 베르디 「아이다」 음반을 연결했으며, 푸치니가 이 특정 녹음을 들었다는 뜻은 아니다.',
      'The *Dizionario Biografico degli Italiani* records that Puccini saw Verdi''s *Aida* in Pisa in 1876. It adds that his later experience attending opera in Milan mattered more than technical drills alone and taught him what opera was from a spectator''s seat. The Spotify album is linked only as a modern identifier for Verdi''s work; it does not imply that Puccini heard this particular recording.',
      'https://www.treccani.it/enciclopedia/giacomo-puccini_%28Dizionario-Biografico%29/',
      false
    ),
    (
      'e4f57a9e-a5c5-4303-b26d-390a10397c15'::uuid,
      green_history_id,
      'FINISHED',
      '라마크리슈나·비베카난다 전기의 유년기 항목은 나렌드라나트가 대학에서 서양 철학과 유럽사를 공부했고, J. R. 그린의 『영국민의 역사』를 사흘 만에 소화했다고 기록한다. 기존 감상여정의 ‘하룻밤’은 이 자료와 달라 사흘로 바로잡았다. DB에는 같은 저작의 OpenLibrary 적격 판본인 『A Short History of the English People』을 연결한다.',
      'The early-years chapter of the Ramakrishna-Vivekananda biography states that Narendranath studied Western philosophy and European history in college and assimilated J. R. Green''s *History of the English People* in three days. The previous claim that he finished it in one night conflicts with this source and has been corrected. The database links an eligible Open Library edition of the same work, *A Short History of the English People*.',
      'https://www.ramakrishnavivekananda.info/vivekananda_biography/02_early_years.htm',
      false
    ),
    (
      'e4f57a9e-a5c5-4303-b26d-390a10397c15'::uuid,
      britannica_id,
      'FINISHED',
      '제자들이 쓴 비베카난다 전기는 그가 새로 나온 『브리태니커 백과사전』 25권을 읽기 시작해 열 권을 마치고 열한 번째 권을 읽고 있었다고 기록한다. 제자가 이미 읽은 열 권에서 어려운 질문을 골라 던지자 비베카난다는 내용을 답하고 여러 대목을 거의 그대로 인용했다. 열두 권을 모두 읽었다는 기존 설명은 자료와 달라 삭제했다.',
      'A biography written by Vivekananda''s Eastern and Western disciples says that he began reading a newly published twenty-five-volume *Encyclopaedia Britannica*, finished ten volumes, and was reading the eleventh. When a disciple questioned him from the ten completed volumes, Vivekananda answered and reproduced passages with striking accuracy. The previous claim that he had completed twelve volumes is not supported and has been removed.',
      'https://www.ramakrishnavivekananda.info/swamieastwest/2_files/1-39.html',
      false
    ),
    (
      'ef589d79-4ae5-4fee-bdba-baf76130189c'::uuid,
      men_at_work_id,
      'FINISHED',
      '문예춘추의 일본어판 소개는 이치로가 메이저리그에 도전하기 전 조지 F. 윌의 『Men at Work』를 “언젠가 반드시 도움이 될 야구서”라고 평가했다고 밝힌다. 책은 감독·투수·타자·수비수의 작업 방식을 취재해 야구의 기술을 분석한다. 감명받았다는 과장된 표현 대신, 이치로가 실제로 남긴 실용적 평가만 기록한다.',
      'The publisher''s page for the Japanese edition states that, before moving to Major League Baseball, Ichiro described George F. Will''s *Men at Work* as a baseball book that would certainly prove useful someday. The book examines the craft of managers, pitchers, hitters, and fielders. This entry keeps Ichiro''s documented practical assessment rather than the stronger, unsupported claim that he was emotionally moved by it.',
      'https://books.bunshun.jp/ud/book/num/9784167651121',
      false
    ),
    (
      'ef589d79-4ae5-4fee-bdba-baf76130189c'::uuid,
      amagi_goe_id,
      'FINISHED',
      '스포츠나비는 이치로가 2007년 홍백가합전에서 이시카와 사유리의 무대를 본 뒤 직접 공연 표를 사서 콘서트에 갔다고 전한다. 그는 공연 뒤 「천성월」을 타석 등장곡으로 쓰고 싶다고 요청했고, 2008년 두 번째 타석에 이 곡을 사용했다. 방송과 공연을 거쳐 직접 선택한 경위가 확인되므로 등록한다.',
      'Sports Navi reports that after seeing Sayuri Ishikawa perform on the 2007 *Kōhaku Uta Gassen*, Ichiro bought a concert ticket and attended her show. He then asked to use “Amagi-goe” as walk-up music and used it for his second plate appearance in 2008. The sequence from viewing the broadcast and concert to personally selecting the song is directly documented.',
      'https://sports.yahoo.co.jp/column/detail/200808120007-spnavi',
      false
    ),
    (
      'ef589d79-4ae5-4fee-bdba-baf76130189c'::uuid,
      jump_id,
      'FINISHED',
      'BARKS는 이치로가 2009년 세 번째 타석의 등장곡으로 플로 라이다의 「Jump」를 사용했다고 보도했다. 플로 라이다가 이 사실을 듣고 이치로를 위한 특별 버전을 제안해 따로 녹음했지만, 제작을 먼저 요청한 사람은 이치로가 아니었다. 기존 감상여정의 ‘본인 버전으로 새로 녹음하게 했다’는 설명은 이 순서를 뒤집은 것이어서 바로잡았다.',
      'BARKS reported that Ichiro used Flo Rida''s “Jump” for his third plate appearance in 2009. After learning this, Flo Rida proposed and recorded a special version for Ichiro; Ichiro did not commission it. The former claim that Ichiro had the artist make a personal version reversed the documented sequence and has been corrected.',
      'https://barks.jp/news/622429/',
      false
    ),
    (
      'ef589d79-4ae5-4fee-bdba-baf76130189c'::uuid,
      in_the_ayer_id,
      'FINISHED',
      '같은 BARKS 보도는 이치로가 2009년 첫 타석의 등장곡으로 플로 라이다와 윌아이엠의 「In the Ayer」를 사용했다고 기록한다. 한 시즌에 플로 라이다의 곡 두 개를 타석 순서에 맞춰 골라 쓴 사실이 확인된다. 곡에 대한 별도 감상평은 남아 있지 않아 등장곡 선택 이상의 의미는 덧붙이지 않는다.',
      'The same BARKS report states that Ichiro used Flo Rida and will.i.am''s “In the Ayer” for his first plate appearance in 2009. It documents his use of two Flo Rida tracks for different trips to the plate during the season. No separate commentary from Ichiro about the song is preserved, so the entry does not infer meaning beyond his walk-up selection.',
      'https://barks.jp/news/622429/',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 9 THEN
    RAISE EXCEPTION '4차 user_contents 생성 행 수가 9가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id IN (
    '60b59a7f-94de-4eb7-9264-52d6712d363b'::uuid,
    '2ffe22f7-9a30-4f76-a4a5-1e0e592ae6f4'::uuid,
    'b713216d-d931-47e1-819b-051bf8f92773'::uuid,
    'e4f57a9e-a5c5-4303-b26d-390a10397c15'::uuid,
    'ef589d79-4ae5-4fee-bdba-baf76130189c'::uuid
  )
    AND profile_type = 'CELEB'
    AND status = 'active'
    AND celeb_tier = 'light'
    AND content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '4차 full 승격 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  -- user_count를 실제 연결 수와 다시 맞춘다.
  UPDATE public.contents c
  SET user_count = counts.actual_count
  FROM (
    SELECT touched.id, count(uc.content_id)::integer AS actual_count
    FROM (
      VALUES
        (complete_masques_id),
        (aida_id),
        (green_history_id),
        (men_at_work_id),
        (amagi_goe_id),
        (jump_id),
        (in_the_ayer_id),
        (metaphysics_id),
        (britannica_id)
    ) AS touched(id)
    LEFT JOIN public.user_contents uc
      ON uc.content_id = touched.id
    GROUP BY touched.id
  ) counts
  WHERE c.id = counts.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 9 THEN
    RAISE EXCEPTION '4차 touched contents user_count 동기화 행 수가 9가 아닙니다. 실제=%', affected;
  END IF;

  -- 인물별 실제 콘텐츠 수와 승격 결과를 고정한다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('pocahontas', 1),
      ('al-kindi', 1),
      ('giacomo-puccini', 1),
      ('vivekananda', 2),
      ('ichiro-suzuki', 4)
  ) AS expected(slug, expected_count)
  JOIN public.profiles p
    ON p.slug = expected.slug
  WHERE p.celeb_tier IS DISTINCT FROM 'full'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR (
       SELECT count(*)
       FROM public.user_contents uc
       WHERE uc.user_id = p.id
     ) <> expected.expected_count;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '4차 인물별 콘텐츠 수/승격 검증 실패 인물=%', wrong_count;
  END IF;

  -- 새 콘텐츠와 수선 콘텐츠 모두 ko/en locale, 썸네일, 검증 표시를 가져야 한다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      (complete_masques_id),
      (aida_id),
      (green_history_id),
      (men_at_work_id),
      (amagi_goe_id),
      (jump_id),
      (in_the_ayer_id),
      (metaphysics_id),
      (britannica_id)
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
    RAISE EXCEPTION '4차 touched contents locale/thumbnail/verified 검증 실패 콘텐츠=%', wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id IN (
      '60b59a7f-94de-4eb7-9264-52d6712d363b'::uuid,
      '2ffe22f7-9a30-4f76-a4a5-1e0e592ae6f4'::uuid,
      'b713216d-d931-47e1-819b-051bf8f92773'::uuid,
      'e4f57a9e-a5c5-4303-b26d-390a10397c15'::uuid,
      'ef589d79-4ae5-4fee-bdba-baf76130189c'::uuid
    )
      AND (
        NULLIF(btrim(uc.review), '') IS NULL
        OR NULLIF(btrim(uc.review_en), '') IS NULL
        OR NULLIF(btrim(uc.source_url), '') IS NULL
      )
  ) THEN
    RAISE EXCEPTION '4차 user_contents에 review/review_en/source_url 누락이 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id IN (
      complete_masques_id,
      aida_id,
      green_history_id,
      men_at_work_id,
      amagi_goe_id,
      jump_id,
      in_the_ayer_id,
      metaphysics_id,
      britannica_id
    )
      AND c.user_count IS DISTINCT FROM (
        SELECT count(*)::integer
        FROM public.user_contents uc
        WHERE uc.content_id = c.id
      )
  ) THEN
    RAISE EXCEPTION '4차 touched contents의 저장 user_count와 실제 연결 수가 다릅니다.';
  END IF;
END;
$$;

COMMIT;
