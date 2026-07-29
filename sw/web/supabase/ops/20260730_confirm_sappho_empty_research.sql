-- 사포 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 본인의 시·노래와 호메로스계 서사 사용은 확인되지만 외부 작품 소비로 확정할 수 없다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '7298ae3c-f94f-4e92-9f63-17dddddce54d'::uuid;
  target_run_id constant uuid := '621562cb-b468-4dc7-859e-44735db38747'::uuid;
  rejected_book_finding_id constant uuid := '3b8bd486-6953-48cd-960d-602f0f2cb719'::uuid;
  rejected_video_finding_id constant uuid := '61c481fc-3fa4-4a18-bf7e-291ec9887c10'::uuid;
  rejected_game_finding_id constant uuid := '87f83288-d554-4d9c-b3c4-8a4c3fa18037'::uuid;
  rejected_music_finding_id constant uuid := '40764394-d369-4ef2-baa7-9045aedebca0'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'sappho'
      AND p.nickname = '사포'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '사포 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '사포 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id,
    '2026-07-30-sappho-empty-v1', 'Codex',
    ARRAY['사포', 'Sappho', 'Psappha', 'Psappho', 'Σαπφώ', 'Sappho of Lesbos'],
    '기원전 7~6세기 레스보스의 시인 사포를 고대 희극이 만든 동명이인 전승, 후대의 사포 소재 작품, 현대 작가·밴드·게임 이름과 분리했다.',
    '현존 단편·고대 증언의 한계와 현대 고전학 연구를 대조해 BOOK·VIDEO·GAME·MUSIC을 조사했다. 44번 단편은 헥토르와 안드로마케의 결혼을 노래하며 호메로스계 언어와 트로이 전승을 사용하지만 사포가 특정 판본의 『일리아스』를 읽었다는 기록은 아니다. 시는 음악 공연을 위해 쓰였지만 모두 본인의 창작물이고 선율도 남지 않았다. 후대 연극·영상·게임과 본인의 감상을 분리해 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '트로이 전승과 호메로스계 서사', '호메로스계 구전 전통', NULL,
      '사포 44번 단편은 헥토르와 안드로마케의 결혼을 노래하고 호메로스계 어휘와 서사 형식을 사용한다.',
      '상호텍스트성과 공유 구전 전통은 특정 서명·판본의 독서 증거가 아니다. 사포가 『일리아스』를 읽었다고 확정하는 동시대 진술이 없어 작품을 임의 등록하지 않았다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '사포의 노래 공연과 후대의 사포 소재 무대·영상', NULL, NULL,
      '사포의 시는 음악에 맞춰 본인 또는 다른 사람이 공연했으며 후대 희극·연극은 사포를 무대 인물로 삼았다.',
      '본인 창작물의 공연은 외부 감상작에서 제외하고, 후대의 사포 소재 작품은 생전 관람작일 수 없다. 제목 있는 외부 극 관람 기록도 없다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '고대 시가 활동·현대 사포 소재 게임', NULL, NULL,
      '사포의 시가·교육 활동과 후대 문화에서의 이름 사용은 확인된다.',
      '고대 시가 활동은 디지털 GAME 플레이가 아니고 현대의 사포 소재 게임은 본인 사후 제작물이다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '사포 자신의 서정시·혼가·찬가의 음악 공연', '사포', NULL,
      '현존 단편은 본래 음악에 맞춰 공연된 노래였고 사포가 직접 연주하거나 다른 이가 공연한 것으로 연구된다.',
      '본인의 창작·공연물은 감상 콘텐츠에서 제외한다. 동반 선율은 전하지 않고 외부 작곡가의 곡명도 식별되지 않아 별도 음악 소비작으로 등록할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '사포 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://chs.harvard.edu/primary-source/sappho-sb/',
      'primary', 'archive', 'accessible',
      'Selections from Sappho — Center for Hellenic Studies',
      '44번 단편의 헥토르·안드로마케 서사를 원문 번역으로 확인했으나 외부 책을 읽었다는 진술은 아니다.'
    ),
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://assets.cambridge.org/97811088/31680/excerpt/9781108831680_excerpt.pdf',
      'secondary', 'article', 'accessible',
      'Sappho, 2nd Edition — Cambridge University Press excerpt',
      '생애 자료의 불확실성, 44번 단편의 epic-like 성격, 노래의 구전·문자 전승을 함께 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://www.poetryfoundation.org/poets/sappho',
      'secondary', 'official_profile', 'accessible',
      'Sappho — Poetry Foundation',
      '사포 생애 자료의 희소성과 후대 희극·무대 재현을 확인하고 본인의 실제 관람작과 분리했다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://assets.cambridge.org/97811088/31680/excerpt/9781108831680_excerpt.pdf',
      'secondary', 'article', 'accessible',
      'Sappho, 2nd Edition — Cambridge University Press excerpt',
      '확인 가능한 생애·창작 활동의 범위에 개인의 작품 단위 GAME 플레이 기록이 없음을 점검했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://assets.cambridge.org/97811088/31680/excerpt/9781108831680_excerpt.pdf',
      'secondary', 'article', 'accessible',
      'Sappho, 2nd Edition — Cambridge University Press excerpt',
      '모든 시가 음악 공연용 노래였지만 선율은 하나도 전하지 않는다는 연구를 확인하고 본인 창작물과 외부 감상을 분리했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '사포 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'Sappho·사포와 read·book·Homer·Iliad·fragment 44 조합을 조사했다. 트로이 서사의 사용은 특정 『일리아스』 독서 증거가 아니어서 기각했다.'
        WHEN 'VIDEO' THEN 'watched·theatre·performance·comedy 조합을 조사했다. 본인 노래 공연과 후대 사포 소재 무대 외에 제목 있는 외부 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·contest 조합을 조사했다. 고대 시가 활동과 현대 사포 소재 게임은 본인의 디지털 GAME 소비가 아니다.'
        WHEN 'MUSIC' THEN 'music·song·lyre·heard·performed 조합을 조사했다. 확인되는 음악은 본인 창작 노래이고 선율·외부 곡명은 남지 않았다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '사포 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '사포 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '사포 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
