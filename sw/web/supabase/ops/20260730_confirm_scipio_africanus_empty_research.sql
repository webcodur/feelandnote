-- 스키피오 아프리카누스(대 스키피오) BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  그리스어 소책자들 — 리비우스가 독서 행위만 전하고 작품명을 남기지 않음
--   BOOK  키루스의 교육 — 독서 기록의 주체가 양손자 스키피오 아이밀리아누스임
--   BOOK  스키피오 — 엔니우스의 찬가를 본인이 소비했다는 근거가 없고 사후 작품설도 있음
--   MUSIC 축제 때 맞춘 음악·리듬 — 세네카가 춤을 전하지만 곡명을 식별할 수 없음
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'e0965abb-0d3a-4133-9e36-07372e12d699'::uuid;
  target_run_id constant uuid := '6214c64f-ba7d-4e67-b1cf-15b2017254bf'::uuid;
  rejected_greek_books_finding_id constant uuid := '14ea8ee7-9249-48e5-b182-45a3d6945232'::uuid;
  rejected_cyropaedia_finding_id constant uuid := 'c9336509-ae07-4468-9e6b-7500832decef'::uuid;
  rejected_ennius_finding_id constant uuid := '60cf3a22-cfa3-41a1-a8e1-16cadff374b1'::uuid;
  rejected_music_finding_id constant uuid := '85c3c865-340a-4023-b127-bb3be2d0e534'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'scipio-africanus'
      AND p.nickname = '스키피오 아프리카누스'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '스키피오 아프리카누스 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '스키피오 아프리카누스에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id
       OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      rejected_greek_books_finding_id,
      rejected_cyropaedia_finding_id,
      rejected_ennius_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '스키피오 아프리카누스 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
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
    '2026-07-30-scipio-africanus-full-v1',
    'Codex',
    ARRAY[
      '스키피오 아프리카누스',
      '대 스키피오',
      'Scipio Africanus',
      'Scipio Africanus Major',
      'Scipio the Elder',
      'Publius Cornelius Scipio Africanus',
      'Publio Cornelio Scipione Africano'
    ],
    '한니발을 자마에서 꺾은 대(大) 스키피오(약 기원전 236~183)와 그의 아들·양손자를 거쳐 이름을 이은 소(小) 스키피오 아이밀리아누스(기원전 185/184~129)를 분리했다. 키케로의 “아프리카누스가 크세노폰을 늘 손에 들었다”는 구절은 현대 고전학 문헌이 양손자 아이밀리아누스의 일로 명시하므로 본인 근거에서 제외했다. 스키피오를 소재로 한 후대 영화·오페라·게임도 생전 소비 작품이 아니다.',
    '한국어·영어·라틴어·이탈리아어 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 리비우스·키케로·세네카의 고대 문헌과 현대 고전학 자료를 대조했다. 리비우스는 시라쿠사에서 그리스어 책을 읽었다고 전하지만 제목은 기록하지 않았다. 『키루스의 교육』은 소 스키피오의 독서 기록이며, 엔니우스의 『스키피오』는 본인이 읽거나 들었다는 증거가 없고 사후 작성설도 있다. 세네카는 그가 축제 때 음악이나 리듬에 맞춰 춤췄다고 전하지만 작품명은 없다. 특정 영상·디지털 게임도 확인되지 않아 네 유형 모두 채택 0건으로 완료했다.'
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
      rejected_greek_books_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '그리스어 소책자들(작품명 미상)',
      NULL,
      NULL,
      '리비우스 『로마사』 29.19는 기원전 204년 시라쿠사에서 스키피오가 그리스식 망토와 샌들을 신고 체육관을 거닐며 그리스어 책과 신체 훈련에 시간을 썼다는 비난을 기록한다.',
      '독서 행위는 확인되지만 libellis/그리스어 책이라는 총칭만 있고 작품명·저자·판본이 없다. 작품 단위 BOOK으로 식별하거나 메타데이터에 연결할 수 없다.'
    ),
    (
      rejected_cyropaedia_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '키루스의 교육',
      '크세노폰',
      NULL,
      '키케로 『투스쿨룸 논쟁』 2.62는 “아프리카누스”가 크세노폰을 늘 손에 들었다고 전한다. 현대 판본과 고전학 개론서는 이 인물을 대 스키피오의 양손자 스키피오 아이밀리아누스로 식별한다.',
      '동일한 Africanus 칭호 때문에 대 스키피오에게 잘못 합쳐진 동명이인 기록이다. 조사 대상은 기원전 183년에 사망한 대 스키피오이며, 해당 독자는 기원전 185/184년에 태어난 소 스키피오이므로 채택할 수 없다.'
    ),
    (
      rejected_ennius_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '스키피오(Scipio)',
      '퀸투스 엔니우스',
      NULL,
      '엔니우스의 소실된 찬가 또는 극작품 『스키피오』가 대 스키피오를 기렸다는 파편과 후대 논의가 남아 있다.',
      '대 스키피오가 이 작품을 읽거나 공연으로 접했다는 직접 기록이 없다. 현대 연구는 작품의 장르·연대·후원 관계 자체를 논쟁적으로 보며 사후 작성설도 제시하므로 소비 콘텐츠로 확정할 수 없다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '축제 때 맞춘 음악·리듬(곡명 미상)',
      NULL,
      NULL,
      '세네카 『마음의 평정에 관하여』 17.4는 스키피오가 놀이와 축제 때 음악 또는 리듬에 맞춰 군인다운 몸을 움직여 춤췄다고 전한다.',
      '춤과 음악의 존재만 확인될 뿐 곡명·연주자·작곡자·특정 공연이 없다. 작품 단위 MUSIC으로 식별할 수 없고, 세네카도 스키피오보다 약 2세기 뒤의 도덕적 일화로 제시한다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '스키피오 아프리카누스 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
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
      rejected_greek_books_finding_id,
      'https://www.perseus.tufts.edu/hopper/text?doc=Liv.+29.19.11&lang=original',
      'primary',
      'archive',
      'accessible',
      'Livy, History of Rome 29.19.11–13',
      '그리스식 복장으로 체육관을 거닐며 그리스어 책과 신체 훈련에 시간을 썼다는 1949년 Loeb 영문 번역을 확인했다. 개별 작품명은 없다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_cyropaedia_finding_id,
      'https://en.wikisource.org/wiki/Cicero%27s_Tusculan_Disputations/Tusculan_Disputations/Book_2',
      'primary',
      'archive',
      'accessible',
      'Cicero, Tusculan Disputations 2.62',
      '“Africanus had always in his hands Xenophon”이라는 고대 전승의 실제 문구를 확인했다. 본문 자체는 대·소 스키피오를 풀어 쓰지 않는다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_cyropaedia_finding_id,
      'https://assets.cambridge.org/97811076/52156/excerpt/9781107652156_excerpt.pdf',
      'secondary',
      'archive',
      'accessible',
      'The Cambridge Companion to Xenophon, Introduction',
      '해당 인물을 “Scipio Aemilianus (the adopted grandson of Scipio Africanus)”로 명시하고 『키루스의 교육』을 늘 지녔다고 설명하는 1쪽을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_ennius_finding_id,
      'https://bmcr.brynmawr.edu/2009/2009.04.19/',
      'secondary',
      'article',
      'accessible',
      'Ennius Perennis: The Annals and Beyond, Bryn Mawr Classical Review',
      '엔니우스와 스키피오의 후원 관계에 관한 키케로 전승을 신중히 다뤄야 하며, 파편 찬가와 『스키피오』를 스키피오 사후 작품으로 보는 연구 논의를 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_ennius_finding_id,
      'https://www.cambridge.org/core/books/abs/ennius-beyond-epic/scipio-invicte/0C143365000AA595D3349E5F364A7500',
      'secondary',
      'article',
      'accessible',
      'Scipio Invicte! Ennius and the Poetry of Praise',
      '엔니우스의 스키피오 찬양 파편과 장르가 불명확한 동명 작품을 현대 연구가 “deeply problematic work”로 다루는 것을 확인했다. 본인의 소비 증거는 제시되지 않는다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://www.nationalgallery.org.uk/paintings/glossary/scipio',
      'secondary',
      'official_profile',
      'accessible',
      'Scipio, National Gallery glossary',
      '대 스키피오와 양손자 소 스키피오를 구분하고 후대 회화·문학의 스키피오 소재를 대조했다. 생전 관람한 특정 연극·시각 작품 기록은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://www.nebraskapress.unl.edu/potomac-books/9781597972055/scipio-africanus/',
      'secondary',
      'official_profile',
      'accessible',
      'Scipio Africanus: Rome’s Greatest General, University of Nebraska Press',
      '현존 고대 자료와 현대 전기의 범위를 대조하고 played·game·dice·board game 조합을 검색했다. 체육관 훈련과 축제 놀이는 특정 디지털 게임 작품이 아니며 플레이 기록도 없다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://en.wikisource.org/wiki/De_Tranquillitate_Animi',
      'primary',
      'archive',
      'accessible',
      'Seneca, Of Peace of Mind 17.4',
      '스키피오가 놀이·축제 때 음악에 맞춰 춤췄다는 영문 번역을 확인했다. 특정 음악 작품명은 나오지 않는다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.latin.it/autore/seneca/de_tranquillitate_animi',
      'primary',
      'archive',
      'accessible',
      'Seneca, De tranquillitate animi 17.4, Latin text',
      '원문 “corpus movebat ad numeros”와 “inter lusum ac festa tempora ... tripudiare”를 대조했다. numeros는 리듬을 가리킬 뿐 곡명을 특정하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 9 THEN
    RAISE EXCEPTION '스키피오 아프리카누스 조사 source 생성 행 수가 9가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Scipio Africanus Major·Scipio the Elder·Publio Cornelio Scipione Africano와 read·book·Greek books·Xenophon·Cyropaedia·Ennius 조합을 검색했다. 리비우스는 그리스어 책 독서를 전하지만 제목을 남기지 않는다. 『키루스의 교육』 기록은 양손자 아이밀리아누스의 것이며, 엔니우스의 『스키피오』는 소비 증거와 연대가 불확실하다. 대 스키피오 자신의 소실 회고록과 그를 소재로 한 후대 전기도 창작물·후대물이라 제외했다.'
      WHEN 'VIDEO' THEN
        'Scipio Africanus Major와 theatre·play·performance·watched·film·spectacle 조합을 검색하고 대·소 스키피오 구분 자료를 대조했다. 리비우스 주석이 전하는 체육관·극장 비난은 특정 작품명을 주지 않으며, 『스키피오네』 오페라·1937년 영화·회화는 모두 사후 제작물이라 제외했다.'
      WHEN 'GAME' THEN
        'Scipio Africanus Major와 game·played·dice·board game·video game·ludus 조합을 검색했다. 시라쿠사 체육관의 신체 훈련과 로마 축제의 놀이는 작품 단위 디지털 GAME이 아니다. 현대 전략 게임 속 스키피오 캐릭터도 사후 제작물이라 제외했다.'
      WHEN 'MUSIC' THEN
        'Scipio Africanus Major와 music·song·dance·rhythm·numeros·tripudiare 조합을 검색했다. 세네카는 음악·리듬에 맞춘 축제 춤을 전하지만 곡명·연주자·공연명을 주지 않는다. 살리이 의례 노래나 후대 오페라를 본인이 들었다고 확정할 근거도 없어 채택하지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '스키피오 아프리카누스 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT
    result.final_research_status,
    result.actual_content_count
  INTO
    completed_status,
    completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION
      '스키피오 아프리카누스 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
      completed_status,
      completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (
        SELECT count(*)
        FROM public.user_contents uc
        WHERE uc.user_id = p.id
      ) = 0
  ) THEN
    RAISE EXCEPTION '스키피오 아프리카누스 프로필·0건 확정 최종 검증에 실패했습니다.';
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
          AND f.decision = 'rejected'
      ) = 4
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_sources src
        WHERE src.run_id = r.id
      ) = 9
  ) THEN
    RAISE EXCEPTION '스키피오 아프리카누스 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
