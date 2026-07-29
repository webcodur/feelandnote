-- 미트리다테스 6세 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 의학 자료실·극장 정치·경연 후원은 확인되지만 특정 외부 작품 소비는 식별되지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '7f2aaa13-0ef3-414f-b17c-983611f11746'::uuid;
  target_run_id constant uuid := '213c745a-a27c-4be0-953e-f2ea98d6b08b'::uuid;
  rejected_book_finding_id constant uuid := 'a7353586-be75-45f8-b8cb-5d993d3998c8'::uuid;
  rejected_video_finding_id constant uuid := '2f8cef51-6b57-4971-827d-f1e6ba2c7eec'::uuid;
  rejected_game_finding_id constant uuid := '1efb581b-903a-44cd-b9f5-53eeb1b4fd07'::uuid;
  rejected_music_finding_id constant uuid := '38dab869-2362-4ebb-be6a-becc6911d6cf'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'mithridates-vi'
      AND p.nickname = '미트리다테스 6세'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '미트리다테스 6세 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '미트리다테스 6세 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id,
    '2026-07-30-mithridates-vi-empty-v1', 'Codex',
    ARRAY['미트리다테스 6세', 'Mithridates VI', 'Mithradates VI', 'Mithridates Eupator', 'Mithradates Eupator Dionysos', 'Μιθραδάτης Εὐπάτωρ'],
    '폰토스 왕 미트리다테스 6세 에우파토르를 같은 왕조의 미트리다테스 1~5세, 파르티아 왕들, 후대 라신·모차르트 등 미트리다테스 소재 작품과 분리했다.',
    '플리니우스·아피아노스·플루타르코스 계통 사료와 현대 학술 연구를 대조해 BOOK·VIDEO·GAME·MUSIC을 조사했다. 왕실 자료실에는 의학 관찰·처방·표본이 있었고 후대에 라틴어로 번역됐지만 외부 책 제목이 아니라 본인이 수집·작성한 연구 자료다. 페르가몬의 극장 정치와 디오니소스 경연 후원, 실제 전쟁·체육 경연, 음악 관심도 확인되지만 개인이 소비한 제목 있는 작품은 식별되지 않아 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '미트리다테스의 의학 기록·처방·표본 자료실', '미트리다테스 6세와 왕실 연구자들', NULL,
      '플리니우스는 미트리다테스가 각지에서 의학 정보를 모아 비밀 자료실에 기록과 표본을 남겼고 폼페이우스가 이를 라틴어로 번역하게 했다고 전한다.',
      '자료실의 개별 외부 서명·저자가 식별되지 않고 핵심 자료는 왕 자신이 수집·작성한 연구 기록이다. 소유한 미지의 장서를 임의의 고대 의학서로 치환하지 않았다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '페르가몬의 디오니소스 극장 정치와 후대 미트리다테스 극화', NULL, NULL,
      '미트리다테스는 페르가몬의 극장·디오니소스 제도와 공연 조직을 정치 선전에 활용했고 후대에는 수많은 비극·오페라의 소재가 됐다.',
      '후원·정치적 연출은 본인이 감상한 제목 있는 극 작품을 특정하지 않는다. 후대 비극·오페라는 사후 재현물이다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '미트리다테스 전쟁·고대 체육 경연과 후대 전략 게임', NULL, NULL,
      '아피아노스는 전쟁과 왕을 위한 체육·음악 경연을 기록하고 후대 게임은 이를 소재로 삼는다.',
      '실제 전쟁과 고대 체육 경연은 디지털 GAME이 아니며 후대 전략 게임은 본인의 플레이 기록이 아니다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '디오니소스 음악 경연·왕의 음악 관심 일반', NULL, NULL,
      '고대 사료와 연구는 미트리다테스의 음악 관심과 정치적 음악 경연 후원을 전한다.',
      '경연·장르·관심만으로는 곡명·작곡가·연주자를 가진 개인 청취작을 식별할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '미트리다테스 6세 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://penelope.uchicago.edu/Thayer/L/Roman/Texts/Pliny_the_Elder/25*.html',
      'primary', 'archive', 'accessible',
      'Pliny the Elder, Natural History, Book 25 — LacusCurtius',
      '의학 기록·표본을 남기고 폼페이우스가 번역시켰다는 본문을 확인했으나 외부 책의 개별 서명은 없다.'
    ),
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://www.iranicaonline.org/articles/mithridates-vi-eupator-dionysos/',
      'secondary', 'article', 'accessible',
      'Mithridates VI — Encyclopaedia Iranica',
      '인물·동명이인·사료 범위를 확인하고 왕실 연구 기록과 개인 독서를 분리했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://academic.oup.com/book/60572/chapter/524140927/chapter-pdf/63579332/workid-ukac0039137-book-part-6.pdf',
      'secondary', 'article', 'accessible',
      'Politicized Theatre and Political Theatrics at Pergamon and Rome — Oxford Academic',
      '미트리다테스가 페르가몬의 극장 제도를 정치적으로 활용한 사실을 특정 관람작과 구별했다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://www.livius.org/sources/content/appian/appian-the-mithridatic-wars/',
      'primary', 'archive', 'accessible',
      'Appian, The Mithridatic Wars — Livius',
      '실제 전쟁과 경연을 디지털 GAME 소비와 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://www.laphamsquarterly.org/roundtable/mithridates-great-pharmacologist',
      'secondary', 'article', 'accessible',
      'Mithridates the Great Pharmacologist — Lapham’s Quarterly',
      '그리스 교육·음악 관심·의학 자료실은 확인되지만 곡 단위 청취 기록은 제시되지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '미트리다테스 6세 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'Mithridates·Mithradates와 read·book·library·medicine 조합을 조사했다. 의학 자료실은 외부 서명이 식별되지 않는 본인 연구 기록이라 기각했다.'
        WHEN 'VIDEO' THEN 'watched·theatre·performance·Pergamon 조합을 조사했다. 극장 정치·후원과 후대 극화 외에 제목 있는 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·contest·war 조합을 조사했다. 실제 전쟁·고대 체육 경연과 후대 게임은 본인의 디지털 GAME 소비가 아니다.'
        WHEN 'MUSIC' THEN 'music·song·heard·contest·Dionysus 조합을 조사했다. 음악 관심·경연 후원 외에 곡명·창작자가 특정되는 청취작은 없다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '미트리다테스 6세 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '미트리다테스 6세 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '미트리다테스 6세 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
