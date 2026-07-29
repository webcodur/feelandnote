-- Spotify 공개 원본이 64×64뿐인 《Il Parnaso confuso》 표지를
-- 같은 2004년 Albany 전곡 음반의 Apple Music 1000×1000 배포본으로 교정한다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_content_id constant text := '117a0782-2d98-42f3-9430-10973a1eac08';
  old_thumbnail_url constant text :=
    'https://i.scdn.co/image/3cf476dde874abd90312b867e5c0a220d812b746';
  new_thumbnail_url constant text :=
    'https://is1-ssl.mzstatic.com/image/thumb/Music/f4/a3/21/mzi.etraftwy.jpg/1000x1000bb.webp';
  thumbnail_page_url constant text :=
    'https://music.apple.com/us/album/gluck-il-parnaso-confuso-first-recording/195110450';
  affected integer;
BEGIN
  IF (
    SELECT count(*)
    FROM public.content_locales cl
    WHERE cl.content_id = target_content_id
      AND cl.locale IN ('ko', 'en')
      AND cl.thumbnail_url = old_thumbnail_url
  ) <> 2 THEN
    RAISE EXCEPTION 'Il Parnaso confuso 표지 교정 전 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.content_locales cl
  SET
    thumbnail_url = new_thumbnail_url,
    sources = coalesce(cl.sources, '{}'::jsonb) || jsonb_build_object(
      'thumbnail', 'apple_music',
      'thumbnailPage', thumbnail_page_url
    )
  WHERE cl.content_id = target_content_id
    AND cl.locale IN ('ko', 'en')
    AND cl.thumbnail_url = old_thumbnail_url;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 2 THEN
    RAISE EXCEPTION 'Il Parnaso confuso 표지 교정 행 수가 2가 아닙니다. 실제=%', affected;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.content_locales cl
    WHERE cl.content_id = target_content_id
      AND cl.locale IN ('ko', 'en')
      AND (
        cl.thumbnail_url <> new_thumbnail_url
        OR cl.sources->>'thumbnail' <> 'apple_music'
        OR cl.sources->>'thumbnailPage' <> thumbnail_page_url
      )
  ) THEN
    RAISE EXCEPTION 'Il Parnaso confuso 표지 교정 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;
