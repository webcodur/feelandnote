-- 폴리비오스 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택:
--   BOOK  플라톤 국가·정체 — 역사 6권에서 플라톤의 정체를 직접 명명하고 비판적으로 비교
-- 기각:
--   VIDEO  후대 교육 영상, GAME  동명 아케이드 괴담, MUSIC  아르카디아 음악교육 일반론
--
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '2842f784-62df-41e9-952e-03c568014939'::uuid;
  target_content_id constant text := '0604f7b7-8b9c-4907-b4a1-b398a018d213';
  target_run_id constant uuid := 'c58586b5-7c3e-4e87-9ae3-444c41fa266a'::uuid;
  user_content_id constant uuid := 'ece88d63-6cb1-430c-901c-6513722369cf'::uuid;
  accepted_book_finding_id constant uuid := 'ba3ebeba-6796-4841-ae66-ab61c129ebc1'::uuid;
  rejected_video_finding_id constant uuid := '7fc3b02d-5f3f-4a0d-b919-f6626846c587'::uuid;
  rejected_game_finding_id constant uuid := '09292090-1c1f-4f4f-9b60-c511b434a230'::uuid;
  rejected_music_finding_id constant uuid := '1d9fbf3f-be41-4770-b3a6-a9e1835cee95'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
  expected_user_count integer;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'polybius'
      AND p.nickname = '폴리비오스'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '폴리비오스 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = user_content_id
  ) THEN
    RAISE EXCEPTION '폴리비오스 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  SELECT count(*)::integer + 1
  INTO expected_user_count
  FROM public.user_contents uc
  WHERE uc.content_id = target_content_id;

  IF expected_user_count <> 3 OR NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    WHERE c.id = target_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788930606233'
      AND ko.title = '국가 정체'
      AND ko.verified = true
  ) THEN
    RAISE EXCEPTION '국가·정체 기존 콘텐츠 기준선이 달라졌습니다. 예상 user_count=%', expected_user_count;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    user_content_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    $ko$폴리비오스는 『역사』 6권에서 플라톤과 다른 철학자들이 정체의 변화를 더 정교하게 설명했다고 밝힌 뒤, “플라톤의 정체”를 실제 국가와 견주어 비판적으로 평가한다. 단순한 이름 언급이 아니라 핵심 정치 분석의 비교 대상으로 작품의 논지를 다루므로 『국가·정체』를 읽고 소화한 직접 근거로 등록한다.$ko$,
    $en$In Book 6 of the Histories, Polybius says that Plato and other philosophers treated constitutional change in greater detail, then explicitly compares “Plato’s republic” with constitutions that had existed in practice. This is not a passing name-check: he engages the work’s argument as a foil for his own political analysis, providing direct evidence of close reading.$en$,
    'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Polybius/6%2A.html',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '폴리비오스 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = target_content_id;

  IF (
    SELECT c.user_count FROM public.contents c WHERE c.id = target_content_id
  ) <> expected_user_count THEN
    RAISE EXCEPTION '국가·정체 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-polybius-full-v1',
    'Codex',
    ARRAY['폴리비오스', '폴리비우스', 'Polybius', 'Polybios', 'Πολύβιος'],
    '기원전 2세기 그리스 역사가 폴리비오스를 1981년 미국 아케이드 게임에 관한 도시전설 “Polybius”, 동명 현대인과 분리했다. 자신의 저서 『역사』는 외부 감상작으로 등록하지 않았다.',
    '고대 그리스어·영어·한국어 이름과 read·book·Plato·Republic·spectacle·game·music 조합으로 네 유형을 조사했다. 『역사』 6권에서 플라톤과 “플라톤의 정체”를 직접 명명하고 그 논지를 실제 정체와 비교한 대목을 BOOK 1건으로 채택했다. 후대 교육 영상, 동명 아케이드 괴담, 아르카디아 음악교육 일반론은 개인의 작품 소비 근거가 아니어서 기각했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      accepted_book_finding_id, target_run_id, 'BOOK', 'accepted',
      '국가·정체', '플라톤', target_content_id,
      '폴리비오스는 『역사』 6권에서 플라톤의 정체론을 직접 명명하고 실제 국가의 정체와 비교하며 비판적으로 평가한다.',
      NULL
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '후대 폴리비오스 교육 영상·다큐멘터리', NULL, NULL,
      '폴리비오스와 로마 팽창은 현대 강의·다큐멘터리의 소재가 되었다.',
      '사후 제작된 설명물이며 생전 그가 관람한 특정 극·영상 작품이 아니다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      'Polybius 아케이드 게임 도시전설', NULL, NULL,
      '1981년 미국 오락실에 등장했다는 “Polybius” 게임 괴담이 널리 유통된다.',
      '역사가 폴리비오스와 무관한 동명 현대 도시전설이다. 본인의 디지털 GAME 이용 기록이 아니다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '아르카디아의 공공 음악교육', NULL, NULL,
      '폴리비오스는 『역사』 4권 20~21장에서 아르카디아인의 음악교육과 합창 관습을 논한다.',
      '사회 관습에 대한 역사 서술일 뿐, 자신이 들은 제목·창작자가 특정된 외부 음악 작품은 아니다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '폴리비오스 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', accepted_book_finding_id,
      'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Polybius/6%2A.html',
      'primary', 'archive', 'accessible',
      'Polybius, Histories, Book VI — LacusCurtius',
      '플라톤과 “Plato’s republic”를 직접 명명하고 실제 정체와 비교하는 6권 본문을 확인했다.'
    ),
    (
      target_run_id, 'BOOK', accepted_book_finding_id,
      'https://brill.com/view/journals/agpt/35/1/article-p127_127.xml',
      'secondary', 'article', 'accessible',
      'Polybius and Plato’s Republic — Archiv für Geschichte der Philosophie',
      '폴리비오스 정치 분석에 나타난 플라톤 『국가』의 직접 영향과 비교를 학술 논문으로 교차 확인했다.'
    ),
    (
      target_run_id, 'BOOK', accepted_book_finding_id,
      'https://search.shopping.naver.com/book/catalog/32466968315',
      'secondary', 'official_profile', 'accessible',
      '국가 정체 — 네이버 도서',
      '서비스에 이미 등록된 ISBN 9788930606233 한국어 판본의 메타데이터를 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://www.worldhistory.org/Polybius/',
      'secondary', 'article', 'accessible',
      'Polybius — World History Encyclopedia',
      '생애와 저술을 대조하고 후대 영상 설명물과 생전 관람을 분리했다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://www.youtube.com/watch?v=79NifVyJlh0',
      'secondary', 'other', 'accessible',
      'Polybius: The Most Dangerous Arcade Game in the World? — BBC',
      '1981년 아케이드 괴담이 고대 역사가와 무관한 동명 전설임을 확인했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://penelope.uchicago.edu/thayer/e/roman/texts/polybius/4%2A.html',
      'primary', 'archive', 'accessible',
      'Polybius, Histories, Book IV — LacusCurtius',
      '아르카디아 음악교육 서술을 확인했으나 개인의 작품 단위 청취와 분리했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '폴리비오스 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Polybius·Polybios·폴리비오스와 Plato·Republic·read 조합을 조사했다. 『역사』 6권 원문에서 플라톤의 정체를 명시하고 논지를 비교하는 직접 근거를 확인했다.'
      WHEN 'VIDEO' THEN
        'watched·theatre·spectacle·documentary 조합을 조사했다. 현대 교육 영상과 다큐멘터리는 사후 설명물이며 생전 특정 관람작은 없다.'
      WHEN 'GAME' THEN
        'game·played·arcade·1981 조합을 조사했다. 유명한 Polybius 아케이드 괴담은 역사가와 무관한 동명 전설이며 디지털 GAME 소비 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·heard·Arcadia 조합을 『역사』 4권과 대조했다. 공공 음악교육과 합창 관습 서술은 있으나 자신이 감상한 특정 작품은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '폴리비오스 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '폴리비오스 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id = target_celeb_id
    AND profile_type = 'CELEB'
    AND status = 'active'
    AND celeb_tier = 'light'
    AND content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '폴리비오스 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '폴리비오스 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.contents c ON c.id = target_content_id
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 1
      AND c.user_count = expected_user_count
  ) THEN
    RAISE EXCEPTION '폴리비오스 최종 원장 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
