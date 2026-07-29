-- 활성 + 감상여정 명시 작품군 76~95번의 근거·판본 통과분을 원자적으로 반영한다.
--
-- 조사 결과:
--   - 20명, 추출 후보 37건 가운데 추출 후보 8건의 직접 관계를 확인
--   - 『사기』 1건은 명성황후 사료를 확인하는 과정에서 추가로 발견
--   - 5명 7건만 관계·판본·locale 게이트를 모두 통과
--   - 콜럼버스의 『이마고 문디』와 명성황후의 『여훈』은 관계는 통과했지만
--     네이버·OpenLibrary에서 정확히 대응하는 적격 판본을 찾지 못해 보류
--   - 스키피오의 『키루스의 교육』 일화는 동명이 아니라 양손자
--     스키피오 아이밀리아누스의 기록이므로 제외
--
-- 반영:
--   - 기존 콘텐츠 7종 재사용
--   - 기욤 람플·콜럼버스·에피쿠로스·사이초·명성황후에게 7건 연결
--   - 잘못 섞인 『소학』·『효경』 en locale을 같은 작품의 적격 판본으로 수선
--   - 위 5명을 light에서 full로 승격
--
-- 이 파일은 20260729_correct_active_target_batch_05_journeys.sql보다 먼저 실행한다.

BEGIN;

DO $$
DECLARE
  doom_id text := '77f89242-93e6-4628-ac7c-e6b9704a16a9';
  marco_polo_id text := '47660ad8-4959-4394-8dd6-f452b0db7fbf';
  theogony_id text := '5c38c188-32a1-4551-9ce7-97c025b2e364';
  lotus_sutra_id text := 'dd29f2ad-fc98-4c9c-807c-4b7fe2bcf349';
  xiaoxue_id text := '4233ffc3-ee2d-43aa-ab62-32ec65bd113e';
  xiaojing_id text := '1c55da8a-71d5-44e8-8693-36cff64f3bc4';
  shiji_id text := '13fc7c7e-731e-4de0-a186-3fb8d86616dc';

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
      ('cc1b6ad3-5140-4fbc-9ace-f753cdc9ad71'::uuid, 'guillaume-lample', '기욤 람플'),
      ('368c8bc0-0e1e-441e-8240-3f957602accc'::uuid, 'christopher-columbus', '크리스토퍼 콜럼버스'),
      ('57b1cb45-79bb-4171-ad58-e714a89c6b2f'::uuid, 'epicurus', '에피쿠로스'),
      ('e8b01b85-b1fa-4bbf-ab67-a91f16051a20'::uuid, 'saicho', '사이초'),
      ('bfd405b3-17c2-49fe-b507-f8f9a35938ea'::uuid, 'empress-myeongseong', '명성황후')
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
      '5차 통과자 5명의 id/slug/tier/research 기준선이 달라졌습니다. 차이=%',
      wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.user_contents
  WHERE user_id IN (
    'cc1b6ad3-5140-4fbc-9ace-f753cdc9ad71'::uuid,
    '368c8bc0-0e1e-441e-8240-3f957602accc'::uuid,
    '57b1cb45-79bb-4171-ad58-e714a89c6b2f'::uuid,
    'e8b01b85-b1fa-4bbf-ab67-a91f16051a20'::uuid,
    'bfd405b3-17c2-49fe-b507-f8f9a35938ea'::uuid
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '5차 통과자에게 이미 콘텐츠가 생겼습니다. 현재 연결 수=%',
      wrong_count;
  END IF;

  -- 재사용할 7종의 UUID와 외부 식별자가 조사 기준선과 같아야 한다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      (doom_id, 'GAME', 'igdb', 'igdb-673'),
      (marco_polo_id, 'BOOK', 'naver_book', '9788949141640'),
      (theogony_id, 'BOOK', 'naver_book', '9788937480515'),
      (lotus_sutra_id, 'BOOK', 'naver_book', '9788996899648'),
      (xiaoxue_id, 'BOOK', 'naver_book', '9791159932304'),
      (xiaojing_id, 'BOOK', 'naver_book', '9788966802890'),
      (shiji_id, 'BOOK', 'naver_book', '9788937425950')
  ) AS expected(id, type, external_source, external_id)
  JOIN public.contents c
    ON c.id = expected.id
  WHERE c.type = expected.type
    AND c.external_source = expected.external_source
    AND c.external_id = expected.external_id;

  IF wrong_count <> 7 THEN
    RAISE EXCEPTION
      '5차 재사용 콘텐츠 7종의 UUID/외부 식별자 기준선이 다릅니다. 일치=%',
      wrong_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE content_id = doom_id
      AND locale = 'en'
      AND title = 'Doom'
      AND creator = 'id Software'
  ) THEN
    RAISE EXCEPTION '1993년 Doom locale 기준선이 다릅니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE content_id = marco_polo_id
      AND locale = 'ko'
      AND title = '동방견문록'
      AND isbn = '9788949141640'
  ) THEN
    RAISE EXCEPTION '동방견문록 locale 기준선이 다릅니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE content_id = theogony_id
      AND locale = 'ko'
      AND title = '신통기(그리스 신들의 계보)'
      AND isbn = '9788937480515'
  ) THEN
    RAISE EXCEPTION '신통기 locale 기준선이 다릅니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE content_id = lotus_sutra_id
      AND locale = 'ko'
      AND title = '법화경'
      AND isbn = '9788996899648'
  ) THEN
    RAISE EXCEPTION '법화경 locale 기준선이 다릅니다.';
  END IF;

  -- 두 en locale은 제목 충돌로 전혀 다른 책이 붙어 있었던 상태를 정확히 잠근다.
  IF NOT EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE content_id = xiaoxue_id
      AND locale = 'en'
      AND title = 'Elementary Learning'
      AND creator = 'Arthur K. Ellis'
      AND isbn = '9780205267637'
  ) THEN
    RAISE EXCEPTION '수선 전 소학 en locale 기준선이 다릅니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE content_id = xiaojing_id
      AND locale = 'en'
      AND title = 'Classic of Filial Piety'
      AND creator = 'Richard M. Barnhart'
      AND isbn = '9780300086331'
  ) THEN
    RAISE EXCEPTION '수선 전 효경 en locale 기준선이 다릅니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE isbn = '9781425327644'
      AND content_id <> xiaojing_id
  ) THEN
    RAISE EXCEPTION '효경 수선용 OpenLibrary ISBN이 이미 다른 콘텐츠에 있습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE content_id = shiji_id
      AND locale = 'ko'
      AND title = '사기'
      AND creator = '사마천'
      AND isbn = '9788937425950'
  ) THEN
    RAISE EXCEPTION '사기 locale 기준선이 다릅니다.';
  END IF;

  -- 1993년 원작 Doom의 비어 있던 메타데이터를 공식 IGDB 식별자에 맞춰 보완한다.
  UPDATE public.contents
  SET release_date = '1993-12-10',
      metadata = jsonb_build_object(
        'developer', 'id Software',
        'publisher', 'id Software',
        'releaseDate', '1993-12-10',
        'genres', jsonb_build_array('Shooter'),
        'platforms', jsonb_build_array('DOS', 'PC'),
        'igdbUrl', 'https://www.igdb.com/games/doom'
      )
  WHERE id = doom_id
    AND external_source = 'igdb'
    AND external_id = 'igdb-673'
    AND metadata = '{}'::jsonb;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '1993년 Doom 메타데이터 수선 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  -- 『소학』 en locale에 섞인 동명 교육학 교재를 같은 네이버 판본의 영문 표기로 교체한다.
  UPDATE public.contents
  SET release_date = '2021-07-16'
  WHERE id = xiaoxue_id
    AND external_source = 'naver_book'
    AND external_id = '9791159932304';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '소학 contents 수선 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET title = 'Elementary Learning (Xiaoxue)',
      creator = 'Zhu Xi',
      thumbnail_url = 'https://shopping-phinf.pstatic.net/main_3953167/39531671619.20230427071434.jpg',
      isbn = '9791159932304',
      publisher = 'Olje',
      sources = jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'titlePolicy', 'en_translation_of_ko_edition'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = xiaoxue_id
    AND locale = 'en'
    AND title = 'Elementary Learning'
    AND creator = 'Arthur K. Ellis'
    AND isbn = '9780205267637';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '소학 en locale 수선 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  -- 『효경』 en locale에 섞인 이공린 회화 연구서를 실제 효경 영문판으로 교체한다.
  UPDATE public.contents
  SET release_date = '2012-03-15'
  WHERE id = xiaojing_id
    AND external_source = 'naver_book'
    AND external_id = '9788966802890';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '효경 contents 수선 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.content_locales
  SET title = 'The Hsiao King or Classic of Filial Piety',
      creator = 'Charles F. Horne',
      thumbnail_url = 'https://covers.openlibrary.org/b/id/2825085-L.jpg',
      isbn = '9781425327644',
      publisher = 'Kessinger Publishing',
      sources = jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryKey', '/books/OL11862082M'
      ),
      verified = true,
      updated_at = now()
  WHERE content_id = xiaojing_id
    AND locale = 'en'
    AND title = 'Classic of Filial Piety'
    AND creator = 'Richard M. Barnhart'
    AND isbn = '9780300086331';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '효경 en locale 수선 행 수가 1이 아닙니다. 실제=%', affected;
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
      'cc1b6ad3-5140-4fbc-9ace-f753cdc9ad71'::uuid,
      doom_id,
      'FINISHED',
      $ko$기욤 람플과 데벤드라 차플롯의 2016년 논문은 고전 FPS 「Doom」의 ViZDoom 환경에서 화면 픽셀만 보고 움직이는 에이전트 Arnold를 학습시켰다. 논문은 Arnold가 그해 Visual Doom AI Competition의 두 트랙에서 모두 2위를 했다고 명시한다. 기존 감상여정의 ‘1트랙 우승’은 사실과 달라 교정했다. 이 연결은 여가 감상이 아니라 특정 게임을 직접 연구 환경으로 사용한 기록이다.$ko$,
      $en$Guillaume Lample and Devendra Chaplot's 2016 paper trained the Arnold agent from screen pixels in ViZDoom, an environment built on the classic FPS *Doom*. The paper says Arnold placed second in both tracks of the 2016 Visual Doom AI Competition, not first in Track 1. This entry records direct use of the game as a research environment rather than inferring leisure play.$en$,
      'https://arxiv.org/abs/1609.05521',
      false
    ),
    (
      '368c8bc0-0e1e-441e-8240-3f957602accc'::uuid,
      marco_polo_id,
      'FINISHED',
      $ko$미겔 데 세르반테스 가상도서관의 콜럼버스 자료는 콜롬비나 도서관에 보존된 1485년판 『동방견문록』에 콜럼버스의 많은 여백 주석이 남아 있다고 설명한다. 다만 이 판본을 언제 입수하고 주석했는지는 논쟁 중이며, 1496년 이후라는 견해도 소개한다. 따라서 첫 항해의 직접 원인으로 단정하지 않고, 현존 주석본이 입증하는 정독 사실만 등록한다.$ko$,
      $en$The Miguel de Cervantes Virtual Library describes the 1485 edition of Marco Polo preserved in the Biblioteca Colombina as bearing extensive marginal annotations by Columbus. It also notes a serious chronology dispute, including the view that the books were acquired and annotated after 1496. This entry therefore records the surviving evidence of close reading without presenting the volume as a proven cause of the first voyage.$en$,
      'https://www.cervantesvirtual.com/portales/cristobal_colon/cristobal_colon/',
      false
    ),
    (
      '57b1cb45-79bb-4171-ad58-e714a89c6b2f'::uuid,
      theogony_id,
      'FINISHED',
      $ko$디오게네스 라에르티오스는 아폴로도로스의 전기를 인용해, 열네 살의 에피쿠로스가 문법 교사들에게 헤시오도스의 ‘카오스’ 구절을 물었으나 설명을 듣지 못한 일을 계기로 철학에 나섰다고 전한다. 이는 『신통기』의 특정 대목과 직접 마주친 기록이다. 전편을 매일 읽었다거나 특정 감정을 느꼈다는 설명은 자료에 없어 덧붙이지 않는다.$ko$,
      $en$Diogenes Laertius, citing Apollodorus's life of Epicurus, reports that at fourteen Epicurus turned to philosophy after his teachers could not explain the passage about Chaos in Hesiod. This establishes direct engagement with a passage from the *Theogony*. It does not show that he read the entire poem every night or preserve a personal reaction, so neither claim is added.$en$,
      'https://texts.epicureanfriends.com/01-DiogenesLaertiusTen/',
      false
    ),
    (
      'e8b01b85-b1fa-4bbf-ab67-a91f16051a20'::uuid,
      lotus_sutra_id,
      'FINISHED',
      $ko$일본 천태종 공식 전기는 사이초가 798년부터 히에이산에서 『법화경』 강론회를 해마다 열었고, 801년에는 나라의 고승 열 명을 초청했다고 기록한다. 814년에도 『법화경』을 강론했으며, 817년에는 이를 중심 가르침으로 삼아 각 탑에 천 부씩 두는 사업을 추진했다. 특정 경전의 연구·강론·보급이 모두 확인돼 등록한다.$ko$,
      $en$The Tendai denomination's official biography records that Saicho held annual Lotus Sutra lecture ceremonies on Mount Hiei from 798 and invited ten senior Nara monks in 801. It also records further lectures in 814 and his 817 plan to place one thousand copies in each pagoda while treating the sutra as a central teaching. His study, teaching, and propagation of the named text are all directly documented.$en$,
      'https://www.tendai.or.jp/english/',
      false
    ),
    (
      'bfd405b3-17c2-49fe-b507-f8f9a35938ea'::uuid,
      xiaoxue_id,
      'FINISHED',
      $ko$한국학중앙연구원 디지털장서각의 명성황후 홍릉비 해제는 명성황후가 왕비로 책봉된 뒤 별관에 머물며 『소학』을 비롯한 책들을 밤이 깊도록 손에서 놓지 않았다고 기록한다. 기존 감상여정처럼 여덟 살 이전의 부친 교육으로 시기를 앞당기지 않고, 자료가 밝힌 왕비 책봉 뒤 독서로 등록한다.$ko$,
      $en$The Academy of Korean Studies' Digital Jangseogak entry on the Hongneung inscription says that after her selection as queen, Empress Myeongseong stayed in a separate pavilion and kept reading *Xiaoxue* and other books late into the night. This entry follows the documented post-selection setting rather than moving the reading back into her childhood.$en$,
      'https://jsg.aks.ac.kr/dir/view?dataId=ROY_G002%2BJSK%2BKSM-WH.1897.4136-20160515.25316',
      false
    ),
    (
      'bfd405b3-17c2-49fe-b507-f8f9a35938ea'::uuid,
      xiaojing_id,
      'FINISHED',
      $ko$같은 디지털장서각 해제는 명성황후가 왕비 책봉 뒤 별관에서 『효경』을 밤늦도록 읽었다고 적는다. 작품명과 독서 시점이 함께 제시된 기록이므로 등록한다. 이 독서를 훗날의 특정 외교 판단과 직접 연결하는 자료는 아니어서 정치적 효과를 추정하지 않는다.$ko$,
      $en$The same Digital Jangseogak entry names the *Classic of Filial Piety* among the books Empress Myeongseong read late into the night after her selection as queen. The work and setting are explicit, so the reading is registered. The source does not connect this book to a specific later diplomatic decision, and no such effect is inferred.$en$,
      'https://jsg.aks.ac.kr/dir/view?dataId=ROY_G002%2BJSK%2BKSM-WH.1897.4136-20160515.25316',
      false
    ),
    (
      'bfd405b3-17c2-49fe-b507-f8f9a35938ea'::uuid,
      shiji_id,
      'FINISHED',
      $ko$디지털장서각의 해제는 명성황후가 『사기』에 통달했고 백관의 장주를 직접 읽었다고 기록한다. 『사기』는 기존 감상여정의 괄호형 추출에는 잡히지 않았지만, 같은 공공기관 사료에서 작품명과 숙독 정도가 명시돼 추가했다. 책에서 익힌 내용을 특정 정책의 원인으로 단정하지는 않는다.$ko$,
      $en$The Digital Jangseogak entry states that Empress Myeongseong had mastered Sima Qian's *Records of the Grand Historian* and personally read officials' memorials. The title was not captured by the bracket-based extraction, but the same institutional source explicitly identifies the work and the depth of study, so it is added. No particular policy is attributed to the book without further evidence.$en$,
      'https://jsg.aks.ac.kr/dir/view?dataId=ROY_G002%2BJSK%2BKSM-WH.1897.4136-20160515.25316',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '5차 user_contents 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id IN (
    'cc1b6ad3-5140-4fbc-9ace-f753cdc9ad71'::uuid,
    '368c8bc0-0e1e-441e-8240-3f957602accc'::uuid,
    '57b1cb45-79bb-4171-ad58-e714a89c6b2f'::uuid,
    'e8b01b85-b1fa-4bbf-ab67-a91f16051a20'::uuid,
    'bfd405b3-17c2-49fe-b507-f8f9a35938ea'::uuid
  )
    AND profile_type = 'CELEB'
    AND status = 'active'
    AND celeb_tier = 'light'
    AND content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '5차 full 승격 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  -- 저장 누적값을 새 연결 뒤 실제 user_contents 수와 맞춘다.
  UPDATE public.contents c
  SET user_count = counts.actual_count
  FROM (
    SELECT touched.id, count(uc.content_id)::integer AS actual_count
    FROM (
      VALUES
        (doom_id),
        (marco_polo_id),
        (theogony_id),
        (lotus_sutra_id),
        (xiaoxue_id),
        (xiaojing_id),
        (shiji_id)
    ) AS touched(id)
    LEFT JOIN public.user_contents uc
      ON uc.content_id = touched.id
    GROUP BY touched.id
  ) counts
  WHERE c.id = counts.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '5차 touched contents user_count 동기화 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('guillaume-lample', 1),
      ('christopher-columbus', 1),
      ('epicurus', 1),
      ('saicho', 1),
      ('empress-myeongseong', 3)
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
    RAISE EXCEPTION '5차 인물별 콘텐츠 수/승격 검증 실패 인물=%', wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      (doom_id),
      (marco_polo_id),
      (theogony_id),
      (lotus_sutra_id),
      (xiaoxue_id),
      (xiaojing_id),
      (shiji_id)
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
    RAISE EXCEPTION '5차 touched contents locale/thumbnail/verified 검증 실패 콘텐츠=%', wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id IN (
      'cc1b6ad3-5140-4fbc-9ace-f753cdc9ad71'::uuid,
      '368c8bc0-0e1e-441e-8240-3f957602accc'::uuid,
      '57b1cb45-79bb-4171-ad58-e714a89c6b2f'::uuid,
      'e8b01b85-b1fa-4bbf-ab67-a91f16051a20'::uuid,
      'bfd405b3-17c2-49fe-b507-f8f9a35938ea'::uuid
    )
      AND (
        NULLIF(btrim(uc.review), '') IS NULL
        OR NULLIF(btrim(uc.review_en), '') IS NULL
        OR NULLIF(btrim(uc.source_url), '') IS NULL
      )
  ) THEN
    RAISE EXCEPTION '5차 user_contents에 review/review_en/source_url 누락이 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id IN (
      doom_id,
      marco_polo_id,
      theogony_id,
      lotus_sutra_id,
      xiaoxue_id,
      xiaojing_id,
      shiji_id
    )
      AND c.user_count IS DISTINCT FROM (
        SELECT count(*)::integer
        FROM public.user_contents uc
        WHERE uc.content_id = c.id
      )
  ) THEN
    RAISE EXCEPTION '5차 touched contents의 저장 user_count와 실제 연결 수가 다릅니다.';
  END IF;
END;
$$;

COMMIT;
