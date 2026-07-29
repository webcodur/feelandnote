-- 강감찬 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  낙도교거집·구선집 — 강감찬 본인의 소실 저술
--   GAME  귀주대첩 — 실제 전투이지 디지털 게임이 아님
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'cdc09831-b6a2-4ed9-94fb-791352ae13bc'::uuid;
  target_run_id constant uuid := 'f918a74f-9962-4fe0-81a3-66a1d5a61071'::uuid;
  rejected_book_finding_id constant uuid := '2ed53182-32a2-4a15-9fa8-c7445ca803ab'::uuid;
  rejected_game_finding_id constant uuid := '114de4d2-d59d-45d6-a711-a9ccf2d1e499'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'gang-gam-chan'
      AND p.nickname = '강감찬'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '강감찬 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id) THEN
    RAISE EXCEPTION '강감찬에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_book_finding_id, rejected_game_finding_id)
  ) THEN
    RAISE EXCEPTION '강감찬 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  )
  VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-gang-gam-chan-full-v1',
    'Codex',
    ARRAY['강감찬', '姜邯贊', 'Gang Gam-chan', 'Gang Gamchan', 'Kang Kam-ch''an', 'Kang Gam-chan'],
    'KBS 드라마 《고려 거란 전쟁》·《태조 왕건》, 강감찬을 소재로 한 현대 소설·만화·게임과 서울 낙성대의 현대 행사 자료는 역사 인물이 소비한 콘텐츠가 아니므로 제외했다. 동명 현대인과 상호도 제외했다.',
    '한국어·한문·로마자 이름 변형으로 네 콘텐츠 유형을 검색하고 『고려사』 열전·세가와 국사편찬위원회 해설을 대조했다. 어려서부터 공부를 좋아했다는 기록은 있으나 읽은 책 제목은 없다. 『낙도교거집』과 『구선집』은 강감찬 본인의 소실 문집이며, 귀주대첩은 실제 군사 사건이다. 특정 영상·디지털 게임·음악 작품을 감상했다는 기록은 없어 네 유형 모두 채택 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  )
  VALUES
    (
      rejected_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '낙도교거집·구선집',
      '강감찬',
      NULL,
      '『고려사』 열전은 강감찬이 은퇴 뒤 성 남쪽 별장에 살며 『낙도교거집』을 지었고 『구선집』도 지었다고 기록한다. 두 문집은 현전하지 않는다.',
      '강감찬이 쓴 자신의 저술이지 그가 소비한 외부 콘텐츠가 아니다. 현전하지 않아 별개의 작품 메타데이터나 독서 경위도 검증할 수 없다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '귀주대첩',
      '강감찬·고려군',
      NULL,
      '『고려사』는 1018~1019년 거란 침공 때 강감찬이 상원수로 고려군을 지휘해 흥화진과 귀주 일대에서 승리한 실제 군사 사건을 기록한다.',
      '역사적 전투와 군사 지휘는 플레이한 디지털 GAME이 아니다. 이를 소재로 한 현대 게임·시뮬레이션은 강감찬 사후의 창작물이다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '강감찬 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  )
  VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://db.history.go.kr/goryeo/level.do?levelId=kr_094r_0010_0030_0010',
      'primary',
      'archive',
      'accessible',
      '강감찬 열전, 고려사',
      '어려서부터 공부를 좋아했다는 기록과 은퇴 뒤 두 문집을 지었다는 기록을 확인했다. 특정 외부 책 제목은 없다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_n200100',
      'secondary',
      'article',
      'accessible',
      '귀주 대첩의 영웅 강감찬',
      '『낙도교거집』과 『구선집』이 본인의 문집이며 현재 전하지 않는다는 국사편찬위원회 해설을 대조했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://db.history.go.kr/goryeo/compareViewer.do?levelId=kr_004r_0110_0130_0030',
      'primary',
      'archive',
      'accessible',
      '강감찬 등이 거란 소손녕의 군대를 크게 이기다, 고려사',
      '상원수 강감찬이 군대를 이끌고 흥화진에서 거란군을 무찌른 실제 전쟁 기록임을 확인했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://contents.history.go.kr/front/hm/view.do?levelId=hm_048_0030',
      'secondary',
      'article',
      'accessible',
      '귀주 대첩',
      '귀주대첩의 전개와 역사적 성격을 대조했다. 현대 게임화 자료는 본인의 플레이 증거가 아니다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://db.history.go.kr/goryeo/level.do?levelId=kr_005r_0080_0050_0040',
      'primary',
      'archive',
      'accessible',
      '강감찬에게 문하시중을 더해주다, 고려사',
      '생애·관직 기록과 watched·film·theatre·performance 조합을 대조했다. 특정 관람 작품은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://db.history.go.kr/goryeo/level.do?levelId=kr_005r_0150_0100_0040',
      'primary',
      'archive',
      'accessible',
      '선대의 공신들에게 관작을 추증하다, 고려사',
      '사후 추증과 전승을 music·song·performance 조합과 대조했다. 특정 곡·연주·공연을 들었다는 사료는 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '강감찬 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '강감찬·姜邯贊·Gang Gam-chan과 책·읽다·공부·문집·read·book·studied 조합을 검색했다. 어릴 때 공부를 좋아했다는 기록에는 제목이 없고 『낙도교거집』·『구선집』은 본인의 소실 저술이므로 제외했다.'
      WHEN 'VIDEO' THEN
        '강감찬과 watched·film·theatre·performance·관람 조합을 검색했다. 현대 드라마·다큐멘터리·뮤지컬은 후대 재현이며 본인이 본 특정 시각 작품 기록은 없었다.'
      WHEN 'GAME' THEN
        '강감찬·귀주대첩과 game·played·strategy·simulation·놀이 조합을 검색했다. 귀주대첩은 실제 전투이며 현대 전략게임 속 강감찬 캐릭터는 사후 창작이어서 제외했다.'
      WHEN 'MUSIC' THEN
        '강감찬과 music·song·dance·performance·음악·노래 조합을 검색했다. 고려 궁중 의례 일반과 현대 OST·공연만 확인되며 본인이 들은 특정 음악 작품은 없었다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '강감찬 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '강감찬 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
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
    RAISE EXCEPTION '강감찬 프로필·0건 확정 최종 검증에 실패했습니다.';
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
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 2
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '강감찬 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
