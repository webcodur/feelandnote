-- 활성 + 감상여정 명시 작품군 96~115번의 근거·판본 통과분을 원자적으로 반영한다.
--
-- 조사 결과:
--   - 20명, 추출 후보 49건 가운데 직접 관계가 확인된 후보는 9건
--   - 그중 5명 5건만 관계·판본·locale 게이트를 모두 통과
--   - 법현의 『대반열반경』·『잡아비담심론』, 류현진의 「Ryu Can Do It」,
--     혼다 소이치로의 『輪業の世界』는 직접 관계는 확인했지만
--     네이버·OpenLibrary·Spotify에서 정확한 적격 메타데이터를 확보하지 못해 보류
--   - 본인 저작, 후대의 전기·문학, 단순 비교·영향 추정은 제외
--
-- 반영:
--   - 신규 콘텐츠 4종과 ko/en locale 8행 생성
--   - 기존 성경 콘텐츠 1종 재사용 및 비어 있던 creator/publisher와 user_count 수선
--   - 법현·그레고리우스 1세·류현진·스티브 발머·빌리 홀리데이에게 5건 연결
--   - 위 5명을 light에서 full로 승격
--
-- 이 파일은 20260729_correct_active_target_batch_06_journeys.sql보다 먼저 실행한다.

BEGIN;

DO $$
DECLARE
  mahasanghika_vinaya_id text := gen_random_uuid()::text;
  korean_monster_id text := gen_random_uuid()::text;
  time_of_my_life_id text := gen_random_uuid()::text;
  west_end_blues_id text := gen_random_uuid()::text;

  bible_id text := '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0';

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
      ('f6753a3e-57bc-4ce4-bf3a-877142ca1a94'::uuid, 'faxian', '법현'),
      ('fd611565-b9a9-4176-9a74-8813127f62a1'::uuid, 'pope-gregory-i', '그레고리우스 1세'),
      ('bd04ee3a-3965-4123-b4af-9fe99d8150f5'::uuid, 'hyun-jin-ryu', '류현진'),
      ('33eb862e-c5c5-432b-82a1-906f47a9e7af'::uuid, 'steve-ballmer', '스티브 발머'),
      ('6a62be37-0d92-4cbf-93ad-72ae21f44a65'::uuid, 'billie-holiday', '빌리 홀리데이')
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
      '6차 통과자 5명의 id/slug/tier/research 기준선이 달라졌습니다. 차이=%',
      wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.user_contents
  WHERE user_id IN (
    'f6753a3e-57bc-4ce4-bf3a-877142ca1a94'::uuid,
    'fd611565-b9a9-4176-9a74-8813127f62a1'::uuid,
    'bd04ee3a-3965-4123-b4af-9fe99d8150f5'::uuid,
    '33eb862e-c5c5-432b-82a1-906f47a9e7af'::uuid,
    '6a62be37-0d92-4cbf-93ad-72ae21f44a65'::uuid
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '6차 통과자에게 이미 콘텐츠가 생겼습니다. 현재 연결 수=%',
      wrong_count;
  END IF;

  -- 재사용 성경은 현재 실DB의 판본과 조용한 누적값 불일치까지 정확히 잠근다.
  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id
     AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id
     AND en.locale = 'en'
    WHERE c.id = bible_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788936023997'
      AND c.user_count = 14
      AND (
        SELECT count(*)
        FROM public.user_contents uc
        WHERE uc.content_id = c.id
      ) = 30
      AND ko.title = '성경전서'
      AND ko.isbn = '9788936023997'
      AND NULLIF(btrim(ko.creator), '') IS NULL
      AND en.title = 'Holy Bible'
      AND en.isbn = '9780310908173'
      AND NULLIF(btrim(en.creator), '') IS NULL
  ) THEN
    RAISE EXCEPTION '재사용 성경 콘텐츠의 식별자·locale·누적값 기준선이 다릅니다.';
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.contents
  WHERE external_id IN (
    '9788984946811',
    'spotify-1MpFg85L9uRKJPAb4VxZ6a',
    'spotify-2nZYyQNNoNo07VGFmTlPxx',
    'spotify-7dOz8RrPWP9UgJ8X8p1vU7'
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '6차 신규 외부 ID가 이미 존재합니다. 중복=%', wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE isbn = '9788984946811'
  ) THEN
    RAISE EXCEPTION '마하승기율 ISBN이 이미 다른 locale에 존재합니다.';
  END IF;

  -- 성경의 두 locale을 각 판본의 실제 편집·출판 주체로 보완한다.
  UPDATE public.contents
  SET release_date = '2020-07-22',
      metadata = jsonb_build_object(
        'isbn', '9788936023997',
        'publisher', '성서원',
        'publishDate', '2020-07-22'
      )
  WHERE id = bible_id
    AND external_source = 'naver_book'
    AND external_id = '9788936023997';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '성경 contents 메타데이터 수선 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET creator = '성서원 편집부',
      publisher = '성서원',
      sources = jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = bible_id
    AND locale = 'ko'
    AND title = '성경전서'
    AND isbn = '9788936023997'
    AND NULLIF(btrim(creator), '') IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '성경 ko locale 수선 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET title = 'NIV Giant Print Reference Bible',
      creator = 'Zondervan Bible Publishers',
      publisher = 'Zondervan',
      sources = jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'titlePolicy', 'edition_match'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = bible_id
    AND locale = 'en'
    AND title = 'Holy Bible'
    AND isbn = '9780310908173'
    AND NULLIF(btrim(creator), '') IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '성경 en locale 수선 행 수가 1이 아닙니다. 실제=%', affected;
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
      mahasanghika_vinaya_id,
      'BOOK',
      '2022-05-30',
      'naver_book',
      '9788984946811',
      jsonb_build_object(
        'isbn', '9788984946811',
        'publisher', '혜안',
        'publishDate', '2022-05-30',
        'link', 'https://search.shopping.naver.com/book/catalog/32794264647'
      )
    ),
    (
      korean_monster_id,
      'MUSIC',
      '2013-06-13',
      'spotify',
      'spotify-1MpFg85L9uRKJPAb4VxZ6a',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/1MpFg85L9uRKJPAb4VxZ6a',
        'artists', jsonb_build_array('JED')
      )
    ),
    (
      time_of_my_life_id,
      'MUSIC',
      '1987-07-10',
      'spotify',
      'spotify-2nZYyQNNoNo07VGFmTlPxx',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/2nZYyQNNoNo07VGFmTlPxx',
        'artists', jsonb_build_array('Bill Medley', 'Jennifer Warnes')
      )
    ),
    (
      west_end_blues_id,
      'MUSIC',
      '1928-06-28',
      'spotify',
      'spotify-7dOz8RrPWP9UgJ8X8p1vU7',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/7dOz8RrPWP9UgJ8X8p1vU7',
        'artists', jsonb_build_array('Louis Armstrong', 'Louis Armstrong & His Hot Five')
      )
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '6차 contents 생성 행 수가 4가 아닙니다. 실제=%', affected;
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
      mahasanghika_vinaya_id,
      'ko',
      '마하승기율 (상)',
      '불타발타라·법현',
      'https://shopping-phinf.pstatic.net/main_3279426/32794264647.20260331115703.jpg',
      '9788984946811',
      '혜안',
      jsonb_build_object('primary', 'naver_book', 'thumbnail', 'naver_book'),
      true
    ),
    (
      mahasanghika_vinaya_id,
      'en',
      'Mahasanghika Vinaya (Vol. 1)',
      'Buddhabhadra · Faxian',
      'https://shopping-phinf.pstatic.net/main_3279426/32794264647.20260331115703.jpg',
      '9788984946811',
      'Hyean',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'titlePolicy', 'en_translation'
      ),
      true
    ),
    (
      korean_monster_id,
      'ko',
      'KOREAN MONSTER',
      '제드',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e024f69adc34a66991ac6f409d2',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      korean_monster_id,
      'en',
      'KOREAN MONSTER',
      'JED',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e024f69adc34a66991ac6f409d2',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      time_of_my_life_id,
      'ko',
      '(I''ve Had) The Time of My Life',
      '빌 메들리·제니퍼 원스',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02dbbc62fcf8b3313784af5482',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      time_of_my_life_id,
      'en',
      '(I''ve Had) The Time of My Life',
      'Bill Medley · Jennifer Warnes',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02dbbc62fcf8b3313784af5482',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      west_end_blues_id,
      'ko',
      'West End Blues',
      '루이 암스트롱 앤 히즈 핫 파이브',
      'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02edee2ddbcd5853a01f8ee696',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    ),
    (
      west_end_blues_id,
      'en',
      'West End Blues',
      'Louis Armstrong & His Hot Five',
      'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02edee2ddbcd5853a01f8ee696',
      NULL,
      NULL,
      jsonb_build_object('primary', 'spotify', 'thumbnail', 'spotify_oembed'),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 8 THEN
    RAISE EXCEPTION '6차 content_locales 생성 행 수가 8이 아닙니다. 실제=%', affected;
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
      'f6753a3e-57bc-4ce4-bf3a-877142ca1a94'::uuid,
      mahasanghika_vinaya_id,
      'FINISHED',
      $ko$법현은 자신의 여행기에서 불교 계율서를 구하기 위해 서역과 인도를 순례했다고 밝힌다. 귀국길의 다마리제국에서는 『마하승기율』을 비롯한 문헌을 얻어 베꼈다고 작품명을 직접 열거한다. DB에는 법현과 불타발타라의 한역을 수록한 2022년 혜안판 상권을 식별 가능한 현대 판본으로 연결했다. 이 판본 자체를 법현이 읽었다는 뜻은 아니다. 함께 확보한 『대반열반경』과 『잡아비담심론』은 정확히 대응하는 적격 ISBN 판본을 찾지 못해 보류했다.$ko$,
      $en$In his own travel record, Faxian says he journeyed in search of Buddhist books of discipline. In the kingdom of Tamralipti he explicitly lists texts he obtained and copied, including the Mahasanghika Vinaya. The database links a 2022 Korean edition containing the Chinese translation associated with Faxian and Buddhabhadra as the identifiable modern edition; it is not presented as the physical copy Faxian handled. Two other acquired texts remain unregistered because no exact eligible ISBN edition could be matched.$en$,
      'https://www.gutenberg.org/cache/epub/2124/pg2124-images.html',
      false
    ),
    (
      'fd611565-b9a9-4176-9a74-8813127f62a1'::uuid,
      bible_id,
      'FINISHED',
      $ko$교황 베네딕토 16세의 그레고리우스 1세 해설은 『욥기 주해』가 욥기의 본문을 문자적·비유적·도덕적 차원에서 검토한 방대한 주석이라고 설명한다. 이는 그레고리우스가 성경의 욥기를 직접 읽고 해석한 명확한 기록이다. DB에는 욥기를 포함하는 기존 성경 콘텐츠를 연결했으며, 현대 성경 판본이 그가 사용한 역사적 사본과 같다는 뜻은 아니다.$ko$,
      $en$Pope Benedict XVI's account of Gregory the Great describes the *Moralia in Job* as an extensive commentary examining the Book of Job at literal, allegorical, and moral levels. This is direct evidence that Gregory read and interpreted Job. The database therefore links the existing Bible content that contains the book; the modern database edition is only an identifier and is not claimed to be Gregory's historical manuscript.$en$,
      'https://www.vatican.va/content/benedict-xvi/en/audiences/2008/documents/hf_ben-xvi_aud_20080604.html',
      false
    ),
    (
      'bd04ee3a-3965-4123-b4af-9fe99d8150f5'::uuid,
      korean_monster_id,
      'FINISHED',
      $ko$류현진은 2013년 자신의 별명에서 제목을 딴 제드의 응원가 「KOREAN MONSTER」를 직접 듣고 만족감을 표했으며, 자신의 노래가 생긴 일이 특별한 경험이라고 말했다. 작품과 청취 반응이 함께 확인돼 등록한다. 정용화의 「Ryu Can Do It」도 류현진이 차에서 듣고 따라 부른다는 직접 관계가 확인됐지만, Spotify에서 원곡을 정확히 식별하지 못해 이번 등록에서는 보류했다.$ko$,
      $en$In 2013 Ryu Hyun-jin listened to JED's cheer song “KOREAN MONSTER,” titled after his nickname, and expressed satisfaction, calling the experience of having his own song special. Both the work and his response are explicit, so it is registered. Ryu also said he listened and sang along to Jung Yong-hwa's “Ryu Can Do It” in his car, but that original track could not be matched securely in Spotify and remains unregistered.$en$,
      'https://www.edaily.co.kr/News/Read?mediaCodeNo=258&newsId=01282486602841392',
      false
    ),
    (
      '33eb862e-c5c5-432b-82a1-906f47a9e7af'::uuid,
      time_of_my_life_id,
      'FINISHED',
      $ko$스티브 발머는 2013년 9월 마이크로소프트의 마지막 전 직원 회의에서 작별곡으로 「(I've Had) The Time of My Life」를 골랐다. 그는 노래에 맞춰 퇴장하며 마이크로소프트에서 인생 최고의 시간을 보냈다고 외쳤다. 작품 선택과 반응이 공개 장면으로 확인돼 등록한다. 기존 감상여정의 2014년이라는 연도는 2013년으로 교정했다.$ko$,
      $en$At his final Microsoft employee meeting in September 2013, Steve Ballmer chose “(I've Had) The Time of My Life” as his farewell song. He left the stage to it while shouting that he had had the time of his life at Microsoft. His selection and response are publicly documented, so the song is registered. The former journey's 2014 date has been corrected to 2013.$en$,
      'https://www.theguardian.com/technology/2013/sep/30/microsoft-steve-ballmer-farewell-emotional-speech',
      false
    ),
    (
      '6a62be37-0d92-4cbf-93ad-72ae21f44a65'::uuid,
      west_end_blues_id,
      'FINISHED',
      $ko$빌리 홀리데이는 자서전에서 어린 시절 루이 암스트롱의 「West End Blues」 음반을 들었던 경험과, 가사 없이 들려오는 스캣에 매료되고 때로는 눈물을 흘렸던 반응을 구체적으로 회고했다. 곡명·청취·감정이 모두 직접 기록돼 등록한다. 「Strange Fruit」는 그녀에게 소개된 시에서 출발했지만 DB에서 식별되는 음원은 본인의 공연·녹음이므로 외부 감상 콘텐츠로 중복 등록하지 않았다.$ko$,
      $en$In her autobiography Billie Holiday recalled hearing Louis Armstrong's “West End Blues” as a child, being fascinated by the wordless scat passage, and sometimes being moved to tears by the record. The title, listening act, and response are all explicit, so the recording is registered. “Strange Fruit” began with a poem introduced to her, but the database-identifiable recording is Holiday's own performance and is not duplicated as externally consumed content.$en$,
      'https://www.wrti.org/latest-jazz-from-npr-music/2000-08-06/west-end-blues',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '6차 user_contents 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id IN (
    'f6753a3e-57bc-4ce4-bf3a-877142ca1a94'::uuid,
    'fd611565-b9a9-4176-9a74-8813127f62a1'::uuid,
    'bd04ee3a-3965-4123-b4af-9fe99d8150f5'::uuid,
    '33eb862e-c5c5-432b-82a1-906f47a9e7af'::uuid,
    '6a62be37-0d92-4cbf-93ad-72ae21f44a65'::uuid
  )
    AND profile_type = 'CELEB'
    AND status = 'active'
    AND celeb_tier = 'light'
    AND content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '6차 full 승격 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  -- 저장 누적값을 새 연결 뒤 실제 user_contents 수와 맞춘다.
  UPDATE public.contents c
  SET user_count = counts.actual_count
  FROM (
    SELECT touched.id, count(uc.content_id)::integer AS actual_count
    FROM (
      VALUES
        (mahasanghika_vinaya_id),
        (bible_id),
        (korean_monster_id),
        (time_of_my_life_id),
        (west_end_blues_id)
    ) AS touched(id)
    LEFT JOIN public.user_contents uc
      ON uc.content_id = touched.id
    GROUP BY touched.id
  ) counts
  WHERE c.id = counts.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '6차 touched contents user_count 동기화 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('faxian', 1),
      ('pope-gregory-i', 1),
      ('hyun-jin-ryu', 1),
      ('steve-ballmer', 1),
      ('billie-holiday', 1)
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
    RAISE EXCEPTION '6차 인물별 콘텐츠 수/승격 검증 실패 인물=%', wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      (mahasanghika_vinaya_id),
      (bible_id),
      (korean_monster_id),
      (time_of_my_life_id),
      (west_end_blues_id)
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
    RAISE EXCEPTION '6차 touched contents locale/thumbnail/verified 검증 실패 콘텐츠=%', wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id IN (
      'f6753a3e-57bc-4ce4-bf3a-877142ca1a94'::uuid,
      'fd611565-b9a9-4176-9a74-8813127f62a1'::uuid,
      'bd04ee3a-3965-4123-b4af-9fe99d8150f5'::uuid,
      '33eb862e-c5c5-432b-82a1-906f47a9e7af'::uuid,
      '6a62be37-0d92-4cbf-93ad-72ae21f44a65'::uuid
    )
      AND (
        NULLIF(btrim(uc.review), '') IS NULL
        OR NULLIF(btrim(uc.review_en), '') IS NULL
        OR NULLIF(btrim(uc.source_url), '') IS NULL
      )
  ) THEN
    RAISE EXCEPTION '6차 user_contents에 review/review_en/source_url 누락이 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id IN (
      mahasanghika_vinaya_id,
      bible_id,
      korean_monster_id,
      time_of_my_life_id,
      west_end_blues_id
    )
      AND c.user_count IS DISTINCT FROM (
        SELECT count(*)::integer
        FROM public.user_contents uc
        WHERE uc.content_id = c.id
      )
  ) THEN
    RAISE EXCEPTION '6차 touched contents의 저장 user_count와 실제 연결 수가 다릅니다.';
  END IF;
END;
$$;

COMMIT;
