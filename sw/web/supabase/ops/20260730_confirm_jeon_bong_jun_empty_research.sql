-- 전봉준 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK   동학 서적·동경대전·용담유사 — 공초는 서명을 적지 않고 특정 경전 독서를 직접 진술하지 않음
--   VIDEO  후대 전봉준 소재 공연·영상 — 사후 기념·각색물
--   GAME   동학농민전쟁 전투와 후대 게임화 — 실제 전쟁 또는 사후 수용물
--   MUSIC  새야 새야 파랑새야 — 처형 뒤 전봉준을 기린 민요
--
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '0be8a183-a400-4cd9-b2a9-27487129e0bf'::uuid;
  target_run_id constant uuid := '53b88e38-aadd-4f7b-a110-bb462b80dbd1'::uuid;
  rejected_book_finding_id constant uuid := '32002951-94b7-418d-a79c-3be6952bd902'::uuid;
  rejected_video_finding_id constant uuid := 'f29c49b9-4c70-446a-bb74-677c8cfeadf1'::uuid;
  rejected_game_finding_id constant uuid := 'c1261634-24f3-41dd-bedd-5ab646944c07'::uuid;
  rejected_music_finding_id constant uuid := '84e9bcdb-8fce-461b-8852-360538393bc3'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'jeon-bong-jun'
      AND p.nickname = '전봉준'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '전봉준 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '전봉준에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      rejected_book_finding_id,
      rejected_video_finding_id,
      rejected_game_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '전봉준 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-jeon-bong-jun-full-v1',
    'Codex',
    ARRAY['전봉준', '全琫準', '녹두장군', 'Jeon Bong-jun', 'Chon Pong-jun'],
    '동학농민운동 지도자 전봉준을 동명의 현대 인물 및 그를 소재로 한 후대 영화·공연·게임·노래와 분리했다.',
    '국문·한문·영문 이름과 read·book·동학 경전·동경대전·용담유사·공연·게임·노래 조합으로 전봉준 공초 원문과 국사편찬위원회·한국민족문화대백과사전 자료를 대조했다. 공초에는 “동학 서적 중에”라는 일반 지칭과 교리 설명이 있으나 『동경대전』·『용담유사』라는 서명이나 특정 작품을 읽었다는 직접 진술은 없다. 접주 지위와 교리 지식만으로 특정 경전 독서를 추정하지 않았다. 「새야 새야 파랑새야」는 처형 뒤 그를 기린 민요이고, 전투·후대 각색물도 생전 소비 콘텐츠가 아니다. 네 유형 모두 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '동학 서적·동경대전·용담유사',
      '최제우 저술·최시형 간행',
      NULL,
      '전봉준은 공초에서 동학을 좋아하고 접주였다고 진술하며, 괴질을 피하는 내용이 “동학 서적 중에” 있다고 답했다. 별도 역사 자료는 동학의 경전을 『동경대전』과 『용담유사』로 설명한다.',
      '공초의 표현은 서명을 특정하지 않고 전봉준이 두 경전을 읽었다고 직접 말하지도 않는다. 접주 지위·교리 지식·문구 유사성만으로 특정 작품 독서를 추정할 수 없다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '후대 전봉준 소재 공연·영상',
      NULL,
      NULL,
      '전봉준의 봉기·체포·재판은 공초와 후대 역사 서술에 남아 영화·공연·교육 영상의 소재가 되었다.',
      '생애의 실제 사건 또는 사후 기념·각색물이다. 전봉준이 생전에 관람했다고 확인되는 특정 제목·제작자의 VIDEO 작품은 없다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '동학농민전쟁 전투와 후대 게임화',
      NULL,
      NULL,
      '공초와 공식 역사 자료에는 황토현·황룡촌·우금치 전투와 봉기 과정이 상세히 남아 있다.',
      '실제 무력 충돌은 디지털 GAME 플레이가 아니며, 이를 소재로 한 후대 게임은 전봉준의 생전 소비 콘텐츠가 아니다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '새야 새야 파랑새야',
      '작자 미상 민요',
      NULL,
      '국사편찬위원회 자료는 녹두가 전봉준을 가리키며, 그의 비운과 죽음을 마음에 둔 사람들이 부른 민요라고 설명한다.',
      '전봉준의 처형 뒤 그를 기린 노래로 설명되므로 본인이 들은 작품이 될 수 없다. 생전에 들었다는 별도 일화도 확인되지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '전봉준 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://contents.history.go.kr/front/hm/view.do?levelId=hm_117_0060',
      'primary',
      'archive',
      'accessible',
      '전봉준 공초 — 사료로 본 한국사',
      '전봉준 자신의 심문 답변에서 동학 교리와 “동학 서적 중에”라는 표현을 확인했으나 특정 서명은 나오지 않는다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0080_0030_0020_0010',
      'secondary',
      'article',
      'accessible',
      '동학의 보급 — 우리역사넷',
      '『동경대전』과 『용담유사』가 최시형이 간행한 동학 경전이라는 일반 배경을 확인했으며 전봉준 개인의 독서 기록과 분리했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0049437',
      'secondary',
      'official_profile',
      'accessible',
      '전봉준 — 한국민족문화대백과사전',
      '접주 지위와 입도 이유는 확인되지만 특정 경전 독서나 소장 기록은 제시되지 않는다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://contents.history.go.kr/front/hm/view.do?levelId=hm_117_0060',
      'primary',
      'archive',
      'accessible',
      '전봉준 공초 — 사료로 본 한국사',
      '생전 사건과 진술을 전수 확인했으나 관람한 특정 공연·영상 작품은 나타나지 않는다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://contents.history.go.kr/front/hm/view.do?levelId=hm_117_0060',
      'primary',
      'archive',
      'accessible',
      '전봉준 공초 — 사료로 본 한국사',
      '봉기와 전투는 실제 역사 사건이며 작품 단위 GAME 이용 기록은 없다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m71_0080_0030_0020_0010',
      'secondary',
      'article',
      'accessible',
      '동학의 보급 — 우리역사넷',
      '「새야 새야 파랑새야」가 전봉준의 비운을 마음에 둔 농민들이 부른 노래라고 설명한다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '전봉준 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '전봉준·全琫準·Jeon Bong-jun와 read·book·동학 서적·동경대전·용담유사·공초 조합을 검색했다. 공초의 “동학 서적”은 서명 불명이며 접주·교리 지식만으로 특정 경전 독서를 추정하지 않았다.'
      WHEN 'VIDEO' THEN
        'watched·film·performance·theatre·영상 조합을 검색하고 공초·공식 생애 자료를 확인했다. 생전 특정 관람작은 없고 검색되는 것은 실제 사건의 후대 재현물이다.'
      WHEN 'GAME' THEN
        'game·played·전투·우금치·황토현 조합을 검색했다. 실제 전쟁과 후대 게임화뿐이며 전봉준의 작품 단위 GAME 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·민요·새야 새야 파랑새야 조합을 검색했다. 해당 민요는 처형 뒤 전봉준을 기린 노래이며 생전 특정 곡 청취 기록은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '전봉준 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '전봉준 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '전봉준 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '전봉준 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
