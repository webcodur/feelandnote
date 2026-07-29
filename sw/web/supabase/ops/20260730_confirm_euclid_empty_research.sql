-- 유클리드 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  에우독소스·테아이테토스의 선행 수학 저술 — 성과를 종합했다는
--         후대 증언만 있고 작품명·판본·전달 방식이 없음
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'fc36df01-f3e3-4cf3-9720-7d0acc8a1127'::uuid;
  target_run_id constant uuid := '18676503-b970-47f0-afc0-d3694cef3715'::uuid;
  rejected_book_finding_id constant uuid := '4aea23ba-503d-4520-bfdd-95bcb8b12369'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'euclid'
      AND p.nickname = '유클리드'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '유클리드 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '유클리드에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id
       OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.id = rejected_book_finding_id
  ) THEN
    RAISE EXCEPTION '유클리드 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
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
    '2026-07-30-euclid-full-v1',
    'Codex',
    ARRAY[
      '유클리드',
      '알렉산드리아의 유클리드',
      'Euclid',
      'Euclid of Alexandria',
      'Euklid',
      'Εὐκλείδης'
    ],
    '기원전 4세기 철학자 메가라의 유클리드(Euclid of Megara)와 알렉산드리아의 수학자 유클리드를 구분했다. 본인의 『원론』·『데이터』·『광학』·『현상론』 및 귀속이 논쟁적인 『음악 원론』 계열은 창작물이지 소비 콘텐츠가 아니므로 제외했다. 현대의 Euclid 교육 영상·게임·음악과 이름이 Euclid인 현대 프로젝트·인물도 제외했다.',
    '한국어·영어·그리스어 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 프로클로스·파포스 전승을 정리한 고전 판본 서문, 수학사 전기와 백과사전을 대조했다. 유클리드의 생애 자료는 극히 적고 모두 수백 년 뒤 증언이다. 『원론』이 에우독소스의 정리와 테아이테토스의 성과를 수집·완성했다는 기록은 있지만 그가 접한 원저의 제목·판본·전달 방식은 남지 않았다. 특정 영상·디지털 게임·음악 작품의 감상 근거도 없어 네 유형 모두 채택 0건으로 완료했다.'
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
  VALUES (
    rejected_book_finding_id,
    target_run_id,
    'BOOK',
    'rejected',
    '에우독소스·테아이테토스의 선행 수학 저술(작품명 미상)',
    '에우독소스 · 테아이테토스',
    NULL,
    '프로클로스는 유클리드가 에우독소스의 여러 정리를 모으고 테아이테토스의 여러 성과를 완성했으며 선행 수학자들의 느슨한 증명을 엄밀하게 만들었다고 전한다.',
    '해당 성과가 어떤 제목의 책·두루마리·강의로 전달됐는지, 유클리드가 어느 판본을 직접 읽었는지 알 수 없다. 증언도 유클리드보다 약 7세기 뒤의 프로클로스에게서 오며 원저는 대부분 소실돼 작품 단위 BOOK으로 식별할 수 없다.'
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '유클리드 조사 finding 생성 행 수가 1이 아닙니다. 실제=%', affected;
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
      'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0086%3Avolume%3D1&force=y',
      'secondary',
      'archive',
      'accessible',
      'Euclid, Elements, Volume 1: Thomas L. Heath introduction',
      '유클리드의 생애·인격 자료가 극히 적고 프로클로스 주석과 파포스의 『수학집성』이 그리스 기하학사의 핵심 후대 자료라는 판본 서문을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://mathshistory.st-andrews.ac.uk/Biographies/Euclid/',
      'secondary',
      'article',
      'accessible',
      'Euclid Biography, MacTutor History of Mathematics',
      '프로클로스가 에우독소스의 정리를 모으고 테아이테토스의 성과를 완성했다고 전한 대목과, 아카데미 수학을 접했을 것이라는 설명이 직접 사료가 아닌 후대 재구성임을 대조했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://encyclopediaofmath.org/wiki/Elements-of-Euclid',
      'secondary',
      'article',
      'accessible',
      'Elements of Euclid, Encyclopedia of Mathematics',
      '『원론』의 에우독소스 비례론 및 테아이테토스 계통 내용과 고대 판본의 큰 텍스트 변이를 확인했다. 선행 성과의 구체적 원저 제목은 제시되지 않는다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://euclid.analogmachine.org/early-history',
      'secondary',
      'article',
      'accessible',
      'Euclid’s Elements: Early History',
      '기원전 300년 무렵 알렉산드리아에서 활동했다는 최소 생애 정보와 watch·performance·theatre 조합을 대조했다. 특정 관람 작품은 없고 현대 강의·다큐멘터리는 후대 제작물이다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://aleph0.clarku.edu/~djoyce/elements/Euclid.html',
      'secondary',
      'article',
      'accessible',
      'Euclid, Clark University Elements archive',
      '생애 자료와 game·played·board game·dice 조합을 검색했으나 유클리드가 플레이한 특정 디지털 게임은 확인되지 않았다. 기하 퍼즐과 Euclid 이름의 현대 게임은 후대 작품이라 제외했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://mathshistory.st-andrews.ac.uk/DSB/Euclid.pdf',
      'secondary',
      'archive',
      'accessible',
      'Euclid, Complete Dictionary of Scientific Biography',
      '프로클로스가 유클리드에게 『음악 원론』을 귀속했다는 기록과 현전 음악이론서의 저자 논쟁을 확인했다. 이는 본인 창작·이론 저술 후보일 뿐 들은 특정 곡이나 공연이 아니다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '유클리드 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '유클리드·알렉산드리아의 유클리드·Euclid of Alexandria·Εὐκλείδης와 read·book·studied·influenced·Eudoxus·Theaetetus·Plato 조합을 검색했다. 『원론』이 선행 수학 성과를 종합한 것은 확인되지만 원저 제목·판본·전달 방식은 없다. 플라톤 아카데미 수학을 배웠다는 설명도 작품 독서의 직접 사료가 아닌 후대 추론이다. 본인의 저술과 메가라의 유클리드 자료는 제외했다.'
      WHEN 'VIDEO' THEN
        'Euclid of Alexandria와 watched·theatre·performance·film·visual work 조합을 검색하고 생애 연대와 극소수 고대 증언을 대조했다. 특정 공연·시각 작품 관람 기록은 없으며 현대 교육 영상과 다큐멘터리는 후대 제작물이라 제외했다.'
      WHEN 'GAME' THEN
        'Euclid of Alexandria와 game·played·board game·dice·puzzle 조합을 검색했다. 고대 놀이를 했다는 개인 사료가 없고, Euclid·geometry 이름을 붙인 현대 퍼즐·보드게임·비디오게임은 본인의 플레이 콘텐츠가 아니다.'
      WHEN 'MUSIC' THEN
        'Euclid of Alexandria와 music·song·harmony·performance·Sectio canonis 조합을 검색했다. 유클리드 귀속 『음악 원론』과 『카논 구분』은 저자 논쟁이 있는 음악이론 저술이며 본인이 들은 음악 작품이 아니다. 곡명·연주자·감상 기록은 확인되지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '유클리드 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
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
      '유클리드 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '유클리드 프로필·0건 확정 최종 검증에 실패했습니다.';
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
      ) = 1
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_sources src
        WHERE src.run_id = r.id
      ) = 6
  ) THEN
    RAISE EXCEPTION '유클리드 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
