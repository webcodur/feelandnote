-- 활성 + 감상여정 명시 작품군 15명 파일럿의 통과분을 원자적으로 반영한다.
--
-- 실행 시점:
--   1. 20260729_add_celeb_content_research_status.sql 적용
--   2. web-bo / web 배포
--   3. 20260729_apply_positive_light_audit.sql 적용
--   4. 이 파일을 원격 DB에서 1회 실행
--
-- 결과:
--   - 신규 도서 2종과 ko/en locale 4행 등록
--   - 기존 도서 4종의 판본 메타데이터 보완
--   - 매직 존슨·일연·왕희지·쇼토쿠 태자에게 검증된 콘텐츠 6건 연결
--   - 네 사람을 light에서 full로 승격
--
-- 제외:
--   - 가의의 『시경』·『서경』은 『한서』 구문 오독으로 판명되어 등록하지 않는다.

BEGIN;

DO $$
DECLARE
  brighter_id text := gen_random_uuid()::text;
  srimala_id text := gen_random_uuid()::text;
  affected integer;
  wrong_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'content_research_status'
  ) THEN
    RAISE EXCEPTION
      'content_research_status가 없습니다. 스키마 마이그레이션을 먼저 적용하세요.';
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('860f68f6-c379-44b6-b01d-ae8a65220dcd'::uuid, 'magic-johnson', '매직 존슨'),
      ('fba8df3b-3213-4094-865e-a61ffaf579fc'::uuid, 'iryeon', '일연'),
      ('f3142de2-0b6a-4476-b0d8-ab5819397d17'::uuid, 'wang-xizhi', '왕희지'),
      ('d5e49754-ea1c-4486-b291-15cdf8d12f9e'::uuid, 'prince-shotoku', '쇼토쿠 태자')
  ) AS expected(id, slug, nickname)
  LEFT JOIN public.profiles p
    ON p.id = expected.id
  WHERE p.id IS NULL
     OR p.slug IS DISTINCT FROM expected.slug
     OR p.nickname IS DISTINCT FROM expected.nickname
     OR p.profile_type IS DISTINCT FROM 'CELEB'
     OR p.status IS DISTINCT FROM 'active'
     OR p.celeb_tier IS DISTINCT FROM 'light'
     OR p.content_research_status IS DISTINCT FROM 'open';

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '파일럿 통과자 4명의 id/slug/tier/research 기준선이 달라졌습니다. 차이=%',
      wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.user_contents
  WHERE user_id IN (
    '860f68f6-c379-44b6-b01d-ae8a65220dcd'::uuid,
    'fba8df3b-3213-4094-865e-a61ffaf579fc'::uuid,
    'f3142de2-0b6a-4476-b0d8-ab5819397d17'::uuid,
    'd5e49754-ea1c-4486-b291-15cdf8d12f9e'::uuid
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '파일럿 통과자에게 이미 콘텐츠가 생겼습니다. 현재 연결 수=%',
      wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.contents
  WHERE id IN (
    '467d387e-c688-43b0-8570-01df791de22b',
    '1704dbb6-82ba-4469-ad53-2e940dbad597',
    'dd29f2ad-fc98-4c9c-807c-4b7fe2bcf349',
    '37de0d2c-9c7c-4c1e-8211-230a42f4c0c9'
  );

  IF wrong_count <> 4 THEN
    RAISE EXCEPTION
      '재사용할 기존 콘텐츠 4종이 기준선과 다릅니다. 실제=%',
      wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents
    WHERE external_id IN ('9781538754610', '9791128868191')
  ) OR EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE isbn IN ('9781538754610', '9791128868191', '9781886439313')
  ) THEN
    RAISE EXCEPTION
      '신규 도서 ISBN이 이미 등록되어 있습니다. 중복 후보를 먼저 병합하세요.';
  END IF;

  INSERT INTO public.contents (
    id,
    type,
    release_date,
    external_source,
    external_id
  )
  VALUES
    (
      brighter_id,
      'BOOK',
      '2022-04-12',
      'openlibrary',
      '9781538754610'
    ),
    (
      srimala_id,
      'BOOK',
      NULL,
      'naver_book',
      '9791128868191'
    );

  INSERT INTO public.content_locales (
    content_id,
    locale,
    title,
    creator,
    thumbnail_url,
    isbn,
    publisher,
    sources,
    verified
  )
  VALUES
    (
      brighter_id,
      'ko',
      'Brighter by the Day',
      'Robin Roberts, Michelle Burford',
      'https://covers.openlibrary.org/b/id/12727304-L.jpg',
      '9781538754610',
      'Grand Central Publishing',
      '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      true
    ),
    (
      brighter_id,
      'en',
      'Brighter by the Day',
      'Robin Roberts, Michelle Burford',
      'https://covers.openlibrary.org/b/id/12727304-L.jpg',
      '9781538754610',
      'Grand Central Publishing',
      '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      true
    ),
    (
      srimala_id,
      'ko',
      '승만경',
      '미상',
      'https://shopping-phinf.pstatic.net/main_3764629/37646294619.20241109071237.jpg',
      '9791128868191',
      '지식을만드는지식',
      '{"primary":"naver_book","thumbnail":"naver_book"}'::jsonb,
      true
    ),
    (
      srimala_id,
      'en',
      'The Sutra of Queen Srimala of the Lion''s Roar',
      'Diana Y. Paul, John R. McRae',
      'https://covers.openlibrary.org/b/id/13210668-L.jpg',
      '9781886439313',
      'Numata Center for Buddhist Translation and Research',
      '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      true
    );

  -- 기존 네 작품도 이번 승격 감사에 필요한 범위에서 같은 에디션으로 맞춘다.
  UPDATE public.content_locales
  SET publisher = '현암사',
      thumbnail_url = 'https://shopping-phinf.pstatic.net/main_3246670/32466702841.20260331122637.jpg',
      sources = '{"primary":"naver_book","thumbnail":"naver_book"}'::jsonb,
      verified = true,
      updated_at = now()
  WHERE content_id = '1704dbb6-82ba-4469-ad53-2e940dbad597'
    AND locale = 'ko'
    AND isbn = '9788932308470';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '도덕경 ko locale 기준선이 다릅니다.';
  END IF;

  UPDATE public.content_locales
  SET publisher = 'Penguin Classics',
      thumbnail_url = 'https://covers.openlibrary.org/b/id/14572066-L.jpg',
      sources = '{"primary":"openlibrary","thumbnail":"openlibrary"}'::jsonb,
      verified = true,
      updated_at = now()
  WHERE content_id = '1704dbb6-82ba-4469-ad53-2e940dbad597'
    AND locale = 'en'
    AND isbn = '9780140441314';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Tao Te Ching en locale 기준선이 다릅니다.';
  END IF;

  UPDATE public.content_locales
  SET title = 'The Silla Annals of the Samguk Sagi',
      creator = 'Kim Pusik',
      isbn = '9788971058602',
      publisher = 'Academy of Korean Studies Press',
      thumbnail_url = 'https://shopping-phinf.pstatic.net/main_3246709/32467090754.20260331123706.jpg',
      sources = '{"primary":"naver_book","thumbnail":"naver_book"}'::jsonb,
      verified = true,
      updated_at = now()
  WHERE content_id = '467d387e-c688-43b0-8570-01df791de22b'
    AND locale = 'en'
    AND title = 'Samguk Sagi'
    AND isbn IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '삼국사기 en locale 기준선이 다릅니다.';
  END IF;

  UPDATE public.content_locales
  SET publisher = '불사리탑',
      thumbnail_url = 'https://shopping-phinf.pstatic.net/main_3244163/32441632162.20260331102031.jpg',
      sources = '{"primary":"naver_book","thumbnail":"naver_book"}'::jsonb,
      verified = true,
      updated_at = now()
  WHERE content_id = 'dd29f2ad-fc98-4c9c-807c-4b7fe2bcf349'
    AND locale = 'ko'
    AND isbn = '9788996899648';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '법화경 ko locale 기준선이 다릅니다.';
  END IF;

  UPDATE public.content_locales
  SET publisher = '운주사',
      thumbnail_url = 'https://shopping-phinf.pstatic.net/main_5581703/55817037900.20250718071657.jpg',
      sources = '{"primary":"naver_book","thumbnail":"naver_book"}'::jsonb,
      verified = true,
      updated_at = now()
  WHERE content_id = '37de0d2c-9c7c-4c1e-8211-230a42f4c0c9'
    AND locale = 'ko'
    AND isbn = '9788957468883';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '유마경 ko locale 기준선이 다릅니다.';
  END IF;

  INSERT INTO public.user_contents (
    user_id,
    content_id,
    status,
    review,
    review_en,
    source_url,
    is_recommended
  )
  VALUES
    (
      '860f68f6-c379-44b6-b01d-ae8a65220dcd'::uuid,
      brighter_id,
      'FINISHED',
      '매직 존슨은 2022년 4월 14일 자신의 X 계정에서 로빈 로버츠의 신간 『Brighter by the Day』를 “MUST READ”라고 부르며 공개 추천했다. 읽었다고 별도로 설명하지는 않았으므로, 직접 독서 단정이 아니라 명시적 추천 근거로 등록한다.',
      'On April 14, 2022, Magic Johnson publicly recommended Robin Roberts'' new book, *Brighter by the Day*, on his X account, calling it a “MUST READ.” The post does not separately say that he finished the book, so this entry records the explicit recommendation without overstating it as a reading claim.',
      'https://x.com/MagicJohnson/status/1514440754617221125',
      true
    ),
    (
      'fba8df3b-3213-4094-865e-a61ffaf579fc'::uuid,
      '467d387e-c688-43b0-8570-01df791de22b',
      'FINISHED',
      '『삼국유사』 「신충괘관」조에서 일연은 앞서 인용한 『삼국사기』의 기록과 별기의 내용이 다르다고 직접 대조했다. 후대의 영향 추정이 아니라 『삼국유사』를 편찬하면서 실제로 참조한 문헌이 본문에 남아 있다.',
      'In the “Sinchung Hangs Up His Cap” section of the *Samguk Yusa*, Iryeon directly compares a record he had cited from the *Samguk Sagi* with a different account. This is not a later claim of influence: the text itself preserves his use of the earlier chronicle while compiling his own work.',
      'https://db.history.go.kr/id/sy_005r_0030_0040_0020',
      false
    ),
    (
      'f3142de2-0b6a-4476-b0d8-ab5819397d17'::uuid,
      '1704dbb6-82ba-4469-ad53-2e940dbad597',
      'FINISHED',
      '『진서』 「왕희지전」은 산음의 도사가 『도덕경』을 써 주면 거위 떼를 주겠다고 하자 왕희지가 흔쾌히 전편을 써 주었다고 기록한다. 경전 전체를 직접 필사한 행위가 확인되므로 단순한 도교 영향 추정과 구별된다.',
      'The *Book of Jin* biography of Wang Xizhi records that a Daoist in Shanyin offered him a flock of geese in exchange for writing out the *Tao Te Ching*, and that Wang gladly completed the text. Copying the entire scripture is direct contact with the work, not a later inference from general Daoist influence.',
      'https://ctext.org/dictionary.pl?chapter=915967&if=gb&sid=1300&trid=3102769',
      false
    ),
    (
      'd5e49754-ea1c-4486-b291-15cdf8d12f9e'::uuid,
      'dd29f2ad-fc98-4c9c-807c-4b7fe2bcf349',
      'FINISHED',
      '하와이대학교 출판부의 쇼토쿠 태자 주석서 소개는 그가 궁정에서 『법화경』과 『승만경』을 강론했다고 정리한다. 경전 내용을 청중에게 풀어 설명한 전승이므로 단순한 불교 후원이나 후대의 사상적 영향보다 강한 감상 근거다.',
      'The University of Hawaiʻi Press account of Prince Shōtoku and his commentaries states that he lectured at court on both the *Lotus Sutra* and the *Srimala Sutra*. A tradition of public exposition provides substantially stronger evidence of direct engagement than general Buddhist patronage or later claims of influence.',
      'https://uhpress.hawaii.edu/title/prince-shotokus-commentary-on-the-srimala-sutra/',
      false
    ),
    (
      'd5e49754-ea1c-4486-b291-15cdf8d12f9e'::uuid,
      '37de0d2c-9c7c-4c1e-8211-230a42f4c0c9',
      'FINISHED',
      '일본 국립문화재기구 e-Museum은 쇼토쿠 태자의 『승만경의소』를 소개하면서 『유마경의소』도 태자의 삼경의소 가운데 하나로 전해진다고 명시한다. 다만 친저 여부는 논쟁적이므로, 직접 강론 전승이 있는 두 경전보다 한 단계 낮은 귀속 근거로 등록한다.',
      'The Japanese National Institutes for Cultural Heritage e-Museum identifies a commentary on the *Vimalakirti Sutra* as one of the three commentary works traditionally attributed to Prince Shōtoku. Because personal authorship remains disputed, this entry treats that attribution as weaker evidence than the court-lecture traditions for the other two sutras.',
      'https://emuseum.nich.go.jp/detail?content_base_id=100628&content_part_id=002&content_pict_id=0&langId=en',
      false
    ),
    (
      'd5e49754-ea1c-4486-b291-15cdf8d12f9e'::uuid,
      srimala_id,
      'FINISHED',
      '하와이대학교 출판부의 쇼토쿠 태자 주석서 소개는 그가 궁정에서 『승만경』을 강론하고 이 경전의 교리를 연구한 인물로 전해진다고 정리한다. 구체적인 경전명과 강론 행위가 함께 남아 있어 직접 감상의 근거가 분명하다.',
      'The University of Hawaiʻi Press account describes Prince Shōtoku as a student of Buddhist doctrine who lectured at court on the *Srimala Sutra*. The named scripture and the tradition of exposition provide clear evidence of direct engagement.',
      'https://uhpress.hawaii.edu/title/prince-shotokus-commentary-on-the-srimala-sutra/',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION
      '파일럿 user_contents 등록 수가 6건이 아닙니다. 실제=%',
      affected;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id IN (
    '860f68f6-c379-44b6-b01d-ae8a65220dcd'::uuid,
    'fba8df3b-3213-4094-865e-a61ffaf579fc'::uuid,
    'f3142de2-0b6a-4476-b0d8-ab5819397d17'::uuid,
    'd5e49754-ea1c-4486-b291-15cdf8d12f9e'::uuid
  )
    AND profile_type = 'CELEB'
    AND celeb_tier = 'light';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION
      '파일럿 full 승격 수가 4명이 아닙니다. 실제=%',
      affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('magic-johnson', 1),
      ('iryeon', 1),
      ('wang-xizhi', 1),
      ('prince-shotoku', 3)
  ) AS expected(slug, content_count)
  LEFT JOIN public.profiles p
    ON p.slug = expected.slug
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS content_count
    FROM public.user_contents uc
    WHERE uc.user_id = p.id
  ) actual ON true
  WHERE p.id IS NULL
     OR p.celeb_tier IS DISTINCT FROM 'full'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR actual.content_count IS DISTINCT FROM expected.content_count;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '파일럿 반영 후 tier/count/research 검증 실패. 차이=%',
      wrong_count;
  END IF;

  -- 기존 누적값이 이미 어긋난 콘텐츠도 있으므로, 이번 작업이 건드린
  -- 작품만 실제 user_contents 행 수로 다시 맞춘다.
  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer
    FROM public.user_contents uc
    WHERE uc.content_id = c.id
  )
  WHERE c.id = ANY (
    ARRAY[
      brighter_id,
      srimala_id,
      '467d387e-c688-43b0-8570-01df791de22b',
      '1704dbb6-82ba-4469-ad53-2e940dbad597',
      'dd29f2ad-fc98-4c9c-807c-4b7fe2bcf349',
      '37de0d2c-9c7c-4c1e-8211-230a42f4c0c9'
    ]::text[]
  )
    AND c.user_count IS DISTINCT FROM (
      SELECT count(*)::integer
      FROM public.user_contents uc
      WHERE uc.content_id = c.id
    );

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id = ANY (
      ARRAY[
        brighter_id,
        srimala_id,
        '467d387e-c688-43b0-8570-01df791de22b',
        '1704dbb6-82ba-4469-ad53-2e940dbad597',
        'dd29f2ad-fc98-4c9c-807c-4b7fe2bcf349',
        '37de0d2c-9c7c-4c1e-8211-230a42f4c0c9'
      ]::text[]
    )
      AND c.user_count IS DISTINCT FROM (
        SELECT count(*)::integer
        FROM public.user_contents uc
        WHERE uc.content_id = c.id
      )
  ) THEN
    RAISE EXCEPTION '파일럿 작품의 contents.user_count 정합성 검증 실패';
  END IF;

  IF (
    SELECT count(*)
    FROM public.content_locales
    WHERE content_id IN (brighter_id, srimala_id)
  ) <> 4 THEN
    RAISE EXCEPTION '신규 도서 2종의 ko/en locale 4행 검증 실패';
  END IF;
END;
$$;

COMMIT;
