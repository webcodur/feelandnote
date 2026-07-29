-- 안중근 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 콘텐츠와 조사 원장에 반영한다.
-- 채택:
--   BOOK  논어 — 1910년 옥중 유묵 여러 점에 편명이 식별되는 구절을 직접 골라 씀
-- 기각:
--   BOOK  안응칠역사·동양평화론 — 본인의 저술
--   MUSIC 장부가·보국가 — 본인의 창작시이며 후대에 붙은 편의적 제목
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'b4390552-d9df-4b47-a0c9-51bf1f810c2f'::uuid;
  existing_content_id constant text := '32838ac4-4041-430b-b953-ccd98244a52b';
  target_run_id constant uuid := '153d4016-878d-48bb-b6f5-4fbe251205c6'::uuid;
  user_content_id constant uuid := '24f8f8e4-f226-4922-bf71-60ddd1c1bca6'::uuid;
  accepted_book_finding_id constant uuid := '3ab39372-27fd-4018-b066-9ea62939d1a0'::uuid;
  rejected_own_books_id constant uuid := '3080c1fd-6f9b-46f9-a369-46eab90e80a5'::uuid;
  rejected_video_id constant uuid := '03faa5c9-7cda-4cc4-8790-74e752fb3bbb'::uuid;
  rejected_game_id constant uuid := '77c5f37b-b696-44d4-be5d-603c91bc9fa4'::uuid;
  rejected_music_id constant uuid := 'e2b18ffe-29cd-4563-b45b-41f65c326da8'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'an-jung-geun'
      AND p.nickname = '안중근'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '안중근 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '안중근에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      accepted_book_finding_id,
      rejected_own_books_id,
      rejected_video_id,
      rejected_game_id,
      rejected_music_id
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.id = user_content_id
  ) THEN
    RAISE EXCEPTION '안중근 조사 실행 또는 이번 반영 ID가 이미 존재합니다.';
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
      AND c.external_id = '9791191805086'
      AND c.user_count = 28
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.content_id = c.id) = 49
      AND ko.title = '논어'
      AND ko.creator = '공자'
      AND ko.isbn = '9791191805086'
      AND ko.verified = true
      AND en.title = 'The Analects'
      AND en.creator = 'Confucius'
      AND en.verified = true
  ) <> 1 THEN
    RAISE EXCEPTION '기존 『논어』 콘텐츠 기준선이 달라졌습니다.';
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES (
    user_content_id,
    target_celeb_id,
    existing_content_id,
    'FINISHED',
    $ko$안중근은 1910년 뤼순감옥에서 『논어』의 구절을 한 번 인용하는 데 그치지 않았다. 현존 유묵 가운데 「견리사의 견위수명」은 「헌문」편, 「빈이무첨 부이무교」는 「학이」편, 「박학어문 약지이례」는 「옹야」편에서 직접 고른 문장이다. 서로 다른 편의 구절을 반복해 자기 글씨와 삶의 명제로 남긴 물증이 있어 『논어』를 실제로 읽고 소화한 책으로 등록한다.$ko$,
    $en$In 1910 at Lüshun Prison, An Jung-geun did more than quote the *Analects* once. Surviving calligraphies reproduce identifiable passages from several chapters: “When seeing profit, think of righteousness; when facing danger, give your life” from “Xianwen,” “Poor without flattery, rich without arrogance” from “Xue Er,” and “Broadly learned in culture, restrained by ritual” from “Yong Ye.” His repeated selection of passages from different chapters is material evidence of sustained engagement with the work.$en$,
    'https://artsandculture.google.com/asset/calligraphy-of-patriot-an-junggeun-junggeun-an/GAFjxwxpkJvFvQ?hl=ko',
    false
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '안중근 user_contents 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id = existing_content_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 OR (
    SELECT c.user_count FROM public.contents c WHERE c.id = existing_content_id
  ) <> 50 THEN
    RAISE EXCEPTION '『논어』 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-an-jung-geun-full-v1',
    'Codex',
    ARRAY[
      '안중근', '安重根', '안응칠', '安應七',
      'An Jung-geun', 'Ahn Jung-geun', 'An Chung-gun'
    ],
    '대한의군 참모중장 안중근(1879~1910)을 동명이인, 그를 소재로 한 후대 영화·뮤지컬·게임의 등장인물과 분리했다. 『안응칠역사』와 『동양평화론』은 본인의 창작물이므로 감상 콘텐츠에서 제외했다.',
    '한국어·한문·영어 이름 변형으로 네 유형을 조사하고 1910년 옥중 유묵 실물 설명, 문화재 해설, 학술 논문을 대조했다. 안중근이 『논어』의 서로 다른 편에서 구절을 직접 골라 여러 유묵으로 남긴 물증을 확인해 BOOK 1건을 연결했다. 자작 저술과 자작시는 소비에서 제외했고, 본인이 관람한 특정 영상·플레이한 디지털 게임·제목이 확정된 타인의 음악은 확인되지 않았다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      accepted_book_finding_id,
      target_run_id,
      'BOOK',
      'accepted',
      '논어',
      '공자',
      existing_content_id,
      '1910년 옥중 유묵에 『논어』 「헌문」·「학이」·「옹야」편에서 고른 구절이 각각 남아 있어 작품의 반복적 독서·수용을 실물로 확인할 수 있다.',
      NULL
    ),
    (
      rejected_own_books_id,
      target_run_id,
      'BOOK',
      'rejected',
      '안응칠역사·동양평화론',
      '안중근',
      NULL,
      '안중근이 뤼순감옥에서 직접 집필한 자서전과 미완성 동양평화 구상이다.',
      '본인이 창작한 저술은 외부 콘텐츠 소비가 아니므로 등록하지 않는다.'
    ),
    (
      rejected_video_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '안중근을 소재로 한 후대 영상·공연',
      NULL,
      NULL,
      '안중근의 생애와 하얼빈 의거는 후대 영화·다큐멘터리·뮤지컬로 반복 제작되었다.',
      '사후 제작된 전기·재현물은 본인이 관람한 작품이 아니다. 생전 관람한 특정 작품명도 확인되지 않았다.'
    ),
    (
      rejected_game_id,
      target_run_id,
      'GAME',
      'rejected',
      '사격·승마 등 실제 활동',
      NULL,
      NULL,
      '안중근의 사격 훈련과 의병 활동은 생애 자료에 확인된다.',
      '실제 군사 훈련·신체 활동은 작품 단위 디지털 GAME이 아니며 특정 게임 이용 기록도 없다.'
    ),
    (
      rejected_music_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '장부가·보국가',
      '안중근',
      NULL,
      '안중근이 의거 전후 남긴 자작 한시·가사이며 오늘날 통용되는 제목은 후대 정리 과정에서 붙은 명칭이다.',
      '자작시는 타인의 음악을 감상한 기록이 아니고, 당시 안중근이 들은 특정 곡이나 음반으로 식별할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '안중근 조사 finding 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://artsandculture.google.com/asset/calligraphy-of-patriot-an-junggeun-junggeun-an/GAFjxwxpkJvFvQ?hl=ko',
      'primary',
      'archive',
      'accessible',
      '안중근의사 유묵 「견리사의 견위수명」',
      '동아대학교 석당박물관 소장 1910년 실물과 『논어』 「헌문」편 출전을 함께 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://encykorea.aks.ac.kr/Article/E0035027',
      'secondary',
      'official_profile',
      'accessible',
      '안중근 의사 유묵, 한국민족문화대백과사전',
      '문화재 유묵 목록에서 『논어』의 여러 편에 해당하는 구절들이 반복해 남은 사실을 교차 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001251301',
      'secondary',
      'article',
      'accessible',
      '안중근의 옥중 문필활동',
      '옥중 저술·휘호를 전통 학문과 유교적 가치 수용의 맥락에서 분석한 학술 논문이다.'
    ),
    (
      target_run_id,
      'BOOK',
      accepted_book_finding_id,
      'https://search.shopping.naver.com/book/catalog/34906313618',
      'secondary',
      'official_profile',
      'accessible',
      '논어 네이버 도서 메타',
      '기존 콘텐츠의 공자·ISBN 9791191805086·한국어 표지를 대조했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_own_books_id,
      'https://www.i815.or.kr/upload/kr/magazine/magazine/34/post-356.html',
      'primary',
      'archive',
      'accessible',
      '안중근의 옥중 저술',
      '『안응칠역사』와 『동양평화론』이 안중근 자신의 옥중 집필물임을 확인했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_id,
      'https://encykorea.aks.ac.kr/Article/E0035006',
      'secondary',
      'official_profile',
      'accessible',
      '안중근, 한국민족문화대백과사전',
      '생애·활동과 공연·관람 검색을 대조했으나 생전 관람한 특정 작품명은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_id,
      'https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002618528',
      'secondary',
      'article',
      'accessible',
      '안중근의 덕목과 실천 연구',
      '사격·의병 활동과 작품 단위 게임 소비를 분리해 검색했으나 디지털 게임 기록은 없었다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_id,
      'https://m.i815.or.kr/upload/_board/research_thesis/research_thesis_13_1349831336.pdf',
      'secondary',
      'article',
      'accessible',
      '안중근 관련 음성·노래 명칭 검토',
      '「장부가」「보국가」가 자작 글과 후대 명명에 속해 생전 특정 음악 감상 증거가 되지 않음을 대조했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 8 THEN
    RAISE EXCEPTION '안중근 조사 source 생성 행 수가 8이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '안중근·안응칠·安重根·An/Ahn Jung-geun과 읽다·독서·유묵·경전·book·read 조합을 검색했다. 1910년 실물 유묵과 문화재 목록에서 『논어』 여러 편의 구절을 직접 골라 쓴 반복 수용을 확인해 기존 콘텐츠에 연결했다. 『안응칠역사』와 『동양평화론』은 자작물이라 제외했다.'
      WHEN 'VIDEO' THEN
        '영화·연극·공연·관람·activity picture·theatre·watched 조합을 검색했다. 후대 안중근 소재 작품은 다수지만 본인이 생전 관람한 특정 작품명은 확인되지 않았다.'
      WHEN 'GAME' THEN
        '놀이·사격·승마·바둑·장기·game·played 조합을 검색했다. 실제 군사 활동만 확인되며 작품 단위 디지털 GAME 이용 기록은 없었다.'
      WHEN 'MUSIC' THEN
        '노래·음악·유성기·장부가·보국가·music·song 조합을 검색했다. 자작 글과 후대 명명은 감상에서 제외했고 타인의 특정 곡을 들었다는 기록은 확인되지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '안중근 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 1 THEN
    RAISE EXCEPTION
      '안중근 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '안중근 light→full 승격 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'full'
      AND p.content_research_status = 'open'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 1
  ) THEN
    RAISE EXCEPTION '안중근 프로필·콘텐츠 최종 검증에 실패했습니다.';
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
    RAISE EXCEPTION '안중근 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.celeb_id = target_celeb_id
      AND r.status = 'completed'
      AND r.completed_at IS NOT NULL
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'accepted') = 1
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 8
  ) THEN
    RAISE EXCEPTION '안중근 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
