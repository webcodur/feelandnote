-- 이사벨 1세 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  《Vita Christi》 — 번역·필사·인쇄 후원은 확인되지만 실제 독서는 연구자의 추론
--   BOOK  《Hours of Queen Isabella the Catholic》 — 매일 사용한 기도서는 이름이 없어서 현존본과 동일시 불가
--   GAME  체스 — 당시의 교육·보드게임 이력일 뿐 작품 단위 디지털 GAME이 아님
--   MUSIC 왕실 음악책 — 장서·궁정 레퍼토리 소유가 특정 곡 감상 증거는 아님

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '18b24b99-52f2-46f3-a13b-7fea09fdf59d'::uuid;
  target_run_id constant uuid := '3199da7b-e440-4f2c-bdb0-7fe37b4289a8'::uuid;
  rejected_vita_christi_id constant uuid := '7bb345ef-374c-4f60-a8b4-e4cd624f327c'::uuid;
  rejected_hours_id constant uuid := '58412af8-5358-4117-9088-694ef4104400'::uuid;
  rejected_chess_id constant uuid := '930f3c99-8e54-48ad-aea4-646b5d0970d1'::uuid;
  rejected_music_books_id constant uuid := 'c624c2db-b175-4c8b-8af2-8c6e76cd7a76'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'isabella-i'
      AND p.nickname = '이사벨 1세'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '이사벨 1세 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '이사벨 1세에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      rejected_vita_christi_id,
      rejected_hours_id,
      rejected_chess_id,
      rejected_music_books_id
    )
  ) THEN
    RAISE EXCEPTION '이사벨 1세 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-isabella-i-full-v1',
    'Codex',
    ARRAY[
      '이사벨 1세',
      '카스티야의 이사벨 1세',
      'Isabella I of Castile',
      'Isabel I de Castilla',
      'Isabel la Católica'
    ],
    '카스티야 여왕 이사벨 1세(1451~1504)를 이사벨 데스테, 프랑스의 이사벨, 이사벨 클라라 에우헤니아와 분리했다. 후대 영화·드라마·게임 속 이사벨과 여왕을 소재로 한 작품도 본인의 감상 기록에서 제외했다.',
    '스페인어·영어·한국어 이름 변형으로 네 유형을 조사하고 독서 관행 연구, 왕실 장서·박물관 원고 설명, 음악사 연구를 대조했다. 왕후의 사후 장서에는 많은 기도서가 있었고 이름 없는 한 책을 계속 기도에 썼다는 기록은 있으나, 이를 현존하는 특정 《Hours》 원고와 연결할 근거가 없다. 《Vita Christi》도 번역·필사·인쇄를 적극 후원했다는 사실에서 학자가 선호를 추론할 뿐 실제 독서 기록은 아니다. 체스 교육과 왕실 음악책 역시 물리 보드게임·장서 또는 궁정 문화의 범주라 작품 단위 디지털 GAME이나 특정 감상곡으로 등록할 수 없어 네 유형 모두 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_vita_christi_id,
      target_run_id,
      'BOOK',
      'rejected',
      'Vita Christi',
      'Ludolph of Saxony',
      NULL,
      '독서 관행 연구는 이사벨이 이 책의 번역을 추진하고 호화 필사본과 인쇄본 제작을 후원한 사실을 들어 특별한 선호를 추론한다.',
      '번역·필사·출판 후원은 직접 독서와 다르며, 해당 연구도 실제로 읽었다고 단정하지 않고 활동에서 선호를 추론한다. 이번 원장은 작품 단위 독서 증거만 채택한다.'
    ),
    (
      rejected_hours_id,
      target_run_id,
      'BOOK',
      'rejected',
      'Hours of Queen Isabella the Catholic',
      'Master of the First Prayerbook of Maximilian and workshop',
      NULL,
      '왕실 장서 목록에는 이사벨이 계속 기도할 때 쓴 이름 없는 진홍색 모피 장정 책이 기록되고, 클리블랜드 미술관의 현존 《Hours》는 그녀의 개인 신심용으로 만들어진 외교 선물로 추정된다.',
      '장서에는 14권의 시도서와 여러 기도서가 있어 이름 없는 일상 기도서를 특정 현존본으로 동일시할 수 없다. 제작 목적·소유 추정만으로 그 원고를 실제 사용한 책이라고 등록하지 않는다.'
    ),
    (
      rejected_chess_id,
      target_run_id,
      'GAME',
      'rejected',
      'Chess',
      'Traditional board game',
      NULL,
      '이사벨의 교육 및 동시대 궁정과 체스의 연관성, 강력해진 퀸 기물과 여왕을 연결하는 후대 해석이 반복된다.',
      '체스는 물리 보드게임이며 프로젝트 GAME 메타데이터가 다루는 작품 단위 디지털 게임이 아니다. 더구나 특정 대국·판본·디지털 타이틀을 플레이했다는 기록도 없다.'
    ),
    (
      rejected_music_books_id,
      target_run_id,
      'MUSIC',
      'rejected',
      'Music books of Isabel of Castile',
      'Various Franco-Flemish composers',
      NULL,
      '음악사 연구는 이사벨의 궁정과 관련된 성가·세속 음악 필사본과 개인 신심을 위한 선율을 왕실 음악 문화의 자료로 분석한다.',
      '음악책의 소유와 궁정 레퍼토리는 여왕이 제목 있는 특정 곡을 직접 듣거나 연주·선호했다는 증거가 아니다. 작품별 소비 기록으로 분해할 수 없어 등록하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '이사벨 1세 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_vita_christi_id,
      'https://www.cervantesvirtual.com/obra-visor/las-prcticas-de-lectura-de-una-reina---isabel-i-de-castilla-0/html/00a66c2c-82b2-11df-acc7-002185ce6064_6.html',
      'secondary',
      'article',
      'accessible',
      'Las prácticas de lectura de una reina: Isabel I de Castilla',
      '장서 소유·기증이 독서를 증명하지 않는다고 경고하고, 《Vita Christi》의 선호도 번역·필사·인쇄 활동에서 추론한다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_hours_id,
      'https://www.clevelandart.org/art/1963.256.277.b',
      'primary',
      'official_profile',
      'accessible',
      'Hours of Queen Isabella the Catholic, Queen of Spain',
      '미술관 소장 원고가 이사벨의 개인 신심용으로 제작되고 외교 선물로 전달되었을 가능성을 설명하지만 실제 사용 기록은 제시하지 않는다.'
    ),
    (
      target_run_id,
      'BOOK',
      NULL,
      'https://biblioteca.ucm.es/historica/isabel-i',
      'secondary',
      'official_profile',
      'accessible',
      'Isabel I de Castilla — Biblioteca Histórica Marqués de Valdecilla',
      '이사벨의 장서·문화 후원 맥락을 대조했으나 제목과 독서 행위가 함께 특정되는 추가 작품은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://www.britannica.com/biography/Isabella-I-queen-of-Spain',
      'secondary',
      'official_profile',
      'accessible',
      'Isabella I, Queen of Spain',
      '공인 전기에서 court entertainment·watched·play·theatre 조합을 대조했으나 제목 있는 극·영상 관람 기록은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_chess_id,
      'https://worldchesshof.org/wp-content/uploads/2025/02/aqw-gallery1web-2.pdf',
      'secondary',
      'archive',
      'accessible',
      'A Queen Within: Adorned Archetypes — Gallery 1',
      '이사벨과 체스 퀸 도상의 역사적 연관을 대조했지만 작품 단위 디지털 게임 플레이 근거는 없다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_books_id,
      'https://www.degruyter.com/document/doi/10.1515/9781846156687-006/html',
      'secondary',
      'article',
      'accessible',
      'Isabel of Castile and Her Music Books: Franco-Flemish Song in Fifteenth-Century Spain',
      '이사벨 궁정의 음악책과 개인 신심 선율을 다루지만 여왕 개인의 특정 곡 감상·연주를 확정하는 자료로 쓰지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '이사벨 1세 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Isabel I de Castilla·Isabella I와 lectura·libros·inventario·Vita Christi·libro de horas 조합을 조사했다. 장서와 제작 후원은 풍부하지만 이름과 실제 독서가 함께 특정되는 작품은 없었다.'
      WHEN 'VIDEO' THEN
        'watched·theatre·play·performance·espectáculo 조합을 공인 전기와 궁정 문화 자료에서 대조했다. 후대 영화·드라마는 모두 사후 재현이며 본인이 관람한 특정 작품은 확인되지 않았다.'
      WHEN 'GAME' THEN
        'chess·ajedrez·juego·played 조합을 검색했다. 체스 교육·도상 연관은 물리 보드게임 일반론이며 프로젝트의 작품 단위 디지털 GAME 기록은 없다.'
      WHEN 'MUSIC' THEN
        'music·song·cancionero·music books·private devotion 조합을 조사했다. 왕실 음악책·궁정 레퍼토리는 확인되지만 이사벨 개인이 소비한 특정 곡은 확정할 수 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '이사벨 1세 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '이사벨 1세 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '이사벨 1세 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f WHERE f.run_id = r.id AND f.decision = 'rejected') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_sources src WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '이사벨 1세 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
