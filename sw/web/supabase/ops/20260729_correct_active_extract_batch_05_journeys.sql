-- 활성 + 감상여정 비정형 작품명 추출군 마지막 81~84번의 조사 결과로 감상여정을 교정한다.
--
-- 네 명 모두 장르·교육·본인 창작·경기 영상만 확인되고 작품명과 서비스 식별자가 없다.
-- 표적 검증 단계이므로 confirmed_empty로 닫지 않고 light/open/0을 유지한다.

BEGIN;

DO $$
DECLARE
  affected integer;
  wrong_count integer;
BEGIN
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('dbdcf637-9702-4f7b-ba3b-a12b497bf389'::uuid, '666480b451fd977fb2dc01918ae45c09', '1cd2db757780a55e562a1ae885ef570e'),
      ('e84f807f-a260-4030-a1bc-ab09d1411734'::uuid, '5e5fab586c823d4ab162a3c6fe63e535', 'b4215a82c5c43424f7450ebc3b19257f'),
      ('f57123c0-7c40-4c1c-b46a-95593da4c579'::uuid, '78f62152951432742ef0322edaae007b', '2c6d2c43c1b2603de92eb4bf94add086'),
      ('fcf8e269-81f5-4673-bf5b-9ed9c5eb4db0'::uuid, 'cdee697d0a003f5d1cb06f0c1e335ee1', '81bf93d3a5174be89c668a87b623a8f9')
  ) AS expected(id, ko_md5, en_md5)
  LEFT JOIN public.profiles p ON p.id = expected.id
  WHERE p.id IS NULL
     OR p.profile_type IS DISTINCT FROM 'CELEB'
     OR p.status IS DISTINCT FROM 'active'
     OR p.celeb_tier IS DISTINCT FROM 'light'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR md5(p.cultural_journey) IS DISTINCT FROM expected.ko_md5
     OR md5(p.cultural_journey_en) IS DISTINCT FROM expected.en_md5
     OR EXISTS (
       SELECT 1
       FROM public.user_contents uc
       WHERE uc.user_id = expected.id
     );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '비정형 5차 4명의 본문·상태·0건 기준선이 달라졌습니다. 차이=%',
      wrong_count;
  END IF;

  WITH corrections(id, ko, en) AS (
    VALUES
      (
        'dbdcf637-9702-4f7b-ba3b-a12b497bf389'::uuid,
        $ko$알 카밀이 학자들과 법학·문법을 토론하고 의학·천문학·수피 사상에 관심을 보였다는 전승은 대화를 통한 학습 태도를 보여준다. 종교 시가를 즐겼다는 기록도 장르 수준에 머물며 작품명은 전하지 않는다.

1219년 아시시의 프란치스코를 만난 일과 프리드리히 2세와의 협상은 정치·종교적 대화의 사건이다. 특정 책·시·공연 감상이 확인되지 않아 light/open/0을 유지한다.$ko$,
        $en$Traditions that Al-Kamil debated law and grammar with scholars and took interest in medicine, astronomy, and Sufi thought describe learning through conversation. Reports that he enjoyed religious poetry remain at genre level and preserve no title.

His 1219 meeting with Francis of Assisi and negotiations with Frederick II were political and religious encounters. No particular book, poem, or performance is identified, so the profile remains light/open/0.$en$
      ),
      (
        'e84f807f-a260-4030-a1bc-ab09d1411734'::uuid,
        $ko$상관완아는 어머니에게 시문과 고전 교양을 배우고 궁정에서 조서 작성과 시회 운영을 맡았다. 경전 전고를 구사했다는 사실은 폭넓은 교육을 보여주지만, 읽은 개별 경전이나 시집의 제목을 특정하지 않는다.

현전 시와 궁정 문학 활동은 상관완아 자신의 창작·평가 행위이므로 소비 콘텐츠에서 제외한다. 외부 작품 감상이 확인되지 않아 light/open/0을 유지한다.$ko$,
        $en$Shangguan Wan'er received education in poetry, prose, and the classics from her mother and later drafted edicts and managed court literary gatherings. Her command of classical allusion shows broad learning but does not identify an individual scripture or poetry collection she read.

Her surviving poems and court literary activity are her own creation and criticism, so they are excluded from consumption content. No external work clears the evidence threshold, leaving the profile light/open/0.$en$
      ),
      (
        'f57123c0-7c40-4c1c-b46a-95593da4c579'::uuid,
        $ko$이운재의 페널티킥 대응법과 2002년 스페인전, 은퇴 후 해설은 선수·해설자 경력과 본인 발언이다.

기존 감상여정에는 외부 책·영화·음악이나 식별 가능한 방송 작품이 없다. 자기 경기와 축구 철학을 콘텐츠로 만들지 않고 light/open/0을 유지한다.$ko$,
        $en$Lee Woon-jae's approach to penalty kicks, the 2002 match against Spain, and his later work as an analyst belong to his playing and broadcasting career and to his own remarks.

The profile identifies no external book, film, music, or resolvable broadcast work. His own games and football philosophy are not registered as content, so the profile remains light/open/0.$en$
      ),
      (
        'fcf8e269-81f5-4673-bf5b-9ed9c5eb4db0'::uuid,
        $ko$박세리가 낸시 로페즈의 경기와 스윙을 본보기로 삼았다는 서술은 스포츠 롤 모델과 훈련 영상의 관계다. 어느 경기·방송을 보았는지 정식 제목과 식별자는 확인되지 않는다.

박인비·신지애·고진영의 경기를 본다는 말도 일반 시청 취향이며, 박세리 자신의 경기와 훈련은 소비 콘텐츠가 아니다. 이름 있는 작품이 없어 light/open/0을 유지한다.$ko$,
        $en$The account of Se Ri Pak treating Nancy Lopez's play and swing as a model describes a sporting role model and training footage. No official title or identifier establishes which match or broadcast she watched.

Her general interest in rounds played by Inbee Park, Shin Ji-yai, and Ko Jin-young is likewise a viewing preference, while Pak's own games and training are not consumption content. With no identifiable work, the profile remains light/open/0.$en$
      )
  )
  UPDATE public.profiles p
  SET consumption_philosophy = corrections.ko,
      consumption_philosophy_en = corrections.en
  FROM corrections
  WHERE p.id = corrections.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION
      '비정형 5차 감상여정 교정 행 수가 4가 아닙니다. 실제=%',
      affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('dbdcf637-9702-4f7b-ba3b-a12b497bf389'::uuid),
      ('e84f807f-a260-4030-a1bc-ab09d1411734'::uuid),
      ('f57123c0-7c40-4c1c-b46a-95593da4c579'::uuid),
      ('fcf8e269-81f5-4673-bf5b-9ed9c5eb4db0'::uuid)
  ) AS expected(id)
  JOIN public.profiles p ON p.id = expected.id
  WHERE p.celeb_tier IS DISTINCT FROM 'light'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR NULLIF(btrim(p.cultural_journey), '') IS NULL
     OR NULLIF(btrim(p.cultural_journey_en), '') IS NULL
     OR EXISTS (
       SELECT 1
       FROM public.user_contents uc
       WHERE uc.user_id = expected.id
     );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '비정형 5차 교정 후 light/open/0·감상여정 검증 실패 인물=%',
      wrong_count;
  END IF;
END;
$$;

COMMIT;
