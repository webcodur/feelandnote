-- 호메로스 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK   호메로스 이전 구전 서사 전통 — 작품명·개별 창작자·개인 수용 기록이 없음
--   MUSIC  음유시인의 서사시 낭송·노래 — 후대 전승이자 본인 창작 공연으로 추정될 뿐 외부 곡이 아님
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '5397f779-2dcb-4712-aca0-c7cb1dde4923'::uuid;
  target_run_id constant uuid := '1984a8bb-6392-44ca-ac30-eedc64bde5e0'::uuid;
  rejected_book_finding_id constant uuid := '3d321301-8ee8-47e1-8275-4372ce0682ce'::uuid;
  rejected_music_finding_id constant uuid := '52b464f5-9cb6-4146-8f37-fb67cd53bef2'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'homer'
      AND p.nickname = '호메로스'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '호메로스 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '호메로스에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_book_finding_id, rejected_music_finding_id)
  ) THEN
    RAISE EXCEPTION '호메로스 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-homer-full-v1',
    'Codex',
    ARRAY['호메로스', 'Homer', 'Homeros', 'Ὅμηρος', 'Omero', 'Homère'],
    '고대 그리스 시인으로 전승되는 호메로스를 호메로스 심프슨, 동명 현대인, 후대 호메로스 연구자와 분리했다. 《일리아스》·《오디세이아》와 호메로스 찬가·전승 귀속 작품은 본인 또는 호메로스 전통의 창작물이므로 외부 소비 콘텐츠에서 제외했다.',
    '그리스어·영어·한국어 이름 변형으로 네 유형을 조사하고 대영박물관, 케임브리지, 페르세우스와 고전학 강의를 대조했다. 가장 이른 외부 언급조차 호메로스가 살았다고 추정되는 시대보다 수세기 늦고, 고대 전기들은 출생지·시대·실명부터 서로 충돌한다. 선행 구전 서사나 음악적 낭송 관행은 추정할 수 있으나 작품명·창작자·호메로스 개인의 소비 기록은 복원할 수 없다. 영상·디지털 게임은 시대상 존재하지 않았고 후대 각색물뿐이어서 0건으로 완료했다.'
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
      '호메로스 이전 구전 서사 전통',
      NULL,
      NULL,
      '현대 호메로스 연구는 《일리아스》·《오디세이아》가 여러 세대의 구전 공식과 선행 이야기 재료에 의존했다고 본다.',
      '선행 재료는 제목·개별 창작자·고정 텍스트가 식별되지 않는다. 작품 내부의 전통 흔적을 역사적 호메로스 개인이 특정 외부 책을 읽었다는 기록으로 바꿀 수 없다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '음유시인의 서사시 낭송·노래',
      NULL,
      NULL,
      '고대 도상과 후대 전기는 호메로스를 노래하거나 낭송하는 시인으로 상상하며, 《오디세이아》의 눈먼 가인 데모도코스를 전기적 단서로 읽기도 했다.',
      '데모도코스는 호메로스 자신의 서사 속 인물이고 이를 실제 전기로 보는 것은 후대 추론이다. 특정 외부 곡명·작곡가·음원은 없으며 본인 시의 공연을 외부 MUSIC 소비로 등록할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '호메로스 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.umw.edu/greatlives/lecture/homer/',
      'secondary',
      'article',
      'accessible',
      'Homer — Great Lives, University of Mary Washington',
      '호메로스를 이름으로 언급하는 가장 이른 자료가 기원전 6세기이며 고대인도 그의 생애를 확실히 몰랐다는 고전학 강의다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://www.pbs.org/empires/thegreeks/background/3a_p1.html',
      'secondary',
      'official_profile',
      'accessible',
      'Who was Homer? — PBS The Greeks',
      '생애를 전혀 알 수 없다는 전기 기준선과 후대 영상·극 각색물이 본인 감상물이 될 수 없음을 대조했다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0004%3Aentry%3Dhomer',
      'secondary',
      'official_profile',
      'accessible',
      'Homer — Perseus Encyclopedia',
      '호메로스의 시대·출신·작곡 방식에 확실한 증거가 없다는 고전학 개설을 game·play·contest 조합과 대조했다. 후대 경연 설화 외 디지털 GAME은 없다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.cambridge.org/core/books/cambridge-guide-to-homer/introduction/A758931C64C54C11EE43039C00C011D5',
      'secondary',
      'article',
      'accessible',
      'Introduction — The Cambridge Guide to Homer',
      '복합 방언과 구전 작시 전통, 눈먼 시인 전승이 《오디세이아》의 데모도코스와 후대 전기에서 형성됐음을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.britishmuseum.org/blog/who-was-homer',
      'secondary',
      'official_profile',
      'accessible',
      'Who was Homer? — British Museum',
      '눈먼 음유시인 이미지는 《오디세이아》의 데모도코스와 구전 전승에서 나온 후대 구성일 가능성이 크다고 설명한다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '호메로스 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Homer·Homeros·Ὅμηρος와 read·book·teacher·source·oral tradition 조합을 고전학 자료에서 검색했다. 본인 귀속 작품과 이름 없는 선행 구전 재료 외에 특정 외부 저작 수용 기록은 없다.'
      WHEN 'VIDEO' THEN
        'watched·theatre·performance·film 조합을 생애 자료와 대조했다. 역사적 생애 자체가 복원되지 않고 영상 매체 이전 인물이며 후대 각색물만 확인된다.'
      WHEN 'GAME' THEN
        'game·played·contest·dice·board game 조합을 검색했다. 후대 《호메로스와 헤시오도스의 경연》 전승은 문학적 전기이며 작품 단위 디지털 GAME 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·lyre·aoidos·rhapsode·Demodocus 조합을 검색했다. 구전 시인의 낭송 관행과 본인 창작 공연 추정뿐이며 제목 있는 외부 음악 소비는 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '호메로스 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '호메로스 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '호메로스 프로필·0건 확정 최종 검증에 실패했습니다.';
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
    RAISE EXCEPTION '호메로스 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
