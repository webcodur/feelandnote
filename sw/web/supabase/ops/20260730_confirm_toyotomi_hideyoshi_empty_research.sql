-- 도요토미 히데요시 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  히데요시의 서간·주인장 — 본인이 쓴 문서이며 독서한 작품이 아님
--   VIDEO 다카사고·다무라·세키데라 고마치 등 노 — 본인이 공연·발주한 작품
--   GAME  바둑 — 실제 대회를 열었으나 서비스의 디지털 GAME 작품이 아님
--   MUSIC 덴쇼 소년사절단의 서양 음악 — 청취는 확인되나 곡명이 남지 않음
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '296e45de-0586-44ab-b48e-f3fe052a6b1d'::uuid;
  target_run_id constant uuid := 'a000bfbf-4cd8-4264-99d7-d7e012e8048c'::uuid;
  rejected_book_finding_id constant uuid := 'dea3d35e-66cd-4a78-a767-8ae5cdb81b63'::uuid;
  rejected_video_finding_id constant uuid := 'f82bb86a-0b15-4b8c-81d4-a8ad06fdea11'::uuid;
  rejected_game_finding_id constant uuid := '386c60d4-71d8-4880-999a-ecef37d2f69a'::uuid;
  rejected_music_finding_id constant uuid := 'e9ed2010-7e15-41f0-bec2-ec4cbffbec94'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'toyotomi-hideyoshi'
      AND p.nickname = '도요토미 히데요시'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '도요토미 히데요시 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '도요토미 히데요시에게 이미 연결된 콘텐츠가 있습니다.';
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
    RAISE EXCEPTION '도요토미 히데요시 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
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
    '2026-07-30-toyotomi-hideyoshi-full-v1',
    'Codex',
    ARRAY[
      '도요토미 히데요시',
      '豊臣秀吉',
      '하시바 히데요시',
      '羽柴秀吉',
      '태합',
      '太閤',
      'Toyotomi Hideyoshi',
      'Hashiba Hideyoshi',
      'Taikō'
    ],
    '16세기 통일자 도요토미 히데요시(1537~1598) 본인과 동생 히데나가, 아들 히데요리 및 후대 전기·소설·영화·게임 속 인물을 분리했다. 『다이코키』·『신서태합기』 등 사후 전기와 현대 게임 속 히데요시는 생전 소비 작품이 아니므로 제외했다.',
    '한국어·일본어·영어 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 공식 노가쿠·바둑사 자료와 덴쇼 소년사절단 공연 기록을 대조했다. 히데요시가 노 작품을 직접 공연하고 바둑 대회를 열며 서양 음악을 반복 청취한 문화 활동은 확인했다. 그러나 노는 본인 공연·발주 작품, 바둑은 디지털 게임이 아니며, 서양 음악은 곡명이 전하지 않는다. 보존된 서간과 주인장도 본인 작성 자료일 뿐 읽은 책이 아니다. 작품 단위 소비 콘텐츠는 네 유형 모두 0건이다.'
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
      '히데요시의 서간·주인장',
      '도요토미 히데요시',
      NULL,
      '히데요시가 다이묘·가족·해외 통치자에게 보낸 편지와 주인장이 대량으로 남아 현대 문서집과 연구의 사료가 되었다.',
      '본인이 읽은 외부 저작이 아니라 본인이 작성·발급한 1차 문서다. 후대에 편집된 『히데요시 서간집』도 사후 출판물이므로 소비 BOOK으로 등록할 수 없다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '다카사고·다무라·세키데라 고마치 등 노 작품',
      NULL,
      NULL,
      '히데요시는 황궁에서 사흘 동안 노를 열고 자신이 16곡을 공연했으며, 이후에도 《세키데라 고마치》 등을 직접 공연했다. 자신의 생애를 다룬 다이코 노도 발주하고 무대에 올렸다.',
      '작품명은 확인되지만 증거가 관람·감상이 아니라 본인의 공연과 제작 발주다. 창작·출연 활동을 소비 콘텐츠로 바꾸어 등록하지 않는다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '바둑',
      NULL,
      NULL,
      '일본기원 바둑사에는 히데요시가 1585년과 1588년에 전국의 강자를 모아 바둑 대회를 열고 닛카이를 우승자로 인정한 기록이 있다.',
      '바둑 활동과 후원은 확인되지만 서비스 GAME 유형이 다루는 작품 단위 디지털 게임이 아니다. 특정 현대 게임으로 치환할 수도 없다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '덴쇼 소년사절단의 서양 음악 연주(곡명 미상)',
      NULL,
      NULL,
      '1591년 귀국한 덴쇼 소년사절단이 히데요시 앞에서 서양 음악을 연주했고, 히데요시는 주의 깊게 듣고 세 차례 반복을 요청한 뒤 악기까지 살펴보았다.',
      '청취 행위는 강하게 확인되지만 당시 기록에 곡명이 없다. 후대 재현 공연에서 선택한 조스캥 등의 레퍼토리는 추정이며, 특정 MUSIC 작품으로 확정할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '도요토미 히데요시 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
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
      'https://dept.sophia.ac.jp/monumenta/monograph/101-letters-of-hideyoshi-the-private-correspondence-of-toyotomi-hideyoshi/',
      'secondary',
      'archive',
      'accessible',
      '101 Letters of Hideyoshi: The Private Correspondence of Toyotomi Hideyoshi',
      '소피아대학 Monumenta Nipponica의 서간집 소개에서 히데요시가 남긴 사적 편지의 성격과 사료 범위를 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.u-tokyo.ac.jp/en/whyutokyo/indpt_history_018.html',
      'secondary',
      'interview',
      'accessible',
      'Returning to Society the Fruits of Our Historical Research',
      '도쿄대 연구자가 히데요시 정권 연구에서 주인장과 다이묘 간 편지를 하나씩 읽어 상관관계를 재구성한다고 설명한다. 이는 히데요시의 독서 목록이 아니라 그가 발급한 문서군이다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://www.nohgaku.or.jp/journey/media/noh_hideyoshi?hs_amp=true',
      'primary',
      'official_profile',
      'accessible',
      '秀吉と能, 公益社団法人 能楽協会',
      '히데요시가 황궁 노에서 16곡을 직접 공연하고 이후 《세키데라 고마치》 등을 연기한 기록을 공식 노가쿠협회 자료로 확인했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://www.the-noh.com/en/trivia/104.html',
      'secondary',
      'article',
      'accessible',
      'Hideyoshi and Noh',
      '히데요시가 자신의 생애를 소재로 한 노를 만들게 하고 직접 공연한 예외적인 제작·출연 관계를 대조했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://www.nihonkiin.or.jp/teach/history/history02.html',
      'primary',
      'archive',
      'accessible',
      '囲碁の歴史 室町から安土桃山時代, 日本棋院',
      '1585년과 1588년 히데요시가 전국 바둑 대회를 열고 닛카이가 우승했다는 일본기원 공식 연표를 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.earlymusicamerica.org/emag-feature/musicians-of-the-tensho-embassy/',
      'secondary',
      'article',
      'accessible',
      'Musicians of the Tenshō Embassy',
      '1591년 히데요시 앞 연주와 세 차례 반복 요청을 당시 기록에서 인용하며, 현대 재현 공연의 곡목은 informed conjecture라고 명시한다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://note.com/shigetaka_takada/n/ncd5cb0fc657d',
      'secondary',
      'article',
      'accessible',
      '天正遣欧少年使節の演奏曲をめぐって',
      '《Mille regretz》 등 특정 곡을 연주했다는 옛 통설이 재검토·부정되고 있음을 확인해 추정 곡목을 채택하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '도요토미 히데요시 조사 source 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '豊臣秀吉·羽柴秀吉·Toyotomi Hideyoshi와 読書·愛読書·本·書物·read·book 조합을 검색하고 보존 서간·주인장 문서군을 대조했다. 특정 외부 저작을 읽었다는 신뢰 가능한 작품명은 찾지 못했다. 본인의 편지·명령문, 사후 편찬 문서집과 『다이코키』 같은 후대 전기는 제외했다.'
      WHEN 'VIDEO' THEN
        '能·観劇·見物·演目·performed Noh·watched play 조합을 검색했다. 히데요시는 《다카사고》《다무라》《세키데라 고마치》를 포함한 노를 직접 공연하고 다이코 노를 발주했다. 관람보다 본인의 제작·출연 근거이므로 소비 VIDEO로 채택하지 않았다.'
      WHEN 'GAME' THEN
        '遊び·囲碁·将棋·game·played·board game 조합을 검색했다. 일본기원 연표에서 1585·1588년 바둑 대회 개최는 확인했으나 디지털 작품이 아니며, 본인이 플레이한 특정 현대 GAME은 없다.'
      WHEN 'MUSIC' THEN
        '音楽·南蛮音楽·天正遣欧少年使節·聴いた曲·music·song 조합을 검색했다. 1591년 사절단 연주를 세 번 반복 청취한 기록은 확인했으나 곡명이 전하지 않는다. 《Mille regretz》 등 현대 재현곡은 연구자의 추정이므로 등록하지 않았다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '도요토미 히데요시 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
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
      '도요토미 히데요시 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '도요토미 히데요시 프로필·0건 확정 최종 검증에 실패했습니다.';
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
      ) = 7
  ) THEN
    RAISE EXCEPTION '도요토미 히데요시 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
