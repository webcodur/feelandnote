-- Intentionally omit authored BEGIN/COMMIT. Supabase CLI applies this file and
-- its schema_migrations history row atomically.
--
-- Deployment order matters: deploy the revalidation API/Cloudflare prefix
-- contract that understands domain:__all__ before applying this migration.
-- In particular, tags:__all__ and curated:__all__ must never reach the old
-- purge_everything implementation.
--
-- This migration only reattaches five producer tables to the existing generic
-- statement-level helper. It does not redefine web_revalidate_send(), so the
-- Vault/CRON secret boundary, SECURITY DEFINER ACL, fixed search_path, pg_net
-- timeout, and 200-tag HTTP chunking established by 20260820093729 remain
-- unchanged.

do $preconditions$
declare
  v_relation_name text;
  v_trigger_count integer;
  v_table_count integer;
  v_bad_function_count integer;
begin
  if pg_catalog.to_regprocedure('public.web_revalidate_send(text[])') is null
     or pg_catalog.to_regprocedure('public.web_revalidate_trigger()') is null
     or pg_catalog.to_regprocedure('public.web_revalidate_celebs_list()') is null then
    raise exception 'complete web revalidation producers require migration 20260820093729 first';
  end if;

  foreach v_relation_name in array array[
    'celeb_dialogues',
    'celeb_tags',
    'curated_list_items',
    'curated_lists',
    'curators'
  ]::text[]
  loop
    if pg_catalog.to_regclass(
      pg_catalog.format('public.%I', v_relation_name)
    ) is null then
      raise exception 'web revalidation producer table public.% is missing',
        v_relation_name;
    end if;
  end loop;

  -- Do not silently install into a partly upgraded trigger graph. The hardened
  -- baseline owns 22 tables x 3 generic triggers plus 3 celeb-list triggers.
  select pg_catalog.count(*)::integer,
         pg_catalog.count(distinct trigger_row.tgrelid)::integer
  into v_trigger_count, v_table_count
  from pg_catalog.pg_trigger as trigger_row
  join pg_catalog.pg_class as relation_row
    on relation_row.oid = trigger_row.tgrelid
  join pg_catalog.pg_namespace as namespace_row
    on namespace_row.oid = relation_row.relnamespace
  where not trigger_row.tgisinternal
    and namespace_row.nspname = 'public'
    and pg_catalog.left(trigger_row.tgname, 10) = 'web_reval_';

  if v_trigger_count <> 69 or v_table_count <> 22 then
    raise exception
      'web revalidation baseline mismatch: triggers=% tables=% (expected 69/22)',
      v_trigger_count,
      v_table_count;
  end if;

  -- Recheck the privileged boundary instead of weakening or recreating it.
  select pg_catalog.count(*)::integer
  into v_bad_function_count
  from pg_catalog.pg_proc as procedure_row
  join pg_catalog.pg_namespace as namespace_row
    on namespace_row.oid = procedure_row.pronamespace
  where namespace_row.nspname = 'public'
    and procedure_row.proname in (
      'web_revalidate_send',
      'web_revalidate_trigger',
      'web_revalidate_celebs_list'
    )
    and (
      not procedure_row.prosecdef
      or pg_catalog.pg_get_userbyid(procedure_row.proowner) <> 'postgres'
      or procedure_row.proconfig is distinct from
        array['search_path=pg_catalog, pg_temp']::text[]
      or not pg_catalog.has_function_privilege(
        'postgres', procedure_row.oid, 'EXECUTE'
      )
      or pg_catalog.has_function_privilege(
        'service_role', procedure_row.oid, 'EXECUTE'
      )
      or pg_catalog.has_function_privilege(
        'anon', procedure_row.oid, 'EXECUTE'
      )
      or pg_catalog.has_function_privilege(
        'authenticated', procedure_row.oid, 'EXECUTE'
      )
      or exists (
        select 1
        from pg_catalog.aclexplode(
          coalesce(
            procedure_row.proacl,
            pg_catalog.acldefault('f', procedure_row.proowner)
          )
        ) as privilege_row
        where privilege_row.privilege_type = 'EXECUTE'
          and privilege_row.grantee <> (
            select role_row.oid
            from pg_catalog.pg_roles as role_row
            where role_row.rolname = 'postgres'
          )
      )
    );

  if v_bad_function_count <> 0 then
    raise exception
      'web revalidation privileged-function contract failed for % functions',
      v_bad_function_count;
  end if;
end;
$preconditions$;

do $install_producers$
declare
  v_mapping record;
  v_relation regclass;
  v_expected_args bytea;
  v_matching_triggers integer;
begin
  for v_mapping in
    select *
    from (values
      (
        'celeb_dialogues',
        $$array[
          'dialogues',
          'dialogues:' || r.celeb_id,
          'celebs:' || r.celeb_id,
          'celebs:' || (select c.slug from public.celebs as c where c.id = r.celeb_id)
        ]$$,
        '',
        'n.celeb_id = o.celeb_id'
      ),
      (
        'curated_list_items',
        $$array[
          'curated',
          'curated:' || r.content_id,
          'contents:' || r.content_id,
          'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
        ]$$,
        'updated_at',
        'n.id = o.id'
      ),
      (
        'curated_lists',
        $$array['curated', 'curated:__all__']$$,
        'updated_at',
        'n.id = o.id'
      ),
      (
        'curators',
        $$array['curated', 'curated:__all__']$$,
        'updated_at',
        'n.id = o.id'
      ),
      (
        'celeb_tags',
        $$array['tags', 'tags:__all__']$$,
        'updated_at',
        'n.id = o.id'
      )
    ) as mapping(table_name, tag_expression, volatile_columns, join_expression)
  loop
    v_relation := pg_catalog.to_regclass(
      pg_catalog.format('public.%I', v_mapping.table_name)
    );

    execute pg_catalog.format(
      'drop trigger if exists web_reval_ins on public.%I',
      v_mapping.table_name
    );
    execute pg_catalog.format(
      'drop trigger if exists web_reval_upd on public.%I',
      v_mapping.table_name
    );
    execute pg_catalog.format(
      'drop trigger if exists web_reval_del on public.%I',
      v_mapping.table_name
    );

    execute pg_catalog.format(
      'create trigger web_reval_ins '
      || 'after insert on public.%I '
      || 'referencing new table as new_rows '
      || 'for each statement '
      || 'execute function public.web_revalidate_trigger(%L, %L, %L)',
      v_mapping.table_name,
      v_mapping.tag_expression,
      v_mapping.volatile_columns,
      v_mapping.join_expression
    );

    execute pg_catalog.format(
      'create trigger web_reval_upd '
      || 'after update on public.%I '
      || 'referencing old table as old_rows new table as new_rows '
      || 'for each statement '
      || 'execute function public.web_revalidate_trigger(%L, %L, %L)',
      v_mapping.table_name,
      v_mapping.tag_expression,
      v_mapping.volatile_columns,
      v_mapping.join_expression
    );

    execute pg_catalog.format(
      'create trigger web_reval_del '
      || 'after delete on public.%I '
      || 'referencing old table as old_rows '
      || 'for each statement '
      || 'execute function public.web_revalidate_trigger(%L, %L, %L)',
      v_mapping.table_name,
      v_mapping.tag_expression,
      v_mapping.volatile_columns,
      v_mapping.join_expression
    );

    v_expected_args :=
      pg_catalog.convert_to(
        v_mapping.tag_expression,
        pg_catalog.getdatabaseencoding()
      )
      || pg_catalog.decode('00', 'hex')
      || pg_catalog.convert_to(
        v_mapping.volatile_columns,
        pg_catalog.getdatabaseencoding()
      )
      || pg_catalog.decode('00', 'hex')
      || pg_catalog.convert_to(
        v_mapping.join_expression,
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
        'web revalidation producer contract failed for public.%: %/3 triggers',
        v_mapping.table_name,
        v_matching_triggers;
    end if;
  end loop;
end;
$install_producers$;

do $assert_contract$
declare
  v_trigger_count integer;
  v_table_count integer;
  v_target_trigger_count integer;
begin
  select pg_catalog.count(*)::integer,
         pg_catalog.count(distinct trigger_row.tgrelid)::integer
  into v_trigger_count, v_table_count
  from pg_catalog.pg_trigger as trigger_row
  join pg_catalog.pg_class as relation_row
    on relation_row.oid = trigger_row.tgrelid
  join pg_catalog.pg_namespace as namespace_row
    on namespace_row.oid = relation_row.relnamespace
  where not trigger_row.tgisinternal
    and namespace_row.nspname = 'public'
    and pg_catalog.left(trigger_row.tgname, 10) = 'web_reval_';

  if v_trigger_count <> 69 or v_table_count <> 22 then
    raise exception
      'web revalidation post-install mismatch: triggers=% tables=% (expected 69/22)',
      v_trigger_count,
      v_table_count;
  end if;

  select pg_catalog.count(*)::integer
  into v_target_trigger_count
  from pg_catalog.pg_trigger as trigger_row
  where trigger_row.tgrelid = any (array[
      'public.celeb_dialogues'::regclass,
      'public.celeb_tags'::regclass,
      'public.curated_list_items'::regclass,
      'public.curated_lists'::regclass,
      'public.curators'::regclass
    ]::oid[])
    and trigger_row.tgname in (
      'web_reval_ins',
      'web_reval_upd',
      'web_reval_del'
    )
    and not trigger_row.tgisinternal
    and trigger_row.tgfoid =
      'public.web_revalidate_trigger()'::regprocedure
    and trigger_row.tgenabled = 'O';

  if v_target_trigger_count <> 15 then
    raise exception
      'web revalidation target trigger count mismatch: % (expected 15)',
      v_target_trigger_count;
  end if;
end;
$assert_contract$;
