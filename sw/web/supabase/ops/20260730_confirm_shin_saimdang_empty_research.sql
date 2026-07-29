-- 신사임당 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK   학문·시문 교육 일반 — 특정 외부 서명·저자·독서 기록 없음
--   VIDEO  안견 화풍·후대 전기 영상 — 회화 전승 또는 사후 각색물
--   GAME   초충도 일화와 후대 놀이화 — 디지털 GAME 이용 기록 없음
--   MUSIC  곡명 불명의 거문고 소리 — 감흥은 전하나 작품·연주자 불명
--
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'a8f5d863-a5e3-422b-b11e-e50875c6dc9f'::uuid;
  target_run_id constant uuid := '730370b3-0de6-46c7-8a96-3e23946d138a'::uuid;
  rejected_book_finding_id constant uuid := '73be3787-1653-4404-bcb1-cde595ef746a'::uuid;
  rejected_video_finding_id constant uuid := '5b6f426c-a7d9-48d3-bead-666de6ec03cb'::uuid;
  rejected_game_finding_id constant uuid := '148e5fee-684f-429c-a727-729933445734'::uuid;
  rejected_music_finding_id constant uuid := 'f95c0f23-960d-4d74-8bf7-27f0ad5f4aa4'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'shin-saimdang'
      AND p.nickname = '신사임당'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '신사임당 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '신사임당에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      rejected_book_finding_id,
      rejected_video_finding_id,
      rejected_game_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '신사임당 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-shin-saimdang-full-v1',
    'Codex',
    ARRAY['신사임당', '申師任堂', '사임당 신씨', '師任堂申氏', 'Shin Saimdang', 'Sin Saimdang'],
    '조선 전기 화가·문인 신사임당(1504~1551)을 후대의 현모양처 상징, 자신의 시·서화, 동명의 현대 상표·캐릭터와 분리했다.',
    '한국어·한자·영문 이름과 read·book·안견·painting·performance·game·거문고 조합으로 이이의 「선비행장」을 인용한 국사편찬위원회 자료와 한국민족문화대백과사전을 대조했다. 학문·자녀 교육은 전하지만 읽은 특정 외부 서명은 없고, 안견은 화풍 사숙 수준이며 작품명이 특정되지 않는다. 거문고 소리를 듣고 눈물을 흘렸다는 일화도 곡명·창작자·연주자가 없다. 자신의 시·그림과 후대 영화·게임화는 제외해 네 유형 모두 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '학문·시문 교육 일반',
      NULL,
      NULL,
      '신사임당은 학문을 배운 가정환경에서 자랐고 시문에 능했으며 자녀에게 책 읽기와 사고를 권했다고 전한다.',
      '교육·교양 일반론일 뿐 본인이 읽은 특정 서명·저자·판본이 없다. 「유대관령망친정」 등은 자신의 작품이라 외부 감상작에서 제외한다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '안견 화풍과 후대 신사임당 전기 영상',
      '안견·후대 제작자',
      NULL,
      '후대 자료는 신사임당이 어려서 안견의 그림 또는 화풍을 사숙했다고 전하며, 현대에는 그의 생애가 영상으로 각색됐다.',
      '안견 관련 전승은 특정 작품명이 없는 회화 학습이고 VIDEO가 아니다. 현대 전기 영상은 신사임당 사후의 각색물이다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '초충도 일화와 후대 놀이화',
      NULL,
      NULL,
      '초충도를 실제 벌레로 착각한 닭이 그림을 쪼았다는 후대 일화와 현대 교육용 놀이가 반복된다.',
      '자신의 회화에 관한 일화와 후대 교육 도구는 신사임당이 플레이한 디지털 GAME 작품이 아니다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '곡명 불명의 거문고 소리',
      NULL,
      NULL,
      '전기 자료는 신사임당이 거문고 타는 소리를 듣고 감회가 일어나 눈물을 흘렸다고 전한다.',
      '실제 청취 일화지만 곡명·창작자·연주자·상황이 특정되지 않아 작품 단위 MUSIC으로 식별할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '신사임당 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_n306500',
      'secondary',
      'official_profile',
      'accessible',
      '신사임당 — 우리역사넷 한국사연대기',
      '이이의 「선비행장」을 중심으로 생애와 교육을 확인했으나 특정 외부 서명 독서 기록은 없다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://contents.history.go.kr/mobile/hm/view.do?levelId=hm_089_0020',
      'secondary',
      'article',
      'accessible',
      '여성들의 문예 활동 — 사료로 본 한국사',
      '안견 화풍 습득과 전칭 회화의 귀속 문제를 확인하고 영상 관람 기록과 분리했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0033037',
      'secondary',
      'official_profile',
      'accessible',
      '신사임당 — 한국민족문화대백과사전',
      '안견 사숙 전승은 특정 작품명 없는 회화 학습이며 생전 공연·영상 관람 기록은 제시되지 않는다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0033037',
      'secondary',
      'official_profile',
      'accessible',
      '신사임당 — 한국민족문화대백과사전',
      '초충도 관련 닭 일화는 회화의 생동감을 칭송하는 전승이며 GAME 이용 기록이 아니다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0033037',
      'secondary',
      'official_profile',
      'accessible',
      '신사임당 — 한국민족문화대백과사전',
      '거문고 소리를 듣고 눈물을 흘렸다는 일화를 확인했으나 곡명·창작자·연주자는 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '신사임당 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '신사임당·申師任堂·Shin Saimdang와 read·book·학문·시문·교육 조합을 검색했다. 학문과 자녀 교육은 전하지만 본인이 읽은 특정 서명은 없다.'
      WHEN 'VIDEO' THEN
        'watched·performance·painting·안견·전기 영상 조합을 검색했다. 안견은 작품명 없는 회화 사숙이고 현대 영상은 사후 각색물이다.'
      WHEN 'GAME' THEN
        'game·played·놀이·초충도 조합을 검색했다. 자신의 그림 일화와 후대 교육용 놀이뿐이며 작품 단위 디지털 GAME 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·거문고·heard 조합을 검색했다. 거문고 소리에 감흥을 느낀 일화는 있으나 곡명·창작자·연주자가 없어 식별 가능한 작품이 아니다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '신사임당 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '신사임당 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '신사임당 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 5
  ) THEN
    RAISE EXCEPTION '신사임당 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
