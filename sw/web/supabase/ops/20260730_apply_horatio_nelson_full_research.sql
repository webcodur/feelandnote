-- 호레이쇼 넬슨 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택:
--   MUSIC  Rule, Britannia! — 1800년 헤이마켓 극장 공연에 넬슨이 직접 참석
-- 기각:
--   GAME   폰트힐의 카드 놀이 — 제목 없는 물리 놀이이며 디지털 작품이 아님
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'd2b9b2d8-5782-4b80-bd34-e7bf24151c3f'::uuid;
  content_id constant text := '03bb64c9-8584-4293-852d-8a238ec47cf9';
  target_run_id constant uuid := '83a9326d-e3cc-4dfb-8f11-14297f36c22d'::uuid;
  user_content_id constant uuid := '9e1f9dc8-1823-4497-b56c-e4ba41a7a7e9'::uuid;
  accepted_music_finding_id constant uuid := 'a821fef3-58b1-4285-8268-e19d74c09096'::uuid;
  rejected_game_finding_id constant uuid := '3fada927-0dab-4cac-8b04-e75af473004f'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'horatio-nelson'
      AND p.nickname = '호레이쇼 넬슨'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '호레이쇼 넬슨 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '호레이쇼 넬슨에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (accepted_music_finding_id, rejected_game_finding_id)
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = user_content_id
  ) THEN
    RAISE EXCEPTION '호레이쇼 넬슨 조사 실행 또는 이번 반영 ID가 이미 존재합니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id = content_id
       OR c.external_id IN (
         'spotify-3AYHlS6n5jZAwEpqtHTEKA',
         '3AYHlS6n5jZAwEpqtHTEKA'
       )
  ) OR EXISTS (
    SELECT 1
    FROM public.content_locales cl
    WHERE lower(cl.title) IN (
      lower('Rule, Britannia!'),
      lower('Rule Britannia'),
      lower('룰 브리태니아')
    )
  ) THEN
    RAISE EXCEPTION 'Rule, Britannia!와 충돌하는 콘텐츠·외부 ID·제목이 이미 존재합니다.';
  END IF;

  INSERT INTO public.contents (
    id, type, metadata, release_date, external_source, external_id, user_count
  ) VALUES (
    content_id,
    'MUSIC',
    jsonb_build_object(
      'entityType', 'track',
      'releaseDate', '1997-12-01',
      'durationMs', 159000,
      'album', 'Britannia',
      'spotifyUrl', 'https://open.spotify.com/track/3AYHlS6n5jZAwEpqtHTEKA',
      'artists', jsonb_build_array(
        'Thomas Arne',
        'Royal Philharmonic Orchestra',
        'Brighton Festival Chorus',
        'Carl Davis'
      ),
      'originalWorkYear', 1740,
      'lyricists', jsonb_build_array('James Thomson', 'David Mallet')
    ),
    '1997-12-01',
    'spotify',
    'spotify-3AYHlS6n5jZAwEpqtHTEKA',
    0
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Rule, Britannia! contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id, locale, title, creator, thumbnail_url, description,
    isbn, publisher, sources, verified
  ) VALUES
    (
      content_id,
      'ko',
      '룰 브리태니아',
      '토머스 아른 · 로열 필하모닉 오케스트라 · 브라이턴 페스티벌 코러스 · 칼 데이비스',
      'https://i.scdn.co/image/ab67616d00001e02fb5838dda3c1ff747f628879',
      '제임스 톰슨과 데이비드 맬릿의 시에 토머스 아른이 곡을 붙인 1740년 영국 노래를 연주한 음원이다.',
      NULL,
      NULL,
      jsonb_build_object(
        'primary', 'spotify',
        'thumbnail', 'spotify_oembed',
        'titlePolicy', 'ko_transliteration',
        'url', 'https://open.spotify.com/track/3AYHlS6n5jZAwEpqtHTEKA'
      ),
      true
    ),
    (
      content_id,
      'en',
      'Rule, Britannia!',
      'Thomas Arne · Royal Philharmonic Orchestra · Brighton Festival Chorus · Carl Davis',
      'https://i.scdn.co/image/ab67616d00001e02fb5838dda3c1ff747f628879',
      'A recording of the 1740 British song composed by Thomas Arne to words by James Thomson and David Mallet.',
      NULL,
      NULL,
      jsonb_build_object(
        'primary', 'spotify',
        'thumbnail', 'spotify_oembed',
        'url', 'https://open.spotify.com/track/3AYHlS6n5jZAwEpqtHTEKA'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION 'Rule, Britannia! content_locales 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    user_content_id,
    target_celeb_id,
    content_id,
    'FINISHED',
    $ko$1800년 11월 21일자 《Edinburgh Advertiser》는 넬슨이 런던 헤이마켓 극장의 올드 배니스터 자선 공연에 직접 참석했고, 그 자리에서 「Rule, Britannia!」가 불리자 관객 전원이 일어나 배우들과 후렴을 함께 불렀다고 보도했다. 넬슨의 현장 참석과 곡명이 같은 동시대 기사에 확인되므로 등록한다.$ko$,
    $en$The 21 November 1800 issue of the *Edinburgh Advertiser* reported that Nelson personally attended Old Bannister's benefit at the Haymarket Theatre in London. When “Rule, Britannia!” was sung, the entire audience stood and joined the performers in the chorus. The contemporary report identifies both Nelson's presence and the work.$en$,
    'https://www.christies.com/en/lot/lot-1929369',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '호레이쇼 넬슨 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = content_id;

  IF (
    SELECT c.user_count FROM public.contents c WHERE c.id = content_id
  ) <> 1 THEN
    RAISE EXCEPTION 'Rule, Britannia! user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-horatio-nelson-full-v1',
    'Codex',
    ARRAY[
      '호레이쇼 넬슨', 'Horatio Nelson', 'Admiral Nelson',
      'Lord Nelson', 'Viscount Nelson', 'Duke of Bronté'
    ],
    '영국 해군 제독 호레이쇼 넬슨(1758~1805)을 동명이인·후손, 러더퍼드 오브 넬슨, 사후 넬슨 찬가와 후대 영화·게임 속 인물과 분리했다. 트라팔가르에서 함대가 연주했다는 포괄 표현은 넬슨의 기함이 아닌 HMS Tonnant 기록과 혼동하지 않았다.',
    '영어·한국어 이름 변형으로 네 유형을 조사하고 동시대 신문, 넬슨 컬렉션, 공연사 연구를 대조했다. 1800년 헤이마켓 극장에 넬슨이 직접 참석했고 「Rule, Britannia!」가 연주·합창된 동시대 보도를 확인해 MUSIC 1건을 등록했다. 트라팔가르 함대 연주는 다른 함선 기록이라 채택 근거로 쓰지 않았다. 특정 개인 독서, 제목이 식별되는 연극·영상 관람, 작품 단위 디지털 게임 이용은 확인되지 않았다.'
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
      'Rule, Britannia!',
      'Thomas Arne',
      content_id,
      '1800년 11월 21일자 《Edinburgh Advertiser》는 넬슨의 헤이마켓 극장 참석과 「Rule, Britannia!」 공연·관객 합창을 같은 기사에서 기록했다.',
      NULL
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '카드 놀이',
      NULL,
      NULL,
      '넬슨과 해밀턴 일행의 폰트힐 체류 기록에는 사교 활동과 카드 놀이가 언급된다.',
      '제목 없는 물리 카드 놀이는 작품 단위 디지털 GAME이 아니며 특정 규칙·상품명도 식별되지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '호레이쇼 넬슨 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'MUSIC',
      accepted_music_finding_id,
      'https://www.christies.com/en/lot/lot-1929369',
      'primary',
      'archive',
      'accessible',
      'Nelson at Haymarket Theatre, London',
      '1800년 11월 21일자 《Edinburgh Advertiser》 완질의 기사 위치와 넬슨 참석·곡명·합창 내용을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      accepted_music_finding_id,
      'https://www.laskaridisfoundation.org/wp-content/uploads/Nelson-Collection.pdf',
      'secondary',
      'archive',
      'accessible',
      'Aikaterini Laskaridis Foundation Nelson Collection',
      '재단 소장 목록 N35가 같은 《Edinburgh Advertiser》 기사와 지면·날짜·본문을 독립적으로 대조한다.'
    ),
    (
      target_run_id,
      'MUSIC',
      accepted_music_finding_id,
      'https://academic.oup.com/ml/article/103/4/662/6627191',
      'secondary',
      'article',
      'accessible',
      'Transformation or Conformation? The English Broadside Ballad and the Playhouse',
      '「Rule, Britannia!」가 1740년 《Alfred》에서 초연되었고 톰슨·맬릿의 글과 아른의 음악임을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      accepted_music_finding_id,
      'https://open.spotify.com/track/3AYHlS6n5jZAwEpqtHTEKA',
      'secondary',
      'official_profile',
      'accessible',
      'Rule, Britannia! Spotify track',
      '토머스 아른·로열 필하모닉 오케스트라·브라이턴 페스티벌 코러스·칼 데이비스 음원의 ID·앨범·길이·표지를 대조했다.'
    ),
    (
      target_run_id,
      'BOOK',
      NULL,
      'https://www.rmg.co.uk/collections/objects/rmgc-object-491866',
      'secondary',
      'archive',
      'accessible',
      'Horatio Nelson manuscript collections, Royal Museums Greenwich',
      '넬슨의 방대한 서신·개인 문서 컬렉션과 전기를 도서명·read·book 조합으로 검토했으나 특정 개인 독서 작품은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://www.rmg.co.uk/collections/archive?maker%5B0%5D=Nelson%2C+Horatio&page=0',
      'secondary',
      'archive',
      'accessible',
      'Royal Museums Greenwich Nelson archive results',
      '공연·극장·관람 기록을 검색했다. 헤이마켓 행사는 노래가 식별될 뿐 상연된 극 제목은 기사에서 확인되지 않아 VIDEO로 중복 등록하지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://www.aboutnelson.co.uk/fonthill.htm',
      'secondary',
      'article',
      'accessible',
      'Nelson at Fonthill',
      '1800년 폰트힐 체류의 음악·식사·사교 활동을 검토해 제목 없는 카드 놀이와 작품 소비를 분리했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://townwaits.org.uk/2006-2/',
      'primary',
      'archive',
      'accessible',
      'Britons, Strike Home at Trafalgar',
      '프레더릭 호프먼의 기록은 「Britons, Strike Home」 연주 주체를 넬슨의 기함이 아닌 HMS Tonnant의 밴드로 특정하므로 넬슨 개인 감상으로 오인하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 8 THEN
    RAISE EXCEPTION '호레이쇼 넬슨 조사 source 생성 행 수가 8이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Horatio Nelson·Admiral/Lord Nelson과 read·reading·book·library 조합을 RMG 서신·문서 컬렉션과 전기에서 검색했다. 본인이 읽었다고 식별되는 특정 작품명은 확인되지 않았다.'
      WHEN 'VIDEO' THEN
        'theatre·play·performance·Haymarket·attended·watched 조합을 검색했다. 1800년 헤이마켓 극장 참석은 확인되지만 기사에 상연극 제목이 없고 「Rule, Britannia!」만 식별되어 MUSIC으로만 연결했다.'
      WHEN 'GAME' THEN
        'cards·chess·game·played·Fonthill 조합을 검색했다. 제목 없는 물리 카드 놀이는 작품 단위 디지털 GAME이 아니므로 기각했고 특정 게임 기록은 찾지 못했다.'
      WHEN 'MUSIC' THEN
        'music·song·band·Rule Britannia·Britons Strike Home·Trafalgar·Fonthill·Haymarket 조합을 검색했다. 헤이마켓 동시대 기사로 넬슨의 직접 참석과 「Rule, Britannia!」를 확인했다. 트라팔가르의 「Britons, Strike Home」은 HMS Tonnant 기록이라 제외했다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '호레이쇼 넬슨 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION
      '호레이쇼 넬슨 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '호레이쇼 넬슨 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 1
  ) THEN
    RAISE EXCEPTION '호레이쇼 넬슨 프로필·콘텐츠 최종 검증에 실패했습니다.';
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
    RAISE EXCEPTION '호레이쇼 넬슨 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
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
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 1
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 8
  ) THEN
    RAISE EXCEPTION '호레이쇼 넬슨 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
