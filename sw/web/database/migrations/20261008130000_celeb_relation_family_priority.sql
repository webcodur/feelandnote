-- Family types generated from shared/constants/celeb-relations.ts.
-- Preserve family facts and reject subsidiary social facts for the same pair.
begin;
create or replace function public.guard_celeb_relation_axes()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare swap_id uuid; from_qid text; to_qid text; family_pair boolean;
begin
  if new.rel_type not in ('influence', 'influenced', 'colleague', 'rival') then
    raise exception 'celeb relations accept only influence, influenced, colleague, rival' using errcode = '23514';
  end if;
  if tg_table_name = 'celeb_relations' then
    if new.from_id = new.to_id then raise exception 'self relation is not allowed' using errcode = '23514'; end if;
    select wikidata_qid into from_qid from public.celebs where id = new.from_id;
    select wikidata_qid into to_qid from public.celebs where id = new.to_id;
    select exists (
      select 1 from public.celeb_relations r
      where ((r.from_id = new.from_id and r.to_id = new.to_id) or (r.from_id = new.to_id and r.to_id = new.from_id))
        and (r.rel_group = 'family' or r.rel_type in ('father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative'))
    ) or exists (
      select 1 from public.celeb_relations_external r
      where ((r.from_id = new.from_id and r.qid = to_qid) or (r.from_id = new.to_id and r.qid = from_qid))
        and (r.rel_group = 'family' or r.rel_type in ('father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative'))
    ) into family_pair;
    if new.rel_type = 'influenced' then
      swap_id := new.from_id; new.from_id := new.to_id; new.to_id := swap_id; new.rel_type := 'influence';
    elsif new.rel_type in ('colleague', 'rival') and new.from_id > new.to_id then
      swap_id := new.from_id; new.from_id := new.to_id; new.to_id := swap_id;
    end if;
  else
    select wikidata_qid into from_qid from public.celebs where id = new.from_id;
    select exists (
      select 1 from public.celeb_relations_external r
      where ((r.from_id = new.from_id and r.qid = new.qid)
        or (r.qid = from_qid and exists (
          select 1 from public.celebs c where c.id = r.from_id and c.wikidata_qid = new.qid
        )))
        and (r.rel_group = 'family' or r.rel_type in ('father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative'))
    ) or exists (
      select 1 from public.celeb_relations r join public.celebs c
        on c.id = case when r.from_id = new.from_id then r.to_id else r.from_id end
      where (r.from_id = new.from_id or r.to_id = new.from_id) and c.wikidata_qid = new.qid
        and (r.rel_group = 'family' or r.rel_type in ('father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative'))
    ) into family_pair;
  end if;
  if family_pair then raise exception 'family pair cannot have subsidiary social relations' using errcode = '23514'; end if;
  new.rel_group := case new.rel_type when 'colleague' then 'career' when 'rival' then 'rivalry' else 'thought' end;
  return new;
end;
$$;
commit;
