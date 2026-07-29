-- 하룬 알 라시드 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  그리스 의학·자연철학 번역서 — 번역 후원은 확인되나 본인 독서 작품은 특정되지 않음
--   VIDEO 천일야화의 하룬 이야기 — 본인이 감상한 작품이 아니라 후대의 허구화
--   GAME  락까 경마 — 실제 스포츠이며 디지털 게임 작품이 아님
--   MUSIC 하룬을 위해 선곡된 100곡 — 선곡집 관계는 확인되나 개별 작품 식별자가 없음
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '5e11ba7e-2bb9-419a-81a6-c11f6dc515c2'::uuid;
  target_run_id constant uuid := '4b6b9cbe-cd80-4354-8b53-db596d8d4cdb'::uuid;
  rejected_book_finding_id constant uuid := 'b809e15d-e6f3-4c1e-9f30-c068ecc22755'::uuid;
  rejected_video_finding_id constant uuid := '7fca8558-080b-47fc-9dfa-d9145807d430'::uuid;
  rejected_game_finding_id constant uuid := 'f0a241e0-adce-49f3-a788-be56a5831509'::uuid;
  rejected_music_finding_id constant uuid := '3f508d8b-5b48-45fa-bb31-642dbe41aacc'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'harun-al-rashid'
      AND p.nickname = '하룬 알 라시드'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '하룬 알 라시드 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '하룬 알 라시드에게 이미 연결된 콘텐츠가 있습니다.';
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
      rejected_video_finding_id,
      rejected_game_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '하룬 알 라시드 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
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
    '2026-07-30-harun-al-rashid-full-v1',
    'Codex',
    ARRAY[
      '하룬 알 라시드',
      '하룬 아르 라시드',
      'هارون الرشيد',
      'Hārūn al-Rashīd',
      'Harun al-Rashid',
      'Haroun al-Raschid'
    ],
    '아바스 왕조 칼리프 하룬 알 라시드(약 763~809)와 아들 알아민·알마문, 후대 칼리프 알와시크 및 『천일야화』·근대 무대 작품의 허구 인물을 분리했다. 10세기 아부 알파라즈 알이스파하니가 편찬한 『노래의 책』 자체도 하룬 사후 저작이므로 본인의 독서 콘텐츠가 아니다.',
    '아랍어·영어·한국어 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 의학 번역사, 『노래의 책』 도서관 원장, 알마수디 전승과 현대 학술 자료를 대조했다. 그리스 학술서 번역 후원, 실제 경마, 궁정 음악 향유는 확인된다. 특히 하룬을 위해 이브라힘 알마우실리가 고른 100곡이라는 음악 관계는 강하지만, 후대 선집에서 개별 곡을 하룬의 실제 청취 기록과 현대 작품 식별자로 일대일 연결할 수 없다. 『천일야화』는 하룬이 등장하는 후대 이야기다. 네 유형 모두 현재 서비스에 등록 가능한 작품 단위 콘텐츠는 0건이다.'
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
      '그리스 의학·자연철학 번역서(개별 독서작 미확정)',
      NULL,
      NULL,
      '이븐 알나딤 전승을 정리한 번역사 자료는 하룬이 정복지에서 확보한 고대 의학서를 번역하도록 임명했고, 그의 치세에 아리스토텔레스 『자연학』 번역도 이루어졌다고 전한다.',
      '궁정 번역 후원과 번역본 생산은 확인되지만 하룬 자신이 읽은 특정 번역본·판본·번역자를 작품 단위로 확정하는 직접 기록은 아니다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '천일야화의 하룬 알 라시드 이야기',
      NULL,
      NULL,
      '『천일야화』의 여러 이야기는 하룬 알 라시드를 주인공이나 궁정 인물로 등장시키며 후대 무대·영상 각색의 원천이 되었다.',
      '하룬이 감상한 작품이 아니라 실제 인물을 후대에 허구화한 이야기군이다. 편찬·각색 시기도 본인 사후이므로 소비 VIDEO로 등록할 수 없다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '락까 경마',
      NULL,
      NULL,
      '알마수디가 전한 일화에는 하룬이 락까에서 경마를 열고 자신의 말과 아들 알마문의 말이 1·2위로 들어오자 기뻐한 장면이 있다.',
      '경마 개최와 관람은 실제 승마 스포츠이며 작품 단위 디지털 GAME이 아니다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '하룬 알 라시드를 위해 선곡된 100곡',
      '이브라힘 알마우실리 등',
      NULL,
      '미국 의회도서관과 『이란 백과사전』은 『노래의 책』의 핵심이 하룬 알 라시드를 위해 궁정 음악가가 고른 100곡에서 출발했다고 설명한다.',
      '음악 향유와 선곡 의뢰는 강하게 확인되지만 후대 10세기 선집의 방대한 전승에서 어느 개별 곡을 하룬이 실제로 들었는지 현대 음원 식별자와 안전하게 일대일 연결할 수 없다. 선집 전체를 하나의 MUSIC 작품으로 대체하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '하룬 알 라시드 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
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
      'https://www.ncbi.nlm.nih.gov/books/NBK622612/?report=reader',
      'secondary',
      'archive',
      'accessible',
      'Why Do We Translate? Arabic Sources on Translation',
      '이븐 알나딤의 전승을 번역·주석한 학술 자료에서 하룬이 고대 의학서 번역을 임명한 후원 관계를 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://seop.illc.uva.nl/entries/arabic-islamic-greek/',
      'secondary',
      'official_profile',
      'accessible',
      'Greek Sources in Arabic and Islamic Philosophy',
      'Stanford Encyclopedia of Philosophy가 하룬 치세에 아리스토텔레스 『자연학』 번역이 이루어졌다고 설명하지만 칼리프 개인의 독서라고 하지는 않는다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://scholars.duke.edu/individual/pub1436300',
      'secondary',
      'official_profile',
      'accessible',
      'Hārūn Al-Rašīd, the Arabian Nights, and Politics on the Arabic Stage',
      '『천일야화』 속 하룬이 19~20세기 아랍 무대 정치극으로 변형된 후대 수용 관계를 확인했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://isac.uchicago.edu/research/publications/misc/two-queens-baghdad-mother-and-wife-harun-al-rashid',
      'secondary',
      'official_profile',
      'accessible',
      'Two Queens of Baghdad',
      '시카고대 출판 소개가 역사적 하룬과 수많은 『천일야화』 전설의 주인공을 명시적으로 구분한다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://dokumen.pub/the-meadows-of-gold-the-abbasids-0710302460-9780710302465.html',
      'secondary',
      'archive',
      'accessible',
      'The Meadows of Gold: The Abbasids',
      '알마수디의 하룬 관련 일화 번역에서 락까 경마와 하룬의 말·알마문의 말이 1·2위를 차지한 대목을 확인했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://www.voanews.com/a/extremism-watch_arabian-horse-racing-revived-raqqa-after-islamic-state/6175319.html',
      'secondary',
      'article',
      'accessible',
      'Arabian Horse Racing Is Revived in Syria’s Raqqa',
      '락까의 하룬 시대 경마장과 지역 경마 전통을 대조해 실제 스포츠 관계임을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.loc.gov/item/2021666165',
      'primary',
      'archive',
      'accessible',
      'The Book of Songs, Library of Congress',
      '의회도서관 소장본 설명이 이브라힘 알마우실리의 100곡 선곡과 하룬·알와시크 궁정 공연 관계를 밝힌다. 선집은 하룬 사후 편찬됐다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.iranicaonline.org/articles/ketab-al-agani/',
      'secondary',
      'official_profile',
      'accessible',
      'AḠĀNĪ, KETĀB AL-, Encyclopaedia Iranica',
      '현대 학술 백과가 9천 쪽이 넘는 후대 선집의 원래 목적을 하룬을 위해 고른 100곡의 기록으로 설명한다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 8 THEN
    RAISE EXCEPTION '하룬 알 라시드 조사 source 생성 행 수가 8이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'هارون الرشيد·Hārūn al-Rashīd와 read·book·library·translation·Greek books 조합을 검색했다. 그리스 의학서와 『자연학』 번역 후원은 확인했지만 개인이 읽은 특정 번역본 근거는 없다. 10세기 『노래의 책』과 『천일야화』는 사후 저작이라 제외했다.'
      WHEN 'VIDEO' THEN
        'theatre·performance·story·Arabian Nights·watched 조합을 검색했다. 확인되는 영상·무대 관계는 『천일야화』와 근대 무대극이 역사적 하룬을 등장인물로 사용한 후대 재현이며 본인 관람 작품이 아니다.'
      WHEN 'GAME' THEN
        'game·chess·polo·horse race·played 조합을 검색했다. 락까에서 경마를 열고 결과를 즐긴 전승은 확인했지만 실제 스포츠이며 디지털 GAME 작품은 찾지 못했다.'
      WHEN 'MUSIC' THEN
        'music·song·Ibrahim al-Mawsili·Ishaq al-Mawsili·Kitab al-Aghani·favorite song 조합을 검색했다. 하룬을 위한 100곡 선곡집의 존재는 확인했지만 개별 곡명·연주 버전·현대 음원 식별자의 일대일 대응이 불가능하다. 알마수디가 전한 익명 노래·시 구절도 제목 없는 일화라 채택하지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '하룬 알 라시드 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
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
      '하룬 알 라시드 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '하룬 알 라시드 프로필·0건 확정 최종 검증에 실패했습니다.';
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
      ) = 8
  ) THEN
    RAISE EXCEPTION '하룬 알 라시드 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
