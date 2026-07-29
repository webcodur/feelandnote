-- 마리아 테레지아 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택:
--   MUSIC  글루크 《Il Parnaso confuso》 — 1765년 초연의 맨 앞줄 관람
-- 기각:
--   BOOK   교육개혁·검열·교과서 재판 — 정책 행위이며 개인의 특정 독서 기록 아님
--   VIDEO  궁정 실연과 후대 녹화물 — 생전 무대 관람을 현대 영상에 연결할 수 없음
--   GAME   궁정 테니스장·후대 교육용 게임 — 개인의 디지털 GAME 이용 기록 아님
--
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '78c35399-1a5f-4332-ae3d-ae2db7f425d9'::uuid;
  target_content_id constant text := '117a0782-2d98-42f3-9430-10973a1eac08';
  target_run_id constant uuid := '6e24aa16-9ff1-4eab-8f5b-90fb154860d1'::uuid;
  user_content_id constant uuid := '00c3afa5-dfe2-43f8-bc45-6dc0a221cf75'::uuid;
  accepted_music_finding_id constant uuid := '0237bfc1-290b-485a-a6db-49cd23ba7424'::uuid;
  rejected_book_finding_id constant uuid := '069d25be-ee75-46a8-ae0b-be81835b1031'::uuid;
  rejected_video_finding_id constant uuid := '84e32692-3d76-4019-a36e-a57f843e85f3'::uuid;
  rejected_game_finding_id constant uuid := 'f5fbe728-bf73-46da-9646-5969be1fd6b9'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'maria-theresa'
      AND p.nickname = '마리아 테레지아'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '마리아 테레지아 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '마리아 테레지아에게 이미 연결된 콘텐츠가 있습니다.';
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
         'spotify-6XAGnK6Cviwpvlzjjbe7qZ',
         '6XAGnK6Cviwpvlzjjbe7qZ'
       )
  ) OR EXISTS (
    SELECT 1 FROM public.content_locales cl
    WHERE lower(cl.title) IN (
      lower('Il Parnaso confuso'),
      lower('혼란에 빠진 파르나소스')
    )
  ) THEN
    RAISE EXCEPTION '마리아 테레지아 조사 실행·반영 ID 또는 작품 충돌 데이터가 이미 존재합니다.';
  END IF;

  INSERT INTO public.contents (
    id, type, metadata, release_date, external_source, external_id, user_count
  ) VALUES (
    target_content_id,
    'MUSIC',
    jsonb_build_object(
      'entityType', 'album',
      'albumType', 'album',
      'releaseDate', '2004',
      'totalTracks', 16,
      'spotifyUrl', 'https://open.spotify.com/album/6XAGnK6Cviwpvlzjjbe7qZ',
      'artists', jsonb_build_array(
        'Julianne Baird',
        'Danielle Howard',
        'Mary Ellen Calahan',
        'Marshall Coid',
        'The Queen''s Chamber Band',
        'Elaine Comparone'
      ),
      'composer', 'Christoph Willibald Gluck',
      'librettist', 'Pietro Metastasio',
      'conductor', 'Rudolph Palmer',
      'originalWorkYear', 1765,
      'workId', 'Wq. 33'
    ),
    '2004-01-01',
    'spotify',
    'spotify-6XAGnK6Cviwpvlzjjbe7qZ',
    0
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Il Parnaso confuso contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id, locale, title, creator, thumbnail_url, description,
    isbn, publisher, sources, verified
  ) VALUES
    (
      target_content_id,
      'ko',
      '혼란에 빠진 파르나소스',
      '크리스토프 빌리발트 글루크 · 줄리앤 베어드 · 퀸스 체임버 밴드',
      'https://is1-ssl.mzstatic.com/image/thumb/Music/f4/a3/21/mzi.etraftwy.jpg/1000x1000bb.webp',
      '피에트로 메타스타시오의 대본에 크리스토프 빌리발트 글루크가 곡을 붙여 1765년 쇤브룬 궁전에서 초연한 단막 세레나타의 전곡 녹음이다.',
      NULL,
      NULL,
      jsonb_build_object(
        'primary', 'spotify',
        'thumbnail', 'apple_music',
        'thumbnailPage', 'https://music.apple.com/us/album/gluck-il-parnaso-confuso-first-recording/195110450',
        'titlePolicy', 'ko_translation',
        'url', 'https://open.spotify.com/album/6XAGnK6Cviwpvlzjjbe7qZ'
      ),
      true
    ),
    (
      target_content_id,
      'en',
      'Il Parnaso confuso',
      'Christoph Willibald Gluck · Julianne Baird · The Queen''s Chamber Band',
      'https://is1-ssl.mzstatic.com/image/thumb/Music/f4/a3/21/mzi.etraftwy.jpg/1000x1000bb.webp',
      'A complete recording of Gluck''s one-act azione teatrale, composed to a libretto by Pietro Metastasio and premiered at Schönbrunn Palace in 1765.',
      NULL,
      NULL,
      jsonb_build_object(
        'primary', 'spotify',
        'thumbnail', 'apple_music',
        'thumbnailPage', 'https://music.apple.com/us/album/gluck-il-parnaso-confuso-first-recording/195110450',
        'url', 'https://open.spotify.com/album/6XAGnK6Cviwpvlzjjbe7qZ'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION 'Il Parnaso confuso content_locales 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    user_content_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    $ko$빈 미술사박물관 소장으로 안내되는 요한 프란츠 그라이펠 귀속 그림은 1765년 글루크의 《혼란에 빠진 파르나소스》 초연 장면을 담고 있다. 네 대공녀가 무대에서 공연하고, 마리아 테레지아는 프란츠 1세·요제프 황태자와 함께 맨 앞줄에 앉아 있다. 작품명·작곡가·실제 관람이 한 장면에서 확인되므로 전곡 녹음으로 연결한다.$ko$,
    $en$A painting attributed to Johann Franz Greipel and presented with the Kunsthistorisches Museum collection depicts the 1765 premiere of Gluck''s *Il Parnaso confuso*. Four archduchesses perform on stage while Maria Theresa sits in the front row with Franz I and Crown Prince Joseph. The work, composer, and her attendance are identified together, so the complete recording is linked here.$en$,
    'https://www.habsburger.net/en/media/johann-franz-greipel-attr-premiere-opera-il-parnasso-confusoby-christoph-willibald-gluck-per-0',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '마리아 테레지아 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = target_content_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 OR (
    SELECT c.user_count FROM public.contents c WHERE c.id = target_content_id
  ) <> 1 THEN
    RAISE EXCEPTION 'Il Parnaso confuso user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-maria-theresa-full-v1',
    'Codex',
    ARRAY['마리아 테레지아', 'Maria Theresa', 'Maria Theresia', 'Maria Theresia von Österreich', 'Empress Maria Theresa'],
    '합스부르크 군주 마리아 테레지아(1717~1780)를 딸 마리아 안나·마리아 크리스티나·마리아 안토니아와 후대 배우·캐릭터로부터 분리했다. 본인이 출연한 궁정 공연과 자녀들의 공연을 본 행위도 구별했다.',
    '영어·독일어·한국어 이름과 read·book·theatre·opera·game·music 조합으로 합스부르크 역사 포털·쇤브룬 자료와 빈 미술사박물관 소장품 캡션을 대조했다. 1765년 《Il Parnaso confuso》 초연 그림에 마리아 테레지아가 맨 앞줄 관객으로 명시돼 MUSIC 1건을 연결했다. 교육개혁·검열·교과서 재판은 개인 독서가 아니고, 궁정 실연을 현대 영상에 연결하지 않았으며, 테니스장과 후대 교육용 게임도 개인의 디지털 GAME 이용 기록이 아니다.'
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
      'Il Parnaso confuso',
      'Christoph Willibald Gluck · Pietro Metastasio',
      target_content_id,
      '그라이펠 귀속 초연 그림의 공식 캡션은 무대의 네 대공녀와 맨 앞줄의 마리아 테레지아·프란츠 1세·요제프 황태자를 식별한다.',
      NULL
    ),
    (
      rejected_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '교육개혁·검열·교과서 재판',
      NULL,
      NULL,
      '마리아 테레지아는 교육 제도를 개혁하고 검열위원회를 설치했으며 교과서 재판을 명령했다.',
      '정책·행정 행위는 개인이 읽은 특정 외부 작품의 기록이 아니다. 개인 독서로 확인되는 제목·저자·판본은 공식 자료에서 찾지 못했다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '쇤브룬 궁정 실연과 후대 녹화물',
      NULL,
      NULL,
      '마리아 테레지아는 궁정 극장을 세우고 가족·궁정 구성원의 연극·발레·오페라를 관람했다.',
      '확인되는 소비 대상은 18세기 현장 실연이다. 이를 후대 영화나 녹화 공연의 TMDB 식별자에 연결하면 다른 작품이 되므로 VIDEO로 등록하지 않는다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '궁정 테니스장과 후대 교육용 게임',
      NULL,
      NULL,
      '호프부르크의 옛 리얼 테니스장은 마리아 테레지아 즉위 뒤 극장으로 전환됐고, 후대에는 교육개혁을 설명하는 학습 게임 자료가 남았다.',
      '건축물의 이전 용도와 후대 교육 도구는 마리아 테레지아가 플레이한 디지털 GAME 작품이 아니다. 작품명·제작자·이용 기록이 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '마리아 테레지아 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.habsburger.net/en/chapter/maria-theresa-and-her-reforms',
      'secondary',
      'article',
      'accessible',
      'Maria Theresa and her reforms — Die Welt der Habsburger',
      '교육·검열 개혁은 확인되지만 개인이 읽은 특정 작품은 제시되지 않는다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://www.habsburger.net/en/chapter/private-stage-theatre-schonbrunn-palace',
      'secondary',
      'article',
      'accessible',
      'A private stage: the theatre at Schönbrunn Palace',
      '궁정 가족의 현장 실연과 마리아 테레지아의 관람 관행을 확인하고 현대 영상 작품과 분리했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://www.habsburger.net/en/chapter/real-tennis-court-court-theatre',
      'secondary',
      'article',
      'accessible',
      'From real tennis court to Court Theatre',
      '옛 테니스장이 극장으로 바뀐 건축사이며 마리아 테레지아 개인의 GAME 이용 기록이 아님을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      accepted_music_finding_id,
      'https://www.habsburger.net/en/media/johann-franz-greipel-attr-premiere-opera-il-parnasso-confusoby-christoph-willibald-gluck-per-0',
      'primary',
      'archive',
      'accessible',
      'Johann Franz Greipel (attr.): Premiere of Il Parnaso confuso',
      '빈 미술사박물관 소장으로 안내되는 초연 그림과 캡션이 마리아 테레지아를 맨 앞줄 관객으로 식별한다.'
    ),
    (
      target_run_id,
      'MUSIC',
      accepted_music_finding_id,
      'https://www.habsburger.net/en/chapter/musical-family',
      'secondary',
      'article',
      'accessible',
      'A musical family — Die Welt der Habsburger',
      '마리아 테레지아의 궁정 음악 교육·공연과 평생의 이탈리아 음악 선호를 대조했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      accepted_music_finding_id,
      'https://open.spotify.com/album/6XAGnK6Cviwpvlzjjbe7qZ',
      'secondary',
      'official_profile',
      'accessible',
      'Il Parnaso confuso — Spotify',
      '16곡·2004년 전곡 음반, 앨범 ID와 표지·제목을 Spotify 공개 페이지와 oEmbed에서 확인했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '마리아 테레지아 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Maria Theresa·Maria Theresia와 read·book·education·censorship 조합을 검색했다. 정책·교과서 재판은 확인되지만 개인의 특정 작품 독서 기록은 없다.'
      WHEN 'VIDEO' THEN
        'theatre·opera·performance·watched·Schönbrunn 조합을 검색했다. 현장 실연 관람은 MUSIC 근거로 보존하고 현대 영화·녹화 영상에 잘못 연결하지 않았다.'
      WHEN 'GAME' THEN
        'game·played·tennis·cards·learning game 조합을 검색했다. 건축물의 테니스장 전신과 후대 교육용 게임뿐이며 개인의 디지털 작품 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·opera·Gluck·Il Parnaso confuso·premiere 조합을 검색했다. 1765년 초연 그림에서 마리아 테레지아의 맨 앞줄 관람을 확인해 전곡 음반을 연결했다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '마리아 테레지아 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '마리아 테레지아 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '마리아 테레지아 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 1
  ) THEN
    RAISE EXCEPTION '마리아 테레지아 프로필·콘텐츠 최종 검증에 실패했습니다.';
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
    RAISE EXCEPTION '마리아 테레지아 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'accepted') = 1
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 3
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '마리아 테레지아 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
