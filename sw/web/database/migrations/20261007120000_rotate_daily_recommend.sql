-- Rotate existing candidates without history reads, extra queries, or midnight writes.
-- Keep the current function's filters, signature, grants, and return columns.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '3s';

do $migration$
declare
  v_definition text := pg_get_functiondef(
    'public.get_celebs_sorted(text,text,text,text,text,integer,integer,uuid,integer,text,boolean,text[],text[],integer,integer,uuid)'::regprocedure
  );
  v_body_start text := E'begin\n  return query';
  v_sort_start text := '    case when p_sort_by = ''daily_recommend'' then';
begin
  if position('v_recommendation_day date :=' in v_definition) > 0 then
    return;
  end if;
  if position(v_body_start in v_definition) = 0
    or position(v_sort_start in v_definition) = 0
    or position('current_date::text' in v_definition) = 0 then
    raise exception 'Unexpected get_celebs_sorted definition; review before changing it';
  end if;

  v_definition := replace(v_definition, v_body_start, $body$
  v_recommendation_day date := (statement_timestamp() at time zone 'Asia/Seoul')::date;
  v_recommendation_bucket integer := mod(v_recommendation_day - date '1970-01-01', 7);
begin
  return query$body$);
  v_definition := replace(v_definition, v_sort_start, $sort$
    -- UUID prefixes already distribute candidates; no second hash is needed.
    -- Rotate all seven groups, filling small filtered lists from the next group.
    case when p_sort_by = 'daily_recommend' then
      mod(('x' || substr(candidate.id::text, 1, 8))::bit(32)::bigint + 7 - v_recommendation_bucket, 7)
    end asc nulls last,
    case when p_sort_by = 'daily_recommend' then$sort$);
  v_definition := replace(v_definition, 'current_date::text', 'v_recommendation_day::text');
  execute v_definition;
end;
$migration$;

commit;
