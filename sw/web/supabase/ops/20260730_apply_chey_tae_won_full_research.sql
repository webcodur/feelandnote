-- 최태원(Chey Tae-won)의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를
-- 콘텐츠, 조사 장부, 셀럽 등급에 한 트랜잭션으로 반영한다.
--
-- 채택:
--   BOOK  바른 마음 / 공정하다는 착각 / 헤이트 / 내러티브 & 넘버스
--   VIDEO 플라스틱, 바다를 삼키다
--   GAME  갤러그
--   MUSIC 특정 작품을 식별할 수 있는 근거 없음
--
-- 메타데이터:
--   BOOK  Naver Book + Open Library
--   VIDEO TMDB movie 431339
--   GAME  IGDB 2751
--
-- 이 파일은 먼저 ROLLBACK 상태로 실행해 검증한다. dry-run 통과 뒤 마지막
-- 문장을 COMMIT으로 바꾸고 프로덕션에 한 번만 적용한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'b2602d58-0fd5-4c4f-9804-c5739e44259b'::uuid;
  righteous_mind_id constant text := '48f5fc31-e0a4-4af3-b48b-3b78c3cf6da8';
  tyranny_of_merit_id constant text := 'a06b40a9-dbcc-4663-95ee-2b85c7fea70f';
  hate_id constant text := '48a67323-7c88-4b3b-882b-0ba63e8f90a7';
  narrative_numbers_id constant text := 'ae82c448-6199-4ad2-a9cf-e17d8e3902ba';
  plastic_ocean_id constant text := 'f52ba54e-71f0-4638-947b-4afb0bc6fa72';
  galaga_id constant text := 'e28cf878-d750-4403-8830-4b30f5990221';

  righteous_uc_id constant uuid := '0a3b190e-9578-4fab-9a6f-0d05acdc4ec6'::uuid;
  tyranny_uc_id constant uuid := '57b2a83f-500b-4fc9-9b61-bfac10d8ef52'::uuid;
  hate_uc_id constant uuid := 'ac8f8718-73bf-4343-843f-78b141a5b0b7'::uuid;
  narrative_uc_id constant uuid := 'd9265603-7f69-4c1e-8540-fe9db02b5f7a'::uuid;
  plastic_uc_id constant uuid := 'bcf014bd-c75f-4aab-ad2d-e4c2b1d271db'::uuid;
  galaga_uc_id constant uuid := 'a2d968a1-0e16-4fb8-b33a-598b018db452'::uuid;

  target_run_id constant uuid := '3ba6b257-4309-4be7-a1a9-55b24d1ac89f'::uuid;
  righteous_finding_id constant uuid := 'dbeadc95-d22f-4f9d-bb52-b6e91d2f6b40'::uuid;
  tyranny_finding_id constant uuid := '9765d7b8-91d9-44ff-8af8-198c808dab82'::uuid;
  hate_finding_id constant uuid := '24971e2f-f181-4658-aad0-32ed28d97d0c'::uuid;
  narrative_finding_id constant uuid := 'f147e22b-f63d-497a-b100-16f777b07df2'::uuid;
  plastic_finding_id constant uuid := 'db52b0a4-1bd2-42bf-8f80-49787debf9cf'::uuid;
  galaga_finding_id constant uuid := '4dd0fa97-b3c1-45c5-93dd-76806b240b5c'::uuid;

  affected integer;
  wrong_count integer;
  final_status text;
  final_content_count bigint;
BEGIN
  -- 동명이인이나 동시 작업을 잘못 건드리지 않도록 운영 상태를 먼저 잠근다.
  PERFORM 1
  FROM public.profiles p
  WHERE p.id = target_celeb_id
    AND p.slug = 'chey-tae-won'
    AND p.nickname = '최태원'
    AND p.nickname_en = 'Chey Tae-won'
    AND p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'open'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '최태원 프로필의 id/slug/tier/research 기준선이 달라졌습니다.';
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.user_contents uc
  WHERE uc.user_id = target_celeb_id;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '최태원에게 이미 콘텐츠가 생겼습니다. 현재 연결 수=%', wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '최태원 조사 장부 실행이 이미 존재합니다.';
  END IF;

  -- 재사용하는 바른 마음 판본과 누적값을 쓰기 직전 다시 확인한다.
  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = righteous_mind_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788901163673'
      AND c.user_count = 2
      AND (
        SELECT count(*)
        FROM public.user_contents uc
        WHERE uc.content_id = c.id
      ) = 2
      AND ko.title = '바른 마음'
      AND ko.creator = '조너선 하이트'
      AND ko.isbn = '9788901163673'
      AND en.title = 'The Righteous Mind'
      AND en.creator = 'Jonathan Haidt'
  ) THEN
    RAISE EXCEPTION '바른 마음 콘텐츠의 식별자·locale·누적값 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id IN (
      tyranny_of_merit_id,
      hate_id,
      narrative_numbers_id,
      plastic_ocean_id,
      galaga_id
    )
       OR (c.external_source = 'naver_book' AND c.external_id IN (
         '9791164136452',
         '9788960536111',
         '9791157843763'
       ))
       OR (c.external_source = 'tmdb' AND c.external_id = 'tmdb-movie-431339')
       OR (c.external_source = 'igdb' AND c.external_id = 'igdb-2751')
  ) THEN
    RAISE EXCEPTION '최태원 신규 콘텐츠의 id 또는 외부 ID가 이미 존재합니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.content_locales cl
    WHERE cl.isbn IN ('9791164136452', '9788960536111', '9791157843763')
       OR lower(cl.title) IN (
         lower('공정하다는 착각'),
         lower('헤이트(Hate)'),
         lower('내러티브 & 넘버스'),
         lower('플라스틱, 바다를 삼키다'),
         lower('A Plastic Ocean'),
         lower('갤러그'),
         lower('Galaga')
       )
  ) THEN
    RAISE EXCEPTION '최태원 신규 콘텐츠와 충돌하는 ISBN 또는 제목이 이미 존재합니다.';
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
  VALUES
    (
      tyranny_of_merit_id,
      'BOOK',
      jsonb_build_object(
        'publisher', '와이즈베리',
        'publishDate', '2020-12-01',
        'isbn', '9791164136452',
        'description', '마이클 샌델이 능력주의가 공동선과 인간의 존엄에 미치는 영향을 묻는 책이다.',
        'link', 'https://search.shopping.naver.com/book/catalog/32438169924'
      ),
      '2020-12-01',
      'naver_book',
      '9791164136452',
      0
    ),
    (
      hate_id,
      'BOOK',
      jsonb_build_object(
        'publisher', '마로니에북스',
        'publishDate', '2021-09-10',
        'isbn', '9788960536111',
        'description', '심리학·법학·미디어학·역사학·철학·인류학 연구자들이 혐오의 기원과 반복을 다룬 책이다.',
        'link', 'https://search.shopping.naver.com/book/catalog/32444877555'
      ),
      '2021-09-10',
      'naver_book',
      '9788960536111',
      0
    ),
    (
      narrative_numbers_id,
      'BOOK',
      jsonb_build_object(
        'publisher', '한빛비즈',
        'publishDate', '2020-05-20',
        'isbn', '9791157843763',
        'description', '애스워드 다모다란이 기업 가치평가에서 이야기와 숫자를 함께 쓰는 방법을 설명한 책이다.',
        'link', 'https://search.shopping.naver.com/book/catalog/32445413726'
      ),
      '2020-05-20',
      'naver_book',
      '9791157843763',
      0
    ),
    (
      plastic_ocean_id,
      'VIDEO',
      jsonb_build_object(
        'mediaType', 'movie',
        'tmdbId', 431339,
        'originalTitle', 'A Plastic Ocean',
        'releaseDate', '2016-09-22',
        'runtime', 102,
        'director', 'Craig Leeson'
      ),
      '2016-09-22',
      'tmdb',
      'tmdb-movie-431339',
      0
    ),
    (
      galaga_id,
      'GAME',
      jsonb_build_object(
        'igdbId', 2751,
        'slug', 'galaga',
        'releaseDate', '1981-09-01',
        'developer', 'Namco Limited',
        'publisher', 'Namco Limited',
        'genres', jsonb_build_array('Shooter', 'Arcade'),
        'platforms', jsonb_build_array(
          'Arcade',
          'PC-9800 Series',
          'Sharp X1',
          'FM-7',
          'Xbox 360',
          'MSX'
        )
      ),
      '1981-09-01',
      'igdb',
      'igdb-2751',
      0
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '최태원 신규 contents 생성 행 수가 5가 아닙니다. 실제=%', affected;
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
      tyranny_of_merit_id,
      'ko',
      '공정하다는 착각',
      '마이클 샌델',
      'https://shopping-phinf.pstatic.net/main_3243816/32438169924.20220801144648.jpg',
      '마이클 샌델은 능력주의가 모두에게 같은 기회를 주는지 묻고, 승자와 패자를 가르는 사회 구조를 살핀다.',
      '9791164136452',
      '와이즈베리',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'url', 'https://search.shopping.naver.com/book/catalog/32438169924'
      ),
      true
    ),
    (
      tyranny_of_merit_id,
      'en',
      'The Tyranny of Merit',
      'Michael J. Sandel',
      'https://covers.openlibrary.org/b/id/10144084-L.jpg',
      NULL,
      '9780374289980',
      'Farrar, Straus and Giroux',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryEdition', '/books/OL28209626M',
        'openLibraryWork', '/works/OL20836893W',
        'url', 'https://openlibrary.org/books/OL28209626M'
      ),
      true
    ),
    (
      hate_id,
      'ko',
      '헤이트(Hate)',
      '최인철 · 홍성수 · 김민정 · 이은주 · 최호근 · 이희수 · 한건수 · 박승찬 · 전진성',
      'https://shopping-phinf.pstatic.net/main_3244487/32444877555.20260331122055.jpg',
      '여러 분야의 연구자 아홉 명이 혐오의 역사와 현실을 추적하고, 반복을 막을 방법을 논의한다.',
      '9788960536111',
      '마로니에북스',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'url', 'https://search.shopping.naver.com/book/catalog/32444877555'
      ),
      true
    ),
    (
      hate_id,
      'en',
      'Hate: Why Does the History of Hate Repeat?',
      'Choi In-cheol et al.',
      'https://shopping-phinf.pstatic.net/main_3244487/32444877555.20260331122055.jpg',
      NULL,
      '9788960536111',
      'Maroniebooks',
      jsonb_build_object(
        'primary', 'transliteration',
        'thumbnail', 'naver_book',
        'sourceLocale', 'ko',
        'url', 'https://search.shopping.naver.com/book/catalog/32444877555'
      ),
      true
    ),
    (
      narrative_numbers_id,
      'ko',
      '내러티브 & 넘버스',
      '애스워드 다모다란',
      'https://shopping-phinf.pstatic.net/main_3244541/32445413726.20260331101155.jpg',
      '애스워드 다모다란은 기업의 이야기를 숫자로 시험하고, 숫자에 설득력 있는 이야기를 더하는 가치평가 방법을 설명한다.',
      '9791157843763',
      '한빛비즈',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'url', 'https://search.shopping.naver.com/book/catalog/32445413726'
      ),
      true
    ),
    (
      narrative_numbers_id,
      'en',
      'Narrative and Numbers',
      'Aswath Damodaran',
      'https://covers.openlibrary.org/b/id/12640002-L.jpg',
      NULL,
      '9780231180481',
      'Columbia Business School Publishing',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'openlibrary',
        'openLibraryEdition', '/books/OL27229875M',
        'openLibraryWork', '/works/OL20049852W',
        'url', 'https://openlibrary.org/books/OL27229875M'
      ),
      true
    ),
    (
      plastic_ocean_id,
      'ko',
      '플라스틱, 바다를 삼키다',
      '크레이그 리슨',
      'https://image.tmdb.org/t/p/w500/8Ry1c7rVYonb4y8ELpdxvvMQWB1.jpg',
      '크레이그 리슨과 타냐 스트리터가 세계 여러 해역을 찾아 플라스틱 오염이 바다 생물과 사람에게 미치는 영향을 추적한 다큐멘터리다.',
      NULL,
      NULL,
      jsonb_build_object('primary', 'tmdb', 'thumbnail', 'tmdb'),
      true
    ),
    (
      plastic_ocean_id,
      'en',
      'A Plastic Ocean',
      'Craig Leeson',
      'https://image.tmdb.org/t/p/w500/8Ry1c7rVYonb4y8ELpdxvvMQWB1.jpg',
      'A documentary focused on plastic pollution in the world''s oceans.',
      NULL,
      NULL,
      jsonb_build_object('primary', 'tmdb', 'thumbnail', 'tmdb'),
      true
    ),
    (
      galaga_id,
      'ko',
      '갤러그',
      '남코',
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co6njq.jpg',
      '남코가 1981년에 내놓은 아케이드 슈팅 게임이다. 플레이어는 우주선을 움직여 편대를 이룬 적을 격추한다.',
      NULL,
      'Namco',
      jsonb_build_object('primary', 'igdb', 'thumbnail', 'igdb'),
      true
    ),
    (
      galaga_id,
      'en',
      'Galaga',
      'Namco Limited',
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co6njq.jpg',
      'An arcade shooter in which the player controls a starfighter against waves of insect-like enemies.',
      NULL,
      'Namco',
      jsonb_build_object('primary', 'igdb', 'thumbnail', 'igdb'),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 10 THEN
    RAISE EXCEPTION '최태원 신규 content_locales 생성 행 수가 10이 아닙니다. 실제=%', affected;
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
  VALUES
    (
      righteous_uc_id,
      target_celeb_id,
      righteous_mind_id,
      'FINISHED',
      $ko$최태원은 2021년 10월 자신의 인스타그램에서 지금까지 읽은 책 가운데 가장 좋았던 세 권을 묻는 댓글에 조너선 하이트의 『바른 마음』을 직접 꼽았다. 본인의 독서 경험과 추천이 함께 확인돼 등록한다.$ko$,
      $en$In October 2021, Chey Tae-won answered an Instagram question about the three best books he had read and named Jonathan Haidt's *The Righteous Mind*. His own response establishes both reading and recommendation.$en$,
      'https://www.mk.co.kr/news/business/10047462',
      true
    ),
    (
      tyranny_uc_id,
      target_celeb_id,
      tyranny_of_merit_id,
      'FINISHED',
      $ko$최태원은 같은 답글에서 마이클 샌델의 『공정하다는 착각』도 가장 좋았던 세 권 가운데 하나로 꼽았다. 작품명과 독서 경험을 본인이 직접 밝혀 등록한다.$ko$,
      $en$In the same reply, Chey also placed Michael Sandel's *The Tyranny of Merit* among the three best books he had read. His first-person answer identifies both the title and the reading experience.$en$,
      'https://www.mk.co.kr/news/business/10047462',
      true
    ),
    (
      hate_uc_id,
      target_celeb_id,
      hate_id,
      'FINISHED',
      $ko$최태원은 자신의 인스타그램에서 『헤이트』를 가을 추천도서로 소개하고, 가짜뉴스와 혐오의 역사를 다룬 대목을 강하게 추천했다. 이어 지금까지 읽은 책 가운데 가장 좋았던 세 권에도 이 책을 넣었다.$ko$,
      $en$On Instagram, Chey presented *Hate* as an autumn recommendation and highlighted its treatment of fake news and the history of hatred. He also included it among the three best books he had read.$en$,
      'https://www.mk.co.kr/news/business/10047462',
      true
    ),
    (
      narrative_uc_id,
      target_celeb_id,
      narrative_numbers_id,
      'FINISHED',
      $ko$최태원은 2020년 SK 확대경영회의에서 계열사 CEO들에게 숫자에 의미를 더하는 성장 스토리텔러가 되라고 주문하며 『내러티브 & 넘버스』를 추천했다. 회의 참석자에게 특정 작품을 읽도록 권한 기록이 확인돼 등록한다.$ko$,
      $en$At SK's 2020 Expanded Management Meeting, Chey urged affiliate CEOs to become growth storytellers who give meaning to numbers and recommended *Narrative and Numbers*. Contemporary reporting records his recommendation of the specific book to the executives present.$en$,
      'https://www.newspim.com/news/view/20200625001119',
      true
    ),
    (
      plastic_uc_id,
      target_celeb_id,
      plastic_ocean_id,
      'FINISHED',
      $ko$최태원은 2020년 SK 전 구성원에게 보낸 이메일에서 ESG에 관한 영감을 얻을 다큐멘터리로 「플라스틱, 바다를 삼키다」를 추천했다. 이듬해 대한상의 직원들과 만난 자리에서는 가장 기억에 남는 영화로 다시 이 작품을 꼽았다. 추천과 실제 관람 뒤의 기억이 모두 확인돼 등록한다.$ko$,
      $en$In a 2020 email to all SK employees, Chey recommended *A Plastic Ocean* as a documentary that could inspire thinking about ESG. The following year, speaking with Korea Chamber of Commerce staff, he again named it as the film he remembered most. The two records establish both recommendation and viewing.$en$,
      'https://www.sk.co.kr/ko/media/news_view.jsp?idx=1434',
      true
    ),
    (
      galaga_uc_id,
      target_celeb_id,
      galaga_id,
      'FINISHED',
      $ko$최태원은 2021년 자신의 인스타그램에 갤럭시 Z 폴드로 「갤러그」를 플레이하는 사진을 올리고 “추억의 갤러그 게임”이라고 적었다. 특정 게임의 실제 플레이 장면과 본인 설명이 함께 남아 있어 등록한다.$ko$,
      $en$In 2021, Chey posted an Instagram photo of himself playing *Galaga* on a Galaxy Z Fold and captioned it as a nostalgic Galaga game. The image and his own caption identify direct play of the specific title.$en$,
      'https://www.etoday.co.kr/news/view/2052599',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '최태원 user_contents 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer
    FROM public.user_contents uc
    WHERE uc.content_id = c.id
  )
  WHERE c.id IN (
    righteous_mind_id,
    tyranny_of_merit_id,
    hate_id,
    narrative_numbers_id,
    plastic_ocean_id,
    galaga_id
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '최태원 touched contents user_count 동기화 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  -- 조사 실행을 만들면 네 유형 scope가 자동 생성되고 프로필은 researching으로 바뀐다.
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
    '2026-07-30-chey-tae-won-full-v1',
    'Codex',
    ARRAY[
      '최태원',
      '최태원 SK',
      'Chey Tae-won',
      'Tony Chey',
      'papatonybear'
    ],
    '프로야구 선수 최태원과 동명이인이다. SK그룹 회장, 대한상공회의소 회장, papatonybear 계정 맥락으로만 채택했다.',
    '한국어·영어 표기와 공식 SK 자료, 본인 SNS를 인용한 기사, 인터뷰·생활 기사에서 BOOK·VIDEO·GAME·MUSIC을 각각 검색했다. 책 4권, 다큐멘터리 1편, 게임 1종을 채택했다. 특정 곡이나 음반을 식별할 수 있는 음악 감상 근거는 이번 조사에서 확인하지 못했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id,
    run_id,
    content_type,
    decision,
    title,
    creator,
    content_id,
    evidence_summary
  )
  VALUES
    (
      righteous_finding_id,
      target_run_id,
      'BOOK',
      'accepted',
      '바른 마음',
      '조너선 하이트',
      righteous_mind_id,
      '본인이 인스타그램에서 지금까지 읽은 책 중 베스트 3권을 묻는 질문에 직접 꼽았다.'
    ),
    (
      tyranny_finding_id,
      target_run_id,
      'BOOK',
      'accepted',
      '공정하다는 착각',
      '마이클 샌델',
      tyranny_of_merit_id,
      '본인이 인스타그램에서 지금까지 읽은 책 중 베스트 3권을 묻는 질문에 직접 꼽았다.'
    ),
    (
      hate_finding_id,
      target_run_id,
      'BOOK',
      'accepted',
      '헤이트(Hate)',
      '최인철 외',
      hate_id,
      '본인이 가을 추천도서로 소개하고 베스트 3권에도 넣었다.'
    ),
    (
      narrative_finding_id,
      target_run_id,
      'BOOK',
      'accepted',
      '내러티브 & 넘버스',
      '애스워드 다모다란',
      narrative_numbers_id,
      '2020년 SK 확대경영회의에서 계열사 CEO들에게 읽도록 추천했다.'
    ),
    (
      plastic_finding_id,
      target_run_id,
      'VIDEO',
      'accepted',
      '플라스틱, 바다를 삼키다',
      '크레이그 리슨',
      plastic_ocean_id,
      'SK 전 구성원에게 추천했고, 이듬해 가장 기억에 남는 영화로 다시 꼽았다.'
    ),
    (
      galaga_finding_id,
      target_run_id,
      'GAME',
      'accepted',
      '갤러그',
      '남코',
      galaga_id,
      '본인 인스타그램에 직접 플레이하는 사진과 게임명을 함께 올렸다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '최태원 조사 장부 finding 생성 행 수가 6이 아닙니다. 실제=%', affected;
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
      righteous_finding_id,
      'https://www.mk.co.kr/news/business/10047462',
      'primary',
      'direct_statement',
      'accessible',
      '최태원 인스타그램 추천 도서 3권',
      '본인 인스타그램 댓글의 질문과 답변을 화면 인용과 함께 보존한 기사다.'
    ),
    (
      target_run_id,
      'BOOK',
      tyranny_finding_id,
      'https://www.mk.co.kr/news/business/10047462',
      'primary',
      'direct_statement',
      'accessible',
      '최태원 인스타그램 추천 도서 3권',
      '본인 인스타그램 댓글의 질문과 답변을 화면 인용과 함께 보존한 기사다.'
    ),
    (
      target_run_id,
      'BOOK',
      hate_finding_id,
      'https://www.mk.co.kr/news/business/10047462',
      'primary',
      'direct_statement',
      'accessible',
      '최태원 인스타그램 추천 도서 3권',
      '가을 추천도서, 강한 추천, 베스트 3권 답변이 함께 기록돼 있다.'
    ),
    (
      target_run_id,
      'BOOK',
      narrative_finding_id,
      'https://www.newspim.com/news/view/20200625001119',
      'primary',
      'article',
      'accessible',
      '최태원 SK 회장의 특명, CEO들 이 책 읽어라',
      '2020년 확대경영회의 직후 추천 작품과 발언 맥락을 보도했다.'
    ),
    (
      target_run_id,
      'BOOK',
      narrative_finding_id,
      'https://www.yna.co.kr/view/AKR20230719010651003',
      'secondary',
      'article',
      'accessible',
      'SK CEO들이 추천한 여름휴가 필독서',
      'SK그룹 설명을 바탕으로 2020년의 책 소개를 다시 확인한 기사다.'
    ),
    (
      target_run_id,
      'VIDEO',
      plastic_finding_id,
      'https://www.sk.co.kr/ko/media/news_view.jsp?idx=1434',
      'primary',
      'official_profile',
      'accessible',
      '최태원 회장, 코로나19 환경 오히려 딥체인지 위한 기회',
      'SK 공식 뉴스가 전 구성원 이메일의 다큐멘터리 추천을 보존한다.'
    ),
    (
      target_run_id,
      'VIDEO',
      plastic_finding_id,
      'https://www.yna.co.kr/view/AKR20210304158900003',
      'secondary',
      'article',
      'accessible',
      '최태원 회장, 대한상의 직원들과 온라인으로 상견례',
      '가장 기억에 남는 영화로 같은 작품을 다시 꼽은 사실을 확인했다.'
    ),
    (
      target_run_id,
      'GAME',
      galaga_finding_id,
      'https://www.etoday.co.kr/news/view/2052599',
      'primary',
      'direct_statement',
      'accessible',
      'MZ세대와 소통, 회장님은 지금 인스타그램 중',
      '본인 SNS의 갤러그 플레이 장면과 “추억의 갤러그 게임” 설명을 보존한다.'
    ),
    (
      target_run_id,
      'GAME',
      galaga_finding_id,
      'https://www.instagram.com/papatonybear/',
      'primary',
      'social_post',
      'bot_blocked',
      '최태원 개인 인스타그램',
      '원 게시 계정이다. 자동 접근은 차단됐으며 기사에 당시 게시물 화면과 설명이 남아 있다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://www.etoday.co.kr/news/view/2052599',
      'secondary',
      'article',
      'accessible',
      'MZ세대와 소통, 회장님은 지금 인스타그램 중',
      'SNS 생활 게시물과 취미를 다룬 기사까지 확인했으나 특정 곡·음반·아티스트 감상은 나오지 않는다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://www.instagram.com/papatonybear/',
      'primary',
      'social_post',
      'bot_blocked',
      '최태원 개인 인스타그램',
      '“음악 추천”, “좋아하는 노래·앨범”, 영문 표기 변형 검색을 함께 진행했다. 자동 접근은 차단됐고 식별 가능한 음악 작품은 이번 조사에서 찾지 못했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 11 THEN
    RAISE EXCEPTION '최태원 조사 장부 source 생성 행 수가 11이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed',
      completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN
          '최태원·Chey Tae-won·Tony Chey와 독서·추천·책·reading·book 조합을 검색했다. 공식 SK 자료, 본인 SNS 인용 기사, 경영회의 보도를 대조하고 Naver Book·Open Library로 판본을 확인했다. 4권 채택.'
        WHEN 'VIDEO' THEN
          '영화·다큐멘터리·시청·추천·favorite film 조합과 공식 SK 자료를 검색했다. 플라스틱, 바다를 삼키다의 추천과 실제 관람 뒤 기억을 독립된 두 기록에서 확인했다. TMDB movie 431339로 매칭했다.'
        WHEN 'GAME' THEN
          '게임·플레이·취미·갤러그·Galaga 조합과 SNS 생활 기사를 검색했다. 본인이 플레이하는 사진과 설명을 확인하고 IGDB 2751로 매칭했다.'
        WHEN 'MUSIC' THEN
          '음악 추천·좋아하는 노래·앨범·playlist·favorite music/song/album 조합으로 한국어·영어 검색을 진행하고 SNS 생활 기사와 공식 자료를 대조했다. 작품명과 아티스트를 함께 식별할 수 있는 감상 근거는 이번 조사에서 확인하지 못했다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '최태원 조사 장부 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO final_status, final_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF final_status IS DISTINCT FROM 'open' OR final_content_count <> 6 THEN
    RAISE EXCEPTION
      '최태원 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
      final_status,
      final_content_count;
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
    RAISE EXCEPTION '최태원 light → full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  -- 최종 불변식: 콘텐츠·locale·원장·프로필을 한 번에 검사한다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      (righteous_mind_id, 'BOOK', 3),
      (tyranny_of_merit_id, 'BOOK', 1),
      (hate_id, 'BOOK', 1),
      (narrative_numbers_id, 'BOOK', 1),
      (plastic_ocean_id, 'VIDEO', 1),
      (galaga_id, 'GAME', 1)
  ) expected(content_id, content_type, expected_user_count)
  LEFT JOIN public.contents c
    ON c.id = expected.content_id
  WHERE c.id IS NULL
     OR c.type IS DISTINCT FROM expected.content_type
     OR c.user_count IS DISTINCT FROM expected.expected_user_count
     OR (
       SELECT count(*)
       FROM public.user_contents uc
       WHERE uc.content_id = expected.content_id
     ) <> expected.expected_user_count
     OR (
       SELECT count(*)
       FROM public.content_locales cl
       WHERE cl.content_id = expected.content_id
         AND cl.locale IN ('ko', 'en')
         AND cl.verified = true
         AND NULLIF(btrim(cl.title), '') IS NOT NULL
         AND NULLIF(btrim(cl.creator), '') IS NOT NULL
         AND NULLIF(btrim(cl.thumbnail_url), '') IS NOT NULL
     ) <> 2;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '최태원 touched content 불변식 실패 콘텐츠=%', wrong_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND p.content_research_updated_at IS NOT NULL
      AND p.content_research_confirmed_empty_at IS NULL
      AND (
        SELECT count(*)
        FROM public.user_contents uc
        WHERE uc.user_id = p.id
      ) = 6
  ) THEN
    RAISE EXCEPTION '최태원 최종 tier/research/content 상태 검증에 실패했습니다.';
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
          AND f.decision = 'accepted'
      ) = 6
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_sources src
        WHERE src.run_id = r.id
      ) = 11
  ) THEN
    RAISE EXCEPTION '최태원 조사 장부 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
