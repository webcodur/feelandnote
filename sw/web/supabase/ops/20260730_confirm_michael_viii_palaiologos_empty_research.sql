-- 미하일 8세 팔레올로고스의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 반영한다.
-- 교육·수도원 후원과 제목 없는 예언 노래는 확인되지만 개인의 작품 단위 소비 증거는 확인되지 않았다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '6b263ca0-0a65-4d8e-9789-6fc3839557f0'::uuid;
  target_run_id constant uuid := '6f68f9f3-5ce8-41fb-bf1f-d22d011d9829'::uuid;
  book_finding_id constant uuid := '420fe576-3c69-4668-ae42-2271bc62db00'::uuid;
  video_finding_id constant uuid := 'fdcdc203-3a33-495f-85e7-6ed96a9c712c'::uuid;
  game_finding_id constant uuid := '91b651d3-2c7d-4c03-b8fc-dfe978963555'::uuid;
  music_finding_id constant uuid := '100a89af-78b5-45f0-8c26-624424747139'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'michael-viii-palaiologos'
      AND p.nickname = '미하일 8세'
      AND p.nickname_en = 'Michael VIII Palaiologos'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '미하일 8세 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '미하일 8세 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-michael-viii-palaiologos-empty-v1',
    'Codex',
    ARRAY['미하일 8세', '미카엘 8세', 'Michael VIII Palaiologos', 'Michael VIII Palaeologus', 'Μιχαὴλ Ηʹ Παλαιολόγος'],
    '팔레올로고스 왕조 창건자 미하일 8세(1224~1282)를 미하일 7세·9세, 아들 안드로니코스 2세, 후대 동명 귀족과 분리했다.',
    '미하일 자신의 수도원 설립문서에 포함된 자전적 진술, 파키메레스 연대기, 교육사 연구를 검토했다. 자신의 자전·티피콘과 제국 문서는 본인 저술이며, 콘스탄티노플 교육기관 복구와 학자 후원은 개인의 플라톤·아리스토텔레스 독서로 바꿀 수 없다. 누이가 불러 준 “도시에 관한 노래” 전승은 곡명·창작자가 없고 예언적 자장가 일화다. “체스 선수 같은 외교관”이라는 현대 논문 제목은 실제 게임 기록이 아니다. 제목 있는 공연·영상도 확인되지 않아 0건으로 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'rejected',
      '플라톤·아리스토텔레스·호메로스 저작 일반', NULL, NULL,
      '1261년 뒤 제국 학교와 고등교육을 복구하고 고전 학문을 후원한 사실은 확인된다. 미하일 자신의 두 티피콘에는 자전적 경력도 담겼다.',
      '교육 후원은 황제 개인이 특정 고전을 읽었다는 진술이 아니며, 티피콘과 자전은 자신의 저술이라 외부 소비 콘텐츠에서 제외한다.'
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '미하일 8세 소재 후대 다큐멘터리·영상 일반', NULL, NULL,
      '콘스탄티노플 탈환과 교회 통합을 다룬 후대 영상은 있으나 모두 사후 제작물이다.',
      '본인이 관람한 제목 있는 공연·영상 작품은 확인되지 않았다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '“체스 선수” 황제 비유·비잔틴 놀이 일반', NULL, NULL,
      '현대 전략학 논문은 미하일의 외교를 “체스 선수”에 비유하지만 실제 체스 대국을 기록한 자료가 아니다.',
      '수사적 비유와 후대 전략게임 속 등장을 본인의 게임 플레이로 등록하지 않는다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '도시에 관한 예언 노래·자장가', '에울로기아 팔레올로기나 전승', NULL,
      '파키메레스 계열 전승은 어린 미하일이 누이 에울로기아에게 “도시에 관한 노래”를 불러 달라고 했다는 예언 일화를 전한다.',
      '곡명·작곡자·고정 텍스트가 남지 않은 후대 전승이므로 작품 단위 MUSIC에 연결할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '미하일 8세 finding 생성 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://academic.oup.com/edinburgh-scholarship-online/book/51597/chapter/418224435',
      'primary', 'article', 'accessible',
      'Two Paradoxes of Border Identity: Michael VIII Palaiologos',
      '미하일의 두 티피콘과 그 안의 자전적 진술을 직접 인용해 생애 자료를 제시한다. 특정 외부 저작의 독서 진술은 없다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.ime.gr/chronos/10/en/pl/pn/pnd3a.html',
      'secondary', 'official_profile', 'accessible',
      'Culture in Late Byzantine Period',
      '1261년 미하일이 제국 학교를 세운 교육 후원을 설명하지만 황제 개인의 작품별 독서를 제시하지 않는다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://catholiclibrary.org/library/view?chunk.id=00000005&docId=%2FFathers-Synchronized-EN%2FGeorgius_Pachymeres__Chronicon_i.en.html',
      'primary', 'archive', 'accessible',
      'Georgius Pachymeres, Chronicle I',
      '미하일의 즉위와 통치에 가까운 연대기 자료를 검토했으나 제목 있는 공연·영상 관람 기록은 확인되지 않았다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://www.openarchives.gr/aggregator-openarchives/edm/Pandemos/000014-123456789_10604',
      'secondary', 'article', 'accessible',
      'Michael VIII Palaeologus: the “chess player” emperor',
      '“chess player”가 13세기 대전략과 외교를 설명하는 현대 논문 제목의 비유임을 확인했다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://etheses.bham.ac.uk/id/eprint/12736/14/Novasio2022PhD_Redacted.pdf',
      'secondary', 'article', 'accessible',
      'Searching for Identities: A Meeting of Text and Image',
      '파키메레스의 에울로기아 자장가와 “도시에 관한 노래” 전승을 다룬다. 작품명이 보존된 곡은 아니다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://byzantine.lib.princeton.edu/byzantine/authors/michael-viii-palaeologus-emperor-east-1224-or-1225-1282',
      'secondary', 'official_profile', 'accessible',
      'Michael VIII Palaeologus — Princeton Byzantine Sources',
      '미하일 자신의 저술·번역 서지와 인물 식별을 확인해 외부 독서와 본인 저술을 분리했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '미하일 8세 source 생성 행 수가 6개가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Michael VIII Palaiologos·Palaeologus·read·book·Homer·Plato·Aristotle·typikon 조합으로 자전 자료와 교육사를 조사했다. 본인 저술과 후원만 있고 작품 단위 독서는 없다.'
      WHEN 'VIDEO' THEN
        'performance·spectacle·theatre·watched 조합과 파키메레스 연대기를 조사했다. 제목 있는 생전 감상 기록은 없다.'
      WHEN 'GAME' THEN
        'game·chess·played 조합을 조사했다. “chess player”는 외교 전략의 현대적 비유이며 실제 플레이 기록이 아니다.'
      WHEN 'MUSIC' THEN
        'music·song·canticle·lullaby·Eulogia 조합을 조사했다. 예언 노래 전승은 있으나 제목·창작자·고정 텍스트가 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '미하일 8세 scope 완료 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '미하일 8세 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '미하일 8세 light·confirmed_empty 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'accepted') = 0
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '미하일 8세 조사 저장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
