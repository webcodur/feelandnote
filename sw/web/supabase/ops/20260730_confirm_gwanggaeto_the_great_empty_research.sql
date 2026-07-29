-- 광개토대왕 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  광개토왕릉비 — 사후 아들 장수왕이 세운 능비이며 본인의 독서물이 아님
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'a2d32ac5-ff5b-4737-a137-76af22260cca'::uuid;
  target_run_id constant uuid := '6ddd4fe3-ee8f-42cd-97c2-f2e8ab8ece8b'::uuid;
  rejected_book_finding_id constant uuid := '8e77ba30-bec3-4cc7-a482-8b1786dbf812'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'gwanggaeto-the-great'
      AND p.nickname = '광개토대왕'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '광개토대왕 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '광개토대왕에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.id = rejected_book_finding_id
  ) THEN
    RAISE EXCEPTION '광개토대왕 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
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
    '2026-07-30-gwanggaeto-the-great-full-v1',
    'Codex',
    ARRAY[
      '광개토대왕',
      '광개토왕',
      '호태왕',
      '담덕',
      'Gwanggaeto the Great',
      'King Gwanggaeto',
      '廣開土王',
      '談德'
    ],
    '고구려 제19대 왕 담덕(374~412)을 현대 작품 제목·게임 캐릭터·동상·함선명과 분리했다. 광개토왕을 소재로 한 후대 사극·소설·게임·음악과 사후에 세운 능비는 본인의 소비 기록에서 제외했다.',
    '한국어·영어·한자 이름과 왕호 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 『삼국사기』 광개토왕조, 광개토왕릉비 원문·해제와 국사편찬위원회 생애 자료를 대조했다. 능비는 414년 장수왕대의 사후 기념·통치 기록이며, 평양 9사 건립은 국가 불교 후원이지 특정 불경·찬가 감상 기록이 아니다. 작품 단위의 독서·관람·플레이·음악 감상 근거는 네 유형 모두 0건이다.'
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
  VALUES (
    rejected_book_finding_id,
    target_run_id,
    'BOOK',
    'rejected',
    '광개토왕릉비',
    '고구려 장수왕대 건립',
    NULL,
    '광개토왕릉비는 광개토왕 사후인 414년, 장수왕 3년에 세워져 왕계·정복 활동·수묘인 규정을 기록했다.',
    '광개토왕이 생전에 읽거나 선택한 외부 저작이 아니라 아들 장수왕대에 세운 사후 능비다. 기념·기록 대상 관계를 개인 독서로 바꾸지 않는다.'
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '광개토대왕 조사 finding 생성 행 수가 1이 아닙니다. 실제=%', affected;
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
      rejected_book_finding_id,
      'https://db.history.go.kr/ancient/level.do?levelId=gskh_001_0010_0010_0010',
      'primary',
      'archive',
      'accessible',
      '한국 고대 사료 DB 광개토왕릉비',
      '비의 연대가 장수왕 3년인 414년이고 왕계·훈적·수묘인 규정을 담은 사후 능비라는 자료 성격을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_10&levelId=kc_n100500',
      'secondary',
      'official_profile',
      'accessible',
      '우리역사넷 광개토왕',
      '광개토왕릉비가 사후 세워졌고 생전에는 영락대왕 호칭을 썼다는 설명을 확인했다. 개인 독서물로 볼 근거가 없다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://db.history.go.kr/ancient/level.do?levelId=sg_018r_0050_0010',
      'primary',
      'archive',
      'accessible',
      '『삼국사기』 광개토왕 즉위 기사',
      '담덕의 즉위와 생애 기록을 watched·theatre·performance·painting 조합으로 대조했다. 특정 공연·시각 작품을 보았다는 기록은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://contents.history.go.kr/mobile/hm/view.do?levelId=hm_009_0040',
      'secondary',
      'article',
      'accessible',
      '우리역사넷 광개토왕의 영역 확장',
      '비문에 나타난 친솔·교견형 전쟁과 군사 활동을 확인했다. 실제 전쟁·군사 전략은 작품 단위 디지털 GAME 플레이 기록이 아니다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_n101700',
      'secondary',
      'official_profile',
      'accessible',
      '우리역사넷 장수왕',
      '광개토왕이 평양에 절을 세웠다는 국가 불교 후원 맥락을 교차 확인했다. 특정 경전명·찬가명·연주·청취 행위는 제시되지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '광개토대왕 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '광개토대왕·광개토왕·담덕·Gwanggaeto·廣開土王과 read·book·scripture·stele·비문 조합을 검색했다. 광개토왕릉비는 414년 장수왕대 사후 기록이고, 평양 9사 창건은 특정 불경 독서의 증거가 아니다.'
      WHEN 'VIDEO' THEN
        '광개토왕·담덕과 watched·theatre·performance·visual art·film 조합을 『삼국사기』와 공식 생애 자료에서 검색했다. 특정 공연·시각 작품 관람 기록은 없고 현대 사극·영상은 후대 소재화다.'
      WHEN 'GAME' THEN
        '광개토왕·담덕과 game·played·board game·hunt·strategy 조합을 검색했다. 확인되는 전쟁과 군사 전략은 실제 역사 행위이며 디지털 GAME 작품을 플레이했다는 자료가 아니다.'
      WHEN 'MUSIC' THEN
        '광개토왕·담덕과 music·song·chant·Buddhist hymn·listened 조합을 검색했다. 평양 9사 건립과 불교 후원은 확인되지만 곡명·찬가명·연주자·청취 행위는 확인되지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '광개토대왕 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '광개토대왕 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%', completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '광개토대왕 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.celeb_id = target_celeb_id
      AND r.status = 'completed'
      AND r.completed_at IS NOT NULL
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f WHERE f.run_id = r.id AND f.decision = 'rejected') = 1
      AND (SELECT count(*) FROM public.celeb_content_research_sources src WHERE src.run_id = r.id) = 5
  ) THEN
    RAISE EXCEPTION '광개토대왕 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
