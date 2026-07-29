-- 활성 + 감상여정 명시 작품군 116~125번의 근거·메타데이터 통과분을 반영한다.
--
-- 조사 결과:
--   - 10명에서 작품 후보 25건을 추출했다.
--   - 직접 감상·구독·구매 관계가 확인된 후보는 13건이다.
--     (무리뉴 1, 로댕 5, 피노 2, 마일스 데이비스 3, 윤봉길 2)
--   - 이 가운데 현재 서비스 타입과 외부 메타데이터 게이트를 통과한 것은
--     무리뉴 1건, 로댕 5건, 마일스 데이비스 1건이다.
--   - 피노의 미술품 2점은 지원 타입(BOOK/VIDEO/GAME/MUSIC) 밖이다.
--   - 마일스 데이비스의 Hymnen은 정확한 Spotify 판본을, Concierto de Aranjuez는
--     그가 들은 정확한 연주 음반을 식별하지 못했다.
--   - 윤봉길의 개벽·동아일보는 직접 관계가 확인됐으나 ISBN 판본이 아니다.
--   - 본인 저작·본인 녹음, 후대의 수용, 일반적 영향 추정은 제외했다.
--
-- 반영:
--   - 신규 콘텐츠 2종(Peaky Blinders, Les Orientales)과 ko/en locale 4행 생성
--   - 잘못 연결돼 있던 Les Contemplations 분석서 메타데이터를 원작 판본으로 교정
--   - 기존 콘텐츠 5종 재사용
--   - 3명에게 user_contents 7행 연결 후 light → full 승격
--   - touched contents 7종의 user_count를 실제 연결 수로 동기화
--
-- 이 파일은 20260729_correct_active_target_batch_07_journeys.sql보다 먼저 실행한다.

BEGIN;

DO $$
DECLARE
  peaky_blinders_id text := gen_random_uuid()::text;
  les_orientales_id text := gen_random_uuid()::text;

  divine_comedy_id text := '70d75785-5f1e-45fb-99ef-f936e6fd8298';
  flowers_of_evil_id text := '5a918414-ae1e-4578-941c-6a6857e8753b';
  notre_dame_id text := '59ad6c47-8297-4852-8ab9-f9079ff843f1';
  les_contemplations_id text := '15111ba4-d4bc-4303-a07f-29025d3ef549';
  stand_id text := '432910cb-f643-4165-a2a6-3562615f0713';

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

  -- UUID가 다른 동명이인을 승격하지 않도록 id·slug·닉네임과 운영 상태를 함께 잠근다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('86e86ceb-c73d-4849-8e99-b3540d784b6f'::uuid, 'jose-mourinho', '조세 무리뉴'),
      ('a26f7451-aea0-4206-a899-b95f62a6d5fc'::uuid, 'auguste-rodin', '오귀스트 로댕'),
      ('400000f8-43be-4bda-9ed9-cfaea653bb91'::uuid, 'miles-davis', '마일스 데이비스')
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
      '7차 통과자 3명의 id/slug/tier/research 기준선이 달라졌습니다. 차이=%',
      wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.user_contents
  WHERE user_id IN (
    '86e86ceb-c73d-4849-8e99-b3540d784b6f'::uuid,
    'a26f7451-aea0-4206-a899-b95f62a6d5fc'::uuid,
    '400000f8-43be-4bda-9ed9-cfaea653bb91'::uuid
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '7차 통과자에게 이미 콘텐츠가 생겼습니다. 현재 연결 수=%',
      wrong_count;
  END IF;

  -- 재사용 콘텐츠의 식별자·locale·저장/실제 누적값을 쓰기 직전 다시 검증한다.
  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = divine_comedy_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788932921006'
      AND c.user_count = 14
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 32
      AND ko.title = '신곡'
      AND ko.creator = '단테 알리기에리'
      AND ko.isbn = '9788932921006'
      AND en.title = 'The Divine Comedy'
      AND en.creator = 'Dante Alighieri'
  ) THEN
    RAISE EXCEPTION '신곡 콘텐츠의 식별자·locale·누적값 기준선이 달라졌습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = flowers_of_evil_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788937418013'
      AND c.user_count = 3
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 3
      AND ko.title = '악의 꽃'
      AND ko.creator = '샤를 피에르 보들레르'
      AND ko.isbn = '9788937418013'
      AND en.title = 'The Flowers of Evil'
      AND en.creator = 'Charles Baudelaire'
  ) THEN
    RAISE EXCEPTION '악의 꽃 콘텐츠의 식별자·locale·누적값 기준선이 달라졌습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = notre_dame_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788949717234'
      AND c.user_count = 1
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 1
      AND ko.title = '노트르담 드 파리'
      AND ko.creator = '빅토르 위고'
      AND ko.isbn = '9788949717234'
      AND en.title = 'The Hunchback of Notre-Dame'
      AND en.creator = 'Victor Hugo'
  ) THEN
    RAISE EXCEPTION '노트르담 드 파리 콘텐츠의 식별자·locale·누적값 기준선이 달라졌습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = les_contemplations_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9782806263797'
      AND c.user_count = 0
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 0
      AND ko.title = 'Les Contemplations de Victor Hugo (Analyse de l’oeuvre) (Resume complet et analyse detaillee de l’oeuvre)'
      AND ko.isbn = '9782806263797'
      AND NULLIF(btrim(ko.creator), '') IS NULL
      AND en.title = 'Les Contemplations'
      AND en.creator = 'Victor Hugo'
      AND en.isbn = '9782266083072'
  ) THEN
    RAISE EXCEPTION '명상시집 오식별 콘텐츠의 식별자·locale 기준선이 달라졌습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = stand_id
      AND c.type = 'MUSIC'
      AND c.external_source = 'spotify'
      AND c.external_id = 'spotify-7iwS1r6JHYJe9xpPjzmWqD'
      AND c.user_count = 3
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 3
      AND ko.title = 'Stand!'
      AND ko.creator = 'Sly & The Family Stone'
      AND en.title = 'Stand!'
      AND en.creator = 'Sly & The Family Stone'
  ) THEN
    RAISE EXCEPTION 'Stand! 콘텐츠의 식별자·locale·누적값 기준선이 달라졌습니다.';
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.contents
  WHERE external_id IN ('tmdb-tv-60574', '9782070437283', '9782080704399');

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '7차 신규/교정 외부 ID가 이미 존재합니다. 중복=%', wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE isbn IN ('9782070437283', '9782080704399')
  ) THEN
    RAISE EXCEPTION '7차 신규/교정 ISBN이 이미 다른 locale에 존재합니다.';
  END IF;

  -- 분석서를 원작으로 잘못 합친 기존 Les Contemplations를 정확한 Open Library 판본으로 교정한다.
  UPDATE public.contents
  SET external_source = 'openlibrary',
      external_id = '9782070437283',
      release_date = '2010-01-01',
      metadata = jsonb_build_object(
        'isbn', '9782070437283',
        'openLibraryEdition', '/books/OL37767057M',
        'openLibraryWork', '/works/OL27691858W',
        'publisher', 'Gallimard',
        'publishDate', '2010'
      )
  WHERE id = les_contemplations_id
    AND external_source = 'naver_book'
    AND external_id = '9782806263797';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '명상시집 contents 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET title = '명상시집',
      creator = '빅토르 위고',
      thumbnail_url = 'https://covers.openlibrary.org/b/id/12677537-L.jpg',
      isbn = '9782070437283',
      publisher = 'Gallimard',
      sources = jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'titlePolicy', 'ko_translation'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = les_contemplations_id
    AND locale = 'ko'
    AND isbn = '9782806263797'
    AND NULLIF(btrim(creator), '') IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '명상시집 ko locale 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET title = 'Les Contemplations',
      creator = 'Victor Hugo',
      thumbnail_url = 'https://covers.openlibrary.org/b/id/12677537-L.jpg',
      isbn = '9782070437283',
      publisher = 'Gallimard',
      sources = jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'titlePolicy', 'edition_match'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = les_contemplations_id
    AND locale = 'en'
    AND title = 'Les Contemplations'
    AND creator = 'Victor Hugo'
    AND isbn = '9782266083072';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '명상시집 en locale 교정 행 수가 1이 아닙니다. 실제=%', affected;
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
      peaky_blinders_id,
      'VIDEO',
      '2013-09-12',
      'tmdb',
      'tmdb-tv-60574',
      jsonb_build_object(
        'mediaType', 'tv',
        'tmdbId', 60574,
        'originalTitle', 'Peaky Blinders',
        'firstAirDate', '2013-09-12',
        'createdBy', jsonb_build_array('Steven Knight'),
        'genres', jsonb_build_array('Drama', 'Crime')
      )
    ),
    (
      les_orientales_id,
      'BOOK',
      '1999-01-04',
      'openlibrary',
      '9782080704399',
      jsonb_build_object(
        'isbn', '9782080704399',
        'openLibraryEdition', '/books/OL8841779M',
        'openLibraryWork', '/works/OL8543778W',
        'publisher', 'Editions Flammarion',
        'publishDate', 'January 4, 1999'
      )
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '7차 contents 생성 행 수가 2가 아닙니다. 실제=%', affected;
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
      peaky_blinders_id,
      'ko',
      '피키 블라인더스',
      '스티븐 나이트',
      'https://image.tmdb.org/t/p/w500/tNywkichh1mbS8BZA6CUPB8Zqgd.jpg',
      NULL,
      'BBC',
      jsonb_build_object('primary', 'tmdb', 'thumbnail', 'tmdb'),
      true
    ),
    (
      peaky_blinders_id,
      'en',
      'Peaky Blinders',
      'Steven Knight',
      'https://image.tmdb.org/t/p/w500/tNywkichh1mbS8BZA6CUPB8Zqgd.jpg',
      NULL,
      'BBC',
      jsonb_build_object('primary', 'tmdb', 'thumbnail', 'tmdb'),
      true
    ),
    (
      les_orientales_id,
      'ko',
      '동방시집',
      '빅토르 위고',
      'https://covers.openlibrary.org/b/id/971308-L.jpg',
      '9782080704399',
      'Editions Flammarion',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'titlePolicy', 'ko_translation'
      ),
      true
    ),
    (
      les_orientales_id,
      'en',
      'Odes et Ballades / Les Orientales',
      'Victor Hugo',
      'https://covers.openlibrary.org/b/id/971308-L.jpg',
      '9782080704399',
      'Editions Flammarion',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'titlePolicy', 'edition_match'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '7차 content_locales 생성 행 수가 4가 아닙니다. 실제=%', affected;
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
      '86e86ceb-c73d-4849-8e99-b3540d784b6f'::uuid,
      peaky_blinders_id,
      'FINISHED',
      $ko$조세 무리뉴는 2024년 TNT Sports의 즉답 인터뷰에서 가장 좋아하는 TV 프로그램을 묻자 「피키 블라인더스」라고 직접 답했다. 작품명과 선호가 본인 발언으로 확인돼 등록한다. 기존 감상여정에 있던 ‘중독’, 토미 셸비의 특정 행동에 대한 감상, 자신의 코칭 방식과 연결했다는 설명은 해당 인터뷰에 없어 제거했다.$ko$,
      $en$In a 2024 TNT Sports rapid-fire interview, José Mourinho was asked for his favourite TV show and answered *Peaky Blinders*. The title and preference are direct first-person evidence, so the series is registered. The former journey's claims that he was “addicted,” admired specific Tommy Shelby scenes, or linked the character to his coaching were not in that interview and have been removed.$en$,
      'https://www.tntsports.co.uk/football/euro/2024/in-our-generation-he-was-the-best-jose-mourinho-on-the-one-player-he-wishes-hed-signed-best-fans-and-more_sto20010522/story.shtml',
      false
    ),
    (
      'a26f7451-aea0-4206-a899-b95f62a6d5fc'::uuid,
      divine_comedy_id,
      'FINISHED',
      $ko$로댕 미술관은 로댕을 단테의 열렬한 독자로 설명하며, 『신곡』 가운데 특히 「지옥편」이 「지옥의 문」의 주제를 이루었다고 밝힌다. 직접 독서와 작품 영향이 함께 확인돼 등록한다. DB에는 식별 가능한 현대 판본을 연결했으며, 로댕이 이 판본을 소장했다는 뜻은 아니다.$ko$,
      $en$The Musée Rodin describes Rodin as a great reader of Dante and identifies the *Divine Comedy*, especially the *Inferno*, as the source of the subject developed in *The Gates of Hell*. Both direct reading and artistic influence are explicit. The database links an identifiable modern edition; it is not claimed to be Rodin's historical copy.$en$,
      'https://www.musee-rodin.fr/ressources/rodin-et-artistes/charles-baudelaire',
      false
    ),
    (
      'a26f7451-aea0-4206-a899-b95f62a6d5fc'::uuid,
      notre_dame_id,
      'FINISHED',
      $ko$로댕 미술관은 로댕이 젊은 시절부터 빅토르 위고를 흠모했고, 그 경로로 『노트르담 드 파리』를 작품명과 함께 명시한다. 이 공식 소장기관 기록에 따라 직접 감상 작품으로 등록한다. 연결된 DB 판본은 작품 식별을 위한 현대 판본이다.$ko$,
      $en$The Musée Rodin states that Rodin admired Victor Hugo from his youth and explicitly names *Notre-Dame de Paris* as one of the works through which that admiration developed. It is therefore registered as directly consumed content. The linked database edition is a modern identifier rather than Rodin's physical copy.$en$,
      'https://www.musee-rodin.fr/ressources/rodin-et-artistes/victor-hugo',
      false
    ),
    (
      'a26f7451-aea0-4206-a899-b95f62a6d5fc'::uuid,
      les_orientales_id,
      'FINISHED',
      $ko$로댕 미술관은 젊은 로댕의 위고에 대한 경외를 설명하면서 『동방시집』을 특히 중요한 작품으로 지목한다. 작품명과 독서 관계가 공식 기록에 명시돼 등록한다. DB에는 Open Library에서 식별된 1999년 Flammarion 판본을 연결했다.$ko$,
      $en$The Musée Rodin identifies *Les Orientales* as especially important in the young Rodin's admiration for Victor Hugo. Because the work and reading relationship are explicit in the museum record, it is registered. The database uses a 1999 Flammarion edition identified through Open Library.$en$,
      'https://www.musee-rodin.fr/ressources/rodin-et-artistes/victor-hugo',
      false
    ),
    (
      'a26f7451-aea0-4206-a899-b95f62a6d5fc'::uuid,
      les_contemplations_id,
      'FINISHED',
      $ko$로댕 미술관은 로댕이 젊은 시절부터 위고를 흠모하게 된 작품 가운데 『명상시집』을 직접 열거한다. 이 기록을 근거로 등록한다. 기존 DB 콘텐츠는 원작이 아니라 작품 분석서와 합쳐져 있어, Open Library의 2010년 Gallimard 원작 판본으로 메타데이터를 바로잡았다.$ko$,
      $en$The Musée Rodin explicitly lists *Les Contemplations* among the works through which Rodin developed his early admiration for Victor Hugo. It is registered on that evidence. The existing database record had been merged with a study guide, so its metadata was corrected to a 2010 Gallimard edition of Hugo's original work from Open Library.$en$,
      'https://www.musee-rodin.fr/ressources/rodin-et-artistes/victor-hugo',
      false
    ),
    (
      'a26f7451-aea0-4206-a899-b95f62a6d5fc'::uuid,
      flowers_of_evil_id,
      'FINISHED',
      $ko$로댕 미술관은 로댕을 보들레르 『악의 꽃』의 열렬한 독자라고 명시한다. 그는 1887년 폴 갈리마르가 소장한 1857년 초판본에 직접 삽화를 그리기까지 했다. 독서와 구체적 작업 관계가 모두 확인돼 등록한다. DB에는 식별 가능한 현대 판본을 연결했다.$ko$,
      $en$The Musée Rodin explicitly calls Rodin a fervent reader of Baudelaire's *Les Fleurs du Mal*. In 1887 he also illustrated Paul Gallimard's copy of the 1857 first edition. The reading and concrete working relationship are both documented, so the book is registered using an identifiable modern database edition.$en$,
      'https://www.musee-rodin.fr/ressources/rodin-et-artistes/charles-baudelaire',
      false
    ),
    (
      '400000f8-43be-4bda-9ed9-cfaea653bb91'::uuid,
      stand_id,
      'FINISHED',
      $ko$마일스 데이비스는 자서전에서 슬라이 앤 더 패밀리 스톤을 처음 들었을 때 초기 음반들을 거의 닳도록 들었다고 회고하며 「Stand!」를 직접 열거했다. 반복 청취가 본인 회고로 확인돼 기존 앨범 콘텐츠를 연결한다. 『Hymnen』과 『콘시에르토 데 아랑후에스』도 청취 관계는 확인됐지만, 그가 들은 정확한 Spotify 판본·연주 음반을 식별하지 못해 보류했다.$ko$,
      $en$In his autobiography, Miles Davis recalled that when he first heard Sly and the Family Stone he almost wore out their early records, explicitly naming *Stand!*. His repeated listening is first-person evidence, so the existing album content is linked. His listening to *Hymnen* and *Concierto de Aranjuez* also passed the relationship check, but the exact Spotify release and performance recording he heard could not be identified securely.$en$,
      'https://www.honest-broker.com/p/what-happened-to-sly-stone',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '7차 user_contents 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id IN (
    '86e86ceb-c73d-4849-8e99-b3540d784b6f'::uuid,
    'a26f7451-aea0-4206-a899-b95f62a6d5fc'::uuid,
    '400000f8-43be-4bda-9ed9-cfaea653bb91'::uuid
  )
    AND profile_type = 'CELEB'
    AND status = 'active'
    AND celeb_tier = 'light'
    AND content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '7차 full 승격 행 수가 3이 아닙니다. 실제=%', affected;
  END IF;

  -- 저장 누적값을 새 연결 뒤 실제 user_contents 수와 맞춘다.
  UPDATE public.contents c
  SET user_count = counts.actual_count
  FROM (
    SELECT touched.id, count(uc.content_id)::integer AS actual_count
    FROM (
      VALUES
        (peaky_blinders_id),
        (divine_comedy_id),
        (notre_dame_id),
        (les_orientales_id),
        (les_contemplations_id),
        (flowers_of_evil_id),
        (stand_id)
    ) AS touched(id)
    LEFT JOIN public.user_contents uc
      ON uc.content_id = touched.id
    GROUP BY touched.id
  ) counts
  WHERE c.id = counts.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '7차 touched contents user_count 동기화 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('jose-mourinho', 1),
      ('auguste-rodin', 5),
      ('miles-davis', 1)
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
    RAISE EXCEPTION '7차 인물별 콘텐츠 수/승격 검증 실패 인물=%', wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      (peaky_blinders_id),
      (divine_comedy_id),
      (notre_dame_id),
      (les_orientales_id),
      (les_contemplations_id),
      (flowers_of_evil_id),
      (stand_id)
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
    RAISE EXCEPTION '7차 touched contents locale/thumbnail/verified 검증 실패 콘텐츠=%', wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id IN (
      divine_comedy_id,
      notre_dame_id,
      les_orientales_id,
      les_contemplations_id,
      flowers_of_evil_id
    )
      AND (
        c.type IS DISTINCT FROM 'BOOK'
        OR NULLIF(btrim(ko.isbn), '') IS NULL
        OR NULLIF(btrim(en.isbn), '') IS NULL
      )
  ) THEN
    RAISE EXCEPTION '7차 도서 콘텐츠에 ISBN 누락이 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id IN (
      '86e86ceb-c73d-4849-8e99-b3540d784b6f'::uuid,
      'a26f7451-aea0-4206-a899-b95f62a6d5fc'::uuid,
      '400000f8-43be-4bda-9ed9-cfaea653bb91'::uuid
    )
      AND (
        uc.status IS DISTINCT FROM 'FINISHED'
        OR NULLIF(btrim(uc.review), '') IS NULL
        OR NULLIF(btrim(uc.review_en), '') IS NULL
        OR NULLIF(btrim(uc.source_url), '') IS NULL
      )
  ) THEN
    RAISE EXCEPTION '7차 user_contents에 status/review/review_en/source_url 누락이 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id IN (
      peaky_blinders_id,
      divine_comedy_id,
      notre_dame_id,
      les_orientales_id,
      les_contemplations_id,
      flowers_of_evil_id,
      stand_id
    )
      AND c.user_count IS DISTINCT FROM (
        SELECT count(*)::integer
        FROM public.user_contents uc
        WHERE uc.content_id = c.id
      )
  ) THEN
    RAISE EXCEPTION '7차 touched contents의 저장 user_count와 실제 연결 수가 다릅니다.';
  END IF;
END;
$$;

COMMIT;
