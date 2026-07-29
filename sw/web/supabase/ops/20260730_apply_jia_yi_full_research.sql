-- 가의의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 반영한다.
-- 채택: 『시경』, 『서경』, 『춘추좌전』
-- 근거: 『한서』 「가의전」의 誦《詩》《書》와 「유림전」의 修《春秋左氏傳》·訓故·전수 기록.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'f2776faa-2ca0-419c-b0ba-e413cacfa810'::uuid;
  target_run_id constant uuid := '5b3cc294-c6a6-45d4-b6c4-3298776dba6f'::uuid;
  shijing_content_id constant text := 'fa0376af-a847-4b15-a5a6-f093261fedde';
  shujing_content_id constant text := 'b78ce08b-4bc8-4498-8756-a11828c04808';
  zuozhuan_content_id constant text := 'e1126c3d-4cf3-4e96-bf56-c82f12af875e';
  shijing_uc_id constant uuid := '0a8c1c4d-2db5-49e2-915e-f10ac8184788'::uuid;
  shujing_uc_id constant uuid := '651454f2-ea15-4181-aa30-9d513d7ef3b6'::uuid;
  zuozhuan_uc_id constant uuid := '2239105e-fab4-4d32-b1ea-cf94f71f9bfc'::uuid;
  shijing_finding_id constant uuid := '54cbe47f-d20c-4070-a323-3c2d9fcdd154'::uuid;
  shujing_finding_id constant uuid := '30ceb77d-380a-4199-9f02-f0ebe52acb74'::uuid;
  zuozhuan_finding_id constant uuid := 'e40fad47-d009-4c53-a250-96bb2cfc5817'::uuid;
  video_finding_id constant uuid := '44ea0b7f-003c-4f40-9e00-0d1d86c80233'::uuid;
  game_finding_id constant uuid := '1f667c23-58a8-4b7f-9e79-f5988d96106d'::uuid;
  music_finding_id constant uuid := '194ae3a7-ef70-442b-b255-24bd6da350ff'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'jia-yi'
      AND p.nickname = '가의'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '가의 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc
    WHERE uc.id IN (shijing_uc_id, shujing_uc_id, zuozhuan_uc_id)
  ) THEN
    RAISE EXCEPTION '가의 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        (shijing_content_id, '시경', '미상', 3),
        (shujing_content_id, '서경', '공자 편', 22),
        (zuozhuan_content_id, '춘추좌전(상)', '좌구명', 1)
    ) AS expected(content_id, ko_title, ko_creator, expected_count)
    LEFT JOIN public.contents c
      ON c.id = expected.content_id
     AND c.type = 'BOOK'
     AND c.external_source = 'naver_book'
     AND c.user_count = expected.expected_count
    LEFT JOIN public.content_locales ko
      ON ko.content_id = expected.content_id
     AND ko.locale = 'ko'
     AND ko.title = expected.ko_title
     AND ko.creator = expected.ko_creator
     AND ko.verified = true
    LEFT JOIN public.content_locales en
      ON en.content_id = expected.content_id
     AND en.locale = 'en'
     AND en.verified = true
    WHERE c.id IS NULL OR ko.content_id IS NULL OR en.content_id IS NULL
  ) THEN
    RAISE EXCEPTION '가의 채택 BOOK 3건의 기존 메타데이터 또는 user_count가 달라졌습니다.';
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES
    (
      shijing_uc_id, target_celeb_id, shijing_content_id, 'FINISHED',
      '『한서』 「가의전」은 가의가 열여덟 살에 “시와 서를 외우고 글을 지을 줄 아는 것”으로 군에서 이름났다고 기록한다. 현대 학술 연구는 이 구절의 詩와 書를 각각 경전 『시경』과 『서경』으로 문장부호를 붙여 해석한다. 단순한 교양 추정이 아니라 암송 능력이 명시된 기록이므로 『시경』을 채택한다.',
      'The Hanshu biography says that at eighteen Jia Yi was renowned in his commandery for being able to recite the Shi and Shu and compose writings. Modern scholarship punctuates Shi as the Classic of Poetry and Shu as the Book of Documents. Because the source explicitly attributes memorized recitation rather than merely assuming a classical education, the Classic of Poetry is accepted.',
      'https://ctext.org/han-shu/jia-yi-zhuan/zhs',
      false
    ),
    (
      shujing_uc_id, target_celeb_id, shujing_content_id, 'FINISHED',
      '같은 『한서』 구절은 가의가 열여덟 살에 『시경』과 함께 『서경』을 암송해 이름났다고 전한다. 후대의 막연한 학식 평가가 아니라 어린 시절부터 특정 경전을 외웠다는 직접적인 독서·학습 기록이므로 작품 단위 콘텐츠로 등록한다.',
      'The same Hanshu sentence credits the eighteen-year-old Jia Yi with reciting the Shu alongside the Classic of Poetry. This is a specific record of memorized study of the Book of Documents, not a generic inference from his later reputation as a scholar.',
      'https://ctext.org/han-shu/jia-yi-zhuan/zhs',
      false
    ),
    (
      zuozhuan_uc_id, target_celeb_id, zuozhuan_content_id, 'FINISHED',
      '『한서』 「유림전」은 가의가 『춘추좌씨전』을 연구했고, 직접 훈고를 만들어 조나라 관공에게 전수했다고 기록한다. 읽었다는 수준을 넘어 본문을 해석하고 다음 학자에게 가르친 학술 활동이 명시되므로 가장 강한 작품 향유 근거로 채택한다.',
      'The Hanshu Treatise on Scholars states that Jia Yi studied the Zuo Tradition, produced explanatory glosses on it, and transmitted them to Master Guan of Zhao. Interpreting the text and teaching it to a successor is exceptionally strong evidence of direct engagement.',
      'https://ctext.org/han-shu/ru-lin-zhuan/zh',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '가의 user_contents 생성 수가 3건이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer
    FROM public.user_contents uc
    WHERE uc.content_id = c.id
  )
  WHERE c.id IN (shijing_content_id, shujing_content_id, zuozhuan_content_id);

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '가의 연결 콘텐츠 user_count 갱신 수가 3건이 아닙니다. 실제=%', affected;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        (shijing_content_id, 4),
        -- 기존 contents.user_count=22였지만 실제 user_contents는 24건이었다.
        -- 이번 연결 후 캐시를 실측값으로 바로잡으면 25가 되어야 한다.
        (shujing_content_id, 25),
        (zuozhuan_content_id, 2)
    ) AS expected(content_id, expected_count)
    JOIN public.contents c ON c.id = expected.content_id
    WHERE c.user_count <> expected.expected_count
  ) THEN
    RAISE EXCEPTION '가의 연결 콘텐츠의 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-jia-yi-full-v1',
    'Codex',
    ARRAY['가의', '賈誼', '贾谊', 'Jia Yi', 'Jia Sheng', '賈生'],
    '전한 문제 때의 사상가·문인 가의(기원전 200~168)를 동명이인과 분리하고, 본인이 지은 『신서』·「과진론」·「조굴원부」는 자체 저작이라 제외했다.',
    '한문 원문·중국어·영어·한국어 이름과 詩書·春秋左氏傳·read·recite·study·music·game·performance 조합으로 네 유형을 조사했다. 『한서』 「가의전」의 誦詩書는 학술 문헌에서 誦《詩》《書》로 해석되며, 「유림전」은 『춘추좌씨전』의 연구·훈고·전수를 별도로 명시한다. 이에 BOOK 3건을 채택했다. 예악에 관한 정치론과 본인 저작은 외부 콘텐츠 소비가 아니며, 특정 영상·게임·음악 작품 향유 근거는 찾지 못했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      shijing_finding_id, target_run_id, 'BOOK', 'accepted',
      '시경', '미상', shijing_content_id,
      '『한서』 「가의전」은 가의가 열여덟 살에 誦詩書로 이름났다고 하며, 경학 연구는 이를 誦《詩》《書》로 구분해 『시경』과 『서경』 암송으로 해석한다.',
      NULL
    ),
    (
      shujing_finding_id, target_run_id, 'BOOK', 'accepted',
      '서경', '공자 편', shujing_content_id,
      '『한서』 「가의전」의 같은 문장은 가의의 『서경』 암송 능력을 특정한다.',
      NULL
    ),
    (
      zuozhuan_finding_id, target_run_id, 'BOOK', 'accepted',
      '춘추좌전', '좌구명', zuozhuan_content_id,
      '『한서』 「유림전」은 가의가 『춘추좌씨전』을 연구하고 훈고를 지어 관공에게 전수했다고 기록한다.',
      NULL
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '가의의 부·정론과 후대 영상화', '가의 및 후대 제작자', NULL,
      '가의의 전기와 연구 문헌은 그의 부와 정치 논설을 자세히 다루지만 본인의 창작물이다.',
      '본인 저작과 후대 영상화는 가의가 감상한 외부 VIDEO 작품이 아니다. 생전의 특정 연극·영상 관람 기록도 확인되지 않는다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '한대 유희·경기 일반', NULL, NULL,
      '전기·경학 연구에서 가의의 특정 놀이 또는 게임 작품 사용 기록을 찾지 못했다.',
      '고대 놀이 일반은 디지털 GAME 작품이 아니며, 가의 개인의 구체적 플레이 기록도 없다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '예악론과 음악 일반', NULL, NULL,
      '가의의 사상에서 예악이 논의되지만 이는 정치·교화 원리다.',
      '곡명·작곡가·청취·연주 장면이 식별되지 않아 개별 MUSIC 콘텐츠로 등록할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '가의 조사 finding 생성 수가 6건이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (target_run_id, 'BOOK', shijing_finding_id,
     'https://ctext.org/han-shu/jia-yi-zhuan/zhs',
     'primary', 'archive', 'accessible',
     '『漢書』「賈誼傳」',
     '“年十八，以能誦詩書屬文稱於郡中” 원문을 확인했다.'),
    (target_run_id, 'BOOK', shijing_finding_id,
     'https://bdcl.nccu.edu.tw/uploads/chapter_file/file/649b4513367376274f2e3d8e/4%E8%AB%96_%E7%A9%80%E6%A2%81_%E5%82%B3%E7%BE%A9%E5%9C%A8%E6%BC%A2%E4%BB%A3%E7%9A%84%E6%94%BF%E6%B2%BB%E6%87%89%E7%94%A8.pdf',
     'secondary', 'article', 'accessible',
     '〈論《穀梁》傳義在漢代的政治應用〉',
     '가의전 문장을 “能誦《詩》《書》”로 문장부호를 붙여 두 경전을 고유 작품으로 해석한다.'),
    (target_run_id, 'BOOK', shijing_finding_id,
     'https://search.shopping.naver.com/book/catalog/32455455771',
     'secondary', 'official_profile', 'accessible',
     '시경 — 네이버 도서',
     '서비스 기존 콘텐츠 ISBN 9788932452661의 한국어 판본 메타데이터를 확인한다.'),
    (target_run_id, 'BOOK', shujing_finding_id,
     'https://ctext.org/han-shu/jia-yi-zhuan/zhs',
     'primary', 'archive', 'accessible',
     '『漢書』「賈誼傳」',
     '詩와 함께 書를 암송했다는 전기 원문을 확인했다.'),
    (target_run_id, 'BOOK', shujing_finding_id,
     'https://bdcl.nccu.edu.tw/uploads/chapter_file/file/649b4513367376274f2e3d8e/4%E8%AB%96_%E7%A9%80%E6%A2%81_%E5%82%B3%E7%BE%A9%E5%9C%A8%E6%BC%A2%E4%BB%A3%E7%9A%84%E6%94%BF%E6%B2%BB%E6%87%89%E7%94%A8.pdf',
     'secondary', 'article', 'accessible',
     '〈論《穀梁》傳義在漢代的政治應用〉',
     '該 구절의 書를 『서경』으로 해석하고 가의를 여러 경전에 통달한 학자로 분류한다.'),
    (target_run_id, 'BOOK', shujing_finding_id,
     'https://search.shopping.naver.com/book/catalog/32492303744',
     'secondary', 'official_profile', 'accessible',
     '서경 — 네이버 도서',
     '서비스 기존 콘텐츠 ISBN 9788932452708의 한국어 판본 메타데이터를 확인한다.'),
    (target_run_id, 'BOOK', zuozhuan_finding_id,
     'https://ctext.org/han-shu/ru-lin-zhuan/zh',
     'primary', 'archive', 'accessible',
     '『漢書』「儒林傳」',
     '“賈誼…修春秋左氏傳。誼為左氏傳訓故，授趙人貫公”이라는 연구·주석·전수 기록을 확인했다.'),
    (target_run_id, 'BOOK', zuozhuan_finding_id,
     'https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001514216',
     'secondary', 'article', 'accessible',
     '〈漢初 轉換期 賈誼의 儒敎的 禮敎理念과 敎化政策〉',
     '가의가 『춘추』를 수학하고 『춘추좌씨전』을 훈고한 유학자였음을 학술적으로 재확인한다.'),
    (target_run_id, 'BOOK', zuozhuan_finding_id,
     'https://search.shopping.naver.com/book/catalog/32492762849',
     'secondary', 'official_profile', 'accessible',
     '춘추좌전(상) — 네이버 도서',
     '서비스 기존 콘텐츠 ISBN 9788932452623의 한국어 판본 메타데이터를 확인한다.'),
    (target_run_id, 'VIDEO', video_finding_id,
     'https://ctext.org/han-shu/jia-yi-zhuan/zhs',
     'primary', 'archive', 'accessible',
     '『漢書』「賈誼傳」',
     '전기에는 가의의 본인 저작과 정치 활동이 나오지만 특정 공연·영상 감상은 기록되지 않는다.'),
    (target_run_id, 'GAME', game_finding_id,
     'https://ctext.org/han-shu/jia-yi-zhuan/zhs',
     'primary', 'archive', 'accessible',
     '『漢書』「賈誼傳」',
     '가의 개인의 특정 놀이·게임 참여 기록을 확인하지 못했다.'),
    (target_run_id, 'MUSIC', music_finding_id,
     'https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001514216',
     'secondary', 'article', 'accessible',
     '〈漢初 轉換期 賈誼의 儒敎的 禮敎理念과 敎化政策〉',
     '가의의 예악 논의는 교화 정책과 사상으로 다뤄지며 개별 음악 감상 기록은 제시되지 않는다.');

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 12 THEN
    RAISE EXCEPTION '가의 조사 source 생성 수가 12건이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed',
      completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN '賈誼·贾谊·Jia Yi·詩書·春秋左氏傳·recite·study·commentary 조합을 조사했다. 『한서』 두 전기와 학술 연구를 교차해 『시경』·『서경』·『춘추좌전』 3건을 채택했다.'
        WHEN 'VIDEO' THEN 'theatre·performance·watched·film 조합과 전기 원문을 조사했다. 본인 저작과 후대 영상화 외에 생전의 특정 작품 관람 기록이 없다.'
        WHEN 'GAME' THEN 'game·play·contest·board game 조합과 전기를 조사했다. 디지털 GAME 또는 특정 놀이 참여 기록이 없다.'
        WHEN 'MUSIC' THEN 'music·song·heard·performed·禮樂 조합을 조사했다. 예악은 정치·교화 원리로만 나오며 곡 단위 향유 근거는 없다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '가의 조사 scope 완료 수가 4건이 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 3 THEN
    RAISE EXCEPTION '가의 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id = target_celeb_id
    AND profile_type = 'CELEB'
    AND status = 'active'
    AND celeb_tier = 'light'
    AND content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '가의 light→full 승격 수가 1건이 아닙니다. 실제=%', affected;
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
    RAISE EXCEPTION '가의 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
