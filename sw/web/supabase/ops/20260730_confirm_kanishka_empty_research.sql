-- 카니슈카 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 불교 결집·문학·미술 후원은 확인되지만 본인이 소비한 특정 외부 작품은 식별되지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '3bf77c2d-f5d7-4b32-a04e-93e928e7bc41'::uuid;
  target_run_id constant uuid := 'a373be29-28eb-4df6-b252-789f3a820ae4'::uuid;
  rejected_book_finding_id constant uuid := '6b8364cb-a15f-4af5-9ad3-41a21b264dc2'::uuid;
  rejected_video_finding_id constant uuid := '6809bfaf-a4ee-4657-806d-16af0d1aab02'::uuid;
  rejected_game_finding_id constant uuid := 'ca0c6ac3-bf41-405d-94ea-cae6095156a5'::uuid;
  rejected_music_finding_id constant uuid := '24a69df7-47f3-4190-a61b-8600da4c9204'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'kanishka'
      AND p.nickname = '카니슈카'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '카니슈카 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '카니슈카 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id,
    '2026-07-30-kanishka-empty-v1', 'Codex',
    ARRAY['카니슈카', 'Kanishka', 'Kanishka I', 'Kaniṣka', 'Kaniska', '迦膩色伽'],
    '2세기 쿠샨 황제 카니슈카 1세를 후대의 카니슈카 2세·3세, 카니슈카 시대 전체, 불교 전승 속 이상화된 왕과 분리했다.',
    '박물관의 쿠샨·간다라 자료, 불교 문헌 전승, 학술 연구를 대조해 BOOK·VIDEO·GAME·MUSIC을 조사했다. 카니슈카는 불교 결집과 승려·문학가를 후원한 왕으로 전해지지만 결집에서 편찬된 논서나 아슈바고샤의 특정 저술을 직접 읽었다는 기록은 아니다. 간다라 미술과 종교 후원, 정복전쟁과 주화, 궁정 문화도 개인의 작품 단위 감상으로 바꾸지 않고 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '카니슈카 결집의 아비달마 논서·아슈바고샤의 저술', '설일체유부 결집 전승·아슈바고샤', NULL,
      '후대 불교 전승은 카니슈카가 결집을 소집하고 아슈바고샤에게 불교를 배웠으며 논서 편찬을 후원했다고 말한다.',
      '왕의 후원·학습 관계만으로 결집 산출물이나 스승의 특정 저술을 본인의 독서작으로 확정할 수 없다. 결집의 역사성과 산출물 자체도 후대 전승 사이에 차이가 있어 임의 등록하지 않았다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '간다라 불교 조각·서사 부조와 후대 카니슈카 영상물', NULL, NULL,
      '카니슈카 시대에 불교 중심지와 시각예술이 번성했고 후대에는 그의 생애를 다룬 영상물이 제작됐다.',
      '조각·부조는 서비스의 VIDEO 감상작이 아니며 후대 영상은 본인 사후 재현물이다. 본인이 관람한 제목 있는 극·공연은 식별되지 않는다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '쿠샨 정복전쟁·왕권 주화와 후대 전략 게임', NULL, NULL,
      '카니슈카의 영토 확장과 군사·주화 자료는 풍부하고 후대 게임에서 쿠샨이 소재가 되기도 한다.',
      '실제 전쟁과 통치는 디지털 GAME 소비가 아니며 후대에 그를 소재로 만든 게임은 본인의 플레이 기록이 아니다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '쿠샨 궁정·종교 음악 일반', NULL, NULL,
      '다민족 쿠샨 문화와 종교 의례의 존재는 확인되지만 카니슈카 개인의 음악 감상을 전하는 동시대 기록은 찾지 못했다.',
      '문화권 일반론에서 곡명·창작자·연주자를 가진 개인 청취작을 복원할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '카니슈카 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://www.nichirenlibrary.org/en/dic/Content/K/26',
      'secondary', 'article', 'accessible',
      'Kanishka — The Soka Gakkai Dictionary of Buddhism',
      '아슈바고샤에게 배웠다는 전승과 제4차 결집·논서 편찬 후원을 확인했으나 개인의 특정 서명 독서는 서술하지 않는다.'
    ),
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://library.oapen.org/bitstream/20.500.12657/38155/1/9789004194588_webready_content_text.pdf',
      'secondary', 'article', 'accessible',
      'Early Buddhist Transmission and Trade Networks — OAPEN',
      '카니슈카 결집의 후대 전승과 아슈바고샤 문학 후원을 비판적으로 대조했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://www.metmuseum.org/essays/gandhara',
      'secondary', 'official_profile', 'accessible',
      'Gandhara — The Metropolitan Museum of Art',
      '카니슈카 치세의 불교 중심지와 서사 조각을 확인하고 개인의 제목 있는 공연 관람과 분리했다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://www.britishmuseum.org/collection/term/BIOG110601',
      'secondary', 'official_profile', 'accessible',
      'Kanishka I — British Museum Collections Online',
      '카니슈카 1세와 후대 동명 왕을 분리하고 군사·주화 자료를 게임 플레이로 해석하지 않았다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://www.iranicaonline.org/articles/buddhism-iv/',
      'secondary', 'article', 'accessible',
      'Buddhism iv. Buddhist Sites in Afghanistan and Central Asia — Encyclopaedia Iranica',
      '불교 전승과 동시대 비문·주화 사이의 차이를 확인했으며 특정 음악 작품이나 청취 기록은 제시되지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '카니슈카 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'Kanishka·카니슈카와 read·book·Ashvaghosha·council·Abhidharma 조합을 조사했다. 결집·문학 후원은 특정 서명 독서가 아니어서 기각했다.'
        WHEN 'VIDEO' THEN 'watched·theatre·performance·Gandhara art 조합을 조사했다. 시각예술 후원과 후대 재현물 외에 본인의 제목 있는 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·war·hunt·Kushan 조합을 조사했다. 실제 정복전쟁과 후대 전략 게임은 본인의 디지털 GAME 소비가 아니다.'
        WHEN 'MUSIC' THEN 'music·song·heard·court·ritual 조합을 조사했다. 쿠샨 문화 일반론 외에 곡명·창작자가 특정되는 청취작은 없다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '카니슈카 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '카니슈카 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.user_contents uc WHERE uc.user_id = p.id
      )
  ) THEN
    RAISE EXCEPTION '카니슈카 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
