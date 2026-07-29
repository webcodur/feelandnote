-- 클로비스 1세 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 개종 설교·교육과 세례 의식은 확인되지만 특정 외부 작품 소비는 식별되지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '8225a732-17cc-4c93-b6e9-e86c66394f76'::uuid;
  target_run_id constant uuid := 'dd6cafcf-6b7f-4da6-b57b-1d3352e05a70'::uuid;
  rejected_book_finding_id constant uuid := '1db87acf-a206-4538-84d6-ecb73fb02391'::uuid;
  rejected_video_finding_id constant uuid := 'eacb3f01-1d89-409a-8237-2ad3b6722cf2'::uuid;
  rejected_game_finding_id constant uuid := '8643baec-0644-47cd-9c36-c99b1bfa04c2'::uuid;
  rejected_music_finding_id constant uuid := '02de67e8-c479-4d5d-bf94-a4ce299faffa'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'clovis-i'
      AND p.nickname = '클로비스 1세'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '클로비스 1세 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '클로비스 1세 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id,
    '2026-07-30-clovis-i-empty-v1', 'Codex',
    ARRAY['클로비스 1세', 'Clovis I', 'Clovis', 'Chlodovech', 'Chlodwig I', 'Chlodowech'],
    '5~6세기 프랑크 왕 클로비스 1세를 후대 메로빙거·프랑스 왕 루이들, 클로비스 문화·고고학 명칭, 후대 클로비스 소재 미술·영화와 분리했다.',
    '동시대 서신, 약 한 세기 뒤 그레고리우스 투로넨시스의 개종 서술과 현대 사료 비판을 대조해 BOOK·VIDEO·GAME·MUSIC을 조사했다. 클로틸드의 권유와 레미기우스의 설교·교리 교육은 구두 전승으로 제시되며 성경이나 특정 교리서를 직접 읽었다는 기록은 아니다. 세례 의식과 실제 전쟁, 후대 재현물도 작품 단위 감상으로 바꾸지 않고 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '레미기우스의 기독교 설교·교리 교육과 성경 추정', '레미기우스', NULL,
      '그레고리우스의 전승은 레미기우스가 클로비스에게 신앙을 설교하고 십자가의 길을 가르쳤다고 서술한다.',
      '본문은 구두 설교·교육만 말하며 성경이나 특정 교리서의 서명·독서를 전하지 않는다. 개종했다는 사실만으로 성경 독서를 추정하지 않았다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '클로비스의 세례 의식과 후대 개종 극화', NULL, NULL,
      '세례는 공개 의식으로 전해지고 후대 미술·연극·영상은 이를 반복해 재현했다.',
      '종교 의식은 제목 있는 외부 공연 관람작이 아니며 후대 극화는 본인 사후 제작물이다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '알레만니·서고트 전쟁과 후대 프랑크 전략 게임', NULL, NULL,
      '클로비스의 실제 전쟁과 정복 활동은 사료에 기록된다.',
      '실제 전쟁은 디지털 GAME 플레이가 아니며 후대 전략 게임은 본인의 소비작이 아니다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '세례·전례 음악 일반과 후대 클로비스 음악 작품', NULL, NULL,
      '개종과 세례의 종교적 맥락은 전하지만 당시 의식에서 클로비스가 들은 개별 음악 작품은 기록되지 않는다.',
      '전례 일반론에서 곡명·창작자·연주자를 가진 개인 청취작을 복원할 수 없고 후대 작품은 사후 재현물이다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '클로비스 1세 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://sourcebooks.web.fordham.edu/source/gregory-clovisconv.asp',
      'primary', 'archive', 'accessible',
      'Gregory of Tours, The Conversion of Clovis — Fordham Sourcebook',
      '클로틸드의 권유와 레미기우스의 설교·교육을 확인했으나 특정 책 독서는 서술하지 않는다.'
    ),
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://www.persee.fr/doc/rhef_0300-9505_1935_num_21_91_2738',
      'secondary', 'article', 'accessible',
      'La conversion et le baptême de Clovis — Persée',
      '동시대 아비투스 서신과 후대 개종 전승의 사료 거리를 대조했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://sourcebooks.web.fordham.edu/source/gregory-clovisconv.asp',
      'primary', 'archive', 'accessible',
      'Gregory of Tours, The Conversion of Clovis — Fordham Sourcebook',
      '세례 의식을 확인하고 제목 있는 극·공연 관람과 후대 재현물에서 분리했다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://www.worldhistory.org/Clovis_I/',
      'secondary', 'official_profile', 'accessible',
      'Clovis I — World History Encyclopedia',
      '알레만니·서고트 전쟁과 정복을 실제 군사 활동으로 확인해 디지털 GAME과 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://sourcebooks.web.fordham.edu/source/gregory-clovisconv.asp',
      'primary', 'archive', 'accessible',
      'Gregory of Tours, The Conversion of Clovis — Fordham Sourcebook',
      '개종·세례 서술에 클로비스 개인의 곡명·연주자 있는 청취 기록이 없음을 확인했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '클로비스 1세 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'Clovis·클로비스와 read·book·Bible·Remigius·instruction 조합을 조사했다. 구두 설교·교육뿐이라 특정 서명 독서를 기각했다.'
        WHEN 'VIDEO' THEN 'watched·theatre·performance·baptism 조합을 조사했다. 세례 의식과 후대 극화 외에 제목 있는 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·war·Alamanni·Visigoth 조합을 조사했다. 실제 전쟁과 후대 전략 게임은 본인의 디지털 GAME 소비가 아니다.'
        WHEN 'MUSIC' THEN 'music·song·heard·baptism·liturgy 조합을 조사했다. 전례 일반론 외에 곡명·창작자가 특정되는 청취작은 없다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '클로비스 1세 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '클로비스 1세 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.user_contents uc WHERE uc.user_id = p.id
      )
  ) THEN
    RAISE EXCEPTION '클로비스 1세 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
