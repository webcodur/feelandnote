-- 을지문덕 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  여수장우중문시 — 본인이 지어 보낸 전술 서신 성격의 시
--   GAME  살수대첩 유인전술 — 실제 전쟁 행위이며 디지털 게임 작품이 아님
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'b4e5ff19-1001-42c0-ae4e-c943cee2e65f'::uuid;
  target_run_id constant uuid := 'e57277a7-ae80-4886-aa52-dda15483207b'::uuid;
  rejected_book_finding_id constant uuid := 'd093d461-2f20-49d3-ad5e-a5207fc2ff0f'::uuid;
  rejected_game_finding_id constant uuid := '72c3c015-8908-457b-8bb4-032226aaaae4'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'eulji-mundeok'
      AND p.nickname = '을지문덕'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '을지문덕 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '을지문덕에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_book_finding_id, rejected_game_finding_id)
  ) THEN
    RAISE EXCEPTION '을지문덕 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
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
    '2026-07-30-eulji-mundeok-full-v1',
    'Codex',
    ARRAY[
      '을지문덕',
      '울지문덕',
      'Eulji Mundeok',
      'Ulji Mundeok',
      '乙支文德',
      '尉支文德'
    ],
    '고구려 영양왕대 장수 을지문덕과 현대의 을지문덕함·훈장·도로·학교명 및 그를 소재로 한 창작물을 분리했다. 후대 전기와 현대 소설·영상·게임·음악은 본인의 소비 기록에서 제외했다.',
    '한국어·영어·한자 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 『삼국사기』 을지문덕 열전과 국사편찬위원회 생애 해설을 대조했다. 사료는 그가 글을 읽고 지을 수 있었다고만 전하며 읽은 작품명은 남기지 않는다. 「여수장우중문시」는 본인이 지어 적장에게 보낸 전술 서신이고, 살수대첩은 실제 전쟁이다. 특정 외부 책·공연·디지털 게임·음악 작품의 소비 근거는 네 유형 모두 0건이다.'
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
      rejected_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '여수장우중문시',
      '을지문덕',
      NULL,
      '『삼국사기』는 을지문덕이 수나라 장수 우중문에게 네 구절의 오언시를 지어 보냈다고 기록한다.',
      '본인이 읽거나 추천한 외부 저작이 아니라 자신이 지어 적장에게 보낸 창작물·전술 서신이다. 창작 관계를 소비 BOOK으로 등록하지 않는다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '살수대첩 유인전술',
      NULL,
      NULL,
      '을지문덕은 수나라 진영을 정탐하고 거짓 패배와 후퇴로 적군을 평양 부근까지 유인한 뒤 살수에서 공격했다.',
      '실제 전쟁과 군사 전략이며 작품 단위 디지털 GAME이 아니다. 이를 소재로 한 현대 전략 게임은 후대 제작물이다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '을지문덕 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
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
      'https://db.history.go.kr/ancient/level.do?levelId=sg_044r_0020_0100',
      'primary',
      'archive',
      'accessible',
      '『삼국사기』 을지문덕이 우중문에게 오언시를 보내다',
      '을지문덕이 직접 시를 지어 우중문에게 보낸 원문·번역과 전술적 맥락을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_n101520',
      'secondary',
      'official_profile',
      'accessible',
      '우리역사넷 을지문덕',
      '그의 생애 자료가 극히 적고 「여수장우중문시」가 적장을 조롱하며 퇴각을 유도한 본인 창작임을 대조했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://db.history.go.kr/ancient/level.do?levelId=sg_044r_0020_0010',
      'primary',
      'archive',
      'accessible',
      '『삼국사기』 을지문덕의 세계와 자질',
      '현전 열전은 세계가 알려지지 않았고 글을 읽고 지을 수 있었다고만 전한다. 공연·시각 작품 관람 기록이나 작품명은 없다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://db.history.go.kr/ancient/level.do?levelId=sg_044r_0020_0040',
      'primary',
      'archive',
      'accessible',
      '『삼국사기』 을지문덕이 수나라 진영의 허실을 염탐하다',
      '거짓 항복으로 수나라 진영을 정탐한 실제 군사 행위를 확인했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://db.history.go.kr/ancient/level.do?levelId=sg_044r_0020_0110',
      'primary',
      'archive',
      'accessible',
      '『삼국사기』 을지문덕이 살수에서 대승을 거두다',
      '거짓 항복과 유인·퇴각·추격으로 이어진 살수대첩의 실제 전쟁 맥락을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_10&levelId=kc_i101200',
      'secondary',
      'article',
      'accessible',
      '우리역사넷 고구려와 수의 전쟁',
      '전쟁 사료와 을지문덕의 시를 music·song·chant·performance 조합으로 대조했다. 시가 노래로 감상됐다는 당대 기록이나 특정 곡명·연주자는 확인되지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '을지문덕 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '을지문덕·울지문덕·Eulji Mundeok·乙支文德과 read·book·classic·strategy text·poem 조합을 검색했다. 사료는 글을 읽을 수 있었다고만 전하고 작품명을 남기지 않는다. 「여수장우중문시」는 본인의 창작·전술 서신이라 제외했다.'
      WHEN 'VIDEO' THEN
        '을지문덕·Eulji Mundeok과 watched·theatre·performance·film·visual work 조합을 검색했다. 현전 생애 자료는 612년 전쟁 행적에 집중되고 특정 공연·시각 작품 관람 기록은 없다. 현대 영상물은 후대 소재화다.'
      WHEN 'GAME' THEN
        '을지문덕과 game·played·board game·strategy·살수대첩 조합을 검색했다. 정탐·유인·거짓 항복·추격은 실제 군사 행위이며 디지털 GAME 작품 플레이가 아니다.'
      WHEN 'MUSIC' THEN
        '을지문덕·여수장우중문시와 music·song·chant·sung·listened 조합을 검색했다. 오언시는 문서로 지어 보낸 기록만 있고 당대에 노래로 듣거나 부른 증거, 곡명·연주자·감상 기록은 확인되지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '을지문덕 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '을지문덕 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%', completed_status, completed_content_count;
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
    RAISE EXCEPTION '을지문덕 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.celeb_id = target_celeb_id
      AND r.status = 'completed'
      AND r.completed_at IS NOT NULL
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f WHERE f.run_id = r.id AND f.decision = 'rejected') = 2
      AND (SELECT count(*) FROM public.celeb_content_research_sources src WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '을지문덕 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
