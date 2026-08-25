-- Keep the all-spectrum-vectors list invalidatable when persona rows change.
-- The existing trigger function and its three-argument contract are reused.

begin;

do $preconditions$
begin
  if pg_catalog.to_regclass('public.celeb_persona') is null then
    raise exception 'spectrum revalidation requires public.celeb_persona';
  end if;

  if pg_catalog.to_regprocedure('public.web_revalidate_trigger()') is null then
    raise exception 'spectrum revalidation requires public.web_revalidate_trigger()';
  end if;
end;
$preconditions$;

do $install_celeb_persona$
declare
  v_relation regclass;
  v_tag_expression constant text := $$array[
    'spectrum',
    'spectrum:' || r.celeb_id,
    'celebs:' || r.celeb_id,
    'celebs:' || (select c.slug from public.celebs as c where c.id = r.celeb_id)
  ]$$;
  v_volatile_columns constant text := 'updated_at';
  v_join_expression constant text := 'n.id = o.id';
  v_expected_args bytea;
  v_matching_triggers integer;
begin
  v_relation := pg_catalog.to_regclass('public.celeb_persona');

  drop trigger if exists web_reval_ins on public.celeb_persona;
  drop trigger if exists web_reval_upd on public.celeb_persona;
  drop trigger if exists web_reval_del on public.celeb_persona;

  execute pg_catalog.format(
    'create trigger web_reval_ins '
    || 'after insert on public.celeb_persona '
    || 'referencing new table as new_rows '
    || 'for each statement '
    || 'execute function public.web_revalidate_trigger(%L, %L, %L)',
    v_tag_expression,
    v_volatile_columns,
    v_join_expression
  );

  execute pg_catalog.format(
    'create trigger web_reval_upd '
    || 'after update on public.celeb_persona '
    || 'referencing old table as old_rows new table as new_rows '
    || 'for each statement '
    || 'execute function public.web_revalidate_trigger(%L, %L, %L)',
    v_tag_expression,
    v_volatile_columns,
    v_join_expression
  );

  execute pg_catalog.format(
    'create trigger web_reval_del '
    || 'after delete on public.celeb_persona '
    || 'referencing old table as old_rows '
    || 'for each statement '
    || 'execute function public.web_revalidate_trigger(%L, %L, %L)',
    v_tag_expression,
    v_volatile_columns,
    v_join_expression
  );

  v_expected_args :=
    pg_catalog.convert_to(
      v_tag_expression,
      pg_catalog.getdatabaseencoding()
    )
    || pg_catalog.decode('00', 'hex')
    || pg_catalog.convert_to(
      v_volatile_columns,
      pg_catalog.getdatabaseencoding()
    )
    || pg_catalog.decode('00', 'hex')
    || pg_catalog.convert_to(
      v_join_expression,
      pg_catalog.getdatabaseencoding()
    )
    || pg_catalog.decode('00', 'hex');

  select pg_catalog.count(*)::integer
  into v_matching_triggers
  from pg_catalog.pg_trigger as trigger_row
  where trigger_row.tgrelid = v_relation
    and trigger_row.tgname in (
      'web_reval_ins',
      'web_reval_upd',
      'web_reval_del'
    )
    and not trigger_row.tgisinternal
    and trigger_row.tgfoid =
      'public.web_revalidate_trigger()'::regprocedure
    and trigger_row.tgenabled = 'O'
    and trigger_row.tgnargs = 3
    and trigger_row.tgargs = v_expected_args
    and (trigger_row.tgtype & 1) = 0
    and (trigger_row.tgtype & 2) = 0
    and (
      (
        trigger_row.tgname = 'web_reval_ins'
        and (trigger_row.tgtype & 4) = 4
        and trigger_row.tgnewtable = 'new_rows'
        and trigger_row.tgoldtable is null
      )
      or (
        trigger_row.tgname = 'web_reval_upd'
        and (trigger_row.tgtype & 16) = 16
        and trigger_row.tgnewtable = 'new_rows'
        and trigger_row.tgoldtable = 'old_rows'
      )
      or (
        trigger_row.tgname = 'web_reval_del'
        and (trigger_row.tgtype & 8) = 8
        and trigger_row.tgnewtable is null
        and trigger_row.tgoldtable = 'old_rows'
      )
    );

  if v_matching_triggers <> 3 then
    raise exception
      'spectrum revalidation trigger contract failed: %/3 triggers',
      v_matching_triggers;
  end if;
end;
$install_celeb_persona$;

commit;
