-- 활성 + 감상여정 비정형 작품명 추출군 41~60번의 근거·메타데이터·승격분을 반영한다.
--
-- 조사 결과:
--   - 테오도시우스 2세: 소크라테스 스콜라스티코스의 『교회사』가 성경 암기와 토론을 기록한다.
--   - 테르툴리아누스: 본인의 『영혼론』이 플라톤의 『파이돈』을 직접 지목하고 논박한다.
--   - 량원펑: 2021년 중국어판 『시장을 풀어낸 수학자』 추천 서문과 후속 답변이 확인된다.
--   - 니콜로 파가니니: 동시대 음악학자 페티스의 전기가 로카텔리의 작품을 접한 일을 명시한다.
--   - 나머지 16명은 저자·장르·경전군·후원 활동만 확인되거나 후대 추정뿐이라 콘텐츠를 만들지 않는다.
--
-- 메타데이터 정비:
--   - 기존 『파이돈』은 KO ISBN이 실제로는 네 대화편 합본이었고 EN 판본 메타도 서로 맞지 않았다.
--     아카넷 2020년 단행본과 Routledge 2000년 판본으로 교정한다.
--   - 『시장을 풀어낸 수학자』는 Naver BOOK KO 판본과 OpenLibrary EN 판본으로 신규 등록한다.
--   - 『바이올린 예술』은 Spotify의 60트랙 완전 음반과 Hyperion 트랙리스트를 대조해 신규 등록한다.
--
-- 이 파일은 20260729_correct_active_extract_batch_03_journeys.sql보다 먼저 실행한다.

BEGIN;

DO $$
DECLARE
  bible_id text := '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0';
  phaedo_id text := '76043dee-c9e2-4380-b0a4-ebbfcdbdddbe';
  market_id text := '22cacbc6-6246-4cae-af97-a284f4b4edaa';
  locatelli_id text := '6ba641a3-5cbd-4e98-a249-bb187b42a9b0';

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

  -- 큐 41~60번 전원의 본문·상태·0건 기준선을 고정한다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('74e8abc4-8d3b-4076-a8ee-30b87cdbfb98'::uuid, '7b50ec0177af0edbc16abaa2549e3944', 'f44d1b05fc29586941c9a6e0f16929ff'),
      ('50dbda6b-4151-4af0-9a14-f48fa451c593'::uuid, '7cfc7265b3959303861c907d3cf9727d', 'f9c377d3f5c5f2ab9d8c6fc4693e2e7d'),
      ('9ca52951-66f7-464d-8c83-7214f654542e'::uuid, '53913812e8298ff558ca49ce872fadf4', 'dc9a67b2cd55f03be3fd5eaabade73a3'),
      ('9b03742a-c69e-465f-a665-b473adb378dd'::uuid, 'd5b76a7d6d934d675a66bd88b2712c3e', '8f4edf8995d932f33d3124ed847367be'),
      ('0be8a183-a400-4cd9-b2a9-27487129e0bf'::uuid, 'cb902deea4ee119b7724f149306cd5bd', '2e94df1ba10c2f12babbc3de09d9a37d'),
      ('6f929bc6-4d67-4264-b02e-f1768149ed0a'::uuid, 'e450300e57dab5cb6e56e7e9445a2a4c', '0f77bdcbeb25c3c52b30b3b627d66de7'),
      ('2842f784-62df-41e9-952e-03c568014939'::uuid, '4223bf54131172af60526a910f814df0', '8d0e00e7f8c837914aab776112e95d96'),
      ('a17ef655-e744-4ebe-a904-f7b8757c2248'::uuid, '73ec15c83cbf0facbbf500082a8249df', '5099f3453ec66d5f6666a3e9bb23361c'),
      ('7298ae3c-f94f-4e92-9f63-17dddddce54d'::uuid, '86a9715a4cece2fdb538d2571e20bbba', '9056d0782da260d79953b0a80246646a'),
      ('617005a2-9292-4d77-af6f-30b0862203d9'::uuid, '2b1ba4fd7ddee2cc715a013a170c46ee', '200be5ecffc36f4c44150382b77bb4ff'),
      ('3a6d4622-92da-45aa-816e-f0a8dfea76fd'::uuid, '509c7a8bf735827d35984171ec48b2e8', 'd1881d4357b03f84e1818d890cfe41a7'),
      ('edc2e751-e7e2-4512-a4eb-f7e9fa8e7609'::uuid, 'a5f8ca89100e821159a7a7998a5fd8d5', '39ec98fa7f53d9655717e4f0d2a6f30b'),
      ('ae49f9f5-fd22-4cc0-902b-30db9edcc87c'::uuid, '3b7315fac863e21f2c13edb66b6e80e4', '341fd24c01e7e00e135f41d0dbed5514'),
      ('ce490d6d-2137-40e8-905d-922af04753c4'::uuid, '64002d7a566b7062794f699779c3c82e', '678e1d12d1d5708391b967a99b405e84'),
      ('eb0aa2b6-89e2-484c-8648-4e7c71141ea0'::uuid, '397f8e0772bd22d811effbded61ddc24', 'ec142143abb47f7796dc8b03a39148f0'),
      ('5bcfbbf7-8c6e-4491-9b41-ffc85239b205'::uuid, 'aea6f6eaa76de225e62ed5d20d80fbe8', 'caa567046a4028d10741d3393475219d'),
      ('bd34ae9d-da6b-4896-942b-2b455bc05805'::uuid, 'e69916c7c39291bc717883c6c4eab313', '32213499ccbef5a83a7927c95cf98cb5'),
      ('751c1b6b-06c7-4153-8453-cf13d2700c6d'::uuid, 'de307c027444a658efe7befd5ec32a39', 'b8907a36c219b531af887711c525dd1b'),
      ('8ec52192-4f45-4748-82cf-1a5b07fe59e7'::uuid, '6495e8e6a73597f2505e047b243460f0', '62d8836b484b60516c48428a70f3944d'),
      ('baaff2e6-0e31-49e2-9efe-27b3200d5cfd'::uuid, 'c5a7f7630323c8c65d47091ef71dca62', '4b786ff3138adf67a0fee5e2f863896d')
  ) AS expected(id, ko_md5, en_md5)
  LEFT JOIN public.profiles p ON p.id = expected.id
  WHERE p.id IS NULL
     OR p.profile_type IS DISTINCT FROM 'CELEB'
     OR p.status IS DISTINCT FROM 'active'
     OR p.celeb_tier IS DISTINCT FROM 'light'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR md5(p.cultural_journey) IS DISTINCT FROM expected.ko_md5
     OR md5(p.cultural_journey_en) IS DISTINCT FROM expected.en_md5
     OR EXISTS (
       SELECT 1
       FROM public.user_contents uc
       WHERE uc.user_id = expected.id
     );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '비정형 3차 20명의 본문·상태·0건 기준선이 달라졌습니다. 차이=%',
      wrong_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = bible_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788936023997'
      AND c.user_count = 34
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 34
      AND ko.title = '성경전서'
      AND ko.isbn = '9788936023997'
      AND en.title = 'NIV Giant Print Reference Bible'
      AND en.isbn = '9780310908173'
  ) THEN
    RAISE EXCEPTION '성경 콘텐츠의 식별자·locale·누적값 기준선이 달라졌습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = phaedo_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788930606202'
      AND c.release_date IS NULL
      AND c.metadata = '{}'::jsonb
      AND c.user_count = 3
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 3
      AND ko.title = '파이돈'
      AND ko.creator = '플라톤'
      AND ko.isbn = '9788930606202'
      AND ko.publisher IS NULL
      AND en.title = 'Phaedo'
      AND en.creator = 'Plato'
      AND en.isbn = '9780766182097'
      AND en.publisher = 'P F Collier & Son Company'
  ) THEN
    RAISE EXCEPTION '파이돈 콘텐츠의 기존 식별자·locale·누적값 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id IN (market_id, locatelli_id)
       OR c.external_id IN (
         '9788957336762',
         '9791135498961',
         'spotify-73przViFtkh6LjaS1AZu60'
       )
  ) OR EXISTS (
    SELECT 1
    FROM public.content_locales cl
    WHERE cl.isbn IN (
      '9788957336762',
      '9780415225168',
      '9791135498961',
      '9780735217980'
    )
  ) THEN
    RAISE EXCEPTION '비정형 3차 교정·신규 외부 ID 또는 ISBN이 이미 존재합니다.';
  END IF;

  UPDATE public.contents
  SET release_date = '2020-05-29',
      external_id = '9788957336762',
      metadata = jsonb_build_object(
        'isbn', '9788957336762',
        'link', 'https://search.shopping.naver.com/book/catalog/32491397689',
        'publisher', '아카넷',
        'publishDate', '2020-05-29',
        'legacyExternalId', '9788930606202'
      )
  WHERE id = phaedo_id
    AND external_source = 'naver_book'
    AND external_id = '9788930606202'
    AND release_date IS NULL
    AND metadata = '{}'::jsonb;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '파이돈 contents 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET title = '파이돈',
      creator = '플라톤',
      thumbnail_url = 'https://shopping-phinf.pstatic.net/main_3249139/32491397689.20260331105804.jpg',
      isbn = '9788957336762',
      publisher = '아카넷',
      sources = jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'titlePolicy', 'edition_match'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = phaedo_id
    AND locale = 'ko'
    AND title = '파이돈'
    AND creator = '플라톤'
    AND isbn = '9788930606202'
    AND publisher IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '파이돈 ko locale 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET title = 'Plato''s Phaedo',
      creator = 'Plato · R. S. Bluck',
      thumbnail_url = 'https://covers.openlibrary.org/b/id/1210769-L.jpg',
      isbn = '9780415225168',
      publisher = 'Routledge',
      sources = jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryEdition', '/books/OL7487292M',
        'openLibraryWork', '/works/OL8096280W',
        'titlePolicy', 'edition_match'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = phaedo_id
    AND locale = 'en'
    AND title = 'Phaedo'
    AND creator = 'Plato'
    AND isbn = '9780766182097'
    AND publisher = 'P F Collier & Son Company';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '파이돈 en locale 교정 행 수가 1이 아닙니다. 실제=%', affected;
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
      market_id,
      'BOOK',
      '2021-05-12',
      'naver_book',
      '9791135498961',
      jsonb_build_object(
        'isbn', '9791135498961',
        'link', 'https://search.shopping.naver.com/book/catalog/32486529015',
        'publisher', '로크미디어',
        'publishDate', '2021-05-12'
      ),
      0
    ),
    (
      locatelli_id,
      'MUSIC',
      '1994',
      'spotify',
      'spotify-73przViFtkh6LjaS1AZu60',
      jsonb_build_object(
        'entityType', 'album',
        'albumType', 'album',
        'releaseDate', '1994',
        'totalTracks', 60,
        'label', 'Hyperion Records',
        'spotifyUrl', 'https://open.spotify.com/album/73przViFtkh6LjaS1AZu60',
        'artists', jsonb_build_array(
          'Pietro Locatelli',
          'Elizabeth Wallfisch',
          'Raglan Baroque Players',
          'Nicholas Kraemer'
        )
      ),
      0
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '비정형 3차 신규 contents 생성 행 수가 2가 아닙니다. 실제=%', affected;
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
      market_id,
      'ko',
      '시장을 풀어낸 수학자',
      '그레고리 주커만',
      'https://shopping-phinf.pstatic.net/main_3248652/32486529015.20250805071133.jpg',
      '9791135498961',
      '로크미디어',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'titlePolicy', 'edition_match'
      ),
      true
    ),
    (
      market_id,
      'en',
      'The Man Who Solved the Market',
      'Gregory Zuckerman',
      'https://covers.openlibrary.org/b/id/9189451-L.jpg',
      '9780735217980',
      'Portfolio/Penguin',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryEdition', '/books/OL27784852M',
        'openLibraryWork', '/works/OL20542025W',
        'titlePolicy', 'edition_match'
      ),
      true
    ),
    (
      locatelli_id,
      'ko',
      '로카텔리: 바이올린 예술 — 12개의 협주곡, 작품 3',
      '피에트로 로카텔리 · 엘리자베스 월피시 · 래글런 바로크 플레이어스 · 니컬러스 크레이머',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02a5ac124045ca763b91c3b2d6',
      NULL,
      'Hyperion Records',
      jsonb_build_object(
        'primary', 'spotify',
        'thumbnail', 'spotify_oembed',
        'tracklist', 'hyperion_booklet',
        'titlePolicy', 'ko_translation'
      ),
      true
    ),
    (
      locatelli_id,
      'en',
      'Locatelli: L''Arte del Violino – 12 Concertos, Op. 3',
      'Pietro Locatelli · Elizabeth Wallfisch · Raglan Baroque Players · Nicholas Kraemer',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02a5ac124045ca763b91c3b2d6',
      NULL,
      'Hyperion Records',
      jsonb_build_object(
        'primary', 'spotify',
        'thumbnail', 'spotify_oembed',
        'tracklist', 'hyperion_booklet',
        'titlePolicy', 'edition_match'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '비정형 3차 신규 locale 생성 행 수가 4가 아닙니다. 실제=%', affected;
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
      '50dbda6b-4151-4af0-9a14-f48fa451c593'::uuid,
      bible_id,
      'FINISHED',
      $ko$소크라테스 스콜라스티코스의 『교회사』 7권은 테오도시우스 2세가 이른 아침부터 성경을 읽고 그 내용을 외웠으며, 주교들과 성경을 놓고 논의했다고 기록한다. 특정 구절을 빌린 정도가 아니라 지속적인 읽기와 암기가 명시되어 있어 기존 성경 콘텐츠를 연결했다. DB의 현대 판본은 작품군 식별자이며 황제가 사용한 역사적 사본과 같다는 뜻은 아니다.$ko$,
      $en$Book VII of Socrates Scholasticus's *Ecclesiastical History* records that Theodosius II studied Scripture early in the morning, learned it by heart, and discussed it with bishops. This is sustained reading and memorization rather than a stray quotation, so the existing Bible content is linked. The modern database editions identify the work group and are not claimed to be the emperor's historical manuscripts.$en$,
      'https://www.newadvent.org/fathers/26017.htm',
      false
    ),
    (
      '6f929bc6-4d67-4264-b02e-f1768149ed0a'::uuid,
      phaedo_id,
      'FINISHED',
      $ko$테르툴리아누스의 『영혼론』은 플라톤의 『파이돈』을 작품명으로 직접 지목하고 그 안의 영혼론을 요약한 뒤 기독교 교리의 관점에서 반박한다. 저자나 학파에 대한 막연한 영향 추정이 아니라 특정 대화편을 읽고 논증에 사용한 흔적이므로 『파이돈』을 연결했다. DB에는 식별 가능한 현대 판본을 사용했다.$ko$,
      $en$In *A Treatise on the Soul*, Tertullian explicitly names Plato's *Phaedo*, summarizes its account of the soul, and argues against it from a Christian position. This is direct engagement with an identifiable dialogue rather than a general inference from Platonism, so *Phaedo* is linked through a modern identifiable edition.$en$,
      'https://www.newadvent.org/fathers/0310.htm',
      false
    ),
    (
      'ae49f9f5-fd22-4cc0-902b-30db9edcc87c'::uuid,
      market_id,
      'FINISHED',
      $ko$량원펑은 2021년 중국어판 『시장을 풀어낸 수학자』에 추천 서문을 썼다. 이후 공개된 답변에서도 일이 어려울 때 짐 사이먼스가 가격을 모델링할 방법이 반드시 있다고 믿었다는 대목을 떠올린다고 설명했다. 단순 추천 명단이 아니라 직접 읽고 자신의 문제 해결 태도와 연결한 기록이므로 등록했다.$ko$,
      $en$Liang Wenfeng wrote the recommendation preface for the 2021 Chinese edition of Gregory Zuckerman's *The Man Who Solved the Market*. In a later published response, he explained that when work becomes difficult he recalls Jim Simons's conviction that prices must be modelable. The preface and his own application of the book establish direct engagement, so the work is linked.$en$,
      'https://finance.sina.com.cn/search/2025-01-29/doc-inehwmew1443742.shtml',
      false
    ),
    (
      'bd34ae9d-da6b-4896-942b-2b455bc05805'::uuid,
      locatelli_id,
      'FINISHED',
      $ko$파가니니와 동시대를 살았던 음악학자 프랑수아조제프 페티스의 전기는 로카텔리의 아홉 번째 작품이 우연히 파가니니의 눈에 들어왔고, 그가 거기서 난도가 너무 높아 인정받지 못했던 새로운 아이디어와 기법의 세계를 보았다고 기록한다. 후대 연구는 영향의 세부를 두고 논쟁하지만, 특정 작품을 접했다는 명시적 전기 기록이 있어 로카텔리의 『바이올린 예술』을 연결했다. DB의 1994년 완전 녹음은 작품군 식별자다.$ko$,
      $en$François-Joseph Fétis, a contemporary musicologist who wrote an early biography of Paganini, states that chance brought Locatelli's ninth work to Paganini's notice and that he saw in it a new world of ideas and devices whose difficulty had denied them recognition. Later scholarship debates the precise line of influence, but this explicit biographical account supports linking Locatelli's *L'Arte del Violino*. The 1994 complete recording in the database identifies the work and is not a historical recording heard by Paganini.$en$,
      'https://www.gutenberg.org/files/58184/58184-h/58184-h.htm',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '비정형 3차 user_contents 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id IN (
    '50dbda6b-4151-4af0-9a14-f48fa451c593'::uuid,
    '6f929bc6-4d67-4264-b02e-f1768149ed0a'::uuid,
    'ae49f9f5-fd22-4cc0-902b-30db9edcc87c'::uuid,
    'bd34ae9d-da6b-4896-942b-2b455bc05805'::uuid
  )
    AND profile_type = 'CELEB'
    AND status = 'active'
    AND celeb_tier = 'light'
    AND content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '비정형 3차 full 승격 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = counts.actual_count
  FROM (
    SELECT touched.id, count(uc.content_id)::integer AS actual_count
    FROM (
      VALUES
        (bible_id),
        (phaedo_id),
        (market_id),
        (locatelli_id)
    ) AS touched(id)
    LEFT JOIN public.user_contents uc ON uc.content_id = touched.id
    GROUP BY touched.id
  ) counts
  WHERE c.id = counts.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '비정형 3차 user_count 동기화 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('50dbda6b-4151-4af0-9a14-f48fa451c593'::uuid, 1),
      ('6f929bc6-4d67-4264-b02e-f1768149ed0a'::uuid, 1),
      ('ae49f9f5-fd22-4cc0-902b-30db9edcc87c'::uuid, 1),
      ('bd34ae9d-da6b-4896-942b-2b455bc05805'::uuid, 1)
  ) AS expected(id, expected_count)
  JOIN public.profiles p ON p.id = expected.id
  WHERE p.celeb_tier IS DISTINCT FROM 'full'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR (
       SELECT count(*)
       FROM public.user_contents uc
       WHERE uc.user_id = p.id
     ) <> expected.expected_count;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '비정형 3차 통과자 콘텐츠 수·승격 검증 실패 인물=%', wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      (bible_id, 35),
      (phaedo_id, 4),
      (market_id, 1),
      (locatelli_id, 1)
  ) AS expected(id, actual_count)
  JOIN public.contents c ON c.id = expected.id
  WHERE c.user_count IS DISTINCT FROM expected.actual_count
     OR (
       SELECT count(*)::integer
       FROM public.user_contents uc
       WHERE uc.content_id = c.id
     ) <> expected.actual_count;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '비정형 3차 콘텐츠 누적값 검증 실패 콘텐츠=%', wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES (bible_id), (phaedo_id), (market_id), (locatelli_id)
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
    RAISE EXCEPTION '비정형 3차 locale/thumbnail/verified 검증 실패 콘텐츠=%', wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id IN (
      '50dbda6b-4151-4af0-9a14-f48fa451c593'::uuid,
      '6f929bc6-4d67-4264-b02e-f1768149ed0a'::uuid,
      'ae49f9f5-fd22-4cc0-902b-30db9edcc87c'::uuid,
      'bd34ae9d-da6b-4896-942b-2b455bc05805'::uuid
    )
      AND (
        uc.status IS DISTINCT FROM 'FINISHED'
        OR NULLIF(btrim(uc.review), '') IS NULL
        OR NULLIF(btrim(uc.review_en), '') IS NULL
        OR NULLIF(btrim(uc.source_url), '') IS NULL
      )
  ) THEN
    RAISE EXCEPTION '비정형 3차 user_contents 필수 필드 누락이 있습니다.';
  END IF;

  -- 통과하지 않은 16명은 조사를 했어도 "없음 확정" 단계가 아니므로 open/0을 유지한다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('74e8abc4-8d3b-4076-a8ee-30b87cdbfb98'::uuid),
      ('9ca52951-66f7-464d-8c83-7214f654542e'::uuid),
      ('9b03742a-c69e-465f-a665-b473adb378dd'::uuid),
      ('0be8a183-a400-4cd9-b2a9-27487129e0bf'::uuid),
      ('2842f784-62df-41e9-952e-03c568014939'::uuid),
      ('a17ef655-e744-4ebe-a904-f7b8757c2248'::uuid),
      ('7298ae3c-f94f-4e92-9f63-17dddddce54d'::uuid),
      ('617005a2-9292-4d77-af6f-30b0862203d9'::uuid),
      ('3a6d4622-92da-45aa-816e-f0a8dfea76fd'::uuid),
      ('edc2e751-e7e2-4512-a4eb-f7e9fa8e7609'::uuid),
      ('ce490d6d-2137-40e8-905d-922af04753c4'::uuid),
      ('eb0aa2b6-89e2-484c-8648-4e7c71141ea0'::uuid),
      ('5bcfbbf7-8c6e-4491-9b41-ffc85239b205'::uuid),
      ('751c1b6b-06c7-4153-8453-cf13d2700c6d'::uuid),
      ('8ec52192-4f45-4748-82cf-1a5b07fe59e7'::uuid),
      ('baaff2e6-0e31-49e2-9efe-27b3200d5cfd'::uuid)
  ) AS kept(id)
  JOIN public.profiles p ON p.id = kept.id
  WHERE p.celeb_tier IS DISTINCT FROM 'light'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR EXISTS (
       SELECT 1 FROM public.user_contents uc WHERE uc.user_id = kept.id
     );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '비정형 3차 미통과자 open/0 유지 검증 실패 인물=%', wrong_count;
  END IF;
END;
$$;

COMMIT;
