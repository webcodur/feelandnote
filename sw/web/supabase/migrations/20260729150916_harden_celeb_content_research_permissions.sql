-- Keep the automatic reopen trigger privileged, but prevent direct REST/RPC calls.
-- The function is invoked by trg_reopen_celeb_content_research_on_content only.
REVOKE ALL ON FUNCTION public.reopen_celeb_content_research_on_content()
  FROM PUBLIC, anon, authenticated;

-- Foreign-key lookup indexes are added before the ledger accumulates production data.
CREATE INDEX celeb_content_research_runs_researcher_id_idx
  ON public.celeb_content_research_runs (researcher_id)
  WHERE researcher_id IS NOT NULL;

CREATE INDEX celeb_content_research_findings_content_id_idx
  ON public.celeb_content_research_findings (content_id)
  WHERE content_id IS NOT NULL;
