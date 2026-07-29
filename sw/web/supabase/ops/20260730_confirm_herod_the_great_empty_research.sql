-- 헤롯 대왕 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 경기·공연·음악 경연을 직접 개최했지만 개별 작품명이나 개인 소비 행위는 식별되지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '846df8bd-20c2-4c3f-8943-611f7ec88e38'::uuid;
  target_run_id constant uuid := '372aef67-7632-4b15-a8fc-a5a43231f081'::uuid;
  rejected_book_finding_id constant uuid := 'e25d5b9a-8f1c-4017-8b91-75533679f947'::uuid;
  rejected_video_finding_id constant uuid := 'df9bb52d-1ee1-4f34-af76-70190b0285a7'::uuid;
  rejected_game_finding_id constant uuid := 'c00debd1-56dd-4c90-bb69-21f68818b966'::uuid;
  rejected_music_finding_id constant uuid := '26c66bfd-12a7-4b48-bfb6-f6788f71dd32'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'herod-the-great'
      AND p.nickname = '헤롯 대왕'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '헤롯 대왕 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '헤롯 대왕 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id,
    '2026-07-30-herod-the-great-empty-v1', 'Codex',
    ARRAY['헤롯 대왕', 'Herod the Great', 'Herod I', 'Herodes', 'Hērōdēs ho Mégas'],
    '기원전 1세기 유대 왕 헤롯 대왕을 헤롯 안티파스·헤롯 아그리파 1세 등 헤롯 왕가 인물과 후대 소설·영화 속 헤롯 재현에서 분리했다.',
    '요세푸스의 『유대 고대사』 15·16권과 현대 공연사 연구를 대조해 BOOK·VIDEO·GAME·MUSIC을 조사했다. 헤롯은 예루살렘과 카이사레아에서 극장·원형경기장을 짓고 음악·체육·연극성 경연, 검투·맹수·경마를 포함한 대회를 직접 개최했다. 그러나 출전자·경연 종목만 전할 뿐 헤롯이 읽은 책이나 제목 있는 극·곡, 디지털 게임에 해당하는 개인 소비작은 특정되지 않아 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '헤롯의 그리스·로마 문화 후원과 니콜라우스의 조언에서 추정한 독서', NULL, NULL,
      '헤롯은 다마스쿠스의 니콜라우스를 측근·외교가로 두고 로마식 문화 시설과 경연을 적극 후원했다.',
      '정치·문화적 교류와 교육 수준만으로 특정 책의 서명·저자·독서 행위를 확정할 수 없다. 요세푸스의 상세 서술에도 헤롯이 읽었다고 식별되는 개별 저작은 없다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '예루살렘·카이사레아의 극장 공연과 티멜리코이 경연', NULL, NULL,
      '요세푸스는 헤롯이 극장과 원형경기장을 짓고 음악가와 무대 공연자들에게 상을 건 주기적 대회를 열었다고 기록한다.',
      '공연 개최와 관람 정황은 강하지만 작품 제목·극작가·공연단이 특정되지 않는다. 장르나 축제 전체를 하나의 VIDEO 작품으로 등록하지 않았다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '헤롯의 체육 경기·검투·맹수전·경마 대회', NULL, NULL,
      '헤롯이 체육 경기와 검투사·맹수·경마를 포함한 로마식 오락 행사를 조직한 사실은 사료에 명시된다.',
      '고대의 실제 경기와 흥행 행사는 프로젝트의 디지털 GAME 소비 범주가 아니며, 헤롯 개인이 플레이한 제목 있는 게임도 아니다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '헤롯이 개최한 음악 경연', NULL, NULL,
      '요세푸스는 헤롯의 대회에 음악 경연이 있었고 유명 음악가들에게 큰 상금이 걸렸다고 기록한다.',
      '청취 정황은 인정되지만 곡명·작곡자·연주자가 연결되는 개별 작품 기록이 없다. 경연 종목 일반을 MUSIC 작품으로 치환하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '헤롯 대왕 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://biblehub.com/library/josephus/the_antiquities_of_the_jews/chapter_5_how_herod_celebrated.htm',
      'primary', 'archive', 'accessible',
      'Josephus, Antiquities of the Jews, Book XV, Chapter 8',
      '문화 시설과 경연의 상세 서술을 확인했으나 헤롯 개인의 특정 서명 독서는 제시되지 않는다.'
    ),
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://cris.huji.ac.il/en/publications/herodian-entertainment-structures/',
      'secondary', 'article', 'accessible',
      'Herodian Entertainment Structures — Hebrew University of Jerusalem',
      '헤롯의 경기·오락 시설과 후원 범위를 교차 확인하고 특정 독서 기록과 구별했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://bibleinterp.arizona.edu/articles/2004/08/pat288001',
      'secondary', 'article', 'accessible',
      'Herod the Great and the Theater at Jerusalem — The Bible and Interpretation',
      '그리스 드라마·디오니소스 음악과 공연 경연이라는 종목 수준 기록을 확인했으나 작품명은 식별되지 않는다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://biblehub.com/library/josephus/the_antiquities_of_the_jews/chapter_5_how_herod_celebrated.htm',
      'primary', 'archive', 'accessible',
      'Josephus, Antiquities of the Jews, Book XV, Chapter 8',
      '체육 경기·검투·맹수·경마는 실제 행사이므로 디지털 GAME과 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://biblehub.com/library/josephus/the_antiquities_of_the_jews/chapter_5_how_herod_celebrated.htm',
      'primary', 'archive', 'accessible',
      'Josephus, Antiquities of the Jews, Book XV, Chapter 8',
      '음악 경연과 음악가 초청은 확인되지만 곡명·작곡자·개별 연주 기록은 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '헤롯 대왕 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'Herod·헤롯과 read·book·library·Nicolaus·education 조합을 조사했다. 문화 후원과 조언자 관계 외에 특정 서명 독서는 없다.'
        WHEN 'VIDEO' THEN 'watched·theatre·drama·performance·thymelikoi 조합을 조사했다. 공연 개최 정황은 있으나 제목·창작자 있는 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·athletic·gladiator·horse race 조합을 조사했다. 실제 경기·검투·경마는 디지털 GAME 소비가 아니다.'
        WHEN 'MUSIC' THEN 'music·song·heard·contest·musician 조합을 조사했다. 음악 경연은 확인되지만 곡명·작곡자가 특정되는 청취작은 없다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '헤롯 대왕 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '헤롯 대왕 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.user_contents uc WHERE uc.user_id = p.id
      )
  ) THEN
    RAISE EXCEPTION '헤롯 대왕 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
