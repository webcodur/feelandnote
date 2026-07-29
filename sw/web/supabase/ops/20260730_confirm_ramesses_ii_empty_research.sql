-- 람세스 2세의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 반영한다.
-- 카데시 문학 기록과 왕실 축제는 본인의 선전·의례 자료이며 개인의 외부 작품 소비 증거가 아니다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '4d8c28b7-846f-491c-9898-e41bc9f784cc'::uuid;
  target_run_id constant uuid := '9da4e5be-2dcc-498e-8eac-7deb2c63eca0'::uuid;
  book_finding_id constant uuid := '6c4ac3f3-4dc0-4921-afbc-7059f76037d2'::uuid;
  video_finding_id constant uuid := '6722f335-9ed3-4126-a665-ef2546a91900'::uuid;
  game_finding_id constant uuid := 'cd9329fc-ed03-402f-9a4b-4de7794ada67'::uuid;
  music_finding_id constant uuid := '557bb2af-3b1e-49ab-b274-22519285fbc6'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'ramesses-ii'
      AND p.nickname = '람세스 2세'
      AND p.nickname_en = 'Ramesses II'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '람세스 2세 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '람세스 2세 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-ramesses-ii-empty-v1',
    'Codex',
    ARRAY['람세스 2세', '람세스 대왕', 'Ramesses II', 'Ramses II', 'Rameses II', 'Usermaatra-Setepenra', 'Ozymandias'],
    '이집트 제19왕조의 람세스 2세(재위 기원전 1279~1213)를 람세스 1세·3세, 서기관 람세스, 셸리의 후대 시 「오지만디아스」와 분리했다.',
    '대영박물관의 카데시 파피루스와 람세스 2세 소장품, 메트로폴리탄미술관의 세드 축제 부조를 중심으로 조사했다. 「카데시 시」·전승 공고문·신전 부조는 왕 자신의 전쟁 승리를 1인칭으로 선전한 왕실 기록이어서 외부 독서가 아니다. 축제와 의례에는 음악·공연이 수반됐겠지만 람세스 개인이 소비한 제목 있는 작품은 남지 않는다. 세네트는 동시대 이집트의 놀이지만 왕비 네페르타리의 유명한 장면을 람세스에게 옮길 수 없고, 왕 자신의 대국 기록도 확인되지 않았다. 후대 영화·시·게임은 사후 재현이므로 0건으로 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'rejected',
      '카데시 시·문학 기록', '람세스 2세 왕실 서기관 집단', NULL,
      '대영박물관의 파피루스 살리에 3은 카데시 전투를 람세스 2세의 1인칭 관점으로 서술하며 그의 단독 승리와 아문 신의 도움을 선전한다.',
      '왕 자신의 업적을 위해 제작한 왕실 기록·비문은 외부 소비 콘텐츠가 아니므로 제외한다.'
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '세드 축제·신전 의례와 후대 람세스 영상 일반', NULL, NULL,
      '람세스의 장기 통치 중 세드 축제가 열렸고 이를 묘사한 왕실 부조가 남아 있다.',
      '의례 개최 사실만으로 왕이 관람한 제목 있는 공연을 특정할 수 없으며 후대 영화·다큐멘터리는 사후 제작물이다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '세네트', NULL, NULL,
      '세네트는 신왕국 시대의 대표 놀이이고 람세스 왕실과 가까운 맥락에서 널리 알려져 있다.',
      '람세스 2세 본인이 두었다는 직접 기록이나 장면은 확인되지 않았다. 네페르타리의 유명한 세네트 장면을 남편에게 전가하지 않는다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '세드 축제·신전 궁정 음악 일반', NULL, NULL,
      '왕실 축제와 신전 의례에는 음악과 행렬이 있었지만 자료는 람세스의 왕권과 의례를 기록한다.',
      '람세스 개인이 듣거나 주문한 제목 있는 곡·악무가 특정되지 않아 작품 단위 MUSIC에 연결할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '람세스 2세 finding 생성 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.britishmuseum.org/collection/object/Y_EA10181-4',
      'primary', 'archive', 'accessible',
      'Papyrus Sallier 3 — Poem of the Battle of Qadesh',
      '카데시 문학 기록이 람세스의 1인칭 관점과 왕실 승리 선전으로 구성된 텍스트임을 확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.cfeetk.cnrs.fr/archives/?n=12702',
      'primary', 'archive', 'accessible',
      'Version littéraire de la Bataille de Qadesh — CFEETK',
      '카르나크 신전의 카데시 문학 기록 판본과 왕실 비문 맥락을 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://www.metmuseum.org/art/collection/search/548209',
      'primary', 'archive', 'accessible',
      'Jubilee Relief of Ramesses II',
      '람세스가 세드 축제를 거행한 왕실 의례 장면을 확인했으나 제목 있는 관람 작품을 제시하지 않는다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://www.britishmuseum.org/collection/term/BIOG55529',
      'secondary', 'official_profile', 'accessible',
      'Ramses II — British Museum Collections Online',
      '390건의 연관 소장품과 인물 식별 범위를 확인했으나 람세스 개인의 세네트 대국 자료는 찾지 못했다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://www.metmuseum.org/-/media/files/about-the-met/curatorial-departments/egyptian/facsimiles/2019_drinkandbemerry__web.pdf',
      'secondary', 'article', 'accessible',
      'Drink and Be Merry! Music and Performance in Ancient Egypt',
      '람세스 2세 치세를 포함한 신왕국 음악·축제 맥락을 검토했지만 왕 개인의 제목 있는 곡 소비 증거는 없다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://www.britishmuseum.org/collection/galleries/egyptian-sculpture/colossal-statue-ramesses-ii',
      'secondary', 'official_profile', 'accessible',
      'The colossal statue of Ramesses II',
      '람세스의 생애·왕실 이미지·후대 「오지만디아스」 연결을 구분해 사후 작품을 제외했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '람세스 2세 source 생성 행 수가 6개가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Ramesses II·Ramses II·read·book·Kadesh Poem·Papyrus Sallier 조합으로 조사했다. 카데시 기록은 왕실 자가 선전물이라 제외했다.'
      WHEN 'VIDEO' THEN
        'performance·festival·Sed festival·spectacle·watched 조합을 조사했다. 의례 개최는 있으나 제목 있는 관람 작품은 없다.'
      WHEN 'GAME' THEN
        'game·senet·mehen·played 조합을 조사했다. 동시대 놀이 일반과 네페르타리 장면 외에 왕 본인의 직접 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·harp·festival·listened 조합을 조사했다. 왕실 의례 일반만 있고 작품 단위 감상은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '람세스 2세 scope 완료 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '람세스 2세 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '람세스 2세 light·confirmed_empty 최종 검증에 실패했습니다.';
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
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '람세스 2세 조사 저장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

ROLLBACK;
