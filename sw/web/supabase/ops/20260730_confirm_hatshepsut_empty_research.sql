-- 하트셉수트 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  스페오스 아르테미도스 비문 — 본인 명의 왕실 선전 비문
--   VIDEO 푼트 원정 부조 — 정지 사원 벽화

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '70478a88-146b-4380-95b0-ae269ce3eb88'::uuid;
  target_run_id constant uuid := 'a8c648ae-752f-46a6-b7e6-128c21f260a5'::uuid;
  rejected_inscription_id constant uuid := '668f4c85-95fe-4682-810a-0fb3867575a4'::uuid;
  rejected_relief_id constant uuid := '30ce7671-5403-4508-b468-e20a914a6c6d'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id AND p.slug = 'hatshepsut'
      AND p.nickname = '하트셉수트' AND p.profile_type = 'CELEB'
      AND p.status = 'active' AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '하트셉수트 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id) THEN
    RAISE EXCEPTION '하트셉수트에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_inscription_id, rejected_relief_id)
  ) THEN
    RAISE EXCEPTION '하트셉수트 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id, '2026-07-30-hatshepsut-full-v1', 'Codex',
    ARRAY['하트셉수트', 'Hatshepsut', 'Hatchepsut', 'Hatshepsowe', 'Maatkare', 'Maat-ka-Re'],
    '현대 소설·다큐멘터리·게임·오페라의 하트셉수트와 이름을 차용한 프로젝트는 제외했다. 네페르티티·네페르타리 등 다른 이집트 왕비와도 구분했다.',
    '한국어·영어·왕명 변형으로 네 유형을 검색하고 UCL·대영박물관·메트로폴리탄미술관의 비문·부조·생애 자료를 대조했다. 스페오스 아르테미도스 비문은 하트셉수트가 자신의 신전 복원과 정통성을 선전하도록 새긴 왕실 텍스트이며 외부 독서물이 아니다. 데이르 엘바흐리의 푼트 원정·의례 부조는 정지 사원 벽화이고 왕의 상징적 의례 장면은 실제 개인 감상 기록과 다르다. 특정 디지털 게임이나 제목 있는 음악 작품 기록도 없어 네 유형 모두 채택 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_inscription_id, target_run_id, 'BOOK', 'rejected',
      '스페오스 아르테미도스 비문', '하트셉수트 명의의 왕실 서기관', NULL,
      '파케트 암굴 신전의 대형 비문은 하트셉수트의 왕명 아래 신전 복원·제의·정통성을 1인칭 왕실 담화로 기록한다.',
      '본인 명의로 신전에 새긴 왕실 선전·봉헌 비문이지 그가 읽고 감상한 외부 BOOK이 아니다.'
    ),
    (
      rejected_relief_id, target_run_id, 'VIDEO', 'rejected',
      '데이르 엘바흐리 푼트 원정 부조', '하트셉수트 신전 공방', NULL,
      '대영박물관 소장 신전 부조 조각은 하트셉수트 장제전 벽면의 푼트 원정 장면 일부다.',
      '정지 회화·부조이므로 VIDEO 범주가 아니며 하트셉수트가 완성물을 관람했다는 개인 감상 기록도 없다.'
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '하트셉수트 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_inscription_id,
      'https://www.ucl.ac.uk/museums-static/digitalegypt/temple/speos.html',
      'primary', 'archive', 'accessible', 'Speos Artemidos',
      '하트셉수트가 자신의 복원 사업과 정통성을 제시한 신전 비문이라는 맥락을 확인했다.'
    ),
    (
      target_run_id, 'BOOK', rejected_inscription_id,
      'https://www.ancientneareast.net/egypt/the-speos-artemidos-inscription-of-hatshepsut/',
      'primary', 'archive', 'accessible', 'The Speos Artemidos Inscription of Hatshepsut',
      'James P. Allen의 번역을 바탕으로 한 비문 전문에서 1인칭 왕실 담화와 제의 규정을 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_relief_id,
      'https://www.britishmuseum.org/collection/object/Y_EA50055',
      'primary', 'archive', 'accessible', 'Temple relief: expedition to Punt',
      '하트셉수트 신전의 푼트 원정 벽면 부조 조각임을 확인했다.'
    ),
    (
      target_run_id, 'VIDEO', NULL,
      'https://www.britishmuseum.org/collection/object/Y_EA782',
      'primary', 'archive', 'accessible', 'Relief from the Temple of Hatshepsut',
      '왕이 제의를 수행하는 사원 장면은 우주 질서를 나타내는 상징이며 실제 일상 수행과도 다르다는 박물관 주석을 확인했다.'
    ),
    (
      target_run_id, 'GAME', NULL,
      'https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/hatshepsut.html',
      'secondary', 'article', 'accessible', 'Hatshepsut, Digital Egypt for Universities',
      '생애·건축·원정 자료를 game·played·senet 조합과 대조했으나 개인의 특정 디지털 GAME 플레이 기록은 없었다.'
    ),
    (
      target_run_id, 'MUSIC', NULL,
      'https://www.metmuseum.org/met-publications/hatshepsut-from-queen-to-pharaoh',
      'secondary', 'archive', 'accessible', 'Hatshepsut: From Queen to Pharaoh',
      '하트셉수트 시대의 예술·의례·궁정 자료를 music·song·hymn·performance 조합과 대조했으나 제목 있는 개인 감상 음악은 없었다.'
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '하트셉수트 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN '하트셉수트·Hatshepsut·Maatkare와 read·book·inscription·annals 조합을 검색했다. 신전·오벨리스크 비문은 본인 명의 왕실 텍스트이며 특정 외부 책 독서가 아니다.'
        WHEN 'VIDEO' THEN '하트셉수트와 watched·relief·painting·performance 조합을 검색했다. 푼트 원정·신성 출생·제의 부조는 정지 사원 미술이며 개인이 본 VIDEO 작품이 아니다.'
        WHEN 'GAME' THEN '하트셉수트와 game·played·senet·board game 조합을 검색했다. 신왕국 일반 게임 자료 외에 하트셉수트 개인의 플레이 기록은 없었다.'
        WHEN 'MUSIC' THEN '하트셉수트와 music·song·hymn·sistrum·performance 조합을 검색했다. 아문·하토르 의례 일반은 확인되지만 곡명·연주자가 특정되는 개인 감상 기록은 없다.'
      END
  WHERE s.run_id = target_run_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '하트셉수트 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;
  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '하트셉수트 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '하트셉수트 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f WHERE f.run_id = r.id AND f.decision = 'rejected') = 2
      AND (SELECT count(*) FROM public.celeb_content_research_sources src WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '하트셉수트 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
