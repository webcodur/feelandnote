-- Person guides have no separate publication state.
-- Deploy the callers without published_at before applying this migration.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

drop trigger trg_sync_celeb_explanation_publication_from_celebs on public.celebs;
drop trigger trg_lock_celeb_explanation_publication_status on public.celebs;
drop trigger trg_lock_celeb_explanation_publication_write on public.celeb_explanations;
drop trigger trg_set_celeb_explanation_published_at on public.celeb_explanations;

drop function public.sync_celeb_explanation_publication_from_celebs();
drop function public.lock_celeb_explanation_publication_writes();
drop function public.set_celeb_explanation_published_at();

drop policy "Public can view published celeb explanations" on public.celeb_explanations;
create policy "Public can view celeb explanations" on public.celeb_explanations
  for select to anon, authenticated using (true);

alter table public.celeb_explanations drop column published_at;

notify pgrst, 'reload schema';
commit;
