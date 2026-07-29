-- 엘레오노르 다키텐 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK   엘레오노르 다키텐 시편집 — 귀속이 추정이며 실제 사용·독서 기록 없음
--   MUSIC  베르나르 드 벤타도른의 '노르만인의 왕비' 노래 — 수신자·전달·청취 불확실
--   GAME   사랑의 법정 — 후대 문학적·풍자적 허구
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '9ca52951-66f7-464d-8c83-7214f654542e'::uuid;
  target_run_id constant uuid := '3d43c89d-0058-4bd3-b4a2-ae8f6803ed18'::uuid;
  rejected_book_finding_id constant uuid := '7995a529-a423-4f19-aa8b-0de7a135a321'::uuid;
  rejected_music_finding_id constant uuid := '40bd8d01-2609-4ca5-89a2-a54b29dfddbc'::uuid;
  rejected_game_finding_id constant uuid := '0b403c0b-6571-49da-afad-aedbdce68150'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'eleanor-of-aquitaine'
      AND p.nickname = '엘레오노르 다키텐'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '엘레오노르 다키텐 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '엘레오노르 다키텐에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      rejected_book_finding_id,
      rejected_music_finding_id,
      rejected_game_finding_id
    )
  ) THEN
    RAISE EXCEPTION '엘레오노르 다키텐 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-eleanor-of-aquitaine-full-v1',
    'Codex',
    ARRAY['엘레오노르 다키텐', 'Eleanor of Aquitaine', 'Aliénor d''Aquitaine', 'Alienor of Aquitaine', 'Alienora'],
    '1122~1204년 아키텐 여공작을 엘레오노르 드 프로방스·카스티야·브르타뉴 등 동명 왕족, 후대 소설·영화·음반·게임에서 분리했다. 특히 브르타뉴의 엘레오노르가 소유한 13~14세기 그라두알을 다키텐의 엘레오노르에게 귀속하지 않았다.',
    '영어·프랑스어 이름 변형과 read·livre·psalter·troubadour·song·performance·court of love·game 조합으로 네 유형을 조사했다. 네덜란드 국립도서관의 이른바 엘레오노르 시편집은 제작 대상 귀속이 연구자 추정이며 실제 사용 기록이 없다. 베르나르 드 벤타도른의 노래는 전령에게 “노르만인의 왕비”에게 부르라고 하지만 수신자 동일성·실제 전달과 청취를 확정할 수 없다. 사랑의 법정은 후대 풍자적 허구이고 특정 관람 작품도 없어 0건으로 완료했다.'
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
      '엘레오노르 다키텐 시편집',
      '미상',
      NULL,
      '네덜란드 국립도서관은 1185년경 제작된 시편집이 부유한 귀족 여성을 위한 것이며 도상·의복·인장 유사성을 근거로 엘레오노르를 주문자로 추정한다.',
      '도서관도 귀속이 확실하지 않다고 명시한다. 엘레오노르가 실제 소유·사용·독서했다는 동시대 기록도 없어 개인 감상 콘텐츠로 확정할 수 없다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '베르나르 드 벤타도른의 노르만인의 왕비에게 보낸 노래',
      'Bernart de Ventadorn',
      NULL,
      '한 칸소의 종결부는 전령 위게에게 “노르만인의 왕비에게 내 노래를 기꺼이 부르라”고 지시한다.',
      '“노르만인의 왕비”가 엘레오노르인지도 완전히 확정되지 않고, 노래가 실제 전달되어 그녀가 들었다는 기록도 없다. 의도된 수신자를 실제 청취자로 바꿀 수 없다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '사랑의 법정',
      '안드레아스 카펠라누스 전승',
      NULL,
      '후대 문헌은 엘레오노르와 귀부인들이 연애 문제를 판정하는 사랑의 법정을 열었다고 묘사한다.',
      '현대 연구는 이를 실제 궁정 행사의 기록이 아닌 풍자적 문학 허구로 본다. 디지털 GAME도 아니며 실제 놀이 참여를 입증하지 못한다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 3 THEN
    RAISE EXCEPTION '엘레오노르 다키텐 조사 finding 생성 행 수가 3이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.kb.nl/en/discover-admire/masterpieces/eleanor-aquitaine',
      'secondary',
      'official_profile',
      'accessible',
      'Psalter of Eleanor of Aquitaine — KB, National Library of the Netherlands',
      '시편집의 물성과 추정 제작 시기, 엘레오노르 귀속 논거와 불확실성을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      NULL,
      'https://academic.oup.com/edinburgh-scholarship-online/book/20614',
      'secondary',
      'article',
      'accessible',
      'Eleanor of Aquitaine: Queen and Rebel — Oxford Academic',
      '현대 비판 전기가 동시대 자료로 확실히 알 수 있는 생애와 후대 전승을 구분하는지 대조했다. 특정 저작의 직접 독서 기록은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://press.uchicago.edu/ucp/books/book/chicago/E/bo195270746.html',
      'secondary',
      'article',
      'accessible',
      'Eleanor of Aquitaine, as It Was Said — University of Chicago Press',
      '엘레오노르를 둘러싼 노래·발라드·로망스가 소문과 전설을 확대했음을 확인하고 생전 특정 공연 관람으로 오인하지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://scholarworks.iu.edu/journals/index.php/tmr/article/view/44145',
      'secondary',
      'article',
      'accessible',
      'Eleanor of Aquitaine: Woman, Queen and Legend — The Medieval Review',
      '안드레아스 카펠라누스의 사랑의 법정을 실제 푸아티에 궁정이 아닌 풍자적 환상으로 판정한 최신 학술서평을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://assets.cambridge.org/052157/3882/sample/0521573882WSC00.pdf',
      'primary',
      'archive',
      'accessible',
      'The Troubadours — Cambridge University Press sample',
      '베르나르의 원문 종결부와 영문 번역에서 전령에게 노르만인의 왕비에게 노래하라고 한 문구를 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://www.cambridge.org/core/books/cambridge-companion-to-the-literature-of-the-crusades/womens-writing-and-cultural-patronage/870523074036E4208CE3D718CFB1C332',
      'secondary',
      'article',
      'accessible',
      'Women’s Writing and Cultural Patronage — Cambridge University Press',
      '엘레오노르가 베르나르의 한 작품 끝에 언급되지만 특정 작품 후원의 증거는 거의 없다는 학술 평가를 대조했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '엘레오노르 다키텐 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Eleanor·Aliénor와 read·livre·lecture·book·psalter·manuscript 조합을 검색했다. 시편집은 귀속과 실제 사용이 불확실하고, 교육·후원·장서 추정 외에 특정 독서 기록은 없다.'
      WHEN 'VIDEO' THEN
        'watched·theatre·performance·spectacle·romance 조합을 검색했다. 트루바두르와 궁정 문화 관계는 후원·전승 수준이며 생전에 관람한 특정 무대 작품은 확인되지 않는다. 후대 영화·연극은 본인 소재 작품이다.'
      WHEN 'GAME' THEN
        'game·played·chess·court of love·jeu 조합을 검색했다. 사랑의 법정은 풍자적 문학 허구이고 실제 놀이·디지털 GAME 이용 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·chanson·troubadour·heard·écouté 조합을 검색했다. 베르나르의 전령 지시는 실제 전달·청취를 입증하지 못하며 다른 관계도 이름 없는 후원·궁정 일반론에 그쳤다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '엘레오노르 다키텐 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '엘레오노르 다키텐 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '엘레오노르 다키텐 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 3
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '엘레오노르 다키텐 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
