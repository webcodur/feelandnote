-- 테오도라 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   VIDEO  테오도라의 무대 경력 — 본인 공연이며 작품명도 전하지 않음
--   GAME   니카 반란 당시 전차경주 — 디지털 게임이 아닌 실제 경주·정치 사건
--   MUSIC  피리·하프·춤 관련 기록 — 본인의 기능 여부를 논한 적대적 전기이며 외부 감상곡 아님
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '73429b1c-5487-48a6-8660-eea1d159e289'::uuid;
  target_run_id constant uuid := '87ec2cea-7198-429c-8db1-a09005c9522c'::uuid;
  rejected_video_finding_id constant uuid := '64363d85-4117-43de-99fe-fa304496305a'::uuid;
  rejected_game_finding_id constant uuid := 'b0751fe2-f100-4047-92e8-caa468ed183b'::uuid;
  rejected_music_finding_id constant uuid := '1007d475-75be-4e2a-af4f-9d5bc533a5a6'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'theodora'
      AND p.nickname = '테오도라'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '테오도라 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '테오도라에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      rejected_video_finding_id,
      rejected_game_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '테오도라 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-theodora-full-v1',
    'Codex',
    ARRAY['테오도라', 'Theodora', 'Θεοδώρα', 'Theodora I', 'Empress Theodora'],
    '유스티니아누스 1세의 황후 테오도라를 동명의 성인·비잔티움 황후·공주, 헨델의 오라토리오와 현대 소설·게임 캐릭터에서 분리했다.',
    '영어·그리스어 이름 변형과 read·book·theatre·watched·chariot·game·music·song 조합으로 네 유형을 조사했다. 동시대 핵심 사료 프로코피오스는 적대적 수사 속에서 테오도라의 본인 무대 경력과 히포드롬 배경을 전한다. 현대 학술 자료와 대조했으나 특정 외부 도서 독서, 작품 관람, 디지털 게임 이용, 제목 있는 음악 청취는 확인되지 않았다. 본인 공연·실제 전차경주·후대 소재 작품을 제외해 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '테오도라의 무대 공연',
      '테오도라',
      NULL,
      '프로코피오스의 《비사》 9장은 어린 테오도라가 극장 무대에 섰다고 전하며 현대 극장사도 이를 본인의 공연 경력으로 다룬다.',
      '외부 작품을 관람한 기록이 아니라 본인 공연이다. 공연 제목·극작가·현대 영상 식별자도 없다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '콘스탄티노폴리스 히포드롬 전차경주',
      NULL,
      NULL,
      '니카 반란은 청색당·녹색당 전차경주 지지자들이 히포드롬에서 결집해 일어난 실제 정치·스포츠 사건이다.',
      '현실의 전차경주와 정치적 파벌 활동이다. 서비스 GAME 범주의 디지털 작품 플레이가 아니다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '피리·하프·춤 관련 무대 경력 서술',
      NULL,
      NULL,
      '프로코피오스는 테오도라가 피리나 하프 연주자가 아니며 춤에도 능하지 않았다고 적어 그녀의 무대 기능을 논한다.',
      '적대적 전기에서 본인의 공연 능력 유무를 말한 대목이다. 외부 창작자의 제목 있는 곡을 들었다는 기록이 아니다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '테오도라 조사 finding 생성 행 수가 3이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      NULL,
      'https://ccdl.claremont.edu/digital/collection/cce/id/1823/',
      'secondary',
      'official_profile',
      'accessible',
      'Theodora — Claremont Coptic Encyclopedia',
      '테오도라 생애의 주요 사료와 프로코피오스의 적대성을 대조했다. 종교 정책·성직자 보호와 별개로 특정 외부 도서 독서 기록은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Procopius/Anecdota/9%2A.html',
      'primary',
      'archive',
      'accessible',
      'Procopius, Anecdota, Chapter IX',
      '테오도라가 어린 시절 무대에 섰다는 동시대 서술을 확인하되 본인 공연으로 분리했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://assets.cambridge.org/97805211/00847/excerpt/9780521100847_excerpt.pdf',
      'secondary',
      'article',
      'accessible',
      'The Medieval European Stage, 500–1550 — excerpt',
      '현대 극장사가 테오도라 사례를 본인 무대 경력으로 다루는지 대조했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://assets.cambridge.org/97811089/31984/excerpt/9781108931984_excerpt.pdf',
      'secondary',
      'article',
      'accessible',
      'The Hippodrome of Constantinople — excerpt',
      '532년 니카 반란이 실제 전차경주와 청색당·녹색당 정치에서 일어났음을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Procopius/Anecdota/9%2A.html',
      'primary',
      'archive',
      'accessible',
      'Procopius, Anecdota, Chapter IX',
      '피리·하프·춤은 테오도라 자신의 무대 기능을 부정하는 서술이며 특정 감상곡이 아님을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://sourcebooks.web.fordham.edu/basis/procop-anec.asp',
      'primary',
      'archive',
      'accessible',
      'Procopius, The Secret History — Fordham Internet History Sourcebooks',
      '프로코피오스 번역 전문에서 music·song·harp·flute·dance와 테오도라 이름을 대조했다. 제목 있는 외부 음악 소비 기록은 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '테오도라 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Theodora·Θεοδώρα와 read·book·education·scripture·letter 조합을 검색하고 콥트 백과와 동시대 사료를 대조했다. 종교 정책·서신 관계 외에 본인이 읽었다고 명시된 특정 외부 저작은 없다.'
      WHEN 'VIDEO' THEN
        'actress·stage·theatre·watched·performance 조합을 검색했다. 확인되는 무대 관계는 테오도라 자신의 공연이며 작품명도 전하지 않는다. 후대 영화·연극은 본인 소재 작품이다.'
      WHEN 'GAME' THEN
        'game·played·chariot·Hippodrome·Blues·Greens 조합을 검색했다. 니카 반란의 전차경주는 실제 스포츠·정치 사건이며 디지털 GAME이 아니다.'
      WHEN 'MUSIC' THEN
        'music·song·harp·flute·dance·heard 조합을 검색했다. 악기·춤 대목은 본인의 무대 기능을 논한 것이며 특정 외부 곡 청취 기록은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '테오도라 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '테오도라 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '테오도라 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 3
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '테오도라 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
