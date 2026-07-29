-- 샤 루흐의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 반영한다.
-- 도서관·필사본 후원과 아들들의 문학 취향은 확인되지만 본인의 제목 있는 작품 직접 소비 증거는 확인되지 않았다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '617005a2-9292-4d77-af6f-30b0862203d9'::uuid;
  target_run_id constant uuid := 'acb0fc50-fa34-49d1-905a-d95587c4007f'::uuid;
  book_finding_id constant uuid := '1c928886-1bc6-4d07-aa0f-61d3a8aba074'::uuid;
  video_finding_id constant uuid := 'e41f0c31-95a1-4e62-80cf-61094e985084'::uuid;
  game_finding_id constant uuid := 'f665595a-9a49-445f-9eee-6f0230399338'::uuid;
  music_finding_id constant uuid := '763702fc-7b36-482b-91c1-c6f8322fc4df'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'shah-rukh'
      AND p.nickname = '샤 루흐'
      AND p.nickname_en = 'Shah Rukh'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '샤 루흐 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '샤 루흐 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-shah-rukh-empty-v1',
    'Codex',
    ARRAY['샤 루흐', '샤로흐', 'Shah Rukh', 'Shahrukh Mirza', 'Shāh Rukh', 'شاه رخ'],
    '티무르 제국 군주 샤 루흐(1377~1447)를 동명 배우 Shah Rukh Khan, 후대 소설·게임 인물, 아들 바이순구르·울루그 베그와 분리했다.',
    '샤 루흐의 헤라트 도서관과 하피즈이 아브루 역사서·코란 필사본 후원은 확인했지만 이는 제작·소장 후원이지 직접 독서 증거가 아니다. “페르시아 역사에서 읽었다”는 후대 번역 기록은 작품명이 없어 연결하지 않았다. 니자미와 아미르 호스로 선호 논쟁은 샤 루흐가 아니라 아들 바이순구르와 울루그 베그의 일화였다. 궁정 음악가 활동도 후원 관계일 뿐 제목 있는 곡의 개인 감상 증거가 아니다. 영상·게임은 시대상 해당 기록이 없어 0건으로 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'rejected',
      '하피즈이 아브루의 역사서·코란 필사본·니자미 작품 일반', NULL, NULL,
      '샤 루흐를 위해 제작된 『역사집성』 계열 필사본과 종교 필사본, 왕실 도서관의 후원 활동은 확인된다. 후대 번역 기록에는 그가 “페르시아 역사에서 읽었다”고 말하는 대목도 있다.',
      '후원·주문·소장은 독서와 같지 않고, 직접 읽었다는 대목은 작품명이 없다. 니자미와 아미르 호스로의 선호 일화는 아들들의 것으로 샤 루흐에게 귀속할 수 없다.'
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '티무르 궁정 공연·후대 영상 재현 일반', NULL, NULL,
      '샤 루흐 시대의 궁정 문화와 후대 재현물은 있으나 본인이 감상한 제목 있는 공연·영상 작품은 확인되지 않았다.',
      '시대 배경과 후대 창작물을 개인 감상 기록으로 추정하지 않는다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '샤트란지·궁정 놀이·후대 전략게임 일반', NULL, NULL,
      '티무르 궁정의 일반 놀이 문화와 후대 전략게임 속 샤 루흐 재현은 조사했으나 작품 단위 소비 기록은 없다.',
      '일반 문화 관행이나 후대 캐릭터 등장을 본인의 게임 소비로 등록하지 않는다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '압드 알카디르 마라기의 궁정 음악·티무르 음악 일반', NULL, NULL,
      '음악가 압드 알카디르 마라기와 티무르 궁정의 음악 후원 관계는 확인되지만 샤 루흐가 특정 곡을 듣거나 추천했다는 제목 단위 기록은 확인되지 않았다.',
      '궁정 후원과 음악가의 재직만으로 군주의 개인 감상을 추정하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '샤 루흐 finding 생성 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.clevelandart.org/art/1931.452.a',
      'secondary', 'official_profile', 'accessible',
      'Page from Tales of a Thousand and One Nights — Cleveland Museum of Art',
      '하피즈이 아브루의 세계사가 샤 루흐의 헤라트 도서관을 위해 작성·삽화되었음을 확인했다. 제작 후원 근거이지 직접 독서 근거는 아니다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.britishmuseum.org/collection/object/W_1966-1010-0-13',
      'secondary', 'official_profile', 'accessible',
      'Majma al-tawarikh manuscript page — British Museum',
      '샤 루흐 시대 하피즈이 아브루의 보편사 필사본과 역사 편찬 후원을 확인했지만 개인 독서 진술은 없다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.loc.gov/item/2013415137/',
      'secondary', 'official_profile', 'accessible',
      'Matla al-Sa''dayn va Majma al-Bahrayn — Library of Congress',
      '샤 루흐 치세를 다룬 준공식 역사서의 성격을 확인했다. 대상 인물을 다룬 책이지 그의 소비 콘텐츠는 아니다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://en.wikisource.org/wiki/Page:History_of_India_Vol_5.djvu/218',
      'primary', 'archive', 'accessible',
      'History of India, Vol. 5 — translated historical account',
      '샤 루흐가 “페르시아 역사에서 읽었다”고 말하는 번역 문구가 있으나 책 제목이 특정되지 않아 콘텐츠 연결 기준을 충족하지 못한다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://www.britishmuseum.org/collection/object/W_1966-1010-0-13',
      'secondary', 'official_profile', 'accessible',
      'Majma al-tawarikh manuscript page — British Museum',
      '궁정의 시각문화 자료이지만 제목 있는 공연·영상의 개인 감상 기록은 제시하지 않는다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://www.britannica.com/biography/Shah-Rokh-Timurid-ruler-of-Iran-and-Turkistan',
      'secondary', 'official_profile', 'accessible',
      'Shah Rokh — Encyclopaedia Britannica',
      '생애와 통치 범위에서 작품 단위 게임 소비 기록이 확인되지 않았다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://www.iranicaonline.org/articles/abd-al-qader-b-gaybi-al-hafez-al-maragi',
      'secondary', 'official_profile', 'accessible',
      'ʿABD-AL-QĀDER B. ḠAYBĪ — Encyclopaedia Iranica',
      '압드 알카디르 마라기의 티무르 궁정 경력을 검토했지만 샤 루흐의 제목 있는 곡 감상 진술은 확인되지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '샤 루흐 source 생성 행 수가 7개가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Shah Rukh·Shahrukh Mirza·library·read·book·Quran·Hafiz-i Abru·Nizami·Amir Khusrau 조합으로 박물관·도서관·역사 자료를 조사했다. 후원·주문과 아들들의 취향만 확인되어 0건이다.'
      WHEN 'VIDEO' THEN
        'performance·spectacle·theatre·watched 조합을 조사했다. 시대의 궁정 문화 외에 제목 있는 개인 감상 기록은 없다.'
      WHEN 'GAME' THEN
        'game·chess·shatranj·played 조합을 조사했다. 일반 궁정 놀이와 후대 게임 재현을 제외하면 작품 단위 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·composer·Abd al-Qadir Maraghi·listened 조합을 조사했다. 궁정 후원 관계만 있고 특정 곡 감상 증거는 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '샤 루흐 scope 완료 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '샤 루흐 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '샤 루흐 light·confirmed_empty 최종 검증에 실패했습니다.';
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
           WHERE src.run_id = r.id) = 7
  ) THEN
    RAISE EXCEPTION '샤 루흐 조사 저장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
