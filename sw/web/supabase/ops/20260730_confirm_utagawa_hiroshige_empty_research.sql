-- 우타가와 히로시게의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 반영한다.
-- 그림책·지리지 참고와 호쿠사이 영향은 확인되지만, 1차 자료의 직접 독서·감상 진술로 좁혀지지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'de63016f-6f0b-4959-84bd-dfc05ad3097f'::uuid;
  target_run_id constant uuid := '50b8e217-254d-4f0a-8163-6605f08b3bfa'::uuid;
  book_finding_id constant uuid := 'ee857d8f-8856-40eb-a23c-75a76d7ba5cf'::uuid;
  video_finding_id constant uuid := '21d6333c-73c1-489e-ba4b-f128c58cc0ea'::uuid;
  game_finding_id constant uuid := '6c58595d-bd07-45a0-8943-e6d4752fdd92'::uuid;
  music_finding_id constant uuid := 'e2bd4ad9-0555-4166-94fd-ca1d9cc21eb0'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'utagawa-hiroshige'
      AND p.nickname = '우타가와 히로시게'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '우타가와 히로시게 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '우타가와 히로시게 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-utagawa-hiroshige-empty-v1',
    'Codex',
    ARRAY['우타가와 히로시게', '히로시게', '歌川広重', '安藤広重', 'Utagawa Hiroshige', 'Ando Hiroshige', 'Andō Hiroshige'],
    '에도 후기 우키요에 화가 우타가와 히로시게(1797~1858)를 동명의 후대 화가, 전시·영상 제목 및 본인 판화 연작과 분리했다.',
    '일본어·영어 이름과 読書·本·画譜·名所図会·北斎漫画·芝居·歌舞伎·音楽 조합을 조사했다. 산토리미술관은 히로시게의 제작 참고 자료로 여러 명소도회·《북재만화》·《산수기관》을 제시하고, 미국 의회도서관은 호쿠사이 연작의 영향을 설명한다. 그러나 모두 후대 연구자의 제작 원천 판정이며 히로시게 자신의 편지·일기·서문이 특정 작품을 직접 읽거나 감상했다고 밝힌 1차 기록은 아니다. 가부키 소재 판화도 공연 관람의 직접 증거가 아니며 작품 단위 음악·게임 소비 기록도 없어 0건으로 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'rejected',
      '명소도회·북재만화·산수기관', '아키사토 리토·가쓰시카 호쿠사이·후치가미 교쿠란 외', NULL,
      '산토리미술관은 《육십여주명소도회》의 도상 원천으로 《도명소도회》, 《섭진명소도회》, 《동해도명소도회》, 《북재만화》, 《산수기관》을 열거한다.',
      '박물관의 도상 비교에 따른 제작 참고 자료 판정일 뿐, 히로시게가 특정 책을 읽었다고 밝힌 1차 문서가 아니다.'
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '가부키 《국성야합전》 소재 판화', '지카마쓰 몬자에몬 원작', NULL,
      '영국박물관은 히로시게가 초기 경력에 가부키 장면을 소재로 판화를 만들었고 《국성야합전》 장면을 묘사했다고 설명한다.',
      '무대극은 현재 VIDEO 정의 밖이며, 소재로 그렸다는 사실만으로 히로시게 본인의 특정 공연 관람을 증명하지 않는다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '에도 시대 놀이·오락 일반', NULL, NULL,
      '공식 약력과 전시 자료에서 작품 단위 게임 소비 기록을 찾지 못했다.',
      '시대 문화나 판화 속 놀이 묘사로 작가 개인의 게임 플레이를 추정하지 않는다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '에도 가부키 음악·도시 음악 일반', NULL, NULL,
      '가부키 소재와 에도 대중문화 맥락은 확인되지만 히로시게가 제목 있는 곡이나 음반에 해당하는 작품을 들었다는 기록은 없다.',
      '동시대 문화 환경과 작품 소재는 개인의 작품 단위 청취·추천 기록이 아니다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '우타가와 히로시게 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.suntory.com/sma/exhibition/2016_2/display.html',
      'secondary', 'official_profile', 'accessible',
      'Hiroshige and His Japanese Landscapes — Suntory Museum of Art',
      '여러 명소도회, 《북재만화》, 《산수기관》을 판화의 도상 원천으로 설명하지만 직접 독서 1차 기록은 제시하지 않는다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.loc.gov/exhibits/ukiyo-e/realia.html',
      'secondary', 'official_profile', 'accessible',
      'Ukiyo-e: The Floating World — Library of Congress',
      '호쿠사이의 《후지산 36경》이 히로시게에게 영감을 주었다는 후대 영향 설명을 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://www.britishmuseum.org/exhibitions/hiroshige-artist-open-road/hiroshige-large-print-guide',
      'secondary', 'official_profile', 'accessible',
      'Hiroshige: artist of the open road — British Museum',
      '초기 가부키 소재 판화와 《국성야합전》 장면 설명을 확인했으나, 공연 관람의 직접 기록은 아니다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://www.britishmuseum.org/exhibitions/hiroshige-artist-open-road/hiroshige-large-print-guide',
      'secondary', 'official_profile', 'accessible',
      'Hiroshige: artist of the open road — British Museum',
      '생애·작품 안내에서 작가 개인의 작품 단위 게임 소비 기록은 확인되지 않는다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://www.suntory.com/sma/exhibition/2016_2/display.html',
      'secondary', 'official_profile', 'accessible',
      'Hiroshige and His Japanese Landscapes — Suntory Museum of Art',
      '에도 문화와 제작 원천 설명을 검토했으나 제목 있는 음악 작품의 직접 감상 기록은 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '우타가와 히로시게 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Utagawa Hiroshige·歌川広重·安藤広重와 読書·本·画譜·名所図会·北斎漫画·山水奇観 조합을 조사했다. 후대 도상 원천 설명만 있고 본인의 직접 독서 1차 기록은 없어 0건이다.'
      WHEN 'VIDEO' THEN
        '芝居·歌舞伎·見物·観劇·performance 조합을 조사했다. 가부키 소재 판화는 확인되나 관람 직접 기록이 아니고 무대극도 VIDEO 정의 밖이다.'
      WHEN 'GAME' THEN
        'game·遊び·囲碁·将棋·玩具 조합을 조사했다. 개인의 작품 단위 게임 소비 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·音楽·歌・三味線·聴く 조합을 조사했다. 에도 문화 환경 외에 특정 작품 청취 기록은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '우타가와 히로시게 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '우타가와 히로시게 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '우타가와 히로시게 light·confirmed_empty 최종 검증에 실패했습니다.';
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
           WHERE src.run_id = r.id) = 5
  ) THEN
    RAISE EXCEPTION '우타가와 히로시게 조사 저장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
