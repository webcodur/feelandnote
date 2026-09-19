-- Publication is explicit through published_at. Keep all existing text and
-- publication timestamps; an inactive celeb cannot expose an explanation.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('feelandnote.celeb_explanation.publication', 0)
);

create or replace function public.set_celeb_explanation_published_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_publication_status text;
begin
  if tg_op not in ('INSERT', 'UPDATE')
     or tg_table_schema <> 'public'
     or tg_table_name <> 'celeb_explanations' then
    raise exception 'set_celeb_explanation_published_at called from an unsupported trigger';
  end if;

  select celeb.publication_status into v_publication_status
  from public.celebs as celeb
  where celeb.id = new.profile_id
  for share;

  if not found then
    raise exception using errcode = '23503',
      message = pg_catalog.format(
        'celeb_explanations.profile_id %s does not reference public.celebs', new.profile_id
      );
  end if;

  if v_publication_status <> 'active' then
    new.published_at := null;
  end if;
  return new;
end;
$function$;

create or replace function public.sync_celeb_explanation_publication_from_celebs()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
begin
  if tg_op <> 'UPDATE' or tg_table_schema <> 'public' or tg_table_name <> 'celebs' then
    raise exception 'sync_celeb_explanation_publication_from_celebs called from an unsupported trigger';
  end if;

  update public.celeb_explanations as explanation
  set published_at = null
  from new_rows as new_celeb
  join old_rows as old_celeb on old_celeb.id = new_celeb.id
  where explanation.profile_id = new_celeb.id
    and old_celeb.publication_status is distinct from new_celeb.publication_status
    and new_celeb.publication_status <> 'active'
    and explanation.published_at is not null;

  return null;
end;
$function$;

drop trigger trg_lock_celeb_explanation_publication_write on public.celeb_explanations;
drop trigger trg_set_celeb_explanation_published_at on public.celeb_explanations;

alter table public.celeb_explanations drop column review_status;

create trigger trg_lock_celeb_explanation_publication_write
before insert or update of profile_id, published_at on public.celeb_explanations
for each statement execute function public.lock_celeb_explanation_publication_writes();

create trigger trg_set_celeb_explanation_published_at
before insert or update of profile_id, published_at on public.celeb_explanations
for each row execute function public.set_celeb_explanation_published_at();

comment on column public.celeb_explanations.published_at is
  'Explicit publication timestamp. NULL is unpublished; only active celebs may publish.';

notify pgrst, 'reload schema';
commit;
