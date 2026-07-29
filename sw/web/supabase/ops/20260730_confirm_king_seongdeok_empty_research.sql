-- 성덕왕의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 반영한다.
-- 국학 정비·공자상 안치·당 유학생 파견은 확인되지만 왕 개인의 작품 단위 소비 증거는 확인되지 않았다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '67d81340-4e3b-4e29-a90e-b79dca9e0e44'::uuid;
  target_run_id constant uuid := 'c698d3ae-5bc6-46d9-9133-482d85a7aaa9'::uuid;
  book_finding_id constant uuid := '0f444414-e963-4cb4-8292-a47c60f66456'::uuid;
  video_finding_id constant uuid := 'd0e89405-ff21-4d23-b737-499243ffb42b'::uuid;
  game_finding_id constant uuid := 'a4d2be3a-43e8-4749-9457-960dcebab62d'::uuid;
  music_finding_id constant uuid := '6d0ecc84-d7ed-4e4c-9ec1-0245e123d664'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'king-seongdeok'
      AND p.nickname = '성덕왕'
      AND p.nickname_en = 'King Seongdeok'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '성덕왕 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '성덕왕 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-king-seongdeok-empty-v1',
    'Codex',
    ARRAY['성덕왕', '김흥광', '김융기', '聖德王', '金興光', 'King Seongdeok', 'Seongdeok of Silla'],
    '신라 제33대 왕 성덕왕(재위 702~737)을 고려·조선의 동명 시호 군주, 성덕대왕신종의 발주자인 아들 경덕왕, 후대 드라마 인물과 분리했다.',
    '『삼국사기』 성덕왕 본기와 한국사데이터베이스·우리역사넷 자료를 연도별로 검토했다. 공자·십철·72제자 초상 안치, 국학·의박사·산박사 정비, 왕족의 당 국학 파견은 국가 교육 정책이지 성덕왕 개인의 특정 경전 독서가 아니다. 성덕대왕신종은 사후 경덕왕이 발원하고 혜공왕 때 완성한 유물이다. 제목 있는 공연·영상·디지털 게임·음악의 직접 소비 기록도 확인되지 않아 0건으로 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'rejected',
      '유교 경전·국학 교재 일반', NULL, NULL,
      '717년 당에서 돌아온 김수충이 공자·십철·72제자의 초상을 가져오자 성덕왕이 국학에 안치한 기록과 왕족·학생의 당 국학 파견은 확인된다.',
      '교육기관과 문묘 제도의 정비는 왕 개인이 『논어』·『효경』 등 특정 책을 읽었다는 진술이 아니다. 해당 경전이 필수 교재가 된 기록도 후대 경덕왕 시기의 제도 설명이다.'
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '성덕왕·통일신라 소재 후대 영상 일반', NULL, NULL,
      '성덕왕의 통치와 성덕대왕신종을 다룬 후대 영상은 있으나 생전 감상 작품이 아니다.',
      '본인이 관람한 제목 있는 공연·영상 기록이 없으며 후대 재현물을 개인 콘텐츠로 등록하지 않는다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '통일신라 궁중 놀이·사냥·경기 일반', NULL, NULL,
      '성덕왕 본기와 제도 자료에서 제목과 제작자가 특정되는 작품 단위 게임 소비 기록을 찾지 못했다.',
      '시대의 일반 놀이·사냥·경기를 디지털 GAME 작품으로 바꾸지 않는다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '성덕대왕신종·신라 궁중음악 일반', NULL, NULL,
      '성덕대왕신종은 성덕왕 사후 아들 경덕왕이 발원하고 혜공왕 때 완성했으며, 왕의 생전 특정 곡 감상 근거가 아니다.',
      '사후 기념 유물과 국가 의례 음악을 제목 있는 개인 청취 작품으로 추정하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '성덕왕 finding 생성 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://db.history.go.kr/ancient/level.do?levelId=sg_008r_0040_0010',
      'primary', 'archive', 'accessible',
      '삼국사기 신라본기 제8 — 성덕왕이 왕위에 오르다',
      '성덕왕 본기 전체와 주석에서 재위·외교·제도 기록을 확인했다. 왕 개인의 제목 있는 독서 진술은 없다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://contents.history.go.kr/front/hm/view.do?levelId=hm_029_0050',
      'secondary', 'official_profile', 'accessible',
      '성덕왕 대의 제도 및 문물 정비 — 우리역사넷',
      '공자와 제자 초상의 국학 안치, 의박사·산박사 신설, 물시계 설치를 국가 제도 정비로 설명한다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://db.history.go.kr/ancient/level.do?levelId=sg_008r_0040_0010',
      'primary', 'archive', 'accessible',
      '삼국사기 신라본기 제8 — 성덕왕이 왕위에 오르다',
      '연대기 기록에서 제목 있는 공연·영상 관람 사실이 확인되지 않았다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://db.history.go.kr/ancient/level.do?levelId=sg_008r_0040_0010',
      'primary', 'archive', 'accessible',
      '삼국사기 신라본기 제8 — 성덕왕이 왕위에 오르다',
      '왕의 활동 기록을 검토했으나 작품 단위 게임 소비 근거는 없다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://contents.history.go.kr/front/hm/view.do?levelId=hm_029_0050',
      'secondary', 'official_profile', 'accessible',
      '성덕왕 대의 제도 및 문물 정비 — 우리역사넷',
      '성덕왕대 문화·제도 정비를 설명하지만 특정 음악 작품의 개인 청취 기록은 제시하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '성덕왕 source 생성 행 수가 5개가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '성덕왕·김흥광·聖德王·국학·경전·읽다·논어·효경 조합으로 『삼국사기』 본기와 한국사 공식 해설을 조사했다. 국가 교육 정책만 있고 개인의 작품 단위 독서는 없다.'
      WHEN 'VIDEO' THEN
        '공연·연희·관람·영상·drama 조합을 조사했다. 후대 재현물 외에 생전 제목 있는 감상 기록은 없다.'
      WHEN 'GAME' THEN
        '놀이·바둑·장기·사냥·game 조합을 조사했다. 시대 관행과 작품 단위 디지털 게임을 구분해 0건이다.'
      WHEN 'MUSIC' THEN
        '음악·악·노래·종·성덕대왕신종 조합을 조사했다. 사후 기념종과 국가 의례를 개인의 특정 곡 청취로 확장하지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '성덕왕 scope 완료 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '성덕왕 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '성덕왕 light·confirmed_empty 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'accepted') = 0
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 5
  ) THEN
    RAISE EXCEPTION '성덕왕 조사 저장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
