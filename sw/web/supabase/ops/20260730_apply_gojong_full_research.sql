-- 고종 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택:
--   BOOK  조선책략 — 김홍집의 복명 뒤 직접 검토·회람시키고 대미 수교 노선에 반영
-- 기각:
--   VIDEO 1907년 궁중 활동사진 상영 — 관람은 확인되나 필름 제목이 전해지지 않음
--   GAME  당구 — 실제 물리 경기이며 디지털 작품이 아님
--   MUSIC 박춘재 축음기 시연 — 청취는 확인되나 녹음한 곡명이 특정되지 않음
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'daed2366-f165-43fe-adda-a554958afe3b'::uuid;
  content_id constant text := '0f11aaa3-e47d-48d4-8c12-14765b90954a';
  target_run_id constant uuid := 'db6359e7-3314-4c35-9226-baff7791835a'::uuid;
  user_content_id constant uuid := 'b97d70a4-8648-4bf4-837e-35d7c15b6de0'::uuid;
  accepted_book_finding_id constant uuid := '52a62b90-c720-46dc-be88-8665daa9dc89'::uuid;
  rejected_video_finding_id constant uuid := '7d52de97-9b1a-4428-a338-77bd00c718ff'::uuid;
  rejected_game_finding_id constant uuid := '2496938d-13ab-49b4-aa38-dc1823111376'::uuid;
  rejected_music_finding_id constant uuid := '85c1e307-5d23-48ec-9247-5cd96b5f8a48'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'gojong'
      AND p.nickname = '고종'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '고종 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '고종에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      accepted_book_finding_id,
      rejected_video_finding_id,
      rejected_game_finding_id,
      rejected_music_finding_id
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = user_content_id
  ) THEN
    RAISE EXCEPTION '고종 조사 실행 또는 이번 반영 ID가 이미 존재합니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id = content_id
       OR (c.external_source = 'naver_book' AND c.external_id = '9788908062290')
  ) OR EXISTS (
    SELECT 1
    FROM public.content_locales cl
    WHERE cl.isbn = '9788908062290'
       OR lower(cl.title) IN (
         lower('조선책략'),
         lower('A Strategy for Korea'),
         lower('Private Proposals for Korea''s Strategy')
       )
  ) THEN
    RAISE EXCEPTION '『조선책략』과 충돌하는 콘텐츠·외부 ID·ISBN·제목이 이미 존재합니다.';
  END IF;

  INSERT INTO public.contents (
    id, type, metadata, release_date, external_source, external_id, user_count
  ) VALUES (
    content_id,
    'BOOK',
    jsonb_build_object(
      'naverLink', 'https://search.shopping.naver.com/book/catalog/32492209964',
      'originalTitle', '私擬朝鮮策略',
      'originalPublicationYear', 1880,
      'translator', '김승일'
    ),
    '2007-06-05',
    'naver_book',
    '9788908062290',
    0
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '『조선책략』 contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id, locale, title, creator, thumbnail_url, description,
    isbn, publisher, sources, verified
  ) VALUES
    (
      content_id,
      'ko',
      '조선책략',
      '황준헌',
      'https://shopping-phinf.pstatic.net/main_3249220/32492209964.20260101071530.jpg',
      '청나라 외교관 황준헌이 1880년 조선에 러시아 견제와 중국·일본·미국과의 연대를 제안한 외교 정책서다.',
      '9788908062290',
      '범우사',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'url', 'https://search.shopping.naver.com/book/catalog/32492209964',
        'titlePolicy', 'naver_exact'
      ),
      true
    ),
    (
      content_id,
      'en',
      'A Strategy for Korea',
      'Huang Zunxian',
      'https://shopping-phinf.pstatic.net/main_3249220/32492209964.20260101071530.jpg',
      'An 1880 foreign-policy memorandum by Qing diplomat Huang Zunxian urging Korea to deter Russia through closer relations with China, Japan, and the United States.',
      '9788908062290',
      'Bumwoosa',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'url', 'https://search.shopping.naver.com/book/catalog/32492209964',
        'titlePolicy', 'descriptive-en-translation'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '『조선책략』 content_locales 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    user_content_id,
    target_celeb_id,
    content_id,
    'FINISHED',
    $ko$1880년 김홍집이 일본에서 황준헌의 『조선책략』을 가져와 복명하자 고종은 책을 전·현직 대신들에게 돌려 검토하게 했다. 이어 나흘 만에 이동인을 일본으로 보내 미국과 수교할 뜻을 청 공사에게 알렸고, 반대 상소 속에서도 그 노선을 밀어붙였다. 왕의 서재에 있었다는 소유 추정이 아니라 책의 논지를 검토·회람시키고 정책으로 실행한 기록이므로 등록한다.$ko$,
    $en$After Kim Hong-jip returned from Japan in 1880 with Huang Zunxian's *A Strategy for Korea*, Gojong had the memorandum circulated among current and former ministers for review. Within four days he secretly sent Yi Dong-in to Japan to communicate his decision to pursue relations with the United States, then continued that course despite fierce opposition. This is documented engagement with the work's argument, not an inference from library ownership.$en$,
    'https://contents.history.go.kr/front/nh/view.do?levelId=nh_038_0030',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '고종 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = content_id;

  IF (
    SELECT c.user_count FROM public.contents c WHERE c.id = content_id
  ) <> 1 THEN
    RAISE EXCEPTION '『조선책략』 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-gojong-full-v1',
    'Codex',
    ARRAY[
      '고종', '고종 황제', '광무제', '이희', '李㷩',
      '대한제국 고종', 'Gojong', 'Emperor Gojong', 'Gwangmu Emperor'
    ],
    '조선 제26대 국왕·대한제국 초대 황제 고종 이희(1852~1919)를 고려 고종, 당·송·청의 고종 묘호 군주, 후대 사극 속 고종과 분리했다. 집옥재 장서 소유만으로 개인 독서를 추정하지 않았고, 황실 행사·정책 발주와 사적 감상을 구분했다.',
    '한국어·한문·영어 이름 변형으로 네 유형을 조사하고 국사편찬위원회 신편 한국사, 한국사료총서, 장서각·문화사 자료를 대조했다. 고종이 『조선책략』을 대신들에게 회람·검토시키고 대미 수교 노선을 곧바로 실행한 기록을 확인해 BOOK 1건을 등록했다. 1907년 궁중 영화 관람과 박춘재 축음기 시연은 소비 행위가 있으나 작품명이 전하지 않아 기각했다. 당구는 물리 경기여서 디지털 GAME으로 등록하지 않았다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      accepted_book_finding_id,
      target_run_id,
      'BOOK',
      'accepted',
      '조선책략',
      '황준헌',
      content_id,
      '1880년 김홍집의 복명 뒤 고종이 『조선책략』을 전·현직 대신들에게 회람·검토시키고 책의 연미론에 따라 대미 수교 결심을 즉시 전달한 정책 연쇄가 기록되어 있다.',
      NULL
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '1907년 궁중 활동사진 상영',
      NULL,
      NULL,
      '1907년 5월 왕실을 대상으로 활동사진을 상영했고 원희정이 내용을 설명했다는 《만세보》 기록이 전한다.',
      '고종의 관람 행위는 확인되지만 상영 필름의 제목·제작자·줄거리가 전하지 않아 작품 단위 VIDEO로 식별할 수 없다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '당구',
      NULL,
      NULL,
      '대한제국 황실에 당구대가 도입되어 고종과 순종이 실제 당구를 즐겼다는 기록이 전한다.',
      '당구는 물리적 스포츠·놀이이며 작품 단위 디지털 GAME이 아니다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '박춘재 축음기 녹음 시연',
      '박춘재',
      NULL,
      '궁중에서 박춘재가 원통식 축음기에 소리를 녹음하고 고종이 즉시 재생음을 들었다는 일화가 사료 연구에 확인된다.',
      '당시 시연에서 녹음·재생한 곡명이 특정되지 않아 후대 박춘재 음반의 어느 곡과도 안전하게 연결할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '고종 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://db.history.go.kr/modern/level.do?levelId=sa_010_%242exp',
      'primary',
      'archive',
      'accessible',
      '수신사기록 해제, 한국사료총서',
      '황준헌이 김홍집에게 『조선책략』을 주고 귀국 뒤 조선 정부가 대미 수교를 추진한 원사료 묶음을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://contents.history.go.kr/front/nh/view.do?levelId=nh_038_0030',
      'secondary',
      'archive',
      'accessible',
      '신편 한국사 38: 개화정책의 추진',
      '고종이 책을 전·현직 대신에게 회람·검토시키고 나흘 안에 대미 수교 결심을 전달한 연쇄와 김홍집유고 인용을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0052228',
      'secondary',
      'official_profile',
      'accessible',
      '조선책략, 한국민족문화대백과사전',
      '저자·작성 배경·고종에게 헌정된 경위와 조정의 내용 이해를 교차 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://jsg.aks.ac.kr/dir/view?catePath=%EC%88%98%EC%A7%91%EB%B6%84%EB%A5%98&dataId=JSG_K2-5137',
      'primary',
      'archive',
      'accessible',
      '조선책략(朝鮮策略), 디지털장서각',
      '장서각 소장 원본의 서지와 김홍집이 황준헌에게 받아 조선에 도입한 경위를 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://search.shopping.naver.com/book/catalog/32492209964',
      'secondary',
      'official_profile',
      'accessible',
      '조선책략 네이버 도서 메타',
      '황준헌·범우사·ISBN 9788908062290·2007-06-05·표지를 대조했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://contents2.kocw.or.kr/KOCW/document/2016/handong/kangdopil/12.pdf',
      'secondary',
      'article',
      'accessible',
      '영화의 한국 보급',
      '《만세보》 1907년 5월 12일 기록을 인용해 궁중 상영과 해설자는 확인되지만 필름명은 제시하지 않음을 확인했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://www.thebilliards.kr/news/articlePrint.html?idxno=81',
      'secondary',
      'article',
      'accessible',
      '한국 당구 도입사',
      '대한제국 황실의 당구 기록을 확인하고 물리 경기와 디지털 작품을 분리했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://contents.history.go.kr/front/km/view.do?levelId=km_034_0060_0010_0020',
      'secondary',
      'archive',
      'accessible',
      '축음기의 유입과 레코드음악',
      '박춘재의 궁중 녹음·재생과 고종의 반응은 확인되지만 곡명은 사료에 없음을 확인했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 8 THEN
    RAISE EXCEPTION '고종 조사 source 생성 행 수가 8이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '고종·광무제·이희·高宗·Gojong과 독서·집옥재·책·보고·회람·read·book 조합을 검색했다. 집옥재 4만 권 장서의 단순 소유는 배제하고, 『조선책략』을 대신들에게 회람·검토시키고 책의 연미론을 정책으로 실행한 기록만 채택했다.'
      WHEN 'VIDEO' THEN
        '활동사진·영화·영사기·궁중 상영·관람·film·cinema 조합을 검색했다. 1907년 왕실 상영과 해설자는 확인되지만 상영 필름명이 없어 작품 단위 VIDEO로 등록하지 않았다.'
      WHEN 'GAME' THEN
        '당구·바둑·장기·놀이·billiards·game 조합을 검색했다. 당구는 물리 스포츠이므로 디지털 GAME에서 기각했고 특정 디지털 작품 기록은 확인되지 않았다.'
      WHEN 'MUSIC' THEN
        '축음기·유성기·박춘재·명창·양악대·music·phonograph 조합을 검색했다. 직접 청취는 확인되지만 박춘재 시연 곡명이 전하지 않아 특정 음반과 연결하지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '고종 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION
      '고종 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
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
    RAISE EXCEPTION '고종 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 1
  ) THEN
    RAISE EXCEPTION '고종 프로필·콘텐츠 최종 검증에 실패했습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.run_id = target_run_id
      AND f.decision = 'accepted'
      AND (
        f.content_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.user_contents uc
          WHERE uc.user_id = target_celeb_id AND uc.content_id = f.content_id
        )
        OR NOT EXISTS (
          SELECT 1 FROM public.celeb_content_research_sources src
          WHERE src.finding_id = f.id AND src.source_tier = 'primary'
        )
      )
  ) THEN
    RAISE EXCEPTION '고종 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.celeb_id = target_celeb_id
      AND r.status = 'completed'
      AND r.completed_at IS NOT NULL
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'accepted') = 1
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 3
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 8
  ) THEN
    RAISE EXCEPTION '고종 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
