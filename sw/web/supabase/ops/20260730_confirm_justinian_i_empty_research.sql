-- 유스티니아누스 1세 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 조사 원장에 반영한다.
-- 채택 콘텐츠는 0건이다.
-- 기각:
--   BOOK  로마법대전 — 본인이 명한 법전 편찬 사업의 산출물
--   VIDEO 아도르나 극장의 공연군 — 법률에 열거된 규제 대상이며 개인 관람 기록이 아님
--   GAME  청색당 전차경주 — 실제 경기·정치 파벌이며 디지털 게임 작품이 아님
--   MUSIC 독생자 찬가 — 본인 저작 귀속이 논쟁적이고 외부 감상 작품이 아님
--
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '525fd227-5f41-456c-a33a-2367fc02bb42'::uuid;
  target_run_id constant uuid := '67e57274-1a20-42bc-a6f0-5fcbe75534e0'::uuid;
  rejected_book_finding_id constant uuid := 'db4facce-6db0-4530-8224-7ac57ac6304f'::uuid;
  rejected_video_finding_id constant uuid := '261f7ae6-c51e-4504-a244-d21dd44de9d8'::uuid;
  rejected_game_finding_id constant uuid := '0eb4a567-cd63-4d25-83cf-828a9b8ca26d'::uuid;
  rejected_music_finding_id constant uuid := '28eefd3e-3e2d-479c-a83b-67b43471fdbf'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'justinian-i'
      AND p.nickname = '유스티니아누스 1세'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '유스티니아누스 1세 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id = target_celeb_id
  ) THEN
    RAISE EXCEPTION '유스티니아누스 1세에게 이미 연결된 콘텐츠가 있습니다.';
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
    RAISE EXCEPTION '유스티니아누스 1세 조사 실행 또는 이번 원장 ID가 이미 존재합니다.';
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
    '2026-07-30-justinian-i-full-v1',
    'Codex',
    ARRAY[
      '유스티니아누스 1세',
      '유스티니아누스 대제',
      'Justinian I',
      'Justinian the Great',
      'Flavius Petrus Sabbatius Iustinianus',
      'Ιουστινιανός Α΄'
    ],
    '동로마 황제 유스티니아누스 1세(약 482~565)와 숙부 유스티누스 1세, 장군 게르마누스의 아들 유스티니아누스 및 2세를 분리했다. 프로코피오스의 후대 저술과 유스티니아누스를 소재로 한 현대 작품은 본인의 소비 기록에서 제외했다.',
    '영어·라틴어·그리스어 이름 변형으로 BOOK·VIDEO·GAME·MUSIC을 각각 검색하고 유스티니아누스 법전 원문, 프로코피오스, 대학 법사학 자료와 찬송가학 사전을 대조했다. 로마법대전은 본인이 명한 편찬·교육 사업이며, 극장 공연은 법률상 규제 대상으로만 열거된다. 청색당 전차경주 지지는 실제 경기·정치 파벌이고, 《독생자》 찬가는 본인 저작 귀속 자체가 논쟁적이다. 외부 작품을 읽거나 관람·플레이·감상했다는 작품 단위 근거는 네 유형 모두 0건이다.'
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
      '로마법대전',
      '트리보니아누스 편찬위원회·유스티니아누스 1세',
      NULL,
      '유스티니아누스는 529~534년 법전·학설휘찬·법학제요를 편찬하도록 명하고 533년 법학교육 과정을 이 산출물 중심으로 개편했다.',
      '본인이 읽었다고 고른 외부 저작이 아니라 황제의 명령과 헌법을 포함한 국가 편찬·입법 사업의 산출물이다. 창작·발주 관계를 소비 BOOK으로 바꾸지 않는다.'
    ),
    (
      rejected_video_finding_id,
      target_run_id,
      'VIDEO',
      'rejected',
      '아도르나 극장의 희극·비극·음악회·공연(개별 작품명 미상)',
      NULL,
      NULL,
      '유스티니아누스 신법 105는 황제 행렬의 다섯 번째 경로가 아도르나 극장으로 향하며 그곳에서 희극·비극·음악회와 각종 공연이 열린다고 열거한다.',
      '법률이 공연 산업과 의례를 규정한 기록일 뿐 황제가 본 특정 작품의 관람 기록이 아니다. 개별 작품명·작가·관람 행위도 없다.'
    ),
    (
      rejected_game_finding_id,
      target_run_id,
      'GAME',
      'rejected',
      '청색당 전차경주',
      NULL,
      NULL,
      '동시대 프로코피오스는 유스티니아누스가 청색당의 열성 지지자였고 즉위 뒤에도 청색당을 후원했다고 비판한다.',
      '청색당은 전차경주 팀이자 도시 정치 파벌이며 전차경주는 실제 스포츠다. 작품 단위 디지털 GAME으로 등록할 수 없다.'
    ),
    (
      rejected_music_finding_id,
      target_run_id,
      'MUSIC',
      'rejected',
      '독생자(Ὁ Μονογενὴς Υἱός)',
      NULL,
      NULL,
      '6세기 찬가 《독생자》는 칼케돈파 전승에서 유스티니아누스에게, 단성론 전승에서는 안티오키아의 세베루스에게 귀속된다.',
      '본인의 외부 음악 감상 근거가 아니라 저작·보급 명령의 귀속 문제다. 저자도 학술적으로 확정되지 않아 소비 MUSIC으로 채택할 수 없다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '유스티니아누스 1세 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
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
      'https://www.ucl.ac.uk/social-historical-sciences/epitome-iuliani',
      'secondary',
      'official_profile',
      'accessible',
      'Epitome Iuliani, UCL',
      '유스티니아누스가 533년 법학교육 5년 과정을 자신의 법전·학설휘찬·법학제요 중심으로 정한 편찬·교육 관계를 확인했다.'
    ),
    (
      target_run_id,
      'BOOK',
      rejected_book_finding_id,
      'https://www.law.berkeley.edu/research/the-robbins-collection/exhibitions/medieval-law-school/',
      'secondary',
      'official_profile',
      'accessible',
      'The Medieval Law School, UC Berkeley Law',
      '529~534년 유스티니아누스가 명한 로마법 대편찬의 성격과 후대 법학교육 영향을 교차 확인했다.'
    ),
    (
      target_run_id,
      'VIDEO',
      rejected_video_finding_id,
      'https://droitromain.univ-grenoble-alpes.fr/Anglica/N105_Scott.htm',
      'primary',
      'archive',
      'accessible',
      'The Novels of Justinian, Novel 105',
      '유스티니아누스 신법 원문 번역이 희극·비극·음악회·각종 공연을 극장 의례의 일반 범주로 열거할 뿐 개인 관람작을 밝히지 않는 것을 확인했다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Procopius/Anecdota/7%2A.html',
      'primary',
      'archive',
      'accessible',
      'Procopius, Anecdota Chapter 7',
      '동시대 저자가 유스티니아누스를 청색당의 기존 열성 지지자이자 후원자로 기록한 원문을 확인했다. 적대적 저술이라는 성격도 함께 보존한다.'
    ),
    (
      target_run_id,
      'GAME',
      rejected_game_finding_id,
      'https://penelope.uchicago.edu/encyclopaedia_romana/circusmaximus/nika.html',
      'secondary',
      'article',
      'accessible',
      'The Nika Riot',
      '청색당·녹색당이 전차경주 팀과 제국 정치 파벌을 겸했고 유스티니아누스가 청색당을 지지했다는 맥락을 대조했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://hymnology.hymnsam.co.uk/j/justinian-i',
      'secondary',
      'official_profile',
      'accessible',
      'Justinian I, Canterbury Dictionary of Hymnology',
      '《독생자》 찬가가 칼케돈파에서는 유스티니아누스, 단성론파에서는 세베루스에게 귀속된다는 상충 전승을 확인했다.'
    ),
    (
      target_run_id,
      'MUSIC',
      rejected_music_finding_id,
      'https://www.examenapium.it/cs/biblio/Oxford1954-2.pdf',
      'secondary',
      'archive',
      'accessible',
      'New Oxford History of Music, Early Medieval Music',
      '고대 비잔틴 찬송 전통에서 《독생자》가 유스티니아누스에게 귀속된다고 정리하지만 개인 감상 근거는 제시하지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '유스티니아누스 1세 조사 source 생성 행 수가 7이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Justinian I·Iustinianus와 read·book·library·legal education·Digest·Institutes 조합을 검색했다. 확인되는 문헌 관계는 로마법전 편찬 명령과 교육과정 개편이며 개인의 외부 저작 독서 기록이 아니다. 본인의 신학 저술·헌법도 제외했다.'
      WHEN 'VIDEO' THEN
        'theatre·mime·comedy·tragedy·spectacle·watched 조합과 신법 105를 검색했다. 극장·희극·비극·음악회는 규제·의례 범주로 열거될 뿐 개별 작품과 황제의 관람 행위가 확인되지 않았다.'
      WHEN 'GAME' THEN
        'game·chariot race·Blues·Greens·Hippodrome 조합을 검색했다. 청색당 지지는 확인되지만 실제 전차경주 스포츠와 정치 파벌 관계이며 디지털 GAME 작품이 아니다.'
      WHEN 'MUSIC' THEN
        'music·hymn·chant·Only-Begotten Son·Ὁ Μονογενὴς Υἱός 조합을 검색했다. 찬가의 저자 귀속은 유스티니아누스와 세베루스 사이에서 논쟁적이며, 어느 쪽이든 본인의 외부 작품 감상 기록이 아니므로 기각했다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '유스티니아누스 1세 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
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
      '유스티니아누스 1세 조사 완료 함수 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '유스티니아누스 1세 프로필·0건 확정 최종 검증에 실패했습니다.';
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
    RAISE EXCEPTION '유스티니아누스 1세 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
