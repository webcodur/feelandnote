-- 한니발 바르카 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  한니발의 그리스어 저술 — 본인 창작물
--   BOOK  소실루스의 7권짜리 한니발 전쟁사 — 동행자의 저술, 독서 증거 없음
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '0e7d6179-882d-4e30-a0e9-fd6dc62c438d'::uuid;
  target_run_id constant uuid := 'e1513aa5-c07c-4deb-bd92-75ca98cb6664'::uuid;
  rejected_own_book_finding_id constant uuid := 'fef44580-0e93-4c35-b9ec-6d1a31071e17'::uuid;
  rejected_sosylus_finding_id constant uuid := '6b778fad-2ae9-4938-9663-446d3d53a81a'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'hannibal-barca'
      AND p.nickname = '한니발 바르카'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '한니발 바르카 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id) THEN
    RAISE EXCEPTION '한니발 바르카에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_own_book_finding_id, rejected_sosylus_finding_id)
  ) THEN
    RAISE EXCEPTION '한니발 바르카 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  )
  VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-hannibal-barca-full-v1',
    'Codex',
    ARRAY['한니발 바르카', '한니발', 'Hannibal Barca', 'Hannibal', 'Annibal', 'Ἀννίβας'],
    '토머스 해리스의 소설과 영화·TV 시리즈의 허구 인물 한니발 렉터, 영화 《Hannibal》과 OST·게임, 한니발을 소재로 한 현대 역사물은 카르타고 장군의 소비 콘텐츠가 아니므로 제외했다. 다른 고대 한니발과 현대 동명인도 구분했다.',
    '한국어·영어·라틴어·그리스어 이름 변형으로 네 콘텐츠 유형을 검색하고 코르넬리우스 네포스·폴리비오스·디오도로스의 고대 기록과 현대 고전학 주석을 대조했다. 네포스는 한니발이 그리스어로 여러 책을 썼고 소실루스에게 그리스 문학을 배웠다고 전하지만, 전자는 본인 저술이고 후자는 특정 외부 작품 독서가 아니다. 소실루스의 7권짜리 전쟁사도 동행자가 한니발을 소재로 쓴 소실 작품일 뿐 한니발이 읽었다는 증거는 없다. 특정 영상·디지털 게임·음악 작품 소비 기록도 없어 네 유형 모두 채택 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  )
  VALUES
    (
      rejected_own_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '그나이우스 만리우스 불소의 아시아 행적에 관하여',
      '한니발 바르카',
      NULL,
      '코르넬리우스 네포스는 한니발이 그리스어로 여러 책을 썼고 그중 로도스인들에게 보낸 그나이우스 만리우스 불소의 아시아 행적에 관한 책이 있었다고 기록한다.',
      '한니발 본인의 창작물이지 그가 소비한 외부 콘텐츠가 아니다. 나머지 저술의 제목·본문도 전하지 않아 별도 독서 항목으로 만들 수 없다.'
    ),
    (
      rejected_sosylus_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '한니발 전쟁사 7권',
      '라케다이몬의 소실루스',
      NULL,
      '네포스는 소실루스가 한니발의 그리스어 스승이자 진중 동행자였다고 전하고, 디오도로스와 후대 주석은 소실루스가 한니발 전쟁을 7권으로 기록했다고 전한다.',
      '소실루스가 한니발을 소재로 쓴 동행 기록이라는 사실만 확인된다. 한니발이 이 작품의 완성본이나 특정 권을 읽었다는 증언은 없으며 작품도 극히 일부 파편만 남았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '한니발 바르카 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  )
  VALUES
    (
      target_run_id,
      'BOOK',
      rejected_own_book_finding_id,
      'https://www.attalus.org/translate/nepos23.html',
      'primary',
      'archive',
      'accessible',
      'Cornelius Nepos, Life of Hannibal, chapter 13',
      '한니발이 그리스어로 여러 책을 썼고 만리우스 불소의 행적을 다룬 책이 있었다는 고대 전기 기록을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_own_book_finding_id,
      'https://books.openedition.org/obp/27067',
      'primary',
      'archive',
      'accessible',
      'Cornelius Nepos, Life of Hannibal: Latin text',
      '네포스 13장의 라틴어 원문에서 본인 저술과 소실루스의 그리스어 교육을 대조했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_sosylus_finding_id,
      'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Diodorus_Siculus/26%2A.html',
      'primary',
      'archive',
      'accessible',
      'Diodorus Siculus, Library of History, Book 26',
      '소실루스가 한니발의 행적을 7권으로 기록했다는 전승을 확인했다. 한니발이 읽었다는 문장은 없다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Polybius/3%2A.html',
      'primary',
      'archive',
      'accessible',
      'Polybius, Histories, Book 3',
      '한니발의 생애와 제2차 포에니 전쟁 기록을 watched·theatre·performance 조합과 대조했다. 특정 관람 작품은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://scaife.perseus.org/reader/urn:cts:greekLit:tlg0543.tlg001.perseus-eng2:15.6/',
      'primary',
      'archive',
      'accessible',
      'Polybius, Histories 15.6: Meeting of Hannibal and Scipio',
      '전쟁·협상·전략 기록을 game·played·board game·dice 조합과 대조했다. 실제 군사 전략은 디지털 GAME 플레이가 아니다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0104:entry=hannibal-bio-11',
      'secondary',
      'article',
      'accessible',
      'Hannibal, Dictionary of Greek and Roman Biography and Mythology',
      '현존하는 개인 일화가 매우 적다는 전기 자료와 music·song·dance·performance 조합을 대조했다. 특정 곡·연주·공연 소비는 확인되지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '한니발 바르카 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Hannibal Barca·Hannibal·Annibal·Ἀννίβας와 read·book·Greek literature·Sosylus·Silenus·wrote 조합을 검색했다. 그리스어 저술은 본인 창작이고 소실루스의 전쟁사는 한니발이 읽었다는 증거가 없다. 그리스 문학 교육도 작품명이 없어 제외했다.'
      WHEN 'VIDEO' THEN
        'Hannibal Barca와 watched·theatre·performance·spectacle·film 조합을 검색했다. 고대 사료에는 특정 연극·시각 작품 관람 기록이 없고 한니발 렉터 및 현대 역사 영화·다큐멘터리는 후대 창작물이라 제외했다.'
      WHEN 'GAME' THEN
        'Hannibal Barca와 game·played·board game·dice·strategy 조합을 검색했다. 실제 전투 지휘와 전술은 디지털 게임 플레이가 아니며 현대 전략게임 속 캐릭터·캠페인은 후대 제작물이다.'
      WHEN 'MUSIC' THEN
        'Hannibal Barca와 music·song·dance·performance 조합을 검색했다. 군대·궁정 생활을 다룬 사료와 현대 영화·게임 OST만 확인되며 본인이 들은 특정 곡·연주자·공연 기록은 없었다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '한니발 바르카 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '한니발 바르카 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '한니발 바르카 프로필·0건 확정 최종 검증에 실패했습니다.';
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
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 2
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '한니발 바르카 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
