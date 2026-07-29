-- 헤로도토스 리소스 검수 중 발견한 기존 『오뒷세이아』 한국어 표지 오매칭을 교정한다.
-- 기존 네이버 이미지 URL은 책이 아닌 선풍기 상품 사진을 반환하므로, 같은 ISBN
-- 9788991290150의 숲 2015 개정판을 확인할 수 있는 YES24 원본으로 조건부 교체한다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_content_id constant text := '7dac869b-c4b0-4473-88e0-1ca0156ad850';
  old_thumbnail constant text := 'https://shopping-phinf.pstatic.net/main_3245366/32453662193.jpg';
  new_thumbnail constant text := 'https://image.yes24.com/goods/2148271/xl';
  thumbnail_page_url constant text := 'https://www.yes24.com/Product/Goods/2148271';
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
      AND c.external_id = '9788991290150'
      AND ko.title = '오뒷세이아'
      AND ko.creator = '호메로스'
      AND ko.isbn = '9788991290150'
      AND ko.thumbnail_url = old_thumbnail
  ) <> 1 THEN
    RAISE EXCEPTION '오뒷세이아 표지 교정 전 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.content_locales
  SET
    thumbnail_url = new_thumbnail,
    publisher = '숲',
    sources = coalesce(sources, '{}'::jsonb) || jsonb_build_object(
      'primary', 'naver_book',
      'thumbnail', 'yes24',
      'thumbnailPage', thumbnail_page_url
    ),
    verified = true
  WHERE content_id = target_content_id
    AND locale = 'ko'
    AND thumbnail_url = old_thumbnail;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '오뒷세이아 한국어 locale 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents
  SET
    release_date = '2015-09-10',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'publisher', '숲'
    )
  WHERE id = target_content_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '오뒷세이아 contents 교정 행 수가 1이 아닙니다. 실제=%', affected;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contents c
    JOIN public.content_locales ko
      ON ko.content_id = c.id AND ko.locale = 'ko'
    WHERE c.id = target_content_id
      AND c.release_date = '2015-09-10'
      AND c.metadata->>'publisher' = '숲'
      AND ko.thumbnail_url = new_thumbnail
      AND ko.publisher = '숲'
      AND ko.sources->>'thumbnail' = 'yes24'
      AND ko.sources->>'thumbnailPage' = thumbnail_page_url
      AND ko.verified = true
  ) THEN
    RAISE EXCEPTION '오뒷세이아 표지·메타데이터 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
