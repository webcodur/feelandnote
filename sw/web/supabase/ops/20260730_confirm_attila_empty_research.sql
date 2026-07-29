-- 아틸라 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   MUSIC 아틸라의 승리를 기린 즉흥 노래 — 곡명·작자명 미상
--   VIDEO 제르콘의 연회 희극 — 공연명·창작자 식별 불가

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '4258c664-7faa-480e-bc90-d61278a3b313'::uuid;
  target_run_id constant uuid := '580c448b-ce39-4c1a-a138-2ee7da30a2ea'::uuid;
  rejected_song_id constant uuid := 'c1bcc8e0-2b7c-4d55-8614-2b7b9528f924'::uuid;
  rejected_performance_id constant uuid := 'a325d0fa-974d-4bd7-a105-bf3b5f04ab97'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id AND p.slug = 'attila'
      AND p.nickname = '아틸라' AND p.profile_type = 'CELEB'
      AND p.status = 'active' AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '아틸라 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id) THEN
    RAISE EXCEPTION '아틸라에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_song_id, rejected_performance_id)
  ) THEN
    RAISE EXCEPTION '아틸라 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-attila-full-v1',
    'Codex',
    ARRAY['아틸라', '훈족의 아틸라', 'Attila', 'Attila the Hun', 'Attila rex'],
    '베르디 오페라 《Attila》, 현대 영화·TV·소설·게임 《Total War: Attila》와 그 OST, 동명 밴드·음악가·현대인은 훈족 군주의 소비 콘텐츠가 아니므로 제외했다.',
    '한국어·영어·라틴어 이름 변형으로 네 유형을 검색하고 448년 아틸라 궁정을 직접 방문한 프리스쿠스의 기록과 대학 원문 자료를 대조했다. 아틸라 앞에서 두 가수가 그의 승리를 기리는 자작 노래를 불렀고 입성 때 여성들이 스키타이 노래를 부른 사실은 확인되지만 곡명과 가수 이름이 없다. 제르콘의 연회 희극도 공연명·대본·창작자가 식별되지 않는다. 아틸라 개인의 특정 책 독서나 디지털 게임 플레이 기록도 없어 네 유형 모두 채택 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_song_id, target_run_id, 'MUSIC', 'rejected',
      '아틸라의 승리와 무훈을 기린 노래', '이름이 전하지 않는 두 훈족 가수', NULL,
      '프리스쿠스는 448년 연회에서 두 사람이 아틸라 앞에 나와 그의 승리와 전쟁의 무훈을 기리는 자신들이 지은 노래를 불렀다고 직접 기록한다.',
      '실제 청취는 강하게 확인되지만 곡명·가수명·가사 원문·현대 음원 식별자가 모두 전하지 않는다. 작품 단위 MUSIC으로 안전하게 등록할 수 없다.'
    ),
    (
      rejected_performance_id, target_run_id, 'VIDEO', 'rejected',
      '제르콘의 연회 희극', '제르콘', NULL,
      '프리스쿠스는 노래 뒤 제르콘이 등장해 외모·복장·목소리와 라틴어·훈어·고트어를 섞은 말로 참석자들을 웃겼다고 기록한다.',
      '현장에서 벌어진 즉흥 희극의 공연명·대본·작품 경계가 없고 아틸라 자신은 웃지 않았다고 기록된다. 별도 VIDEO 작품으로 식별할 수 없다.'
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '아틸라 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'MUSIC', rejected_song_id,
      'https://faculty.georgetown.edu/jod/texts/priscus.html',
      'primary', 'archive', 'accessible', 'Priscus at the court of Attila',
      '입성 때 여성들이 스키타이 노래를 부르고 연회에서 두 가수가 아틸라의 무훈을 기린 자작 노래를 불렀다는 직접 관찰을 확인했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_song_id,
      'https://sourcebooks.web.fordham.edu/source/attila1.asp',
      'primary', 'archive', 'accessible', 'Priscus describes the court of Attila',
      '프리스쿠스 연회 기록의 별도 대학 번역본에서 두 가수의 공연과 곡명·인명 부재를 대조했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_performance_id,
      'https://faculty.georgetown.edu/jod/texts/priscus.html',
      'primary', 'archive', 'accessible', 'Priscus: Zercon at Attila’s banquet',
      '제르콘의 다언어 즉흥 희극과 아틸라의 반응을 확인했다. 고유 작품으로 특정할 정보는 없다.'
    ),
    (
      target_run_id, 'BOOK', NULL,
      'https://sourcebooks.web.fordham.edu/source/attila1.asp',
      'primary', 'archive', 'accessible', 'Priscus describes the court of Attila',
      '황제의 편지와 비서·통역이 등장하지만 아틸라가 읽은 특정 책은 기록되지 않는다. 외교문서는 BOOK 소비로 세지 않았다.'
    ),
    (
      target_run_id, 'GAME', NULL,
      'https://faculty.georgetown.edu/jod/texts/priscus.html',
      'primary', 'archive', 'accessible', 'Priscus at the court of Attila: hunt and war',
      '사냥 의도·전쟁·연회 활동을 game·played·board game 조합과 대조했다. 실제 사냥과 군사 활동은 디지털 GAME이 아니다.'
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '아틸라 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN '아틸라·Attila the Hun과 read·book·letter·secretary 조합을 검색했다. 외교 서신과 비서는 확인되지만 개인이 읽은 제목 있는 책은 없다.'
        WHEN 'VIDEO' THEN '아틸라와 watched·theatre·performance·jester·Zercon 조합을 검색했다. 제르콘의 즉흥 연회 희극은 공연명·대본·작품 경계가 없어 기각했다.'
        WHEN 'GAME' THEN '아틸라와 game·played·board game·hunt 조합을 검색했다. 사냥과 실제 전쟁은 디지털 GAME이 아니며 현대 전략게임은 후대 작품이다.'
        WHEN 'MUSIC' THEN '아틸라와 music·song·sang·banquet·Priscus 조합을 검색했다. 직접 청취는 확인되지만 입성 노래와 무훈 노래 모두 제목·가수명·가사가 전하지 않아 작품 등록이 불가능하다.'
      END
  WHERE s.run_id = target_run_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '아틸라 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;
  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '아틸라 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '아틸라 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 2
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 5
  ) THEN
    RAISE EXCEPTION '아틸라 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
