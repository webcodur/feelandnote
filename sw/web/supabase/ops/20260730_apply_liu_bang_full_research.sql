-- 유방(한고조) BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택:
--   BOOK  육가의 《신어》
-- 기각:
--   MUSIC 《대풍가》 — 유방 본인의 창작·가창
-- 함께 교정:
--   기존 《신어》 en locale가 동명이인 경요(Qiongyao)의 책으로 잘못 매칭된 결함

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '8e87dd1a-8c01-4af9-b966-e09cc24f4613'::uuid;
  existing_content_id constant text := 'fbbdf188-80c5-4df2-a158-45d280e65055';
  target_run_id constant uuid := 'cb8fe76c-60fd-46a8-9a7d-aeb0f20476df'::uuid;
  user_content_id constant uuid := 'bea550a8-343d-40f8-8814-f7bfef514b18'::uuid;
  accepted_xinyu_id constant uuid := '9423c64b-e4bf-4ebf-b47c-a8ff3183b399'::uuid;
  rejected_great_wind_id constant uuid := '1b730818-1175-4be7-9df4-6c7ba28056b9'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'liu-bang'
      AND p.nickname = '한고조'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '유방 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '유방에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (accepted_xinyu_id, rejected_great_wind_id)
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = user_content_id
  ) THEN
    RAISE EXCEPTION '유방 조사 실행 또는 이번 반영 ID가 이미 존재합니다.';
  END IF;

  IF (
    SELECT count(*)
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = existing_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788949707051'
      AND c.user_count = 0
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 0
      AND ko.title = '신어'
      AND ko.creator = '육가'
      AND ko.isbn = '9788949707051'
      AND ko.thumbnail_url = 'https://shopping-phinf.pstatic.net/main_3243830/32438303646.20221228072743.jpg'
      AND ko.verified = true
      AND en.title = 'Xinyu'
      AND en.creator = 'Qiongyao'
      AND en.isbn = '9789573311256'
      AND en.publisher = 'NXB Huoi nhà văn'
      AND en.thumbnail_url = 'https://covers.openlibrary.org/b/id/7391274-L.jpg'
      AND en.verified = true
  ) <> 1 THEN
    RAISE EXCEPTION '기존 《신어》 콘텐츠 또는 잘못 연결된 en locale 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.content_locales
  SET
    title = 'New Discourses',
    creator = 'Lu Jia',
    thumbnail_url = 'https://shopping-phinf.pstatic.net/main_3243830/32438303646.20221228072743.jpg',
    description = 'A twelve-chapter political and philosophical treatise written by Lu Jia at Emperor Gaozu''s request. It explains why Qin lost the empire, why Han gained it, and how a new dynasty should govern.',
    isbn = '9788949707051',
    publisher = 'Dongseo Munhwasa',
    sources = jsonb_build_object(
      'primary', 'naver_book',
      'translation', 'manual',
      'correction', '2026-07-30-homonym-fix'
    ),
    verified = true,
    updated_at = now()
  WHERE content_id = existing_content_id
    AND locale = 'en'
    AND title = 'Xinyu'
    AND creator = 'Qiongyao'
    AND isbn = '9789573311256';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '《신어》 en locale 동명이인 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    user_content_id,
    target_celeb_id,
    existing_content_id,
    'FINISHED',
    $ko$《사기》와 《한서》의 육가 열전은 유방이 육가에게 진이 천하를 잃고 한이 얻은 까닭과 옛 나라들의 성패를 글로 지으라고 명했다고 기록한다. 육가는 열두 편을 차례로 올렸고 유방은 한 편을 받을 때마다 칭찬했다. 작품명과 저자, 집필 요청, 편별 열람·수용이 모두 특정되어 《신어》를 등록한다.$ko$,
    $en$The biographies of Lu Jia in the Records of the Grand Historian and the Book of Han state that Liu Bang ordered Lu to write about why Qin lost the empire, why Han gained it, and the successes and failures of earlier states. Lu presented twelve chapters in sequence, and the emperor praised each one. The work, author, commission, and chapter-by-chapter reception are all explicit.$en$,
    'https://ctext.org/wiki.pl?chapter=242540&if=en',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '유방 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = existing_content_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 OR (
    SELECT c.user_count FROM public.contents c WHERE c.id = existing_content_id
  ) <> 1 THEN
    RAISE EXCEPTION '《신어》 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-liu-bang-full-v1',
    'Codex',
    ARRAY['유방', '한고조', '漢高祖', '劉邦', '刘邦', 'Liu Bang', 'Emperor Gaozu of Han', 'Gaozu'],
    '전한 창업자 유방(기원전 256~195)을 다른 왕조의 고조 묘호 군주, 동명 현대인, 소설·드라마·게임 속 유방과 분리했다. 본인이 지은 《대풍가》와 후대 초한쟁패 창작물은 외부 감상작에서 제외했다.',
    '한국어·한문·영어 이름 변형으로 네 유형을 검색하고 《사기》·《한서》 계열 원문과 현대 한대 철학 연구를 대조했다. 유방은 육가에게 진·한과 옛 나라의 성패를 설명하는 책을 쓰라고 명했고, 육가가 열두 편을 차례로 올릴 때마다 칭찬했다. 이 직접 수용 기록에 따라 기존 네이버 도서 《신어》를 BOOK으로 연결했다. 《대풍가》는 유방이 직접 짓고 축을 치며 부른 작품이라 외부 MUSIC 취향에서는 기각했다. 특정 영상 관람이나 디지털 게임 플레이 기록은 확인되지 않았다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      accepted_xinyu_id,
      target_run_id,
      'BOOK',
      'accepted',
      '신어',
      '육가',
      existing_content_id,
      '《사기》·《한서》의 육가 열전은 유방의 명에 따라 육가가 열두 편을 지어 한 편씩 올렸고, 유방이 매번 칭찬해 책을 《신어》라 불렀다고 기록한다.',
      NULL
    ),
    (
      rejected_great_wind_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '대풍가',
      '유방',
      NULL,
      '《사기》 고조본기는 유방이 패현 연회에서 축을 치며 스스로 노래 가사를 지어 부른 장면과 세 구절을 기록한다.',
      '유방 본인의 창작·가창 작품이다. 이 조사는 외부 콘텐츠 소비를 수집하므로 자신의 작품을 자신의 감상 MUSIC으로 등록하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '유방 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      accepted_xinyu_id,
      'https://ctext.org/wiki.pl?chapter=242540&if=en',
      'primary',
      'archive',
      'accessible',
      '陸賈新語注釋：史記漢書陸賈傳合注',
      '유방의 집필 명령, 육가의 12편 집필, “每奏一篇，高帝未嘗不稱善”과 《신어》 명명을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_xinyu_id,
      'https://ctext.org/datawiki.pl?if=en&res=11680',
      'secondary',
      'archive',
      'accessible',
      '新語 Xinyu',
      '작품의 12편 구성과 유방에게 편별로 올린 전승을 영문 해설에서 교차 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_xinyu_id,
      'https://plato.sydney.edu.au/entries/han-dynasty/',
      'secondary',
      'article',
      'accessible',
      'Philosophy in Han Dynasty China',
      'Stanford Encyclopedia of Philosophy의 한대 철학 항목에서 고조가 학자들에게 제국 운영에 필요한 저술을 명했고 육가가 《신어》를 썼다는 맥락을 대조했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_xinyu_id,
      'https://search.shopping.naver.com/book/catalog/32438303646',
      'secondary',
      'official_profile',
      'accessible',
      '신어 네이버 도서 메타',
      '육가·《신어》·ISBN 9788949707051·동서문화사 한국어판의 작품 정체와 표지를 확인했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://scholarworks.iu.edu/dspace/bitstreams/eed3bbd8-bbcb-44df-b9d3-937d6cae89c4/download',
      'secondary',
      'archive',
      'accessible',
      'Liu Bang and Xiang Yu: A Reading from the Shiji',
      '생애·연회·홍문연 자료를 watched·performance·play 조합과 대조했으나 유방이 관람한 특정 VIDEO·극 작품은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://ctext.org/shiji/gao-zu-ben-ji',
      'primary',
      'archive',
      'accessible',
      '史記：高祖本紀',
      '생애 원문을 game·博·弈·六博 조합과 대조했으나 작품 단위 디지털 GAME 플레이 기록은 없었다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_great_wind_id,
      'https://warringstates.day/library/shiji/08-gao-zu-ben-ji',
      'primary',
      'archive',
      'accessible',
      '高祖本紀 (Annals of Emperor Gaozu)',
      '패현 연회에서 유방이 축을 치고 스스로 《대풍가》를 지어 부른 대목을 원문·영문으로 확인했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '유방 조사 source 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '유방·한고조·劉邦·Emperor Gaozu와 read·book·書·奏·詩書·신어·新語 조합을 검색했다. 육가에게 저술을 명하고 완성된 열두 편을 차례로 보고받아 매번 칭찬한 직접 기록을 확인해 《신어》를 채택했다.'
      WHEN 'VIDEO' THEN
        'watched·play·theatre·performance·연회·홍문연 조합을 검색했다. 실제 연회와 춤·검무 장면은 정치 사건이며 제목 있는 외부 VIDEO·극 작품 관람 기록은 확인되지 않았다.'
      WHEN 'GAME' THEN
        'game·played·board game·博·弈·六博 조합을 《사기》 고조본기와 현대 연구에서 검색했다. 특정 디지털 GAME 작품의 플레이 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·歌·擊筑·대풍가·大風歌 조합을 검색했다. 제목 있는 《대풍가》는 유방이 직접 작사·가창한 자기 작품이므로 외부 감상 콘텐츠에서 기각했고 다른 특정 선호곡은 찾지 못했다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '유방 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION '유방 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '유방 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_contents uc ON uc.user_id = p.id
    JOIN public.contents c ON c.id = uc.content_id
    JOIN public.content_locales en ON en.content_id = c.id AND en.locale = 'en'
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND uc.id = user_content_id
      AND c.id = existing_content_id
      AND c.user_count = 1
      AND en.title = 'New Discourses'
      AND en.creator = 'Lu Jia'
      AND en.isbn = '9788949707051'
      AND en.publisher = 'Dongseo Munhwasa'
      AND en.thumbnail_url = 'https://shopping-phinf.pstatic.net/main_3243830/32438303646.20221228072743.jpg'
  ) THEN
    RAISE EXCEPTION '유방 프로필·콘텐츠·en locale 최종 검증에 실패했습니다.';
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
    RAISE EXCEPTION '유방 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f WHERE f.run_id = r.id AND f.decision = 'accepted') = 1
      AND (SELECT count(*) FROM public.celeb_content_research_findings f WHERE f.run_id = r.id AND f.decision = 'rejected') = 1
      AND (SELECT count(*) FROM public.celeb_content_research_sources src WHERE src.run_id = r.id) = 7
  ) THEN
    RAISE EXCEPTION '유방 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
