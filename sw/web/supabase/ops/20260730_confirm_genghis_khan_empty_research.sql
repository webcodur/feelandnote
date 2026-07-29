-- 칭기즈 칸 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  현풍경회록 — 구처기의 설교를 들은 기록이지 제목 있는 책을 읽은 근거가 아님
--   GAME  얼음 위 복사뼈 놀이 — 실제 전통 신체 놀이이며 서비스의 디지털 GAME 작품이 아님
--   MUSIC 부하라 여성 가수들의 노래 — 청취 기록은 있으나 곡명·창작자가 없음
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'e94f8fc2-9010-4f39-9d32-2dad78a83cd2'::uuid;
  target_run_id constant uuid := '27173d8a-4c98-4dda-bc2c-864568efc097'::uuid;
  rejected_book_finding_id constant uuid := '38e9b973-05e2-470c-bd80-99df191ab0ba'::uuid;
  rejected_game_finding_id constant uuid := '29afd68f-1934-48cf-b96c-98bfb65a6a70'::uuid;
  rejected_music_finding_id constant uuid := '2866a624-7937-4ab5-a3d7-5a0a9866d310'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'genghis-khan'
      AND p.nickname = '칭기즈 칸'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '칭기즈 칸 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '칭기즈 칸에게 이미 연결된 콘텐츠가 있습니다.';
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
      rejected_book_finding_id,
      rejected_game_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '칭기즈 칸 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
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
    '2026-07-30-genghis-khan-full-v1',
    'Codex',
    ARRAY[
      '칭기즈 칸',
      '칭기스 칸',
      '징기스칸',
      '테무진',
      'Genghis Khan',
      'Chinggis Khan',
      'Chinggis Qan',
      'Temüjin',
      'Temujin',
      'Činggis Khan',
      '成吉思汗'
    ],
    '인물 이름을 제목으로 쓴 현대 도서·영화·드라마·게임·음악과 칭기즈 칸을 주인공·소재로 삼은 후대 작품은 본인이 소비한 콘텐츠가 아니므로 제외했다. 『몽골비사』와 『세계정복자의 역사』 등 그의 생애를 전하는 사료도 저술·완성 시기와 소비 증거를 따로 검토했으며, 전기 속 사건을 곧바로 작품 감상으로 바꾸지 않았다.',
    '한국어·영어·몽골어·중국어 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 『몽골비사』 번역, 구처기 회동 기록, 몽골 놀이 연구, 이란 음악사 자료를 교차 대조했다. 구처기의 설교를 듣고 기록하게 한 일, 어린 시절 자무카와 복사뼈 놀이를 한 일, 부하라 가수들의 노래와 춤을 청한 일은 확인했다. 그러나 도서는 구두 설교의 후대 문헌화이고, 놀이는 디지털 게임 작품이 아니며, 음악은 곡명이 전하지 않는다. 영상은 시대적으로 해당 매체가 없고 후대 재현물뿐이어서 네 유형 모두 채택 0건으로 완료했다.'
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
      rejected_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '현풍경회록(玄風慶會錄)',
      '야율초재 귀속',
      NULL,
      '1222년 칭기즈 칸이 전진교 도사 구처기의 장수·통치 설교를 직접 듣고 몽골 문자로 기록하게 했다는 전승과, 그 회동의 설교 기록인 『현풍경회록』이 전한다.',
      '칭기즈 칸이 소비한 것은 대면 구두 설교이며, 현전 제목의 기록은 그 대화를 문헌화해 1232년에 간행된 것으로 소개된다. 그가 완성된 책을 읽거나 낭독받았다는 근거가 없고 문해력 자체도 논쟁적이므로 BOOK 감상으로 등록하지 않았다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '얼음 위 복사뼈 놀이',
      NULL,
      NULL,
      '『몽골비사』 116절은 열한 살 테무진과 자무카가 서로 복사뼈를 주고받고 오논강 얼음 위에서 복사뼈 놀이를 했다고 기록한다.',
      '실제 놀이 이력은 명확하지만 양·염소 복사뼈를 쓰는 전통 신체 놀이로, IGDB 기반 디지털 게임 작품을 기록하는 서비스의 GAME 범주와 다르다. 특정 상용 게임 작품으로 치환하지 않았다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '부하라 여성 가수들의 노래(곡명 미상)',
      '부하라 여성 가수들',
      NULL,
      '주바이니 전승을 인용한 음악사 자료는 1220년 부하라 점령 뒤 칭기즈 칸이 도시의 여성 가수들을 불러 노래하고 춤추게 했고 몽골인들도 자신들의 선율에 맞춰 노래했다고 전한다.',
      '칭기즈 칸이 음악 공연을 들었다는 사건은 확인되지만 개별 곡명·작사·작곡자·후대 음원과의 동일성이 전혀 남아 있지 않다. 작품 단위 MUSIC 콘텐츠로 식별할 수 없어 기각했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '칭기즈 칸 조사 finding 생성 행 수가 3이 아닙니다. 실제=%', affected;
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
      rejected_book_finding_id,
      'https://storymaps.arcgis.com/stories/7aa4e8f6e9d740e18f4f873610656e67',
      'secondary',
      'article',
      'accessible',
      'The Travels of Master Changchun',
      '현대 주석 번역 프로젝트의 보충 StoryMap이다. 칭기즈 칸이 구처기의 가르침을 몽골 문자로 기록하게 했다고 전하면서, 현전 설교 기록 『현풍경회록』은 1232년에 간행됐다고 구분한다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.cambridge.org/core/journals/journal-of-chinese-history/article/communications-and-communicators-in-the-yuan-and-early-ming/DCC3269CD58F4FE7FF9EC0F2505214EC',
      'secondary',
      'article',
      'accessible',
      'Communications and “Communicators” in the Yuan and Early Ming',
      '칭기즈 칸을 문맹이었지만 기록의 가치를 이해해 위구르계 문자를 채택한 통치자로 설명한다. 기록을 명한 것과 본인이 책을 읽은 것을 구분하는 근거다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://www.worldhistory.org/Genghis_Khan/',
      'secondary',
      'article',
      'accessible',
      'Genghis Khan, World History Encyclopedia',
      '1162년 무렵부터 1227년까지의 생애와 주요 사료를 대조하고 film·movie·drama·performance·watched 조합을 검색했다. 당대 영상 매체는 없으며 현대 전기 영화·드라마·다큐멘터리는 모두 사후 재현물이다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://azizyardimli.com/ottoman/pdf_site/The_Secret_History_of_the_Mongols__The_life_and_times_of_Chinggis_Khan_Urgunge_Onon.pdf',
      'primary',
      'archive',
      'accessible',
      'The Secret History of the Mongols: The Life and Times of Chinggis Khan',
      'Urgunge Onon 번역 116절은 열한 살 테무진과 자무카가 오논강 얼음 위에서 복사뼈 놀이를 했다고 직접 전한다. 주석은 구리로 채운 복사뼈가 놀이 말이었다고 설명한다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://www.orientalstudies.ru/rus/images/pdf/journals/p_mongolica_25_3_2022.pdf',
      'secondary',
      'article',
      'accessible',
      'Mongolian Knucklebones Game Played on Ice',
      '몽골과학원 연구자가 얼음 위 복사뼈 놀이를 유목 문화의 전통 오락으로 분석한다. 디지털 게임 작품이 아니라는 범주 판정 근거다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.iranicaonline.org/articles/music-history/music-history-ii/?generate_pdf=1',
      'secondary',
      'article',
      'accessible',
      'Music History ii. ca. 650 to 1370 CE, Encyclopaedia Iranica',
      '칭기즈 칸이 부하라의 여성 가수들을 불러 노래와 춤을 시켰다는 음악사 기록을 제시한다. 개별 곡명은 전하지 않는다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://content.ucpress.edu/chapters/12768.ch01.pdf',
      'secondary',
      'archive',
      'accessible',
      'The Age of the Seljuqs and Mongols, University of California Press excerpt',
      '아타 말리크 주바이니의 부하라 점령 서술을 인용해 여성 가수들의 노래·춤과 몽골인들의 노래를 대조한다. 역시 작품명이나 창작자는 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '칭기즈 칸 조사 source 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '칭기즈 칸·칭기스 칸·테무진·Genghis/Chinggis Khan·Chinggis Qan·成吉思汗과 read·book·text·scripture·literature·Qiu Chuji 조합을 검색했다. 구처기의 설교를 듣고 기록하게 한 사건은 확인했지만 완성된 『현풍경회록』 독서 근거는 없다. 『몽골비사』는 칭기즈 칸 사후 완성된 그의 전기 사료이고, 야사·칙령은 본인의 통치 기록이며, 현대 전기는 모두 후대 저술이라 제외했다.'
      WHEN 'VIDEO' THEN
        'Genghis/Chinggis Khan·Temüjin과 watched·film·movie·theatre·drama·performance 조합을 검색하고 12–13세기 생애 및 사료 연대를 대조했다. 당대에 영상 매체가 존재하지 않았고, 그를 소재로 한 영화·TV·다큐멘터리와 무대 재현은 모두 사후 작품이라 본인의 감상 콘텐츠에서 제외했다.'
      WHEN 'GAME' THEN
        'Genghis Khan·Temüjin과 game·played·chess·board game·shagai·knucklebones 조합을 검색했다. 『몽골비사』의 얼음 위 복사뼈 놀이는 실제 플레이 근거지만 전통 신체 놀이이며 디지털 GAME 작품이 아니다. 현대의 Genghis Khan·Mongol 제국 소재 비디오게임은 사후 창작이므로 제외했다.'
      WHEN 'MUSIC' THEN
        'Genghis/Chinggis Khan과 music·song·singer·court musician·Bukhara·favorite 조합을 검색했다. 부하라 여성 가수들의 공연을 청하고 몽골인들의 노래를 들은 사건, 궁정 음악가와 악단 기록은 확인했으나 어느 자료도 개별 곡명을 전하지 않는다. 후대의 칭기즈 칸 찬가·민요·대중음악은 본인이 들은 작품으로 소급하지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '칭기즈 칸 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT
    result.final_research_status,
    result.actual_content_count
  INTO
    completed_status,
    completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION
      '칭기즈 칸 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
      completed_status,
      completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (
        SELECT count(*)
        FROM public.user_contents uc
        WHERE uc.user_id = p.id
      ) = 0
  ) THEN
    RAISE EXCEPTION '칭기즈 칸 프로필·0건 확정 최종 검증에 실패했습니다.';
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
          AND f.decision = 'rejected'
      ) = 3
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_sources src
        WHERE src.run_id = r.id
      ) = 7
  ) THEN
    RAISE EXCEPTION '칭기즈 칸 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
