-- 성삼문 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK   홍무정운·사성통고·동국정운 — 질정·편찬 업무이며 개인 독서 진술 아님
--   BOOK   시경·예기·진덕수 인용 — 공동 상소의 논거이며 성삼문 개인 독서로 귀속 불가
--   VIDEO  환동 가무 선발·시연 — 외교 행정이며 작품명 없음
--   MUSIC  환동 창기 가무 교육 — 교육 지시 전달이며 특정 감상곡 없음
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '9b288cc4-d156-4b21-b2de-7104e12f6629'::uuid;
  target_run_id constant uuid := 'ebfeea99-3dfe-423b-9c1f-28a220d425df'::uuid;
  rejected_book_work_finding_id constant uuid := 'e722a638-8495-4094-b2d5-70cef70e18a0'::uuid;
  rejected_book_memorial_finding_id constant uuid := '356718cc-4aea-47be-b266-cb877fbc971e'::uuid;
  rejected_video_finding_id constant uuid := '838c5da2-feb2-433e-83e1-8a521caa53d6'::uuid;
  rejected_music_finding_id constant uuid := 'd8c671d3-9fda-4c48-b124-5760c928a889'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'seong-sam-mun'
      AND p.nickname = '성삼문'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '성삼문 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '성삼문에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (
      rejected_book_work_finding_id,
      rejected_book_memorial_finding_id,
      rejected_video_finding_id,
      rejected_music_finding_id
    )
  ) THEN
    RAISE EXCEPTION '성삼문 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-seong-sam-mun-full-v1',
    'Codex',
    ARRAY['성삼문', '成三問', 'Seong Sam-mun', 'Sŏng Sammun', '매죽헌', '梅竹軒'],
    '1418~1456년 조선 문신 성삼문을 그의 문집·시조·후대 사육신 전기, 동명 현대인과 분리했다. 본인 저술·본인 시가와 자신을 소재로 한 후대 작품은 외부 감상 콘텐츠에서 제외했다.',
    '한국어·한문·영문 표기와 독서·사가독서·운서·가무·바둑·장기·놀이 조합으로 네 유형을 조사했다. 《조선왕조실록》과 한국민족문화대백과사전을 대조했다. 사가독서는 특정 서명이 없고, 《홍무정운》·《사성통고》·《동국정운》은 질정·편찬 업무이다. 공동 상소의 《시》·《예》 언급은 성삼문 개인의 독서 진술이 아니다. 환동 가무는 외교 행정이며 작품명도 없다. 디지털 게임 이용 기록도 없어 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_work_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '홍무정운·사성통고·동국정운',
      '명대 운서 편자·조선 집현전 학자들',
      NULL,
      '성종실록은 세종이 신숙주·성삼문 등을 요동에 보내 황찬에게 어음과 자훈을 질정하게 하고 여러 운서를 이루었다고 회고한다.',
      '개인 감상이나 완독 진술이 아니라 국가 언어 연구·편찬 업무이다. 《동국정운》은 성삼문을 포함한 집현전 학자들의 생산물이라 본인 창작물 제외 원칙에도 걸린다.'
    ),
    (
      rejected_book_memorial_finding_id,
      target_run_id,
      'BOOK',
      'rejected',
      '시경·예기·진덕수의 글',
      '공자 전승·후대 편자·진덕수',
      NULL,
      '단종실록의 성삼문 등 공동 상소는 환관 제도를 논하며 《시》와 《예》를 거명하고 진덕수의 말을 인용한다.',
      '여러 관원이 함께 올린 상소여서 어떤 인물이 자료를 선택했는지 알 수 없다. 성삼문 개인이 특정 판본을 읽었다는 진술도 아니며 진덕수 인용의 서명도 적혀 있지 않다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '환동 가무 선발·시연',
      NULL,
      NULL,
      '세조실록은 성삼문이 환동 20명을 명 사신에게 보이고, 선발된 아이들에게 가무를 가르쳐 다시 보이라는 지시를 전달받았다고 기록한다.',
      '외교 사절 응대 행정이며 성삼문이 특정 제목의 공연을 감상했다는 기록이 아니다. 공연명·창작자·현대 영상 식별자도 없다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '환동 창기 가무 교육',
      NULL,
      NULL,
      '같은 실록 기사는 명 사신이 선발한 환동들에게 창기 가무를 가르치라고 성삼문에게 말한 사실을 전한다.',
      '교육·시연을 준비하라는 행정 지시일 뿐 성삼문의 음악 선호나 청취 기록이 아니다. 곡명과 작곡자도 전하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '성삼문 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_book_work_finding_id,
      'https://sillok.history.go.kr/id/kia_11802002_001',
      'primary',
      'archive',
      'accessible',
      '성종실록 18년 2월 2일 — 운서 질정 회고',
      '신숙주·성삼문 등이 황찬에게 어음·자훈을 질정하고 《홍무정운》·《사성통고》 등을 이루었다는 편찬 업무를 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_memorial_finding_id,
      'https://sillok.history.go.kr/id/kfa_10111018_001',
      'primary',
      'archive',
      'accessible',
      '단종실록 1년 11월 18일 — 성삼문 등의 공동 상소',
      '공동 상소가 《시》·《예》와 진덕수를 논거로 삼지만 개인 독서 진술은 아님을 원문과 국역에서 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      NULL,
      'https://encykorea.aks.ac.kr/Article/E0029365',
      'secondary',
      'official_profile',
      'accessible',
      '성삼문 — 한국민족문화대백과사전',
      '사가독서·집현전 활동·운서 편찬·본인 문집을 포함한 생애 기준선을 확인하고 외부 독서 작품과 분리했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://sillok.history.go.kr/id/kga_10204024_001',
      'primary',
      'archive',
      'accessible',
      '세조실록 2년 4월 24일 — 환동 선발',
      '성삼문의 역할이 환동을 명 사신에게 보이고 지시를 전달받은 외교 행정임을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://sillok.history.go.kr/id/kga_10204024_001',
      'primary',
      'archive',
      'accessible',
      '세조실록 2년 4월 24일 — 환동 가무 교육 지시',
      '창기 가무는 환동 교육 지시이며 성삼문의 특정 곡 청취가 아님을 확인했다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://ygc.skku.edu/ygc/content/story.do?article.offset=10&articleLimit=10&articleNo=2051&mode=view',
      'secondary',
      'official_profile',
      'accessible',
      '나리의 녹은 먹지 않았고: 성삼문 이야기 — 한국유경편찬센터',
      '성균관대 한국유경편찬센터의 생애 서술과 바둑·장기·놀이·game 조합을 대조했다. 확인되는 것은 정치·학문 행적이며 식별 가능한 디지털 GAME 이용은 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '성삼문 조사 source 생성 행 수가 6이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '성삼문·成三問·매죽헌과 독서·讀書·사가독서·책·경전·운서 조합을 검색했다. 사가독서는 서명 미상, 운서는 국가 편찬 업무, 공동 상소의 경전 언급은 개인 독서 진술이 아니어서 모두 기각했다.'
      WHEN 'VIDEO' THEN
        '관람·공연·연극·가무·watched·theatre 조합을 검색했다. 환동 선발·시연은 외교 행정이며 제목 있는 관람 작품은 없다. 후대 사육신 영상물은 본인 소재 작품이다.'
      WHEN 'GAME' THEN
        '게임·바둑·장기·놀이·圍棋·博弈 조합을 실록·공식 전기와 대조했다. 특정 디지털 GAME 플레이 기록은 없다.'
      WHEN 'MUSIC' THEN
        '음악·노래·가무·歌舞·music 조합을 검색했다. 확인되는 가무는 환동 교육 지시와 본인 시가뿐이며 특정 외부 곡 청취는 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '성삼문 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '성삼문 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '성삼문 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '성삼문 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
