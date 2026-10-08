-- Existing detailed records remain readable by their other consumers.
-- New relationship facts use the four axes in shared/constants/celeb-relations.ts.
begin;
create or replace function public.guard_celeb_relation_axes()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare swap_id uuid;
begin
  if new.rel_type not in ('influence', 'influenced', 'colleague', 'rival') then
    raise exception 'celeb relations accept only influence, influenced, colleague, rival'
      using errcode = '23514';
  end if;
  if tg_table_name = 'celeb_relations' then
    if new.from_id = new.to_id then
      raise exception 'self relation is not allowed' using errcode = '23514';
    end if;
    if new.rel_type = 'influenced' then
      swap_id := new.from_id; new.from_id := new.to_id; new.to_id := swap_id;
      new.rel_type := 'influence';
    elsif new.rel_type in ('colleague', 'rival') and new.from_id > new.to_id then
      swap_id := new.from_id; new.from_id := new.to_id; new.to_id := swap_id;
    end if;
  end if;
  new.rel_group := case new.rel_type when 'colleague' then 'career' when 'rival' then 'rivalry' else 'thought' end;
  return new;
end;
$$;
drop trigger if exists guard_celeb_relation_axes on public.celeb_relations;
create trigger guard_celeb_relation_axes before insert or update of rel_type, from_id, to_id
  on public.celeb_relations for each row execute function public.guard_celeb_relation_axes();
drop trigger if exists guard_celeb_relation_axes on public.celeb_relations_external;
create trigger guard_celeb_relation_axes before insert or update of rel_type, from_id, qid
  on public.celeb_relations_external for each row execute function public.guard_celeb_relation_axes();
commit;
