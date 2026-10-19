-- Faction memberships and names are embedded in per-person detail caches.
-- Expire the affected UUID and slug keys as well as the atlas list.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $install$
declare
  mapping record;
  operation record;
begin
  for mapping in
    select * from (values
      (
        'faction_members',
        $tags$array[
          'factions',
          'celebs:' || r.celeb_id::text,
          'celebs:' || (
            select c.slug from public.celebs c where c.id = r.celeb_id
          )
        ]$tags$,
        ''
      ),
      (
        'faction_lv2',
        $tags$array['factions'] || coalesce((
          select array_agg(distinct target.tag order by target.tag)
          from public.faction_members m
          join public.celebs c on c.id = m.celeb_id
          cross join lateral unnest(array[
            'celebs:' || c.id::text,
            'celebs:' || c.slug
          ]) as target(tag)
          where m.lv2_id = r.id and target.tag is not null
        ), array[]::text[])$tags$,
        'view_count,updated_at'
      )
    ) as spec(table_name, tag_expression, volatile_columns)
  loop
    for operation in
      select * from (values
        ('ins', 'insert', 'new table as new_rows'),
        ('upd', 'update', 'old table as old_rows new table as new_rows'),
        ('del', 'delete', 'old table as old_rows')
      ) as spec(suffix, event, transition_tables)
    loop
      execute format(
        'drop trigger if exists %I on public.%I',
        'web_reval_' || operation.suffix, mapping.table_name
      );
      execute format(
        'create trigger %I after %s on public.%I referencing %s '
        || 'for each statement execute function '
        || 'public.web_revalidate_trigger(%L, %L, %L)',
        'web_reval_' || operation.suffix,
        operation.event,
        mapping.table_name,
        operation.transition_tables,
        mapping.tag_expression,
        mapping.volatile_columns,
        'n.id = o.id'
      );
    end loop;
  end loop;
end;
$install$;

do $assert$
declare
  installed integer;
begin
  select count(*) into installed
  from pg_catalog.pg_trigger t
  where t.tgrelid in ('public.faction_members'::regclass, 'public.faction_lv2'::regclass)
    and t.tgname in ('web_reval_ins', 'web_reval_upd', 'web_reval_del')
    and not t.tgisinternal
    and t.tgfoid = 'public.web_revalidate_trigger()'::regprocedure
    and pg_catalog.strpos(pg_catalog.encode(t.tgargs, 'escape'), 'celebs:') > 0;
  if installed <> 6 then
    raise exception 'Expected six faction invalidation triggers with per-person cache tags';
  end if;
end;
$assert$;

commit;
