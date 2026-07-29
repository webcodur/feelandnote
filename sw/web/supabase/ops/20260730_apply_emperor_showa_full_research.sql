-- 쇼와 천황 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 원장과 함께 반영한다.
-- 채택:
--   BOOK  도련님
--   VIDEO 일본의 가장 긴 날(1967)
-- 기각:
--   GAME  골프 — 디지털 게임 작품이 아닌 신체 스포츠
--   MUSIC 황실 가족 합주 — 곡명 미상
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '8b98b191-9f66-484f-8c00-6c8cbd7be2f3'::uuid;
  botchan_content_id constant text := '43a6433a-d63f-4e8f-aaf3-d9c29505c2d8';
  video_content_id constant text := '03db1270-773c-49c8-8ffc-92226e35df1b';
  botchan_user_content_id constant uuid := '6ff611a5-7cc1-4f32-866a-499fe60efee2'::uuid;
  video_user_content_id constant uuid := 'cdff5fb3-5c26-4346-9241-f9b329c74c0b'::uuid;
  target_run_id constant uuid := '0f640313-0a6d-4bbc-b91d-6d591ca383c5'::uuid;
  accepted_book_finding_id constant uuid := 'e6c0cf07-d797-4249-95bc-8800b3812f85'::uuid;
  accepted_video_finding_id constant uuid := '0a144139-944a-4935-b2e1-8eba14c15218'::uuid;
  rejected_game_finding_id constant uuid := '21df6945-75b7-4434-91d3-4908a9ea8bf9'::uuid;
  rejected_music_finding_id constant uuid := '15fd40da-33c1-4cae-b143-b1e1acd0e512'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'emperor-showa'
      AND p.nickname = '쇼와 천황'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '쇼와 천황 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '쇼와 천황에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id
       OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      accepted_book_finding_id,
      accepted_video_finding_id,
      rejected_game_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '쇼와 천황 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  IF (
    SELECT count(*)
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = botchan_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9791127263577'
      AND c.release_date = '1906-01-01'
      AND c.user_count = 0
      AND ko.isbn = '9791127263577'
      AND ko.verified = true
      AND en.title = 'Botchan'
      AND en.isbn = '9784770007018'
      AND en.verified = true
  ) <> 1 THEN
    RAISE EXCEPTION '기존 『도련님』 콘텐츠의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id = video_content_id
       OR (c.external_source = 'tmdb' AND c.external_id = 'tmdb-movie-47370')
  ) OR EXISTS (
    SELECT 1
    FROM public.content_locales cl
    WHERE lower(cl.title) IN (
      lower('일본의 가장 긴 날'),
      lower('日本のいちばん長い日'),
      lower('Japan''s Longest Day')
    )
  ) THEN
    RAISE EXCEPTION '《일본의 가장 긴 날》과 충돌하는 콘텐츠 ID, 외부 ID 또는 제목이 이미 존재합니다.';
  END IF;

  INSERT INTO public.contents (
    id,
    type,
    metadata,
    release_date,
    external_source,
    external_id,
    user_count
  )
  VALUES (
    video_content_id,
    'VIDEO',
    jsonb_build_object(
      'mediaType', 'movie',
      'tmdbId', 47370,
      'originalTitle', '日本のいちばん長い日',
      'releaseDate', '1967-08-03',
      'runtime', 157,
      'director', 'Kihachi Okamoto',
      'genres', jsonb_build_array('Drama', 'History', 'War')
    ),
    '1967-08-03',
    'tmdb',
    'tmdb-movie-47370',
    0
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '쇼와 천황 신규 contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id,
    locale,
    title,
    creator,
    thumbnail_url,
    description,
    isbn,
    publisher,
    sources,
    verified
  )
  VALUES
    (
      video_content_id,
      'ko',
      '일본의 가장 긴 날',
      '오카모토 기하치',
      'https://image.tmdb.org/t/p/w500/ix1uEGm9pr27Kc1jn7SHSu4DDzV.jpg',
      '1945년 8월 14일 정오부터 항복을 알리는 옥음방송이 송출된 15일 정오까지의 24시간과 일본 정부·군부 내부의 충돌을 그린 영화다.',
      NULL,
      NULL,
      jsonb_build_object(
        'primary', 'tmdb',
        'thumbnail', 'tmdb',
        'url', 'https://www.themoviedb.org/movie/47370'
      ),
      true
    ),
    (
      video_content_id,
      'en',
      'Japan''s Longest Day',
      'Kihachi Okamoto',
      'https://image.tmdb.org/t/p/w500/1IfCvCMoE14B2DbLtcWz4bgkl7P.jpg',
      'A historical drama about the final twenty-four hours before Japan announced its surrender in August 1945 and the military coup attempt surrounding that decision.',
      NULL,
      NULL,
      jsonb_build_object(
        'primary', 'tmdb',
        'thumbnail', 'tmdb',
        'url', 'https://www.themoviedb.org/movie/47370'
      ),
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '쇼와 천황 신규 content_locales 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id,
    user_id,
    content_id,
    status,
    review,
    review_en,
    source_url,
    is_recommended
  )
  VALUES
    (
      botchan_user_content_id,
      target_celeb_id,
      botchan_content_id,
      'FINISHED',
      $ko$쇼와 천황의 공식 일대기인 『쇼와천황실록』을 읽은 작가 한도 가즈토시는 천황이 나쓰메 소세키의 『도련님』을 즐겨 읽었다는 사실이 뜻밖이었다고 회고했다. 궁내청이 편찬한 실록에서 확인된 독서 기록이므로 등록한다.$ko$,
      $en$Writer Hando Kazutoshi, reflecting on the Imperial Household Agency's official chronicle of Emperor Shōwa, singled out the unexpected discovery that the emperor loved reading Natsume Sōseki's *Botchan*. The reading record in the official chronicle supports its inclusion.$en$,
      'https://www.yurindo.co.jp/yurin/article/537',
      false
    ),
    (
      video_user_content_id,
      target_celeb_id,
      video_content_id,
      'FINISHED',
      $ko$한도 가즈토시는 『쇼와천황실록』을 통해 쇼와 천황이 자신의 논픽션을 원작으로 한 오카모토 기하치의 1967년 영화 《일본의 가장 긴 날》을 관람했다는 사실도 확인했다. 공식 실록에 남은 관람 기록과 작품이 정확히 대응해 등록한다.$ko$,
      $en$Hando Kazutoshi also learned from the official chronicle that Emperor Shōwa watched Kihachi Okamoto's 1967 film *Japan's Longest Day*, adapted from Hando's nonfiction account. The official viewing record identifies the work clearly enough for inclusion.$en$,
      'https://www.yurindo.co.jp/yurin/article/537',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '쇼와 천황 user_contents 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer
    FROM public.user_contents uc
    WHERE uc.content_id = c.id
  )
  WHERE c.id IN (botchan_content_id, video_content_id);

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '쇼와 천황 콘텐츠 user_count 동기화 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id IN (botchan_content_id, video_content_id)
      AND c.user_count <> 1
  ) THEN
    RAISE EXCEPTION '쇼와 천황 콘텐츠 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id,
    celeb_id,
    batch_key,
    researcher_label,
    name_variants,
    homonym_notes,
    summary
  )
  VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-emperor-showa-full-v1',
    'Codex',
    ARRAY[
      '쇼와 천황',
      '昭和天皇',
      '히로히토',
      '裕仁',
      'Emperor Shōwa',
      'Emperor Showa',
      'Emperor Hirohito'
    ],
    '쇼와 천황 본인(1901~1989)과 아들 아키히토 상왕, 동생 미카사노미야 다카히토 친왕 및 전후 작품 속 허구 인물을 분리했다. “쇼와 천황이 등장하는 작품”과 본인이 실제로 읽거나 본 작품을 구분했고, 본인의 해양생물학 논문과 와카는 소비 콘텐츠에서 제외했다.',
    '한국어·일본어·영어 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 궁내청 『쇼와천황실록』의 출판 원장과 이를 읽고 작품명을 공개한 한도 가즈토시의 설명을 대조했다. 『도련님』 독서와 1967년 영화 《일본의 가장 긴 날》 관람을 채택했다. 골프는 신체 스포츠라 GAME에서 기각했고, 황실 가족 합주는 곡명이 확인되지 않아 MUSIC으로 등록하지 않았다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id,
    run_id,
    content_type,
    decision,
    title,
    creator,
    content_id,
    evidence_summary,
    rejection_reason
  )
  VALUES
    (
      accepted_book_finding_id,
      target_run_id,
      'BOOK',
      'accepted',
      '도련님',
      '나쓰메 소세키',
      botchan_content_id,
      '궁내청이 편찬한 『쇼와천황실록』을 읽은 한도 가즈토시가 쇼와 천황이 『도련님』을 애독했다는 사실을 실록에서 확인했다고 작품명을 들어 설명했다.',
      NULL
    ),
    (
      accepted_video_finding_id,
      target_run_id,
      'VIDEO',
      'accepted',
      '일본의 가장 긴 날',
      '오카모토 기하치',
      video_content_id,
      '한도 가즈토시는 『쇼와천황실록』에서 쇼와 천황이 자신의 원작을 영화화한 1967년판 《일본의 가장 긴 날》을 관람했다는 기록을 확인했다고 밝혔다.',
      NULL
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '골프',
      NULL,
      NULL,
      '일본골프협회 자료에는 쇼와 천황이 황태자 시절부터 골프를 했고 나스 황실 빌라에 9홀 코스를 조성했다는 기록이 있다.',
      '골프 활동은 확인되지만 서비스 GAME 유형이 다루는 작품 단위 디지털 게임이 아니라 신체 스포츠다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '황실 가족 합주(곡명 미상)',
      NULL,
      NULL,
      '1963년 쇼와 천황 일가가 바이올린·첼로·우쿨렐레 등으로 함께 연주한 가족 음악회 기록이 사진과 함께 남아 있다.',
      '연주 활동과 악기는 확인되지만 곡명·작곡가·음반이 특정되지 않아 작품 단위 MUSIC으로 연결할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '쇼와 천황 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id,
    content_type,
    finding_id,
    url,
    source_tier,
    source_kind,
    access_status,
    title,
    notes
  )
  VALUES
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://shoryobu.kunaicho.go.jp/Publication',
      'primary',
      'archive',
      'accessible',
      '宮内庁書陵部 刊行物・パンフレット 昭和天皇実録',
      '궁내청 서릉부가 편찬·간행한 『쇼와천황실록』 전 권의 공식 출판 원장이다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://www.yurindo.co.jp/yurin/article/537',
      'secondary',
      'direct_statement',
      'accessible',
      '半藤一利『昭和天皇実録』を読む',
      '한도 가즈토시가 실록을 읽고 쇼와 천황이 『도련님』을 애독했다는 사실이 놀라웠다고 작품명을 직접 밝혔다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://search.shopping.naver.com/book/catalog/32466750680',
      'secondary',
      'official_profile',
      'accessible',
      '도련님 네이버 도서 메타',
      '기존 한국어 콘텐츠의 ISBN 9791127263577과 표지를 대조했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://openlibrary.org/books/OL24214209M',
      'secondary',
      'official_profile',
      'accessible',
      'Botchan, Open Library',
      '기존 영문 콘텐츠의 제목·저자·영문판 ISBN 9784770007018과 표지 ID를 대조했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      accepted_video_finding_id,
      'https://shoryobu.kunaicho.go.jp/Publication',
      'primary',
      'archive',
      'accessible',
      '宮内庁書陵部 刊行物・パンフレット 昭和天皇実録',
      '영화 관람 기록이 수록된 공식 실록의 궁내청 출판 원장이다.'
    ),
    (
      target_run_id,
      'VIDEO',
      accepted_video_finding_id,
      'https://www.yurindo.co.jp/yurin/article/537',
      'secondary',
      'direct_statement',
      'accessible',
      '半藤一利『昭和天皇実録』を読む',
      '원작자 한도 가즈토시가 쇼와 천황이 영화화된 《일본의 가장 긴 날》을 봤다는 사실을 실록에서 확인했다고 직접 설명했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      accepted_video_finding_id,
      'https://jfdb.jp/title/7674',
      'secondary',
      'official_profile',
      'accessible',
      '日本のいちばん長い日, Japanese Film Database',
      '1967년판 작품의 감독·개봉연도·내용을 일본 영화 데이터베이스에서 대조했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      accepted_video_finding_id,
      'https://www.themoviedb.org/movie/47370',
      'secondary',
      'official_profile',
      'accessible',
      'Japan''s Longest Day, TMDB 47370',
      'TMDB ID 47370, 1967-08-03, 러닝타임 157분과 일본어·영문 포스터를 대조하고 두 이미지를 육안 검수했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://www.jga.or.jp/jga/html/museum/3-emperor/5page.html',
      'primary',
      'archive',
      'accessible',
      '昭和天皇とゴルフ, 日本ゴルフ協会',
      '쇼와 천황의 골프 활동과 황실 코스 조성 기록을 확인했으나 디지털 게임 작품은 아니다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.fnn.jp/articles/-/943955',
      'secondary',
      'article',
      'accessible',
      '天皇ご一家の音楽会',
      '1963년 황실 가족 합주 사진과 악기 구성은 확인되지만 연주곡 명칭은 기사에 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 10 THEN
    RAISE EXCEPTION '쇼와 천황 조사 source 생성 행 수가 10이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '昭和天皇·裕仁·Emperor Shōwa·Hirohito와 愛読書·読書·book·reading 조합을 검색했다. 궁내청 『쇼와천황실록』을 읽은 한도 가즈토시의 설명에서 나쓰메 소세키 『도련님』 애독 기록을 확인했다. 잡지 『중앙공론』 독서와 본인의 와카·해양생물학 논문도 검토했으나 특정 호가 없거나 본인 창작물이라 제외했다.'
      WHEN 'VIDEO' THEN
        '映画·見た映画·鑑賞·watched film·movie 조합과 『쇼와천황실록』 관련 인터뷰를 검색했다. 실록에서 관람이 확인된 오카모토 기하치의 1967년판 《일본의 가장 긴 날》을 채택하고 JFDB·TMDB로 동명 2015년 리메이크와 분리했다.'
      WHEN 'GAME' THEN
        'ゲーム·遊び·碁·将棋·ゴルフ·video game·played 조합을 검색했다. 일본골프협회에서 골프 활동은 확인했으나 신체 스포츠이며, 특정 디지털·아케이드·보드 게임 작품 플레이 기록은 찾지 못했다.'
      WHEN 'MUSIC' THEN
        '音楽·愛聴曲·歌·レコード·演奏·favorite music·song 조합을 검색했다. 황실 가족 합주와 악기 구성은 확인했지만 곡명이 없었고, 메이지 천황의 와카 낭송은 쇼와 천황 자신의 음악 감상 작품으로 확정할 수 없어 채택하지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '쇼와 천황 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT
    result.final_research_status,
    result.actual_content_count
  INTO
    completed_status,
    completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 2 THEN
    RAISE EXCEPTION
      '쇼와 천황 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
      completed_status,
      completed_content_count;
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
    RAISE EXCEPTION '쇼와 천황 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (
        SELECT count(*)
        FROM public.user_contents uc
        WHERE uc.user_id = p.id
      ) = 2
  ) THEN
    RAISE EXCEPTION '쇼와 천황 프로필·콘텐츠 최종 검증에 실패했습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.run_id = target_run_id
      AND f.decision = 'accepted'
      AND (
        f.content_id IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM public.user_contents uc
          WHERE uc.user_id = target_celeb_id
            AND uc.content_id = f.content_id
        )
        OR NOT EXISTS (
          SELECT 1
          FROM public.celeb_content_research_sources src
          WHERE src.finding_id = f.id
            AND src.source_tier = 'primary'
        )
      )
  ) THEN
    RAISE EXCEPTION '쇼와 천황 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.celeb_id = target_celeb_id
      AND r.status = 'completed'
      AND r.completed_at IS NOT NULL
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_scopes s
        WHERE s.run_id = r.id
          AND s.status = 'completed'
      ) = 4
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_findings f
        WHERE f.run_id = r.id
          AND f.decision = 'accepted'
      ) = 2
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_findings f
        WHERE f.run_id = r.id
          AND f.decision = 'rejected'
      ) = 2
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_sources src
        WHERE src.run_id = r.id
      ) = 10
  ) THEN
    RAISE EXCEPTION '쇼와 천황 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
