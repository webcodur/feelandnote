-- 루이 16세 Remotion 자원 동기화가 드러낸 기존 《The History of England》의 ko locale 결측을 보완한다.
-- 영문판 ISBN 9780344167232의 OpenLibrary 판본 메타를 한국어 표시명으로 등록한다.

BEGIN;

DO $$
DECLARE
  target_content_id constant text := 'e1eced02-da9a-44bf-8a6a-4feb85a4db85';
  affected integer;
BEGIN
  IF (
    SELECT count(*)
    FROM public.contents c
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = target_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9781379442363'
      AND c.user_count = 2
      AND en.title = 'The History of England'
      AND en.creator = 'David Hume'
      AND en.isbn = '9780344167232'
      AND en.thumbnail_url = 'https://covers.openlibrary.org/b/id/5813575-L.jpg'
      AND en.verified = true
      AND NOT EXISTS (
        SELECT 1 FROM public.content_locales ko
        WHERE ko.content_id = c.id AND ko.locale = 'ko'
      )
  ) <> 1 THEN
    RAISE EXCEPTION '흄 《The History of England》 ko locale 보완 전 기준선이 달라졌습니다.';
  END IF;

  INSERT INTO public.content_locales (
    content_id, locale, title, creator, thumbnail_url, description,
    isbn, publisher, sources, verified
  ) VALUES (
    target_content_id,
    'ko',
    '영국사',
    '데이비드 흄',
    'https://covers.openlibrary.org/b/id/5813575-L.jpg',
    '율리우스 카이사르의 침공부터 1688년 명예혁명까지 영국사를 서술한 데이비드 흄의 역사서다.',
    '9780344167232',
    'Creative Media Partners, LLC',
    jsonb_build_object(
      'primary', 'openlibrary',
      'thumbnail', 'openlibrary',
      'edition', 'OL39040948M',
      'titlePolicy', 'manual-ko-translation',
      'correction', '2026-07-30-missing-ko-locale'
    ),
    true
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '흄 《The History of England》 ko locale 생성 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.content_locales ko
    WHERE ko.content_id = target_content_id
      AND ko.locale = 'ko'
      AND ko.title = '영국사'
      AND ko.creator = '데이비드 흄'
      AND ko.isbn = '9780344167232'
      AND ko.publisher = 'Creative Media Partners, LLC'
      AND ko.thumbnail_url = 'https://covers.openlibrary.org/b/id/5813575-L.jpg'
      AND ko.verified = true
  ) THEN
    RAISE EXCEPTION '흄 《The History of England》 ko locale 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
