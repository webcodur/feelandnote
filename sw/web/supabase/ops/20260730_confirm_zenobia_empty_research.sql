-- 제노비아 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK   그리스어로 읽은 로마사 — 장르만 전하고 작품명·저자 없음
--   VIDEO  팔미라 극장·후대 제노비아 공연 — 본인의 특정 작품 관람 근거 없음
--   GAME   사냥·군사 활동 — 실제 신체 활동이며 디지털 GAME이 아님
--   MUSIC  궁정 연회 음악 추정 — 곡명·창작자·청취 기록 없음
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'baaff2e6-0e31-49e2-9efe-27b3200d5cfd'::uuid;
  target_run_id constant uuid := '1a8816d5-e674-449b-b1ae-de9b60477d5b'::uuid;
  rejected_book_finding_id constant uuid := '5fc9225d-0462-4699-bedf-7d299bc2ceca'::uuid;
  rejected_video_finding_id constant uuid := 'a55611e8-3a7b-4fbb-bfa7-a9ddb259c74a'::uuid;
  rejected_game_finding_id constant uuid := '8632baed-b191-4734-9a4a-330fc56e838d'::uuid;
  rejected_music_finding_id constant uuid := '346aac02-4743-477b-b74d-10fd8f1137e2'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'zenobia'
      AND p.nickname = '제노비아'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '제노비아 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '제노비아에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      rejected_book_finding_id,
      rejected_video_finding_id,
      rejected_game_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '제노비아 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-zenobia-full-v1',
    'Codex',
    ARRAY['제노비아', 'Zenobia', 'Septimia Zenobia', 'Bat-Zabbai', 'al-Zabba', 'زنوبيا'],
    '3세기 팔미라 여왕 제노비아(약 240~274)를 후대 소설·오페라·영화·게임의 제노비아, 가공 인물, 동명 작품과 분리했다. 롱기누스의 저술이 유익하다는 조시무스의 평가는 제노비아가 특정 저작을 읽었다는 진술이 아니다.',
    '영어·라틴어·아랍어 이름 변형과 read·history·Longinus·theatre·spectacle·game·hunt·music·banquet 조합으로 네 유형을 조사했다. 후기 사료인 『히스토리아 아우구스타』는 제노비아가 로마사를 그리스어로 읽었다고 하지만 작품명·저자를 전하지 않고, 알렉산드리아·동방사 요약은 본인 저술이다. 롱기누스와의 관계도 특정 저작 독서로 이어지지 않는다. 극장 유적, 사냥·군사 활동, 연회 일반론과 후대 제노비아 소재 작품을 개인의 식별 가능한 감상 콘텐츠로 확장하지 않아 0건으로 완료했다.'
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
      '그리스어로 읽은 로마사(작품 미상)',
      NULL,
      NULL,
      '『히스토리아 아우구스타』 30.22는 제노비아가 로마사를 그리스어로 읽었다고 전하고 알렉산드리아·동방사에 밝았다고 묘사한다.',
      '장르만 제시되고 작품명·저자·판본이 없다. 알렉산드리아·동방사의 요약서는 제노비아 본인의 저술이며, 사료 자체도 생애보다 한 세기 이상 뒤에 쓰인 신뢰도 낮은 자료다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '팔미라 극장과 후대 제노비아 소재 공연',
      NULL,
      NULL,
      '팔미라에는 로마식 극장이 있었고 제노비아는 후대 오페라·연극·영화의 소재가 되었다.',
      '극장의 존재는 제노비아가 특정 작품을 관람했다는 기록이 아니다. 후대 제작물은 본인이 볼 수 없었던 사후 작품이다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '사냥과 군사 활동',
      NULL,
      NULL,
      '『히스토리아 아우구스타』는 제노비아가 말을 타고 병사들과 행군하며 열성적으로 사냥했다고 전한다.',
      '사냥·기마·전쟁은 실제 신체·군사 활동이다. 작품 단위 디지털 GAME 타이틀과 플레이 기록이 없다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '궁정 연회 음악 추정',
      NULL,
      NULL,
      '사료는 제노비아의 왕실 연회와 공적 집회를 묘사하고 팔미라의 궁정 문화를 전한다.',
      '연회가 있었다는 사실만으로 음악 청취를 추론할 수 없고 곡명·창작자·연주자도 전하지 않는다. 후대 제노비아 오페라·음반은 본인 감상작이 아니다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '제노비아 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://penelope.uchicago.edu/thayer/e/roman/texts/historia_augusta/tyranni_xxx%2A.html',
      'primary',
      'archive',
      'accessible',
      'Historia Augusta, Thirty Pretenders 30 — Zenobia',
      '30.22의 “Roman history ... she read in Greek”와 본인 역사 요약서 진술을 원문·영문으로 확인했다. 작품명과 저자는 없다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.livius.org/sources/content/historia-augusta/',
      'secondary',
      'article',
      'accessible',
      'Historia Augusta — Livius',
      '『히스토리아 아우구스타』의 후기 편찬 시기와 개별 생애 정보의 낮은 신뢰도를 대조했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.livius.org/sources/content/zosimus/zosimus-new-history-1/zosimus-new-history-1.56/',
      'primary',
      'archive',
      'accessible',
      'Zosimus, New History 1.56',
      '제노비아가 재판에서 롱기누스를 조언자로 지목했다는 기록은 있지만 그의 특정 저술을 읽었다는 진술은 없음을 확인했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://archeologie.culture.gouv.fr/palmyre/en/temple-bel-zenobia',
      'secondary',
      'official_profile',
      'accessible',
      'From the Temple of Bel to Zenobia — French Ministry of Culture',
      '팔미라의 극장·도시 문화와 제노비아 시대 맥락을 대조했지만 여왕의 특정 공연 관람 기록은 제시되지 않는다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://penelope.uchicago.edu/thayer/e/roman/texts/historia_augusta/tyranni_xxx%2A.html',
      'primary',
      'archive',
      'accessible',
      'Historia Augusta, Thirty Pretenders 30 — Zenobia',
      '사냥·기마·행군 기록을 확인하고 작품 단위 디지털 게임 소비와 분리했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://penelope.uchicago.edu/thayer/e/roman/texts/historia_augusta/tyranni_xxx%2A.html',
      'primary',
      'archive',
      'accessible',
      'Historia Augusta, Thirty Pretenders 30 — Zenobia',
      '연회와 공적 생활의 상세 묘사에도 곡명·연주자·음악 선호가 없음을 확인했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '제노비아 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Zenobia·Septimia Zenobia·Bat-Zabbai와 read·book·history·Greek·Longinus 조합을 고대 사료와 현대 사료평가에서 검색했다. 그리스어 로마사 독서는 작품명·저자가 없고 본인 역사 요약서는 자작물이라 기각했다.'
      WHEN 'VIDEO' THEN
        'theatre·spectacle·performance·watched·Palmyra 조합을 검색했다. 극장 유적과 후대 제노비아 소재 공연만 확인되며 본인이 관람한 특정 작품은 없다.'
      WHEN 'GAME' THEN
        'game·played·hunt·chariot·military 조합을 검색했다. 사냥·기마·행군은 실제 활동이며 작품 단위 디지털 GAME 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·banquet·court·heard 조합을 검색했다. 왕실 연회 일반론 외에 곡명·창작자·개인 청취를 함께 갖춘 기록은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '제노비아 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '제노비아 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '제노비아 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '제노비아 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
