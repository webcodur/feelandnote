-- Spotify oEmbed가 반환한 CDN 별칭을 리소스 동기화 허용 목록에 있는 공식 i.scdn.co URL로 정규화한다.
-- 최초 실행 전에는 마지막 COMMIT을 ROLLBACK으로 바꾸어 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_content_id constant text := '03bb64c9-8584-4293-852d-8a238ec47cf9';
  old_url constant text := 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02fb5838dda3c1ff747f628879';
  new_url constant text := 'https://i.scdn.co/image/ab67616d00001e02fb5838dda3c1ff747f628879';
  affected integer;
BEGIN
  IF (
    SELECT count(*)
    FROM public.content_locales cl
    WHERE cl.content_id = target_content_id
      AND cl.locale IN ('ko', 'en')
      AND cl.thumbnail_url = old_url
  ) <> 2 THEN
    RAISE EXCEPTION '호레이쇼 넬슨 Spotify 표지 교정 전 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.content_locales
  SET thumbnail_url = new_url
  WHERE content_id = target_content_id
    AND locale IN ('ko', 'en')
    AND thumbnail_url = old_url;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION 'Spotify 표지 URL 교정 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  IF (
    SELECT count(*)
    FROM public.content_locales cl
    WHERE cl.content_id = target_content_id
      AND cl.locale IN ('ko', 'en')
      AND cl.thumbnail_url = new_url
  ) <> 2 THEN
    RAISE EXCEPTION 'Spotify 표지 URL 교정 후 검증에 실패했습니다.';
  END IF;
END
$$;

COMMIT;
