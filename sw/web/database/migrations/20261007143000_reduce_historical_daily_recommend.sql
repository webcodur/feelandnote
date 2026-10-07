-- Tune only Today's Picks: contemporary people gain weight; historical people remain eligible.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '5s';

do $migration$
declare
  v_definition text := pg_get_functiondef(
    'public.get_celebs_sorted(text,text,text,text,text,integer,integer,uuid,integer,text,boolean,text[],text[],integer,integer,uuid)'::regprocedure
  );
  v_old text := '+ 0.08 * (case when nullif(candidate.death_date, '''') is null and candidate.computed_birth_year >= 1900 then 1 else 0 end)';
  v_new text := '+ 0.14 * (case when nullif(candidate.death_date, '''') is null and candidate.computed_birth_year >= 1900 then 1 else 0 end)'
    || E'
      - 0.05 * (case when candidate.computed_birth_year < 1900 then 1 else 0 end)';
  v_other_sort_before text;
  v_other_sort_after text;
begin
  if position(v_new in v_definition) > 0 then
    return;
  end if;
  if position(v_old in v_definition) = 0
    or (length(v_definition) - length(replace(v_definition, v_old, ''))) / length(v_old) <> 1 then
    raise exception 'Unexpected daily recommendation score; inspect current function before changing it';
  end if;
  select md5(string_agg(id::text, ',' order by ordinality)) into v_other_sort_before
  from public.get_celebs_sorted(p_sort_by => 'influence', p_limit => 48, p_min_content_count => 1) with ordinality as listed;
  execute replace(v_definition, v_old, v_new);
  select md5(string_agg(id::text, ',' order by ordinality)) into v_other_sort_after
  from public.get_celebs_sorted(p_sort_by => 'influence', p_limit => 48, p_min_content_count => 1) with ordinality as listed;
  if v_other_sort_before is distinct from v_other_sort_after then
    raise exception 'Unrelated influence sort changed';
  end if;
end;
$migration$;

commit;
