-- 활성 + 감상여정 비정형 작품명 추출군 21~40번의 근거·메타데이터 통과분을 반영한다.
--
-- 조사 결과:
--   - 20명 가운데 작품명이 직접 식별되고 소비 근거가 통과한 사람은 람모한 로이 1명이다.
--   - 인도 정부가 공개한 연구 자료에 로이 본인의
--     "꾸란 전체를 거듭 읽었고 성경 전체를 연구했다"는 발언이 실려 있다.
--   - Rammohun Library의 저술 연표에는 Kena·Isha 등 우파니샤드의
--     벵골어·영어 번역과 주석 출간이 남아 있어 원문 직접 연구가 확인된다.
--   - 나머지는 본인 저술·공연·건축, 작품명 없는 장르·교육, 후원,
--     후대의 일화와 영향 추정이라 콘텐츠로 등록하지 않는다.
--
-- 기존 메타데이터 결함:
--   - 꾸란의 en locale은 금지된 Google Books 출처·HTTP 표지이고
--     creator·publisher도 ISBN 9781906109073 판본과 맞지 않는다.
--   - 우파니샤드는 저장 user_count=2지만 실제 연결은 5건이고,
--     en locale의 ISBN·creator·publisher 조합이 서로 다른 판본을 섞었다.
--
-- 반영:
--   - 꾸란 en locale을 Penguin 2009년 Tarif Khalidi 번역판으로 교정
--   - 우파니샤드 en locale을 Oxford 2008년 Patrick Olivelle 번역판으로 교정
--   - 람모한 로이에게 우파니샤드·꾸란·성경 3건 연결 후 light → full 승격
--   - 세 콘텐츠의 user_count를 실제 연결 수로 동기화
--
-- 이 파일은 20260729_correct_active_extract_batch_02_journeys.sql보다 먼저 실행한다.

BEGIN;

DO $$
DECLARE
  bible_id text := '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0';
  quran_id text := '423778f8-08f5-4be1-91e4-b38b38c992fa';
  upanishads_id text := '5ba09548-e8a0-40a2-9793-4948ef9e2271';

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

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = 'dd4f0e94-52fe-4eb2-81f9-a9b723c27223'::uuid
      AND p.slug = 'ram-mohan-roy'
      AND p.nickname = '람모한 로이'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
      AND md5(p.cultural_journey) = 'bd92b1001f80febb51febb244bf10a56'
      AND md5(p.cultural_journey_en) = '3d459b662ddfc211a9208ab688d7f248'
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_contents uc
        WHERE uc.user_id = p.id
      )
  ) THEN
    RAISE EXCEPTION '람모한 로이의 프로필·여정·콘텐츠 기준선이 달라졌습니다.';
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
      AND c.user_count = 33
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 33
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
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = quran_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788972706823'
      AND c.release_date IS NULL
      AND c.metadata->>'isbn' = '9788972706823'
      AND c.metadata->>'publishDate' = '2002-06-05'
      AND c.user_count = 16
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 16
      AND ko.title = '코란(꾸란)'
      AND ko.creator = '무함마드'
      AND ko.isbn = '9788972706823'
      AND en.title = 'Quran'
      AND en.creator = 'Quran'
      AND en.isbn = '9781906109073'
      AND en.publisher = 'Islamic Publications'
      AND en.thumbnail_url LIKE 'http://books.google.com/%'
      AND en.sources->>'primary' = 'google_books'
  ) THEN
    RAISE EXCEPTION '꾸란 콘텐츠의 식별자·locale·누적값 기준선이 달라졌습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = upanishads_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788949715667'
      AND c.release_date IS NULL
      AND c.metadata = '{}'::jsonb
      AND c.user_count = 2
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 5
      AND ko.title = '우파니샤드'
      AND ko.creator = '김세현 옮김'
      AND ko.isbn = '9788949715667'
      AND en.title = 'Upanishads'
      AND en.creator = 'Swami Paramananda'
      AND en.isbn = '9788497163712'
      AND en.publisher = 'Prakash Book Depot'
  ) THEN
    RAISE EXCEPTION '우파니샤드 콘텐츠의 식별자·locale·누적값 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.content_locales cl
    WHERE cl.isbn IN ('9780143105886', '9780199540259')
  ) THEN
    RAISE EXCEPTION '교정하려는 en ISBN이 이미 다른 locale에 존재합니다.';
  END IF;

  UPDATE public.contents
  SET release_date = '2002-06-05',
      metadata = jsonb_build_object(
        'isbn', '9788972706823',
        'link', 'https://search.shopping.naver.com/book/catalog/32492200909',
        'publisher', '명문당',
        'publishDate', '2002-06-05',
        'description', '이슬람 경전 꾸란의 한국어 번역·해설판.'
      )
  WHERE id = quran_id
    AND external_source = 'naver_book'
    AND external_id = '9788972706823'
    AND release_date IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '꾸란 contents 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET creator = '김용선 옮김',
      publisher = '명문당',
      sources = jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'titlePolicy', 'edition_match'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = quran_id
    AND locale = 'ko'
    AND title = '코란(꾸란)'
    AND creator = '무함마드'
    AND isbn = '9788972706823';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '꾸란 ko locale 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET title = 'The Qur''an',
      creator = 'Tarif Khalidi (translator)',
      thumbnail_url = 'https://covers.openlibrary.org/b/id/7532680-L.jpg',
      isbn = '9780143105886',
      publisher = 'Penguin Books',
      sources = jsonb_build_object(
        'primary', 'penguin_random_house',
        'thumbnail', 'openlibrary',
        'openLibraryEdition', '/books/OL25997018M',
        'openLibraryWork', '/works/OL3962832W',
        'titlePolicy', 'edition_match'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = quran_id
    AND locale = 'en'
    AND title = 'Quran'
    AND creator = 'Quran'
    AND isbn = '9781906109073'
    AND publisher = 'Islamic Publications'
    AND sources->>'primary' = 'google_books';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '꾸란 en locale 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents
  SET release_date = '2016-09-19',
      metadata = jsonb_build_object(
        'isbn', '9788949715667',
        'publisher', '동서문화사',
        'publishDate', '2016-09-19',
        'description', '주요 우파니샤드 원전을 묶은 한국어 번역판.'
      )
  WHERE id = upanishads_id
    AND external_source = 'naver_book'
    AND external_id = '9788949715667'
    AND release_date IS NULL
    AND metadata = '{}'::jsonb;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '우파니샤드 contents 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET publisher = '동서문화사',
      sources = jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'titlePolicy', 'edition_match'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = upanishads_id
    AND locale = 'ko'
    AND title = '우파니샤드'
    AND creator = '김세현 옮김'
    AND isbn = '9788949715667'
    AND publisher IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '우파니샤드 ko locale 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET title = 'Upaniṣads',
      creator = 'Patrick Olivelle (translator)',
      thumbnail_url = 'https://covers.openlibrary.org/b/id/6964419-L.jpg',
      isbn = '9780199540259',
      publisher = 'Oxford University Press',
      sources = jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryEdition', '/books/OL23158109M',
        'openLibraryWork', '/works/OL16275093W',
        'titlePolicy', 'edition_match'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = upanishads_id
    AND locale = 'en'
    AND title = 'Upanishads'
    AND creator = 'Swami Paramananda'
    AND isbn = '9788497163712'
    AND publisher = 'Prakash Book Depot';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '우파니샤드 en locale 교정 행 수가 1이 아닙니다. 실제=%', affected;
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
      'dd4f0e94-52fe-4eb2-81f9-a9b723c27223'::uuid,
      upanishads_id,
      'FINISHED',
      $ko$람모한 로이 기념 도서관이 정리한 저술 연표에는 그가 1816년 케나·이샤 우파니샤드를 벵골어와 영어로 번역한 데 이어 여러 우파니샤드의 번역과 주석을 출간한 기록이 남아 있다. 단순한 영향 추정이 아니라 원문을 읽고 두 언어로 옮긴 직접 연구이므로 우파니샤드를 연결한다. DB의 현대 합본은 작품군 식별용이며 로이가 사용한 역사적 사본과 같다는 뜻은 아니다.$ko$,
      $en$The works chronology maintained by the Rammohun Library records Roy's 1816 Bengali and English translations of the Kena and Isha Upanishads, followed by translations and commentaries on other Upanishads. This is direct textual study and translation rather than inferred influence, so the Upanishads are linked. The modern anthology in the database identifies the work group and is not claimed to be Roy's historical copy.$en$,
      'https://rammohunlibrarykolkata.org/rammohan.html',
      false
    ),
    (
      'dd4f0e94-52fe-4eb2-81f9-a9b723c27223'::uuid,
      quran_id,
      'FINISHED',
      $ko$인도 정부 산하 IGNCA가 공개한 연구 자료에는 1830년 알렉산더 더프의 학교 개교식에서 로이가 학생들에게 한 말이 인용돼 있다. 그는 자신이 “꾸란 전체를 거듭 읽었다”고 밝히며, 다른 종교의 경전을 읽는 행위가 곧 개종을 뜻하지 않으니 직접 읽고 판단하라고 권했다. 본인의 반복 독서와 독서관이 함께 확인돼 꾸란을 연결한다. 현대 DB 판본은 작품 식별용이다.$ko$,
      $en$A study made available by India's IGNCA quotes Roy addressing students at the opening of Alexander Duff's school in 1830. He said that he had read the whole Koran again and again, using his own repeated reading to argue that students should examine another religion's scripture and judge it for themselves. The direct statement establishes both repeated reading and his approach to texts. The modern database edition is an identifier.$en$,
      'https://ignca.gov.in/Asi_data/51990.pdf',
      false
    ),
    (
      'dd4f0e94-52fe-4eb2-81f9-a9b723c27223'::uuid,
      bible_id,
      'FINISHED',
      $ko$같은 1830년 개교식 기록에서 로이는 “성경 전체를 연구했다”고 직접 말했고, 학생들에게 성경을 읽고 스스로 판단하라고 권했다. 자료는 그가 이후 한 달 동안 성경 수업을 자주 찾아 학생들의 읽기를 격려했다고도 전한다. 막연한 기독교 영향이 아니라 전권 연구와 독서 교육 참여가 확인돼 성경을 연결한다. 현대 DB 판본이 로이가 읽은 역사적 판본과 같다는 뜻은 아니다.$ko$,
      $en$In the same account of the 1830 school opening, Roy stated that he had studied the whole Bible and urged the students to read it and judge for themselves. The source also reports that he frequently attended the Bible lessons over the following month to encourage them. This documents whole-work study and active engagement with reading, not vague Christian influence. The modern database Bible is an identifier rather than Roy's historical edition.$en$,
      'https://ignca.gov.in/Asi_data/51990.pdf',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '비정형 2차 user_contents 생성 행 수가 3이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id = 'dd4f0e94-52fe-4eb2-81f9-a9b723c27223'::uuid
    AND profile_type = 'CELEB'
    AND status = 'active'
    AND celeb_tier = 'light'
    AND content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '람모한 로이 full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = counts.actual_count
  FROM (
    SELECT touched.id, count(uc.content_id)::integer AS actual_count
    FROM (
      VALUES
        (bible_id),
        (quran_id),
        (upanishads_id)
    ) AS touched(id)
    LEFT JOIN public.user_contents uc ON uc.content_id = touched.id
    GROUP BY touched.id
  ) counts
  WHERE c.id = counts.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '비정형 2차 user_count 동기화 행 수가 3이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = 'dd4f0e94-52fe-4eb2-81f9-a9b723c27223'::uuid
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 3
  ) THEN
    RAISE EXCEPTION '람모한 로이의 승격·콘텐츠 수 검증에 실패했습니다.';
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      (bible_id, 34),
      (quran_id, 17),
      (upanishads_id, 6)
  ) AS expected(id, actual_count)
  JOIN public.contents c ON c.id = expected.id
  WHERE c.user_count IS DISTINCT FROM expected.actual_count
     OR (
       SELECT count(*)::integer
       FROM public.user_contents uc
       WHERE uc.content_id = c.id
     ) <> expected.actual_count;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '비정형 2차 콘텐츠 누적값 검증 실패 콘텐츠=%', wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES (bible_id), (quran_id), (upanishads_id)
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
    RAISE EXCEPTION '비정형 2차 locale/thumbnail/verified 검증 실패 콘텐츠=%', wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = 'dd4f0e94-52fe-4eb2-81f9-a9b723c27223'::uuid
      AND (
        uc.status IS DISTINCT FROM 'FINISHED'
        OR NULLIF(btrim(uc.review), '') IS NULL
        OR NULLIF(btrim(uc.review_en), '') IS NULL
        OR NULLIF(btrim(uc.source_url), '') IS NULL
      )
  ) THEN
    RAISE EXCEPTION '람모한 로이 user_contents에 필수 필드 누락이 있습니다.';
  END IF;
END;
$$;

COMMIT;
