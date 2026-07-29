-- 활성 + 감상여정 비정형 작품명 추출군 1~20번의 근거·메타데이터 통과분을 반영한다.
--
-- 조사 결과:
--   - 20명 원문에서 괄호형 추출기가 놓친 작품·작품군 후보 18건을 복원했다.
--   - 제임스 클러크 맥스웰은 자신의 저서 서문에서 Faraday의
--     Experimental Researches in Electricity를 먼저 완독했다고 직접 밝혔다.
--   - 맥스웰의 Psalm 119 암송·지속적인 성경 연구, 아시시의 프란치스코가
--     Matthew 복음 구절을 듣고 생활 규칙으로 옮긴 사실도 기관 자료에서 확인했다.
--   - 나머지는 본인 저술·공연, 일반적 교육·후원, 작품명 없는 장르 선호,
--     후대의 영향 추정, 사료상 논쟁이 큰 전승이라 등록하지 않는다.
--
-- 기존 결함:
--   - Experimental Researches in Electricity가 금지된 google_books 레거시 ID로
--     저장돼 있고 ko locale·정상 ISBN·검증 표지가 없다.
--   - 이 콘텐츠와 러더퍼드의 연결 출처는 러더퍼드의 실험 업적만 설명하며
--     Faraday 저술·독서·인용을 전혀 담지 않아 오등록이다.
--
-- 반영:
--   - 러더퍼드의 잘못된 user_content 1행 제거(러더퍼드는 다른 5건을 유지)
--   - 기존 Faraday 콘텐츠를 OpenLibrary Cambridge Volume 1 판본으로 교정하고
--     ko locale을 추가
--   - 맥스웰 2건, 프란치스코 1건 연결 후 두 사람 light → full 승격
--   - Bible과 Faraday 콘텐츠의 user_count를 실제 연결 수로 동기화
--
-- 이 파일은 20260729_correct_active_extract_batch_01_journeys.sql보다 먼저 실행한다.

BEGIN;

DO $$
DECLARE
  bible_id text := '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0';
  faraday_id text := 'b7b7f924-7778-4cac-9269-753163f7629d';

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

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('1c561714-3504-4bed-a5fc-a60a711a8094'::uuid, 'james-clerk-maxwell', '제임스 클러크 맥스웰'),
      ('143771ff-5b02-4986-a41e-fb7dc64549ec'::uuid, 'francis-of-assisi', '아시시의 프란치스코')
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
      '비정형 1차 통과자 2명의 id/slug/tier/research 기준선이 달라졌습니다. 차이=%',
      wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.user_contents
  WHERE user_id IN (
    '1c561714-3504-4bed-a5fc-a60a711a8094'::uuid,
    '143771ff-5b02-4986-a41e-fb7dc64549ec'::uuid
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '비정형 1차 통과자에게 이미 콘텐츠가 생겼습니다. 현재 연결 수=%',
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
      AND c.user_count = 31
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 31
      AND ko.title = '성경전서'
      AND ko.creator = '성서원 편집부'
      AND ko.isbn = '9788936023997'
      AND en.title = 'NIV Giant Print Reference Bible'
      AND en.creator = 'Zondervan Bible Publishers'
      AND en.isbn = '9780310908173'
  ) THEN
    RAISE EXCEPTION '성경 콘텐츠의 식별자·locale·누적값 기준선이 달라졌습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = faraday_id
      AND c.type = 'BOOK'
      AND c.external_source = 'google_books'
      AND c.external_id = '5sAhJA4I3JcC'
      AND c.release_date IS NULL
      AND c.metadata = '{}'::jsonb
      AND c.user_count = 1
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 1
      AND (
        SELECT count(*)
        FROM public.content_locales cl
        WHERE cl.content_id = c.id
      ) = 1
      AND en.title = 'Experimental Researches in Electricity'
      AND en.creator = 'Michael Faraday'
      AND en.isbn = '5sAhJA4I3JcC'
      AND en.verified = false
  ) THEN
    RAISE EXCEPTION 'Faraday 레거시 콘텐츠의 식별자·locale·누적값 기준선이 달라졌습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = 'd4a54f96-11e1-4cfb-88da-801efb6c3522'::uuid
      AND uc.content_id = faraday_id
      AND uc.status = 'FINISHED'
      AND uc.source_url = 'https://www.sciencehistory.org/education/scientific-biographies/ernest-rutherford/'
      AND uc.review LIKE '%패러데이%'
  ) THEN
    RAISE EXCEPTION '러더퍼드–Faraday 오등록 연결의 기준선이 달라졌습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = 'd4a54f96-11e1-4cfb-88da-801efb6c3522'::uuid
      AND p.slug = 'ernest-rutherford'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'full'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 6
  ) THEN
    RAISE EXCEPTION '러더퍼드 프로필 또는 전체 콘텐츠 수 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id <> faraday_id
      AND c.external_id = '9781108053570'
  ) OR EXISTS (
    SELECT 1
    FROM public.content_locales cl
    WHERE cl.content_id <> faraday_id
      AND cl.isbn = '9781108053570'
  ) THEN
    RAISE EXCEPTION 'Faraday 교정 ISBN이 이미 다른 콘텐츠에 존재합니다.';
  END IF;

  DELETE FROM public.user_contents
  WHERE user_id = 'd4a54f96-11e1-4cfb-88da-801efb6c3522'::uuid
    AND content_id = faraday_id
    AND status = 'FINISHED'
    AND source_url = 'https://www.sciencehistory.org/education/scientific-biographies/ernest-rutherford/';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '러더퍼드 오등록 삭제 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents
  SET release_date = '2012-10-11',
      external_source = 'openlibrary',
      external_id = '9781108053570',
      metadata = jsonb_build_object(
        'isbn', '9781108053570',
        'openLibraryEdition', '/books/OL29135099M',
        'openLibraryWork', '/works/OL21495358W',
        'publisher', 'Cambridge University Press',
        'publishDate', '2012-10-11',
        'volume', 1,
        'legacyExternalSource', 'google_books',
        'legacyExternalId', '5sAhJA4I3JcC'
      )
  WHERE id = faraday_id
    AND external_source = 'google_books'
    AND external_id = '5sAhJA4I3JcC';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Faraday contents 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET title = 'Experimental Researches in Electricity, Volume 1',
      creator = 'Michael Faraday',
      thumbnail_url = 'https://covers.openlibrary.org/b/id/14745450-L.jpg',
      isbn = '9781108053570',
      publisher = 'Cambridge University Press',
      sources = jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'titlePolicy', 'edition_match'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = faraday_id
    AND locale = 'en'
    AND title = 'Experimental Researches in Electricity'
    AND creator = 'Michael Faraday'
    AND isbn = '5sAhJA4I3JcC'
    AND verified = false;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Faraday en locale 교정 행 수가 1이 아닙니다. 실제=%', affected;
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
    faraday_id,
    'ko',
    '전기 실험 연구 1권',
    '마이클 패러데이',
    'https://covers.openlibrary.org/b/id/14745450-L.jpg',
    '9781108053570',
    'Cambridge University Press',
    jsonb_build_object(
      'primary', 'openlibrary',
      'thumbnail', 'openlibrary',
      'titlePolicy', 'ko_translation'
    ),
    true
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Faraday ko locale 생성 행 수가 1이 아닙니다. 실제=%', affected;
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
      '1c561714-3504-4bed-a5fc-a60a711a8094'::uuid,
      faraday_id,
      'FINISHED',
      $ko$맥스웰은 자신의 『전기와 자기론』 초판 서문에서 전기학 공부를 시작하기 전에 수학 문헌을 읽지 않고 먼저 패러데이의 『전기 실험 연구』를 끝까지 읽기로 결심했다고 직접 썼다. 이어 패러데이의 현상 이해 방식이 수학 기호로 표현될 수 있음을 깨달았다고 설명한다. 본인 서문이 작품명·완독·연구 영향까지 밝히므로 등록한다. DB에는 Open Library가 식별한 Cambridge 2012년 1권을 현대 판본으로 연결했다.$ko$,
      $en$In the preface to the first edition of his *Treatise on Electricity and Magnetism*, Maxwell wrote that before beginning the study of electricity he resolved to read no mathematics on the subject until he had first read through Faraday's *Experimental Researches in Electricity*. He then explained how Faraday's way of conceiving phenomena could be expressed in mathematical form. Maxwell's own preface identifies the work, completion, and intellectual effect, so it is registered using an identifiable 2012 Cambridge Volume 1 edition.$en$,
      'https://en.wikisource.org/wiki/A_Treatise_on_Electricity_and_Magnetism/Preface',
      false
    ),
    (
      '1c561714-3504-4bed-a5fc-a60a711a8094'::uuid,
      bible_id,
      'FINISHED',
      $ko$Clerk Maxwell Foundation에 실린 울스터대학교 연구자의 해설은 맥스웰이 어린 시절 시편 119편 전체를 암송했고, 성인이 된 뒤에도 약혼자이자 아내 캐서린과 편지로 성경을 함께 공부했다고 설명한다. 특정 한 구절의 우연한 인용이 아니라 지속적인 성경 읽기와 암송이 확인돼 기존 성경 콘텐츠를 연결한다. 현대 DB 판본이 맥스웰이 사용한 역사적 성경과 같다는 뜻은 아니다.$ko$,
      $en$An account by a University of Ulster scholar published by the Clerk Maxwell Foundation states that Maxwell could recite the whole of Psalm 119 as a child and later continued studying the Bible with Katherine by correspondence. This documents sustained reading, memorization, and discussion rather than a stray quotation, so the existing Bible content is linked. The modern database editions are identifiers and are not claimed to be Maxwell's historical Bible.$en$,
      'https://www.clerkmaxwellfoundation.org/html/JCM_faith.html',
      false
    ),
    (
      '143771ff-5b02-4986-a41e-fb7dc64549ec'::uuid,
      bible_id,
      'FINISHED',
      $ko$교황 베네딕토 16세의 프란치스코 해설은 그가 마태오 복음서의 파견 설교를 듣던 중 가난과 설교의 삶으로 부름받았다고 느꼈다고 설명한다. 작품을 들은 행위와 삶의 변화가 함께 확인된다. DB에는 마태오 복음서를 포함하는 기존 성경 콘텐츠를 연결했으며, 현대 판본이 그가 들은 전례용 성서와 같다는 뜻은 아니다.$ko$,
      $en$Pope Benedict XVI's account of Francis explains that while listening to the Gospel of Matthew's discourse commissioning the apostles, Francis felt called to live in poverty and devote himself to preaching. Both the act of hearing the text and the resulting change in life are explicit. The database therefore links the existing Bible content containing Matthew; the modern edition is only an identifier and is not presented as the liturgical book Francis heard.$en$,
      'https://www.vatican.va/content/benedict-xvi/en/audiences/2010/documents/hf_ben-xvi_aud_20100127.html',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '비정형 1차 user_contents 생성 행 수가 3이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id IN (
    '1c561714-3504-4bed-a5fc-a60a711a8094'::uuid,
    '143771ff-5b02-4986-a41e-fb7dc64549ec'::uuid
  )
    AND profile_type = 'CELEB'
    AND status = 'active'
    AND celeb_tier = 'light'
    AND content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '비정형 1차 full 승격 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = counts.actual_count
  FROM (
    SELECT touched.id, count(uc.content_id)::integer AS actual_count
    FROM (
      VALUES
        (bible_id),
        (faraday_id)
    ) AS touched(id)
    LEFT JOIN public.user_contents uc
      ON uc.content_id = touched.id
    GROUP BY touched.id
  ) counts
  WHERE c.id = counts.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '비정형 1차 user_count 동기화 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('james-clerk-maxwell', 2),
      ('francis-of-assisi', 1)
  ) AS expected(slug, expected_count)
  JOIN public.profiles p ON p.slug = expected.slug
  WHERE p.celeb_tier IS DISTINCT FROM 'full'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR (
       SELECT count(*)
       FROM public.user_contents uc
       WHERE uc.user_id = p.id
     ) <> expected.expected_count;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '비정형 1차 인물별 콘텐츠 수/승격 검증 실패 인물=%', wrong_count;
  END IF;

  IF (
    SELECT count(*)
    FROM public.user_contents uc
    WHERE uc.user_id = 'd4a54f96-11e1-4cfb-88da-801efb6c3522'::uuid
  ) <> 5 OR EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = 'd4a54f96-11e1-4cfb-88da-801efb6c3522'::uuid
      AND uc.content_id = faraday_id
  ) THEN
    RAISE EXCEPTION '러더퍼드 오등록 제거 결과가 예상과 다릅니다.';
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES (bible_id), (faraday_id)
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
    RAISE EXCEPTION '비정형 1차 locale/thumbnail/verified 검증 실패 콘텐츠=%', wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id IN (
      '1c561714-3504-4bed-a5fc-a60a711a8094'::uuid,
      '143771ff-5b02-4986-a41e-fb7dc64549ec'::uuid
    )
      AND (
        uc.status IS DISTINCT FROM 'FINISHED'
        OR NULLIF(btrim(uc.review), '') IS NULL
        OR NULLIF(btrim(uc.review_en), '') IS NULL
        OR NULLIF(btrim(uc.source_url), '') IS NULL
      )
  ) THEN
    RAISE EXCEPTION '비정형 1차 user_contents에 필수 필드 누락이 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id IN (bible_id, faraday_id)
      AND c.user_count IS DISTINCT FROM (
        SELECT count(*)::integer
        FROM public.user_contents uc
        WHERE uc.content_id = c.id
      )
  ) THEN
    RAISE EXCEPTION '비정형 1차 touched contents의 저장 user_count와 실제 연결 수가 다릅니다.';
  END IF;
END;
$$;

COMMIT;
