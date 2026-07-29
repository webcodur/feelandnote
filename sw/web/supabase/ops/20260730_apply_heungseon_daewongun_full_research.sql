-- 흥선대원군 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택:
--   MUSIC  춘향가 — 경복궁 낙성연에서 진채선의 성조가와 춘향가를 듣고 후원
-- 기각:
--   BOOK   교학정례 편찬·서문 — 정책 편찬물이며 개인 독서 기록이 아님
--   VIDEO  도리화가 — 사후 제작된 전기 영화이며 본인의 관람작이 아님
--   GAME   바둑 — 실제 기호는 확인되나 디지털 GAME 작품이 아님
--
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'bac67dd1-0b4a-4283-9d50-56eeb0716645'::uuid;
  target_content_id constant text := 'ac133de0-3cf7-424e-b4bc-fe1a919f5e28';
  target_run_id constant uuid := '2bd81483-5a25-42c8-b3a8-89e5175c3646'::uuid;
  user_content_id constant uuid := '4c4b473c-6be5-41bd-a4d3-69ebdeadf0e7'::uuid;
  accepted_music_finding_id constant uuid := '1720ba79-40f0-44b4-b249-0747f327b928'::uuid;
  rejected_book_finding_id constant uuid := 'fea0faa6-ddc1-4c8d-9888-56f6284bfb2b'::uuid;
  rejected_video_finding_id constant uuid := 'f8f324a9-839f-41c3-b390-75bc557eaf68'::uuid;
  rejected_game_finding_id constant uuid := 'a0a66e3d-b4d4-498c-a144-f66672cd05c7'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'heungseon-daewongun'
      AND p.nickname = '흥선대원군'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '흥선대원군 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '흥선대원군에게 이미 연결된 콘텐츠가 있습니다.';
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
  ) OR EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = target_content_id
       OR c.external_id IN (
         'spotify-2vYYEwZ4yeIgYz5qJfSG8L',
         '2vYYEwZ4yeIgYz5qJfSG8L'
       )
  ) THEN
    RAISE EXCEPTION '흥선대원군 조사 실행·반영 ID 또는 춘향가 앨범 충돌 데이터가 이미 존재합니다.';
  END IF;

  INSERT INTO public.contents (
    id, type, metadata, release_date, external_source, external_id, user_count
  ) VALUES (
    target_content_id,
    'MUSIC',
    jsonb_build_object(
      'entityType', 'album',
      'albumType', 'album',
      'releaseDate', '2002-11-20',
      'totalTracks', 41,
      'durationText', '7 hr 42 min',
      'spotifyUrl', 'https://open.spotify.com/album/2vYYEwZ4yeIgYz5qJfSG8L',
      'artists', jsonb_build_array('오정숙'),
      'genre', '판소리',
      'canonicalWork', '춘향가'
    ),
    '2002-11-20',
    'spotify',
    'spotify-2vYYEwZ4yeIgYz5qJfSG8L',
    0
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '춘향가 contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id, locale, title, creator, thumbnail_url, description,
    isbn, publisher, sources, verified
  ) VALUES
    (
      target_content_id,
      'ko',
      '춘향가',
      '오정숙',
      'https://i.scdn.co/image/ab67616d00001e022eb583eabc73441f78d90f19',
      '판소리 다섯 바탕 가운데 하나인 춘향가를 명창 오정숙의 소리로 수록한 41곡 완창 음반이다.',
      NULL,
      '신나라뮤직',
      jsonb_build_object(
        'primary', 'spotify',
        'thumbnail', 'spotify',
        'titlePolicy', 'canonical-work-title',
        'url', 'https://open.spotify.com/album/2vYYEwZ4yeIgYz5qJfSG8L'
      ),
      true
    ),
    (
      target_content_id,
      'en',
      'Chunhyangga',
      'Oh Jeong-suk',
      'https://i.scdn.co/image/ab67616d00001e022eb583eabc73441f78d90f19',
      'A complete 41-track recording of Chunhyangga, one of the five surviving pansori narrative cycles, performed by master singer Oh Jeong-suk.',
      NULL,
      'Synnara Music',
      jsonb_build_object(
        'primary', 'spotify',
        'thumbnail', 'spotify',
        'titlePolicy', 'canonical-romanization',
        'url', 'https://open.spotify.com/album/2vYYEwZ4yeIgYz5qJfSG8L'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '춘향가 content_locales 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    user_content_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    $ko$KBS 역사 자료는 경복궁 낙성연에 전국의 명창을 불러들인 흥선대원군 앞에서 진채선이 신재효의 「성조가」와 「춘향가」를 불렀다고 전한다. 그는 소리를 들은 뒤 진채선의 스승을 묻고 그녀를 후원했다. 작품명과 실제 청취 장면이 함께 확인되므로, 오늘 들을 수 있는 오정숙의 완창 음반에 연결한다.$ko$,
    $en$KBS’s historical account says that Heungseon Daewongun summoned leading singers to a banquet celebrating the completion of Gyeongbokgung Palace. Jin Chae-seon performed “Seongjoga” and Chunhyangga before him; after hearing her, he asked about her teacher and became her patron. Because the named work and the listening event are recorded together, this entry links the episode to Oh Jeong-suk’s complete recording.$en$,
    'https://world.kbs.co.kr/service/contents_view.htm?board_code=korean_story&board_seq=61132&id=&lang=k&menu_cate=history&page=3',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '흥선대원군 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = target_content_id;

  IF (
    SELECT c.user_count FROM public.contents c WHERE c.id = target_content_id
  ) <> 1 THEN
    RAISE EXCEPTION '춘향가 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-heungseon-daewongun-full-v1',
    'Codex',
    ARRAY['흥선대원군', '흥선군 이하응', '이하응', 'Heungseon Daewongun', 'Yi Ha-eung', 'Lee Ha-eung'],
    '조선 왕족·정치가 이하응(1820~1898)을 동명 배역과 후대 영화·드라마 속 흥선대원군, 아들 고종과 분리했다. 궁중 행사 주최와 개인의 작품 청취도 구별했다.',
    '한국어·한자·영어 이름과 독서·판소리·춘향가·도리화가·바둑 조합으로 네 유형을 조사했다. 경복궁 낙성연에서 진채선의 「성조가」와 「춘향가」를 직접 듣고 후원했다는 작품 단위 기록을 MUSIC 1건으로 채택했다. 『교학정례』 편찬은 정책 업무, 영화 『도리화가』는 사후 재현, 바둑은 디지털 GAME이 아니므로 각각 기각했다.'
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
      '춘향가',
      '판소리 전승·진채선',
      target_content_id,
      '경복궁 낙성연에서 진채선이 흥선대원군 앞에서 「성조가」와 「춘향가」를 불렀고, 그가 소리를 들은 뒤 진채선을 후원했다고 KBS와 한국민족문화대백과가 전한다.',
      NULL
    ),
    (
      rejected_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '교학정례',
      '흥선대원군 주도 편찬',
      NULL,
      '흥선대원군은 국가 의례 정비를 위해 『교학정례』 편찬을 주도하고 서문을 썼다.',
      '자신의 정책 사업으로 편찬한 관찬 예서이며, 외부 창작물에 대한 개인 독서·감상 기록으로 볼 수 없다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '도리화가',
      '이종필',
      NULL,
      '2015년 영화 『도리화가』는 진채선과 신재효의 이야기에 흥선대원군을 등장시킨다.',
      '흥선대원군 사후 제작된 전기 영화로 본인이 관람한 작품이 아니다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '바둑',
      NULL,
      NULL,
      '한국민족문화대백과는 흥선대원군이 바둑을 즐겼다는 일화를 전한다.',
      '바둑 기호는 확인되지만 이 분류의 GAME은 작품 단위 디지털 게임이다. 특정 디지털 GAME 이용 기록은 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '흥선대원군 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0005607',
      'secondary', 'official_profile', 'accessible',
      '교학정례 — 한국민족문화대백과사전',
      '흥선대원군 주도의 편찬 경위와 서문을 확인하고 개인 독서와 분리했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://www.koreanfilm.or.kr/eng/films/index/filmsView.jsp?movieCd=20140144',
      'secondary', 'official_profile', 'accessible',
      'The Sound of a Flower — Korean Film Council',
      '영화의 2015년 제작·개봉 정보와 후대 전기극이라는 성격을 확인했다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0020464',
      'secondary', 'official_profile', 'accessible',
      '바둑 — 한국민족문화대백과사전',
      '흥선대원군의 바둑 기호 일화를 확인했지만 디지털 GAME 작품과 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', accepted_music_finding_id,
      'https://world.kbs.co.kr/service/contents_view.htm?board_code=korean_story&board_seq=61132&id=&lang=k&menu_cate=history&page=3',
      'primary', 'official_profile', 'accessible',
      '조선 최초의 여류 명창 진채선 — KBS World',
      '경복궁 낙성연에서 진채선이 흥선대원군 앞에서 「성조가」와 「춘향가」를 불렀고 이후 후원을 받은 작품 단위 청취 장면을 확인했다.'
    ),
    (
      target_run_id, 'MUSIC', accepted_music_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0054938',
      'secondary', 'official_profile', 'accessible',
      '진채선 — 한국민족문화대백과사전',
      '경복궁 낙성연 공연과 흥선대원군의 총애, 진채선의 춘향가 전승을 교차 확인했다.'
    ),
    (
      target_run_id, 'MUSIC', accepted_music_finding_id,
      'https://open.spotify.com/album/2vYYEwZ4yeIgYz5qJfSG8L',
      'secondary', 'official_profile', 'accessible',
      '춘향가 — 오정숙 — Spotify',
      '41곡 완창 음반의 공개 메타데이터와 표지를 확인했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '흥선대원군 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '흥선대원군·이하응과 독서·책·서문·교학정례 조합을 조사했다. 관찬 편찬 활동은 확인되지만 개인이 감상한 외부 저작은 확인되지 않았다.'
      WHEN 'VIDEO' THEN
        '영화·연극·관람·도리화가 조합을 조사했다. 후대 전기 영화와 드라마는 본인의 소비작이 아니어서 제외했다.'
      WHEN 'GAME' THEN
        '게임·놀이·바둑 조합을 조사했다. 바둑 기호는 확인되지만 작품 단위 디지털 GAME 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        '판소리·춘향가·성조가·진채선·낙성연 조합을 조사했다. KBS 역사 자료와 한국민족문화대백과에서 작품명과 실제 청취 장면을 확인해 춘향가 완창 음반에 연결했다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '흥선대원군 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '흥선대원군 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '흥선대원군 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '흥선대원군 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 1
      AND EXISTS (
        SELECT 1 FROM public.celeb_content_research_runs r
        WHERE r.id = target_run_id AND r.status = 'completed'
      )
  ) THEN
    RAISE EXCEPTION '흥선대원군 최종 원장 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
