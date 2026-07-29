-- 김홍도 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택:
--   BOOK  유종원 시선 — 김홍도 그림에 유종원 「어옹」 구절이 직접 묵서됨
-- 기각:
--   VIDEO  무동·풍악 장면 — 자신의 그림 소재이며 특정 영상 관람 기록 아님
--   GAME   씨름·고누놀이 — 물리 놀이이고 그림만으로 본인 참여를 확정할 수 없음
--   MUSIC  대금·거문고 연주와 풍속화 속 악대 — 곡명·창작자 없는 자가 연주·도상
--
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'a707b645-a310-4c05-a43c-7412a2ffffb8'::uuid;
  target_content_id constant text := 'e35c7520-9b46-47fa-a345-d66ad56c015e';
  target_run_id constant uuid := '2779e9bd-c9b3-411b-97cc-355d846276dd'::uuid;
  user_content_id constant uuid := 'a8f548e0-2b26-4f99-94e2-f59950956565'::uuid;
  accepted_book_finding_id constant uuid := '9680e44c-00d7-46e2-bab0-8fd16d90b11e'::uuid;
  rejected_video_finding_id constant uuid := '42c16c31-74ee-4f02-9465-722aa7d422d8'::uuid;
  rejected_game_finding_id constant uuid := '1ef8c0a0-8c47-4adf-bf6e-23c4df036e57'::uuid;
  rejected_music_finding_id constant uuid := '312417dd-80c5-4cbb-b4bf-18416dfdee45'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'kim-hong-do'
      AND p.nickname = '김홍도'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '김홍도 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '김홍도에게 이미 연결된 콘텐츠가 있습니다.';
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
  ) OR EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = target_content_id
       OR (c.external_source = 'naver_book' AND c.external_id = '9791128823107')
  ) OR EXISTS (
    SELECT 1 FROM public.content_locales cl
    WHERE cl.isbn = '9791128823107'
       OR lower(cl.title) IN (
         lower('유종원 시선'),
         lower('Selected Poems of Liu Zongyuan')
       )
  ) THEN
    RAISE EXCEPTION '김홍도 조사 실행·반영 ID 또는 『유종원 시선』 충돌 데이터가 이미 존재합니다.';
  END IF;

  INSERT INTO public.contents (
    id, type, metadata, release_date, external_source, external_id, user_count
  ) VALUES (
    target_content_id,
    'BOOK',
    jsonb_build_object(
      'publisher', '지식을만드는지식',
      'originalTitle', '柳宗元詩選',
      'translator', '류종목',
      'naverCatalogId', '32438278634',
      'includedEvidenceWork', '漁翁'
    ),
    '2017-02-16',
    'naver_book',
    '9791128823107',
    0
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '유종원 시선 contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id, locale, title, creator, thumbnail_url, description,
    isbn, publisher, sources, verified
  ) VALUES
    (
      target_content_id,
      'ko',
      '유종원 시선',
      '유종원 · 류종목',
      'https://shopping-phinf.pstatic.net/main_3243827/32438278634.20260331102227.jpg',
      '당나라 문인 유종원의 시를 류종목이 골라 옮긴 선집이다. 김홍도가 산수화에 구절을 적은 「늙은 어부(漁翁)」를 수록한다.',
      '9791128823107',
      '지식을만드는지식',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'catalogId', '32438278634',
        'contentsVerifiedAt', 'https://www.commbooks.com/%EB%8F%84%EC%84%9C/%EC%9C%A0%EC%A2%85%EC%9B%90-%EC%8B%9C%EC%84%A0/'
      ),
      true
    ),
    (
      target_content_id,
      'en',
      'Selected Poems of Liu Zongyuan',
      'Liu Zongyuan · translated by Ryu Jong-mok',
      'https://shopping-phinf.pstatic.net/main_3243827/32438278634.20260331102227.jpg',
      'A Korean selection of Liu Zongyuan''s poetry that includes “The Old Fisherman” (漁翁), the poem quoted directly on a landscape painting by Kim Hong-do.',
      '9791128823107',
      'Zmanz',
      jsonb_build_object(
        'primary', 'naver_book',
        'thumbnail', 'naver_book',
        'catalogId', '32438278634',
        'titlePolicy', 'descriptive_en_translation'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '유종원 시선 content_locales 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    user_content_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    $ko$김홍도의 「산수인물도」 오른쪽 여백에는 당나라 시인 유종원의 「어옹」 중 “어부의 탄식 소리에 산수가 짙푸르다”는 구절이 직접 적혀 있다. 인물화에 시구를 새긴 실물이 남아 있어 단순 영향 추정이 아니라 특정 작품을 읽고 회화로 해석한 흔적이 확인된다. 현대 판본은 「늙은 어부(漁翁)」를 실제 수록한 『유종원 시선』으로 연결한다.$ko$,
    $en$On the right margin of Kim Hong-do''s *Landscape with Figures* is a line from Liu Zongyuan''s poem “The Old Fisherman” (漁翁): the fisherman''s cry turns the mountains and water green. The surviving inscription identifies a specific external poem that Kim read and interpreted pictorially. This entry links a modern edition whose table of contents explicitly includes the poem.$en$,
    'https://encykorea.aks.ac.kr/Article/E0073045',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '김홍도 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = target_content_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 OR (
    SELECT c.user_count FROM public.contents c WHERE c.id = target_content_id
  ) <> 1 THEN
    RAISE EXCEPTION '유종원 시선 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-kim-hong-do-full-v1',
    'Codex',
    ARRAY['김홍도', '金弘道', '단원', '檀園', 'Kim Hong-do', 'Gim Hong-do'],
    '조선 후기 화원 김홍도(1745~1806 이후)를 조선 전기 동명 문신 김홍도(金弘度), 현대 동명이인, 자신의 그림·시조와 분리했다.',
    '한국어·한자·영문 이름과 read·poem·painting·theatre·game·music 조합으로 국립중앙박물관·한국민족문화대백과사전·우리역사넷·안산시 자료를 대조했다. 「산수인물도」에 유종원 「어옹」 구절이 직접 묵서된 실물을 확인하고, 네이버 BOOK 판본 『유종원 시선』 목차에 「늙은 어부(漁翁)」가 수록됨을 출판사에서 재검증해 1건을 연결했다. 「무동」·「씨름」·「고누놀이」는 자신의 그림 소재이고, 대금·거문고 자가 연주는 곡명·외부 창작자가 없어 나머지 유형은 기각했다.'
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
      '유종원 시선',
      '유종원',
      target_content_id,
      '김홍도 「산수인물도」에 유종원 「어옹」의 구절이 직접 묵서돼 있고, 연결 판본 목차에도 「늙은 어부(漁翁)」가 수록돼 있다.',
      NULL
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '무동·풍악 장면',
      NULL,
      NULL,
      '김홍도의 「무동」과 기록화·풍속화에는 춤과 삼현육각 악대가 묘사된다.',
      '자신이 그린 생활 장면은 특정 제목·창작자의 무대나 영상 작품을 관람했다는 기록이 아니다. 후대 김홍도 전기 영상도 사후 각색물이다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '씨름·고누놀이',
      NULL,
      NULL,
      '『단원풍속도첩』에는 「씨름」과 「고누놀이」 같은 조선 후기 놀이 장면이 있다.',
      '물리 놀이·스포츠이며 그림만으로 김홍도 본인의 참여도 확정할 수 없다. 작품 단위 디지털 GAME 이용 기록이 아니다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '대금·거문고 연주와 풍속화 속 악대',
      NULL,
      NULL,
      '안산시 자료는 김홍도가 대금과 거문고를 잘해 음악가로도 이름났다고 설명하며, 그의 풍속화에는 삼현육각 악대가 등장한다.',
      '자가 연주와 그림 속 악대는 곡명·창작자가 특정된 외부 MUSIC 감상 기록이 아니다. 자신의 연주·시조도 본인 창작 활동이라 제외한다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '김홍도 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0073045',
      'primary',
      'archive',
      'accessible',
      '김홍도 필 산수인물도 — 한국민족문화대백과사전',
      '현존 그림 오른쪽 여백에 유종원 「어옹」의 특정 구절이 직접 묵서돼 있음을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://www.commbooks.com/%EB%8F%84%EC%84%9C/%EC%9C%A0%EC%A2%85%EC%9B%90-%EC%8B%9C%EC%84%A0/',
      'secondary',
      'official_profile',
      'accessible',
      '유종원 시선 — 지식을만드는지식',
      'ISBN 9791128823107과 목차의 「늙은 어부(漁翁)」 수록을 출판사 페이지에서 확인했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://www.museum.go.kr/MUSEUM/contents/M0202010000.do?act=current&exhiSpThemId=3515965&listType=list&menuId=current&schM=view',
      'secondary',
      'official_profile',
      'accessible',
      '단원 김홍도, 시대를 그리다 — 국립중앙박물관',
      '「무동」이 김홍도의 풍속도첩 작품임을 확인하고 외부 관람작과 분리했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_30&levelId=kc_r300850',
      'secondary',
      'article',
      'accessible',
      '조선 후기 풍속화 — 우리역사넷',
      '「씨름」·「고누놀이」가 풍속화 속 생활 장면임을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.ansan.go.kr/www/common/cntnts/selectContents.do?cntnts_id=C0001113',
      'secondary',
      'official_profile',
      'accessible',
      '단원 김홍도 — 안산시청',
      '대금·거문고 연주 능력은 확인되지만 특정 외부 곡명은 제시되지 않는다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://contents.history.go.kr/mobile/km/view.do?levelId=km_034_0040_0040_0010_0030',
      'secondary',
      'article',
      'accessible',
      '삼현육각 — 우리역사넷',
      '「무동」 등에 삼현육각 편성의 악대가 그려졌다는 음악사 설명을 확인하고 본인 청취 기록과 구별했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '김홍도 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '김홍도·金弘道·단원과 read·poem·유종원·어옹·묵서 조합을 검색했다. 그림 실물의 특정 시구와 현대 판본의 실제 수록을 대조해 『유종원 시선』을 연결했다.'
      WHEN 'VIDEO' THEN
        'watched·performance·dance·무동·풍악 조합을 검색했다. 춤·악대는 자신의 그림 소재이고 생전 특정 영상·무대 관람작은 확인되지 않는다.'
      WHEN 'GAME' THEN
        'game·played·씨름·고누놀이 조합을 검색했다. 물리 놀이를 그린 장면일 뿐 본인 참여나 디지털 GAME 작품 이용 기록이 아니다.'
      WHEN 'MUSIC' THEN
        'music·song·대금·거문고·삼현육각 조합을 검색했다. 자가 연주 능력과 그림 속 악대는 확인되지만 외부 곡명·창작자·청취 기록이 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '김홍도 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '김홍도 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '김홍도 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 1
  ) THEN
    RAISE EXCEPTION '김홍도 프로필·콘텐츠 최종 검증에 실패했습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
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
    RAISE EXCEPTION '김홍도 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'accepted') = 1
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 3
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '김홍도 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
