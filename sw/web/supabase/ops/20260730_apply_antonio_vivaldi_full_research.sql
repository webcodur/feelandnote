-- 안토니오 비발디의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과와 콘텐츠 1건을 반영한다.
-- 채택: 1727년 오페라 《광란의 오를란도》 초판 대본이 아리오스토 서사시를 직접 원전으로 명시함.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'e3bee3c9-df5e-4ed9-9f8d-8b2299c409b0'::uuid;
  target_content_id constant text := '91d647cd-b485-44f5-8d92-01be724e3a4b';
  target_run_id constant uuid := 'c6a4d06c-8245-4731-92b3-0fb9ced4ee2b'::uuid;
  target_uc_id constant uuid := '8ef1e4b8-0c7b-439f-b6f6-e4a2fda25f7d'::uuid;
  book_finding_id constant uuid := '95787822-fc8d-44dc-9158-e5950e2eb5ea'::uuid;
  video_finding_id constant uuid := '07638987-e670-4d12-853b-4291edeaa2f6'::uuid;
  game_finding_id constant uuid := 'da44fd19-3302-4c81-8542-d05658964431'::uuid;
  music_finding_id constant uuid := 'e2b3fb54-affc-499b-ac26-92f4b97dd97e'::uuid;
  expected_user_count integer;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'antonio-vivaldi'
      AND p.nickname = '안토니오 비발디'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '안토니오 비발디 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = target_uc_id
  ) THEN
    RAISE EXCEPTION '안토니오 비발디 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  SELECT count(*)::integer + 1
  INTO expected_user_count
  FROM public.user_contents uc
  WHERE uc.content_id = target_content_id;

  IF expected_user_count <> 6 OR NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = target_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9791170873150'
      AND ko.title = '광란의 오를란도'
      AND ko.creator = '루도비코 아리오스토'
      AND ko.verified = true
      AND en.title = 'Orlando Furioso'
      AND en.creator = 'Lodovico Ariosto'
      AND en.verified = true
  ) THEN
    RAISE EXCEPTION '《광란의 오를란도》 기존 콘텐츠 기준선이 달라졌습니다. 예상 user_count=%',
      expected_user_count;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    target_uc_id,
    target_celeb_id,
    target_content_id,
    'FINISHED',
    '비발디의 1727년 오페라 《광란의 오를란도》 초판 대본은 아리오스토의 오를란도 이야기가 널리 알려져 있으며 “이 작품에서 현재의 극적 오락을 가져왔다”고 원전을 직접 밝힌다. 비발디가 음악을 붙인 대본 자체가 서사시를 창작의 재료로 삼았음을 보여 주는 동시대 1차 기록이다.',
    'The first-edition libretto of Vivaldi’s 1727 opera Orlando furioso explicitly says that its drama is drawn from Ariosto’s Orlando. Because this source text was the literary basis of the libretto Vivaldi set to music, it documents direct creative engagement with Ariosto’s epic.',
    'https://imslp.org/wiki/Orlando_furioso%2C_RV_728_%28Vivaldi%2C_Antonio%29',
    true
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '안토니오 비발디 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = target_content_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 OR (
    SELECT c.user_count FROM public.contents c WHERE c.id = target_content_id
  ) <> expected_user_count THEN
    RAISE EXCEPTION '《광란의 오를란도》 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-antonio-vivaldi-full-v1',
    'Codex',
    ARRAY['안토니오 비발디', '비발디', 'Antonio Vivaldi', 'Antonio Lucio Vivaldi', 'Il Prete Rosso'],
    '베네치아 작곡가 안토니오 비발디(1678~1741)를 동명의 후대 연주자, 음반·영화 제목 및 비발디 자신의 작품과 분리했다.',
    '이탈리아어·영어 이름과 leggere·libro·libretto·Ariosto·Orlando·Corelli·opera·teatro·musica·gioco 조합을 조사했다. 1727년 오페라 《Orlando furioso》 초판 대본의 원전 고지가 아리오스토 서사시에서 극을 취했다고 명시하므로, 비발디가 음악을 붙인 텍스트의 직접 창작 원천으로 BOOK 1건을 채택했다. 비발디 자신의 오페라와 공연은 본인 작품이자 무대극이라 VIDEO로 중복 등록하지 않았다. 코렐리 양식의 영향은 학술 연구에서도 베네치아 작곡가를 통한 간접 습득 가능성이 제시되어 특정 곡의 직접 청취로 보지 않았다. 작품 단위 GAME 소비 기록도 없다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'accepted',
      '광란의 오를란도', '루도비코 아리오스토', target_content_id,
      '비발디가 작곡한 1727년 오페라 초판 대본은 아리오스토의 오를란도 이야기에서 현재의 극을 가져왔다고 원전을 직접 명시한다.',
      NULL
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '오페라 《광란의 오를란도》 및 비발디 무대 작품', '안토니오 비발디 외', NULL,
      '비발디가 여러 오페라의 작곡·상연에 참여한 사실은 동시대 대본과 공연 기록으로 확인된다.',
      '무대극은 현재 VIDEO 정의 밖이고, 비발디 자신의 작품을 본인의 소비 콘텐츠로 중복 등록하지 않는다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '18세기 베네치아 놀이·도박 일반', NULL, NULL,
      '생애·작품·공연 자료에서 비발디가 소비한 제목 있는 게임 작품은 확인되지 않는다.',
      '시대와 도시의 오락 문화를 작곡가 개인의 게임 플레이로 추정하지 않는다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '코렐리 양식·라 폴리아', '아르칸젤로 코렐리', NULL,
      '비발디 작품에서 코렐리 양식과의 유사성이 논의되지만 학술 연구는 그 특징이 베네치아 작곡가들을 통해 간접 습득됐을 가능성을 제시한다.',
      '양식적 영향만으로 특정 코렐리 작품을 비발디가 직접 듣거나 추천했다고 단정할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '안토니오 비발디 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://imslp.org/wiki/Orlando_furioso%2C_RV_728_%28Vivaldi%2C_Antonio%29',
      'primary', 'archive', 'accessible',
      'Orlando furioso, RV 728 — 1727 first-edition libretto',
      '비발디의 음악과 브라촐리 대본을 명시한 1727년 베네치아 초판 대본 스캔에서 원전 고지를 확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.operalibretto.com/libretto-orlando-furioso-vivaldi/',
      'primary', 'archive', 'accessible',
      'Orlando Furioso — original Italian libretto',
      '초판 대본의 Argomento에 아리오스토 이야기에서 현재 극을 취했다는 문장이 전사되어 있다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://vivaldiedition.net/portfolio/vol-17-orlando-furioso-2004/',
      'secondary', 'official_profile', 'accessible',
      'Orlando furioso — Vivaldi Edition',
      '1727년 비발디 오페라와 그라치오 브라촐리 대본의 작품 식별을 교차 확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://search.shopping.naver.com/book/catalog/54672072278',
      'secondary', 'official_profile', 'accessible',
      '광란의 오를란도 — 네이버 도서',
      '서비스에 이미 등록된 ISBN 9791170873150 한국어 판본의 메타데이터를 재확인했다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://www.teatroreal.es/en/show/orlando-furioso',
      'secondary', 'official_profile', 'accessible',
      'Orlando Furioso — Teatro Real',
      '브라촐리 대본이 아리오스토 서사시에 기초한 비발디 오페라임을 확인했으나 무대극이라 VIDEO에서 제외했다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://corago.unibo.it/libretto/DPC0001556',
      'secondary', 'archive', 'accessible',
      'Orlando furioso, Venezia 1727 — CORAGO',
      '볼로냐대학교 공연 아카이브의 생애·작품 연결 자료를 검토했으나 게임 소비 기록은 없다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://www.cambridge.org/core/journals/journal-of-the-royal-musical-association/article/abs/vivaldi-and-rome-observations-and-hypotheses/B8A16CF08E0D3A376E7F9B29321C4992',
      'secondary', 'article', 'accessible',
      'Vivaldi and Rome: Observations and Hypotheses',
      '코렐리풍 특징이 코렐리 작품의 독립 연구가 아니라 베네치아 작곡가들을 통해 간접 습득됐을 가능성을 제시한다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '안토니오 비발디 source 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Antonio Vivaldi·leggere·libro·libretto·Ariosto·Orlando furioso 조합을 조사했다. 1727년 초판 대본의 원전 고지로 《광란의 오를란도》 1건을 채택했다.'
      WHEN 'VIDEO' THEN
        'opera·teatro·performance·watched 조합을 조사했다. 본인 오페라는 무대극이자 자기 작품이므로 VIDEO에 등록하지 않는다.'
      WHEN 'GAME' THEN
        'game·gioco·cards·gambling·played 조합을 조사했다. 작품 단위 게임 소비 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·heard·listened·Corelli·La Follia·influence 조합을 조사했다. 양식 영향은 있으나 직접 청취 1차 근거가 없어 0건이다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '안토니오 비발디 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '안토니오 비발디 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  UPDATE public.profiles p
  SET celeb_tier = 'full'
  WHERE p.id = target_celeb_id
    AND p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '안토니오 비발디 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.run_id = target_run_id
      AND f.decision = 'accepted'
      AND (
        f.content_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.user_contents uc
          WHERE uc.user_id = target_celeb_id AND uc.content_id = f.content_id
        )
        OR NOT EXISTS (
          SELECT 1 FROM public.celeb_content_research_sources src
          WHERE src.finding_id = f.id AND src.source_tier = 'primary'
        )
      )
  ) THEN
    RAISE EXCEPTION '안토니오 비발디 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
