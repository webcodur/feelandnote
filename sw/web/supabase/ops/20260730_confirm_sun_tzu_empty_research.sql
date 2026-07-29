-- 손자 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  군정(軍政) — 『손자병법』에 인용된 선행 병서이나 현전하지 않고
--                       저자·판본·역사적 손무의 직접 독서 여부를 확정할 수 없음
--   MUSIC 징·북 — 음악 감상이 아니라 전장 지휘 신호임
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '71ee7d5f-b876-4b86-8bfc-df635acea863'::uuid;
  target_run_id constant uuid := '5156e2d4-81e3-4d46-84d2-382500d33fad'::uuid;
  rejected_book_finding_id constant uuid := 'c650ef55-1715-4af7-90fc-1021d4506c2b'::uuid;
  rejected_music_finding_id constant uuid := 'def4646d-8772-436a-9215-77064501fe24'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'sun-tzu'
      AND p.nickname = '손자'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '손자 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '손자에게 이미 연결된 콘텐츠가 있습니다.';
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
      rejected_book_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '손자 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
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
    '2026-07-30-sun-tzu-full-v1',
    'Codex',
    ARRAY[
      '손자',
      '손무',
      '손장경',
      'Sun Tzu',
      'Sun Zi',
      'Sun Wu',
      'Sunzi',
      '孫子',
      '孫武'
    ],
    '후대 인물 손빈(孫臏)과 그의 『손빈병법』은 별개 인물·저작으로 제외했다. 손자·Sun Tzu를 제목이나 캐릭터로 쓴 현대 영화·게임·음악도 역사적 손무가 소비한 작품이 아니므로 제외했다. 『손자병법』은 본인 또는 그 학파에 귀속되는 창작물이라 소비 도서로 세지 않았고, 사마천의 손무 전기는 추정 생애보다 약 4세기 뒤 기록이라는 한계를 적용했다.',
    '한국어·영어·중국어 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 『사기』 「손자오기열전」, 『손자병법』 원문·고전 번역, 현대 전쟁사 연구를 대조했다. 『손자병법』 7편이 선행 병서 『군정』을 인용하지만 그 책은 현전하지 않고 저자·판본이 없으며, 텍스트의 후대 편찬 가능성 때문에 역사적 손무 개인의 독서 이력으로 확정할 수 없다. 징과 북은 전장 신호일 뿐 음악 작품이 아니고, 특정 영상 관람이나 디지털 게임 플레이 근거도 없어 네 유형 모두 채택 0건으로 완료했다.'
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
      rejected_book_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '군정(軍政, Book of Army Management)',
      NULL,
      NULL,
      '현전 『손자병법』 7편은 “군정에 이르기를”이라며 말이 들리지 않는 전장에서 징과 북을 쓰고 보이지 않는 곳에서 깃발을 쓴다는 선행 군사 문헌을 인용한다.',
      '『군정』은 현전하지 않아 저자·구성·판본을 식별할 수 없고 등록 가능한 도서 메타데이터도 없다. 더구나 『손자병법』의 성립 시기와 단일 저자 여부가 논쟁적이어서 이 인용을 기원전 6세기 손무 개인의 직접 독서로 확정할 수 없다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '징과 북의 전장 신호',
      NULL,
      NULL,
      '『손자병법』 7편은 말이 멀리 들리지 않는 전장에서 부대의 귀와 눈을 한곳에 모으기 위해 징·북과 깃발을 사용한다고 설명한다.',
      '이는 선율·곡명·창작자가 있는 음악 감상이나 연주가 아니라 명령 전달을 위한 군사 신호다. 특정 MUSIC 작품으로 식별할 수 없어 기각했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '손자 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
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
      rejected_book_finding_id,
      'https://www.gutenberg.org/files/66706/66706-h/66706-h.htm',
      'primary',
      'archive',
      'accessible',
      'Sun Tzŭ on the Art of War, Lionel Giles translation',
      '7편의 『군정』 인용과 Lionel Giles의 문헌 주석을 확인했다. 주석도 이를 당시에 존재했으나 현재는 사라진 더 이른 군사 문헌으로 설명한다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://ctext.org/shiji/sun-zi-wu-qi-lie-zhuan/ens',
      'primary',
      'archive',
      'accessible',
      'Shiji: Biographies of Sunzi and Wu Qi',
      '사마천 전기는 합려가 손자의 13편을 모두 읽었다고 기록할 뿐, 손자가 읽은 다른 제목 있는 도서는 제시하지 않는다. 손빈 대목과도 인물을 구분했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://onlinelibrary.wiley.com/doi/abs/10.1002/9781444338232.wbeow613',
      'secondary',
      'article',
      'accessible',
      'Sun Zi (Sun Tzu) (ca. fourth century BCE), The Encyclopedia of War',
      '문체·내용의 시대착오와 고고학 자료를 근거로 기원전 4세기 성립 및 단일 저술보다 편찬일 가능성을 제시한다. 역사적 손무 개인에게 인용 문헌을 곧바로 귀속하지 않는 근거다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://www.worldhistory.org/Sun-Tzu/',
      'secondary',
      'article',
      'accessible',
      'Sun-Tzu, World History Encyclopedia',
      '추정 생애와 사료 한계를 확인하고 Sun Tzu·Sun Wu와 watched·film·drama·performance 조합을 검색했다. 고대의 특정 관람 작품은 없고 현대 영상은 모두 후대 재현물이다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://chiculture.org.hk/en/china-five-thousand-years/3283',
      'secondary',
      'article',
      'accessible',
      'Sun-Wu and Military Thought, Academy of Chinese Studies',
      '손무의 전승·병가 계보와 game·board game·weiqi·played 조합을 대조했으나 특정 디지털 게임 플레이 근거는 없다. 바둑 등 고대 놀이도 손무 개인과 연결되는 사료를 찾지 못했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://classics.mit.edu/Tzu/artwar.html',
      'primary',
      'archive',
      'accessible',
      'The Art of War by Sun Tzu, MIT Internet Classics Archive',
      'Lionel Giles 번역 전문에서 징·북이 부대 지휘를 위한 청각 신호로 쓰인 맥락을 확인했다. 음악 작품 청취 기록은 아니다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://en.wikisource.org/wiki/The_Art_of_War_(Sun)/Section_VII',
      'primary',
      'archive',
      'accessible',
      'The Art of War, Section VII: Maneuvering',
      '원문 한자와 번역·주석을 함께 대조했다. 징·북은 말이 전달되지 않는 전장에서 군의 귀를 한곳에 모으는 장치로 설명된다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '손자 조사 source 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '손자·손무·Sun Tzu·Sun Zi·Sun Wu·孫武와 read·book·text·military classic·influence·軍書 조합을 검색했다. 『사기』는 합려가 손자의 13편을 읽었다고만 전하며, 본인의 『손자병법』은 창작물이라 제외했다. 『손자병법』 7편이 인용한 『군정』은 특정 선행 문헌 후보지만 현전하지 않고 저자·판본이 없으며 텍스트 성립도 후대 편찬 가능성이 있어 개인 독서로 확정하지 않았다. 손빈과 그의 병서는 별도 인물·저작으로 제외했다.'
      WHEN 'VIDEO' THEN
        'Sun Tzu·Sun Wu·孫武와 watched·film·theatre·drama·performance 조합을 검색하고 추정 생애가 기원전 6–5세기라는 점과 사료 한계를 대조했다. 현대 영화·애니메이션·다큐멘터리·강연은 모두 후대 창작이고, 당대 특정 관람 작품은 확인되지 않았다.'
      WHEN 'GAME' THEN
        'Sun Tzu·Sun Wu와 game·played·board game·weiqi·chess·strategy game 조합을 검색했다. 손자를 캐릭터·전략 소재로 쓰는 현대 비디오게임은 후대 작품이고, 바둑 등 고대 놀이를 손무 개인이 했다는 사료도 확인되지 않아 디지털 GAME 채택 후보가 없다.'
      WHEN 'MUSIC' THEN
        'Sun Tzu·Sun Wu와 music·song·drum·gong·performance 조합을 검색했다. 『손자병법』의 징·북은 전장에서 음성 명령을 대신하는 신호 장치이며 곡명·연주·감상 기록이 아니다. 손자 또는 『손자병법』을 소재로 한 현대 음악은 후대 창작이라 제외했다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '손자 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
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
      '손자 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '손자 프로필·0건 확정 최종 검증에 실패했습니다.';
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
      ) = 2
      AND (
        SELECT count(*)
        FROM public.celeb_content_research_sources src
        WHERE src.run_id = r.id
      ) = 7
  ) THEN
    RAISE EXCEPTION '손자 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
