-- 키루스 대왕 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  키루스 원통 — 키루스 명의의 왕실 포고문
--   BOOK  키루스의 교육 — 키루스 사후에 쓴 허구적 전기

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '1dcffe2e-3baf-4798-b21f-8ed3b403d843'::uuid;
  target_run_id constant uuid := '07331e7c-23b5-4ef6-9be9-93e55114730c'::uuid;
  rejected_cylinder_id constant uuid := '3d380ebb-2b50-472f-bff9-ab4048e350bd'::uuid;
  rejected_cyropaedia_id constant uuid := '640c1131-49b5-497f-bc7e-f3b63f5b13ab'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id AND p.slug = 'cyrus-the-great'
      AND p.nickname = '키루스 대왕' AND p.profile_type = 'CELEB'
      AND p.status = 'active' AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '키루스 대왕 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id) THEN
    RAISE EXCEPTION '키루스 대왕에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_cylinder_id, rejected_cyropaedia_id)
  ) THEN
    RAISE EXCEPTION '키루스 대왕 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-cyrus-the-great-full-v1',
    'Codex',
    ARRAY['키루스 대왕', '고레스', 'Cyrus the Great', 'Cyrus II', 'Cyrus of Persia', 'Κῦρος', 'Kūruš'],
    '크세노폰의 소 키루스와 키루스 대왕을 구분했다. 현대 영화·소설·게임의 키루스 캐릭터와 키루스를 소재로 한 음악, 다른 동명 인물은 제외했다.',
    '한국어·영어·그리스어·고대 페르시아어 이름 변형으로 네 유형을 검색하고 키루스 원통·나보니두스 연대기 계열의 동시대 자료와 헤로도토스·크세노폰 전승을 대조했다. 키루스 원통은 그의 명령으로 제작된 왕실 포고문이며 외부 독서물이 아니다. 『키루스의 교육』은 키루스보다 약 2세기 뒤 크세노폰이 쓴 허구적 군주 전기여서 본인이 읽을 수 없다. 특정 영상·디지털 게임·음악 작품 소비 기록도 없어 네 유형 모두 채택 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_cylinder_id, target_run_id, 'BOOK', 'rejected',
      '키루스 원통', '키루스 2세 명의의 바빌로니아 서기관', NULL,
      '대영박물관은 이 점토 원통을 539년 바빌론 정복 뒤 키루스의 명령으로 작성해 성벽 기초에 묻은 후기 바빌로니아식 왕실 비문으로 설명한다.',
      '키루스 명의로 발행·매장한 포고문이므로 그가 소비한 외부 BOOK이 아니다. 개인이 읽은 판본이나 감상 경위도 아니다.'
    ),
    (
      rejected_cyropaedia_id, target_run_id, 'BOOK', 'rejected',
      '키루스의 교육', '크세노폰', NULL,
      '크세노폰의 8권 저술은 키루스의 성장과 통치를 이상적 군주상으로 재구성한다.',
      '크세노폰은 키루스 사후 약 1세기 뒤 태어난 인물이며 이 작품은 허구적 전기로 평가된다. 키루스가 시간상 읽을 수 없는 자신에 관한 후대 작품이다.'
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '키루스 대왕 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_cylinder_id,
      'https://www.britishmuseum.org/collection/object/W_1880-0617-1941',
      'primary', 'archive', 'accessible', 'The Cyrus Cylinder, British Museum',
      '키루스의 명령으로 제작된 왕실 비문이며 성벽 기초에 묻기 위한 물건이라는 박물관 설명을 확인했다.'
    ),
    (
      target_run_id, 'BOOK', rejected_cylinder_id,
      'https://www.livius.org/sources/content/cyrus-cylinder/',
      'primary', 'archive', 'accessible', 'Cyrus Cylinder',
      '원문 번역과 바빌로니아 왕실 포고문의 맥락을 대조했다.'
    ),
    (
      target_run_id, 'BOOK', rejected_cyropaedia_id,
      'https://www.perseus.tufts.edu/hopper/text?doc=Xen.+Cyrop.+1.2',
      'primary', 'archive', 'accessible', 'Xenophon, Cyropaedia 1.2',
      '크세노폰이 구성한 페르시아 교육 제도와 키루스의 유년 서사를 확인했다.'
    ),
    (
      target_run_id, 'BOOK', rejected_cyropaedia_id,
      'https://www.livius.org/articles/person/cyrus-the-great/',
      'secondary', 'article', 'accessible', 'Cyrus the Great',
      '동시대 핵심 자료와 달리 『키루스의 교육』은 역사 정보가 없는 허구적 전기로 평가된다는 자료 비판을 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', NULL,
      'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Herodotus/1B%2A.html',
      'primary', 'archive', 'accessible', 'Herodotus, Histories, Book 1',
      '키루스 전승을 watched·theatre·performance 조합과 대조했으나 특정 관람 작품은 없었다.'
    ),
    (
      target_run_id, 'GAME', NULL,
      'https://www.gutenberg.org/ebooks/2085',
      'secondary', 'archive', 'accessible', 'Cyropaedia: The Education of Cyrus',
      '사냥·군사 훈련·경쟁 장면은 후대 허구 전기 속 신체 활동이며 디지털 GAME 플레이 기록이 아니다.'
    ),
    (
      target_run_id, 'MUSIC', NULL,
      'https://www.livius.org/articles/person/cyrus-the-great/',
      'secondary', 'article', 'accessible', 'Cyrus the Great: sources and biography',
      '동시대 자료와 후대 전승을 music·song·dance·performance 조합으로 대조했으나 특정 곡·연주·공연 소비 기록은 없었다.'
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '키루스 대왕 조사 source 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN '키루스 대왕·고레스·Cyrus the Great·Cyrus II·Κῦρος와 read·book·inscription·education 조합을 검색했다. 키루스 원통은 본인 명의 포고문이고 『키루스의 교육』은 사후 허구 전기라 제외했다.'
        WHEN 'VIDEO' THEN '키루스와 watched·theatre·performance·film 조합을 검색했다. 헤로도토스와 동시대 기록에는 특정 관람 작품이 없고 현대 영화·다큐멘터리는 후대 제작물이다.'
        WHEN 'GAME' THEN '키루스와 game·played·board game·hunt·competition 조합을 검색했다. 사냥·기마·군사 훈련은 디지털 GAME이 아니며 크세노폰의 장면도 후대 허구 서사다.'
        WHEN 'MUSIC' THEN '키루스와 music·song·dance·performance 조합을 검색했다. 궁정·정복 의례 일반 외에 제목·창작자가 식별되는 감상 작품은 확인되지 않았다.'
      END
  WHERE s.run_id = target_run_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '키루스 대왕 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;
  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '키루스 대왕 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '키루스 대왕 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 2
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 7
  ) THEN
    RAISE EXCEPTION '키루스 대왕 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
