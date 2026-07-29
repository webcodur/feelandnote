-- 선덕여왕 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  자장이 당에서 가져온 대장경 일부 — 승려의 구법·국가 불교 정비 기록
--   VIDEO 당 태종이 보냈다고 전하는 모란도 — 정지 회화이자 후대 설화
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'b5a4bd00-664d-468e-a2fc-23c53d0422aa'::uuid;
  target_run_id constant uuid := '3ee2cac9-6975-49df-a01f-033ef477edfc'::uuid;
  rejected_book_finding_id constant uuid := '7e25b5e8-672d-4db6-aec1-49e2df77838c'::uuid;
  rejected_video_finding_id constant uuid := 'e50b199b-d453-4b98-b70e-55b4400be92e'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'queen-seondeok'
      AND p.nickname = '선덕여왕'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '선덕여왕 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '선덕여왕에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_book_finding_id, rejected_video_finding_id)
  ) THEN
    RAISE EXCEPTION '선덕여왕 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  )
  VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-queen-seondeok-full-v1',
    'Codex',
    ARRAY[
      '선덕여왕', '선덕왕', '덕만', '善德女王', '善德王', '德曼',
      'Queen Seondeok', 'Seondeok of Silla', 'Sondok'
    ],
    '2009년 MBC 드라마 《선덕여왕》과 그 OST·게임·후속 영상, 선덕여왕을 소재로 한 현대 도서와 공연은 역사 인물이 소비한 콘텐츠가 아니므로 제외했다. 신라 선덕왕과 다른 시대의 동명 인물·상호도 제외했다.',
    '한국어·한문·영어 이름 변형으로 네 콘텐츠 유형을 각각 검색하고 『삼국사기』·『삼국유사』 원문과 국사편찬위원회 주석을 대조했다. 모란 그림을 보았다는 일화는 특정 작가·작품명이 없는 후대 왕권 설화이며 정지 회화여서 VIDEO로 등록할 수 없다. 자장이 대장경 일부를 가져온 기록도 승려의 구법과 국가 불교 정비에 관한 것으로 여왕이 특정 경전을 읽었다는 증거가 아니다. 특정 디지털 게임이나 음악 작품을 직접 소비했다는 기록도 없어 네 유형 모두 채택 0건으로 완료했다.'
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
      '자장이 당에서 가져온 대장경 일부',
      '편자 미상',
      NULL,
      '『삼국사기』 주석과 『삼국유사』는 자장이 선덕왕의 귀국 요청을 받고 643년에 대장경 또는 장경 일부와 불구를 가지고 신라로 돌아왔다고 전한다.',
      '반입·소지 주체는 자장이며 사료의 맥락도 구법과 불교 교단 정비이다. 선덕여왕이 그 가운데 특정 제목의 경전을 읽거나 감상했다는 기록은 없다. 『대방등무상경』과 왕호의 관련성도 현대 연구자의 해석이므로 개인 독서 증거가 아니다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '나비 없는 모란 그림',
      '작자 미상',
      NULL,
      '『삼국사기』와 『삼국유사』는 당 태종이 보냈다고 하는 나비 없는 모란 그림을 덕만이 보고 꽃에 향기가 없을 것이라고 해석한 일화를 전한다.',
      '단일 정지 회화는 서비스의 VIDEO 범주가 아니며 작자·고유 작품명·판본도 식별되지 않는다. 중국 측 기록에는 이 선물 이야기가 없고 국사편찬위원회 주석도 후대 왕권 수식 설화의 성격과 당대 화풍 관례를 지적한다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '선덕여왕 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
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
      'https://db.history.go.kr/common/compareViewer.do?levelId=sg_005r_0020_0190&type=ancient',
      'primary',
      'archive',
      'accessible',
      '자장이 당에 들어가다, 삼국사기',
      '선덕왕의 요청으로 자장이 대장경과 장엄구를 가지고 귀국했다는 주석을 확인했다. 여왕의 개인 독서 기록은 없다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://db.history.go.kr/ancient/level.do?levelId=sy_003r_0020_0210_0010',
      'primary',
      'archive',
      'accessible',
      '선덕왕대 자장법사가 문수보살의 진신을 보려고 당으로 가다, 삼국유사',
      '자장이 당에 유학한 뒤 장경 일부와 불구를 가져왔다는 전승을 대조했다. 소비 주체는 선덕여왕으로 특정되지 않는다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://db.history.go.kr/id/sg_005r_0020_0010',
      'primary',
      'archive',
      'accessible',
      '선덕왕이 왕위에 오르다, 삼국사기',
      '덕만이 모란 그림을 보고 해석했다는 본문과 중국 측 기록 부재·당대 화풍·왕권 수식 설화에 관한 주석을 함께 확인했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://db.history.go.kr/ancient/level.do?levelId=sy_001r_0020_0100',
      'primary',
      'archive',
      'accessible',
      '선덕왕이 미리 알아낸 세 가지 일, 삼국유사',
      '당 태종이 모란 그림과 씨앗을 보냈다는 더 늦은 설화의 전승 맥락을 대조했다. 현대 영상물은 별개다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://db.history.go.kr/ancient/level.do?levelId=sy_003r_0020_0060_0010',
      'primary',
      'archive',
      'accessible',
      '자장이 태화지에서 9층탑 건립의 연유를 받다, 삼국유사',
      '전쟁·외적·탑 건립 설화를 game·played·board game·digital game 조합과 대조했다. 실제 정치·군사 사건과 의례는 디지털 GAME이 아니다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://db.history.go.kr/ancient/level.do?levelId=gskh_005_0090_0020_0030',
      'primary',
      'archive',
      'accessible',
      '황룡사찰주본기, 한국 고대 금석문',
      '선덕왕대 자장·황룡사탑·불교 의례 기록을 music·song·dance·performance 조합과 대조했다. 여왕이 들은 특정 곡·연주·공연은 확인되지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '선덕여왕 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '선덕여왕·선덕왕·덕만·善德女王·Queen Seondeok와 책·읽다·경전·대장경·불경·read·book·scripture 조합을 검색했다. 자장이 들여온 대장경은 승려의 구법·교단 정비이며 여왕의 특정 작품 독서가 아니다. 『대방등무상경』과 왕호의 관련성은 현대 학설이어서 제외했다.'
      WHEN 'VIDEO' THEN
        '모란도·그림·painting·watched·theatre·performance를 검색했다. 나비 없는 모란 그림 설화는 정지 회화이고 작자·고유 작품명도 없으며 중국 기록 부재가 지적된다. 현대 드라마·영화·다큐멘터리는 후대 제작물이라 제외했다.'
      WHEN 'GAME' THEN
        '선덕여왕·덕만과 game·played·board game·digital game·놀이 조합을 검색했다. 전쟁·예언·의례·보드게임식 현대 재현 외에 본인이 플레이한 특정 디지털 게임 기록은 확인되지 않았다.'
      WHEN 'MUSIC' THEN
        '선덕여왕·덕만과 music·song·dance·performance·음악·노래·향가 조합을 검색했다. 왕실·사찰 의례 일반과 현대 드라마 OST만 확인되며 본인이 들은 특정 곡·연주자·공연 기록은 없었다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '선덕여왕 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '선덕여왕 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '선덕여왕 프로필·0건 확정 최종 검증에 실패했습니다.';
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
    RAISE EXCEPTION '선덕여왕 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
