-- 신윤복 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK   김홍도와 선행 풍속화 전통 — 동시대 비교·영향 추정일 뿐 특정 작품 감상 기록 없음
--   VIDEO  쌍검대무·무녀신무의 공연 장면 — 그림의 소재이지 본인의 특정 공연 관람 기록 아님
--   GAME   연소답청 등 풍류·놀이 장면 — 생활 풍속이며 디지털 GAME 작품 아님
--   MUSIC  청금상련·청루소일의 악기 연주 장면 — 곡명·창작자·본인 청취가 특정되지 않음
--
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '029b6195-94ad-4443-814c-fd35949315ec'::uuid;
  target_run_id constant uuid := 'f6a77610-d8b9-47da-8e32-e8101a638a38'::uuid;
  rejected_book_finding_id constant uuid := '58a21fab-baab-4c2a-8fbb-6be3f9824682'::uuid;
  rejected_video_finding_id constant uuid := '98c84bba-1518-495a-9bdd-86df22914773'::uuid;
  rejected_game_finding_id constant uuid := 'eaf39455-39e7-45d8-beb2-4b597a765808'::uuid;
  rejected_music_finding_id constant uuid := '13b9d977-bd2a-4c59-a13b-1110557e61da'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'shin-yun-bok'
      AND p.nickname = '신윤복'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '신윤복 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '신윤복에게 이미 연결된 콘텐츠가 있습니다.';
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
    RAISE EXCEPTION '신윤복 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-shin-yun-bok-full-v1',
    'Codex',
    ARRAY['신윤복', '申潤福', '혜원', '蕙園', 'Shin Yun-bok', 'Sin Yun-bok'],
    '조선 후기 화원 신윤복을 동명의 현대 인물과 분리하고, 그의 작품 제목·그림 속 등장인물의 풍류를 화가 본인의 감상 행위와 구별했다.',
    '한국어·한자·영문 이름과 독서·감상·공연·춤·놀이·음악·거문고·생황 조합으로 국가유산·국립중앙박물관·한국민족문화대백과사전 자료를 대조했다. 남은 기록은 희소하며, 확인되는 자료는 대부분 본인이 그린 작품과 그 안의 풍속 묘사다. 김홍도·선행 회화 전통은 비교 또는 영향 추정이고, 쌍검대무·무녀신무·청금상련·청루소일·연소답청은 그림 속 장면일 뿐 신윤복이 특정 외부 작품을 관람·청취·플레이했다는 기록이 아니다. 네 유형 모두 0건으로 완료했다.'
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
      '김홍도와 선행 풍속화 전통',
      '김홍도 등',
      NULL,
      '국립중앙박물관은 신윤복을 김홍도와 함께 조선 후기 풍속화의 대표 화가로 설명하고, 아버지 신한평의 영향 가능성을 언급한다.',
      '동시대 화가와의 미술사적 비교 및 영향 추정일 뿐, 신윤복이 읽거나 감상했다고 진술된 특정 제목의 외부 작품이 아니다. 자신의 화첩은 자작물이라 제외한다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '쌍검대무·무녀신무의 공연 장면',
      NULL,
      NULL,
      '『혜원전신첩』의 「쌍검대무」와 「무녀신무」에는 춤과 악기 연주 장면이 그려져 있다.',
      '그림의 도상과 소재는 화가가 특정 제목·창작자의 무대 작품을 직접 관람했다는 증거가 아니다. 공연명처럼 보이는 표제도 그림 제목이며 외부 VIDEO 작품 식별자가 아니다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '연소답청 등 풍류·놀이 장면',
      NULL,
      NULL,
      '『혜원전신첩』에는 꽃놀이와 한량·기녀의 풍류 같은 조선 후기 생활 장면이 묘사된다.',
      '사교·나들이·생활 풍속은 디지털 GAME 작품이 아니며, 신윤복이 플레이한 작품 제목이나 제작자 기록도 없다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '청금상련·청루소일의 악기 연주 장면',
      NULL,
      NULL,
      '「청금상련」에는 거문고를 즐기는 인물들이, 「청루소일」에는 생황을 든 기녀가 묘사된다.',
      '그림 속 악기와 연주 장면만으로 신윤복 본인의 청취를 확정할 수 없고 곡명·창작자도 특정되지 않는다. 현대의 복원 선곡은 사후 재구성이라 제외한다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '신윤복 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.museum.go.kr/MUSEUM/contents/M0501000000.do?relicRecommendId=16905&schM=view',
      'secondary',
      'official_profile',
      'accessible',
      '국립중앙박물관 큐레이터 추천 소장품 — 조선 후기의 풍속화',
      '신윤복의 남은 작품이 희소하고 김홍도와 쌍벽으로 평가된다는 미술사적 설명을 확인했으나 특정 감상작은 제시되지 않는다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0063625',
      'secondary',
      'article',
      'accessible',
      '신윤복필풍속도화첩 — 한국민족문화대백과사전',
      '「쌍검대무」와 「무녀신무」의 춤·악기 장면이 화첩 내용 설명임을 확인했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://www.museum.go.kr/dryplate/searchplate_view.do?relicnum=010764',
      'secondary',
      'archive',
      'accessible',
      '조선회화 신윤복필 풍속도첩 쌍검대무 — 국립중앙박물관',
      '「쌍검대무」가 신윤복의 풍속도첩에 속한 그림 제목임을 확인해 외부 공연 작품과 분리했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0063625',
      'secondary',
      'article',
      'accessible',
      '신윤복필풍속도화첩 — 한국민족문화대백과사전',
      '「연소답청」 등 나들이·풍류 장면을 확인했으나 작품 단위 GAME 이용 기록은 없다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0063625',
      'secondary',
      'article',
      'accessible',
      '신윤복필풍속도화첩 — 한국민족문화대백과사전',
      '「청금상련」·「무녀신무」 등에 그려진 악기와 연주 장면을 확인했으나 특정 곡과 본인 청취는 확인되지 않는다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.museum.go.kr/MUSEUM/contents/M0501000000.do?relicRecommendId=16905&schM=view',
      'secondary',
      'official_profile',
      'accessible',
      '국립중앙박물관 큐레이터 추천 소장품 — 조선 후기의 풍속화',
      '「청루소일」의 생황을 든 기녀가 기방 풍속 묘사임을 확인했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '신윤복 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '신윤복·申潤福·혜원·Shin Yun-bok와 book·read·painting·influence 조합을 검색했다. 김홍도·신한평·선행 풍속화는 비교·영향 추정뿐이고 특정 외부 작품 감상 기록은 없다.'
      WHEN 'VIDEO' THEN
        'watched·performance·dance·쌍검대무·무녀신무 조합을 검색했다. 춤 장면은 자신의 그림 소재이며 화가가 관람한 특정 무대 작품은 확인되지 않는다.'
      WHEN 'GAME' THEN
        'game·played·놀이·연소답청·풍류 조합을 검색했다. 꽃놀이·사교 장면은 생활 풍속이고 디지털 GAME 작품 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·거문고·생황·청금상련·청루소일 조합을 검색했다. 그림 속 악기만 확인되며 곡명·창작자·신윤복 본인의 청취가 특정되지 않는다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '신윤복 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '신윤복 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '신윤복 프로필·0건 확정 최종 검증에 실패했습니다.';
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
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '신윤복 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
