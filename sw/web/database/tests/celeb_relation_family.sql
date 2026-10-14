-- Run with psql -X -v ON_ERROR_STOP=1; every probe is rolled back.
begin;
set local lock_timeout = '5s';
do $$
declare
  a uuid; b uuid;
  kind text; result record; f record;
begin
  select x.id,y.id into a,b from public.celebs x cross join public.celebs y
    where x.id < y.id and not exists (
      select 1 from public.celeb_relations r where (r.from_id=x.id and r.to_id=y.id) or (r.from_id=y.id and r.to_id=x.id)
    ) and not exists (
      select 1 from public.celeb_relations_external e where e.rel_group='family'
        and ((e.from_id=x.id and e.qid=y.wikidata_qid) or (e.from_id=y.id and e.qid=x.wikidata_qid))
    ) limit 1;
  if a is null then raise exception 'two unrelated registered people required'; end if;
  foreach kind in array array['father','mother','parent','child','spouse','partner','sibling','relative'] loop
    begin
      insert into public.celeb_relations(from_id,to_id,rel_type,rel_group,source)
        values(a,b,kind,'thought','manual') returning * into result;
      if result.rel_group <> 'family' then raise exception 'family group missing: %',kind; end if;
      if kind = 'child' and (result.from_id <> b or result.to_id <> a or result.rel_type <> 'parent') then
        raise exception 'child direction incorrect';
      end if;
      if kind in ('spouse','partner','sibling','relative') and result.from_id > result.to_id then
        raise exception 'symmetric family direction incorrect: %',kind;
      end if;
      raise sqlstate 'P1000' using message = 'rollback successful probe';
    exception when sqlstate 'P1000' then null;
    end;
    begin
      insert into public.celeb_relations_external(from_id,qid,rel_type,rel_group,source,name_en)
        values(a,'Q999999999',kind,'thought','manual','Regression probe') returning * into result;
      if result.rel_group <> 'family' or result.rel_type <> kind then raise exception 'external family changed: %',kind; end if;
      raise sqlstate 'P1000' using message = 'rollback successful probe';
    exception when sqlstate 'P1000' then null;
    end;
  end loop;
  -- A family discovered after a social fact must still be accepted.
  insert into public.celeb_relations(from_id,to_id,rel_type,rel_group,source) values(a,b,'colleague','career','manual');
  insert into public.celeb_relations(from_id,to_id,rel_type,rel_group,source) values(a,b,'spouse','family','manual');
  foreach kind in array array['influence','influenced','rival'] loop
    begin
      insert into public.celeb_relations(from_id,to_id,rel_type,rel_group,source) values(a,b,kind,'thought','manual');
      raise exception 'social relationship accepted for family pair: %',kind;
    exception when check_violation then null;
    end;
  end loop;
  delete from public.celeb_relations where from_id=least(a,b) and to_id=greatest(a,b) and rel_type='colleague';
  update public.celeb_relations set rel_type='colleague' where from_id=least(a,b) and to_id=greatest(a,b) and rel_type='spouse';
  insert into public.celeb_relations_external(from_id,qid,rel_type,rel_group,source) values(a,'Q999999998','father','family','manual');
  select a as from_id,'Q999999998'::text as qid into f;
  begin
    insert into public.celeb_relations_external(from_id,qid,rel_type,rel_group,source) values(f.from_id,f.qid,'colleague','career','manual');
    raise exception 'external family pair accepted social relationship';
  exception when check_violation then null;
  end;
  begin
    insert into public.celeb_relations(from_id,to_id,rel_type,rel_group,source) values(a,a,'spouse','family','manual');
    raise exception 'self relation accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.celeb_relations_external(from_id,qid,rel_type,rel_group,source) values(a,'Q999999999','friend','friendship','manual');
    raise exception 'unsupported social type accepted';
  exception when check_violation then null;
  end;
  raise notice 'PASS: all eight family types, both tables, normalization, social restrictions';
end;
$$;
rollback;
