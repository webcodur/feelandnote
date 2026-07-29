-- 그라쿠스 형제 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 그리스 교육·웅변·전쟁·음정관 사용은 확인되지만 형제의 특정 외부 작품 소비는 식별되지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '7ac1d450-4422-4c47-a25c-ab88d1affe47'::uuid;
  target_run_id constant uuid := '6899d2cb-69af-4e3c-9467-3359b3a087c4'::uuid;
  rejected_book_finding_id constant uuid := '96a0a6ae-7449-4589-b5e2-5566f56fb0de'::uuid;
  rejected_video_finding_id constant uuid := '3e4dfa36-8fdb-4716-8ba6-37aa1548b8d3'::uuid;
  rejected_game_finding_id constant uuid := 'ec9c524f-a48b-4d83-a199-05a63227aecf'::uuid;
  rejected_music_finding_id constant uuid := 'a3d312ed-c7c6-4bfd-a5b5-ee9b313666f6'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'the-gracchi-brothers'
      AND p.nickname = '그라쿠스 형제'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '그라쿠스 형제 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '그라쿠스 형제 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id,
    '2026-07-30-the-gracchi-brothers-empty-v1', 'Codex',
    ARRAY['그라쿠스 형제', 'Gracchi brothers', 'the Gracchi', 'Tiberius Gracchus', 'Gaius Gracchus', 'Caius Gracchus', 'Tiberius and Gaius Gracchus'],
    '공화정 후기의 티베리우스 셈프로니우스 그라쿠스와 가이우스 셈프로니우스 그라쿠스 형제를 동명인 부친·조상, 후대 그라쿠스 가문 인물, 형제를 소재로 한 작품과 분리했다.',
    '플루타르코스의 두 전기와 주석이 인용한 키케로 전승을 중심으로 BOOK·VIDEO·GAME·MUSIC을 조사했다. 형제는 코르넬리아에게 높은 수준의 그리스 교육을 받았고 티베리우스는 수사학자 디오파네스·철학자 블로시우스와 교류했지만 개별 책 제목은 전하지 않는다. 대중 연설, 군 복무와 전쟁은 본인 활동이고 가이우스의 음성을 조절한 리키니우스의 단음은 곡 감상이 아니다. 형제 모두에게 적용되는 작품 단위 소비 증거가 없어 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '그리스 언어·수사학·철학 교육의 개별 서명 미상 자료', '디오파네스·블로시우스 등', NULL,
      '플루타르코스는 형제가 세심한 교육을 받아 그리스 언어와 철학에 밝았다고 하고 티베리우스와 디오파네스·블로시우스의 관계를 전한다.',
      '교사·학문 분야는 확인되지만 형제가 읽은 특정 외부 저술의 제목은 전하지 않는다. 가이우스가 남긴 형 관련 기록과 형제의 연설은 본인 저술이라 감상 콘텐츠에서 제외했다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '로마 민회 연설·법정 변론과 후대 그라쿠스 형제 극화', NULL, NULL,
      '두 형제의 웅변과 가이우스의 법정·민회 연설은 상세히 전하며 후대에는 그들을 소재로 한 무대·영상물이 생겼다.',
      '연설은 본인이 수행한 정치 활동이고 후대 극화는 생전 관람작이 아니다. 형제가 관람한 제목 있는 극·공연은 식별되지 않는다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '누만티아·카르타고·사르디니아 군 복무와 후대 전략 게임', NULL, NULL,
      '티베리우스와 가이우스의 실제 군 복무·전쟁 경험은 전기에 기록된다.',
      '실제 전쟁·군사 훈련은 디지털 GAME 플레이가 아니며 후대 로마 전략 게임은 형제의 소비작이 아니다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '리키니우스가 가이우스의 연설 음성을 조절한 음정관 단음', '리키니우스', NULL,
      '플루타르코스와 키케로 전승은 리키니우스가 가이우스 뒤에서 악기 또는 상아관으로 알맞은 단음을 내어 목소리를 조절했다고 전한다.',
      '연설 보조용 단음은 곡명·작곡가가 있는 음악 감상이 아니며 가이우스 한 사람의 기능적 사용일 뿐 형제 프로필의 콘텐츠로 일반화할 수도 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '그라쿠스 형제 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://sourcebooks.web.fordham.edu/ancient/plutarch-tiberiusandgaiusgracchus-long.asp',
      'primary', 'archive', 'accessible',
      'Plutarch, Lives of Tiberius and Gaius Gracchus — Fordham Sourcebook',
      '형제의 세심한 그리스 교육과 티베리우스의 교사·철학자 관계를 확인했지만 개별 독서 서명은 없다.'
    ),
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://classics.mit.edu/Plutarch/tiberius.html',
      'primary', 'archive', 'accessible',
      'Tiberius Gracchus by Plutarch — MIT Classics',
      '디오파네스·블로시우스의 영향과 가이우스가 남긴 형 관련 글을 확인하고 교사 관계·본인 저술을 외부 독서와 분리했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://classics.mit.edu/Plutarch/gracchus.html',
      'primary', 'archive', 'accessible',
      'Caius Gracchus by Plutarch — MIT Classics',
      '가이우스의 웅변 연구와 법정·민회 연설을 확인했으나 이는 본인 공연이며 관람작이 아니다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://sourcebooks.web.fordham.edu/ancient/plutarch-tiberiusandgaiusgracchus-long.asp',
      'primary', 'archive', 'accessible',
      'Plutarch, Lives of Tiberius and Gaius Gracchus — Fordham Sourcebook',
      '카르타고·누만티아·사르디니아의 실제 군 복무를 디지털 GAME 소비와 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://sourcebooks.web.fordham.edu/ancient/plutarch-tiberiusandgaiusgracchus-long.asp',
      'primary', 'archive', 'accessible',
      'Plutarch, Lives of Tiberius and Gaius Gracchus — Fordham Sourcebook',
      '리키니우스의 악기·상아관 단음이 연설 음성 조절 장치였음을 확인하고 음악 작품 감상에서 제외했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '그라쿠스 형제 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'Gracchi·Tiberius·Gaius와 read·book·education·Diophanes·Blossius 조합을 조사했다. 그리스 교육과 교사 관계는 있으나 개별 서명이 없어 기각했다.'
        WHEN 'VIDEO' THEN 'watched·theatre·performance·oratory 조합을 조사했다. 법정·민회 연설은 본인 활동이고 제목 있는 외부 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·war·Numantia·Sardinia 조합을 조사했다. 실제 군 복무와 후대 전략 게임은 본인의 디지털 GAME 소비가 아니다.'
        WHEN 'MUSIC' THEN 'music·song·pipe·Licinius·speech 조합을 조사했다. 음정관의 단음은 연설 보조 신호로 곡명·작곡가를 가진 감상작이 아니다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '그라쿠스 형제 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '그라쿠스 형제 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '그라쿠스 형제 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
