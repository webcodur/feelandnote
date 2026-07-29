-- 이성계 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 원장과 함께 반영한다.
-- 채택:
--   BOOK  대학연의
-- 기각:
--   GAME  격구 — 실제 승마 구기이며 디지털 게임 작품이 아님
--   MUSIC 몽금척·수보록 등 개국 악장 — 본인을 찬양하도록 발주·헌정된 작품
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '3e495120-cb95-4d2a-ac5c-aa48d178261f'::uuid;
  existing_content_id constant text := '0fc60485-03e2-4bc9-9cec-ae1872cd5d66';
  target_run_id constant uuid := 'b9634d33-47de-4564-8bd1-5e14b21c0418'::uuid;
  user_content_id constant uuid := 'd5c525eb-cfb6-4b24-a495-40788a459b0f'::uuid;
  accepted_book_finding_id constant uuid := 'e12c9717-394a-4c10-b5b8-4142bdc7380c'::uuid;
  rejected_game_finding_id constant uuid := '43e7342f-e034-49a7-9311-f5067be9a355'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'yi-seong-gye'
      AND p.nickname = '이성계'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '이성계 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '이성계에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id
       OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.id IN (accepted_book_finding_id, rejected_game_finding_id)
  ) THEN
    RAISE EXCEPTION '이성계 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
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
      AND c.external_id = '9788952117311'
      AND c.user_count = 2
      AND (
        SELECT count(*)
        FROM public.user_contents existing_uc
        WHERE existing_uc.content_id = c.id
      ) = 3
      AND ko.title = '대학연의'
      AND ko.creator = '진덕수'
      AND ko.isbn = '9788952117311'
      AND ko.verified = true
      AND en.title = 'Extended Meaning of the Great Learning'
      AND en.creator = 'Zhen Dexiu'
      AND en.verified = true
  ) <> 1 THEN
    RAISE EXCEPTION '기존 『대학연의』 콘텐츠의 조사 전 기준선이 달라졌습니다.';
  END IF;

  INSERT INTO public.user_contents (
    id,
    user_id,
    content_id,
    status,
    review,
    review_en,
    source_url,
    is_recommended
  )
  VALUES (
    user_content_id,
    target_celeb_id,
    existing_content_id,
    'FINISHED',
    $ko$『태조실록』 총서는 이성계가 군중에서도 유학자들과 경사(經史)를 토론했고, 특히 진덕수의 『대학연의』 보기를 좋아해 밤중까지 잠들지 않았다고 기록한다. 작품명과 반복 독서, 통치에 품은 뜻이 한 기사에 함께 남아 있어 등록한다.$ko$,
    $en$The introductory annals of King Taejo record that Yi Seong-gye discussed the classics and histories with Confucian scholars even in military camps and especially enjoyed Zhen Dexiu's *Extended Meaning of the Great Learning*, sometimes reading it past midnight. The source identifies the work and sustained reading directly.$en$,
    'https://sillok.history.go.kr/id/kaa_000080',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '이성계 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer
    FROM public.user_contents uc
    WHERE uc.content_id = c.id
  )
  WHERE c.id = existing_content_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 OR (
    SELECT c.user_count
    FROM public.contents c
    WHERE c.id = existing_content_id
  ) <> 4 THEN
    RAISE EXCEPTION '『대학연의』 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id,
    celeb_id,
    batch_key,
    researcher_label,
    name_variants,
    homonym_notes,
    summary
  )
  VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-yi-seong-gye-full-v1',
    'Codex',
    ARRAY[
      '이성계',
      '조선 태조',
      '태조 강헌대왕',
      '李成桂',
      '朝鮮太祖',
      'Yi Seong-gye',
      'Yi Sŏnggye',
      'King Taejo of Joseon'
    ],
    '조선 건국자 태조 이성계(1335~1408)와 송 태조·명 태조, 아들 태종 이방원 및 후대 태조 묘호 군주를 분리했다. 『용비어천가』와 태조를 소재로 한 후대 드라마·게임은 사후 제작물이라 제외했고, 정도전이 태조에게 바친 개국 악장은 본인의 외부 감상 취향과 구분했다.',
    '한국어·한문·영어 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 『태조실록』 원문과 현대 전기를 대조했다. 『태조실록』이 진덕수의 『대학연의』를 즐겨 밤중까지 읽었다고 직접 기록해 BOOK 1건을 채택했다. 격구는 실제 승마 구기라 GAME에서 기각했다. 정도전이 바친 《몽금척》《수보록》 등 개국 악장은 본인을 찬양하도록 제작된 헌정·국가 의례 작품이고 개인 감상 근거가 없어 MUSIC으로 등록하지 않았다. 특정 관람 공연도 확인되지 않았다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id,
    run_id,
    content_type,
    decision,
    title,
    creator,
    content_id,
    evidence_summary,
    rejection_reason
  )
  VALUES
    (
      accepted_book_finding_id,
      target_run_id,
      'BOOK',
      'accepted',
      '대학연의',
      '진덕수',
      existing_content_id,
      '『태조실록』 총서 80번째 기사는 이성계가 진덕수의 『대학연의』 보기를 특히 좋아해 때로 밤중까지 잠들지 않았다고 명시한다.',
      NULL
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '격구',
      NULL,
      NULL,
      '『태조실록』 총서는 22세 이성계가 단오 격구에서 말을 타고 공을 쳐 구문으로 내보낸 뛰어난 기량을 상세히 기록한다.',
      '격구는 말을 타고 하는 실제 전통 구기·무예다. 작품 단위 디지털 GAME이 아니므로 현대 게임 제목으로 치환해 등록할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '이성계 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id,
    content_type,
    finding_id,
    url,
    source_tier,
    source_kind,
    access_status,
    title,
    notes
  )
  VALUES
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://sillok.history.go.kr/id/kaa_000080',
      'primary',
      'archive',
      'accessible',
      '태조가 무인이면서도 문인과 경사를 토론하고 《대학연의》를 즐겨 보다',
      '“尤樂觀眞德秀《大學衍義》, 或至夜分不寐”라는 한문 원문과 국역을 함께 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://hasp.ub.uni-heidelberg.de/catalog/view/1158/2108/103682',
      'secondary',
      'archive',
      'accessible',
      'A Flying Dragon: King Taejo, Founder of Korea’s Joseon Dynasty',
      '하이델베르크대 출판 현대 전기 131쪽이 『태조실록』을 인용해 밤늦게까지 『대학연의』를 읽었다고 교차 확인한다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://search.shopping.naver.com/book/catalog/32483209096',
      'secondary',
      'official_profile',
      'accessible',
      '대학연의 네이버 도서 메타',
      '기존 콘텐츠의 진덕수·ISBN 9788952117311·한국어판 표지를 대조했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://ctext.org/wiki.pl?if=gb&res=80272',
      'secondary',
      'archive',
      'accessible',
      '大學衍義, 中國哲學書電子化計劃',
      '진덕수 저작 43권과 사고전서 저본의 원문을 대조해 동명 『대학연의보』와 분리했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://encykorea.aks.ac.kr/Article/E0059033',
      'secondary',
      'official_profile',
      'accessible',
      '태조, 한국민족문화대백과사전',
      '생애·정치·종교 후원 관계와 공연·관람 검색을 대조했으나 본인이 관람한 특정 연희·극 작품명은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://sillok.history.go.kr/id/waa_000035',
      'primary',
      'archive',
      'accessible',
      '태조가 22살에 관직에 나가다. 격구하는 방법',
      '이성계가 격구에 직접 참가해 방미·횡방 기예를 보인 원문과 국역을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://sillok.history.go.kr/id/kaa_10207026_001',
      'primary',
      'archive',
      'accessible',
      '정도전이 몽금척·수보록·납씨곡·궁수분곡·정동방곡 등의 악장을 지어 바치다',
      '1393년 정도전이 태조의 정통성과 공덕을 노래하는 악장을 지어 바친 기록이다. 이성계 개인의 청취·선호를 입증하지는 않는다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://sillok.history.go.kr/id/kda_11403016_002',
      'secondary',
      'archive',
      'accessible',
      '세종이 회례 악장에 대해 지시하다',
      '후대 세종 대 기사에서 《몽금척》을 태조의 공덕을 노래한 악장으로 명확히 설명해 창작·헌정 관계를 대조했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 8 THEN
    RAISE EXCEPTION '이성계 조사 source 생성 행 수가 8이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '이성계·조선 태조·李成桂·Yi Seong-gye와 독서·즐겨 보다·책·경사·read·book 조합을 검색했다. 『태조실록』 원문에서 진덕수의 『대학연의』를 특히 좋아해 밤중까지 읽었다는 기록을 확인하고 기존 네이버 도서 콘텐츠에 연결했다. 국가 편찬·후원 자료와 후대 『용비어천가』는 제외했다.'
      WHEN 'VIDEO' THEN
        '연희·구경·관람·놀이·공연·theatre·performance·watched 조합을 실록과 생애 자료에서 검색했다. 격구 대회·연회 같은 의례 환경은 나오지만 이성계가 감상한 특정 극·연희 작품명은 확인되지 않았다. 후대 사극은 사후 제작물이라 제외했다.'
      WHEN 'GAME' THEN
        '격구·장기·바둑·놀이·game·played 조합을 검색했다. 22세 때 격구에 직접 참가한 상세 기록은 확인했지만 실제 승마 구기·무예이므로 디지털 GAME 작품에서 기각했다.'
      WHEN 'MUSIC' THEN
        '악장·노래·음악·몽금척·수보록·납씨곡·music·song 조합을 검색했다. 정도전이 태조에게 바친 개국 악장들은 본인을 찬양하도록 발주·헌정된 국가 의례 작품이며 개인의 선택·감상 근거가 없다. 별도의 선호곡도 찾지 못했다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '이성계 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT
    result.final_research_status,
    result.actual_content_count
  INTO
    completed_status,
    completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION
      '이성계 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
      completed_status,
      completed_content_count;
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
    RAISE EXCEPTION '이성계 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (
        SELECT count(*)
        FROM public.user_contents uc
        WHERE uc.user_id = p.id
      ) = 1
  ) THEN
    RAISE EXCEPTION '이성계 프로필·콘텐츠 최종 검증에 실패했습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.run_id = target_run_id
      AND f.decision = 'accepted'
      AND (
        f.content_id IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM public.user_contents uc
          WHERE uc.user_id = target_celeb_id
            AND uc.content_id = f.content_id
        )
        OR NOT EXISTS (
          SELECT 1
          FROM public.celeb_content_research_sources src
          WHERE src.finding_id = f.id
            AND src.source_tier = 'primary'
        )
      )
  ) THEN
    RAISE EXCEPTION '이성계 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.celeb_id = target_celeb_id
      AND r.status = 'completed'
      AND r.completed_at IS NOT NULL
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_scopes s
        WHERE s.run_id = r.id
          AND s.status = 'completed'
      ) = 4
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_findings f
        WHERE f.run_id = r.id
          AND f.decision = 'accepted'
      ) = 1
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_findings f
        WHERE f.run_id = r.id
          AND f.decision = 'rejected'
      ) = 1
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_sources src
        WHERE src.run_id = r.id
      ) = 8
  ) THEN
    RAISE EXCEPTION '이성계 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
