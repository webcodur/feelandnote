-- 나폴레옹 3세의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 반영한다.
-- 채택: 로시니의 오페라 《기욤 텔》.
-- 근거: 1858-01-14 오르시니 폭탄 테러 뒤에도 황제 부부가 예정된 공연을 끝까지 관람한 기록.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'aea0e5ec-8354-4f1f-9f93-f69a3a651e0f'::uuid;
  target_content_id constant text := '71a7ac51-4e12-4a3c-af0d-d3b52690078a';
  target_run_id constant uuid := '9637b266-1f0c-44fe-88b2-c7d35c92cbfc'::uuid;
  target_uc_id constant uuid := '14b2c764-ab19-4915-b722-3473c1de0760'::uuid;
  music_finding_id constant uuid := 'e63e6e3f-1d6a-4193-9d27-82be98e10aa5'::uuid;
  book_finding_id constant uuid := '81b27735-f02b-4d0a-89f9-9f7de0d50c29'::uuid;
  video_finding_id constant uuid := '2e15d67a-6df2-4246-ade0-e2d7ac229bb0'::uuid;
  game_finding_id constant uuid := '38842775-c7d6-4ef0-b8a1-4b830cc917b9'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'napoleon-iii'
      AND p.nickname = '나폴레옹 3세'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '나폴레옹 3세 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = target_uc_id
  ) OR EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = target_content_id
       OR c.external_id IN (
         'spotify-0vVkrkHALpZUYMREyVPR5P',
         '0vVkrkHALpZUYMREyVPR5P'
       )
  ) OR EXISTS (
    SELECT 1 FROM public.content_locales cl
    WHERE lower(cl.title) IN (
      lower('기욤 텔'),
      lower('Guillaume Tell'),
      lower('Rossini: Guillaume Tell (Complete Version Live)')
    )
  ) THEN
    RAISE EXCEPTION '나폴레옹 3세 조사 실행·콘텐츠·연결 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.contents (
    id, type, metadata, release_date, external_source, external_id, user_count
  ) VALUES (
    target_content_id,
    'MUSIC',
    jsonb_build_object(
      'entityType', 'album',
      'albumType', 'album',
      'releaseDate', '2015',
      'totalTracks', 56,
      'spotifyUrl', 'https://open.spotify.com/album/0vVkrkHALpZUYMREyVPR5P',
      'artists', jsonb_build_array('Gioachino Rossini'),
      'composer', 'Gioachino Rossini',
      'librettists', jsonb_build_array('Étienne de Jouy', 'Hippolyte Bis'),
      'originalWorkYear', 1829,
      'language', 'French'
    ),
    '2015-01-01',
    'spotify',
    'spotify-0vVkrkHALpZUYMREyVPR5P',
    0
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '기욤 텔 contents 생성 수가 1건이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id, locale, title, creator, thumbnail_url, description,
    isbn, publisher, sources, verified
  ) VALUES
    (
      target_content_id, 'ko', '기욤 텔', '조아키노 로시니',
      'https://i.scdn.co/image/ab67616d0000b273e59ba915c546ec3daecd30ab',
      '로시니가 프랑스어 대본에 곡을 붙인 4막 그랜드 오페라. 1829년 파리 오페라에서 초연됐다.',
      NULL, NULL,
      jsonb_build_object(
        'primary', 'spotify',
        'url', 'https://open.spotify.com/album/0vVkrkHALpZUYMREyVPR5P',
        'titlePolicy', 'ko_work_title'
      ),
      true
    ),
    (
      target_content_id, 'en', 'Guillaume Tell', 'Gioachino Rossini',
      'https://i.scdn.co/image/ab67616d0000b273e59ba915c546ec3daecd30ab',
      'Rossini''s four-act French grand opera, premiered at the Paris Opera in 1829.',
      NULL, NULL,
      jsonb_build_object(
        'primary', 'spotify',
        'url', 'https://open.spotify.com/album/0vVkrkHALpZUYMREyVPR5P',
        'spotifyTitle', 'Rossini: Guillaume Tell (Complete Version Live)'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '기욤 텔 content_locales 생성 수가 2건이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    target_uc_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    '1858년 1월 14일 저녁, 나폴레옹 3세와 외제니 황후는 파리 오페라의 은퇴 기념 공연을 보러 가다가 오르시니 일당의 폭탄 공격을 받았다. 그날 프로그램에는 로시니의 《기욤 텔》이 포함돼 있었다. 황제 부부는 차량에 76개의 파편 자국이 남은 테러 직후에도 극장으로 들어가 자정까지 공연을 관람했다. 작품명·날짜·장소·관람 완료가 한 기록에서 확인되므로 완전판 음반을 연결한다.',
    'On the evening of 14 January 1858, Napoleon III and Empress Eugénie were attacked with bombs as they arrived at the Paris Opera for Eugène Massol''s retirement benefit. Rossini''s Guillaume Tell was on the announced program. Despite the attack and seventy-six impact marks on their carriage, the imperial couple entered the theatre, attended the performance, and left at midnight. The named work, date, place, and completed attendance are documented together, so a complete recording is linked here.',
    'https://www.napoleon.org/histoire-des-2-empires/tableaux/lattentat-dorsini-devant-la-facade-de-lopera-le-14-janvier-1858/',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '나폴레옹 3세 user_contents 생성 수가 1건이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '기욤 텔 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-napoleon-iii-full-v1',
    'Codex',
    ARRAY['나폴레옹 3세', 'Napoleon III', 'Napoléon III', 'Louis-Napoléon Bonaparte', 'Charles-Louis Napoléon Bonaparte'],
    '프랑스 황제 나폴레옹 3세(1808~1873)를 큰아버지 나폴레옹 1세, 아들 나폴레옹 4세로 불린 황태자, 동명 영화·게임 캐릭터와 분리했다.',
    '프랑스어·영어·한국어 이름과 read·Balzac·book·theatre·opera·performance·game·music·Guillaume Tell 조합으로 네 유형을 조사했다. 함 요새에서 발자크 작품들을 읽었다는 전기는 있으나 제목이 없어 BOOK으로 확정하지 않았다. 1858년 오르시니 테러 당일 프로그램의 연극 『마리 스튜어트』 마지막 막과 발레 발췌는 현대 VIDEO로 바꾸지 않았고, 황실 사냥·당구·카드 같은 실제 오락은 디지털 GAME이 아니다. 반면 《기욤 텔》은 작품명·날짜·극장·테러 뒤 관람 완료가 함께 확인되어 MUSIC 1건을 채택했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      music_finding_id, target_run_id, 'MUSIC', 'accepted',
      '기욤 텔', '조아키노 로시니', target_content_id,
      'Fondation Napoléon은 1858-01-14 파리 오페라 프로그램에 《기욤 텔》이 있었고, 폭탄 테러 뒤에도 나폴레옹 3세와 외제니가 공연을 관람하고 자정에 떠났다고 기록한다.',
      NULL
    ),
    (
      book_finding_id, target_run_id, 'BOOK', 'rejected',
      '발자크 작품들·나폴레옹 사상·빈곤의 소멸·율리우스 카이사르사', '오노레 드 발자크 / 나폴레옹 3세', NULL,
      'Fondation Napoléon 전기는 그가 함 요새에서 발자크의 작품들을 읽었다고 전하고, 여러 정치·역사 저작은 나폴레옹 3세 본인의 저작으로 확인된다.',
      '발자크 기록은 개별 제목을 제시하지 않아 작품 단위 연결이 불가능하다. 나머지는 본인이 쓴 책이므로 외부 BOOK 소비에서 제외했다.'
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '마리 스튜어트 마지막 막과 귀스타브 3세 발레 발췌', '프리드리히 실러 / 다니엘 오베르', NULL,
      '1858-01-14 은퇴 기념 프로그램에는 『마리 스튜어트』 마지막 막과 《귀스타브 3세 또는 가면무도회》의 발레 발췌도 포함됐다.',
      '19세기 현장 연극·발레 관람을 현대 영화·TV·디지털 영상의 VIDEO 항목으로 바꾸지 않았다. 별도 영상화 작품을 본 기록도 아니다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '황실 사냥·당구·카드·승마 오락 일반', NULL, NULL,
      '궁정 생활 자료에는 사냥과 각종 실제 오락이 등장하지만 디지털 게임 타이틀과 플레이 기록은 없다.',
      '19세기의 실제 운동·사교 오락은 서비스의 디지털 GAME 작품이 아니므로 등록하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '나폴레옹 3세 finding 생성 수가 4건이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://www.napoleon.org/histoire-des-2-empires/tableaux/lattentat-dorsini-devant-la-facade-de-lopera-le-14-janvier-1858/',
      'primary', 'archive', 'accessible',
      'L’attentat d’Orsini devant la façade de l’Opéra, le 14 janvier 1858 — Fondation Napoléon',
      '박물관 소장 회화와 당대 기록을 바탕으로 그날의 프로그램, 황제 부부의 도착, 테러 뒤 관람과 자정 퇴장을 함께 확인한다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://www.napoleon.org/histoire-des-2-empires/articles/napoleon-iii-un-empereur-suisse-a-paris/',
      'secondary', 'article', 'accessible',
      'Napoléon III, un empereur suisse à Paris — Fondation Napoléon',
      '《기욤 텔》이 그날 오페라 프로그램에 있었고 황제 부부가 박수로 관람했다는 별도 해설로 교차 확인했다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://open.spotify.com/album/0vVkrkHALpZUYMREyVPR5P',
      'secondary', 'official_profile', 'accessible',
      'Rossini: Guillaume Tell (Complete Version Live) — Spotify',
      '공개 앨범 페이지와 oEmbed에서 2015년·56트랙 완전판·Spotify ID·표지를 확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.napoleon.org/histoire-des-2-empires/biographies/napoleon-iii-1808-1873/',
      'secondary', 'article', 'accessible',
      'Napoléon III (1808-1873), portrait et système dynastique — Fondation Napoléon',
      '함 요새에서 발자크 작품들을 읽었다고 전하지만 개별 작품 제목은 제시하지 않는다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.napoleon.org/histoire-des-2-empires/articles/napoleon-iii-et-leurope/',
      'secondary', 'article', 'accessible',
      'Napoléon III et l’Europe — Fondation Napoléon',
      '『나폴레옹 사상』을 비롯한 정치 저술이 본인 저작임을 확인해 외부 감상 콘텐츠와 구별했다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://www.napoleon.org/histoire-des-2-empires/tableaux/lattentat-dorsini-devant-la-facade-de-lopera-le-14-janvier-1858/',
      'primary', 'archive', 'accessible',
      'L’attentat d’Orsini devant la façade de l’Opéra, le 14 janvier 1858 — Fondation Napoléon',
      '같은 날의 연극·발레 발췌 프로그램을 확인하되 현대 VIDEO와 분리했다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://www.elysee.fr/exposition/evreux-300',
      'secondary', 'official_profile', 'accessible',
      '300 ans d’histoire élyséenne: Napoléon III — Élysée',
      '공식 생애·궁정 자료를 대조했지만 디지털 GAME 타이틀의 플레이 기록은 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '나폴레옹 3세 source 생성 수가 7건이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Napoleon III·Louis-Napoléon·read·book·Balzac·Ham prison·library 조합을 조사했다. 발자크 작품군 독서는 확인되지만 개별 제목이 없고, 이름이 나온 정치·역사서는 본인 저작이다.'
      WHEN 'VIDEO' THEN
        'theatre·play·performance·watched·Marie Stuart·Gustave III 조합을 조사했다. 현장 연극·발레 발췌는 확인되지만 현대 VIDEO 작품 감상으로 변환하지 않았다.'
      WHEN 'GAME' THEN
        'game·played·cards·billiards·hunt·chess 조합을 조사했다. 19세기 실제 사교·운동 오락 외에 디지털 GAME 타이틀 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·opera·Guillaume Tell·Orsini attack·14 January 1858 조합을 조사했다. 그날 프로그램과 테러 뒤 황제 부부의 관람 완료가 함께 확인되어 《기욤 텔》을 채택했다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '나폴레옹 3세 scope 완료 수가 4건이 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '나폴레옹 3세 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '나폴레옹 3세 light→full 승격 수가 1건이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '나폴레옹 3세 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
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
           WHERE src.run_id = r.id) = 7
  ) THEN
    RAISE EXCEPTION '나폴레옹 3세 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
