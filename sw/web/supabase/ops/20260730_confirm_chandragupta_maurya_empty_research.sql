-- 찬드라굽타 마우리아 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 『아르타샤스트라』 관계, 궁정 공연·사냥·음악 전승은 작품 단위 개인 소비 근거가 아니다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '38450700-d87a-4185-9f2b-f77481ca911e'::uuid;
  target_run_id constant uuid := '9b20b182-dbe2-41a2-9e8a-a9b769bbc961'::uuid;
  rejected_book_finding_id constant uuid := 'd05b6939-4746-4bbc-b675-6f8a186ab318'::uuid;
  rejected_video_finding_id constant uuid := '9f67de82-4c60-4452-afb3-9f047b42a9b1'::uuid;
  rejected_game_finding_id constant uuid := '84a57fb3-2c3c-4eeb-abc3-e8f9838af338'::uuid;
  rejected_music_finding_id constant uuid := 'b51d08ee-28a7-427d-9458-e8108fd9067b'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'chandragupta-maurya'
      AND p.nickname = '찬드라굽타 마우리아'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '찬드라굽타 마우리아 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '찬드라굽타 마우리아 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id,
    '2026-07-30-chandragupta-maurya-empty-v1', 'Codex',
    ARRAY['찬드라굽타 마우리아', '찬드라굽타', 'Chandragupta Maurya', 'Chandragupta', 'Sandracottus', 'Sandrokottos'],
    '마우리아 제국 창건자 찬드라굽타(기원전 4세기)를 굽타 왕조의 찬드라굽타 1·2세, 후대 드라마·영화 속 인물과 분리했다. 아쇼카의 기록과 찬드라굽타의 기록도 구별했다.',
    '그리스·로마의 메가스테네스 전승, 현대 학술 연구, 후대 자이나교 전승을 대조해 네 유형을 조사했다. 『아르타샤스트라』는 복합 성립과 카우틸리야·차나키야 동일성 논쟁이 있고 찬드라굽타의 직접 독서 진술이 없다. 궁정 공연과 사냥은 작품 단위 관람·게임이 아니며, 여성 호위대가 인도 음악으로 잠재웠다는 전승도 곡명·연주자를 전하지 않는다. 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '아르타샤스트라', '카우틸리야 전승', NULL,
      '후대 전승은 카우틸리야·차나키야를 찬드라굽타의 스승·재상으로 연결하고 『아르타샤스트라』를 통치술 저작으로 본다.',
      '현대 연구는 텍스트의 복합 성립과 저자 동일성을 논쟁 중이며, 찬드라굽타가 완성된 특정 판본을 읽었다는 직접 진술이 없다. 정책 영향에서 독서를 추론하지 않았다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '궁정 공연과 후대 찬드라굽타 영화·드라마', NULL, NULL,
      '메가스테네스 전승은 궁정 생활과 연예를 묘사하며 후대에는 찬드라굽타 소재 작품이 제작됐다.',
      '궁정 오락은 제목 있는 특정 극을 식별하지 못하고 후대 영상은 사후 재현이므로 개인 관람작이 아니다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '왕실 사냥·군사 활동과 후대 전략 게임', NULL, NULL,
      '왕실 사냥과 제국 정복·군사 운영은 고대 자료와 후대 서술에 나타난다.',
      '실제 사냥·전쟁은 디지털 GAME이 아니며 현대 전략 게임 속 등장은 본인의 플레이 기록이 아니다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '잠자리의 인도 음악', NULL, NULL,
      '메가스테네스 전승을 인용한 역사서는 여성 호위대가 지친 왕을 방으로 옮기고 인도 음악으로 잠재웠다고 적는다.',
      '실제 청취 가능성은 있으나 곡명·창작자·연주자가 전하지 않는다. 장르 수준 기록을 임의의 현대 음원에 연결하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '찬드라굽타 마우리아 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://www.worldhistory.org/Arthashastra/',
      'secondary', 'article', 'accessible',
      'Arthashastra — World History Encyclopedia',
      '카우틸리야·차나키야·찬드라굽타 관계의 전승과 통치술 저작 성격을 확인했다.'
    ),
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://www.cambridge.org/core/services/aop-cambridge-core/content/view/70C83EB49C6C8593AF2F96D6FC41B643/S0010417525000027a.pdf/alexander-and-the-elephants.pdf',
      'secondary', 'article', 'accessible',
      'Alexander and the Elephants — Comparative Studies in Society and History',
      '메가스테네스 원전은 단편·후대 의역으로만 남아 전승 평가에 주의가 필요함을 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://www.metmuseum.org/essays/mauryan-empire-ca-323-185-b-c',
      'secondary', 'official_profile', 'accessible',
      'Mauryan Empire (ca. 323–185 B.C.) — The Metropolitan Museum of Art',
      '왕조·궁정 문화의 역사적 범위를 확인하고 후대 영상 재현과 분리했다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://www.cambridge.org/core/services/aop-cambridge-core/content/view/1EC48FFF9D6567A5CEAF486A16EC36F3/S0010417521000074a.pdf/div-class-title-megasthenes-on-the-military-livestock-of-chandragupta-and-the-making-of-the-first-indian-empire-div.pdf',
      'secondary', 'article', 'accessible',
      'Megasthenes on the Military Livestock of Chandragupta — Cambridge Core',
      '전쟁·군사 동물·사냥 같은 실제 활동을 후대 디지털 GAME과 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://rarebooksocietyofindia.org/book_archive/196174216674_10156881205891675.pdf',
      'primary', 'archive', 'accessible',
      'The Maurya Empire — University of Delhi digital scan',
      'Strabo 15.1.55와 메가스테네스 단편을 인용한 잠자리 인도 음악 대목을 확인했지만 곡명·연주자는 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '찬드라굽타 마우리아 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'Chandragupta·Sandracottus와 read·book·Arthashastra 조합을 조사했다. 저자·성립 논쟁과 직접 독서 진술 부재로 기각했다.'
        WHEN 'VIDEO' THEN 'watched·theatre·performance·film 조합을 조사했다. 궁정 오락은 작품명이 없고 후대 영상은 사후 재현이다.'
        WHEN 'GAME' THEN 'game·played·hunt·war 조합을 조사했다. 실제 사냥·전쟁과 현대 전략 게임을 개인의 디지털 GAME 소비에서 분리했다.'
        WHEN 'MUSIC' THEN 'music·song·heard·court 조합을 조사했다. 인도 음악으로 잠들었다는 전승은 있으나 곡명·창작자·연주자가 없어 등록하지 않았다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '찬드라굽타 마우리아 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '찬드라굽타 마우리아 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '찬드라굽타 마우리아 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
