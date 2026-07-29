-- 활성 + 감상여정 명시 작품군의 결정론적 2차 표본(20명) 중
-- 근거가 확인된 9명·16건을 원자적으로 반영한다.
--
-- 표본 결과:
--   - 추출 제목 기준 11/46건(23.9%), 인물 기준 9/20명(45.0%)
--   - 이강인은 원문 기사에 완전한 7곡 목록이 있으므로 추출된 3곡만이 아니라
--     기사에 명시된 7곡 전부를 등록한다.
--
-- 실행 순서:
--   1. 20260729_add_celeb_content_research_status.sql
--   2. 20260729_apply_positive_light_audit.sql
--   3. 20260729_apply_active_target_pilot.sql
--   4. 이 파일
--   5. 20260729_correct_active_target_journey_errors.sql
--
-- 보수 원칙:
--   - 본인 저술·작곡·출연·후원은 감상 근거로 세지 않는다.
--   - 기존 감상여정의 인과 해석은 user_contents.review로 복사하지 않는다.
--   - source_url이 직접 뒷받침하는 행위만 적는다.

BEGIN;

DO $$
DECLARE
  rights_of_war_id text := gen_random_uuid()::text;
  strategic_intuition_id text := gen_random_uuid()::text;
  dei_sepolcri_id text := gen_random_uuid()::text;
  wycliffe_ecclesia_id text := gen_random_uuid()::text;
  empty_chairs_id text := gen_random_uuid()::text;

  we_are_id text := gen_random_uuid()::text;
  all_i_wanna_do_id text := gen_random_uuid()::text;
  thunder_id text := gen_random_uuid()::text;
  sad_id text := gen_random_uuid()::text;
  love_love_love_id text := gen_random_uuid()::text;
  it_takes_time_id text := gen_random_uuid()::text;
  as_i_say_id text := gen_random_uuid()::text;

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

  -- UUID 오기재가 다른 인물을 승격시키지 못하도록 id·slug·닉네임을 함께 잠근다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('09c6248d-56b8-49a1-84fe-d34c8fd4ac77'::uuid, 'gustavus-adolphus', '구스타브 2세 아돌프'),
      ('11aa80da-b1cd-435b-b696-4dd8116d5e44'::uuid, 'lee-chang-ho', '이창호'),
      ('6dd61569-ea13-4261-b94b-057122f2dbc1'::uuid, 'nurhaci', '누르하치'),
      ('3744e0c0-fce9-4071-8c0e-455b7860cee3'::uuid, 'joseph-haydn', '요제프 하이든'),
      ('61505b53-1439-4ffd-8763-34d1c47836dd'::uuid, 'hwang-ji-u', '황지우'),
      ('873236c8-ec6d-4064-a6ab-ced908002861'::uuid, 'giuseppe-garibaldi', '주세페 가리발디'),
      ('dff09d95-58cf-4e17-a3c7-321ee87cf0e0'::uuid, 'jan-hus', '얀 후스'),
      ('34d34606-4e61-479a-bb94-cf99d82bc7d9'::uuid, 'herta-muller', '헤르타 뮐러'),
      ('a488a698-eae7-4938-928e-5e5c28f864bd'::uuid, 'lee-kang-in', '이강인')
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
      '2차 표본 통과자 9명의 id/slug/tier/research 기준선이 달라졌습니다. 차이=%',
      wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.user_contents
  WHERE user_id IN (
    '09c6248d-56b8-49a1-84fe-d34c8fd4ac77'::uuid,
    '11aa80da-b1cd-435b-b696-4dd8116d5e44'::uuid,
    '6dd61569-ea13-4261-b94b-057122f2dbc1'::uuid,
    '3744e0c0-fce9-4071-8c0e-455b7860cee3'::uuid,
    '61505b53-1439-4ffd-8763-34d1c47836dd'::uuid,
    '873236c8-ec6d-4064-a6ab-ced908002861'::uuid,
    'dff09d95-58cf-4e17-a3c7-321ee87cf0e0'::uuid,
    '34d34606-4e61-479a-bb94-cf99d82bc7d9'::uuid,
    'a488a698-eae7-4938-928e-5e5c28f864bd'::uuid
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '2차 표본 통과자에게 이미 콘텐츠가 생겼습니다. 현재 연결 수=%',
      wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.contents
  WHERE id IN (
    '420e33ee-db0a-4fbe-ada3-9f4596bb56ae',
    '104be5b3-84dd-4471-b03e-abcc3a3dc135',
    '6b438df7-02c6-440c-a9ef-e34c1b2df44d',
    '1d935236-c196-4314-9615-9e775ff23186'
  )
    AND type = 'BOOK';

  IF wrong_count <> 4 THEN
    RAISE EXCEPTION
      '재사용할 기존 도서 4종이 기준선과 다릅니다. 실제=%',
      wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents
    WHERE external_id IN (
      '9780865974364',
      '9788962600322',
      '9788890292835',
      'OL28379697M',
      '9781555977252',
      'spotify-2SMq0lOqCTHayWa9juoI0d',
      'spotify-2FWquqPNxte8iqZ3ATQG0p',
      'spotify-1zB4vmk8tFRmM9UULNzbLB',
      'spotify-3ee8Jmje8o58CHK66QrVC2',
      'spotify-6vxeBdd4fpNMOPRWtnVzcf',
      'spotify-3mNbGPCLCxia3yvwWp2P51',
      'spotify-1pQrxtgtmvDB6GcO1EKkpo'
    )
  ) THEN
    RAISE EXCEPTION
      '2차 표본 신규 외부 ID 중 이미 등록된 값이 있습니다. 중복 후보를 먼저 병합하세요.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE isbn IN (
      '9780865974364',
      '9788962600322',
      '9780231142687',
      '9788890292835',
      '9781555977252'
    )
  ) THEN
    RAISE EXCEPTION
      '2차 표본 신규 도서 ISBN 중 이미 등록된 판본이 있습니다. 중복 후보를 먼저 병합하세요.';
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
      rights_of_war_id,
      'BOOK',
      '2005-07-31',
      'openlibrary',
      '9780865974364',
      '{}'::jsonb
    ),
    (
      strategic_intuition_id,
      'BOOK',
      '2008-11-25',
      'naver_book',
      '9788962600322',
      '{}'::jsonb
    ),
    (
      dei_sepolcri_id,
      'BOOK',
      NULL,
      'openlibrary',
      '9788890292835',
      '{}'::jsonb
    ),
    (
      wycliffe_ecclesia_id,
      'BOOK',
      NULL,
      'openlibrary',
      'OL28379697M',
      '{}'::jsonb
    ),
    (
      empty_chairs_id,
      'BOOK',
      '2015-11-03',
      'openlibrary',
      '9781555977252',
      '{}'::jsonb
    ),
    (
      we_are_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-2SMq0lOqCTHayWa9juoI0d',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/2SMq0lOqCTHayWa9juoI0d',
        'artists', jsonb_build_array('Woo', 'Loco', 'GRAY')
      )
    ),
    (
      all_i_wanna_do_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-2FWquqPNxte8iqZ3ATQG0p',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/2FWquqPNxte8iqZ3ATQG0p',
        'artists', jsonb_build_array('Jay Park', 'Hoody', 'Loco')
      )
    ),
    (
      thunder_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-1zB4vmk8tFRmM9UULNzbLB',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/1zB4vmk8tFRmM9UULNzbLB',
        'artists', jsonb_build_array('Imagine Dragons')
      )
    ),
    (
      sad_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-3ee8Jmje8o58CHK66QrVC2',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/3ee8Jmje8o58CHK66QrVC2',
        'artists', jsonb_build_array('XXXTENTACION')
      )
    ),
    (
      love_love_love_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-6vxeBdd4fpNMOPRWtnVzcf',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/6vxeBdd4fpNMOPRWtnVzcf',
        'artists', jsonb_build_array('FTISLAND')
      )
    ),
    (
      it_takes_time_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-3mNbGPCLCxia3yvwWp2P51',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/3mNbGPCLCxia3yvwWp2P51',
        'artists', jsonb_build_array('Loco', 'Colde')
      )
    ),
    (
      as_i_say_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-1pQrxtgtmvDB6GcO1EKkpo',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/1pQrxtgtmvDB6GcO1EKkpo',
        'artists', jsonb_build_array('Lee Juck', 'Yoo Jae Suk')
      )
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 12 THEN
    RAISE EXCEPTION
      '2차 표본 신규 contents 등록 수가 12건이 아닙니다. 실제=%',
      affected;
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
      rights_of_war_id,
      'ko',
      '전쟁과 평화의 법',
      '후고 그로티우스, 리처드 턱 편',
      'https://covers.openlibrary.org/b/id/657413-L.jpg',
      '9780865974364',
      'Liberty Fund',
      '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      true
    ),
    (
      rights_of_war_id,
      'en',
      'The Rights of War and Peace',
      'Hugo Grotius, edited by Richard Tuck',
      'https://covers.openlibrary.org/b/id/657413-L.jpg',
      '9780865974364',
      'Liberty Fund',
      '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      true
    ),
    (
      strategic_intuition_id,
      'ko',
      '제7의 감각: 전략적 직관',
      '윌리엄 더건',
      'https://shopping-phinf.pstatic.net/main_3248509/32485094389.20220803185018.jpg',
      '9788962600322',
      '비즈니스맵',
      '{"primary":"naver_book","thumbnail":"naver_book"}'::jsonb,
      true
    ),
    (
      strategic_intuition_id,
      'en',
      'Strategic Intuition: The Creative Spark in Human Achievement',
      'William Duggan',
      'https://covers.openlibrary.org/b/id/9250518-L.jpg',
      '9780231142687',
      'Columbia University Press',
      '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      true
    ),
    (
      dei_sepolcri_id,
      'ko',
      '묘지에 부쳐',
      '우고 포스콜로',
      NULL,
      '9788890292835',
      'Il muro di Tessa',
      '{"primary":"openlibrary","thumbnail":"confirmed_unavailable"}'::jsonb,
      true
    ),
    (
      dei_sepolcri_id,
      'en',
      'Dei sepolcri',
      'Ugo Foscolo',
      NULL,
      '9788890292835',
      'Il muro di Tessa',
      '{"primary":"openlibrary","thumbnail":"confirmed_unavailable"}'::jsonb,
      true
    ),
    (
      wycliffe_ecclesia_id,
      'ko',
      '교회론',
      '존 위클리프, 요한 로제르트 편',
      'https://covers.openlibrary.org/b/id/10661513-L.jpg',
      NULL,
      'Johnson Reprint',
      '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      true
    ),
    (
      wycliffe_ecclesia_id,
      'en',
      'Iohannis Wyclif Tractatus de ecclesia',
      'John Wycliffe, edited by Johann Loserth',
      'https://covers.openlibrary.org/b/id/10661513-L.jpg',
      NULL,
      'Johnson Reprint',
      '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      true
    ),
    (
      empty_chairs_id,
      'ko',
      '빈 의자: 류샤 시선집',
      '류샤, 밍디·제니퍼 스턴 옮김, 헤르타 뮐러 서문',
      'https://covers.openlibrary.org/b/id/10369486-L.jpg',
      '9781555977252',
      'Graywolf Press',
      '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      true
    ),
    (
      empty_chairs_id,
      'en',
      'Empty Chairs: Selected Poems',
      'Liu Xia, translated by Ming Di and Jennifer Stern, foreword by Herta Müller',
      'https://covers.openlibrary.org/b/id/10369486-L.jpg',
      '9781555977252',
      'Graywolf Press',
      '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      true
    ),
    (
      we_are_id,
      'ko',
      '시차 (We Are)',
      '우원재, 로꼬, 그레이',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0280af1bc4fa047ba0e2f17c04',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      we_are_id,
      'en',
      'We Are',
      'Woo, Loco, GRAY',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0280af1bc4fa047ba0e2f17c04',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      all_i_wanna_do_id,
      'ko',
      'All I Wanna Do (K)',
      '박재범, 후디, 로꼬',
      'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0282ecc5ea89bf34479a71a297',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      all_i_wanna_do_id,
      'en',
      'All I Wanna Do (K) (feat. Hoody & Loco)',
      'Jay Park, Hoody, Loco',
      'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0282ecc5ea89bf34479a71a297',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      thunder_id,
      'ko',
      'Thunder',
      '이매진 드래곤스',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e025675e83f707f1d7271e5cf8a',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      thunder_id,
      'en',
      'Thunder',
      'Imagine Dragons',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e025675e83f707f1d7271e5cf8a',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      sad_id,
      'ko',
      'SAD!',
      'XXXTENTACION',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c84b393d12905582609d5094',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      sad_id,
      'en',
      'SAD!',
      'XXXTENTACION',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c84b393d12905582609d5094',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      love_love_love_id,
      'ko',
      '사랑사랑사랑',
      'FT아일랜드',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0258f2fc2fb2332d72c5de31bf',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      love_love_love_id,
      'en',
      'Love Love Love',
      'FTISLAND',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0258f2fc2fb2332d72c5de31bf',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      it_takes_time_id,
      'ko',
      '시간이 들겠지',
      '로꼬, 콜드',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e028acd005677eb85bb1ed46f15',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      it_takes_time_id,
      'en',
      'It Takes Time (feat. Colde)',
      'Loco, Colde',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e028acd005677eb85bb1ed46f15',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      as_i_say_id,
      'ko',
      '말하는 대로',
      '처진 달팽이 (이적, 유재석)',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e029a9545577bfcdf6f84951b19',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      as_i_say_id,
      'en',
      'As I Say',
      'Sagging Snail (Lee Juck, Yoo Jae Suk)',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e029a9545577bfcdf6f84951b19',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 24 THEN
    RAISE EXCEPTION
      '2차 표본 신규 content_locales 등록 수가 24건이 아닙니다. 실제=%',
      affected;
  END IF;

  -- 누르하치가 읽은 기존 도서 2종의 잘못 붙은 영문 판본을 교정한다.
  UPDATE public.content_locales
  SET creator = '나관중, 이문열 평역',
      publisher = '알에이치코리아',
      thumbnail_url = 'https://shopping-phinf.pstatic.net/main_3246725/32467254720.20260331121318.jpg',
      sources = '{"primary":"naver_book","thumbnail":"naver_book"}'::jsonb,
      verified = true,
      updated_at = now()
  WHERE content_id = '420e33ee-db0a-4fbe-ada3-9f4596bb56ae'
    AND locale = 'ko'
    AND title = '이문열 삼국지 세트'
    AND isbn = '9788925569154';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '삼국지연의 ko locale 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.content_locales
  SET title = 'Three Kingdoms: A Historical Novel',
      creator = 'Luo Guanzhong, translated by Moss Roberts',
      isbn = '9780520224780',
      publisher = 'University of California Press',
      thumbnail_url = 'https://covers.openlibrary.org/b/id/326853-L.jpg',
      sources = '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      verified = true,
      updated_at = now()
  WHERE content_id = '420e33ee-db0a-4fbe-ada3-9f4596bb56ae'
    AND locale = 'en'
    AND title = 'Romance of the Three Kingdoms'
    AND isbn = '9787806437599';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '삼국지연의 en locale 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.content_locales
  SET publisher = '글항아리',
      thumbnail_url = 'https://shopping-phinf.pstatic.net/main_4900308/49003086620.20260331111912.jpg',
      sources = '{"primary":"naver_book","thumbnail":"naver_book"}'::jsonb,
      verified = true,
      updated_at = now()
  WHERE content_id = '104be5b3-84dd-4471-b03e-abcc3a3dc135'
    AND locale = 'ko'
    AND title = '원본 수호전 1'
    AND isbn = '9791169092494';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '수호전 ko locale 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.content_locales
  SET title = 'The Water Margin: Outlaws of the Marsh',
      creator = 'Shi Naian, translated by J. H. Jackson, introduced by Edwin Lowe',
      publisher = 'Tuttle Publishing',
      thumbnail_url = 'https://cdn11.bigcommerce.com/s-q39b4/images/stencil/2000x2000/products/9523/239671/9784805317877__11881.1699627169.jpg?c=2',
      sources = '{"primary":"openlibrary","thumbnail":"publisher"}'::jsonb,
      verified = true,
      updated_at = now()
  WHERE content_id = '104be5b3-84dd-4471-b03e-abcc3a3dc135'
    AND locale = 'en'
    AND title = 'Water Margin'
    AND isbn = '9784805317877';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '수호전 en locale 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.content_locales
  SET title = 'The Study of Counterpoint: From Johann Joseph Fux''s Gradus ad Parnassum',
      creator = 'Johann Joseph Fux, edited and translated by Alfred Mann',
      isbn = '9780393002775',
      publisher = 'W. W. Norton & Company',
      thumbnail_url = 'https://shopping-phinf.pstatic.net/main_3248650/32486501556.20220520163559.jpg',
      sources = '{"primary":"naver_book","thumbnail":"naver_book"}'::jsonb,
      verified = true,
      updated_at = now()
  WHERE content_id = '6b438df7-02c6-440c-a9ef-e34c1b2df44d'
    AND locale = 'en'
    AND title = 'Gradus ad Parnassum'
    AND isbn = '9783487052090';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Gradus ad Parnassum en locale 기준선이 달라졌습니다.';
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
  VALUES (
    '6b438df7-02c6-440c-a9ef-e34c1b2df44d',
    'ko',
    '대위법 연구: 푹스의 그라두스 아드 파르나숨',
    '요한 요제프 푹스, 앨프리드 만 편역',
    'https://shopping-phinf.pstatic.net/main_3248650/32486501556.20220520163559.jpg',
    '9780393002775',
    'W. W. Norton & Company',
    '{"primary":"naver_book","thumbnail":"naver_book"}'::jsonb,
    true
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Gradus ad Parnassum ko locale 등록에 실패했습니다.';
  END IF;

  UPDATE public.content_locales
  SET publisher = '민족사',
      sources = '{"primary":"naver_book","thumbnail":"naver_book"}'::jsonb,
      verified = true,
      updated_at = now()
  WHERE content_id = '1d935236-c196-4314-9615-9e775ff23186'
    AND locale = 'ko'
    AND title = '한글 화엄경 세트'
    AND isbn = '9791189269630';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '화엄경 ko locale 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.content_locales
  SET publisher = 'Shambhala',
      sources = '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      verified = true,
      updated_at = now()
  WHERE content_id = '1d935236-c196-4314-9615-9e775ff23186'
    AND locale = 'en'
    AND title = 'The Flower Ornament Scripture: A Translation of the Avatamsaka Sutra'
    AND isbn = '9780877739401';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '화엄경 en locale 기준선이 달라졌습니다.';
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
      '09c6248d-56b8-49a1-84fe-d34c8fd4ac77'::uuid,
      rights_of_war_id,
      'FINISHED',
      '1901년 『전쟁과 평화의 법』 판본의 서문은 구스타브 2세 아돌프가 30년 전쟁 원정 중 이 책을 성경 옆, 군인의 베개 아래에 두었다고 기록한다. 왕의 일기 같은 1차 사료는 아니므로 그 전승의 강도를 밝히되, 특정 책을 전장에 지니고 다녔다는 명시적 기록으로 등록한다.',
      'The introduction to a 1901 edition of *The Rights of War and Peace* records that Gustavus Adolphus kept Grotius''s work beside his Bible under his soldier''s pillow during the Thirty Years'' War. It is not the king''s diary, so this entry states the source''s evidentiary level while preserving its explicit claim that he carried the named book on campaign.',
      'https://www.gutenberg.org/cache/epub/46564/pg46564-images.html',
      false
    ),
    (
      '11aa80da-b1cd-435b-b696-4dd8116d5e44'::uuid,
      strategic_intuition_id,
      'FINISHED',
      '2008년 사이버오로 기사에는 이창호가 『제7의 감각: 전략적 직관』을 추천하며 남긴 추천사가 실려 있다. 그는 책을 읽으면 바둑의 감각이 전략적 직관과 크게 다르지 않다는 생각이 든다고 직접 썼다. 서명만 빌려준 광고로 추정하지 않고, 읽은 뒤의 구체적인 판단이 담긴 공개 추천으로 등록한다.',
      'A 2008 Cyberoro report reproduces Lee Chang-ho''s recommendation of *Strategic Intuition*. Lee writes that reading the book made him think the sense used in Go was not very different from strategic intuition. Because the endorsement contains his specific response to the book, this is recorded as an explicit recommendation rather than a generic promotional appearance.',
      'https://m.cyberoro.com/news/N_news_view.oro?num=511971',
      true
    ),
    (
      '6dd61569-ea13-4261-b94b-057122f2dbc1'::uuid,
      '420e33ee-db0a-4fbe-ada3-9f4596bb56ae',
      'FINISHED',
      '중국인민대학 『청사연구』 논문은 누르하치가 『삼국지연의』와 『수호전』을 즐겨 읽었다고 명시한다. 기존 감상여정에 있던 유비·조조의 구체적 전술을 현실에 옮겼다는 인과 해석은 이 근거만으로 확인되지 않으므로, 여기에는 독서 사실만 등록한다.',
      'A paper in *Qing History Journal* at Renmin University of China explicitly states that Nurhaci enjoyed reading *Romance of the Three Kingdoms* and *Water Margin*. The source does not by itself verify the cultural-journey narrative''s detailed claims that he transplanted particular tactics from fictional characters, so this entry records only the reading claim.',
      'https://qsyj.ruc.edu.cn/CN/article/downloadArticleFile.do?attachType=PDF&id=37',
      false
    ),
    (
      '6dd61569-ea13-4261-b94b-057122f2dbc1'::uuid,
      '104be5b3-84dd-4471-b03e-abcc3a3dc135',
      'FINISHED',
      '중국인민대학 『청사연구』 논문은 누르하치가 『삼국지연의』와 『수호전』을 즐겨 읽었다고 명시한다. 기존 감상여정에 있던 소설과 실제 전쟁 사이의 구체적 인과는 이 근거만으로 확인되지 않으므로, 여기에는 『수호전』을 읽었다는 사실만 등록한다.',
      'A paper in *Qing History Journal* at Renmin University of China explicitly states that Nurhaci enjoyed reading *Romance of the Three Kingdoms* and *Water Margin*. Because the source does not establish the cultural-journey narrative''s detailed causal link between the novels and his campaigns, this entry records only his engagement with *Water Margin*.',
      'https://qsyj.ruc.edu.cn/CN/article/downloadArticleFile.do?attachType=PDF&id=37',
      false
    ),
    (
      '3744e0c0-fce9-4071-8c0e-455b7860cee3'::uuid,
      '6b438df7-02c6-440c-a9ef-e34c1b2df44d',
      'FINISHED',
      '요한 요제프 푹스 아카이브는 하이든이 『그라두스 아드 파르나숨』을 작곡 작업의 기초로 사용했다고 명시한다. 특정 교본을 실제 작업에 활용했다는 기록은 막연한 영향 관계보다 강한 직접 감상·학습 근거다.',
      'The Johann Joseph Fux Archive states that Haydn used *Gradus ad Parnassum* as a working foundation. Documented use of the named treatise in his compositional practice is direct evidence of study, not merely a later claim of general influence.',
      'https://www.fux-archiv.com/biografie/',
      false
    ),
    (
      '61505b53-1439-4ffd-8763-34d1c47836dd'::uuid,
      '1d935236-c196-4314-9615-9e775ff23186',
      'FINISHED',
      '법보신문에 전재된 황지우의 「허수아비-모기경」은 그가 한글판 『화엄경』을 펼쳐 읽던 중 책 위의 모기를 눌렀고, 몇 년 뒤 같은 대목을 다시 펼친 일을 1인칭으로 서술한다. 작품 속 직접 독서 장면이므로 일반적인 불교 영향 추정과 구분해 등록한다.',
      'Hwang Ji-u''s poem “Scarecrow—Mosquito Sutra,” reproduced by Beopbo News, recounts in the first person how he opened a Korean *Avatamsaka Sutra*, crushed a mosquito on its page, and returned to the same passage years later. The poem preserves a direct reading scene, which is stronger evidence than a general inference from Buddhist influence.',
      'https://www.beopbo.com/news/articleView.html?idxno=95123',
      false
    ),
    (
      '873236c8-ec6d-4064-a6ab-ced908002861'::uuid,
      dei_sepolcri_id,
      'FINISHED',
      '가리발디의 자필 원고를 바탕으로 한 『회고록』에서 그는 총상을 입고 죽음을 생각하던 순간 동료 루이지에게 우고 포스콜로의 「묘지에 부쳐」 구절을 직접 읊었다고 적었다. 확인되는 것은 특정 구절의 회상과 낭송이며, 시 전체를 통째로 암기했다는 기존 감상여정의 표현은 근거보다 강해 제외한다.',
      'In the edition of Garibaldi''s memoir based on his final autograph manuscript, he recalls reciting lines from Ugo Foscolo''s *Dei sepolcri* to Luigi while wounded and contemplating death. The primary text establishes recall and recitation of a specific passage, not the cultural journey''s stronger claim that he memorized the entire poem.',
      'https://www.gutenberg.org/cache/epub/56500/pg56500.txt',
      false
    ),
    (
      'dff09d95-58cf-4e17-a3c7-321ee87cf0e0'::uuid,
      wycliffe_ecclesia_id,
      'FINISHED',
      '필립 샤프의 교회사 연구는 얀 후스가 위클리프의 저술을 20년 넘게 읽었다고 진술했으며, 후스의 『교회론』 첫 세 장이 위클리프의 동명 논고에서 가져온 발췌로 이루어졌다고 정리한다. 위클리프의 『교회론』은 영어가 아니라 라틴어 저술이므로 기존 감상여정의 언어·번역 설명은 교정 대상이다.',
      'Philip Schaff''s church history reports Hus''s statement that he and members of the university had read Wycliffe''s writings for more than twenty years, and identifies the first three chapters of Hus''s *De ecclesia* as largely extracts from Wycliffe''s treatise of the same name. Wycliffe wrote this work in Latin, so the cultural journey''s claim that Hus carried an English text into Bohemia requires correction.',
      'https://ccel.org/ccel/schaff/hcc6/hcc6.iii.vi.vii.html',
      false
    ),
    (
      '34d34606-4e61-479a-bb94-cf99d82bc7d9'::uuid,
      empty_chairs_id,
      'FINISHED',
      '출판사 Graywolf Press의 공식 도서 페이지는 류샤의 『빈 의자』에 헤르타 뮐러가 서문을 썼다고 명시한다. 서문 집필은 작품을 직접 다룬 강한 근거지만, 현재 감상여정에 따옴표로 실린 평문은 이 페이지에서 확인되지 않아 여기에는 서문 참여 사실만 등록한다.',
      'Graywolf Press''s official page for Liu Xia''s *Empty Chairs* identifies Herta Müller as the author of the foreword. Writing the foreword is strong evidence of direct engagement, but the quotation currently attributed to Müller in the cultural journey does not appear on that page, so this entry records only the verified contribution.',
      'https://www.graywolfpress.org/books/empty-chairs',
      false
    ),
    (
      'a488a698-eae7-4938-928e-5e5c28f864bd'::uuid,
      we_are_id,
      'FINISHED',
      '2019년 스포츠서울 현장 기사는 이강인이 U-20 대표팀 훈련을 위해 직접 고른 7곡을 전부 열거한다. 그는 평소 여러 장르를 듣고, 자신이 듣는 노래 중 형들이 좋아할 곡을 골랐다고 설명했다. 기사에 적힌 곡은 윤미래의 「시차를 달리며」가 아니라 우원재의 「시차 (We Are)」다.',
      'A 2019 Sports Seoul field report lists all seven songs Lee Kang-in selected for an under-20 national-team training session. He explained that he normally listened across genres and chose, from music he heard himself, songs the older teammates would like. The listed track is Woo''s “We Are,” not the Yoon Mi-rae title currently named in the cultural journey.',
      'https://v.daum.net/v/20190501070907182?f=p',
      true
    ),
    (
      'a488a698-eae7-4938-928e-5e5c28f864bd'::uuid,
      all_i_wanna_do_id,
      'FINISHED',
      '2019년 스포츠서울 현장 기사는 이강인이 U-20 대표팀 훈련장에서 직접 선곡한 7곡 가운데 박재범의 「All I Wanna Do (K)」를 명시한다. 이강인은 자신이 듣는 노래 중 형들이 좋아할 곡을 골랐다고 설명했다.',
      'A 2019 Sports Seoul field report names Jay Park''s “All I Wanna Do (K)” among the seven tracks Lee Kang-in personally selected for an under-20 national-team training session. Lee explained that he chose, from music he listened to himself, songs the older teammates would enjoy.',
      'https://v.daum.net/v/20190501070907182?f=p',
      true
    ),
    (
      'a488a698-eae7-4938-928e-5e5c28f864bd'::uuid,
      thunder_id,
      'FINISHED',
      '2019년 스포츠서울 현장 기사는 이강인이 U-20 대표팀 훈련장에서 직접 선곡한 7곡 가운데 이매진 드래곤스의 「Thunder」를 명시한다. 기사는 선곡 사실을 확인하지만, 경기 직전 박자가 필요했다는 기존 감상여정의 심리 설명은 이강인의 발언이 아니므로 옮기지 않는다.',
      'A 2019 Sports Seoul field report names Imagine Dragons'' “Thunder” among the seven tracks Lee Kang-in personally selected for an under-20 national-team training session. The report verifies the selection, but the cultural journey''s explanation about his needing a pre-match beat is not Lee''s quoted statement and is therefore not repeated here.',
      'https://v.daum.net/v/20190501070907182?f=p',
      true
    ),
    (
      'a488a698-eae7-4938-928e-5e5c28f864bd'::uuid,
      sad_id,
      'FINISHED',
      '2019년 스포츠서울 현장 기사는 이강인이 U-20 대표팀 훈련장에서 직접 선곡한 7곡 가운데 XXXTENTACION의 「SAD!」를 명시한다. 기사에는 노래가 해외 생활의 슬픔과 겹쳤다는 기존 감상여정의 설명이 없으므로, 확인된 선곡 사실만 등록한다.',
      'A 2019 Sports Seoul field report names XXXTENTACION''s “SAD!” among the seven tracks Lee Kang-in personally selected for an under-20 national-team training session. The report does not say that the song mirrored the sadness of his life abroad, so this entry records only the verified selection.',
      'https://v.daum.net/v/20190501070907182?f=p',
      true
    ),
    (
      'a488a698-eae7-4938-928e-5e5c28f864bd'::uuid,
      love_love_love_id,
      'FINISHED',
      '2019년 스포츠서울 현장 기사는 이강인이 U-20 대표팀 훈련장에서 직접 선곡한 7곡 가운데 FT아일랜드의 「사랑사랑사랑」을 명시한다. 이강인은 평소 여러 장르를 듣고, 자신이 듣는 노래 중 형들이 좋아할 곡을 골랐다고 설명했다.',
      'A 2019 Sports Seoul field report names FTISLAND''s “Love Love Love” among the seven tracks Lee Kang-in personally selected for an under-20 national-team training session. Lee explained that he listened across genres and chose, from music he heard himself, songs the older teammates would like.',
      'https://v.daum.net/v/20190501070907182?f=p',
      true
    ),
    (
      'a488a698-eae7-4938-928e-5e5c28f864bd'::uuid,
      it_takes_time_id,
      'FINISHED',
      '2019년 스포츠서울 현장 기사는 이강인이 U-20 대표팀 훈련장에서 직접 선곡한 7곡 가운데 로꼬와 콜드의 「시간이 들겠지」를 명시한다. 이강인은 자신이 듣는 노래 중 형들이 좋아할 곡을 골랐다고 설명했다.',
      'A 2019 Sports Seoul field report names Loco and Colde''s “It Takes Time” among the seven tracks Lee Kang-in personally selected for an under-20 national-team training session. Lee explained that he chose, from music he listened to himself, songs the older teammates would enjoy.',
      'https://v.daum.net/v/20190501070907182?f=p',
      true
    ),
    (
      'a488a698-eae7-4938-928e-5e5c28f864bd'::uuid,
      as_i_say_id,
      'FINISHED',
      '2019년 스포츠서울 현장 기사는 이강인이 U-20 대표팀 훈련장에서 직접 선곡한 7곡 가운데 처진 달팽이의 「말하는 대로」를 명시한다. 이강인은 평소 여러 장르를 듣고, 자신이 듣는 노래 중 형들이 좋아할 곡을 골랐다고 설명했다.',
      'A 2019 Sports Seoul field report names Sagging Snail''s “As I Say” among the seven tracks Lee Kang-in personally selected for an under-20 national-team training session. Lee explained that he listened across genres and chose, from music he heard himself, songs the older teammates would like.',
      'https://v.daum.net/v/20190501070907182?f=p',
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 16 THEN
    RAISE EXCEPTION
      '2차 표본 user_contents 등록 수가 16건이 아닙니다. 실제=%',
      affected;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id IN (
    '09c6248d-56b8-49a1-84fe-d34c8fd4ac77'::uuid,
    '11aa80da-b1cd-435b-b696-4dd8116d5e44'::uuid,
    '6dd61569-ea13-4261-b94b-057122f2dbc1'::uuid,
    '3744e0c0-fce9-4071-8c0e-455b7860cee3'::uuid,
    '61505b53-1439-4ffd-8763-34d1c47836dd'::uuid,
    '873236c8-ec6d-4064-a6ab-ced908002861'::uuid,
    'dff09d95-58cf-4e17-a3c7-321ee87cf0e0'::uuid,
    '34d34606-4e61-479a-bb94-cf99d82bc7d9'::uuid,
    'a488a698-eae7-4938-928e-5e5c28f864bd'::uuid
  )
    AND profile_type = 'CELEB'
    AND status = 'active'
    AND celeb_tier = 'light'
    AND content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 9 THEN
    RAISE EXCEPTION
      '2차 표본 full 승격 수가 9명이 아닙니다. 실제=%',
      affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('gustavus-adolphus', 1),
      ('lee-chang-ho', 1),
      ('nurhaci', 2),
      ('joseph-haydn', 1),
      ('hwang-ji-u', 1),
      ('giuseppe-garibaldi', 1),
      ('jan-hus', 1),
      ('herta-muller', 1),
      ('lee-kang-in', 7)
  ) AS expected(slug, content_count)
  LEFT JOIN public.profiles p
    ON p.slug = expected.slug
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS content_count
    FROM public.user_contents uc
    WHERE uc.user_id = p.id
  ) actual ON true
  WHERE p.id IS NULL
     OR p.celeb_tier IS DISTINCT FROM 'full'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR actual.content_count IS DISTINCT FROM expected.content_count;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '2차 표본 반영 후 tier/count/research 검증 실패. 차이=%',
      wrong_count;
  END IF;

  -- 누적 user_count가 작업 전부터 어긋난 작품도 있으므로, 이번 배치가
  -- 건드린 콘텐츠만 실제 user_contents 행 수로 다시 맞춘다.
  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer
    FROM public.user_contents uc
    WHERE uc.content_id = c.id
  )
  WHERE c.id = ANY (
    ARRAY[
      rights_of_war_id,
      strategic_intuition_id,
      dei_sepolcri_id,
      wycliffe_ecclesia_id,
      empty_chairs_id,
      we_are_id,
      all_i_wanna_do_id,
      thunder_id,
      sad_id,
      love_love_love_id,
      it_takes_time_id,
      as_i_say_id,
      '420e33ee-db0a-4fbe-ada3-9f4596bb56ae',
      '104be5b3-84dd-4471-b03e-abcc3a3dc135',
      '6b438df7-02c6-440c-a9ef-e34c1b2df44d',
      '1d935236-c196-4314-9615-9e775ff23186'
    ]::text[]
  )
    AND c.user_count IS DISTINCT FROM (
      SELECT count(*)::integer
      FROM public.user_contents uc
      WHERE uc.content_id = c.id
    );

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id = ANY (
      ARRAY[
        rights_of_war_id,
        strategic_intuition_id,
        dei_sepolcri_id,
        wycliffe_ecclesia_id,
        empty_chairs_id,
        we_are_id,
        all_i_wanna_do_id,
        thunder_id,
        sad_id,
        love_love_love_id,
        it_takes_time_id,
        as_i_say_id,
        '420e33ee-db0a-4fbe-ada3-9f4596bb56ae',
        '104be5b3-84dd-4471-b03e-abcc3a3dc135',
        '6b438df7-02c6-440c-a9ef-e34c1b2df44d',
        '1d935236-c196-4314-9615-9e775ff23186'
      ]::text[]
    )
      AND c.user_count IS DISTINCT FROM (
        SELECT count(*)::integer
        FROM public.user_contents uc
        WHERE uc.content_id = c.id
      )
  ) THEN
    RAISE EXCEPTION '2차 표본 작품의 contents.user_count 정합성 검증 실패';
  END IF;

  IF (
    SELECT count(*)
    FROM public.content_locales
    WHERE content_id = ANY (
      ARRAY[
        rights_of_war_id,
        strategic_intuition_id,
        dei_sepolcri_id,
        wycliffe_ecclesia_id,
        empty_chairs_id,
        we_are_id,
        all_i_wanna_do_id,
        thunder_id,
        sad_id,
        love_love_love_id,
        it_takes_time_id,
        as_i_say_id
      ]::text[]
    )
  ) <> 24 THEN
    RAISE EXCEPTION '2차 표본 신규 콘텐츠 12종의 ko/en locale 24행 검증 실패';
  END IF;
END;
$$;

COMMIT;
