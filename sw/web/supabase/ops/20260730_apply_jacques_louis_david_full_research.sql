-- 자크루이 다비드 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택: 플루타르코스 『영웅전』 — 1820년경 그로에게 보낸 편지에서 직접 읽고 주제를 고르라고 권함.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'bfb9b814-6f89-4d94-a80d-78b392117ea8'::uuid;
  target_content_id constant text := '45b10125-6f11-47e5-b5e3-ba4b2431f170';
  target_run_id constant uuid := '10628be2-77de-41e6-9e75-022c11f96ea7'::uuid;
  target_uc_id constant uuid := '874e30ab-9707-4041-8c42-de20a8a94220'::uuid;
  book_finding_id constant uuid := '31e33114-f414-4162-9d6c-8ebaa9cec18b'::uuid;
  video_finding_id constant uuid := '5ddcb5cc-91bb-4cd4-9292-2594d20f84d6'::uuid;
  game_finding_id constant uuid := '8379a49d-e46f-4b74-b9fd-f903b598220e'::uuid;
  music_finding_id constant uuid := 'cb08ef45-dae3-42d1-9602-7aed2ebc8efc'::uuid;
  expected_user_count integer;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'jacques-louis-david'
      AND p.nickname = '자크루이 다비드'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '자크루이 다비드 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = target_uc_id
  ) THEN
    RAISE EXCEPTION '자크루이 다비드 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  SELECT count(*)::integer + 1
  INTO expected_user_count
  FROM public.user_contents uc
  WHERE uc.content_id = target_content_id;

  IF expected_user_count <> 3 OR NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = target_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788991290334'
      AND ko.title = '플루타르코스 영웅전'
      AND ko.creator = '플루타르코스'
      AND ko.verified = true
      AND en.title = 'Greek Lives'
      AND en.creator = 'Plutarch'
      AND en.verified = true
  ) THEN
    RAISE EXCEPTION '플루타르코스 영웅전 기존 콘텐츠 기준선이 달라졌습니다. 예상 user_count=%',
      expected_user_count;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    target_uc_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    $ko$브뤼셀에 망명 중이던 다비드는 제자 앙투안장 그로에게 역사화의 주제를 고르라며 “서둘러, 나의 좋은 친구여, 당신의 플루타르코스를 펼쳐보게. 모두가 아는 주제를 고르게”라고 편지했다. 루브르도 다비드의 「사비니 여인들」이 『로물루스전』을 바탕으로 했다고 설명한다. 고전을 직접 펼쳐 읽으라는 작품군 단위의 추천과 창작 활용이 겹치므로 『영웅전』을 등록한다.$ko$,
    $en$From exile in Brussels, David urged his former pupil Antoine-Jean Gros to return to history painting: “Quickly, quickly, my good friend, leaf through your Plutarch; choose a subject known to everyone.” The Louvre also identifies Plutarch's Life of Romulus as a source for David's Intervention of the Sabine Women. The explicit reading recommendation and documented artistic use support linking Plutarch's Lives.$en$,
    'https://fr.wikisource.org/wiki/Page:Revue_des_Deux_Mondes_-_1848_-_tome_23.djvu/674',
    true
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '자크루이 다비드 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '플루타르코스 영웅전 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-jacques-louis-david-full-v1',
    'Codex',
    ARRAY['자크루이 다비드', 'Jacques-Louis David', 'Jacques Louis David', 'Louis David', 'J.-L. David'],
    '프랑스 신고전주의 화가 자크루이 다비드(1748~1825)를 동명 인물과 성서의 다윗, 후대 다큐멘터리 제목에서 분리했다.',
    $s$프랑스어·영어 이름과 lire·Plutarque·Tite-Live·Corneille·théâtre·musique·jeu 조합으로 조사했다. 1820년경 그로에게 보낸 편지에서 플루타르코스를 펼쳐 모두가 아는 역사 주제를 고르라고 직접 권한 문장과 루브르의 『로물루스전』 창작 원천 설명을 교차해 BOOK 1건을 채택했다. 코르네유의 「오라스」를 1782년에 본 기록은 무대극 관람이므로 VIDEO로 바꾸지 않았다. 혁명제 축전의 음악 설계는 행사 조직 기록이지 특정 음악을 개인적으로 추천·감상했다는 근거가 아니며, 실제 미술 교육·정치 행사도 디지털 GAME이 아니다.$s$
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'accepted',
      '플루타르코스 영웅전', '플루타르코스', target_content_id,
      '다비드가 그로에게 “당신의 플루타르코스를 펼쳐보라”고 직접 권했고, 루브르는 「사비니 여인들」의 원천으로 『로물루스전』을 지목한다.',
      NULL
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '오라스', '피에르 코르네유', NULL,
      '루브르와 스마스히스토리는 다비드가 1782년 파리에서 코르네유의 「오라스」 공연을 보았다고 전한다.',
      '직접 관람은 확인되지만 18세기 무대극은 영화·TV·온라인 영상인 서비스 VIDEO가 아니다. 희곡 읽기로도 바꾸지 않았다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '고대 경기·혁명기 축전·미술 교육 일반', NULL, NULL,
      '다비드는 고대사 장면과 공화국 축전을 설계했지만 디지털 게임 소비 기록은 확인되지 않는다.',
      '실제 역사 장면·행사·교육 활동은 서비스 GAME 작품이 아니며 후대 다비드 소재 게임은 본인의 플레이가 아니다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '최고존재의 축전 음악 일반', '프랑수아조제프 고세크 외', NULL,
      '다비드가 제출한 1794년 축전 계획은 새벽부터 군악이 울리고 합창과 음악이 행진을 이끈다고 명시한다.',
      '행사의 시각·의식 총연출 및 음악 사용 계획은 확인되지만 다비드 개인이 제목 있는 곡을 듣거나 추천한 증거가 아니다. 특정 고세크 음원으로 임의 매칭하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '자크루이 다비드 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://fr.wikisource.org/wiki/Page:Revue_des_Deux_Mondes_-_1848_-_tome_23.djvu/674',
      'primary', 'archive', 'accessible',
      'Revue des Deux Mondes, 1848, p. 674 — Wikisource',
      '다비드가 그로에게 플루타르코스를 펼쳐 역사화 주제를 고르라고 한 편지 문장을 전재한 동시대 자료를 확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://api-www.louvre.fr/sites/default/files/2025-08/EXE_DOSSIER_PEDAGOGIQUE_DAVID.pdf',
      'secondary', 'official_profile', 'accessible',
      'Jacques-Louis David — Musée du Louvre dossier pédagogique',
      '루브르는 「사비니 여인들」의 원천으로 플루타르코스 『로물루스전』과 롤랭의 『로마사』를 지목한다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://search.shopping.naver.com/book/catalog/32463265511',
      'secondary', 'official_profile', 'accessible',
      '플루타르코스 영웅전 — 네이버 도서',
      '서비스에 이미 등록된 ISBN 9788991290334 판본을 재사용했다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://smarthistory.org/jacques-louis-david-oath-of-the-horatii/',
      'secondary', 'article', 'accessible',
      'Jacques-Louis David, Oath of the Horatii — Smarthistory',
      '제자 증언에 따라 다비드가 1782년 「오라스」 공연을 보았다고 설명하지만 무대극이므로 VIDEO에서 제외했다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://www2.assemblee-nationale.fr/sycomore/fiche?num_dept=12282',
      'secondary', 'official_profile', 'accessible',
      'Jacques, Louis David — Assemblée nationale',
      '공식 생애·정치 활동·고대 미술 연구를 확인했으나 디지털 GAME 플레이 기록은 없다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://www.persee.fr/doc/arcpa_0000-0000_1972_num_90_1_26352_t1_0141_0000_11',
      'primary', 'archive', 'accessible',
      'Plan pour la fête du 20 prairial — Archives parlementaires',
      '다비드의 축전 계획에 음악 사용은 명시되지만 개인 청취·추천이나 식별 가능한 작품 소비는 아니다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '자크루이 다비드 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Jacques-Louis David·lire·read·Plutarque·Plutarch·Tite-Live·Rousseau 조합을 조사했다. 1820년경 편지의 직접 추천과 루브르의 『로물루스전』 원천 설명으로 『영웅전』을 채택했다.'
      WHEN 'VIDEO' THEN
        'vu·saw·theatre·Horace·Corneille·performance 조합을 조사했다. 1782년 공연 관람은 확인되지만 무대극이라 VIDEO로 등록하지 않았다.'
      WHEN 'GAME' THEN
        'jeu·game·played·festival·Tennis Court 조합을 조사했다. 실제 역사·축전·미술 활동 외 디지털 GAME 소비는 없다.'
      WHEN 'MUSIC' THEN
        'music·musique·Gossec·festival·Supreme Being 조합을 조사했다. 축전의 음악 사용 계획은 개인의 제목 있는 곡 감상·추천이 아니다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '자크루이 다비드 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '자크루이 다비드 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '자크루이 다비드 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '자크루이 다비드 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
