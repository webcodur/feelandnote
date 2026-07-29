-- 카스파르 다비트 프리드리히의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 반영한다.
-- 오시안·에다·낭만주의 영향은 직접 감상 기록으로 소급하지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '53c416ba-59e9-4c29-8011-003df939f6b3'::uuid;
  target_run_id constant uuid := 'ad609f94-1679-46cd-81a4-b0860b1d07b2'::uuid;
  book_finding_id constant uuid := '22d14249-c785-4f03-b76f-b2c22cfb6cd3'::uuid;
  video_finding_id constant uuid := '417c0d85-a388-4dcc-ad85-6b9f650f328f'::uuid;
  game_finding_id constant uuid := '8aa3a6d8-8b0e-4bbe-84a3-54abc9be90c6'::uuid;
  music_finding_id constant uuid := '94b69f33-970f-482c-a9fa-679a63577657'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'caspar-david-friedrich'
      AND p.nickname = '카스파르 다비트 프리드리히'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '카스파르 다비트 프리드리히 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '카스파르 다비트 프리드리히 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-caspar-david-friedrich-empty-v1',
    'Codex',
    ARRAY['카스파르 다비트 프리드리히', 'Caspar David Friedrich', 'C. D. Friedrich', 'CDF', '카스파 다비드 프리드리히'],
    '1774~1840년 독일 낭만주의 화가를 동시대 철학자 프리드리히 셸링·시인 프리드리히 슐레겔과 이름에 Friedrich가 들어가는 다른 인물들로부터 분리했다.',
    '독일어·영어·한국어 이름과 read·book·letters·library·Ossian·Edda·Goethe·theatre·opera·music·game 조합으로 조사하고, 그라이프스발트대가 공개한 부부 편지 30통도 검색했다. 아내는 남편이 “아마 읽거나 창밖을 보고 있을 것”이라고 썼지만 책 제목은 없고, 프리드리히가 보관한 『Hours of Devotion』 4권은 D. Bechly의 소유물로 반송 방법만 묻는다. 동생의 〈마왕〉 목판화를 언급한 편지도 괴테 원작 독서를 증명하지 않는다. 오시안·에다와의 도상적 유사성은 영향 연구일 뿐 직접 읽었다는 사료가 아니다. 제목 있는 공연·곡·디지털 게임 기록도 찾지 못해 0건으로 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'rejected',
      'Hours of Devotion·오시안·에다·마왕 후보', NULL, NULL,
      '1820년 아내의 편지는 프리드리히가 “아마 읽고 있을 것”이라고만 적는다. 1822년 편지는 D. Bechly 소유의 『Hours of Devotion』 4권을 어떻게 돌려줄지 묻고, 1823년 편지는 동생의 〈마왕〉 목판화를 언급한다.',
      '첫 기록은 제목이 없고, 둘째는 타인의 책을 보관·반송한 기록이며 독서 언급이 없다. 셋째는 목판화 제작 조언이지 괴테 시를 읽었다는 기록이 아니다. 오시안·에다 영향도 직접 독서 사료가 없어 채택하지 않았다.'
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '드레스덴 전시·연극·공연 일반', NULL, NULL,
      '편지는 프리드리히가 전시회를 방문하고 여러 예술가와 교류한 사실을 전하지만 제목 있는 연극·오페라·영상 관람은 적지 않는다.',
      '미술 전시 방문은 VIDEO 작품 감상이 아니며, 특정 희곡·공연·영상 제목과 관람 장면이 확인되지 않는다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '가족 놀이와 일상 오락', NULL, NULL,
      '가족 편지에는 아이의 인형·장난감·마차 놀이와 가정생활이 등장한다.',
      '자녀의 일상 놀이를 프리드리히 자신의 디지털 GAME 작품 플레이로 바꿀 수 없고, 타이틀 단위 기록이 없다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '낭만주의 음악과 드레스덴 음악 문화 일반', NULL, NULL,
      '프리드리히는 음악가와 예술가가 모인 드레스덴에서 활동했지만 조사한 편지와 미술사 자료는 그가 들은 개별 곡명을 특정하지 않는다.',
      '동시대 문화권과 후대의 낭만주의적 연관만으로 개인의 곡 단위 감상을 추정하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '카스파르 다비트 프리드리히 finding 생성 수가 4건이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://ifaa.uni-greifswald.de/en/cdf/selected-letters/',
      'primary', 'archive', 'accessible',
      'Selected Letters by Caspar David Friedrich — University of Greifswald',
      '원문 소장처를 밝힌 편지 30통 번역에서 reading·Hours of Devotion·Erlking을 대조했다. 제목 없는 추정, 타인 소유 책의 반환, 목판화 언급만 확인된다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://ifaa.uni-greifswald.de/en/cdf/selected-letters/',
      'primary', 'archive', 'accessible',
      'Selected Letters by Caspar David Friedrich — University of Greifswald',
      '전시 방문은 나오지만 제목 있는 연극·오페라·영상 관람은 확인되지 않는다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://ifaa.uni-greifswald.de/en/cdf/selected-letters/',
      'primary', 'archive', 'accessible',
      'Selected Letters by Caspar David Friedrich — University of Greifswald',
      '가족 편지의 장난감·아이 놀이를 성인의 디지털 GAME 소비와 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://ifaa.uni-greifswald.de/en/cdf/selected-letters/',
      'primary', 'archive', 'accessible',
      'Selected Letters by Caspar David Friedrich — University of Greifswald',
      '음악·곡명·작곡가·공연 관람 조합을 확인했지만 작품 단위 기록이 없다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://resources.metmuseum.org/resources/metpublications/pdf/The_Romantic_Vision_of_Caspar_David_Friedrich_Paintings_and_Drawings_from_the_USSR.pdf',
      'secondary', 'article', 'accessible',
      'The Romantic Vision of Caspar David Friedrich — The Metropolitan Museum of Art',
      '낭만주의 도상과 작품 해석을 대조했으나 오시안·에다의 직접 독서를 입증하는 1차 기록은 제시되지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '카스파르 다비트 프리드리히 source 생성 수가 5건이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Caspar David Friedrich·lesen·read·book·library·letters·Ossian·Edda·Goethe·Erlking·Stunden der Andacht 조합과 공개 편지 30통을 조사했다. 제목 없는 reading 추정, 타인 책 반환, 목판화 언급만 있어 0건이다.'
      WHEN 'VIDEO' THEN
        'theatre·opera·performance·watched·exhibition 조합과 편지를 조사했다. 미술 전시 방문 외에 제목 있는 공연·영상 관람 기록은 없다.'
      WHEN 'GAME' THEN
        'game·played·cards·chess·toy 조합과 가족 편지를 조사했다. 아이 놀이만 있고 본인의 디지털 GAME 타이틀 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·concert·opera·heard·composer 조합과 편지를 조사했다. 동시대 문화적 연관 외에 곡명 단위 청취 기록은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '카스파르 다비트 프리드리히 scope 완료 수가 4건이 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '카스파르 다비트 프리드리히 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '카스파르 다비트 프리드리히 프로필·콘텐츠 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'accepted') = 0
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 5
  ) THEN
    RAISE EXCEPTION '카스파르 다비트 프리드리히 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
