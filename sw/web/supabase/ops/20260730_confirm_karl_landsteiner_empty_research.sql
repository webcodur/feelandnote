-- 카를 란트슈타이너 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  탐정소설 — 장르 선호만 확인되고 작품명·작가가 없음
--   MUSIC 베토벤 피아노 작품 — 연주자·해석자였다는 기록만 있고 곡명이 없음
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'bd767625-b7e2-4512-9f9c-ae180a99aea0'::uuid;
  target_run_id constant uuid := '165c5eb1-a211-4ce2-9e50-42e86566190d'::uuid;
  rejected_book_finding_id constant uuid := '660b1a7b-2cc9-470b-8196-aa2fa727ac94'::uuid;
  rejected_music_finding_id constant uuid := 'c7734797-9c0a-422b-9047-37213e58bef3'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'karl-landsteiner'
      AND p.nickname = '카를 란트슈타이너'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '카를 란트슈타이너 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '카를 란트슈타이너에게 이미 연결된 콘텐츠가 있습니다.';
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
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '카를 란트슈타이너 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
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
    '2026-07-30-karl-landsteiner-full-v1',
    'Codex',
    ARRAY[
      '카를 란트슈타이너',
      'Karl Landsteiner',
      'Carl Landsteiner',
      'Karl Landsteiner immunologist',
      'Karl Landsteiner Blutgruppen'
    ],
    '동명이인인 오스트리아 가톨릭 사제·작가 Karl Borromäus Landsteiner(1835–1909)와 현대 이론물리학자 Karl Landsteiner의 저작·발언은 제외했다. 본인의 『The Specificity of Serological Reactions』와 논문은 소비 콘텐츠가 아니라 창작물이므로 세지 않았고, 혈액형 발견을 소재로 한 현대 교육 게임·영상도 후대 창작물이라 제외했다.',
    '한국어·영어·독일어 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 노벨상 공식 전기, 미국 국립과학원 회고록, 대학·의학사 자료를 대조했다. 탐정소설을 남몰래 즐겼다는 장르 선호와 피아노 연주 및 베토벤 해석 기록은 확인했으나 어느 자료도 작품명·작가·곡명을 제시하지 않는다. 영상과 게임은 본인이 본·플레이한 특정 작품 근거가 없어 네 유형 모두 채택 0건으로 완료했다.'
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
      '탐정소설(작품명 미상)',
      NULL,
      NULL,
      '복수의 전기 자료는 란트슈타이너가 탐정소설을 좋아했지만 자신의 위신에 맞지 않는 취미라 여겨 남몰래 읽었다고 전한다.',
      '확인 가능한 자료가 탐정소설이라는 장르만 전하며 제목·작가·판본을 하나도 밝히지 않는다. 작품 단위로 식별할 수 없어 BOOK 콘텐츠로 등록하지 않았다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '베토벤 피아노 작품(곡명 미상)',
      '루트비히 판 베토벤',
      NULL,
      '미국 국립과학원 회고록은 그를 감수성 있는 음악가이자 유능한 피아니스트로, 의학사 논문은 특히 베토벤의 뛰어난 해석자로 기록한다.',
      '피아노 연주와 작곡가 선호는 확인되지만 특정 소나타·협주곡·연주 음반의 제목이 없다. 연주 능력만으로 임의의 베토벤 작품을 소비 콘텐츠로 추정할 수 없어 기각했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '카를 란트슈타이너 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
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
      'https://www.verlagwirl.com/wp-content/uploads/2018/02/Sammelmappe1_klein_v2.pdf',
      'secondary',
      'article',
      'accessible',
      'Karl Landsteiner und das Wiener Allgemeine Krankenhaus',
      '87쪽 인물 소개가 피아노를 즐겨 잘 연주했고 탐정소설을 남몰래 읽었다고 전하지만 작품명이나 작가는 제시하지 않는다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.famousscientists.org/karl-landsteiner/',
      'secondary',
      'article',
      'accessible',
      'Karl Landsteiner, Famous Scientists',
      '탐정소설을 몰래 즐겼다는 전기적 일화를 독립적으로 대조했다. 장르만 있고 특정 작품은 없다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.nasonline.org/wp-content/uploads/2024/06/landsteiner-karl.pdf',
      'secondary',
      'archive',
      'accessible',
      'Karl Landsteiner 1868–1943, Biographical Memoir',
      'Michael Heidelberger의 미국 국립과학원 회고록은 란트슈타이너를 감수성 있는 음악가이자 유능한 피아니스트로 기록하지만 특정 곡은 밝히지 않는다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.josa.ro/docs/josa_2010_2s/05_MUSIC_AND_MEDICINE.pdf',
      'secondary',
      'article',
      'accessible',
      'Music and Medicine: The History of Their Relationship',
      '란트슈타이너가 훌륭한 피아니스트이자 특히 베토벤의 재능 있는 해석자였다고 전한다. 특정 베토벤 작품명은 없다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.verlagwirl.com/wp-content/uploads/2018/02/Sammelmappe1_klein_v2.pdf',
      'secondary',
      'article',
      'accessible',
      'Karl Landsteiner und das Wiener Allgemeine Krankenhaus',
      '피아노를 즐겨 훌륭하게 연주했다는 기록을 대조했으나 곡명·공연·음반 정보는 없다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://www.nobelprize.org/prizes/medicine/1930/landsteiner/biographical/?print=1',
      'secondary',
      'official_profile',
      'accessible',
      'Karl Landsteiner – Biographical, NobelPrize.org',
      '수상 당시 자료를 바탕으로 한 공식 전기를 포함해 film·movie·cinema·theatre·performance 조합을 검색했으나 란트슈타이너가 본 특정 영상·공연 작품은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://www.kl.ac.at/en/university/about-us/about-karl-landsteiner',
      'secondary',
      'official_profile',
      'accessible',
      'About Karl Landsteiner, Karl Landsteiner Privatuniversität',
      '공식 대학 소개와 game·chess·cards·sport·hobby 조합을 대조했으나 란트슈타이너가 플레이한 특정 게임은 확인되지 않았다. 현대의 혈액형 교육 게임은 그를 소재로 한 후대 작품이라 제외했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '카를 란트슈타이너 조사 source 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '카를 란트슈타이너·Karl/Carl Landsteiner·Landsteiner immunologist와 read·book·novel·literature·Kriminalroman 조합을 한국어·영어·독일어로 검색했다. 탐정소설을 몰래 즐겼다는 전기 기록은 있으나 작품명·작가가 없었다. 본인의 논문과 저서는 창작물이라 제외했고 동명이인 Karl Borromäus Landsteiner의 저술도 배제했다.'
      WHEN 'VIDEO' THEN
        'Karl Landsteiner와 film·movie·cinema·theatre·performance·watched·favorite 조합을 검색하고 노벨상 공식 전기와 장편 회고록을 대조했다. 특정 영화·방송·공연 관람 기록은 없었으며 란트슈타이너를 소재로 한 후대 다큐멘터리와 영상은 본인의 소비 이력이 아니므로 제외했다.'
      WHEN 'GAME' THEN
        'Karl Landsteiner와 game·played·chess·cards·board game·sport·hobby 조합을 검색하고 공식 대학 소개와 생애 자료를 대조했다. 특정 게임 플레이 기록은 없었다. 노벨상 사이트의 Blood Typing Game을 비롯한 현대 교육 게임은 그의 발견을 소재로 한 후대 작품일 뿐 본인이 플레이한 콘텐츠가 아니다.'
      WHEN 'MUSIC' THEN
        'Karl Landsteiner와 music·piano·composer·Beethoven·favorite music·played 조합을 검색했다. 유능한 피아니스트이며 베토벤 해석에 재능이 있었다는 복수 자료는 확인했지만 곡명·공연·음반은 하나도 특정되지 않았다. 임의의 베토벤 작품을 추정 등록하지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '카를 란트슈타이너 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
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
      '카를 란트슈타이너 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '카를 란트슈타이너 프로필·0건 확정 최종 검증에 실패했습니다.';
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
      ) = 2
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_sources src
        WHERE src.run_id = r.id
      ) = 7
  ) THEN
    RAISE EXCEPTION '카를 란트슈타이너 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
