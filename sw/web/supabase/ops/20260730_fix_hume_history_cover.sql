-- 기존 흄 《The History of England》 locale 2행에 잘못 붙은 기번 《로마 제국 쇠망사》 표지를 교정한다.
-- 육안 검수한 OpenLibrary OL32761335M 판본으로 ko/en 판본 메타를 함께 맞춘다.

BEGIN;

DO $$
DECLARE
  target_content_id constant text := 'e1eced02-da9a-44bf-8a6a-4feb85a4db85';
  affected integer;
BEGIN
  IF (
    SELECT count(*)
    FROM public.content_locales cl
    WHERE cl.content_id = target_content_id
      AND (
        (
          cl.locale = 'ko'
          AND cl.title = '영국사'
          AND cl.creator = '데이비드 흄'
          AND cl.isbn = '9780344167232'
          AND cl.publisher = 'Creative Media Partners, LLC'
        )
        OR
        (
          cl.locale = 'en'
          AND cl.title = 'The History of England'
          AND cl.creator = 'David Hume'
          AND cl.isbn = '9780344167232'
          AND cl.publisher IS NULL
        )
      )
      AND cl.thumbnail_url = 'https://covers.openlibrary.org/b/id/5813575-L.jpg'
      AND cl.verified = true
  ) <> 2 THEN
    RAISE EXCEPTION '흄 《The History of England》 잘못된 표지 교정 전 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.content_locales cl
  SET
    thumbnail_url = 'https://covers.openlibrary.org/b/id/11387948-L.jpg',
    isbn = '9780353534254',
    publisher = 'Franklin Classics Trade Press',
    sources = jsonb_build_object(
      'primary', 'openlibrary',
      'thumbnail', 'openlibrary',
      'edition', 'OL32761335M',
      'work', 'OL93567W',
      'correction', '2026-07-30-wrong-gibbon-cover',
      'titlePolicy', CASE
        WHEN cl.locale = 'ko' THEN 'manual-ko-translation'
        ELSE 'source-title'
      END
    ),
    updated_at = now()
  WHERE cl.content_id = target_content_id
    AND cl.locale IN ('ko', 'en')
    AND cl.thumbnail_url = 'https://covers.openlibrary.org/b/id/5813575-L.jpg';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION '흄 《The History of England》 locale 교정 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  IF (
    SELECT count(*) FROM public.content_locales cl
    WHERE cl.content_id = target_content_id
      AND cl.locale IN ('ko', 'en')
      AND cl.thumbnail_url = 'https://covers.openlibrary.org/b/id/11387948-L.jpg'
      AND cl.isbn = '9780353534254'
      AND cl.publisher = 'Franklin Classics Trade Press'
      AND cl.sources ->> 'edition' = 'OL32761335M'
      AND cl.verified = true
  ) <> 2 THEN
    RAISE EXCEPTION '흄 《The History of England》 locale 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
