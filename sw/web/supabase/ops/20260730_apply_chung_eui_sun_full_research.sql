-- 정의선 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 원장과 함께 반영한다.
-- 채택:
--   BOOK  피터 드러커의 최고의 질문
-- 기각:
--   MUSIC 학창 시절 클라리넷 연주(곡명 미상) — 특정 작품 식별 불가
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'da72c7b5-ff8f-4b93-8425-40e169fdb614'::uuid;
  content_id constant text := 'dd43382d-dd99-480d-848b-b015e585562a';
  user_content_id constant uuid := '75f71be7-ad68-4f3a-b56c-1e883a39c892'::uuid;
  target_run_id constant uuid := '2cf7c677-6269-4d2f-924e-5e9124130cdf'::uuid;
  accepted_finding_id constant uuid := '4f5fabb1-15a3-445e-b420-686ae0026da1'::uuid;
  rejected_music_finding_id constant uuid := 'dcd700ae-997e-474b-aebf-a0332cae7de0'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'chung-eui-sun'
      AND p.nickname = '정의선'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '정의선 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '정의선에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id
       OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '정의선 조사 실행 또는 이번 실행 ID가 이미 존재합니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id = content_id
  ) OR EXISTS (
    SELECT 1
    FROM public.content_locales cl
    WHERE cl.isbn IN ('9791130612157', '9781118979594')
       OR lower(cl.title) IN (
         lower('피터 드러커의 최고의 질문'),
         lower('Peter Drucker''s Five Most Important Questions')
       )
  ) THEN
    RAISE EXCEPTION '최고의 질문과 충돌하는 콘텐츠 ID, ISBN 또는 제목이 이미 존재합니다.';
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
  VALUES (
    content_id,
    'BOOK',
    jsonb_build_object(
      'publisher', '다산북스',
      'publishDate', '2017-04-21',
      'isbn', '9791130612157',
      'description', '피터 드러커의 다섯 질문을 오늘의 조직과 리더십에 적용하도록 여러 경영 사상가와 리더의 해설을 더한 책이다.',
      'link', 'https://search.shopping.naver.com/book/catalog/32467569977'
    ),
    '2017-04-21',
    'naver_book',
    '9791130612157',
    0
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '정의선 신규 contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
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
      content_id,
      'ko',
      '피터 드러커의 최고의 질문',
      '피터 드러커 · 프랜시스 헤셀바인',
      'https://shopping-phinf.pstatic.net/main_3246756/32467569977.20260331094928.jpg',
      '조직의 사명, 고객, 고객 가치, 결과, 계획이라는 다섯 질문을 통해 리더가 무엇을 점검해야 하는지 설명한다.',
      '9791130612157',
      '다산북스',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'url', 'https://search.shopping.naver.com/book/catalog/32467569977'
      ),
      true
    ),
    (
      content_id,
      'en',
      'Peter Drucker''s Five Most Important Questions',
      'Peter F. Drucker · Frances Hesselbein · Joan Snyder Kuhl',
      'https://shopping-phinf.pstatic.net/main_3246756/32467569977.20260331094928.jpg',
      'An updated guide to the five questions leaders can use to examine an organization''s mission, customers, value, results, and plan.',
      '9781118979594',
      'John Wiley & Sons',
      jsonb_build_object(
        'primary', 'openlibrary',
        'thumbnail', 'naver_book',
        'sourceLocale', 'ko',
        'openLibraryEdition', '/books/OL28549088M',
        'openLibraryWork', '/works/OL2721787W',
        'url', 'https://openlibrary.org/books/OL28549088M'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '정의선 신규 content_locales 생성 행 수가 2가 아닙니다. 실제=%', affected;
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
  VALUES (
    user_content_id,
    target_celeb_id,
    content_id,
    'FINISHED',
    $ko$정의선은 2019년 현대자동차그룹 임원들에게 피터 드러커의 『최고의 질문』을 건네고, 이 책을 바탕으로 고객과 고객 가치를 다시 묻는 토론을 이끌었다. 당시 책을 직접 받은 임원의 회고와 동시대 보도가 일치해 추천 콘텐츠로 등록한다.$ko$,
    $en$In 2019, Chung Eui-sun gave Hyundai Motor Group executives Peter Drucker's *Five Most Important Questions* and led discussions that reconsidered the customer and customer value through the book. A firsthand recollection from an executive who received it matches contemporary reporting, so it is registered as a recommendation.$en$,
    'https://www.fnnews.com/news/202406201614308358',
    true
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '정의선 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer
    FROM public.user_contents uc
    WHERE uc.content_id = c.id
  )
  WHERE c.id = content_id;

  IF (
    SELECT c.user_count
    FROM public.contents c
    WHERE c.id = content_id
  ) <> 1 THEN
    RAISE EXCEPTION '최고의 질문 user_count 동기화에 실패했습니다.';
  END IF;

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
    '2026-07-30-chung-eui-sun-full-v1',
    'Codex',
    ARRAY[
      '정의선',
      '정의선 현대차',
      '정의선 현대자동차그룹',
      'Chung Eui-sun',
      'Euisun Chung'
    ],
    '현대자동차그룹 회장이 아닌 동명이인과 정의선의 부친 정몽구·조부 정주영, 사촌 정기선의 발언을 제외했다.',
    '한국어·영어 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색했다. BOOK 1건을 채택했다. 학창 시절 클라리넷 활동은 확인했지만 곡명이 없어 MUSIC 후보에서 기각했고, 영화·게임은 특정 작품에 대한 감상·추천 근거를 찾지 못했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id,
    run_id,
    content_type,
    decision,
    title,
    creator,
    content_id,
    evidence_summary,
    rejection_reason
  )
  VALUES
    (
      accepted_finding_id,
      target_run_id,
      'BOOK',
      'accepted',
      '피터 드러커의 최고의 질문',
      '피터 드러커 · 프랜시스 헤셀바인',
      content_id,
      '2019년 정의선이 임원들에게 책을 직접 건네고 이 책을 주제로 고객 가치 토론을 이끌었다는 당시 참가 임원의 회고와 복수 보도가 확인된다.',
      NULL
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '학창 시절 클라리넷 연주(곡명 미상)',
      NULL,
      NULL,
      '정의선이 학창 시절 클라리넷을 즐겨 연주하고 음악 동아리에서 활동했다는 인물 기사가 있다.',
      '곡명과 작곡가가 특정되지 않는 연주 활동이므로 작품 단위 MUSIC 콘텐츠로 등록할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '정의선 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
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
      accepted_finding_id,
      'https://www.fnnews.com/news/202406201614308358',
      'primary',
      'direct_statement',
      'accessible',
      '현대차 ''인류 향한 진보''…이동의 열망을 사업으로 바꾸다',
      '지성원 현대차그룹 본부장이 2019년 정의선에게 이 책을 직접 받으며 들은 과제를 회고한다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_finding_id,
      'https://economychosun.com/site/data/html_dir/2021/08/09/2021080900046.html',
      'secondary',
      'article',
      'accessible',
      '정의선 현대차그룹 회장, 최고의 질문 임원들에게 일일이 권한 책',
      '정의선의 추천과 고객 중심 추천 이유를 독립적으로 정리한 기사다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_finding_id,
      'https://search.shopping.naver.com/book/catalog/32467569977',
      'secondary',
      'official_profile',
      'accessible',
      '피터 드러커의 최고의 질문 네이버 도서 메타',
      '한국어판 ISBN 9791130612157, 다산북스, 2017-04-21과 표지를 대조했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_finding_id,
      'https://openlibrary.org/books/OL28549088M',
      'secondary',
      'official_profile',
      'accessible',
      'Peter Drucker''s Five Most Important Questions',
      '영문판 ISBN 9781118979594, 2015, Wiley와 work OL2721787W를 대조했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://www.hyundaimotorgroup.com/ko/news/hyundai-motor-group-future-mobility-leadership',
      'primary',
      'interview',
      'accessible',
      '현대차그룹, 미래 모빌리티 리더십 강화',
      '정의선의 장문 서면 인터뷰를 확인하고 영화·다큐멘터리·TV 작품명과 관람·추천 발언을 검색했으나 특정 작품을 찾지 못했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://www.ceomagazine.co.kr/ko-kr/articles/32492',
      'secondary',
      'article',
      'accessible',
      '조성일 대기자의 CEO 탐구: 정의선',
      '장문 인물 기사에서 영화·영상 취향과 작품명을 확인했으나 등록할 작품 단위 근거가 없었다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://www.hyundaimotorgroup.com/ko/amp/CONT0000000000166652',
      'primary',
      'transcript',
      'accessible',
      '현대자동차그룹, HMGICS 타운홀 미팅',
      '공식 타운홀 기록과 한국어·영어 이름 변형의 게임·플레이·e스포츠 검색을 대조했으나 특정 게임 이용 발언을 찾지 못했다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://www.hyundaimotorgroup.com/ko/news/CONT0000000000169687',
      'primary',
      'official_profile',
      'accessible',
      '정의선 회장, KIA 타이거즈 스프링캠프 깜짝 격려 방문',
      '스포츠·경기 관련 검색에서 노출된 공식 기록을 확인했으나 디지털·보드·콘솔 게임 작품의 플레이 근거와 혼동하지 않았다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.seoul.co.kr/news/plan/corporate-industry-narrative-2024/2024/06/04/20240604017003',
      'secondary',
      'article',
      'accessible',
      '새벽 밥상머리 교육이 키운 정의선',
      '학창 시절 클라리넷 연주와 음악 동아리 활동은 확인되지만 곡명·작곡가가 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 9 THEN
    RAISE EXCEPTION '정의선 조사 source 생성 행 수가 9가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '정의선·정의선 현대차·Chung Eui-sun·Euisun Chung과 추천 책·읽은 책·독서·book·reading 조합을 검색했다. 2019년 임원에게 건네고 함께 토론한 『피터 드러커의 최고의 질문』 1건을 채택하고 네이버 도서와 OpenLibrary로 판본을 확인했다.'
      WHEN 'VIDEO' THEN
        '좋아하는 영화·추천 영화·관람·다큐멘터리·favorite movie·film·documentary 조합과 현대차그룹 공식 장문 인터뷰·타운홀·인물 기사를 확인했다. 특정 작품에 대한 시청·추천 근거를 찾지 못했다.'
      WHEN 'GAME' THEN
        '게임·플레이·즐기는 게임·e스포츠·video game·plays 조합을 한국어·영어 이름 변형으로 검색하고 공식 타운홀과 스포츠 관련 결과를 확인했다. 실제 플레이한 특정 작품 근거는 없었다.'
      WHEN 'MUSIC' THEN
        '좋아하는 음악·노래·앨범·콘서트·클라리넷·favorite music·song·album 조합을 검색했다. 클라리넷 연주 활동은 확인했지만 작품명과 창작자가 특정되지 않아 기각했다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '정의선 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT
    result.final_research_status,
    result.actual_content_count
  INTO
    completed_status,
    completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION
      '정의선 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
      completed_status,
      completed_content_count;
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
    RAISE EXCEPTION '정의선 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (
        SELECT count(*)
        FROM public.user_contents uc
        WHERE uc.user_id = p.id
      ) = 1
  ) THEN
    RAISE EXCEPTION '정의선 프로필·콘텐츠 최종 검증에 실패했습니다.';
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
      ) = 2
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_sources src
        WHERE src.run_id = r.id
      ) = 9
  ) THEN
    RAISE EXCEPTION '정의선 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
