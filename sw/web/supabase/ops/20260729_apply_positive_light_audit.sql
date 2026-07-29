-- 콘텐츠를 이미 보유한 Light 7명 감사 결과를 원자적으로 반영한다.
--
-- 실행 시점:
--   1. 20260729_add_celeb_content_research_status.sql 적용
--   2. web-bo / web 배포
--   3. 이 파일을 원격 DB에서 1회 실행
--
-- 결과:
--   - 사실 근거가 없는 user_contents 9건 제거
--   - 이영표의 성경 영문판 메타데이터를 같은 OpenLibrary 에디션으로 교정
--   - 감사 통과자 박경리·김민재·이영표만 full 승격
--   - 0건이 된 노숙·소진·주유·빌 러셀은 light + open 유지

BEGIN;

DO $$
DECLARE
  missing_status_column boolean;
  wrong_profile_count integer;
  wrong_record_count integer;
BEGIN
  SELECT NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'content_research_status'
  )
  INTO missing_status_column;

  IF missing_status_column THEN
    RAISE EXCEPTION
      'content_research_status가 없습니다. 스키마 마이그레이션을 먼저 적용하세요.';
  END IF;

  SELECT count(*)
  INTO wrong_profile_count
  FROM (
    VALUES
      ('lu-su'),
      ('park-kyong-ni'),
      ('kim-min-jae'),
      ('su-qin'),
      ('lee-young-pyo'),
      ('zhou-yu'),
      ('bill-russell')
  ) AS expected(slug)
  LEFT JOIN public.profiles p
    ON p.slug = expected.slug
  WHERE p.id IS NULL
     OR p.profile_type IS DISTINCT FROM 'CELEB'
     OR p.celeb_tier IS DISTINCT FROM 'light'
     OR p.content_research_status IS DISTINCT FROM 'open';

  IF wrong_profile_count <> 0 THEN
    RAISE EXCEPTION
      '감사 대상 7명의 profile_type/tier/research 상태가 기준선과 다릅니다. 차이=%',
      wrong_profile_count;
  END IF;

  SELECT count(*)
  INTO wrong_record_count
  FROM (
    VALUES
      ('e5268dd1-4a1d-4bd7-81a7-c6c7526269b0'::uuid, 'bill-russell', 'bde92642-bf9e-42ac-9348-e1a6372a9f45'),
      ('eeba53be-0912-492b-a4c5-68b855459d2b'::uuid, 'kim-min-jae', '953dd6d1-51d7-4406-bbd8-0d7639b95306'),
      ('2dc067f6-324e-403e-b080-72b940747b23'::uuid, 'lee-young-pyo', '61291fb4-5f59-4244-bf6f-00c378248c20'),
      ('63bdc245-9405-4f11-9581-958807487dfc'::uuid, 'lee-young-pyo', '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0'),
      ('032c70f9-84d4-43f3-bc17-89a2746b0fd9'::uuid, 'lu-su', '3a90ea58-8c24-4ecf-874c-3e30783178e4'),
      ('8f5dde4c-fafb-4f74-bc1c-74abf7311b2a'::uuid, 'lu-su', 'bc60beee-bf16-43bb-8970-2de19f4b1153'),
      ('ea1102a3-fc35-4224-9b0e-e07f498f8d73'::uuid, 'lu-su', '2172576b-160a-4292-967c-b16e4b923eb4'),
      ('7bb17524-0541-4aab-9045-e7f7cb7b7dc7'::uuid, 'park-kyong-ni', '3cb453d9-52ce-4211-9323-d2d949d8b7a1'),
      ('925f8c37-bd2e-4980-8879-66d057343965'::uuid, 'park-kyong-ni', '9dd6adbf-3303-44f6-ba56-1e3f8bc75492'),
      ('a0e24cc9-fa2f-45c4-be62-fd08ed00c532'::uuid, 'park-kyong-ni', '3c0f31db-007b-4cf8-b175-dd3f2af917fb'),
      ('d2359942-ca5c-4ff5-9a76-514e7825702c'::uuid, 'park-kyong-ni', 'bafa80d9-83b7-4bb9-89c1-915f418dde7e'),
      ('3fd4eaa2-47af-42ba-ab5c-5b70cd5a5be9'::uuid, 'su-qin', 'f626f05d-ade0-4b3f-9a40-2cc8ede46895'),
      ('6748e454-a408-4b26-b389-5efd0e7dab3e'::uuid, 'su-qin', '8f9051d0-271c-4929-b779-00a33ef93c94'),
      ('487e6ac2-42d7-4ed2-889b-74874ed95b85'::uuid, 'zhou-yu', 'e84d64fa-b765-4194-84f0-ba7e41135cb8'),
      ('d9b616f8-bb42-425a-a0bf-7e00b9d4daf6'::uuid, 'zhou-yu', '0925e1cc-92c1-4b74-b691-f125bde6ccde'),
      ('f4fc03ce-ba68-4f36-a3fc-863ae01fbc47'::uuid, 'zhou-yu', 'fa0376af-a847-4b15-a5a6-f093261fedde')
  ) AS expected(user_content_id, slug, content_id)
  LEFT JOIN public.profiles p
    ON p.slug = expected.slug
  LEFT JOIN public.user_contents uc
    ON uc.id = expected.user_content_id
   AND uc.user_id = p.id
   AND uc.content_id = expected.content_id
  WHERE uc.id IS NULL;

  IF wrong_record_count <> 0 THEN
    RAISE EXCEPTION
      '감사 기준선 16건의 user/content 연결이 달라졌습니다. 차이=%',
      wrong_record_count;
  END IF;
END;
$$;

DO $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.content_locales
  SET publisher = 'Zondervan Bible Publishers',
      thumbnail_url = 'https://covers.openlibrary.org/b/id/12913496-L.jpg',
      sources = '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      verified = true,
      updated_at = now()
  WHERE content_id = '6e5989e2-0cfb-4a4c-8e47-182d0599bfd0'
    AND locale = 'en'
    AND isbn = '9780310908173';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '이영표 성경 en locale 에디션이 기준선과 다릅니다.';
  END IF;
END;
$$;

DO $$
DECLARE
  affected integer;
BEGIN
  DELETE FROM public.user_contents
  WHERE id IN (
    'e5268dd1-4a1d-4bd7-81a7-c6c7526269b0'::uuid,
    '032c70f9-84d4-43f3-bc17-89a2746b0fd9'::uuid,
    '8f5dde4c-fafb-4f74-bc1c-74abf7311b2a'::uuid,
    'ea1102a3-fc35-4224-9b0e-e07f498f8d73'::uuid,
    '3fd4eaa2-47af-42ba-ab5c-5b70cd5a5be9'::uuid,
    '6748e454-a408-4b26-b389-5efd0e7dab3e'::uuid,
    '487e6ac2-42d7-4ed2-889b-74874ed95b85'::uuid,
    'd9b616f8-bb42-425a-a0bf-7e00b9d4daf6'::uuid,
    'f4fc03ce-ba68-4f36-a3fc-863ae01fbc47'::uuid
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 9 THEN
    RAISE EXCEPTION
      '제거 대상 user_contents 수가 기준선과 다릅니다. 실제=%',
      affected;
  END IF;
END;
$$;

-- 기존 contents.user_count에 드리프트가 있었으므로 제거 대상 작품은 실측값으로 맞춘다.
UPDATE public.contents c
SET user_count = (
  SELECT count(*)::integer
  FROM public.user_contents uc
  WHERE uc.content_id = c.id
)
WHERE c.id IN (
  'bde92642-bf9e-42ac-9348-e1a6372a9f45',
  '3a90ea58-8c24-4ecf-874c-3e30783178e4',
  'bc60beee-bf16-43bb-8970-2de19f4b1153',
  '2172576b-160a-4292-967c-b16e4b923eb4',
  'f626f05d-ade0-4b3f-9a40-2cc8ede46895',
  '8f9051d0-271c-4929-b779-00a33ef93c94',
  'e84d64fa-b765-4194-84f0-ba7e41135cb8',
  '0925e1cc-92c1-4b74-b691-f125bde6ccde',
  'fa0376af-a847-4b15-a5a6-f093261fedde'
);

UPDATE public.profiles
SET celeb_tier = 'full'
WHERE slug IN ('park-kyong-ni', 'kim-min-jae', 'lee-young-pyo')
  AND profile_type = 'CELEB'
  AND celeb_tier = 'light';

DO $$
DECLARE
  wrong_result_count integer;
BEGIN
  SELECT count(*)
  INTO wrong_result_count
  FROM (
    VALUES
      ('park-kyong-ni', 'full', 4),
      ('kim-min-jae', 'full', 1),
      ('lee-young-pyo', 'full', 2),
      ('lu-su', 'light', 0),
      ('su-qin', 'light', 0),
      ('zhou-yu', 'light', 0),
      ('bill-russell', 'light', 0)
  ) AS expected(slug, tier, content_count)
  LEFT JOIN public.profiles p
    ON p.slug = expected.slug
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS content_count
    FROM public.user_contents uc
    WHERE uc.user_id = p.id
  ) actual ON true
  WHERE p.id IS NULL
     OR p.celeb_tier <> expected.tier
     OR actual.content_count <> expected.content_count
     OR (
       expected.content_count = 0
       AND p.content_research_status <> 'open'
     );

  IF wrong_result_count <> 0 THEN
    RAISE EXCEPTION
      '감사 반영 후 tier/count/research 검증 실패. 차이=%',
      wrong_result_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id IN (
      'bde92642-bf9e-42ac-9348-e1a6372a9f45',
      '3a90ea58-8c24-4ecf-874c-3e30783178e4',
      'bc60beee-bf16-43bb-8970-2de19f4b1153',
      '2172576b-160a-4292-967c-b16e4b923eb4',
      'f626f05d-ade0-4b3f-9a40-2cc8ede46895',
      '8f9051d0-271c-4929-b779-00a33ef93c94',
      'e84d64fa-b765-4194-84f0-ba7e41135cb8',
      '0925e1cc-92c1-4b74-b691-f125bde6ccde',
      'fa0376af-a847-4b15-a5a6-f093261fedde'
    )
      AND c.user_count <> (
        SELECT count(*)::integer
        FROM public.user_contents uc
        WHERE uc.content_id = c.id
      )
  ) THEN
    RAISE EXCEPTION '제거 대상 작품의 contents.user_count 정합성 검증 실패';
  END IF;
END;
$$;

COMMIT;
