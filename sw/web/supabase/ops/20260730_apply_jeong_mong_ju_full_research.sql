-- 정몽주의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과와 콘텐츠 1건을 반영한다.
-- 채택: 본인 문집 『포은집』의 「주역을 읽고」를 1차 자료로 사용한다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '55db7444-083a-4ec3-8595-25dd0940f014'::uuid;
  target_content_id constant text := 'f0a1a3ca-e7db-4534-b915-c98d8b4c2f0b';
  target_run_id constant uuid := 'a34743fa-bdfb-423c-bce0-155c36568fcf'::uuid;
  target_uc_id constant uuid := '404b6dee-1216-4263-9a8c-17dfc41e5065'::uuid;
  book_finding_id constant uuid := '1a3b5166-568a-4145-a5c3-67c5349c5505'::uuid;
  chunqiu_finding_id constant uuid := '3e628dd5-0a7e-443f-9274-33074a4a5eb9'::uuid;
  video_finding_id constant uuid := '9dec7561-860e-4b13-b7b4-385a34d84cd3'::uuid;
  game_finding_id constant uuid := '7cce810d-4ae7-442b-9925-596a555e2d73'::uuid;
  music_finding_id constant uuid := '2f8203a6-ccc2-4cfc-96bf-1dc936177e71'::uuid;
  expected_user_count integer;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'jeong-mong-ju'
      AND p.nickname = '정몽주'
      AND p.nickname_en = 'Jeong Mong-ju'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '정몽주 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = target_uc_id
  ) THEN
    RAISE EXCEPTION '정몽주 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  SELECT count(*)::integer + 1
  INTO expected_user_count
  FROM public.user_contents uc
  WHERE uc.content_id = target_content_id;

  IF expected_user_count <> 22 OR NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = target_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9791168878167'
      AND ko.title = '주역'
      AND ko.creator = '복희·문왕·주공'
      AND ko.verified = true
      AND en.title = 'I Ching'
      AND en.creator = 'Richard Wilhelm'
      AND en.verified = true
  ) THEN
    RAISE EXCEPTION '주역 기존 콘텐츠 기준선이 달라졌습니다. 예상 user_count=%',
      expected_user_count;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    target_uc_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    '정몽주는 자신의 문집 『포은집』에 「주역을 읽고 자안·대림 두 선생에게 부치다」라는 시를 남겼다. 그는 괘의 뜻을 빌려 어지러운 세상에서 물러남과 나아감의 도리를 묻는다. 책을 읽었다는 사실뿐 아니라 그 구절을 현실의 정치적 고민과 맞물려 해석한 독서 기록이다.',
    'Jeong Mong-ju left a poem in his own collected works titled “Reading the Changes and Sending It to Masters Ja-an and Dae-rim.” He uses the meaning of a hexagram to think through withdrawal and action in a troubled age, leaving direct evidence of reading and interpreting the I Ching.',
    'https://zh.wikisource.org/wiki/圃隱集/卷二',
    true
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '정몽주 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '주역 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-jeong-mong-ju-full-v1',
    'Codex',
    ARRAY['정몽주', '포은', '鄭夢周', '圃隱', 'Jeong Mong-ju', 'Chong Mong-ju'],
    '고려 말 문신 포은 정몽주(1337~1392)를 동명이인, 후대 소설·드라마 속 인물, 자신의 시문과 분리했다.',
    '『포은집』 원문에서 「주역을 읽고」와 「겨울밤에 춘추를 읽다」를 확인했다. 『주역』은 네이버의 정확한 기존 콘텐츠에 연결해 채택했다. 『춘추』는 직접 독서 증거는 통과하지만 허용된 메타 출처에 정확한 독립 판본이 없고 기존 DB 후보는 공양전·좌전 또는 다른 저작으로 잘못 매칭되어 연결을 보류했다. 자신의 시와 후대 영상물은 제외했으며 제목 있는 게임·음악의 직접 소비 기록은 확인하지 못했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'accepted',
      '주역', '복희·문왕·주공', target_content_id,
      '정몽주의 문집 『포은집』 권2에 「讀易寄子安，大臨兩先生」과 「讀易」이 실려 있으며, 괘의 뜻을 현실의 출처 문제와 연결해 풀이한다.',
      NULL
    ),
    (
      chunqiu_finding_id, target_run_id, 'BOOK', 'rejected',
      '춘추', '공자', NULL,
      '『포은집』 권2의 「冬夜讀春秋」는 정몽주가 눈 내리는 겨울밤 등불 아래 『춘추』를 읽고 공자의 미묘한 뜻을 살폈다고 직접 기록한다.',
      '독서 증거는 통과하지만 네이버·OpenLibrary에서 원전 『춘추』의 정확한 독립 판본 메타를 확보하지 못했다. 기존 DB의 동명 항목은 공양전·좌전 또는 Diane di Prima의 다른 작품과 뒤섞여 있어 오연결을 막기 위해 보류한다.'
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '정몽주 소재 드라마·영화·공연 일반', NULL, NULL,
      '정몽주를 재현한 후대 드라마와 공연은 존재하지만 모두 사후 창작물이다.',
      '본인이 감상한 제목 있는 공연·영상 기록이 아니므로 개인 콘텐츠로 등록하지 않는다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '바둑·장기·윷·놀이 기록 일반', NULL, NULL,
      '문집과 인물 자료에서 제목과 제작자가 특정되는 작품 단위 게임 소비 기록을 찾지 못했다.',
      '시대의 일반 놀이 문화를 정몽주의 개인 취향으로 추정하지 않는다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '거문고·피리·고려 음악 일반', NULL, NULL,
      '정몽주의 시에 악기와 소리를 소재로 삼은 표현은 있으나 특정 곡을 들었다는 작품 단위 기록은 아니다.',
      '자신의 시적 소재와 제목 있는 외부 음악 감상을 구분해 등록하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '정몽주 finding 생성 행 수가 5개가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://zh.wikisource.org/wiki/圃隱集/卷二',
      'primary', 'archive', 'accessible',
      '圃隱集 卷二',
      '정몽주 본인 문집의 「讀易寄子安，大臨兩先生」와 「讀易」 원문을 통해 『주역』 독서와 해석을 직접 확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001517008',
      'secondary', 'article', 'accessible',
      '포은 정몽주의 역학사상 연구 — KCI',
      '『포은집』의 역학 관련 시와 정몽주의 『주역』 해석을 학술적으로 교차 확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://search.shopping.naver.com/book/catalog/49966588647',
      'secondary', 'official_profile', 'accessible',
      '주역 — 네이버 도서',
      'DB에 연결된 ISBN 9791168878167 한국어 판본의 제목·저자·표지 메타데이터를 재확인했다.'
    ),
    (
      target_run_id, 'BOOK', chunqiu_finding_id,
      'https://zh.wikisource.org/wiki/圃隱集/卷二',
      'primary', 'archive', 'accessible',
      '圃隱集 卷二',
      '「冬夜讀春秋」 원문으로 『춘추』 직접 독서 사실을 확인했지만 정확한 허용 메타 판본이 없어 finding만 보존했다.'
    ),
    (
      target_run_id, 'BOOK', chunqiu_finding_id,
      'https://www.yes24.com/product/goods/3960474',
      'secondary', 'official_profile', 'accessible',
      '포은집 — YES24',
      '현대 번역본 목차에서 「주역을 읽고」와 「겨울 밤에 춘추를 읽다」가 모두 실렸음을 교차 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://contents.history.go.kr/front/km/view.do?levelId=km_024_0030_0060',
      'secondary', 'official_profile', 'accessible',
      '정몽주 — 우리역사넷',
      '인물의 생애와 활동 범위를 확인하고 후대 재현 영상과 본인 감상 기록을 분리했다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://contents.history.go.kr/front/km/view.do?levelId=km_024_0030_0060',
      'secondary', 'official_profile', 'accessible',
      '정몽주 — 우리역사넷',
      '생애 자료에서 작품 단위 게임 소비 기록이 확인되지 않았다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://zh.wikisource.org/wiki/圃隱集/卷二',
      'primary', 'archive', 'accessible',
      '圃隱集 卷二',
      '악기와 소리를 소재로 한 시를 검토했으나 제목 있는 외부 음악 작품의 감상 기록으로 볼 수 없었다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 8 THEN
    RAISE EXCEPTION '정몽주 source 생성 행 수가 8개가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '정몽주·포은·鄭夢周·圃隱集·讀易·冬夜讀春秋 조합으로 본인 문집 원문과 학술 논문, 국내 판본 메타를 조사했다. 『주역』 1건을 채택하고 『춘추』는 정확한 판본 메타 부재로 보류했다.'
      WHEN 'VIDEO' THEN
        '드라마·영화·연극·공연·관람 조합을 조사했다. 후대 재현물만 있고 본인의 작품 단위 감상 기록은 없다.'
      WHEN 'GAME' THEN
        'game·바둑·장기·윷·놀이 조합을 조사했다. 작품 단위 개인 소비 기록은 확인되지 않았다.'
      WHEN 'MUSIC' THEN
        'music·거문고·피리·노래·감상 조합과 『포은집』 시를 조사했다. 악기 소재는 있으나 특정 외부 음악 작품의 직접 감상은 아니다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '정몽주 scope 완료 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '정몽주 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '정몽주 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '정몽주 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
