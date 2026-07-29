-- 피타고라스 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 호메로스·헤시오도스 선별 구절과 음악 치료 전승은 작품명이 없고 약 800년 뒤 기록이다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '34daa6a0-f79c-4b2b-86aa-ffb1e8e69ccb'::uuid;
  target_run_id constant uuid := '49aca7fa-f3c9-4f96-841b-689a67ee550b'::uuid;
  rejected_book_finding_id constant uuid := '0cbc27d7-6897-4256-8490-f7f7cf256962'::uuid;
  rejected_video_finding_id constant uuid := 'e1dcf3ee-3431-4718-8a57-9e30964772a5'::uuid;
  rejected_game_finding_id constant uuid := '61b11a6c-92ee-4fde-9dd6-6fb944eb26ce'::uuid;
  rejected_music_finding_id constant uuid := '698225f0-830b-4564-a271-fc5c7fb71f6e'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'pythagoras'
      AND p.nickname = '피타고라스'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '피타고라스 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '피타고라스 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id,
    '2026-07-30-pythagoras-empty-v1', 'Codex',
    ARRAY['피타고라스', 'Pythagoras', 'Pythagoras of Samos', 'Πυθαγόρας'],
    '기원전 6세기 사모스의 철학자 피타고라스를 피타고라스 학파 전체, 후대 위작 『황금률』, 현대 작사가 피타고라스 파파스타마티우스와 분리했다.',
    '동시대 단편부터 약 800년 뒤 이암블리코스의 전기까지 BOOK·VIDEO·GAME·MUSIC을 조사했다. 헤라클레이토스는 여러 글을 골라 자기 지혜를 만들었다고 비판하지만 서명을 전하지 않는다. 이암블리코스는 호메로스·헤시오도스의 선별 구절, 이름 없는 선율과 스폰데이오스 곡조를 사용했다고 전하지만 작품명·창작자를 특정하지 않는다. 후대 전승의 거리와 작품 식별 실패를 함께 기록하고 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '호메로스·헤시오도스의 선별 구절과 이름 없는 여러 글', '호메로스·헤시오도스 등', NULL,
      '헤라클레이토스 단편은 피타고라스가 여러 글을 골랐다고 비판하고, 이암블리코스는 호메로스·헤시오도스의 구절을 사용했다고 전한다.',
      '작품 제목이나 어느 구절인지 특정되지 않는다. 이암블리코스의 기록은 피타고라스 사후 약 800년의 전승이어서 임의로 『일리아스』·『오디세이아』·『신통기』를 붙이지 않았다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '춤과 연극적 피리 일반론', NULL, NULL,
      '이암블리코스는 피타고라스가 춤을 사용하고 피리 소리를 연극적이라고 여겼다고 전한다.',
      '공연 양식에 관한 후대 전승일 뿐 본인이 관람한 제목 있는 극·영상 작품은 아니다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '수학 문제·철학 학파·후대 피타고라스 게임', NULL, NULL,
      '수학과 철학 교육, 공동체 규율은 전승되며 현대 교육 게임에 이름이 쓰인다.',
      '교육 활동과 후대 이름 사용은 본인의 작품 단위 디지털 GAME 플레이 기록이 아니다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '이름 없는 선율·스폰데이오스 곡조·호메로스와 헤시오도스 구절', NULL, NULL,
      '이암블리코스는 피타고라스가 영혼을 다스리는 선율을 쓰고 피리 연주자에게 프리기아 곡조를 스폰데이오스 곡조로 바꾸게 했다고 전한다.',
      '곡명·작곡가·연주자가 특정되지 않고 후대 전승의 거리도 크다. 장르·선법을 임의의 현대 음원에 연결하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '피타고라스 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://plato.stanford.edu/archives/win2025/entries/pythagoras/index.html',
      'secondary', 'article', 'accessible',
      'Pythagoras — Stanford Encyclopedia of Philosophy',
      '동시대 자료의 희소성, 서명 없는 타인의 글 독서 단편, 후대 전기의 약 800년 시차를 확인했다.'
    ),
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://www.gutenberg.org/files/63300/63300-h/63300-h.htm',
      'primary', 'archive', 'accessible',
      'Iamblichus’ Life of Pythagoras — Project Gutenberg',
      '호메로스·헤시오도스의 선별 구절이라는 전승에 개별 작품명이 없음을 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://www.gutenberg.org/files/63300/63300-h/63300-h.htm',
      'primary', 'archive', 'accessible',
      'Iamblichus’ Life of Pythagoras — Project Gutenberg',
      '춤·피리·연극적 소리 서술을 개인의 특정 관람작과 분리했다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://plato.stanford.edu/archives/win2025/entries/pythagoras/index.html',
      'secondary', 'article', 'accessible',
      'Pythagoras — Stanford Encyclopedia of Philosophy',
      '역사적 철학자와 후대 피타고라스 학파·현대 이름 사용을 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://www.gutenberg.org/files/63300/63300-h/63300-h.htm',
      'primary', 'archive', 'accessible',
      'Iamblichus’ Life of Pythagoras — Project Gutenberg',
      '이름 없는 선율과 프리기아·스폰데이오스 곡조 전승을 확인했으나 작품 식별자는 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '피타고라스 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'Pythagoras·피타고라스와 read·book·Homer·Hesiod 조합을 조사했다. 여러 글·선별 구절이라는 전승은 있으나 작품명이 없어 기각했다.'
        WHEN 'VIDEO' THEN 'watched·theatre·dance·performance 조합을 조사했다. 춤과 피리 일반론 외에 제목 있는 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·contest 조합을 조사했다. 수학·교육 활동과 후대 이름 사용은 디지털 GAME 소비가 아니다.'
        WHEN 'MUSIC' THEN 'music·melody·lyre·Phrygian·spondaic 조합을 조사했다. 선법·기능만 전하고 곡명·창작자를 특정하지 못한다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '피타고라스 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '피타고라스 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '피타고라스 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
