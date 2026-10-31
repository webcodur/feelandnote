-- Celebrity records have no per-record privacy setting. Publication belongs to celebs.
-- Keep the fixed public field compatible with deployed readers and shared member DTOs.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

LOCK TABLE public.celeb_contents IN ACCESS EXCLUSIVE MODE;

UPDATE public.celeb_contents
SET visibility = 'public'
WHERE visibility IS DISTINCT FROM 'public';

ALTER TABLE public.celeb_contents
  ALTER COLUMN visibility SET DEFAULT 'public'::public.visibility_type,
  ALTER COLUMN visibility SET NOT NULL,
  ADD CONSTRAINT celeb_contents_visibility_public_check
    CHECK (visibility = 'public'::public.visibility_type);

COMMIT;
