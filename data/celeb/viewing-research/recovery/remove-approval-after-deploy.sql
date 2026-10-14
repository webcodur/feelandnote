-- 승인 필드를 조회하지 않는 복구 코드의 운영 배포가 끝난 뒤 실행한다.
BEGIN;
SET LOCAL lock_timeout = '10s';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='celeb_contents' AND column_name='review_approved_at') THEN
    IF EXISTS (SELECT 1 FROM public.celeb_contents WHERE review_approved_at IS NOT NULL) THEN
      RAISE EXCEPTION '복구 이후 새 승인값이 생겼습니다. 해당 변경을 확인해야 합니다.';
    END IF;
  END IF;
END;
$$;
ALTER TABLE public.celeb_contents DROP COLUMN IF EXISTS review_approved_at;
NOTIFY pgrst, 'reload schema';
COMMIT;
