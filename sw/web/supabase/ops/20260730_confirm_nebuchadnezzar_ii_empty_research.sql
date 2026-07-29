-- 네부카드네자르 2세 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  네부카드네자르 2세 건축 원통 비문 — 본인 명의 왕실 건축 기록
--   MUSIC 다니엘서 3장의 의례 음악 — 악기군만 열거되며 곡명·연주자와 개인 감상이 특정되지 않음

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '9f31d439-5a33-456b-9817-760fb3ba590e'::uuid;
  target_run_id constant uuid := '04eb3f8b-e7b4-4840-92ae-2ec69ce99d2f'::uuid;
  rejected_building_cylinder_id constant uuid := '48d553c2-9152-46e1-9a39-70be5da17eff'::uuid;
  rejected_daniel_music_id constant uuid := '65c00dcf-a9bf-4c7b-a7a4-962465e1ded9'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'nebuchadnezzar-ii'
      AND p.nickname = '네부카드네자르 2세'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '네부카드네자르 2세 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '네부카드네자르 2세에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_building_cylinder_id, rejected_daniel_music_id)
  ) THEN
    RAISE EXCEPTION '네부카드네자르 2세 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-nebuchadnezzar-ii-full-v1',
    'Codex',
    ARRAY[
      '네부카드네자르 2세',
      '느부갓네살 2세',
      'Nebuchadnezzar II',
      'Nebuchadrezzar II',
      'Nabû-kudurri-uṣur',
      'Nabu-kudurri-usur'
    ],
    '신바빌로니아 제2대 왕(재위 기원전 605~562)을 네부카드네자르 1세, 후대 반란왕 네부카드네자르 3·4세, 성서·오페라·영화·게임 속 인물과 분리했다. 윌리엄 블레이크의 판화와 베르디 오페라 《나부코》 등은 사후 창작물이라 제외했다.',
    '한글 성서명·영어·아카드어 이름 변형으로 네 유형을 각각 검색하고 대영박물관·메트로폴리탄미술관·바티칸박물관 소장 비문과 다니엘서 전승을 대조했다. 왕의 건축 원통은 성벽·신전·궁전 사업을 자기 명의로 기록해 건물 기초에 묻은 왕실 텍스트이며 외부 독서물이 아니다. 다니엘서 3장은 금 신상 의례의 여러 악기를 열거하지만 곡명·연주자·왕의 개인적 감상을 특정하지 않고, 역사적 네부카드네자르의 취향을 독립 입증하지도 않는다. 특정 영상 관람이나 디지털 게임 플레이 기록도 없어 네 유형 모두 채택 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_building_cylinder_id,
      target_run_id,
      'BOOK',
      'rejected',
      '네부카드네자르 2세 건축 원통 비문',
      '네부카드네자르 2세 명의의 왕실 서기관',
      NULL,
      '메트로폴리탄미술관의 원통은 네부카드네자르 2세가 바빌론 외성벽을 세운 일을 기록하며, 같은 유형의 글은 신과 미래 왕을 위해 건물 기초에 묻혔다.',
      '본인 명의의 건축·봉헌 기록이자 통치 선전물이다. 네부카드네자르가 읽고 감상한 외부 BOOK이라는 증거가 아니다.'
    ),
    (
      rejected_daniel_music_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '다니엘서 3장의 금 신상 의례 음악',
      NULL,
      NULL,
      '다니엘서 3장은 뿔나팔·피리·현악기·수금 등 여러 악기 소리를 신상 경배 신호로 열거한다.',
      '특정 곡명·작곡가·연주자가 없고 왕의 개인 선택·선호 감상도 기록하지 않는다. 후대 편집된 성서 서사를 역사적 개인의 작품 단위 MUSIC 소비로 확정할 수도 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '네부카드네자르 2세 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_building_cylinder_id,
      'https://www.metmuseum.org/art/collection/search/321676',
      'primary',
      'archive',
      'accessible',
      'Cuneiform cylinder: inscription of Nebuchadnezzar II describing the construction of the outer city wall of Babylon',
      '왕의 외성벽 건설을 기록해 기초에 묻은 원통이며 주 독자가 신과 미래 왕이었다는 박물관 주석을 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_building_cylinder_id,
      'https://www.britishmuseum.org/collection/object/W_1885-0430-1',
      'primary',
      'archive',
      'accessible',
      'Cylinder of Nebuchadnezzar II',
      '신전·지구라트·궁전·요새 복구와 건설을 기록한 165행 왕실 비문임을 교차 확인했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://www.museivaticani.va/content/museivaticani/en/collezioni/musei/museo-gregoriano-egizio/sala-viii--antichita-del-vicino-oriente-antico/cilindro-di-nabucodonosor-ii.html',
      'primary',
      'archive',
      'accessible',
      'Cylinder of Nebuchadnezzar II, Vatican Museums',
      '마라드 신전 건축 기념물과 왕실 미술·건축 자료를 watched·performance 조합으로 대조했으나 왕이 관람한 특정 VIDEO·극 작품은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://www.britishmuseum.org/collection/term/BIOG62705',
      'secondary',
      'official_profile',
      'accessible',
      'Nebuchadnezzar II, British Museum',
      '인물 식별과 관련 유물군을 game·played·board game 조합으로 대조했으나 특정 디지털 GAME 플레이 기록은 없었다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_daniel_music_id,
      'https://www.sefaria.org/Daniel.3?with=Megillah',
      'primary',
      'archive',
      'accessible',
      'Daniel 3',
      '금 신상 경배 신호로 여러 악기 종류를 열거하는 아람어 본문과 번역을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_daniel_music_id,
      'https://www.iranicaonline.org/articles/danial-e-nabi/',
      'secondary',
      'article',
      'accessible',
      'Dāniāl-e Nabi, Encyclopaedia Iranica',
      '다니엘서 1~6장의 네부카드네자르 서사와 후대 편집·전승 맥락을 대조해 역사적 개인 취향으로 곧장 확정하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '네부카드네자르 2세 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '네부카드네자르·느부갓네살·Nebuchadnezzar·Nabû-kudurri-uṣur와 read·book·tablet·cylinder·inscription 조합을 검색했다. 건축 원통·벽돌 비문은 본인 명의 왕실 기록이고 외부 저작 독서가 아니다.'
      WHEN 'VIDEO' THEN
        'watched·performance·play·relief·palace art 조합을 박물관 유물·생애 자료에서 검색했다. 이슈타르 문·궁전 장식·건축은 정지 미술과 왕실 발주물이며 개인이 감상한 특정 VIDEO 작품 기록은 없다.'
      WHEN 'GAME' THEN
        'game·played·board game·dice 조합을 생애·궁정 자료에서 검색했다. 메소포타미아 놀이 일반이나 후대 게임 캐릭터 외에 특정 디지털 GAME 플레이 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·instrument·harp·lyre·Daniel 3 조합을 검색했다. 성서 서사는 의례 신호용 악기군만 열거할 뿐 곡명·연주자·왕의 개인 선호를 특정하지 않는다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '네부카드네자르 2세 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '네부카드네자르 2세 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '네부카드네자르 2세 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f WHERE f.run_id = r.id AND f.decision = 'rejected') = 2
      AND (SELECT count(*) FROM public.celeb_content_research_sources src WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '네부카드네자르 2세 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
