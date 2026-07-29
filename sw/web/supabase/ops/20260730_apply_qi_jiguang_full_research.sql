-- 척계광 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택: 『손자병법』 — 『기효신서』 자서에서 “내가 손무의 책을 읽었다”고 직접 밝힘.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'c5030830-8cda-4585-8608-72b0d469d872'::uuid;
  target_content_id constant text := '0925e1cc-92c1-4b74-b691-f125bde6ccde';
  target_run_id constant uuid := 'db766d43-86a2-49df-be8f-077e1906a568'::uuid;
  target_uc_id constant uuid := '70fdd06c-a2dc-4abd-9bbe-502d583276d8'::uuid;
  book_finding_id constant uuid := '202d71f6-0c62-44a5-9502-263e74a79ae7'::uuid;
  video_finding_id constant uuid := 'd1835d64-4a7d-4517-beab-eb83683ddf33'::uuid;
  game_finding_id constant uuid := '2c2526fb-e9b7-4afa-a381-5391352d6d0d'::uuid;
  music_finding_id constant uuid := 'f0da9205-b431-461e-8cc1-9184e53c5d09'::uuid;
  expected_user_count integer;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'qi-jiguang'
      AND p.nickname = '척계광'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '척계광 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = target_uc_id
  ) THEN
    RAISE EXCEPTION '척계광 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  SELECT count(*)::integer + 1
  INTO expected_user_count
  FROM public.user_contents uc
  WHERE uc.content_id = target_content_id;

  IF expected_user_count <> 29 OR NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = target_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9791139728002'
      AND ko.title = '손자병법'
      AND ko.creator = '손무'
      AND ko.verified = true
      AND en.title = 'The Art of War'
      AND en.creator = 'Sun Tzu'
      AND en.verified = true
  ) THEN
    RAISE EXCEPTION '손자병법 기존 콘텐츠 기준선이 달라졌습니다. 예상 user_count=%',
      expected_user_count;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    target_uc_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    $ko$척계광은 『기효신서』 자서에서 “내가 일찍이 손무의 책을 읽고 감탄했다”고 직접 쓴다. 그는 『손자병법』을 무기고와 약방에 비유하며 그 강령이 더없이 정밀하다고 평가한 뒤, 실전의 세부 절차가 부족하다고 비판하고 자신의 훈련서를 쓴 이유를 설명한다. 단순 인용이 아니라 읽기·찬탄·비판·실전 적용이 한 문단에 이어지는 확실한 독서 기록이다.$ko$,
    $en$In the preface to the Jixiao Xinshu, Qi Jiguang writes, “I once read Master Sun's book,” compares it to an arsenal and an apothecary, praises the precision of its principles, and then criticizes its lack of detailed practical procedures. He uses that judgment to explain why he compiled his own training manual. Reading, evaluation, criticism, and application are all explicit.$en$,
    'https://www.shidianguji.com/book/NA05877/chapter/1kcu4ivq0jvvp',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '척계광 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '손자병법 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-qi-jiguang-full-v1',
    'Codex',
    ARRAY['척계광', '戚繼光', '戚继光', 'Qi Jiguang', 'Ch''i Chi-kuang', 'Qī Jìguāng'],
    '명나라 장군 척계광(1528~1588)을 동명 현대인, 그의 저서 『기효신서』·『연병실기』 자체, 후대 영화·게임 캐릭터에서 분리했다.',
    $s$중국어 번체·간체·영문 이름과 读·書·孙武·孙子兵法·music·game 조합 및 『기효신서』 원문을 조사했다. 자서의 “愚尝读孙武书” 문장 뒤에 찬탄·비판·실전 적용이 이어져 『손자병법』 BOOK 1건을 채택했다. 이어지는 “诸将传”은 특정 서명이 아니므로 별도 책으로 만들지 않았다. 자신이 지은 군가·시와 훈련 구호는 타인의 MUSIC 감상이 아니고, 무술·진법·훈련은 디지털 GAME이 아니며, 후대 척계광 소재 영상은 본인의 VIDEO 감상이 아니다.$s$
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'accepted',
      '손자병법', '손무', target_content_id,
      '『기효신서』 자서에서 “내가 일찍이 손무의 책을 읽었다”고 직접 밝히고 원리의 정밀함과 실전 절차의 한계를 함께 평가한다.',
      NULL
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '척계광 소재 후대 영화·드라마·다큐멘터리 일반', NULL, NULL,
      '후대 영상물은 다수 존재하지만 척계광 생전의 영상 소비 기록과는 무관하다.',
      '16세기 인물의 후대 전기 영상은 본인이 감상한 VIDEO가 아니다. 연극·전투 재현도 개인 영상 소비로 소급하지 않았다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '원앙진·무술·사격·군사 훈련 일반', NULL, NULL,
      '『기효신서』에는 진법·무기·권법·사격 훈련이 상세히 실린다.',
      '실제 군사 훈련과 무예는 디지털 GAME 작품이 아니며 척계광이 전자게임을 플레이했다는 기록도 성립하지 않는다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '개선가와 군가·훈련 구호 일반', '척계광 또는 명대 군중', NULL,
      '척계광에게 귀속되는 「개선가」와 군중이 부른 훈련 노래·구호가 전하지만 그의 창작·지휘 자료다.',
      '본인 창작 또는 군사 지휘용 구호는 타인의 음악을 감상·추천한 기록이 아니다. 후대 편곡 음원을 개인 청취작으로 소급하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '척계광 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.shidianguji.com/book/NA05877/chapter/1kcu4ivq0jvvp',
      'primary', 'archive', 'accessible',
      '纪效新书自叙 — 识典古籍',
      '“愚尝读孙武书”와 무기고·약방 비유, 원리의 정밀함과 실전 세목의 부족을 논한 원문을 확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://ctext.org/library.pl?if=en&remap=gb&res=5535',
      'primary', 'archive', 'accessible',
      '《欽定四庫全書》本《紀效新書》 — Chinese Text Project',
      '절강대 도서관 소장 사고전서본 스캔의 저자·권차·원전 계보를 대조했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.nopss.gov.cn/n1/2022/0228/c219544-32360983.html',
      'secondary', 'article', 'accessible',
      '戚继光时代的军事革新与“兵”“儒”之分 — 全国哲学社会科学工作办公室',
      '국가사회과학기금 연구 성과가 척계광을 『손자병법』 등 전통 병서를 연구하고 실전에 결합한 인물로 설명한다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://search.shopping.naver.com/book/catalog/56926813298',
      'secondary', 'official_profile', 'accessible',
      '손자병법 — 네이버 도서',
      '서비스에 이미 등록된 ISBN 9791139728002 한국어 판본을 재사용했다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://ctext.org/wiki.pl?if=en&res=3',
      'primary', 'archive', 'accessible',
      'Ji Xiao Xinshu — Chinese Text Project',
      '생전 원전은 군사 조직·훈련·전술을 다루며 후대 영상 소비 증거가 아니다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://ctext.org/wiki.pl?chapter=20&if=en&remap=gb',
      'primary', 'archive', 'accessible',
      '紀效新書 卷十四 拳經捷要篇 — Chinese Text Project',
      '권법과 훈련은 실제 무예이며 디지털 GAME과 구분했다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://www.shidianguji.com/book/NA05877/chapter/1kcu4ivq0jvvp',
      'primary', 'archive', 'accessible',
      '纪效新书自叙 — 识典古籍',
      '자신의 훈련 체계·명령·실전서를 설명하는 맥락을 확인하고 창작 군가를 타인의 음악 감상으로 바꾸지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '척계광 source 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '戚继光·戚繼光·Qi Jiguang·读·read·孙武·孙子兵法 조합과 『기효신서』 자서를 조사했다. 직접 독서·평가·비판·적용이 이어지는 『손자병법』을 채택했다.'
      WHEN 'VIDEO' THEN
        'watched·film·drama·documentary·影視 조합을 조사했다. 후대 척계광 소재 영상만 확인되며 본인의 감상작은 아니다.'
      WHEN 'GAME' THEN
        'game·played·chess·training·martial arts·阵法 조합을 조사했다. 실전 군사 훈련·무예를 디지털 GAME으로 등록하지 않았다.'
      WHEN 'MUSIC' THEN
        'music·song·heard·凯歌·军歌 조합을 조사했다. 개선가와 훈련 구호는 본인 창작·지휘 자료이지 타인의 음악 감상·추천이 아니다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '척계광 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '척계광 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '척계광 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '척계광 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
