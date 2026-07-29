-- 광해군의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과와 콘텐츠 1건을 반영한다.
-- 채택: 1612년 9월 18일 조강에서 《상서》 대고편을 직접 강독하고 본문 뜻을 문답함.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'dbb2e365-0564-4c02-8bee-bb277c029fdc'::uuid;
  target_content_id constant text := 'b78ce08b-4bc8-4498-8756-a11828c04808';
  target_run_id constant uuid := '59891ed7-b124-41d8-8403-4a50bdb6812d'::uuid;
  target_uc_id constant uuid := 'a7adaa2e-e888-4b79-8e97-38450ae0f5d1'::uuid;
  book_finding_id constant uuid := '1df6cd49-76b9-4ad5-bd72-f62361081f9d'::uuid;
  video_finding_id constant uuid := '64f6e721-d08f-4a87-9597-21839e23d23e'::uuid;
  game_finding_id constant uuid := '85939a76-585a-4864-bcc2-aecafaf74513'::uuid;
  music_finding_id constant uuid := '81c66c82-70ea-4ac7-99d8-31f20e6d6a99'::uuid;
  expected_user_count integer;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'gwanghaegun'
      AND p.nickname = '광해군'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '광해군 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = target_uc_id
  ) THEN
    RAISE EXCEPTION '광해군 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  SELECT count(*)::integer + 1
  INTO expected_user_count
  FROM public.user_contents uc
  WHERE uc.content_id = target_content_id;

  IF expected_user_count <> 26 OR NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = target_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788932452708'
      AND ko.title = '서경'
      AND ko.creator = '공자 편'
      AND ko.verified = true
      AND en.title = 'Book of Documents'
      AND en.creator = 'Confucius'
      AND en.verified = true
  ) THEN
    RAISE EXCEPTION '《서경》 기존 콘텐츠 기준선이 달라졌습니다. 예상 user_count=%',
      expected_user_count;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    target_uc_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    '광해군 4년 9월 18일, 임금은 조강에 나아가 《상서》의 대고편을 강독했다. 본문 가운데 “영승우려”의 뜻을 직접 묻고 신하들의 풀이를 들은 뒤, 그 뜻을 경계로 삼아야 한다고 말했다. 궁중 교육의 일반론이 아니라 날짜·편명·문답이 함께 남은 실제 독서 기록이다.',
    'On 18 September 1612, Gwanghaegun attended the morning lecture and read the Great Announcement chapter of the Book of Documents. He asked his officials to explain a phrase in the text and discussed its lesson, leaving a dated record of direct engagement with the work.',
    'https://sillok.history.go.kr/id/koa_10409018_001',
    true
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '광해군 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = target_content_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 OR (
    SELECT c.user_count FROM public.contents c WHERE c.id = target_content_id
  ) <> expected_user_count THEN
    RAISE EXCEPTION '《서경》 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-gwanghaegun-full-v1',
    'Codex',
    ARRAY['광해군', '광해', '이혼', '光海君', '李琿', 'Gwanghaegun', 'Prince Gwanghae'],
    '조선 제15대 임금 광해군 이혼(1575~1641)을 동명의 드라마·영화·게임 캐릭터 및 관련 창작물과 분리했다.',
    '조선왕조실록의 광해군일기 중초본·정초본과 한국민족문화대백과를 중심으로 읽기·강독·경연·서책·연희·음악·놀이 조합을 조사했다. 1612년 조강에서 《상서》 대고편을 직접 강독하고 본문 어구를 문답한 기록을 BOOK 1건으로 채택했다. 광해군을 소재로 한 현대 영상·게임은 본인의 소비가 아니며, 궁중 연희와 음악 관련 기사는 특정 작품의 개인 감상 기록으로 좁혀지지 않아 제외했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'accepted',
      '서경', '공자 편', target_content_id,
      '광해군일기 중초본은 1612년 9월 18일 광해군이 조강에서 《상서》 대고편을 강독하고 “영승우려”의 뜻을 물어 신하들과 본문을 논의했다고 기록한다.',
      NULL
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '광해군 소재 영화·드라마 일반', NULL, NULL,
      '광해군을 주인공으로 삼은 후대 영상물은 다수 존재하지만 모두 사후 창작물이다.',
      '본인이 감상한 영화·TV·온라인 영상 기록이 아니므로 소비 콘텐츠로 등록하지 않는다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '광해군 소재 게임·전통 놀이 일반', NULL, NULL,
      '후대 게임의 광해군 캐릭터와 궁중 놀이 일반을 분리해 조사했다.',
      '디지털·보드게임 작품을 광해군 본인이 플레이했다는 근거가 없고, 후대 캐릭터 등장은 본인의 소비가 아니다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '조선 궁중 음악·연희 일반', NULL, NULL,
      '실록에는 궁중 연향과 여악 운영을 둘러싼 정책 기록이 있으나 특정 곡이나 작품을 광해군이 개인적으로 들었다는 진술은 확인되지 않는다.',
      '국왕의 제도 운영이나 행사 참석만으로 개인의 특정 음악 감상·추천을 추정하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '광해군 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://sillok.history.go.kr/id/koa_10409018_001',
      'primary', 'archive', 'accessible',
      '광해군일기 중초본 56권, 광해 4년 9월 18일',
      '“시사청에 나아가 조강하고 《상서》를 강독하다” 기사에서 대고편 강독과 본문 문답을 직접 확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://search.shopping.naver.com/book/catalog/32492303744',
      'secondary', 'official_profile', 'accessible',
      '서경 — 네이버 도서',
      '서비스에 이미 등록된 ISBN 9788932452708 한국어 판본의 메타데이터를 재확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0005335',
      'secondary', 'official_profile', 'accessible',
      '광해군 — 한국민족문화대백과사전',
      '인물 식별, 생몰년, 재위 기간과 정치적 맥락을 교차 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0005335',
      'secondary', 'official_profile', 'accessible',
      '광해군 — 한국민족문화대백과사전',
      '생애 범위를 확인해 후대 영상 재현물과 당사자의 감상 기록을 분리했다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0005335',
      'secondary', 'official_profile', 'accessible',
      '광해군 — 한국민족문화대백과사전',
      '생애 자료에는 작품 단위 게임 소비 기록이 없다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://sillok.history.go.kr/id/koa_10203127_003',
      'primary', 'archive', 'accessible',
      '광해군일기 중초본 26권, 광해 2년 윤3월 27일',
      '궁중 여악 운영을 둘러싼 정책 기사로, 특정 음악 작품의 개인 감상 기록과는 구별했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '광해군 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '광해군·이혼·光海君·李琿과 읽다·강독·경연·서책·상서·서경 조합으로 실록을 조사했다. 날짜·편명·본문 문답이 모두 남은 《상서》 1건을 채택했다.'
      WHEN 'VIDEO' THEN
        '영화·드라마·연희·공연·관람 조합을 조사했다. 후대 재현물 외에 본인의 작품 단위 영상 소비 기록은 없다.'
      WHEN 'GAME' THEN
        '게임·놀이·바둑·장기·투호 조합을 조사했다. 본인이 소비한 등록 가능 GAME 작품은 확인되지 않았다.'
      WHEN 'MUSIC' THEN
        '음악·악곡·노래·연향·여악·감상 조합을 조사했다. 제도와 행사 기록만 있으며 작품 단위 개인 감상 근거는 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '광해군 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '광해군 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '광해군 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '광해군 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
