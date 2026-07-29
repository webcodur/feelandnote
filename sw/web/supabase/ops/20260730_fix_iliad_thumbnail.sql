-- 투키디데스 리소스 검수 중 발견한 기존 『일리아스』 한국어 표지 오매칭을 교정한다.
-- 기존 URL은 헤시오도스 『신통기』 표지였고, ISBN 9788991290167 네이버 검색
-- 결과의 정확한 『일리아스』 판본(숲, 2015-06-20)으로 조건부 교체한다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_content_id constant text := 'a357d566-f0b3-49bf-9d12-78b694e0c006';
  old_thumbnail constant text := 'https://shopping-phinf.pstatic.net/main_3249629/32496299812.20230919125404.jpg';
  new_thumbnail constant text := 'https://shopping-phinf.pstatic.net/main_3243611/32436116403.20260331101555.jpg';
  affected integer;
BEGIN
  IF (
    SELECT count(*)
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    WHERE c.id = target_content_id
      AND c.type = 'BOOK'
      AND c.external_source = 'naver_book'
      AND c.external_id = '9788991290167'
      AND ko.title = '일리아스'
      AND ko.creator = '호메로스'
      AND ko.isbn = '9788991290167'
      AND ko.thumbnail_url = old_thumbnail
  ) <> 1 THEN
    RAISE EXCEPTION '일리아스 표지 교정 전 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.content_locales
  SET
    thumbnail_url = new_thumbnail,
    publisher = '숲',
    sources = coalesce(sources, '{}'::jsonb) || jsonb_build_object(
      'primary', 'naver_book',
      'thumbnail', 'naver_book',
      'catalogId', '32436116403',
      'url', 'https://search.shopping.naver.com/book/catalog/32436116403'
    ),
    verified = true
  WHERE content_id = target_content_id
    AND locale = 'ko'
    AND thumbnail_url = old_thumbnail;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '일리아스 한국어 locale 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents
  SET
    release_date = '2015-06-20',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'publisher', '숲',
      'naverCatalogId', '32436116403'
    )
  WHERE id = target_content_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '일리아스 contents 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    WHERE c.id = target_content_id
      AND c.release_date = '2015-06-20'
      AND c.metadata->>'publisher' = '숲'
      AND c.metadata->>'naverCatalogId' = '32436116403'
      AND ko.thumbnail_url = new_thumbnail
      AND ko.publisher = '숲'
      AND ko.sources->>'catalogId' = '32436116403'
      AND ko.verified = true
  ) THEN
    RAISE EXCEPTION '일리아스 표지·메타데이터 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
