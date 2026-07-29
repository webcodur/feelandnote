-- 소하 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 진·한 법령과 지도·호적 문서를 수집한 행정 행위는 확인되지만 개인 작품 소비는 식별되지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '8ac6cc0e-ae8d-4b88-9f9d-7c946a2201ca'::uuid;
  target_run_id constant uuid := 'e42e4ec4-1876-4333-93f2-ba106068ed93'::uuid;
  rejected_book_finding_id constant uuid := '48dd15c1-58e8-425d-968c-59e6fe59abb9'::uuid;
  rejected_video_finding_id constant uuid := '9491d0f1-c38e-46ad-949b-482ceba571f3'::uuid;
  rejected_game_finding_id constant uuid := 'cb98a777-df66-414a-b778-36ffe6893c8a'::uuid;
  rejected_music_finding_id constant uuid := '02b685a2-c826-41e7-8e26-c71419344128'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'xiao-he'
      AND p.nickname = '소하'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '소하 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '소하 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id,
    '2026-07-30-xiao-he-empty-v1', 'Codex',
    ARRAY['소하', '蕭何', '萧何', 'Xiao He', 'Hsiao Ho', 'Xiao Xiangguo'],
    '전한 초 재상 소하를 동명 현대인과 후대 소하 소재 소설·드라마·게임 캐릭터에서 분리했다. 한자 표기 蕭何·萧何와 영어·웨이드식 표기를 함께 조사했다.',
    '『사기·소상국세가』 원문과 진·한 법제사 연구를 대조해 BOOK·VIDEO·GAME·MUSIC을 조사했다. 소하는 함양 입성 때 진나라 승상·어사 관청의 율령·지도·호적 문서를 선점해 보존했고, 이는 한왕이 지리·인구·민생을 파악하는 행정 기반이 됐다. 여기서 圖書는 현대적 제목 있는 책 한 권이 아니라 국가 기록 묶음이며 개인 감상 독서로 볼 수 없다. 후대 재현물과 실제 전쟁·정무도 제외해 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '진 승상·어사 관청의 율령도서', '진나라 중앙 관청', NULL,
      '『사기·소상국세가』는 소하가 함양에서 진 승상과 어사가 보관하던 율령·지도·문서를 먼저 거두어 저장했다고 기록한다.',
      '여기의 律令圖書는 법령·지도·호적 등 국가 행정 기록 묶음이다. 개별 서명·저자·독서 동기가 특정되지 않고 수집 목적도 국정 정보 보존이므로 개인 BOOK 소비로 등록하지 않았다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '함양 문서 수집과 한 초 정무의 후대 극화', NULL, NULL,
      '소하의 행적은 후대 소설·경극·드라마 등으로 재현되지만 핵심 사료는 행정 활동을 전한다.',
      '후대 재현물은 본인 사후 제작물이어서 소하의 관람작이 아니며, 사료에는 그가 본 제목 있는 극·공연이 없다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '초한전쟁의 병참·인재 등용과 후대 전략 게임', NULL, NULL,
      '소하는 관중을 지키고 병력·군량을 공급하며 한신을 천거하는 실제 정치·군사 활동을 수행했다.',
      '실제 전쟁·행정 전략은 디지털 GAME 플레이가 아니고, 후대 초한전쟁 게임은 본인의 소비작이 아니다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '전한 궁정·의례 음악 일반과 후대 소하 관련 음악', NULL, NULL,
      '소하의 전기에는 법령·병참·인사·정무가 상세하지만 개인이 들은 개별 음악 작품은 제시되지 않는다.',
      '시대의 궁정·의례 음악 일반론에서 곡명·창작자·연주자를 가진 소하 개인의 청취작을 추정하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '소하 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://www.llu.edu.cn/info/2081/40781.htm',
      'primary', 'archive', 'accessible',
      '『史記·蕭相國世家』 원문 — 呂梁學院',
      '何獨先入收秦丞相御史律令圖書藏之 구절과 그 문서가 지리·호구·민생 파악에 쓰였다는 문맥을 확인했다.'
    ),
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://repository.upenn.edu/bitstreams/c9186518-a6d8-4089-86fd-5725f611b0e0/download',
      'secondary', 'article', 'accessible',
      'Tradition and Transformation — University of Pennsylvania Repository',
      '律令圖書를 법령·지도·호적 문서와 중앙 관청 기록으로 풀이하는 학술 문맥을 대조했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://www.llu.edu.cn/info/2081/40781.htm',
      'primary', 'archive', 'accessible',
      '『史記·蕭相國世家』 원문 — 呂梁學院',
      '정무·행정 서술에 제목 있는 연극이나 공연 관람이 없음을 확인하고 후대 극화와 구별했다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://cup.columbia.edu/book/records-of-the-grand-historian/9780231081689/',
      'secondary', 'official_profile', 'accessible',
      'Records of the Grand Historian: Han Dynasty II — Columbia University Press',
      '소하 전기가 속한 한대 기록의 범위와 실제 정치·군사 행적을 확인해 디지털 GAME과 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://www.llu.edu.cn/info/2081/40781.htm',
      'primary', 'archive', 'accessible',
      '『史記·蕭相國世家』 원문 — 呂梁學院',
      '상세 전기에서 곡명·연주자와 연결되는 소하 개인의 청취 기록이 없음을 확인했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '소하 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN '蕭何·萧何·Xiao He와 read·book·律令·圖書·秦律 조합을 조사했다. 율령도서는 국가 문서 묶음이어서 개인 감상 독서를 기각했다.'
        WHEN 'VIDEO' THEN 'watched·theatre·performance·opera·drama 조합을 조사했다. 후대 극화 외에 제목 있는 당대 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·strategy·Chu-Han·war 조합을 조사했다. 실제 병참·정무와 후대 게임은 본인의 디지털 GAME 소비가 아니다.'
        WHEN 'MUSIC' THEN 'music·song·heard·court·ritual 조합을 조사했다. 시대 일반 음악 외에 곡명·창작자가 특정되는 청취작은 없다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '소하 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '소하 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.user_contents uc WHERE uc.user_id = p.id
      )
  ) THEN
    RAISE EXCEPTION '소하 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
