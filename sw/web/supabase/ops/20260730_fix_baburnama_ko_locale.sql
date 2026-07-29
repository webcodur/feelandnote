-- 자한기르 스캐폴딩에서 드러난 『바부르나마』 KO 판본 메타 결측을 네이버 도서 값으로 보완한다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_content_id constant text := '5923f1c2-8960-4d42-85ee-f784f783a85a';
  affected integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales en
      ON en.content_id = c.id AND en.locale = 'en'
    WHERE c.id = target_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9780375761379'
      AND c.user_count = 2
      AND en.title = 'The Baburnama'
      AND en.isbn = '9780375761379'
      AND en.verified = true
  ) THEN
    RAISE EXCEPTION '바부르나마 콘텐츠 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.content_locales
  SET
    thumbnail_url = 'https://shopping-phinf.pstatic.net/main_3248199/32481990859.20220520122419.jpg',
    isbn = '9780375761379',
    publisher = 'Modern Library',
    sources = jsonb_build_object(
      'primary', 'naver_book',
      'url', 'https://search.shopping.naver.com/book/catalog/32481990859',
      'thumbnail', 'naver_book',
      'titlePolicy', 'ko_translation'
    ),
    verified = true,
    updated_at = now()
  WHERE content_id = target_content_id
    AND locale = 'ko'
    AND title = '바부르나마'
    AND creator = '바부르'
    AND thumbnail_url IS NULL
    AND isbn IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '바부르나마 KO locale 보완 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;
END;
$$;

COMMIT;
