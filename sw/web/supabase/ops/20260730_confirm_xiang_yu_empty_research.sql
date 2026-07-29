-- 항우 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  어릴 때 글을 배움 — 작품명 없는 문자 학습
--   MUSIC 해하가 — 본인이 지어 부른 노래
--   MUSIC 사면초가 — 곡명·가수명 미상인 심리전 노래

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '58cd2012-c679-48bc-8600-f71247aa31cb'::uuid;
  target_run_id constant uuid := 'd4f48dbd-a4d5-446c-8da5-68768c98f933'::uuid;
  rejected_study_id constant uuid := '202837a8-ca9a-4b82-b410-eeb47f9b3f83'::uuid;
  rejected_gaixia_id constant uuid := 'adeab739-5b8c-49ed-afe2-4ab9deba5b2f'::uuid;
  rejected_chu_songs_id constant uuid := '6ab575f7-c755-4476-a4a7-540b6549c83f'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id AND p.slug = 'xiang-yu'
      AND p.nickname = '항우' AND p.profile_type = 'CELEB'
      AND p.status = 'active' AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '항우 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id) THEN
    RAISE EXCEPTION '항우에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_study_id, rejected_gaixia_id, rejected_chu_songs_id)
  ) THEN
    RAISE EXCEPTION '항우 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id, '2026-07-30-xiang-yu-full-v1', 'Codex',
    ARRAY['항우', '항적', '項羽', '項籍', 'Xiang Yu', 'Xiang Ji', 'Hsiang Yü'],
    '경극 《패왕별희》·천카이거 영화·현대 드라마·소설·게임과 항우를 소재로 한 노래는 제외했다. 진말초한의 서초패왕 항우와 동명 현대인을 구분했다.',
    '한국어·한문·영어 이름 변형으로 네 유형을 검색하고 사마천 『사기』 「항우본기」 원문·영역을 대조했다. 어릴 때 글을 배웠다는 기록은 작품명 없는 문자 학습이며 검술·병법을 배우려 한 것은 신체·군사 기술이다. 해하에서 초나라 노래를 듣고 놀란 사면초가 일화는 실제 청취지만 곡명과 가수 이름이 없고, 이어 부른 「해하가」는 항우 본인의 창작이다. 특정 영상·디지털 게임 작품도 없어 네 유형 모두 채택 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_study_id, target_run_id, 'BOOK', 'rejected',
      '작품명 미상의 문자 학습', '스승 미상', NULL,
      '『사기』 「항우본기」는 항적이 어릴 때 글을 배웠으나 이루지 못하고 그만두었으며 이어 검술을 배웠다고 전한다.',
      '원문의 학서(學書)는 특정 제목의 책 독서가 아니라 글자·문자 교육으로 읽힌다. 교재·저자·판본이 전하지 않아 BOOK 작품으로 식별할 수 없다.'
    ),
    (
      rejected_gaixia_id, target_run_id, 'MUSIC', 'rejected',
      '해하가', '항우', NULL,
      '『사기』는 해하에서 항우가 우미인과 술을 마시며 자신의 힘과 패배를 읊은 노래를 지어 여러 번 부르고 우미인이 화답했다고 전한다.',
      '항우 본인이 지어 부른 창작물이며 외부 음악 소비가 아니다. 당시 선율·공연판·현대 음원과의 동일성도 검증할 수 없다.'
    ),
    (
      rejected_chu_songs_id, target_run_id, 'MUSIC', 'rejected',
      '해하 포위망의 초나라 노래들', '한군 병사들', NULL,
      '『사기』는 한군과 제후군이 밤에 사방에서 초나라 노래를 부르자 항우가 초나라가 모두 한에 넘어갔다고 놀랐다고 기록한다.',
      '항우의 실제 청취는 확인되지만 어떤 노래를 누가 불렀는지 제목·작자·가사가 전하지 않는다. 사면초가는 상황을 가리키는 후대 성어이지 단일 곡명이 아니다.'
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '항우 조사 finding 생성 행 수가 3이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_study_id,
      'https://ctext.org/shiji/xiang-yu-ben-ji',
      'primary', 'archive', 'accessible', 'Shiji, Annals of Xiang Yu',
      '항우가 어릴 때 글과 검술을 배웠으나 그만두었다는 원문·영역을 확인했다. 책 제목은 없다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_gaixia_id,
      'https://ctext.org/shiji/xiang-yu-ben-ji/ens',
      'primary', 'archive', 'accessible', 'Shiji: Song of Gaixia',
      '항우가 해하에서 직접 노래를 지어 여러 번 불렀다는 기록을 확인했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_chu_songs_id,
      'https://ctext.org/shiji/xiang-yu-ben-ji/ens',
      'primary', 'archive', 'accessible', 'Shiji: Chu songs on all sides',
      '사방의 초나라 노래를 듣고 항우가 놀랐다는 기록과 곡명·가수명 부재를 확인했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_gaixia_id,
      'https://cir.nii.ac.jp/crid/1390009224843135744',
      'secondary', 'article', 'accessible', 'Songs and legends in Shi ji',
      '『사기』 속 「해하가」가 항우 자신의 감정을 표현한 노래로 전승된다는 연구를 대조했다.'
    ),
    (
      target_run_id, 'VIDEO', NULL,
      'https://ctext.org/shiji/xiang-yu-ben-ji/ens',
      'primary', 'archive', 'accessible', 'Shiji, Annals of Xiang Yu',
      '연회·전쟁·노래 장면을 watched·theatre·performance 조합과 대조했다. 특정 관람 작품은 없으며 《패왕별희》는 후대 재구성이다.'
    ),
    (
      target_run_id, 'GAME', NULL,
      'https://ctext.org/shiji/xiang-yu-ben-ji',
      'primary', 'archive', 'accessible', 'Shiji: swordsmanship and military method',
      '검술·병법 학습과 실제 전투는 디지털 GAME 플레이가 아니다.'
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '항우 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN '항우·항적·項羽·項籍·Xiang Yu와 read·book·學書·兵法 조합을 검색했다. 학서는 작품명 없는 문자 학습이고 병법·검술도 특정 책이 아니어서 제외했다.'
        WHEN 'VIDEO' THEN '항우와 watched·theatre·performance·opera 조합을 검색했다. 『사기』의 연회·노래 장면은 특정 관람 작품이 아니며 《패왕별희》 계열은 후대 창작물이다.'
        WHEN 'GAME' THEN '항우와 game·played·board game·swordsmanship·strategy 조합을 검색했다. 검술·병법과 실제 전쟁은 디지털 GAME이 아니다.'
        WHEN 'MUSIC' THEN '항우와 music·song·楚歌·垓下歌·四面楚歌 조합을 검색했다. 초나라 노래 청취는 곡명이 없고 「해하가」는 본인 창작이라 모두 기각했다.'
      END
  WHERE s.run_id = target_run_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '항우 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;
  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '항우 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '항우 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f WHERE f.run_id = r.id AND f.decision = 'rejected') = 3
      AND (SELECT count(*) FROM public.celeb_content_research_sources src WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '항우 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
