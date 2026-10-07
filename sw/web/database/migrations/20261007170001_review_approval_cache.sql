BEGIN;
CREATE FUNCTION public.revalidate_approved_review_selection() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE changed boolean;
BEGIN
  IF TG_OP='UPDATE' THEN
    SELECT EXISTS(SELECT 1 FROM new_review_rows n JOIN old_review_rows o USING(id)
      WHERE n.review_approved_at IS DISTINCT FROM o.review_approved_at
        OR (n.review_approved_at IS NOT NULL AND ROW(n.visibility,n.is_spoiler,n.status) IS DISTINCT FROM ROW(o.visibility,o.is_spoiler,o.status))) INTO changed;
  ELSIF TG_OP='INSERT' THEN
    SELECT EXISTS(SELECT 1 FROM new_review_rows WHERE review_approved_at IS NOT NULL) INTO changed;
  ELSE
    SELECT EXISTS(SELECT 1 FROM old_review_rows WHERE review_approved_at IS NOT NULL) INTO changed;
  END IF;
  IF changed THEN PERFORM public.web_revalidate_send(ARRAY['celebs:featured-reviews']); END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER review_selection_revalidate_update AFTER UPDATE ON public.celeb_contents
REFERENCING OLD TABLE AS old_review_rows NEW TABLE AS new_review_rows
FOR EACH STATEMENT EXECUTE FUNCTION public.revalidate_approved_review_selection();
CREATE TRIGGER review_selection_revalidate_insert AFTER INSERT ON public.celeb_contents
REFERENCING NEW TABLE AS new_review_rows FOR EACH STATEMENT EXECUTE FUNCTION public.revalidate_approved_review_selection();
CREATE TRIGGER review_selection_revalidate_delete AFTER DELETE ON public.celeb_contents
REFERENCING OLD TABLE AS old_review_rows FOR EACH STATEMENT EXECUTE FUNCTION public.revalidate_approved_review_selection();
COMMIT;
