-- 페리클레스 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   VIDEO 아이스킬로스의 《페르시아인들》 — 코레고스(합창단 훈련·비용 부담) 제작 역할
--   MUSIC 다몬·피토클레이데스의 음악 교육 — 특정 작품명이 없는 교육 이력

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '7a07bede-805e-4a57-a434-776bf7274b33'::uuid;
  target_run_id constant uuid := '5ee7f51b-b86f-4f0b-93d5-69a7542389f9'::uuid;
  rejected_persians_id constant uuid := '8b329a2b-42c8-4294-841f-bcc62cc2b3ac'::uuid;
  rejected_music_training_id constant uuid := 'ec5f24e9-3fee-4ba2-a90d-03866e351cc3'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'pericles'
      AND p.nickname = '페리클레스'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '페리클레스 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '페리클레스에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_persians_id, rejected_music_training_id)
  ) THEN
    RAISE EXCEPTION '페리클레스 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-pericles-full-v1',
    'Codex',
    ARRAY['페리클레스', 'Pericles', 'Perikles', 'Περικλῆς'],
    '셰익스피어 희곡 《Pericles, Prince of Tyre》의 주인공과 동명 현대 작품·게임을 고대 아테네 정치가 페리클레스와 분리했다. 후대 전기·연극·영화도 사후 제작물이므로 제외했다.',
    '한국어·영어·그리스어 이름 변형으로 네 유형을 각각 검색하고 플루타르코스 원전, 고전학 사전과 현대 연구를 대조했다. 아이스킬로스의 《페르시아인들》에는 기원전 472년 코레고스로서 합창단을 훈련·후원한 제작 관계가 있으나 개인 감상 기록은 아니다. 다몬 또는 피토클레이데스에게 음악을 배웠다는 전승은 남지만 곡명·연주·선호가 특정되지 않는다. 아낙사고라스·제논에게 배운 철학도 특정 저작 독서로 전환할 수 없고, 특정 디지털 게임 기록도 없어 네 유형 모두 채택 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_persians_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '페르시아인들',
      '아이스킬로스',
      NULL,
      '현대 고전학 사전은 페리클레스의 최초 확실한 공적 등장을 기원전 472년 아이스킬로스 《페르시아인들》의 코레고스, 곧 합창단 훈련·비용 부담자로 기록한다.',
      '작품 제작·후원 역할은 외부 작품을 선택해 감상했다는 기록과 다르다. 극장에 실제 관객으로 앉아 관람했다는 별도 근거도 없어 VIDEO 감상작으로 등록하지 않는다.'
    ),
    (
      rejected_music_training_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '다몬·피토클레이데스에게 받은 음악 교육',
      '다몬 또는 피토클레이데스',
      NULL,
      '플루타르코스는 대다수 전승이 다몬을 페리클레스의 음악 교사로, 아리스토텔레스 전승은 피토클레이데스를 철저한 음악 교육의 교사로 든다고 기록한다.',
      '교사와 교육 관계만 확인될 뿐 곡명·작곡가·연주나 페리클레스의 선호 작품이 특정되지 않는다. 사람·교육과정을 MUSIC 작품으로 만들 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '페리클레스 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      NULL,
      'https://lexundria.com/plut_per/4/prr',
      'primary',
      'archive',
      'accessible',
      'Plutarch, Life of Pericles 4',
      '제논·아낙사고라스와의 사제·교유 관계는 확인되지만 페리클레스가 읽은 특정 저작명은 제시하지 않는다.'
    ),
    (
      target_run_id,
      'BOOK',
      NULL,
      'https://plato.stanford.edu/archives/spr2024/entries/anaxagoras/index.html',
      'secondary',
      'article',
      'accessible',
      'Anaxagoras, Stanford Encyclopedia of Philosophy',
      '아낙사고라스와 페리클레스의 친교, 현존 단편의 성격을 대조했으나 개인 독서 증거는 확인되지 않았다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_persians_id,
      'https://www.iranicaonline.org/articles/pericles/',
      'secondary',
      'article',
      'accessible',
      'Pericles, Encyclopaedia Iranica',
      '기원전 472년 《페르시아인들》의 코레고스를 합창단 trainer and paymaster로 명시한다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_persians_id,
      'https://classics.mit.edu/Aeschylus/persians.html',
      'primary',
      'archive',
      'accessible',
      'Aeschylus, The Persians',
      '작품·작가 정체를 동명 후대 작품과 분리해 대조했다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://www.cambridge.org/core/books/abs/pericles/pericles-innovative-education-for-leadership-in-athenian-democracy/B4CA6D5BA598D2987BA9588CBFE70131',
      'secondary',
      'article',
      'accessible',
      'Pericles’ Innovative Education for Leadership in Athenian Democracy',
      '교육·정치 생애 자료를 game·played·board game 조합과 대조했으나 작품 단위 디지털 GAME 플레이 기록은 없었다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_training_id,
      'https://academic.oup.com/book/8111',
      'secondary',
      'article',
      'accessible',
      'Reconstructing Damon: Music, Wisdom Teaching, and Politics in Perikles’ Athens',
      '다몬이 페리클레스의 음악 교사·정치 조언자였다는 전승을 대조했지만 특정 감상곡은 제시되지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '페리클레스 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '페리클레스·Pericles·Perikles와 read·book·scroll·Anaxagoras·Zeno 조합을 검색했다. 철학자와의 사제·교유 관계는 확인되지만 읽은 특정 저작명과 독서 행위는 확인되지 않았다.'
      WHEN 'VIDEO' THEN
        'watched·play·theatre·tragedy·Aeschylus·Persians·choregos 조합을 검색했다. 《페르시아인들》은 코레고스로 훈련·비용을 댄 제작 관계이며 관객으로 감상한 기록은 아니다.'
      WHEN 'GAME' THEN
        'game·played·board game·dice 조합을 생애·교육 연구와 대조했다. 고대 놀이 일반론 외에 특정 디지털 GAME 작품의 플레이 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·lyre·Damon·Pythocleides 조합을 검색했다. 음악 교사와 철저한 교육 전승은 남지만 제목 있는 곡·연주·선호 작품은 확인되지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '페리클레스 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '페리클레스 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '페리클레스 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f WHERE f.run_id = r.id AND f.decision = 'rejected') = 2
      AND (SELECT count(*) FROM public.celeb_content_research_sources src WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '페리클레스 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
