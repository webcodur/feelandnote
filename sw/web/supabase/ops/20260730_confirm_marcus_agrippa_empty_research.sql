-- 마르쿠스 아그리파 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 베르길리우스 문체 비평·축제 운영·지도 제작은 확인되지만 제목 있는 외부 작품 소비는 식별되지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'f8068ca6-0398-46ac-a302-0ba2025d2e07'::uuid;
  target_run_id constant uuid := '9d6d174b-4d4e-4f00-8a57-ec291ef303c0'::uuid;
  rejected_book_finding_id constant uuid := '8bfbc0dd-feaf-434b-beb7-a938e1db2179'::uuid;
  rejected_video_finding_id constant uuid := '35e4212e-8503-4fff-a126-39563662e088'::uuid;
  rejected_game_finding_id constant uuid := '8a495688-7a0e-4c46-af3d-c546da206d2d'::uuid;
  rejected_music_finding_id constant uuid := '1a801e03-94a9-4408-8661-48781ce8c2a9'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'marcus-agrippa'
      AND p.nickname = '마르쿠스 아그리파'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '마르쿠스 아그리파 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '마르쿠스 아그리파 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-marcus-agrippa-empty-v1',
    'Codex',
    ARRAY['마르쿠스 아그리파', 'Marcus Agrippa', 'Marcus Vipsanius Agrippa', 'M. Vipsanius Agrippa', 'M·VIPSPANIVS·AGRIPPA'],
    '아우구스투스의 장군 마르쿠스 빕사니우스 아그리파를 아그리파 포스투무스, 유대 왕 헤로데 아그리파, 르네상스의 하인리히 코르넬리우스 아그리파와 분리했다.',
    '라틴어·영어·한국어 이름과 Virgil·Aeneid·read·criticism·games·theatre·music·map 조합으로 네 유형을 조사했다. 수에토니우스계 『베르길리우스 생애』의 “M. Vipsanius”는 아그리파로 보는 견해와 다른 인물·이문으로 보는 견해가 갈리고, 무엇보다 비평 대상 작품명이 제시되지 않는다. 아그리파 자신의 지리 주석·세계지도는 자체 제작물이다. 악티움 승전 축제와 경기 운영은 확인되지만 개인의 제목 있는 공연 감상이나 디지털 게임·곡 청취가 아니어서 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '베르길리우스 작품 일반과 아그리파의 지리 주석', '베르길리우스 / 마르쿠스 아그리파', NULL,
      '수에토니우스계 『베르길리우스 생애』 44는 “M. Vipsanius”가 베르길리우스의 숨은 문체적 기교를 비판했다고 전한다. 다른 사료는 아그리파가 세계 지리 주석과 지도를 남겼다고 전한다.',
      'M. Vipsanius가 장군 아그리파인지 본문 이문 또는 다른 인물인지 논쟁이 있고, 비평한 베르길리우스 작품명도 나오지 않는다. 지리 주석·지도는 아그리파 자신의 제작물이므로 외부 BOOK 소비에서 제외했다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '악티움 승전 축제와 로마의 공연 시설', '아우구스투스·마르쿠스 아그리파', NULL,
      '카시우스 디오는 아우구스투스와 아그리파가 악티움 승전 축제를 함께 열었고, 아우구스투스가 병들자 아그리파가 행사를 계속 운영했다고 전한다.',
      '축제 운영과 극장·오데온 건축 후원은 특정 제목의 희곡·영상 작품을 아그리파가 관람했다는 기록이 아니다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '키르쿠스 경기·체육 경기·검투 시합', NULL, NULL,
      '악티움 축제에는 귀족 청년의 키르쿠스 경기, 체육 경기, 포로 사이의 검투 시합이 포함됐다.',
      '고대 실제 경기의 공동 주최·운영은 디지털 GAME 작품 플레이가 아니며, 아그리파가 참가자로 특정되지도 않는다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '축제·극장·오데온의 음악 공연 일반', NULL, NULL,
      '아그리파는 축제와 공연 공간을 후원했지만 남은 사료는 그가 들은 곡명이나 음악가를 특정하지 않는다.',
      '건축·행사 후원을 개인의 곡 단위 감상으로 바꿀 수 없고, 식별 가능한 MUSIC 작품이 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '마르쿠스 아그리파 조사 finding 생성 수가 4건이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://api.pageplace.de/preview/DT0400.9780511031090_A23687767/preview-9780511031090_A23687767.pdf',
      'secondary', 'article', 'accessible',
      'Virgil and the Augustan Reception',
      '『베르길리우스 생애』 44의 라틴어 원문과 번역을 싣고 M. Vipsanius를 아그리파로 보는 견해가 논쟁적임을 밝힌다.'
    ),
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://www.livius.org/articles/person/vipsanius-agrippa/vipsanius-agrippa-3/',
      'secondary', 'article', 'accessible',
      'M. Vipsanius Agrippa (3) — Livius',
      '아그리파의 세계지도와 지리 자료를 본인 제작물로 확인해 외부 작품 소비와 구별했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://lexundria.com/dio/53.1/go.htm',
      'primary', 'archive', 'accessible',
      'Cassius Dio, Roman History 53.1',
      '악티움 승전 축제의 공동 개최와 아그리파의 행사 운영을 확인했으나 제목 있는 관람작은 없다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://lexundria.com/dio/53.1/go.htm',
      'primary', 'archive', 'accessible',
      'Cassius Dio, Roman History 53.1',
      '키르쿠스·체육·검투 경기는 고대 실제 행사이며 디지털 GAME이 아니다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://www.persee.fr/doc/befar_0257-4101_1984_mon_253_1',
      'secondary', 'article', 'accessible',
      'Jean-Michel Roddaz, Marcus Agrippa',
      '아그리파 전기 연구를 대조했으나 곡명·작곡가·개별 청취 장면을 특정할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '마르쿠스 아그리파 조사 source 생성 수가 5건이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed',
      completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'Marcus Vipsanius Agrippa·Virgil·Aeneid·read·criticism·geography 조합을 조사했다. M. Vipsanius의 비평은 인물 식별이 논쟁적이고 작품명이 없으며, 지리 주석은 자체 저작이다.'
        WHEN 'VIDEO' THEN 'watched·theatre·performance·festival·Odeon 조합을 조사했다. 축제 운영과 공연 시설 후원만 확인되고 제목 있는 개인 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·Circensian·gladiatorial·contest 조합을 조사했다. 고대 실제 경기의 공동 주최는 디지털 GAME 플레이가 아니다.'
        WHEN 'MUSIC' THEN 'music·song·heard·festival·performance 조합을 조사했다. 행사·공간 후원 외에 곡명과 청취가 연결된 기록은 없다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '마르쿠스 아그리파 조사 scope 완료 수가 4건이 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '마르쿠스 아그리파 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.user_contents uc WHERE uc.user_id = p.id
      )
  ) THEN
    RAISE EXCEPTION '마르쿠스 아그리파 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
