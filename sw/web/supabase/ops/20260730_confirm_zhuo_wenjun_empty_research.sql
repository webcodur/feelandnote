-- 탁문군 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 사마상여의 거문고 연주를 들었다는 기록은 있으나 곡명은 전하지 않아 작품 단위 등록을 보류한다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '8efc134b-f5be-47b1-a619-930603cad841'::uuid;
  target_run_id constant uuid := '4aea00d7-8b83-417b-b906-7e45231899f2'::uuid;
  rejected_book_finding_id constant uuid := '0934797e-623a-41e4-8998-eb5da6d8190c'::uuid;
  rejected_video_finding_id constant uuid := '619c7d5d-cc57-4fad-bf1c-1f83744f6204'::uuid;
  rejected_game_finding_id constant uuid := 'b71dd90b-03e8-4c68-b9a9-e5823ec07e9d'::uuid;
  rejected_music_finding_id constant uuid := 'afaa69cf-5c90-438c-95ab-eb80a0cfbf5e'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'zhuo-wenjun'
      AND p.nickname = '탁문군'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '탁문군 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '탁문군 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id,
    '2026-07-30-zhuo-wenjun-empty-v1', 'Codex',
    ARRAY['탁문군', '卓文君', 'Zhuo Wenjun', 'Cho Wen-chün', 'Wenjun'],
    '전한 임공의 탁문군을 동명 현대인, 후대 탁문군 소재 시·희곡·드라마·영화와 분리했다. 본인 작품으로 전해지는 「백두음」 등도 외부 콘텐츠 소비 후보에서 제외했다.',
    '『사기·사마상여열전』 원문과 고금 악보·문헌 전승을 대조해 BOOK·VIDEO·GAME·MUSIC을 조사했다. 『사기』는 새로 과부가 된 탁문군이 음악을 좋아했고 사마상여가 거문고로 마음을 떠보자 문틈에서 듣고 호감을 품었다고 분명히 기록한다. 그러나 그 연주의 곡명은 적지 않는다. 널리 알려진 「봉구황」 가사·곡명은 남조 『옥대신영』 등 훨씬 뒤 전승에서 사마상여에게 귀속되며 진위가 논쟁적이다. 직접 청취 사실을 무명 공연에서 특정 작품으로 과장하지 않고 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '「백두음」·「원랑시」 등 탁문군 귀속 문학 작품', '탁문군 귀속', NULL,
      '후대 문헌과 전승은 여러 시가를 탁문군의 작품으로 돌리며 그의 문학적 재능을 서술한다.',
      '자기 창작물은 외부 BOOK 소비가 아니며 일부 귀속 자체도 후대 전승으로 논쟁적이다. 문학적 소양만으로 탁문군이 읽은 특정 책을 추정하지 않았다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '사마상여의 거문고 연주와 후대 탁문군 극화', '사마상여', NULL,
      '『사기』는 탁문군이 문틈에서 사마상여의 거문고 연주를 들었다고 기록하며 후대 희곡·영상은 이 장면을 반복해 극화했다.',
      '원사료의 행위는 음악 청취이고 제목 있는 연극·영상 관람이 아니다. 후대 극화는 탁문군 사후 제작물이므로 본인의 VIDEO 소비작이 아니다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '사마상여와의 야반도주·주점 운영 및 후대 게임 캐릭터', NULL, NULL,
      '탁문군의 야반도주와 임공에서의 주점 운영은 전기에 기록된 실제 생애 사건이다.',
      '실제 선택과 생업은 디지털 GAME 플레이가 아니고, 후대 게임 속 탁문군 캐릭터는 본인의 소비작이 아니다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '사마상여가 탁문군에게 들려준 무명 거문고 연주와 후대 「봉구황」 귀속', '사마상여', NULL,
      '『사기』는 탁문군이 음악을 좋아했고 사마상여가 거문고를 타자 숨어서 듣고 마음이 움직였다고 직접 전한다.',
      '가장 이른 핵심 사료는 곡명을 제시하지 않는다. 「봉구황」 가사·곡명과 사마상여 귀속은 후대 문헌·악보 전승으로 진위가 논쟁적이어서 동일 작품이라고 단정할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '탁문군 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://ctext.org/shiji/si-ma-xiang-ru-lie-zhuan/zhs',
      'primary', 'archive', 'accessible',
      '《史記·司馬相如列傳》 — 中國哲學書電子化計劃',
      '탁문군의 음악 취향과 사마상여와의 만남은 전하지만 특정 독서 작품은 기록하지 않는다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://www.pgm.org.cn/pgm/xsyjou/201402/5891a66c23b448e0a1ab03a68f1e3c36.shtml',
      'secondary', 'article', 'accessible',
      '相如“琴挑”与文君夜奔 — 恭王府博物館',
      '거문고 청취 장면과 후대 극화 전승을 구별해 제목 있는 공연 관람으로 확대하지 않았다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://ctext.org/shiji/si-ma-xiang-ru-lie-zhuan/zhs',
      'primary', 'archive', 'accessible',
      '《史記·司馬相如列傳》 — 中國哲學書電子化計劃',
      '야반도주와 주점 운영을 실제 생애 사건으로 확인해 디지털 GAME과 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://ctext.org/shiji/si-ma-xiang-ru-lie-zhuan/zhs',
      'primary', 'archive', 'accessible',
      '《史記·司馬相如列傳》 — 中國哲學書電子化計劃',
      '好音·以琴心挑之·弄琴·文君竊從戶窺之 구절을 확인했다. 청취 사실은 분명하지만 곡명은 없다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://www.silkqin.com/02qnpu/13fxxp/fx27wjc.htm',
      'secondary', 'archive', 'accessible',
      'Wenjun Cao and Feng Qiu Huang — Silkqin',
      '후대 악보와 여러 「봉구황」 전승의 형성·차이를 대조해 『사기』의 무명 연주와 동일시하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '탁문군 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN '卓文君·Zhuo Wenjun과 read·book·poem·白頭吟 조합을 조사했다. 자기 창작 귀속과 문학적 소양 외에 특정 외부 서명 독서는 없다.'
        WHEN 'VIDEO' THEN 'watched·theatre·opera·performance·琴挑 조합을 조사했다. 거문고 청취와 후대 극화 외에 제목 있는 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·strategy·board game 조합을 조사했다. 생애 사건과 후대 게임 캐릭터는 본인의 디지털 GAME 소비가 아니다.'
        WHEN 'MUSIC' THEN 'music·song·heard·琴·鳳求凰 조합을 조사했다. 직접 청취는 확인했지만 『사기』에 곡명이 없고 「봉구황」 귀속은 후대·논쟁적이어서 작품 등록을 기각했다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '탁문군 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '탁문군 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '탁문군 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
