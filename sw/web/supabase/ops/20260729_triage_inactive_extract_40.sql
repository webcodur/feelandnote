-- 비활성 + 감상여정 비정형 작품 Light 40명을 빠르게 선별한다.
--
-- 이 작업은 감상여정에서 작품을 발굴하거나 웹 조사를 하는 단계가 아니다.
--   - 영향력 35 이상은 조사 큐에 보존한다.
--   - 그 아래는 공개 인터뷰·전기·기관 자료에서 작품 관계를 찾을 가능성이
--     비교적 큰 인물만 큐에 둔다.
--   - 자기 연구·일반 취향·구전 문화·업무 경험만 보이고 개인 작품 자료가
--     희박해 보이면 보류한다.
--
-- 결과:
--   - queued 24명
--   - deferred 16명
--   - 콘텐츠·tier·감상여정은 변경하지 않으며 confirmed_empty도 만들지 않는다.

BEGIN;

CREATE TEMP TABLE inactive_extract_triage_decisions (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  next_status text NOT NULL CHECK (next_status IN ('queued', 'deferred')),
  reason text NOT NULL
) ON COMMIT DROP;

INSERT INTO inactive_extract_triage_decisions (id, slug, next_status, reason)
VALUES
  -- 영향력 35 이상: 현재 작품명이 없어도 조사 가치 자체로 큐에 보존한다.
  ('6ca928be-371f-44cb-9cac-59baa1ae6471', 'spartacus', 'queued', '영향력 48·고대 사료 재검토 가치'),
  ('1ddef49e-5ec7-452a-ab3d-deec19b0abca', 'shengjia-zhao', 'queued', '영향력 42·현대 과학자·기관 자료 가능'),
  ('dd58c8fa-12fc-4509-86f0-b5f39ac41f3b', 'chagatai-khan', 'queued', '영향력 42·세력도 연결'),
  ('a97a7bf8-24d1-4e57-b1fe-9cc5d48974da', 'lucius-sergius-catilina', 'queued', '영향력 39·고대 사료 재검토 가치'),
  ('d7bd2a5c-d44a-43ce-9411-472f9f1739da', 'mark-antony', 'queued', '영향력 38·고대 전기 자료 풍부'),
  ('d7ad6b36-d020-4ae7-926e-be9bd5a0bf43', 'joseph-fouche', 'queued', '영향력 38·근대 회고·서신 자료 가능'),
  ('98e10432-60cd-43fa-ad17-f6129e10c553', 'pompey-the-great', 'queued', '영향력 38·고대 전기 자료 풍부'),
  ('244d6243-e93e-4328-9c8b-0274bedfc283', 'bai-qi', 'queued', '영향력 37·세력도 연결'),
  ('4523edd1-cb70-41dd-92ac-1068dee9802b', 'jean-baptiste-bernadotte', 'queued', '영향력 37·근대 왕실·서신 자료 가능'),
  ('c2ae0091-14e4-41a3-a801-b5eb01d8176f', 'marcus-licinius-crassus', 'queued', '영향력 36·철학 스승 관계 단서'),
  ('7da75221-1f74-4e4f-85ad-ee88b726e607', 'tolui', 'queued', '영향력 35·세력도 연결'),

  -- 영향력 35 미만이지만 공개 자료나 구체 관계가 나올 가능성이 비교적 큰 인물.
  ('d312f01b-8512-4cfa-a805-515382abcd73', 'bom-kim', 'queued', '현대 기업가·장문 인터뷰 가능'),
  ('86fdd57a-e937-4602-81cd-053a01d7319d', 'jb-straubel', 'queued', '현대 기업가·전기·인터뷰 자료 가능'),
  ('def56120-9e98-400a-95a1-0189a1e0e16d', 'gaius-cassius-longinus', 'queued', '고대 철학 수용·서신 자료 가능'),
  ('ef2c3c5a-b342-476a-9064-1d992c090a25', 'pushmeet-kohli', 'queued', '현대 과학자·공개 강연·인터뷰 가능'),
  ('55177fa6-266f-41af-b595-5364618d267a', 'shoichiro-irimajiri', 'queued', '현대 기업가·일본어 인터뷰 자료 가능'),
  ('46f2f1ad-51db-4d91-81a2-6eb7e6a84c81', 'shou-zi-chew', 'queued', '현대 대중 인물·인터뷰 자료 풍부'),
  ('2eb15717-bde7-443c-baff-7e39e905f259', 'jan-koum', 'queued', '현대 기업가·전기·인터뷰 자료 가능'),
  ('3c257f44-77e2-40c2-80e2-d2d985596398', 'quoc-le', 'queued', '현대 과학자·공개 인터뷰 가능'),
  ('e2531f3e-ed59-42aa-a9fb-fcbc60d7eb70', 'park-wan-suh', 'queued', '작가·한국어 인터뷰와 독서 자료 풍부'),
  ('09c6aa46-9aeb-4ba9-9388-48dab47f1c1d', 'tom-anderson', 'queued', '현대 기업가·작가·음악 선호 단서'),
  ('db55072b-61e3-4902-a401-754e9a790916', 'koo-kwang-mo', 'queued', '현대 대기업 총수·게임 취향 보충 가능'),
  ('06e4b483-b2fb-489c-a9c6-e390e1b1cacd', 'yong-hyun-kim', 'queued', '현대 기업가·한국어 인터뷰 가능'),
  ('14149db6-da97-4d1f-a748-6492366a73c3', 'sung-uk-moon', 'queued', '현대 기업가·한국어 인터뷰 가능'),

  -- 본인 연구·일반 경험·구전 문화만 보이고 개인 작품 자료 가능성이 낮은 인물.
  ('3874e2e8-d3a3-4d5c-b2d1-777362792bfa', 'alex-krizhevsky', 'deferred', '공개 활동이 적고 본인 연구만 확인'),
  ('5472291a-bff7-4c43-b9a8-6d980e90fa75', 'louis-nicolas-davout', 'deferred', '군사·행정 경험만 확인'),
  ('96bedf3b-c53e-4011-a6a1-ff7baf954fd2', 'joachim-murat', 'deferred', '군사·자기 연출 경험만 확인'),
  ('cb7ec2db-d4f3-4e6c-b166-54db7c7037f8', 'yang-song', 'deferred', '본인 연구만 확인'),
  ('315ea931-4db9-43e2-8e9d-e2142e268378', 'lysimachus', 'deferred', '헬레니즘 일반 교양 유추만 확인'),
  ('7e3192f9-0496-4dac-beff-5ab76e5e56b5', 'fusu', 'deferred', '정치·교육 배경만 확인'),
  ('40fea5f9-ad2e-4dd2-9b4e-21bbb116130f', 'alex-graves', 'deferred', '본인 연구만 확인'),
  ('9bd0737b-bc85-40cd-adf0-4538f9f8866f', 'harvey-c.-jones', 'deferred', '업무·산업 경험만 확인'),
  ('003d8f9e-0137-4fc6-9c80-965b2f778f40', 'jamukha', 'deferred', '구전 문화와 사후 기록만 확인'),
  ('088659d5-61a9-490d-af6c-4d4a6f50469a', 'jean-lannes', 'deferred', '일반 독학과 본인 편지만 확인'),
  ('d7d6155a-2e1d-4f3f-bb56-1d7939b790ca', 'count-alessandro-di-cagliostro', 'deferred', '비식별 신비주의 문헌군만 확인'),
  ('e1eb947a-e6f8-403a-a651-54297608b4c5', 'lao-ai', 'deferred', '감상여정 자체가 독서 기록 부재 명시'),
  ('63f25aa3-092a-4d3c-ab82-e0a83580a050', 'lola-montez', 'deferred', '바이런 시 일반 선호만 확인'),
  ('c74024ec-0525-44f2-a8a0-d17ccf72e8b6', 'roxana', 'deferred', '궁정 문화·원정 경험만 확인'),
  ('dc5226ab-79d4-499b-8271-c0426e5c670b', 'shuchao-bi', 'deferred', '튜링 사상과 본인 연구만 확인'),
  ('c659808b-f62c-40fb-8c81-f97e062fc4aa', 'trapit-bansal', 'deferred', '본인 연구와 일반 발언만 확인');

DO $$
DECLARE
  affected integer;
  wrong_count integer;
BEGIN
  SELECT count(*) INTO wrong_count
  FROM inactive_extract_triage_decisions;

  IF wrong_count <> 40 THEN
    RAISE EXCEPTION '비활성 비정형 선별표가 40명이 아닙니다. 실제=%', wrong_count;
  END IF;

  SELECT count(*) INTO wrong_count
  FROM inactive_extract_triage_decisions
  WHERE next_status = 'queued';

  IF wrong_count <> 24 THEN
    RAISE EXCEPTION '비활성 비정형 queued가 24명이 아닙니다. 실제=%', wrong_count;
  END IF;

  SELECT count(*) INTO wrong_count
  FROM inactive_extract_triage_decisions
  WHERE next_status = 'deferred';

  IF wrong_count <> 16 THEN
    RAISE EXCEPTION '비활성 비정형 deferred가 16명이 아닙니다. 실제=%', wrong_count;
  END IF;

  -- 40명 모두 여전히 비정형 감상여정 조사 전 기준선인지 확인한다.
  SELECT count(*)
  INTO wrong_count
  FROM inactive_extract_triage_decisions d
  LEFT JOIN public.profiles p
    ON p.id = d.id
  WHERE p.id IS NULL
     OR p.slug IS DISTINCT FROM d.slug
     OR p.profile_type IS DISTINCT FROM 'CELEB'
     OR p.celeb_tier IS DISTINCT FROM 'light'
     OR p.status IS DISTINCT FROM 'inactive'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR coalesce(
          nullif(btrim(p.consumption_philosophy), ''),
          nullif(btrim(p.cultural_journey), '')
        ) IS NULL
     OR (
       coalesce(
         nullif(btrim(p.consumption_philosophy), ''),
         nullif(btrim(p.cultural_journey), '')
       ) ~ '(『[^』]+』|《[^》]+》|〈[^〉]+〉|「[^」]+」|\[[^\]]+\])'
     )
     OR EXISTS (
       SELECT 1
       FROM public.user_contents uc
       WHERE uc.user_id = p.id
     );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '비활성 비정형 40명의 기준선이 달라졌습니다. 차이=%', wrong_count;
  END IF;

  UPDATE public.profiles p
  SET content_research_status = d.next_status
  FROM inactive_extract_triage_decisions d
  WHERE p.id = d.id
    AND p.profile_type = 'CELEB'
    AND p.celeb_tier = 'light'
    AND p.status = 'inactive'
    AND p.content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 40 THEN
    RAISE EXCEPTION '비활성 비정형 상태 변경 행 수가 40이 아닙니다. 실제=%', affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM inactive_extract_triage_decisions d
  JOIN public.profiles p
    ON p.id = d.id
  WHERE p.content_research_status IS DISTINCT FROM d.next_status
     OR p.celeb_tier IS DISTINCT FROM 'light'
     OR p.status IS DISTINCT FROM 'inactive'
     OR p.content_research_updated_at IS NULL
     OR p.content_research_confirmed_empty_at IS NOT NULL
     OR EXISTS (
       SELECT 1
       FROM public.user_contents uc
       WHERE uc.user_id = p.id
     );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION '비활성 비정형 선별 후 상태 불변식 위반 인물=%', wrong_count;
  END IF;
END;
$$;

COMMIT;
