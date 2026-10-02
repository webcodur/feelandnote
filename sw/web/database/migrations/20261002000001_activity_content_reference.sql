-- Activity history survives a deleted work; current card references must exist.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public.activity_logs
  ADD CONSTRAINT activity_logs_content_id_fkey
  FOREIGN KEY (content_id) REFERENCES public.contents(id)
  ON DELETE SET NULL NOT VALID;
ALTER TABLE public.activity_logs
  VALIDATE CONSTRAINT activity_logs_content_id_fkey;
COMMIT;
