-- 히포크라테스 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  히포크라테스 전집 — 본인·학파 귀속 저술이며 개별 저자도 불확실
--   BOOK  피타고라스 자연론 영향 — 사상적 유사성일 뿐 특정 저작 독서 기록이 없음
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '661a6679-447f-43cf-bcc9-1b2b474921f0'::uuid;
  target_run_id constant uuid := '0d89ee3b-bad7-4e4f-a69b-2f68fad68a3d'::uuid;
  rejected_corpus_finding_id constant uuid := 'a346d918-e69c-4c6c-8087-2e56f0d2917d'::uuid;
  rejected_influence_finding_id constant uuid := 'effcc3ea-a6f0-4b11-a7b0-ca88808dbec3'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'hippocrates'
      AND p.nickname = '히포크라테스'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '히포크라테스 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '히포크라테스에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_corpus_finding_id, rejected_influence_finding_id)
  ) THEN
    RAISE EXCEPTION '히포크라테스 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-hippocrates-full-v1',
    'Codex',
    ARRAY['히포크라테스', 'Hippocrates', 'Hippocrates of Kos', 'Ἱπποκράτης', 'Hippocrate'],
    '코스의 의사 히포크라테스 2세(기원전 약 460~370)를 같은 가문의 히포크라테스 1·3·4세, 후대의 “영국의 히포크라테스” 같은 별칭 인물과 분리했다. 《히포크라테스 전집》과 선서·의학 논문은 본인 또는 학파 귀속 창작물이므로 외부 소비 콘텐츠에서 제외했다.',
    '그리스어·영어·한국어 이름 변형으로 네 유형을 조사하고 플라톤의 동시대 언급, NLM·PMC 의학사 연구와 고대 전기 전승을 대조했다. 동시대 자료는 의사·교사라는 사실만 전하고 첫 상세 전기는 약 6세기 뒤 소라노스에게서 나온다. 전집은 여러 저자의 학파 문헌이며 피타고라스 자연론과의 유사성도 특정 저작 독서를 입증하지 않는다. 영상·디지털 게임·제목 있는 음악 소비 기록도 없어 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_corpus_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '히포크라테스 전집',
      '히포크라테스 학파의 여러 저자',
      NULL,
      '현대 의학사 연구는 약 60~70편의 고대 의학 문헌이 후대에 Corpus Hippocraticum으로 편집됐고 개별 저자 귀속이 계속 논쟁적이라고 설명한다.',
      '히포크라테스 본인 또는 학파의 창작물이며 외부 독서 콘텐츠가 아니다. 개별 글이 실제 역사적 히포크라테스의 저작인지조차 확정할 수 없다.'
    ),
    (
      rejected_influence_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '피타고라스 자연론',
      NULL,
      NULL,
      '일부 현대 연구는 체액론을 피타고라스 계열의 자연관이 확장된 것으로 설명한다.',
      '사상적 계보·유사성이지 히포크라테스가 읽은 특정 피타고라스 저작의 제목·저자·판본을 전하는 기록이 아니다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '히포크라테스 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_corpus_finding_id,
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC3704070/',
      'secondary',
      'article',
      'accessible',
      'Hippocrates: timeless still',
      '역사적 생애 자료의 희소성과 전집 저자 귀속 논쟁을 확인해 자기·학파 저술로 분리했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_influence_finding_id,
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC4154333/',
      'secondary',
      'article',
      'accessible',
      'Aristotle, godfather of evidence-based medicine',
      '체액론과 피타고라스 자연관의 계보 설명이 특정 저작 독서 증거는 아님을 대조했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://www.worldhistory.org/Hippocrates/',
      'secondary',
      'official_profile',
      'accessible',
      'Hippocrates — World History Encyclopedia',
      '불완전하고 신뢰하기 어려운 생애 자료를 watched·theatre·performance 조합으로 검색했으나 특정 관람 작품은 없다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC3704070/',
      'secondary',
      'article',
      'accessible',
      'Hippocrates: timeless still',
      '교육·진료·운동 처방 기록을 game·played·dice·board 조합과 대조했으나 작품 단위 디지털 GAME 이용 기록은 없다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://www.ncbi.nlm.nih.gov/books/NBK621342/',
      'secondary',
      'archive',
      'accessible',
      'A Literary History of Medicine — Hippocratic traditions',
      '후대 그리스·아랍 전기 전승과 저술 목록을 music·song·lyre 조합으로 대조했으나 제목 있는 음악 소비 기록은 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '히포크라테스 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Hippocrates·Ἱπποκράτης와 read·book·teacher·Pythagoras·Corpus 조합을 검색했다. 확인되는 제목은 본인·학파 저술이고 사상적 영향은 특정 독서가 아니다.'
      WHEN 'VIDEO' THEN
        'watched·theatre·performance·spectacle 조합을 동시대 언급과 후대 전기에서 대조했다. 후대 다큐멘터리·드라마 외 생전 관람 작품은 없다.'
      WHEN 'GAME' THEN
        'game·played·dice·board·exercise 조합을 검색했다. 의학적 운동 처방은 작품 단위 디지털 GAME이 아니며 특정 게임 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·lyre·therapy 조합을 의학사·전기 자료에서 검색했다. 후대의 음악 치료 일반론과 달리 히포크라테스 개인이 소비한 특정 곡은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '히포크라테스 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '히포크라테스 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '히포크라테스 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 2
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 5
  ) THEN
    RAISE EXCEPTION '히포크라테스 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
