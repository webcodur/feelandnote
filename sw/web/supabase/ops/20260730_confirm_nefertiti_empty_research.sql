-- 네페르티티 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  아텐 찬가 — 왕실 종교 의례문이며 개인 독서 기록 없음
--   MUSIC 아마르나 여성 음악가 부조 — 궁정 음악 일반, 개인 감상 특정 불가

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '2654249d-c41e-4de1-b700-8a331f873e55'::uuid;
  target_run_id constant uuid := 'f6a92927-b047-48aa-b2be-97d9f81ba055'::uuid;
  rejected_hymn_id constant uuid := '33913035-c5da-4f91-a6cb-48b057a477d0'::uuid;
  rejected_musicians_id constant uuid := '4a03ef66-b1df-49a8-b996-663b10682e3a'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id AND p.slug = 'nefertiti'
      AND p.nickname = '네페르티티' AND p.profile_type = 'CELEB'
      AND p.status = 'active' AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '네페르티티 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id) THEN
    RAISE EXCEPTION '네페르티티에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_hymn_id, rejected_musicians_id)
  ) THEN
    RAISE EXCEPTION '네페르티티 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-nefertiti-full-v1',
    'Codex',
    ARRAY['네페르티티', 'Nefertiti', 'Neferneferuaten Nefertiti', 'Nefernefruaten Nefertiti', 'Nofretete'],
    '람세스 2세의 왕비 네페르타리와 네페르티티를 구분했다. 네페르티티 흉상·현대 전시·소설·다큐멘터리·오페라·게임과 이름을 차용한 현대 인물·프로젝트는 제외했다.',
    '이름 변형과 아마르나·아텐 조합으로 네 유형을 검색하고 UCL·대영박물관·메트로폴리탄미술관의 유물·종교 해설을 대조했다. 아텐 대찬가는 아이의 무덤 벽에 남은 왕실 종교 의례문이며 네페르티티가 특정 텍스트를 읽었다는 기록이 아니다. 아마르나 시대 여성 음악가 부조는 궁정 축제·여가의 연주 관행을 보여주지만 네페르티티가 참석한 특정 곡·연주를 식별하지 못한다. 세네트도 동시대 일반 유물만 있고 네페르티티의 플레이 증거는 없다. 네 유형 모두 채택 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_hymn_id, target_run_id, 'BOOK', 'rejected',
      '아텐 대찬가', '아케나텐 왕실 종교 전통', NULL,
      '아텐 대찬가는 아마르나의 신하 아이 무덤 서쪽 벽에 13열 상형문자로 새겨졌고 아케나텐 시대 종교 개혁을 보여주는 핵심 문헌이다.',
      '왕실 태양 숭배에서 불린 의례문이라는 맥락만 확인된다. 네페르티티가 이 비문이나 별도 판본을 읽었다는 기록과 개인 감상 경위는 없다.'
    ),
    (
      rejected_musicians_id, target_run_id, 'MUSIC', 'rejected',
      '아마르나 시대 여성 음악가들의 궁정 연주', '연주자·곡명 미상', NULL,
      '메트로폴리탄미술관의 아마르나 시대 석회암 부조는 다섯 여성 음악가가 궁전의 축제나 여가 시간에 연주하는 장면을 보여준다.',
      '유물은 시대와 궁정 음악 관행만 알려 준다. 네페르티티가 그 자리에 있었는지, 어떤 곡을 누가 연주했는지 식별할 수 없어 작품 단위 MUSIC으로 등록할 수 없다.'
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '네페르티티 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_hymn_id,
      'https://www.ucl.ac.uk/museums-static/digitalegypt/amarna/belief.html',
      'primary', 'archive', 'accessible', 'Amarna Belief and the Great Hymn to the Aten',
      '찬가의 비문 위치·전승과 태양 숭배에서 찬가가 불렸을 가능성을 확인했다. 네페르티티 개인의 독서는 명시되지 않는다.'
    ),
    (
      target_run_id, 'BOOK', rejected_hymn_id,
      'https://www.metmuseum.org/essays/art-architecture-and-the-city-in-the-reign-of-amenhotep-iv-akhenaten-ca-13531336-b-c',
      'secondary', 'article', 'accessible', 'Art, Architecture, and the City in the Reign of Akhenaten',
      '네페르티티 명의의 태양 신전과 왕실 의례는 확인되지만 특정 책을 읽었다는 증거는 없음을 대조했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_musicians_id,
      'https://www.metmuseum.org/art/collection/search/548507',
      'primary', 'archive', 'accessible', 'Female Musicians, Amarna Period',
      '아마르나 시대 궁정 연주 장면과 악기·가수 가능성을 확인했다. 인물과 곡은 특정되지 않는다.'
    ),
    (
      target_run_id, 'VIDEO', NULL,
      'https://www.metmuseum.org/art/collection/search/545803',
      'primary', 'archive', 'accessible', 'Relief of Queen Nefertiti',
      '네페르티티가 아텐 의례에 참여한 부조를 watched·theatre·performance 조합과 대조했다. 종교 의례 참여는 특정 VIDEO 작품 관람이 아니다.'
    ),
    (
      target_run_id, 'GAME', NULL,
      'https://www.britishmuseum.org/collection/object/Y_EA66669',
      'primary', 'archive', 'accessible', 'New Kingdom senet game-board',
      '네페르티티 시대를 포함하는 신왕국 세네트 유물은 있으나 소유자·플레이어가 네페르티티라는 근거는 없다.'
    ),
    (
      target_run_id, 'GAME', NULL,
      'https://www.metmuseum.org/ja/perspectives/ancient-egypt-board-games',
      'secondary', 'article', 'accessible', 'Senet and Twenty Squares',
      '세네트가 널리 행해졌고 네페르타리의 플레이 장면이 남았음을 확인했다. 네페르타리를 네페르티티로 오인하지 않았다.'
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '네페르티티 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN '네페르티티·Nefertiti·Neferneferuaten과 read·book·hymn·Aten 조합을 검색했다. 아텐 대찬가는 왕실 의례 비문이며 네페르티티 개인의 독서 증거가 없어 제외했다.'
        WHEN 'VIDEO' THEN '네페르티티와 watched·theatre·performance·visual work 조합을 검색했다. 부조 속 종교 의례 참여와 현대 다큐멘터리는 개인이 관람한 VIDEO 작품이 아니다.'
        WHEN 'GAME' THEN '네페르티티와 game·senet·played 조합을 검색했다. 신왕국 세네트 유물과 네페르타리의 플레이 장면은 있으나 네페르티티의 플레이 증거는 없다.'
        WHEN 'MUSIC' THEN '네페르티티와 music·song·hymn·singer·performance 조합을 검색했다. 궁정 음악가 부조와 찬가 의례는 확인되지만 참석·곡명·연주자가 식별되는 개인 감상 기록은 없다.'
      END
  WHERE s.run_id = target_run_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '네페르티티 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;
  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '네페르티티 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '네페르티티 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 2
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '네페르티티 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
