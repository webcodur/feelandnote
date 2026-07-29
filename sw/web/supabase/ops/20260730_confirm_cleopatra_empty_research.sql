-- 클레오파트라 7세 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  페르가몬 도서관 20만 권 — 정적의 혐의 주장, 개별 독서 불명
--   MUSIC 타르수스 입성의 피리 연주 — 곡명·연주자 미상인 왕실 연출

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '4e554ba5-b10d-49f3-a4a5-1e3f8b6af199'::uuid;
  target_run_id constant uuid := 'd04e18f3-a93c-4133-8b0b-e330f8507b5d'::uuid;
  rejected_library_id constant uuid := 'e0860e6d-ed03-44c1-ac01-cabd8d6580b2'::uuid;
  rejected_music_id constant uuid := '4f7d7e75-a227-45c2-9446-00197f9a5e9f'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id AND p.slug = 'cleopatra'
      AND p.nickname = '클레오파트라' AND p.profile_type = 'CELEB'
      AND p.status = 'active' AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '클레오파트라 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id) THEN
    RAISE EXCEPTION '클레오파트라에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_library_id, rejected_music_id)
  ) THEN
    RAISE EXCEPTION '클레오파트라 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id, '2026-07-30-cleopatra-vii-full-v1', 'Codex',
    ARRAY['클레오파트라', '클레오파트라 7세', 'Cleopatra', 'Cleopatra VII', 'Cleopatra Philopator', 'Κλεοπάτρα Φιλοπάτωρ'],
    '프톨레마이오스 왕조의 다른 클레오파트라들과 7세 필로파토르를 구분했다. 셰익스피어 희곡·현대 영화·소설·게임·오페라와 동명 현대인은 제외했다.',
    '한국어·영어·그리스어 이름 변형으로 네 유형을 검색하고 플루타르코스 『안토니우스전』의 그리스어·영문 판본과 현대 고전학 자료를 대조했다. 다언어 구사 능력은 확인되지만 읽은 특정 작품명은 없다. 안토니우스가 페르가몬 도서관 20만 권을 줬다는 이야기는 옥타비아누스 측 인물의 혐의 주장으로 소개될 뿐이며 개별 독서를 입증하지 않는다. 타르수스 입성의 피리·관악 연주와 연회·낚시 놀이도 곡명·작품명 또는 디지털 GAME 식별자가 없다. 네 유형 모두 채택 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_library_id, target_run_id, 'BOOK', 'rejected',
      '페르가몬 도서관 20만 권', '다수 저자', NULL,
      '플루타르코스는 카이사르의 측근 칼비시우스가 안토니우스가 페르가몬의 도서관 20만 권을 클레오파트라에게 주었다고 비난했다고 전한다.',
      '플루타르코스도 이를 정적이 제기한 혐의 목록으로 제시한다. 설령 장서 이동이 사실이어도 소유·기증은 개별 작품 독서가 아니며 읽은 제목과 경위가 없다.'
    ),
    (
      rejected_music_id, target_run_id, 'MUSIC', 'rejected',
      '타르수스 입성의 피리·관악 연주', '연주자·곡명 미상', NULL,
      '플루타르코스는 클레오파트라가 타르수스에서 안토니우스를 만날 때 은 노의 움직임이 피리와 관악기의 선율에 맞춰졌다고 묘사한다.',
      '왕실 입성 연출과 음악 청취는 확인되지만 곡명·작곡가·연주자·가사가 전하지 않아 작품 단위 MUSIC이나 현대 음원으로 식별할 수 없다.'
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '클레오파트라 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_library_id,
      'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A2008.01.0077%3Achapter%3D58',
      'primary', 'archive', 'accessible', 'Plutarch, Antony 58',
      '페르가몬 장서 기증이 칼비시우스가 제기한 혐의라는 문맥을 확인했다.'
    ),
    (
      target_run_id, 'BOOK', rejected_library_id,
      'https://ora.ox.ac.uk/objects/uuid:b13e1d31-e076-4923-b147-5074d7f85770/files/m2ab40bdaa9062bfc96a804e51f1c5c3c',
      'secondary', 'article', 'accessible', 'Roman Public Libraries',
      '플루타르코스 58장의 도서관 기증 주장에 대한 현대 도서관사 인용을 대조했다.'
    ),
    (
      target_run_id, 'BOOK', NULL,
      'https://www.gutenberg.org/files/44315/old/44315-h/44315-h.htm',
      'primary', 'archive', 'accessible', 'Plutarch’s Lives: Antony',
      '클레오파트라의 다언어 구사 기록은 확인되지만 특정 도서명이나 독서 경위는 없다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_id,
      'https://classics.mit.edu/Plutarch/antony.html',
      'primary', 'archive', 'accessible', 'Plutarch, Antony',
      '타르수스 입성의 피리·관악 연출과 알렉산드리아 연회를 확인했다. 개별 음악 작품 정보는 없다.'
    ),
    (
      target_run_id, 'VIDEO', NULL,
      'https://classics.mit.edu/Plutarch/antony.html',
      'primary', 'archive', 'accessible', 'Plutarch, Antony 29',
      '낚시 장난에 구경꾼을 초대한 일화는 실제 오락·구경이며 제목 있는 공연이나 VIDEO 작품이 아니다.'
    ),
    (
      target_run_id, 'GAME', NULL,
      'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A2008.01.0007%3Achapter%3D29',
      'primary', 'archive', 'accessible', 'Plutarch, Antony: fishing',
      '낚시는 실제 신체 오락이고 주사위 기록은 안토니우스와 옥타비아누스의 것이므로 클레오파트라의 디지털 GAME 플레이로 세지 않았다.'
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '클레오파트라 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN '클레오파트라 7세·Cleopatra VII와 read·book·library·Pergamum·languages 조합을 검색했다. 다언어 능력에는 작품명이 없고 페르가몬 장서는 정적의 혐의이자 소유 관계라 제외했다.'
        WHEN 'VIDEO' THEN '클레오파트라와 watched·theatre·performance·spectator 조합을 검색했다. 낚시 장난·연회·왕실 연출은 특정 공연 작품이 아니며 현대 영화·희곡은 후대 창작물이다.'
        WHEN 'GAME' THEN '클레오파트라와 game·played·dice·fishing 조합을 검색했다. 낚시는 실제 오락이고 안토니우스의 주사위·동물 싸움은 클레오파트라 개인의 디지털 게임 기록이 아니다.'
        WHEN 'MUSIC' THEN '클레오파트라와 music·flute·pipe·song·Tarsus 조합을 검색했다. 타르수스 입성 음악은 실재하지만 곡명·연주자·작곡가를 식별하지 못해 기각했다.'
      END
  WHERE s.run_id = target_run_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '클레오파트라 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;
  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '클레오파트라 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '클레오파트라 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f WHERE f.run_id = r.id AND f.decision = 'rejected') = 2
      AND (SELECT count(*) FROM public.celeb_content_research_sources src WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '클레오파트라 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
