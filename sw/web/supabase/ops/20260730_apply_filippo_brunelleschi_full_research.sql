-- 필리포 브루넬레스키의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과와 콘텐츠 1건을 반영한다.
-- 채택: 초기 전기 자료의 단테 작품 연구 증언과 우피치의 『신곡』 사후세계 도해 전통 설명을 교차 검증했다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '28342761-48d1-435f-9674-42724e544acd'::uuid;
  target_content_id constant text := '70d75785-5f1e-45fb-99ef-f936e6fd8298';
  target_run_id constant uuid := '8c5ad14c-900f-4baa-a921-6d501b935c56'::uuid;
  target_uc_id constant uuid := '64030ace-14f9-4070-92ae-0422064aaac7'::uuid;
  book_finding_id constant uuid := '4f73c4bc-37c2-445b-9c03-7203f12ced0a'::uuid;
  video_finding_id constant uuid := '63d9f8ae-89ad-456a-b663-530c38b15f8d'::uuid;
  game_finding_id constant uuid := '3f47f55a-ac54-4a63-8fd0-f303d89d7109'::uuid;
  music_finding_id constant uuid := '2d4e8122-c935-40d9-aaff-4845e3198b46'::uuid;
  expected_user_count integer;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'filippo-brunelleschi'
      AND p.nickname = '필리포 브루넬레스키'
      AND p.nickname_en = 'Filippo Brunelleschi'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '필리포 브루넬레스키 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = target_uc_id
  ) THEN
    RAISE EXCEPTION '필리포 브루넬레스키 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  SELECT count(*)::integer + 1
  INTO expected_user_count
  FROM public.user_contents uc
  WHERE uc.content_id = target_content_id;

  IF expected_user_count <> 34 OR NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = target_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788932921006'
      AND ko.title = '신곡'
      AND ko.creator = '단테 알리기에리'
      AND ko.verified = true
      AND en.title = 'The Divine Comedy'
      AND en.creator = 'Dante Alighieri'
      AND en.verified = true
  ) THEN
    RAISE EXCEPTION '신곡 기존 콘텐츠 기준선이 달라졌습니다. 예상 user_count=%',
      expected_user_count;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    target_uc_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    '브루넬레스키는 단테의 작품을 깊이 연구한 인물로 초기 전기에 기록되어 있다. 우피치 미술관은 그가 단테가 묘사한 사후세계의 크기와 구조를 측정하고 재현한 르네상스 전통의 출발점이었다고 설명한다. 이는 『신곡』을 단순히 알았다는 수준을 넘어 텍스트의 공간을 기하학적으로 해석한 독서의 흔적이다.',
    'An early biographical source describes Brunelleschi as a serious student of Dante. The Uffizi further identifies him as the starting point of the Renaissance tradition of measuring and representing Dante''s afterlife, evidence of sustained engagement with the Divine Comedy rather than mere familiarity with its reputation.',
    'https://www.uffizi.it/en/online-exhibitions/dante',
    true
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '필리포 브루넬레스키 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '신곡 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-filippo-brunelleschi-full-v1',
    'Codex',
    ARRAY['필리포 브루넬레스키', '브루넬레스키', 'Filippo Brunelleschi', 'Pippo di ser Brunellesco'],
    '피렌체 르네상스 건축가 필리포 브루넬레스키(1377~1446)를 동명이인, 후대 작품 속 등장인물, 본인의 건축·조각 작품과 분리했다.',
    '초기 전기 자료의 단테 작품 연구 증언과 우피치의 단테 사후세계 측정·재현 설명을 교차해 『신곡』 1건을 채택했다. 성경 공부 전승은 특정 판본·개별 작품을 확정하지 못해 별도 콘텐츠로 연결하지 않았다. 본인이 설계한 기계와 원근법 실험, 건축물, 후대 다큐멘터리와 전기는 소비 콘텐츠에서 제외했다. 제목이 특정된 영상·게임·음악의 직접 감상 기록은 확인하지 못했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'accepted',
      '신곡', '단테 알리기에리', target_content_id,
      '초기 전기 자료는 브루넬레스키가 단테의 작품을 연구하고 잘 이해했다고 전하며, 우피치 미술관은 단테가 묘사한 사후세계를 측정하고 재현한 르네상스 전통이 브루넬레스키에게서 시작했다고 설명한다.',
      NULL
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '브루넬레스키 소재 다큐멘터리·영상 일반', NULL, NULL,
      '브루넬레스키의 돔과 원근법을 다룬 후대 영상은 다수 존재하지만 모두 사후 제작물이다.',
      '브루넬레스키가 직접 보거나 추천한 제목 있는 공연·영상 기록이 아니므로 개인 감상 콘텐츠로 등록하지 않는다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '원근법 실험·기계 장치·건축 모형 일반', NULL, NULL,
      '전기 자료에 원근법 실험과 기계 장치, 장난 일화가 있으나 현대적 GAME 작품이 아니다.',
      '제목과 저작자가 특정되는 게임 소비 기록이 없으며 자신의 기술 실험을 게임으로 오분류하지 않는다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '15세기 피렌체 종교음악·세속음악 일반', NULL, NULL,
      '브루넬레스키가 활동한 피렌체의 음악 문화는 확인되지만 개인이 특정 곡이나 작품을 들었다는 1차 진술은 찾지 못했다.',
      '동시대 문화 환경만으로 개인의 음악 감상을 추정하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '필리포 브루넬레스키 finding 생성 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://dokumen.pub/filippo-brunelleschi-8843527894-9788843527892.html',
      'primary', 'archive', 'accessible',
      'Filippo Brunelleschi — Eugenio Battisti',
      'Codex Petrei의 초기 전기 문구 “Era studioso delle opere di Dante e benissimo le intendeva”를 인용한 학술 전사본이다. 브루넬레스키가 단테의 작품을 연구하고 잘 이해했다는 직접 증언을 확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.uffizi.it/en/online-exhibitions/dante',
      'secondary', 'official_profile', 'accessible',
      'Dante and the Renaissance — Uffizi Galleries',
      '단테의 사후세계를 측정·재현한 르네상스 전통이 브루넬레스키에서 시작해 갈릴레오로 이어졌다는 미술관 설명으로 대상 작품을 『신곡』으로 교차 식별했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.newadvent.org/cathen/03008c.htm',
      'secondary', 'official_profile', 'accessible',
      'Filippo Brunelleschi — Catholic Encyclopedia',
      '브루넬레스키가 성경과 단테를 읽었다는 전기적 요약을 보조 근거로 확인했다. 성경은 개별 작품·판본 연결에는 사용하지 않았다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://www.uffizi.it/en/online-exhibitions/dante',
      'secondary', 'official_profile', 'accessible',
      'Dante and the Renaissance — Uffizi Galleries',
      '시각화·도해 활동은 설명하지만 브루넬레스키의 제목 있는 공연·영상 감상 기록은 제시하지 않는다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://www.britannica.com/biography/Filippo-Brunelleschi',
      'secondary', 'official_profile', 'accessible',
      'Filippo Brunelleschi — Encyclopaedia Britannica',
      '건축·조각·원근법 활동 범위를 확인하고 자신의 실험과 후대 게임화를 소비 기록에서 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://www.britannica.com/biography/Filippo-Brunelleschi',
      'secondary', 'official_profile', 'accessible',
      'Filippo Brunelleschi — Encyclopaedia Britannica',
      '생애와 활동 범위에는 제목 있는 음악 작품을 직접 감상했다는 기록이 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '필리포 브루넬레스키 source 생성 행 수가 6개가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Filippo Brunelleschi·Brunellesco·Dante·Divina Commedia·Bible 조합으로 초기 전기, 미술관, 백과를 조사했다. 단테 작품 연구 증언과 『신곡』 사후세계 측정 전통을 교차해 1건을 채택했다.'
      WHEN 'VIDEO' THEN
        'documentary·film·theatre·spectacle 조합을 조사했다. 후대 재현물은 있으나 본인의 제목 있는 공연·영상 감상 기록은 확인되지 않았다.'
      WHEN 'GAME' THEN
        'game·play·chess·perspective experiment·machine 조합을 조사했다. 원근법 실험과 기계 장치는 작품 단위 게임 소비가 아니다.'
      WHEN 'MUSIC' THEN
        'music·song·motet·Florence·listened 조합을 조사했다. 동시대 음악 문화만 있고 개인의 제목 있는 감상 증거는 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '필리포 브루넬레스키 scope 완료 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '필리포 브루넬레스키 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '필리포 브루넬레스키 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '필리포 브루넬레스키 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
