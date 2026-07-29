-- 비활성 + 감상여정 명시 작품 Light 69명을 빠르게 선별한다.
--
-- 이 작업은 콘텐츠 조사가 아니다.
--   - 영향력 35 이상은 현재 작품 단서가 약해도 조사 큐에 보존한다.
--   - 그 아래는 현대 인물이고 인터뷰·기관 프로필에서 외부 작품 관계를
--     찾을 가능성이 있는 경우만 조사 큐에 둔다.
--   - 본인 저술·자기 제작물·사후 기록·일반 교육 유추만 보이면 보류한다.
--
-- 결과:
--   - queued 42명
--   - deferred 27명
--   - 콘텐츠·tier·감상여정은 변경하지 않으며 confirmed_empty도 만들지 않는다.

BEGIN;

CREATE TEMP TABLE inactive_target_triage_decisions (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  next_status text NOT NULL CHECK (next_status IN ('queued', 'deferred')),
  reason text NOT NULL
) ON COMMIT DROP;

INSERT INTO inactive_target_triage_decisions (id, slug, next_status, reason)
VALUES
  -- 영향력 35 이상: 현재 후보의 품질과 무관하게 조사 가치 자체로 큐에 보존한다.
  ('3bc8a31c-eaa7-4861-9171-ac7979d762d2', 'seleucus-i-nicator', 'queued', '영향력 53·세력도 연결'),
  ('09e71746-e801-4f2c-a4ab-9ba6372f6560', 'ogedei-khan', 'queued', '영향력 52·세력도 연결'),
  ('b8eeb082-f666-4f52-beee-266c9cb0cd20', 'hulagu-khan', 'queued', '영향력 52·세력도 연결'),
  ('18c68975-db36-406b-9e4a-9d240fe52896', 'batu-khan', 'queued', '영향력 49·세력도 연결'),
  ('d26b9247-6979-4796-97c6-04e097dc07ad', 'philip-ii-of-macedon', 'queued', '영향력 48·세력도 연결'),
  ('fd060baa-225d-4d11-a678-b51c819fb98c', 'subutai', 'queued', '영향력 46·세력도 연결'),
  ('b887d46a-6aaa-42e6-916d-756c0685c8dd', 'meng-tian', 'queued', '영향력 43·세력도 연결'),
  ('29cc0551-0a36-47e7-b828-490c7624d4ee', 'marcus-junius-brutus', 'queued', '영향력 40·구체적 고대 독서 기록 가능'),
  ('71956da3-739d-4ce9-ad1e-fb864eb3945c', 'lu-buwei', 'queued', '영향력 40·세력도 연결'),
  ('57c7411d-7763-4fae-88d6-8a66ab81f5a7', 'borte', 'queued', '영향력 39·세력도 연결'),
  ('511eac35-6f81-4305-947d-886e3f6ba130', 'wang-jian', 'queued', '영향력 38·세력도 연결'),
  ('60d86408-b33c-4a8e-a253-c212cb119616', 'warren-mcculloch', 'queued', '영향력 38·현대 과학자·문헌 단서'),
  ('f90e2da9-0043-40b0-844f-f70b4c7149bb', 'pavel-durov', 'queued', '영향력 38·현대 기업가·추천 단서'),
  ('e8545314-4a0d-4e93-bb67-a3561f69e0e9', 'talleyrand', 'queued', '영향력 37·구체적 고전 단서'),
  ('314bcf1c-7dad-47cd-bda4-9de5110a9d86', 'cassander', 'queued', '영향력 37·세력도 연결'),
  ('c1d1471b-9004-4add-9d4f-374ea55dd085', 'moxie-marlinspike', 'queued', '영향력 36·현대 기업가·독서 단서 다수'),
  ('e8926bb7-a940-4b57-8e53-6f95e9e096c9', 'vercingetorix', 'queued', '영향력 35·세력도 연결'),
  ('71cdecc7-d561-48e8-b1a7-ea73fdb69900', 'antigonus-i-monophthalmus', 'queued', '영향력 35·세력도 연결'),
  ('71e2b4d7-8656-47d3-8909-e5a118ef333a', 'john-perry-barlow', 'queued', '영향력 35·현대 저술가·작품 단서'),

  -- 영향력 35 미만이지만 인터뷰·기관 프로필에서 외부 작품 관계가 나올 가능성이 큰 현대 인물.
  ('69c7bdbb-5a35-4db3-931f-e5866370ebc6', 'allen-zhang', 'queued', '현대 기업가·추천 도서 단서'),
  ('c093a54b-6f3d-48e9-ac18-6fe15d3b47f5', 'sepp-hochreiter', 'queued', '현대 과학자·논문 수용 단서'),
  ('32c21330-afe9-4958-8a09-08da4f78b7b2', 'jurgen-schmidhuber', 'queued', '현대 과학자·독서 단서'),
  ('611fbfdd-b34a-40e4-a872-05debf4dc0dd', 'chelsea-manning', 'queued', '현대 공인·도서와 음악 단서'),
  ('9475b6cb-95c2-4783-bb45-bf7f10fb2502', 'aaron-swartz', 'queued', '현대 공인·독서 목록 단서 다수'),
  ('3a4a5734-ba5f-4f98-93a7-77f4bb47aa2a', 'walter-pitts', 'queued', '현대 과학사 자료·구체 문헌 단서'),
  ('f36d2877-8736-4425-a4fc-a0181362d170', 'frank-rosenblatt', 'queued', '현대 과학사 자료·구체 문헌 단서'),
  ('ca5fdbff-2691-402d-84e6-b1cbfcc93ab4', 'jay-z', 'queued', '대중 인물·추천 도서 단서 다수'),
  ('5b9b4dbd-d042-4b3e-8d70-dea9d735e2ba', 'kevin-systrom', 'queued', '현대 기업가·도서와 게임 단서'),
  ('4be4e058-f50a-4d85-8ef5-1abeb2a8d630', 'ben-mann', 'queued', '현대 AI 기업가·추천 도서 단서 다수'),
  ('96c3aabc-e0c2-4841-b98a-261bd784727f', 'soumith-chintala', 'queued', '현대 과학자·도서와 팟캐스트 단서'),
  ('b549154a-cd42-468c-8f97-a2cdc4df2eae', 'steve-huffman', 'queued', '현대 기업가·추천 도서 단서'),
  ('ef117e5d-e66c-433b-bc40-1874ee7b5f0b', 'jeremy-stoppelman', 'queued', '현대 기업가·장문 인터뷰 가능성'),
  ('caf8758f-93d8-4cf9-bf84-1d98ace8a91f', 'noam-brown', 'queued', '현대 과학자·게임 직접 사용 단서'),
  ('678706f0-ce30-42b1-b500-3bc7924a2be9', 'olga-russakovsky', 'queued', '현대 과학자·도서와 영상 단서 다수'),
  ('e39f86e0-450d-4918-80db-bdd7d3fd0ca0', 'lilian-weng', 'queued', '현대 과학자·개인 독서 단서'),
  ('419bf1bd-25ef-413d-8a84-9f6266f91421', 'jonathan-abrams', 'queued', '현대 기업가·만화 선호 단서'),
  ('21ad5515-a3d3-45b6-9454-a4fc3e4fc670', 'emmett-shear', 'queued', '현대 기업가·독서 목록 단서 다수'),
  ('29d102fb-df01-445a-832e-1b201d1e8e49', 'young-sam-kim', 'queued', '현대 기업가·과학 도서 단서'),
  ('6e46b7f1-e933-46a8-b5de-e54f3803ea21', 'dom-hofmann', 'queued', '현대 기업가·게임과 도서 단서 다수'),
  ('269ce131-568b-48a8-ab40-02e2f0189b4e', 'meg-whitman', 'queued', '현대 기업가·추천 도서 단서 다수'),
  ('11aa71ce-e16a-4268-9416-f8a449bf72f5', 'park-tae-hoon', 'queued', '현대 콘텐츠 기업가·영상 선호 단서'),
  ('b4c8cc0f-df5a-456e-9eec-5e87e2810fac', 'jay-graber', 'queued', '현대 기업가·구체 독서 경험 단서'),

  -- 본인 산출물·사후 기록·일반 교육 유추만 보여 우선순위를 보류한다.
  ('cc5eda96-b662-4972-9d6d-c18409533b70', 'zhao-gao', 'deferred', '본인 편찬 문자 교재만 확인'),
  ('44e4413d-482a-4539-bdaf-24ce1c666e2e', 'jochi', 'deferred', '사후 편찬 몽골비사만 확인'),
  ('9f20ea51-9903-4582-8f1d-f1b682c9302f', 'jean-de-dieu-soult', 'deferred', '비정형 종교·미술 단서만 확인'),
  ('f09e00a2-ba90-4466-9da9-cdba4d54413e', 'louis-alexandre-berthier', 'deferred', '본인 원정 보고만 확인'),
  ('94bd8c7d-6894-451a-a675-cabf9841fda0', 'xiaohua-zhai', 'deferred', '본인 연구 산출물만 확인'),
  ('21c5feb7-a239-48c5-b0f5-be2bf07cefe3', 'jebe', 'deferred', '사후 편찬 몽골비사만 확인'),
  ('da718a03-72e5-442e-8303-59cd35c9863f', 'josephine-de-beauharnais', 'deferred', '후원·정원 도록 단서만 확인'),
  ('5159796b-2401-4a6c-aa40-00c0e84d52e2', 'hephaestion', 'deferred', '마케도니아 교양 교육 유추만 확인'),
  ('d8607eb4-8152-4d15-b01f-a308cfdbb603', 'andre-massena', 'deferred', '본인 회고록만 확인'),
  ('1505d9ed-4557-4c98-a79c-209aaef3befc', 'jason-ginsberg', 'deferred', '본인 제품만 확인'),
  ('8946f179-e683-4e67-85ad-1696ec0b1c86', 'olympias', 'deferred', '마케도니아 교양 교육 유추만 확인'),
  ('e25d9a87-fe74-4f6b-a38a-35345e969133', 'hu-hai', 'deferred', '법가 교육 배경 유추만 확인'),
  ('2ec38e4d-65dd-467d-b2a5-d9b9e2ec0217', 'sebastien-bubeck', 'deferred', '본인 연구 보고서만 확인'),
  ('31b871af-ae46-4f08-a4fe-a0b56e4d0af8', 'lee-dong-hyung', 'deferred', '본인 저서만 확인'),
  ('232eb21d-4385-4559-b11b-94ce6d45cd97', 'parmenion', 'deferred', '마케도니아 교양 교육 유추만 확인'),
  ('8cc12a34-e897-4b3b-97c3-a9afb8c2d227', 'andrew-weinreich', 'deferred', '본인 팟캐스트만 확인'),
  ('85f2c5c1-00ef-4e1f-a9e7-ddf4a79356ed', 'jason-wei', 'deferred', '본인 글만 확인'),
  ('1b6cb592-afe6-4063-93a6-171f1c621064', 'jeon-je-wan', 'deferred', '본인 저술·사업 행적만 확인'),
  ('a03f65cc-4aa5-4aa4-a088-20a8d8c9ef3d', 'michel-ney', 'deferred', '본인 군사 저술·회고록만 확인'),
  ('52fa564c-696f-465b-9b5a-89dab5608b43', 'rob-fergus', 'deferred', '본인 연구 논문만 확인'),
  ('6a9b4749-22aa-4237-8bdd-65bf41013b87', 'seo-su-gil', 'deferred', '자기 회사 게임 사업 단서만 확인'),
  ('7cdad2b4-d534-4b78-a95b-0a2572a05fb8', 'alexander-kolesnikov', 'deferred', '본인·업무 연구 논문만 확인'),
  ('70e397c6-94f2-407e-a5f7-3be5adab8861', 'andrew-tulloch', 'deferred', '본인 기술·저술만 확인'),
  ('04704dc7-44b5-448a-92f6-5d14b660c4c2', 'jiahui-yu', 'deferred', '본인 연구 모델만 확인'),
  ('9eeee21e-d8a7-4278-a54a-12bee9177edf', 'lee-jay-hyun', 'deferred', '본인이 투자·제작한 영화만 확인'),
  ('1d82022d-23f0-489d-9258-ea41b0dc940d', 'jeffrey-katzenberg', 'deferred', '본인이 제작한 영화와 사내 메모만 확인'),
  ('08691687-3510-4d43-ac88-82539f67c048', 'hongyu-ren', 'deferred', '연구 주제에서 역산한 도서 단서만 확인');

DO $$
DECLARE
  affected integer;
  wrong_count integer;
BEGIN
  SELECT count(*) INTO wrong_count
  FROM inactive_target_triage_decisions;

  IF wrong_count <> 69 THEN
    RAISE EXCEPTION '비활성 명시 작품 선별표가 69명이 아닙니다. 실제=%', wrong_count;
  END IF;

  SELECT count(*) INTO wrong_count
  FROM inactive_target_triage_decisions
  WHERE next_status = 'queued';

  IF wrong_count <> 42 THEN
    RAISE EXCEPTION '비활성 명시 작품 queued가 42명이 아닙니다. 실제=%', wrong_count;
  END IF;

  SELECT count(*) INTO wrong_count
  FROM inactive_target_triage_decisions
  WHERE next_status = 'deferred';

  IF wrong_count <> 27 THEN
    RAISE EXCEPTION '비활성 명시 작품 deferred가 27명이 아닙니다. 실제=%', wrong_count;
  END IF;

  -- 69명 모두 여전히 조사 전 기준선인지 확인한다.
  SELECT count(*)
  INTO wrong_count
  FROM inactive_target_triage_decisions d
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
     OR NOT (
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
    RAISE EXCEPTION '비활성 명시 작품 69명의 기준선이 달라졌습니다. 차이=%', wrong_count;
  END IF;

  UPDATE public.profiles p
  SET content_research_status = d.next_status
  FROM inactive_target_triage_decisions d
  WHERE p.id = d.id
    AND p.profile_type = 'CELEB'
    AND p.celeb_tier = 'light'
    AND p.status = 'inactive'
    AND p.content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 69 THEN
    RAISE EXCEPTION '비활성 명시 작품 상태 변경 행 수가 69가 아닙니다. 실제=%', affected;
  END IF;

  -- 선별은 조사 완료가 아니므로 -1·tier·콘텐츠를 만들지 않는다.
  SELECT count(*)
  INTO wrong_count
  FROM inactive_target_triage_decisions d
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
    RAISE EXCEPTION '비활성 명시 작품 선별 후 상태 불변식 위반 인물=%', wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM inactive_target_triage_decisions d
    JOIN public.profiles p
      ON p.id = d.id
    WHERE p.content_research_status = 'confirmed_empty'
  ) THEN
    RAISE EXCEPTION '빠른 선별에서 confirmed_empty가 생성됐습니다.';
  END IF;
END;
$$;

COMMIT;
