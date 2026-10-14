-- Input types generated from packages/shared/src/constants/celeb-relations.ts.
-- Family facts are accepted independently of the four social axes.
begin;
create or replace function public.guard_celeb_relation_axes()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare swap_id uuid; from_qid text; to_qid text; family_pair boolean;
begin
  if new.rel_type is null or new.rel_type not in ('influence', 'influenced', 'colleague', 'rival', 'father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative') then
    raise exception 'celeb relations accept family types and the four social axes' using errcode = '23514';
  end if;
  if tg_table_name = 'celeb_relations' then
    if new.from_id = new.to_id then raise exception 'self relation is not allowed' using errcode = '23514'; end if;
  end if;
  if new.rel_type in ('father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative') then
    if tg_table_name = 'celeb_relations' then
      if new.rel_type = 'child' then
        swap_id := new.from_id; new.from_id := new.to_id; new.to_id := swap_id; new.rel_type := 'parent';
      elsif new.rel_type in ('spouse', 'partner', 'sibling', 'relative') and new.from_id > new.to_id then
        swap_id := new.from_id; new.from_id := new.to_id; new.to_id := swap_id;
      end if;
    end if;
    new.rel_group := 'family';
    return new;
  end if;
  if tg_table_name = 'celeb_relations' then
    select wikidata_qid into from_qid from public.celebs where id = new.from_id;
    select wikidata_qid into to_qid from public.celebs where id = new.to_id;
    select exists (
      select 1 from public.celeb_relations r
      where ((r.from_id = new.from_id and r.to_id = new.to_id) or (r.from_id = new.to_id and r.to_id = new.from_id))
        and r.id is distinct from new.id
        and (r.rel_group = 'family' or r.rel_type in ('father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative'))
    ) or exists (
      select 1 from public.celeb_relations_external r
      where ((r.from_id = new.from_id and r.qid = to_qid) or (r.from_id = new.to_id and r.qid = from_qid))
        and r.id is distinct from new.id
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
        and r.id is distinct from new.id
        and (r.rel_group = 'family' or r.rel_type in ('father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative'))
    ) or exists (
      select 1 from public.celeb_relations r join public.celebs c
        on c.id = case when r.from_id = new.from_id then r.to_id else r.from_id end
      where (r.from_id = new.from_id or r.to_id = new.from_id) and c.wikidata_qid = new.qid
        and r.id is distinct from new.id
        and (r.rel_group = 'family' or r.rel_type in ('father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative'))
    ) into family_pair;
  end if;
  if family_pair then raise exception 'family pair cannot have subsidiary social relations' using errcode = '23514'; end if;
  new.rel_group := case new.rel_type when 'colleague' then 'career' when 'rival' then 'rivalry' else 'thought' end;
  return new;
end;
$$;
drop trigger if exists guard_celeb_relation_axes on public.celeb_relations;
create trigger guard_celeb_relation_axes before insert or update of rel_type, rel_group, from_id, to_id
  on public.celeb_relations for each row execute function public.guard_celeb_relation_axes();
drop trigger if exists guard_celeb_relation_axes on public.celeb_relations_external;
create trigger guard_celeb_relation_axes before insert or update of rel_type, rel_group, from_id, qid
  on public.celeb_relations_external for each row execute function public.guard_celeb_relation_axes();
commit;
