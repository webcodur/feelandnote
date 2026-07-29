-- 김옥균 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  후쿠자와 유키치의 《문명론의 개략》 — 사상적 영향 연구는 있으나 직접 독서 기록 없음
--   BOOK  《치도약론》·《갑신일록》 — 김옥균 본인의 저술

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '268395ee-01e0-45ab-ae24-6a399d4b0dec'::uuid;
  target_run_id constant uuid := '8be7277f-bab6-45d5-9215-6f086d086314'::uuid;
  rejected_civilization_id constant uuid := '2afa42b6-95d2-46f1-82d3-294f2ba088f5'::uuid;
  rejected_own_writings_id constant uuid := '98912d8b-a7b6-420b-be39-f6757fbfccbb'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'kim-ok-gyun'
      AND p.nickname = '김옥균'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '김옥균 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '김옥균에게 이미 연결된 콘텐츠가 있습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_findings f
    WHERE f.id IN (rejected_civilization_id, rejected_own_writings_id)
  ) THEN
    RAISE EXCEPTION '김옥균 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-kim-ok-gyun-full-v1',
    'Codex',
    ARRAY['김옥균', '金玉均', '金玉均 古筠', 'Kim Ok-gyun', 'Kim Okgyun', 'Kim Ok-kyun'],
    '조선 개화파 정치가 김옥균(1851~1894)을 동명 현대인과 후대 소설·영화·드라마 속 인물로부터 분리했다. 본인이 쓴 《치도약론》·《갑신일록》·서화는 외부 감상 콘텐츠에서 제외했다.',
    '한국어·한문·일본어·영어 이름 변형으로 네 유형을 조사하고 한국사데이터베이스, 우리역사넷, 한국민족문화대백과와 한일 개화사상 연구를 대조했다. 후쿠자와 유키치의 문명개화사상이 김옥균에게 미친 영향을 분석한 연구는 있으나, 《문명론의 개략》을 김옥균이 직접 읽었다는 문장·서한·일기·장서 기록은 찾지 못했다. 《조선책략》의 영향도 전달·정책 수용의 맥락일 뿐 개인 독서가 특정되지 않는다. 나머지 확인 가능한 제목은 김옥균 자신의 저술이고, 특정 영상·디지털 게임·음악 작품 소비 기록도 없어 0건으로 완료했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_civilization_id,
      target_run_id,
      'BOOK',
      'rejected',
      '문명론의 개략',
      '후쿠자와 유키치',
      NULL,
      '학술 논문과 출판 소개는 후쿠자와의 문명개화사상이 김옥균의 개화론에 미친 영향과 사상적 유사성을 논한다.',
      '영향 관계나 후쿠자와와의 교류만으로 특정 저작을 실제 읽었다고 볼 수 없다. 김옥균의 편지·일기·장서나 동시대 증언에서 이 책의 직접 독서를 확인하지 못해 기각한다.'
    ),
    (
      rejected_own_writings_id,
      target_run_id,
      'BOOK',
      'rejected',
      '치도약론·갑신일록',
      '김옥균',
      NULL,
      '우리역사넷과 한국민족문화대백과는 김옥균이 일본 시찰 뒤 《치도약론》을 지어 개화 방안을 제시했고, 정변 기록으로 《갑신일록》이 전한다고 설명한다.',
      '두 제목 모두 김옥균 본인의 저술이다. 이 조사는 외부 콘텐츠 소비를 수집하므로 자신의 글을 자신의 독서 콘텐츠로 등록하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '김옥균 조사 finding 생성 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id,
      'BOOK',
      rejected_civilization_id,
      'https://kiss.kstudy.com/Detail/Ar?key=3811312',
      'secondary',
      'article',
      'accessible',
      '福沢諭吉의 문명개화사상이 김옥균에게 미친 영향',
      '후쿠자와와 김옥균의 사상적 영향·유사성을 분석하지만 《문명론의 개략》 직접 독서를 입증하는 개인 기록은 제시하지 않는다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_own_writings_id,
      'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_40&levelId=kc_n400300',
      'secondary',
      'official_profile',
      'accessible',
      '우리역사넷 — 김옥균',
      '일본 시찰 뒤 김옥균이 《치도약론》을 저술한 사실을 확인해 자기 작품으로 분리했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      NULL,
      'https://encykorea.aks.ac.kr/Article/E0009911',
      'secondary',
      'official_profile',
      'accessible',
      '김옥균(金玉均) — 한국민족문화대백과사전',
      '공인 전기와 저술 목록을 watched·film·theatre·공연·관람 조합으로 대조했으나 제목 있는 외부 영상·극 작품 관람 기록은 없다.'
    ),
    (
      target_run_id,
      'GAME',
      NULL,
      'https://contents.history.go.kr/data/pdf/eh/eh_n0650_0010.pdf',
      'secondary',
      'archive',
      'accessible',
      '김옥균, 갑신정변을 일으키다',
      '생애·교육·개화 활동 자료를 game·놀이·바둑·장기 조합과 대조했으나 작품 단위 디지털 GAME 기록은 확인되지 않았다.'
    ),
    (
      target_run_id,
      'MUSIC',
      NULL,
      'https://www.pwpa-j.net/9members/articles/no162/162-9Lee.htm',
      'secondary',
      'article',
      'accessible',
      '김옥균의 근대사상과 갑신정변',
      '개화파 형성과 일본 체류 연구를 음악·노래·연주·감상 조합으로 대조했으나 제목 있는 특정 MUSIC 소비 기록은 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '김옥균 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        '김옥균·金玉均·Kim Ok-gyun과 독서·읽었다·読書·読んだ·愛読書·문명론지개·문명론의 개략·조선책략 조합을 검색했다. 영향·교류는 확인되지만 작품별 직접 독서 증거는 없고, 확인되는 제목은 본인 저술이었다.'
      WHEN 'VIDEO' THEN
        '관람·연극·공연·watched·film·theatre 조합을 공인 전기·개화파 연구와 대조했다. 후대 김옥균 소재 영화·드라마 외에 본인이 감상한 특정 작품은 없다.'
      WHEN 'GAME' THEN
        'game·played·놀이·바둑·장기 조합을 생애 자료에서 검색했다. 특정 디지털 GAME 작품 플레이 기록은 확인되지 않았다.'
      WHEN 'MUSIC' THEN
        'music·song·음악·노래·연주·감상 조합을 일본 체류·개화파 자료에서 검색했다. 제목과 김옥균의 소비 행위가 함께 확인되는 곡은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '김옥균 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '김옥균 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '김옥균 프로필·0건 확정 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f WHERE f.run_id = r.id AND f.decision = 'rejected') = 2
      AND (SELECT count(*) FROM public.celeb_content_research_sources src WHERE src.run_id = r.id) = 5
  ) THEN
    RAISE EXCEPTION '김옥균 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
