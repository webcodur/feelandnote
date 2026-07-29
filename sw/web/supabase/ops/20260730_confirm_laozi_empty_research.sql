-- 노자 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK   도덕경·노자 — 전승상 본인의 저술이며 역사적 저자 동일성도 불확실
--   VIDEO  후대 노자 소재 의례·공연·영상 — 사후 수용물
--   GAME   양생·수행·후대 게임화 — 디지털 GAME 소비 근거 없음
--   MUSIC  도덕경의 후대 음악화·도교 의례음악 — 생전 청취 작품 아님
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'fc2d4de1-ee3d-4b6d-960b-350affc02d6a'::uuid;
  target_run_id constant uuid := '75240945-b623-4932-992d-74771d4c9ce8'::uuid;
  rejected_book_finding_id constant uuid := '7a0351b1-bd5b-4db0-b82e-daef1d79f3d6'::uuid;
  rejected_video_finding_id constant uuid := 'fede8c64-84fa-41da-8b99-7e4691b1de09'::uuid;
  rejected_game_finding_id constant uuid := 'beb04081-aa90-472f-958f-eca17792668b'::uuid;
  rejected_music_finding_id constant uuid := 'b6e983a4-e4d7-45a4-9847-aea4f355d099'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'laozi'
      AND p.nickname = '노자'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '노자 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '노자에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      rejected_book_finding_id,
      rejected_video_finding_id,
      rejected_game_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '노자 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-laozi-full-v1',
    'Codex',
    ARRAY['노자', '老子', '이이', '李耳', '노담', '老聃', 'Laozi', 'Lao Tzu', 'Lao-tzu', 'Lao Dan'],
    '전통적으로 공자보다 앞선 사상가로 전해지는 노자를 문헌 제목 『노자』, 노래자(老萊子), 주 태사 담(儋), 후대 도교 신격과 분리했다. 현대 연구는 단일 역사 인물과 『도덕경』 저자 동일성을 확정하지 않는다.',
    '한문·한국어·영어 이름 변형과 read·book·archive·ritual·performance·game·music 조합으로 『사기』 원문, Stanford·IEP의 현대 문헌학 개설을 대조했다. 『사기』는 노자를 주 왕실 장서 관리자로 전하지만 읽은 특정 외부 저작을 적지 않고, 관문에서 썼다는 오천여 자 책은 전승상 본인의 저술이다. 공자와의 예문답도 책 감상이 아니며, 노자의 역사성·『도덕경』 단일 저자설 자체가 논쟁적이다. 후대 종교 의례·음악화·영상·게임화는 사후 수용물이므로 네 유형 모두 0건으로 완료했다.'
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
      '도덕경·노자',
      '노자 전승',
      NULL,
      '『사기』는 노자가 주 왕실 장서를 맡았고 관문에서 도와 덕의 뜻을 쓴 오천여 자 책을 남겼다고 전한다.',
      '장서 관리 직책은 특정 작품 독서 기록이 아니며, 오천여 자 책은 전승상 본인의 저술이다. 현대 문헌학은 현전 『노자』가 여러 손을 거쳐 형성된 복합 문헌일 가능성을 높게 본다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '후대 노자 소재 의례·공연·영상',
      NULL,
      NULL,
      '후대 도교는 노자를 신격화했고 『도덕경』 낭송과 노자 소재 공연·영상이 만들어졌다.',
      '노자 추정 생존 시기보다 수세기 이후 형성된 종교적 수용과 현대 각색이다. 본인이 관람한 특정 작품으로 볼 수 없다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '양생·수행 전승과 후대 노자 게임화',
      NULL,
      NULL,
      '후대 전기는 노자의 장수·양생·신선술을 확대하고 현대 게임은 노자를 캐릭터로 사용한다.',
      '양생·수행은 디지털 게임 작품이 아니고 후대 게임은 본인이 플레이한 콘텐츠가 아니다. 특정 GAME 이용 기록은 없다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '도덕경의 후대 음악화와 도교 의례음악',
      NULL,
      NULL,
      '『도덕경』은 후대에 낭송·의례·음악으로 수용되었고 노자는 도교 신격이 되었다.',
      '이 음악화는 노자 추정 생존 시기보다 훨씬 뒤의 수용사다. 노자가 들은 곡명·창작자·공연 기록은 전하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '노자 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://zh.wikisource.org/zh-hant/%E5%8F%B2%E8%A8%98/%E5%8D%B7063',
      'primary',
      'archive',
      'accessible',
      '史記 卷六十三 老子韓非列傳',
      '주 수장실사 직책, 공자와의 예문답, 관문에서 오천여 자 책을 직접 저술했다는 가장 이른 전기의 원문을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://plato.stanford.edu/entries/laozi/',
      'secondary',
      'article',
      'accessible',
      'Laozi — Stanford Encyclopedia of Philosophy',
      '사마천 전기의 불확실성, 노자의 역사성 논쟁, 『노자』의 복합 편찬·저자 문제를 대조했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://plato.stanford.edu/entries/laozi/',
      'secondary',
      'article',
      'accessible',
      'Laozi — Stanford Encyclopedia of Philosophy',
      '노자 전기의 층위와 후대 신격화·변신 설화를 확인하고 생전 특정 관람작과 분리했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://plato.stanford.edu/entries/laozi/',
      'secondary',
      'article',
      'accessible',
      'Laozi — Stanford Encyclopedia of Philosophy',
      '후대 양생·신선술·신격화 전승이 역사적 노자의 디지털 GAME 이용 기록이 아님을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://plato.stanford.edu/entries/laozi/',
      'secondary',
      'article',
      'accessible',
      'Laozi — Stanford Encyclopedia of Philosophy',
      '『도덕경』의 후대 낭송·의례·음악화와 역사적 노자의 생전 감상을 구분했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '노자 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '노자·老子·李耳·老聃·Laozi·Lao Tzu와 read·book·archive·classic 조합을 검색했다. 주 왕실 장서 관리 직책에는 특정 서명이 없고 『도덕경』은 본인 저술 전승이자 저자 동일성이 불확실해 외부 감상작에서 제외했다.'
      WHEN 'VIDEO' THEN
        'watched·theatre·performance·ritual·film 조합을 검색했다. 확인되는 것은 후대 신격화·의례·현대 각색이며 생전 관람한 특정 작품은 없다.'
      WHEN 'GAME' THEN
        'game·played·chess·양생·수행 조합을 검색했다. 후대 수행 전승과 현대 게임 캐릭터화뿐이며 작품 단위 디지털 GAME 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·ritual·chant·heard 조합을 검색했다. 『도덕경』 음악화와 도교 의례음악은 후대 수용이고 노자의 특정 곡 청취 기록은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '노자 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '노자 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '노자 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 5
  ) THEN
    RAISE EXCEPTION '노자 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
