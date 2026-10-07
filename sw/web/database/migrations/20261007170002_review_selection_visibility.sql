BEGIN;
CREATE FUNCTION public.revalidate_review_person_visibility() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.publication_status IS DISTINCT FROM OLD.publication_status
     AND EXISTS(SELECT 1 FROM public.celeb_contents WHERE celeb_id=NEW.id AND review_approved_at IS NOT NULL) THEN
    PERFORM public.web_revalidate_send(ARRAY['celebs:featured-reviews']);
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER review_person_visibility_revalidate AFTER UPDATE OF publication_status ON public.celebs
FOR EACH ROW EXECUTE FUNCTION public.revalidate_review_person_visibility();
COMMIT;
