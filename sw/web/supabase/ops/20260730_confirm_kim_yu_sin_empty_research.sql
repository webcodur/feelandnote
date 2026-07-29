-- 김유신 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  임신서기석의 유교 경전 학습 맹세 — 김유신이 아닌 이름 없는 두 청년의 기록
--   GAME  김춘추와의 축국 — 실제 신체 운동이며 디지털 게임 작품이 아님
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '84077a82-2e00-440b-8c0d-6cc86303abc9'::uuid;
  target_run_id constant uuid := '4b5988ec-689c-4d96-a832-7f49445ed0f3'::uuid;
  rejected_book_finding_id constant uuid := '0ccc8c96-3243-4593-b928-1df4d8816b01'::uuid;
  rejected_game_finding_id constant uuid := 'e945b51c-e263-41dd-b545-bb1433aa3514'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'kim-yu-sin'
      AND p.nickname = '김유신'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '김유신 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '김유신에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id
       OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_book_finding_id, rejected_game_finding_id)
  ) THEN
    RAISE EXCEPTION '김유신 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
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
    '2026-07-30-kim-yu-sin-full-v1',
    'Codex',
    ARRAY[
      '김유신',
      '김유신 장군',
      'Kim Yu-sin',
      'Kim Yusin',
      'Gim Yusin',
      '金庾信'
    ],
    '신라 장군 김유신(595~673)을 동명이인 및 현대의 김유신 이름 사용자와 분리했다. 김유신을 소재로 한 후대 소설·영화·드라마·게임·음악과 본인의 행록·비문은 개인 소비 기록에서 제외했다.',
    '한국어·영어·한자 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 『삼국사기』·『삼국유사』, 국사편찬위원회 해설과 국립박물관 자료를 대조했다. 임신서기석은 두 청년의 맹세로 김유신과 연결되지 않으며, 김춘추와 함께 한 축국은 실제 신체 운동이다. 특정 책·공연·디지털 게임·음악 작품을 읽거나 보거나 플레이하거나 들었다는 작품 단위 근거는 네 유형 모두 0건이다.'
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
      '임신서기석에 적힌 유교 경전 학습 맹세',
      '이름이 전하지 않는 신라 청년 두 사람',
      NULL,
      '임신서기석에는 두 청년이 나라에 충성하고 유교 경전을 3년 안에 익히겠다고 맹세한 내용이 새겨져 있다.',
      '비문 당사자는 김유신이 아니라 이름이 전하지 않는 두 청년이다. 제작 연대도 552년설과 612년설이 논의되어 김유신의 개인 독서 기록으로 귀속할 수 없다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '축국',
      NULL,
      NULL,
      '『삼국사기』는 김유신이 김춘추와 축국을 하다가 춘추의 옷고름을 밟아 떨어뜨렸다고 기록한다.',
      '축국은 실제 공을 차는 신체 놀이·운동이다. 작품 단위 디지털 GAME이 아니므로 등록 범위에서 제외한다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '김유신 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
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
      'https://www.museum.go.kr/MUSEUM/contents/M0601000000.do?arcDataType=&arcId=12908&catCustomType=united&catId=128&cp=184&schM=view&sv=&unitedUse=MUSEUM',
      'secondary',
      'official_profile',
      'accessible',
      '국립경주박물관 신라문물연구 9집 발간 안내',
      '임신서기석의 맹세 주체가 신라시대 젊은이 두 사람이며 552년설이 제시된 근거를 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://gyeongju.museum.go.kr/kor/html/sub02/0201.html?d_mng_no=10&mng_no=53&mode=V',
      'primary',
      'archive',
      'accessible',
      '국립경주박물관 임신서기석 전시품',
      '비문 5행 74자의 성격과 화랑도 정신에 따른 충도 실천·학습 맹세, 552년 또는 612년의 연대 범위를 확인했다. 김유신 이름은 없다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_n100710',
      'secondary',
      'official_profile',
      'accessible',
      '우리역사넷 김유신',
      '국사편찬위원회의 생애 정리와 watch·performance·play·film 조합을 대조했다. 김유신이 관람한 특정 공연·영상 작품은 확인되지 않고 후대 영상물은 그를 소재로 한 작품이다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://db.history.go.kr/id/sg_006r_0020_0010',
      'primary',
      'archive',
      'accessible',
      '『삼국사기』 문무왕 즉위 기사',
      '김유신과 김춘추가 함께 축국했고 김유신이 춘추의 옷고름을 밟아 떨어뜨렸다는 원문·번역을 확인했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://contents.history.go.kr/mobile/km/view.do?levelId=km_014_0030_0040_0030',
      'secondary',
      'article',
      'accessible',
      '우리역사넷 신라의 축국',
      '김유신과 김춘추의 축국 일화를 실제 공놀이의 역사로 설명하는 국사편찬위원회 자료를 대조했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://db.history.go.kr/ancient/level.do?levelId=sg_041r_0020_0010',
      'primary',
      'archive',
      'accessible',
      '『삼국사기』 김유신 열전',
      '현전 열전과 music·song·악·가무 조합을 대조했다. 인물의 군사·정치 행적과 후대 추앙은 확인되지만 본인이 감상한 개별 곡·공연 기록은 확인되지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '김유신 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '김유신·Kim Yu-sin·金庾信과 read·book·classic·scripture·study·임신서기석 조합을 검색했다. 임신서기석은 이름 없는 두 청년의 학습 맹세이고 김유신의 개인 독서가 아니다. 본인의 행록·비문과 후대 전기는 창작·기록 대상 관계라 제외했다.'
      WHEN 'VIDEO' THEN
        '김유신·Kim Yusin과 watched·theatre·performance·film·drama 조합을 검색하고 국사편찬위원회 생애 자료를 대조했다. 특정 공연·시각 작품 관람 기록은 없으며 김유신을 소재로 한 현대 영화·드라마는 후대 작품이다.'
      WHEN 'GAME' THEN
        '김유신·김춘추와 game·played·축국·蹴鞠·놀이 조합을 검색했다. 두 사람이 축국을 했다는 1차 사료는 확인되지만 실제 신체 운동이므로 디지털 GAME 작품으로 등록하지 않는다.'
      WHEN 'MUSIC' THEN
        '김유신·金庾信과 music·song·악·가무·listened 조합을 『삼국사기』·『삼국유사』 및 공식 생애 자료에서 검색했다. 후대 설화·추모 음악 외에 본인이 들은 곡명·연주자·감상 행위는 확인되지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '김유신 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '김유신 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%', completed_status, completed_content_count;
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
    RAISE EXCEPTION '김유신 프로필·0건 확정 최종 검증에 실패했습니다.';
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
    RAISE EXCEPTION '김유신 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
