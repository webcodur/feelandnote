BEGIN;

ALTER TABLE public.celeb_contents ADD COLUMN review_approved_at timestamptz;
COMMENT ON COLUMN public.celeb_contents.review_approved_at IS 'Current bilingual review, experience evidence and work identity passed editorial verification.';

CREATE FUNCTION public.guard_celeb_review_approval() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND ROW(NEW.celeb_id, NEW.content_id, NEW.review, NEW.review_en, NEW.source_url, NEW.status, NEW.is_spoiler)
     IS DISTINCT FROM ROW(OLD.celeb_id, OLD.content_id, OLD.review, OLD.review_en, OLD.source_url, OLD.status, OLD.is_spoiler) THEN
    NEW.review_approved_at := NULL;
  END IF;
  IF NEW.review_approved_at IS NOT NULL THEN
    IF (TG_OP = 'INSERT' OR NEW.review_approved_at IS DISTINCT FROM OLD.review_approved_at)
       AND current_user NOT IN ('postgres', 'service_role') THEN
      RAISE EXCEPTION 'Review approval requires the editorial service';
    END IF;
    IF NULLIF(btrim(NEW.review), '') IS NULL OR NULLIF(btrim(NEW.review_en), '') IS NULL
       OR NULLIF(btrim(NEW.source_url), '') IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.contents WHERE id = NEW.content_id AND type = 'BOOK') THEN
      RAISE EXCEPTION 'Review approval requires bilingual book review and experience source';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_celeb_review_approval BEFORE INSERT OR UPDATE ON public.celeb_contents
FOR EACH ROW EXECUTE FUNCTION public.guard_celeb_review_approval();

CREATE FUNCTION public.clear_book_review_approval_on_identity_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'contents' THEN
    IF NEW.type IS DISTINCT FROM OLD.type THEN
      UPDATE public.celeb_contents SET review_approved_at = NULL
      WHERE content_id = NEW.id AND review_approved_at IS NOT NULL;
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND ROW(NEW.content_id, NEW.locale, NEW.title, NEW.creator, NEW.isbn)
     IS NOT DISTINCT FROM ROW(OLD.content_id, OLD.locale, OLD.title, OLD.creator, OLD.isbn) THEN
    RETURN NEW;
  END IF;
  IF TG_OP <> 'INSERT' THEN
    UPDATE public.celeb_contents SET review_approved_at = NULL
    WHERE content_id = OLD.content_id AND review_approved_at IS NOT NULL;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    UPDATE public.celeb_contents SET review_approved_at = NULL
    WHERE content_id = NEW.content_id AND review_approved_at IS NOT NULL;
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER clear_book_review_approval_on_identity_change AFTER INSERT OR DELETE OR UPDATE ON public.content_locales
FOR EACH ROW EXECUTE FUNCTION public.clear_book_review_approval_on_identity_change();
CREATE TRIGGER clear_book_review_approval_on_type_change AFTER UPDATE OF type ON public.contents
FOR EACH ROW EXECUTE FUNCTION public.clear_book_review_approval_on_identity_change();

CREATE INDEX celeb_contents_approved_reviews_idx ON public.celeb_contents (review_approved_at DESC, id)
WHERE review_approved_at IS NOT NULL AND visibility = 'public';
NOTIFY pgrst, 'reload schema';
COMMIT;
