-- 아르키메데스 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  알렉산드리아의 유클리드 계승 수학 — 교육은 현대 학계의 개연성 높은 추정일 뿐 특정 독서작이 없음
--   GAME  Stomachion — 아르키메데스 귀속의 본인 저술·물리 퍼즐이며 디지털 작품이 아님
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '63fbb09c-de95-4cbf-b594-b322b8c1f45c'::uuid;
  target_run_id constant uuid := '61c99edc-b33f-41cb-b4c5-6ee7ac609d0f'::uuid;
  rejected_book_finding_id constant uuid := '66a9d903-8bfa-4266-8bb2-0c6276337f10'::uuid;
  rejected_game_finding_id constant uuid := 'e0a9231d-1bc0-44bd-9f73-ee026d8035d6'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'archimedes'
      AND p.nickname = '아르키메데스'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '아르키메데스 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '아르키메데스에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_book_finding_id, rejected_game_finding_id)
  ) THEN
    RAISE EXCEPTION '아르키메데스 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-archimedes-full-v1',
    'Codex',
    ARRAY['아르키메데스', 'Archimedes', 'Ἀρχιμήδης', 'Archimède', 'Archimede'],
    '시라쿠사의 수학자 아르키메데스(기원전 약 287~212)를 동명 프로젝트·실험·현대 기업과 분리했다. 《모래알을 세는 사람》·《나선에 관하여》·《방법》·《Stomachion》 등 본인 또는 귀속 저술과 본인 발명품은 외부 소비 콘텐츠에서 제외했다.',
    '그리스어·영어·한국어 이름 변형으로 네 유형을 조사하고 아르키메데스 저작 서문, 플루타르코스 《마르켈루스전》, 페르세우스와 세인트앤드루스대 수학사 자료를 대조했다. 알렉산드리아에서 유클리드 후계자들에게 배웠다는 설명은 개연성 높은 현대 추정이며 특정 책 독서 기록이 아니다. Stomachion은 본인 귀속 수학 저술·물리 퍼즐이고, 영상·음악 소비 기록도 복원되지 않아 0건으로 완료했다.'
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
      '알렉산드리아의 유클리드 계승 수학',
      NULL,
      NULL,
      '세인트앤드루스대 수학사 전기는 아르키메데스가 젊은 시절 알렉산드리아에서 유클리드 후계자들에게 배웠을 가능성이 매우 높고 그 수학에 익숙했다고 설명한다.',
      '교육 장소와 수학 전통에 대한 추정이지 아르키메데스가 읽은 특정 저작의 제목·저자·판본을 전하는 직접 기록이 아니다. 《원론》을 임의로 붙이지 않는다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      'Stomachion',
      'Archimedes',
      NULL,
      '그리스어·아랍어 단편은 14조각 도형 문제를 다룬 Stomachion을 아르키메데스에게 귀속한다.',
      '아르키메데스 본인의 수학 저술이자 물리 해체 퍼즐이다. 외부 창작자의 작품 소비가 아니고 식별 가능한 디지털 GAME도 아니다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '아르키메데스 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://mathshistory.st-andrews.ac.uk/Biographies/Archimedes/',
      'secondary',
      'official_profile',
      'accessible',
      'Archimedes of Syracuse — MacTutor History of Mathematics',
      '알렉산드리아 유학과 유클리드 후계자 수학의 숙지는 추정이며, 개인 독서 작품명은 없음을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      NULL,
      'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Darchimedes-bio-1',
      'secondary',
      'official_profile',
      'accessible',
      'Archimedes — Dictionary of Greek and Roman Biography',
      '고대 전기 단편과 본인 저술 목록을 대조해 외부 독서물과 자기 연구를 분리했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Lives/Marcellus%2A.html',
      'primary',
      'archive',
      'accessible',
      'Plutarch, Life of Marcellus',
      '플루타르코스의 전승에서 전쟁 기계·기하학 몰입·죽음 일화를 theatre·spectacle·watched 조합과 대조했으나 특정 관람 작품은 없다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://math.nyu.edu/Archimedes/Stomachion/intro.html',
      'secondary',
      'article',
      'accessible',
      'Archimedes’ Stomachion — NYU',
      '아르키메데스 귀속 단편이 고대 물리 퍼즐을 다룬다는 점을 확인해 본인 저술·비디지털 대상으로 분리했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://classics.mit.edu/Plutarch/marcellu.html',
      'primary',
      'archive',
      'accessible',
      'Plutarch, Life of Marcellus',
      'Sambuca는 공성 장비의 모양을 악기에 비유한 이름일 뿐 아르키메데스의 음악 감상 기록이 아니다. 특정 곡·공연은 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '아르키메데스 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Archimedes·Ἀρχιμήδης와 read·book·Euclid·Alexandria·studied 조합을 검색했다. 유클리드 후계자 교육은 추정이며 특정 외부 저작은 없고 확인되는 제목은 본인 저술이다.'
      WHEN 'VIDEO' THEN
        'watched·theatre·spectacle·performance 조합을 고대 전승과 수학사 전기에서 대조했다. 본인 발명·전쟁 일화와 후대 다큐멘터리 외 특정 관람 작품은 없다.'
      WHEN 'GAME' THEN
        'game·puzzle·Stomachion·played 조합을 검색했다. Stomachion은 본인 귀속 저술·물리 퍼즐이고 디지털 작품 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·instrument·lyre·Sambuca 조합을 검색했다. 공성 장비의 악기 모양 비유 외 제목 있는 음악 소비는 확인되지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '아르키메데스 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '아르키메데스 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '아르키메데스 프로필·0건 확정 최종 검증에 실패했습니다.';
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
    RAISE EXCEPTION '아르키메데스 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
