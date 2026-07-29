-- 오노노 고마치 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK   고킨와카슈·고마치슈 — 본인 시와 사후 편집물
--   VIDEO  고마치 노·가부키 — 사후 수세기 뒤 형성된 전설 각색
--   GAME   오구라 백인일수 가루타 — 사후 편찬 시집을 쓴 에도시대 물리 카드놀이
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '698f5d2d-8cc8-4652-8677-394c70a63456'::uuid;
  target_run_id constant uuid := '8697826f-3f2c-4e2e-84b1-5fcf0b6f3ef0'::uuid;
  rejected_book_finding_id constant uuid := 'c9789eac-13df-4613-8196-2b12cd4d938e'::uuid;
  rejected_video_finding_id constant uuid := '43a72f93-6e60-41c4-a74c-94eb4ca18b10'::uuid;
  rejected_game_finding_id constant uuid := '8c2aade0-f86f-4795-a093-089910da5f20'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'ono-no-komachi'
      AND p.nickname = '오노노 고마치'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '오노노 고마치 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '오노노 고마치에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      rejected_book_finding_id,
      rejected_video_finding_id,
      rejected_game_finding_id
    )
  ) THEN
    RAISE EXCEPTION '오노노 고마치 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-ono-no-komachi-full-v1',
    'Codex',
    ARRAY['오노노 고마치', '小野小町', 'Ono no Komachi', 'Ono-no-Komachi', 'Komachi'],
    '9세기 와카 시인으로 전승되는 오노노 고마치를 고마치라는 일반 미인 호칭, 지역·열차명, 후대 노·가부키·우키요에·게임 캐릭터와 분리했다. 《고킨와카슈》·《고마치슈》에 실린 본인 시는 외부 독서 콘텐츠에서 제외했다.',
    '일본어·영어·한국어 이름 변형으로 네 유형을 조사하고 도쿄대, 일본 국립극장 디지털라이브러리, 일본·유럽 박물관과 문학 연구를 대조했다. 역사적 생애는 거의 알려지지 않고 현존 정보의 상당수가 12세기 이후 전설·연극에서 형성됐다. 시적 교환은 본인 작품과 사후 편집 시집이며, 고마치 노·가부키와 백인일수 가루타는 사후 각색·물리 놀이이다. 제목 있는 음악 소비도 없어 0건으로 완료했다.'
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
      '고킨와카슈·고마치슈',
      '오노노 고마치 및 후대 편자',
      NULL,
      '고마치의 현존 정보는 《고킨와카슈》에 보존된 본인 와카와 시적 교환, 후대 개인 시집 편집에서 주로 나온다.',
      '본인 창작 시와 사후 편집물이다. 교환 상대의 개별 와카를 서비스 BOOK 작품으로 식별할 판본·외부 메타데이터도 없다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '고마치 노·가부키',
      NULL,
      NULL,
      '일본 국립극장 디지털라이브러리와 문학 연구는 오노노 고마치를 소재로 한 여러 노·가부키 전승을 정리한다.',
      '역사적 고마치보다 수세기 뒤 만들어진 전설 각색물이다. 본인이 관람한 작품이 아니며 후대 공연·녹화물을 역등록할 수 없다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '오구라 백인일수 가루타',
      '후지와라노 데이카 편찬·에도시대 카드놀이',
      NULL,
      '고마치의 와카 한 수는 13세기 후지와라노 데이카가 편찬한 《오구라 백인일수》에 들어갔고, 이를 활용한 가루타는 에도시대에 나타났다.',
      '고마치 사후 수세기 뒤 편찬·게임화된 물리 카드놀이다. 본인이 플레이한 디지털 GAME이 아니다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '오노노 고마치 조사 finding 생성 행 수가 3이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.varldskulturmuseerna.se/siteassets/pdf/bmfea/bulletin-no76_bmfea.pdf',
      'secondary',
      'article',
      'accessible',
      'Semiotic-Structural Aspects of Ono no Komachi’s Poetry',
      '현존 전기 정보가 시집 머리말·후대 문학에 의존하며 사실과 허구가 얽혀 있음을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      NULL,
      'https://www.u-tokyo.ac.jp/focus/en/features/z0508_00097.html',
      'secondary',
      'official_profile',
      'accessible',
      'A legendary beauty? — The University of Tokyo',
      '고마치에 관해 전설은 많지만 확실한 사실은 극히 적다는 연구자 설명을 독서·작품명 검색의 기준선으로 삼았다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://www2.ntj.jac.go.jp/dglib/modules/kabuki_dic_en/entry.php?entryid=1052',
      'secondary',
      'official_profile',
      'accessible',
      'Kabuki A to Z: Ono no Komachi',
      '다양한 고마치 전설이 노와 가부키의 소재가 됐음을 확인해 사후 각색물로 분리했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://www.samac.jp/en/collection/',
      'secondary',
      'official_profile',
      'accessible',
      'Ogura Hyakunin Isshu — Saga Arashiyama Museum',
      '시집은 13세기 데이카 편찬이며 가루타 세트는 에도시대에 등장했다고 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://doaj.org/article/7059ddcc0095429791d71096bb048186',
      'secondary',
      'article',
      'accessible',
      'How to Create a Legend? Ono no Komachi in Medieval Literature',
      '중세 이후 고마치 표상이 형성된 과정을 music·song·performance 조합과 대조했다. 후대 창작 외 본인이 감상한 특정 곡은 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '오노노 고마치 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '小野小町·Ono no Komachi와 読書·愛読書·read·book·Kokinshu·Komachishu 조합을 검색했다. 현존 제목은 본인 시·사후 편집물이며 특정 외부 독서 기록은 없다.'
      WHEN 'VIDEO' THEN
        '観劇·能·歌舞伎·watched·theatre·performance 조합을 검색했다. 고마치 노·가부키는 중세 이후 전설 각색이며 생전 관람 작품은 없다.'
      WHEN 'GAME' THEN
        'game·played·karuta·百人一首·遊び 조합을 검색했다. 백인일수는 13세기 편찬, 가루타는 에도시대 물리 놀이여서 고마치 개인의 디지털 GAME 이용이 아니다.'
      WHEN 'MUSIC' THEN
        'music·song·歌·音楽·聞く·performance 조합을 문학·전설 연구에서 검색했다. 와카 창작과 후대 음악·무대 각색 외 제목 있는 음악 소비 기록은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '오노노 고마치 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '오노노 고마치 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '오노노 고마치 프로필·0건 확정 최종 검증에 실패했습니다.';
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
           WHERE src.run_id = r.id) = 5
  ) THEN
    RAISE EXCEPTION '오노노 고마치 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
