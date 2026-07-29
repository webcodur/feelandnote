-- 다리우스 1세 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 왕명 비문·궁정 공연·사냥은 확인되지만 개별 외부 작품 소비는 식별되지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'c7c58a04-0d7d-480a-8a51-3259847bc76f'::uuid;
  target_run_id constant uuid := '7a31326c-b26a-49a8-9f48-3bd1808e4d73'::uuid;
  rejected_book_finding_id constant uuid := '32159552-3ad5-4453-b2f2-c7bd25b1e7bc'::uuid;
  rejected_video_finding_id constant uuid := 'ba580cc8-eab7-472d-81de-334a9f25f6ff'::uuid;
  rejected_game_finding_id constant uuid := '87d306e5-cd7c-42de-a773-76196b6eabcd'::uuid;
  rejected_music_finding_id constant uuid := '27c78781-b852-45fb-bed6-8d1c375275ad'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'darius-i'
      AND p.nickname = '다리우스 1세'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '다리우스 1세 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '다리우스 1세 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id,
    '2026-07-30-darius-i-empty-v1', 'Codex',
    ARRAY['다리우스 1세', 'Darius I', 'Darius the Great', 'Dareios I', 'Dārayavahuš', '𐎭𐎠𐎼𐎹𐎺𐎢𐏁'],
    '아케메네스 왕 다리우스 1세를 다리우스 2세·3세, 메디아의 다리우스, 후대 다리우스 소재 책·영화·게임에서 분리했다.',
    '베히스툰·나크셰로스탐 비문, 페르세폴리스 문서와 현대 아케메네스 궁정·음악 연구를 대조해 BOOK·VIDEO·GAME·MUSIC을 조사했다. 다리우스는 자기 왕권 서사를 여러 언어의 비문·점토판·가죽 문서로 제작·배포했고 궁정에는 공연자와 음악가가 있었으며 사냥 능력도 왕의 덕목으로 기록된다. 그러나 왕명 기록은 자기 제작물·행정 매체이고, 궁정 공연은 특정 작품명이나 개인 청취가 없으며 사냥은 실제 활동이어서 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '베히스툰 비문과 왕명 문서 사본', '다리우스 1세 왕실 서기관단', NULL,
      '다리우스는 즉위와 반란 진압의 왕권 서사를 고대 페르시아어·엘람어·바빌로니아어로 새기고 사본을 점토판과 가죽에 만들어 제국에 배포했다.',
      '비문과 사본은 다리우스가 발주한 자기 왕권 기록이자 행정 선전물이다. 외부 저자의 제목 있는 책을 개인적으로 읽었다는 근거가 아니므로 BOOK 소비에서 제외했다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '아케메네스 궁정의 시·춤·공연과 왕실 의례', NULL, NULL,
      '아케메네스 궁정 연구는 왕실 행사에 음악가·무용수·공연자가 있었음을 보여 준다.',
      '궁정 문화 일반론은 다리우스가 본 제목 있는 극·공연 작품을 특정하지 않는다. 왕실 의례와 부조도 외부 VIDEO 관람작이 아니다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '다리우스의 사냥·궁술과 스키타이·그리스 원정', NULL, NULL,
      '왕묘 비문 전승은 다리우스의 뛰어난 궁술·사냥 능력을 강조하고 사료는 실제 원정을 상세히 기록한다.',
      '사냥과 전쟁은 실제 신체·군사 활동이지 디지털 GAME 플레이가 아니며, 후대 전략 게임은 본인의 소비작이 아니다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '아케메네스 궁정의 여성 음악가·가수와 의례 음악', NULL, NULL,
      '아케메네스 궁정에는 여성 음악가·가수와 춤 공연이 있었다는 시대 자료와 후대 기록이 남아 있다.',
      '다리우스 1세가 들은 곡명·작곡자·연주자가 연결되는 개별 작품 기록은 없다. 왕조 일반과 다리우스 3세 궁정 자료를 1세에게 소급하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '다리우스 1세 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://www.livius.org/articles/person/darius-the-great/2-sources/',
      'secondary', 'article', 'accessible',
      'Darius the Great: Sources — Livius',
      '베히스툰 비문과 페르세폴리스 행정 문서를 다리우스 시대의 자기 기록·왕실 자료로 확인했다.'
    ),
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://www.iranicaonline.org/articles/bisotun-iii/',
      'secondary', 'article', 'accessible',
      'BISOTUN iii. Darius’s Inscriptions — Encyclopaedia Iranica',
      '다국어 왕명 비문의 형성과 사본 전승을 대조하고 외부 저작 독서와 구별했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://onlinelibrary.wiley.com/doi/10.1002/9781119071860.ch96',
      'secondary', 'article', 'accessible',
      'Poetry, Music, and Dance — A Companion to the Achaemenid Persian Empire',
      '왕실 행사에 음악가·무용수·공연자가 있었다는 궁정 일반 자료를 확인했으나 개별 관람작은 없다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://www.iranicaonline.org/articles/hunting-in-iran/',
      'secondary', 'article', 'accessible',
      'Hunting in Iran i. In the Pre-Islamic Period — Encyclopaedia Iranica',
      '다리우스의 궁술·사냥 능력 전승을 실제 왕실 활동으로 확인해 디지털 GAME과 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://www.iranicaonline.org/articles/music-history/music-history-i-pre-islamic-iran/',
      'secondary', 'article', 'accessible',
      'Music History i. Pre-Islamic Iran — Encyclopaedia Iranica',
      '아케메네스 음악 자료의 시대·왕 구분을 확인해 다리우스 3세의 가수 기록을 다리우스 1세에게 소급하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '다리우스 1세 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'Darius I·다리우스 1세와 read·book·inscription·Behistun·Avesta 조합을 조사했다. 왕명 비문·사본은 자기 제작 행정 기록이고 외부 서명 독서는 없다.'
        WHEN 'VIDEO' THEN 'watched·theatre·performance·court·dance 조합을 조사했다. 궁정 공연 일반 외에 제목·창작자 있는 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·hunt·archery·war 조합을 조사했다. 사냥·궁술·원정은 실제 활동이고 후대 전략 게임은 본인의 소비가 아니다.'
        WHEN 'MUSIC' THEN 'music·song·heard·singer·court 조합을 조사했다. 왕조 일반과 다리우스 3세 자료를 분리했으며 다리우스 1세의 곡명 있는 청취작은 없다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '다리우스 1세 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '다리우스 1세 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '다리우스 1세 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
