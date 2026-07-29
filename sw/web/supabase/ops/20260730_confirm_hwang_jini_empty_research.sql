-- 황진이 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK   당시(唐詩) — 장르 수준의 간접 야담이며 특정 작품·저자 없음
--   VIDEO  2010 소리극 황진이와 후대 영상 — 사후 전기 각색물
--   GAME   유혹 일화·후대 오락화 — 디지털 GAME 작품 이용 근거 없음
--   MUSIC  거문고·가창 전승과 후대 창작곡 — 생전 곡명·창작자·청취 기록 없음
--
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '3b7ce906-bf9a-444f-b29b-411a91007630'::uuid;
  target_run_id constant uuid := '70d38b7b-8323-47cd-9025-a78ddae92533'::uuid;
  rejected_book_finding_id constant uuid := '85b71cc2-fb5c-4e34-aca2-b3d30b41f2d2'::uuid;
  rejected_video_finding_id constant uuid := '31adaa80-ecec-4eba-9778-d4fc5edb570a'::uuid;
  rejected_game_finding_id constant uuid := 'd4f77bd0-bdc9-4c8a-b19e-0feb409e3209'::uuid;
  rejected_music_finding_id constant uuid := '263e8e51-9d5f-4139-9f89-a1fbe85c061e'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'hwang-jini'
      AND p.nickname = '황진이'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '황진이 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '황진이에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      rejected_book_finding_id,
      rejected_video_finding_id,
      rejected_game_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '황진이 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-hwang-jini-full-v1',
    'Codex',
    ARRAY['황진이', '黃眞伊', '명월', '明月', 'Hwang Jini', 'Hwang Jin-i'],
    '조선 전기 기녀·시인 황진이를 동명의 현대 인물과 분리하고, 본인의 시조·한시 및 후대 전기·공연·영화·음악을 외부 감상 콘텐츠와 구별했다.',
    '한국어·한자·영문 이름과 read·book·당시·거문고·노래·공연·영화·게임 조합으로 한국민족문화대백과사전과 문화체육관광부·국립국악원 자료를 대조했다. 황진이의 생애는 직접 기록이 없고 후대 야담 의존도가 높다. 서경덕을 찾아 거문고를 가지고 가 당시를 연마했다는 전승은 장르 수준이며 특정 작품·시인·서명이 없다. 음률·가창·거문고 능력도 곡명이나 외부 창작자 및 청취 행위를 특정하지 않는다. 2010년 소리극과 34개 창작곡 등은 사후 각색이고, 자신의 시조는 자작물이다. 네 유형 모두 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '당시(唐詩)',
      NULL,
      NULL,
      '후대 야담에 기대는 전기 자료는 황진이가 서경덕을 찾아가 당시를 정공했다고 전한다.',
      '“당시”는 당나라 시 일반을 가리키는 장르 수준 표현이며 특정 시집·시편·저자를 식별하지 않는다. 직접 기록이 없는 간접 전승이므로 작품 단위 BOOK으로 채택할 수 없다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '소리극 황진이',
      '김용범·김효경·김대성 등',
      NULL,
      '국립국악원은 2010년 황진이의 생애와 일화를 재구성한 소리극 「황진이」를 공연했다.',
      '황진이 사후 약 450년 뒤에 제작된 전기 각색물로 본인이 관람한 작품이 아니다. 생전 특정 공연 관람 기록은 확인되지 않는다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '유혹 일화와 후대 오락화',
      NULL,
      NULL,
      '후대 야담은 지족선사·벽계수 등과의 일화를 전하지만 자료마다 내용이 달라 신빙성 확정이 어렵다.',
      '인간관계·유혹 일화는 디지털 GAME 작품이 아니며, 이를 소재로 한 후대 오락물도 황진이의 생전 이용 콘텐츠가 아니다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '거문고·가창 전승과 소리극 황진이 창작곡',
      '김대성 등',
      NULL,
      '황진이는 음률과 가창에 뛰어나고 거문고를 가지고 서경덕을 찾았다고 전한다. 2010년 소리극은 그의 시조 등을 바탕으로 34개 곡조를 새로 만들었다.',
      '생전 전승은 악기·기량만 전할 뿐 곡명·창작자·외부 작품 청취를 특정하지 않는다. 2010년 창작곡은 사후 음악화이며 자신의 시조는 자작물이라 제외한다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '황진이 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0065346',
      'secondary',
      'official_profile',
      'accessible',
      '황진이 — 한국민족문화대백과사전',
      '직접 기록이 없고 후대 야담에 의존한다는 한계와 “당시를 정공했다”는 장르 수준 전승을 함께 확인했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://www.mcst.go.kr/site/s_notice/news/newsView.jsp?pCurrentPage=280&pMenuCD=0305000000&pSearchType=TITLE&pSearchWord=&pSeq=1010',
      'secondary',
      'official_profile',
      'accessible',
      '국립국악원이 만든 대표 브랜드 3인3색 소리극 황진이 — 문화체육관광부',
      '공연이 2010년에 황진이의 생애·일화를 각색해 제작된 후대 작품임을 확인했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0065346',
      'secondary',
      'official_profile',
      'accessible',
      '황진이 — 한국민족문화대백과사전',
      '생애 자료에서 본인이 관람한 특정 제목의 공연은 확인되지 않고, 전승의 사료 한계가 명시된다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0065346',
      'secondary',
      'official_profile',
      'accessible',
      '황진이 — 한국민족문화대백과사전',
      '지족선사·벽계수 등의 일화가 후대 간접 기록이며 작품 단위 GAME 이용과 무관함을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0065346',
      'secondary',
      'official_profile',
      'accessible',
      '황진이 — 한국민족문화대백과사전',
      '음률·가창·거문고 전승은 확인되지만 특정 곡명·창작자·감상 행위는 제시되지 않는다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.mcst.go.kr/site/s_notice/news/newsView.jsp?pCurrentPage=280&pMenuCD=0305000000&pSearchType=TITLE&pSearchWord=&pSeq=1010',
      'secondary',
      'official_profile',
      'accessible',
      '국립국악원이 만든 대표 브랜드 3인3색 소리극 황진이 — 문화체육관광부',
      '황진이 등의 시를 노랫말로 삼아 김대성이 34개의 곡조를 새로 작곡한 2010년 사후 음악화임을 확인했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '황진이 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '황진이·黃眞伊·명월·Hwang Jini와 read·book·당시·시집 조합을 검색했다. “당시를 정공했다”는 후대 야담은 장르 수준이고 특정 작품·저자가 없어 채택하지 않았다.'
      WHEN 'VIDEO' THEN
        'watched·performance·theatre·film·소리극 조합을 검색했다. 확인되는 소리극·영화·드라마는 사후 전기 각색이며 생전 특정 관람작은 없다.'
      WHEN 'GAME' THEN
        'game·played·놀이·유혹 일화 조합을 검색했다. 후대 야담과 오락화뿐이며 작품 단위 디지털 GAME 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·거문고·가창·곡조 조합을 검색했다. 생전 전승에는 곡명·창작자·외부 작품 청취가 없고 2010년 창작곡은 사후 음악화다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '황진이 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '황진이 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '황진이 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '황진이 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
