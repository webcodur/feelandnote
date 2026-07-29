-- 루이 14세 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택:
--   MUSIC  장바티스트 륄리·필리프 키노 《Atys》 — 1676년 국왕 앞 초연과 반복 리허설 참석
-- 기각:
--   BOOK   샤를 6세 역사서 — 교육 중 독서는 확인되나 저자·정확한 서명이 없음
--   VIDEO  몰리에르·륄리의 코미디 발레 — 실연 무대 작품이며 TMDB 영상 작품이 아님
--   GAME   당구·사냥·보드게임 — 실제 신체·물리 놀이
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'f7afb86b-6a9b-41f0-b3a4-e70a6ea4b3ab'::uuid;
  target_run_id constant uuid := 'b65a4b9a-9a70-4e69-a6da-1effb4e71146'::uuid;
  content_id constant text := '3748c5bf-a4d7-4136-bcf5-d3123e1fd386';
  user_content_id constant uuid := 'f10dc0e7-af4d-4325-9242-62b3b52f1829'::uuid;
  accepted_music_finding_id constant uuid := '2027f71b-929d-45ce-94af-26366e59f319'::uuid;
  rejected_book_finding_id constant uuid := '563b8936-8614-4953-bc7b-a0e8f452cc04'::uuid;
  rejected_video_finding_id constant uuid := 'a7f65efc-33f1-4507-82fd-ab05f633e83d'::uuid;
  rejected_game_finding_id constant uuid := '0f17366f-825d-4c0f-85b0-bc7b87958922'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'louis-xiv'
      AND p.nickname = '루이 14세'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '루이 14세 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '루이 14세에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      accepted_music_finding_id,
      rejected_book_finding_id,
      rejected_video_finding_id,
      rejected_game_finding_id
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = user_content_id
  ) THEN
    RAISE EXCEPTION '루이 14세 조사 실행 또는 이번 반영 ID가 이미 존재합니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id = content_id
       OR c.external_id IN (
         'spotify-2zXarYBGc4FPVECGrwYwFq',
         '2zXarYBGc4FPVECGrwYwFq'
       )
  ) OR EXISTS (
    SELECT 1
    FROM public.content_locales cl
    WHERE lower(cl.title) IN (lower('Atys'), lower('아티스'))
  ) THEN
    RAISE EXCEPTION 'Atys와 충돌하는 콘텐츠·외부 ID·제목이 이미 존재합니다.';
  END IF;

  INSERT INTO public.contents (
    id, type, metadata, release_date, external_source, external_id, user_count
  ) VALUES (
    content_id,
    'MUSIC',
    jsonb_build_object(
      'entityType', 'album',
      'albumType', 'album',
      'releaseDate', '1987',
      'totalTracks', 74,
      'spotifyUrl', 'https://open.spotify.com/album/2zXarYBGc4FPVECGrwYwFq',
      'artists', jsonb_build_array(
        'Jean-Baptiste Lully',
        'Les Arts Florissants',
        'William Christie'
      ),
      'originalWorkYear', 1676,
      'librettist', 'Philippe Quinault',
      'workId', 'LWV 53'
    ),
    '1987-01-01',
    'spotify',
    'spotify-2zXarYBGc4FPVECGrwYwFq',
    0
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Atys contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id, locale, title, creator, thumbnail_url, description,
    isbn, publisher, sources, verified
  ) VALUES
    (
      content_id,
      'ko',
      '아티스',
      '장바티스트 륄리 · 레자르 플로리상 · 윌리엄 크리스티',
      'https://i.scdn.co/image/ab67616d00001e025f8b83764804a18bd0ef5967',
      '필리프 키노의 대본에 장바티스트 륄리가 곡을 붙인 1676년 비극적 서정 오페라의 전곡 녹음이다.',
      NULL,
      NULL,
      jsonb_build_object(
        'primary', 'spotify',
        'thumbnail', 'spotify_oembed',
        'titlePolicy', 'ko_transliteration',
        'url', 'https://open.spotify.com/album/2zXarYBGc4FPVECGrwYwFq'
      ),
      true
    ),
    (
      content_id,
      'en',
      'Atys',
      'Jean-Baptiste Lully · Les Arts Florissants · William Christie',
      'https://i.scdn.co/image/ab67616d00001e025f8b83764804a18bd0ef5967',
      'A complete recording of the 1676 tragédie en musique composed by Jean-Baptiste Lully to a libretto by Philippe Quinault.',
      NULL,
      NULL,
      jsonb_build_object(
        'primary', 'spotify',
        'thumbnail', 'spotify_oembed',
        'url', 'https://open.spotify.com/album/2zXarYBGc4FPVECGrwYwFq'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION 'Atys content_locales 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    user_content_id,
    target_celeb_id,
    content_id,
    'FINISHED',
    $ko$1676년 초판 대본의 표제지는 《아티스》가 1월 10일 생제르맹앙레에서 국왕 앞에 상연됐다고 적었다. 베르사유 바로크음악센터는 루이 14세가 초연 한 달 전부터 여러 차례 리허설에 참석했으며 이 작품에 각별한 관심을 보였다고 설명한다. 실제 상연과 반복 청취가 작품명·창작자와 함께 확인되므로 등록한다.$ko$,
    $en$The title page of the 1676 libretto states that *Atys* was performed before His Majesty at Saint-Germain-en-Laye on 10 January. The Centre de musique baroque de Versailles further documents Louis XIV's attendance at several rehearsals beginning more than a month before the premiere and his exceptional interest in the work.$en$,
    'https://gallica.bnf.fr/ark:/12148/bpt6k6524930f/f9.item',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '루이 14세 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = content_id;

  IF (
    SELECT c.user_count FROM public.contents c WHERE c.id = content_id
  ) <> 1 THEN
    RAISE EXCEPTION 'Atys user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-louis-xiv-full-v1',
    'Codex',
    ARRAY[
      '루이 14세', 'Louis XIV', 'Louis XIV de France',
      'Louis le Grand', 'le Roi-Soleil', 'Sun King'
    ],
    '프랑스 국왕 루이 14세(1638~1715)를 루이 13세·루이 15세·루이 16세와 분리하고, 후대 영화·드라마·게임 속 태양왕과 본인의 회고록·왕실 발주물을 외부 소비 콘텐츠에서 제외했다.',
    '프랑스어·영어·한국어 이름 변형으로 네 유형을 조사하고 1676년 초판 대본, 베르사유 궁전·바로크음악센터 자료와 왕자 교육 연구를 대조했다. 《Atys》의 국왕 앞 상연과 루이 14세의 반복 리허설 참석이 작품명·창작자와 함께 확인돼 MUSIC 1건을 등록했다. 어린 시절 읽은 샤를 6세 역사는 정확한 저자·서명이 없고, 코미디 발레·비극은 실연 무대 작품이며, 당구·사냥·보드게임은 디지털 작품이 아니어서 기각했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      accepted_music_finding_id,
      target_run_id,
      'MUSIC',
      'accepted',
      'Atys',
      'Jean-Baptiste Lully · Philippe Quinault',
      content_id,
      '1676년 초판 대본은 1월 10일 생제르맹앙레에서 국왕 앞 상연을 명시한다. 베르사유 바로크음악센터는 루이 14세가 초연 한 달 전부터 여러 리허설에 참석했다고 확인한다.',
      NULL
    ),
    (
      rejected_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '샤를 6세의 역사',
      NULL,
      NULL,
      'CNRS의 왕자 교육 연구는 1649년 생제르맹 체류 중 열한 살 루이 14세가 샤를 6세의 역사를 읽었다고 기록한다.',
      '읽기 행위는 확인되지만 사료가 정확한 서명·저자·판본을 특정하지 않는다. 여러 샤를 6세 연대기 중 하나를 임의로 골라 등록할 수 없다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '몰리에르·륄리의 코미디 발레',
      'Molière · Jean-Baptiste Lully',
      NULL,
      '베르사유 공식 자료는 루이 14세가 몰리에르와 륄리의 코미디 발레를 관람했으며 왕실에서 여러 작품이 상연됐다고 설명한다.',
      '확인되는 대상은 생전 실연 무대 작품이다. 실제로 소비한 공연을 후대 영화·녹화물의 TMDB 식별자에 붙이면 다른 작품이 되므로 VIDEO로 등록하지 않는다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '당구·사냥·보드게임',
      NULL,
      NULL,
      '베르사유 궁전 공식 전기는 루이 14세가 사냥과 보드게임을 즐겼고 특히 당구를 좋아했다고 설명한다.',
      '실제 신체 활동과 물리 보드게임이며 작품 단위 디지털 GAME이 아니다. 상품명·소프트웨어 식별자도 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '루이 14세 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://books.openedition.org/editionscnrs/61644',
      'secondary',
      'article',
      'accessible',
      'Devenir prince — Le prince juste et prudent',
      'CNRS Éditions 연구에서 1649년 열한 살 국왕의 샤를 6세 역사 독서를 확인했으나 정확한 저자·서명은 제시하지 않는다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://www.chateauversailles.fr/resources/pdf/en/presse/dp_louisxiv_en.pdf',
      'secondary',
      'official_profile',
      'accessible',
      'Louis XIV: the Man and the King',
      '국왕이 몰리에르·륄리의 코미디 발레를 관람한 사실과 실연 무대라는 성격을 대조했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://www.chateauversailles.fr/decouvrir/histoire/grands-personnages/louis-xiv',
      'secondary',
      'official_profile',
      'accessible',
      'Louis XIV — Château de Versailles',
      '사냥·보드게임·당구 선호를 확인하고 디지털 GAME과 분리했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      accepted_music_finding_id,
      'https://gallica.bnf.fr/ark:/12148/bpt6k6524930f/f9.item',
      'primary',
      'archive',
      'accessible',
      'Atys, tragédie en musique — 1676 title page',
      '1676년 초판 대본 표제지가 작품명·륄리·키노와 1월 10일 국왕 앞 상연을 직접 명시한다.'
    ),
    (
      target_run_id,
      'MUSIC',
      accepted_music_finding_id,
      'https://cmbv.fr/fr/tous-les-projets/atys-lully',
      'secondary',
      'article',
      'accessible',
      'Atys, Lully — Centre de musique baroque de Versailles',
      '루이 14세가 초연 한 달 전부터 여러 리허설에 참석했고 작품에 특별한 관심을 보였음을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      accepted_music_finding_id,
      'https://open.spotify.com/album/2zXarYBGc4FPVECGrwYwFq',
      'secondary',
      'official_profile',
      'accessible',
      'Lully: Atys — Spotify album',
      '레자르 플로리상·윌리엄 크리스티의 74트랙 전곡 음반 ID·연도·표지를 대조했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '루이 14세 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Louis XIV·Louis le Grand·Roi-Soleil과 read·lecture·livre·bibliothèque·éducation 조합을 검색했다. 샤를 6세 역사 독서는 확인되나 서명·저자 미상이고, 《Mémoires》는 본인 저술이라 제외했다.'
      WHEN 'VIDEO' THEN
        'spectacle·théâtre·comédie·tragédie·attended·watched 조합을 베르사유 공식 자료에서 대조했다. 코미디 발레 관람은 확인되지만 생전 실연을 후대 TMDB 영상에 연결하지 않았다.'
      WHEN 'GAME' THEN
        'jeu·billard·chasse·board game·played 조합을 검색했다. 당구·사냥·물리 보드게임은 작품 단위 디지털 GAME이 아니며 특정 소프트웨어 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        'musique·opéra·Lully·Atys·répétition·représenté devant le roi 조합을 초판 대본과 CMBV에서 대조했다. 국왕 앞 초연과 여러 리허설 참석을 확인해 《Atys》 전곡 음반을 연결했다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '루이 14세 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '루이 14세 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  UPDATE public.profiles p
  SET celeb_tier = 'full'
  WHERE p.id = target_celeb_id
    AND p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '루이 14세 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 1
  ) THEN
    RAISE EXCEPTION '루이 14세 프로필·콘텐츠 최종 검증에 실패했습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
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
    RAISE EXCEPTION '루이 14세 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
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
           WHERE f.run_id = r.id AND f.decision = 'accepted') = 1
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 3
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '루이 14세 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
