-- Intentionally omit authored BEGIN/COMMIT. Supabase CLI 2.115.0 puts this
-- file's statements and its schema_migrations history row in one transaction;
-- authored transaction control would make the history insert non-atomic.

-- The webhook runtime is provisioned by Supabase. Do not create or version-pin
-- either extension here: a migration must fail clearly when the platform
-- prerequisite is missing instead of installing a partial replacement.
do $preconditions$
begin
  if not exists (
    select 1
    from pg_catalog.pg_extension as extension_row
    where extension_row.extname = 'pg_net'
  ) then
    raise exception 'web revalidation requires the pg_net extension';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_extension as extension_row
    where extension_row.extname = 'supabase_vault'
  ) then
    raise exception 'web revalidation requires the supabase_vault extension';
  end if;

  if pg_catalog.to_regprocedure(
    'net.http_post(text,jsonb,jsonb,jsonb,integer)'
  ) is null then
    raise exception 'web revalidation requires net.http_post(text,jsonb,jsonb,jsonb,integer)';
  end if;

  if pg_catalog.to_regclass('vault.decrypted_secrets') is null then
    raise exception 'web revalidation requires vault.decrypted_secrets';
  end if;

  if not pg_catalog.has_schema_privilege('postgres', 'net', 'USAGE')
     or not pg_catalog.has_function_privilege(
       'postgres',
       'net.http_post(text,jsonb,jsonb,jsonb,integer)',
       'EXECUTE'
     ) then
    raise exception 'postgres must be able to execute net.http_post';
  end if;

  if not pg_catalog.has_schema_privilege('postgres', 'vault', 'USAGE')
     or not pg_catalog.has_table_privilege(
       'postgres', 'vault.decrypted_secrets', 'SELECT'
     ) then
    raise exception 'postgres must be able to read vault.decrypted_secrets';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc as procedure_row
    join pg_catalog.pg_namespace as namespace_row
      on namespace_row.oid = procedure_row.pronamespace
    where namespace_row.nspname = 'vault'
      and procedure_row.proname = '_crypto_aead_det_decrypt'
  ) and not exists (
    select 1
    from pg_catalog.pg_proc as procedure_row
    join pg_catalog.pg_namespace as namespace_row
      on namespace_row.oid = procedure_row.pronamespace
    where namespace_row.nspname = 'vault'
      and procedure_row.proname = '_crypto_aead_det_decrypt'
      and pg_catalog.has_function_privilege(
        'postgres', procedure_row.oid, 'EXECUTE'
      )
  ) then
    raise exception 'postgres must be able to decrypt Vault secrets';
  end if;
end;
$preconditions$;

-- The old live-only installer was callable by API roles. Trigger installation
-- now happens inside this migration, so the helper must not remain an RPC.
drop function if exists public.web_revalidate_attach(regclass, text, text, text);

create or replace function public.web_revalidate_send(p_tags text[])
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_secret text;
  v_secret_count bigint;
  v_tags text[];
  v_chunk text[];
  v_chunk_size constant integer := 200;
  v_offset integer := 1;
  v_rejected_count integer;
begin
  -- Keep this boundary equivalent to isAllowedCacheTag() in
  -- packages/shared/src/constants/cache-tags.ts: Unicode and punctuation are
  -- valid identifiers, except whitespace, URL path/query delimiters, percent,
  -- ASCII controls, and the dot-segment aliases that change URL semantics.
  with normalized_tags as (
    select pg_catalog.btrim(input_tag.tag) as tag
    from pg_catalog.unnest(p_tags) as input_tag(tag)
    where input_tag.tag is not null
  ), parsed_tags as (
    select
      normalized_tag.tag,
      pg_catalog.strpos(normalized_tag.tag, ':') as separator_at,
      pg_catalog.split_part(normalized_tag.tag, ':', 1) as domain,
      case
        when pg_catalog.strpos(normalized_tag.tag, ':') > 0 then
          pg_catalog.substr(
            normalized_tag.tag,
            pg_catalog.strpos(normalized_tag.tag, ':') + 1
          )
        else null
      end as identifier
    from normalized_tags as normalized_tag
    where normalized_tag.tag <> ''
  ), classified_tags as (
    select
      parsed_tag.tag,
      (
        -- JavaScript String.length counts astral code points as two UTF-16
        -- units; add their count to PostgreSQL's code-point length.
        pg_catalog.length(parsed_tag.tag)
          + pg_catalog.regexp_count(
            parsed_tag.tag,
            U&'[\+010000-\+10FFFF]'
          ) <= 200
        and parsed_tag.domain = any (array[
          'celebs',
          'contents',
          'dialogues',
          'spectrum',
          'tags',
          'fiction-sources',
          'curated'
        ]::text[])
        and (
          parsed_tag.separator_at = 0
          or (
            pg_catalog.length(parsed_tag.identifier) between 1 and 128
            and parsed_tag.identifier not in ('.', '..')
            -- PostgreSQL UTF-8 cannot represent NUL or UTF-16 surrogates.
            -- The remaining Unicode 17 Cc/Cf ranges mirror the JS \p contract.
            and parsed_tag.identifier !~
              U&'[\0001-\001F\007F-\009F\00AD\0600-\0605\061C\06DD\070F\0890-\0891\08E2\180E\200B-\200F\202A-\202E\2060-\2064\2066-\206F\FEFF\FFF9-\FFFB\+0110BD\+0110CD\+013430-\+01343F\+01BCA0-\+01BCA3\+01D173-\+01D17A\+0E0001\+0E0020-\+0E007F]'
            and parsed_tag.identifier !~
              U&'[\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]'
            and pg_catalog.strpos(parsed_tag.identifier, '/') = 0
            and pg_catalog.strpos(parsed_tag.identifier, E'\\') = 0
            and pg_catalog.strpos(parsed_tag.identifier, '?') = 0
            and pg_catalog.strpos(parsed_tag.identifier, '#') = 0
            and pg_catalog.strpos(parsed_tag.identifier, '%') = 0
          )
        )
      ) as is_allowed
    from parsed_tags as parsed_tag
  )
  select
    pg_catalog.array_agg(distinct classified_tag.tag order by classified_tag.tag)
      filter (where classified_tag.is_allowed),
    pg_catalog.count(*) filter (where not classified_tag.is_allowed)
  into v_tags, v_rejected_count
  from classified_tags as classified_tag;

  if v_rejected_count > 0 then
    raise warning
      'web_revalidate_send: discarded % structurally unsafe cache tag(s)',
      v_rejected_count;
  end if;

  if coalesce(pg_catalog.cardinality(v_tags), 0) = 0 then
    return;
  end if;

  -- Secret provisioning stays an external secure bootstrap step. At runtime,
  -- fail closed unless exactly one nonblank named secret exists; never place
  -- its value in a migration, assertion, or diagnostic message.
  select secret_row.decrypted_secret, pg_catalog.count(*) over ()
  into v_secret, v_secret_count
  from vault.decrypted_secrets as secret_row
  where secret_row.name = 'web_revalidate_secret'
  order by secret_row.created_at desc
  limit 1;

  if coalesce(v_secret_count, 0) <> 1
     or nullif(pg_catalog.btrim(v_secret), '') is null then
    raise exception 'web_revalidate_send requires exactly one nonblank vault secret named web_revalidate_secret';
  end if;

  while v_offset <= pg_catalog.cardinality(v_tags) loop
    v_chunk := v_tags[
      v_offset:least(
        v_offset + v_chunk_size - 1,
        pg_catalog.cardinality(v_tags)
      )
    ];

    perform net.http_post(
      url := 'https://feelandnote.com/api/revalidate'::text,
      body := pg_catalog.jsonb_build_object(
        'tag', pg_catalog.to_jsonb(v_chunk),
        'secret', v_secret
      ),
      params := '{}'::jsonb,
      headers := pg_catalog.jsonb_build_object(
        'Content-Type', 'application/json',
        'User-Agent', 'feelandnote-db-revalidate/2.0'
      ),
      timeout_milliseconds := 8000
    );

    v_offset := v_offset + v_chunk_size;
  end loop;
end;
$function$;

create or replace function public.web_revalidate_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_expr text := tg_argv[0];
  v_volatile text := coalesce(tg_argv[1], '');
  v_join text := coalesce(tg_argv[2], '');
  v_strip text := '';
  v_new_join text;
  v_old_join text;
  v_tags text[];
  v_column text;
begin
  if v_expr is null or pg_catalog.btrim(v_expr) = '' then
    raise exception 'web_revalidate_trigger: missing tag expression for %.%',
      tg_table_schema,
      tg_table_name;
  end if;

  if tg_op = 'INSERT' then
    execute pg_catalog.format(
      $sql$
        select pg_catalog.array_agg(distinct tag_row.tag order by tag_row.tag)
        from (
          select pg_catalog.unnest(%s) as tag
          from new_rows as r
        ) as tag_row
        where tag_row.tag is not null and tag_row.tag <> ''
      $sql$,
      v_expr
    )
    into v_tags;
  elsif tg_op = 'DELETE' then
    execute pg_catalog.format(
      $sql$
        select pg_catalog.array_agg(distinct tag_row.tag order by tag_row.tag)
        from (
          select pg_catalog.unnest(%s) as tag
          from old_rows as r
        ) as tag_row
        where tag_row.tag is not null and tag_row.tag <> ''
      $sql$,
      v_expr
    )
    into v_tags;
  elsif tg_op = 'UPDATE' then
    if pg_catalog.btrim(v_join) = '' then
      raise exception 'web_revalidate_trigger: missing UPDATE join for %.%',
        tg_table_schema,
        tg_table_name;
    end if;

    if pg_catalog.btrim(v_volatile) <> '' then
      foreach v_column in array pg_catalog.string_to_array(v_volatile, ',') loop
        v_column := pg_catalog.btrim(v_column);
        if v_column <> '' then
          v_strip := v_strip || pg_catalog.format(' - %L', v_column);
        end if;
      end loop;
    end if;

    v_new_join := pg_catalog.replace(v_join, 'n.', 'r.');
    v_old_join := pg_catalog.replace(v_join, 'o.', 'r.');

    -- Compare complete rows after removing explicitly volatile counters. Both
    -- transition tables contribute tags so renamed slugs/external IDs and
    -- changed foreign keys invalidate the old and new cache identities.
    execute pg_catalog.format(
      $sql$
        select pg_catalog.array_agg(distinct tag_row.tag order by tag_row.tag)
        from (
          select pg_catalog.unnest(%1$s) as tag
          from new_rows as r
          where not exists (
            select 1
            from old_rows as o
            where %2$s
              and (pg_catalog.to_jsonb(r)%4$s)
                is not distinct from (pg_catalog.to_jsonb(o)%4$s)
          )

          union all

          select pg_catalog.unnest(%1$s) as tag
          from old_rows as r
          where not exists (
            select 1
            from new_rows as n
            where %3$s
              and (pg_catalog.to_jsonb(r)%4$s)
                is not distinct from (pg_catalog.to_jsonb(n)%4$s)
          )
        ) as tag_row
        where tag_row.tag is not null and tag_row.tag <> ''
      $sql$,
      v_expr,
      v_new_join,
      v_old_join,
      v_strip
    )
    into v_tags;
  else
    raise exception 'web_revalidate_trigger: unsupported operation %', tg_op;
  end if;

  if v_tags is not null and pg_catalog.cardinality(v_tags) > 0 then
    perform public.web_revalidate_send(v_tags);
  end if;

  return null;
end;
$function$;

create or replace function public.web_revalidate_celebs_list()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_changed boolean := true;
begin
  if tg_op = 'UPDATE' then
    -- New columns automatically participate. Only counters that do not change
    -- list/search presentation are excluded, so bio/headline cannot be missed.
    select exists (
      select 1
      from new_rows as n
      where not exists (
        select 1
        from old_rows as o
        where n.id = o.id
          and (pg_catalog.to_jsonb(n) - 'view_count' - 'updated_at')
            is not distinct from
              (pg_catalog.to_jsonb(o) - 'view_count' - 'updated_at')
      )

      union all

      select 1
      from old_rows as o
      where not exists (
        select 1
        from new_rows as n
        where n.id = o.id
          and (pg_catalog.to_jsonb(n) - 'view_count' - 'updated_at')
            is not distinct from
              (pg_catalog.to_jsonb(o) - 'view_count' - 'updated_at')
      )
    )
    into v_changed;
  end if;

  if v_changed then
    perform public.web_revalidate_send(array['celebs']);
  end if;

  return null;
end;
$function$;

alter function public.web_revalidate_send(text[]) owner to postgres;
alter function public.web_revalidate_trigger() owner to postgres;
alter function public.web_revalidate_celebs_list() owner to postgres;

revoke all on function public.web_revalidate_send(text[])
from public, anon, authenticated, service_role;
revoke all on function public.web_revalidate_trigger()
from public, anon, authenticated, service_role;
revoke all on function public.web_revalidate_celebs_list()
from public, anon, authenticated, service_role;

-- CREATE OR REPLACE preserves old ACL entries. Remove direct EXECUTE grants
-- held by any custom role before rebuilding the allow-list below.
do $reset_function_acl$
declare
  v_function record;
  v_grantee name;
begin
  for v_function in
    select *
    from (values
      (
        'public.web_revalidate_send(text[])'::regprocedure,
        'public.web_revalidate_send(text[])'
      ),
      (
        'public.web_revalidate_trigger()'::regprocedure,
        'public.web_revalidate_trigger()'
      ),
      (
        'public.web_revalidate_celebs_list()'::regprocedure,
        'public.web_revalidate_celebs_list()'
      )
    ) as function_contract(function_oid, function_signature)
  loop
    for v_grantee in
      select role_row.rolname
      from pg_catalog.pg_proc as procedure_row
      cross join lateral pg_catalog.aclexplode(
        coalesce(
          procedure_row.proacl,
          pg_catalog.acldefault('f', procedure_row.proowner)
        )
      ) as privilege_row
      join pg_catalog.pg_roles as role_row
        on role_row.oid = privilege_row.grantee
      where procedure_row.oid = v_function.function_oid
        and privilege_row.privilege_type = 'EXECUTE'
        and role_row.rolname <> 'postgres'
    loop
      execute pg_catalog.format(
        'revoke all on function %s from %I',
        v_function.function_signature,
        v_grantee
      );
    end loop;
  end loop;
end;
$reset_function_acl$;

grant execute on function public.web_revalidate_send(text[])
to postgres;
grant execute on function public.web_revalidate_trigger()
to postgres;
grant execute on function public.web_revalidate_celebs_list()
to postgres;

-- pg_net is extension-owned and its upgrade contract controls its own ACLs.
-- The application functions above are the security boundary, so this migration
-- intentionally does not mutate net schema/function privileges.

do $install_triggers$
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
        'celeb_contents',
        $$array[
          'celebs:' || r.celeb_id,
          'celebs:' || (select c.slug from public.celebs as c where c.id = r.celeb_id),
          'contents:' || r.content_id,
          'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
        ]$$,
        '',
        'n.id = o.id'
      ),
      (
        'celeb_dialogues',
        $$array[
          'celebs:' || r.celeb_id,
          'celebs:' || (select c.slug from public.celebs as c where c.id = r.celeb_id),
          'dialogues:' || r.celeb_id
        ]$$,
        '',
        'n.celeb_id = o.celeb_id'
      ),
      (
        'celeb_explanations',
        $$array[
          'celebs:' || r.profile_id,
          'celebs:' || (select c.slug from public.celebs as c where c.id = r.profile_id)
        ]$$,
        '',
        'n.profile_id = o.profile_id'
      ),
      (
        'celeb_influence',
        $$array[
          'celebs:' || r.celeb_id,
          'celebs:' || (select c.slug from public.celebs as c where c.id = r.celeb_id)
        ]$$,
        'updated_at',
        'n.id = o.id'
      ),
      (
        'celeb_persona',
        $$array[
          'spectrum:' || r.celeb_id,
          'celebs:' || r.celeb_id,
          'celebs:' || (select c.slug from public.celebs as c where c.id = r.celeb_id)
        ]$$,
        'updated_at',
        'n.id = o.id'
      ),
      (
        'celeb_relations',
        $$array[
          'celebs:' || r.from_id,
          'celebs:' || (select c.slug from public.celebs as c where c.id = r.from_id),
          'celebs:' || r.to_id,
          'celebs:' || (select c.slug from public.celebs as c where c.id = r.to_id)
        ]$$,
        '',
        'n.id = o.id'
      ),
      (
        'celeb_relations_external',
        $$array[
          'celebs:' || r.from_id,
          'celebs:' || (select c.slug from public.celebs as c where c.id = r.from_id)
        ]$$,
        '',
        'n.id = o.id'
      ),
      (
        'celeb_tag_assignments',
        $$array[
          'tags',
          'celebs:' || r.celeb_id,
          'celebs:' || (select c.slug from public.celebs as c where c.id = r.celeb_id)
        ]$$,
        '',
        'n.id = o.id'
      ),
      (
        'celeb_tags',
        $$array['tags']$$,
        'updated_at',
        'n.id = o.id'
      ),
      (
        'celeb_timeline_events',
        $$array[
          'celebs:' || r.celeb_id,
          'celebs:' || (select c.slug from public.celebs as c where c.id = r.celeb_id)
        ]$$,
        '',
        'n.id = o.id'
      ),
      (
        'celebs',
        $$array['celebs:' || r.id, 'celebs:' || r.slug]$$,
        'view_count,updated_at',
        'n.id = o.id'
      ),
      (
        'content_locales',
        $$array[
          'contents:' || r.content_id,
          'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
        ]$$,
        'updated_at',
        'n.content_id = o.content_id and n.locale = o.locale'
      ),
      (
        'contents',
        $$array['contents:' || r.id, 'contents:' || r.external_id]$$,
        'member_count,celeb_count,record_count',
        'n.id = o.id'
      ),
      (
        'curated_list_items',
        $$array['curated']$$,
        'updated_at',
        'n.id = o.id'
      ),
      (
        'curated_lists',
        $$array['curated']$$,
        'updated_at',
        'n.id = o.id'
      ),
      (
        'curators',
        $$array['curated']$$,
        'updated_at',
        'n.id = o.id'
      ),
      (
        'faction_clusters',
        $$array['tags']$$,
        '',
        'n.id = o.id'
      ),
      (
        'faction_episodes',
        $$array['tags']$$,
        'updated_at',
        'n.id = o.id'
      ),
      (
        'faction_groups',
        $$array['tags']$$,
        '',
        'n.id = o.id'
      ),
      (
        'faction_people',
        $$array[
          'tags',
          'celebs:' || r.celeb_id,
          'celebs:' || (select c.slug from public.celebs as c where c.id = r.celeb_id)
        ]$$,
        '',
        'n.id = o.id'
      ),
      (
        'fiction_source_characters',
        $$array[
          'fiction-sources',
          'celebs:' || r.celeb_id,
          'celebs:' || (select c.slug from public.celebs as c where c.id = r.celeb_id),
          'contents:' || r.content_id,
          'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
        ]$$,
        '',
        'n.content_id = o.content_id and n.celeb_id = o.celeb_id'
      ),
      (
        'fiction_source_contents',
        $$array[
          'fiction-sources',
          'contents:' || r.content_id,
          'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
        ]$$,
        'updated_at',
        'n.content_id = o.content_id'
      )
    ) as mapping(table_name, tag_expression, volatile_columns, join_expression)
  loop
    v_relation := pg_catalog.to_regclass(
      pg_catalog.format('public.%I', v_mapping.table_name)
    );

    if v_relation is null then
      raise exception 'web revalidation target table public.% is missing',
        v_mapping.table_name;
    end if;

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
      and trigger_row.tgnargs = 3
      and trigger_row.tgargs = v_expected_args;

    if v_matching_triggers <> 3 then
      raise exception
        'web revalidation trigger-argument contract failed for public.%',
        v_mapping.table_name;
    end if;
  end loop;

  drop trigger if exists web_reval_list_ins on public.celebs;
  drop trigger if exists web_reval_list_upd on public.celebs;
  drop trigger if exists web_reval_list_del on public.celebs;

  create trigger web_reval_list_ins
  after insert on public.celebs
  referencing new table as new_rows
  for each statement
  execute function public.web_revalidate_celebs_list();

  create trigger web_reval_list_upd
  after update on public.celebs
  referencing old table as old_rows new table as new_rows
  for each statement
  execute function public.web_revalidate_celebs_list();

  create trigger web_reval_list_del
  after delete on public.celebs
  referencing old table as old_rows
  for each statement
  execute function public.web_revalidate_celebs_list();
end;
$install_triggers$;

do $assert_contract$
declare
  v_target_tables constant text[] := array[
    'celeb_contents',
    'celeb_dialogues',
    'celeb_explanations',
    'celeb_influence',
    'celeb_persona',
    'celeb_relations',
    'celeb_relations_external',
    'celeb_tag_assignments',
    'celeb_tags',
    'celeb_timeline_events',
    'celebs',
    'content_locales',
    'contents',
    'curated_list_items',
    'curated_lists',
    'curators',
    'faction_clusters',
    'faction_episodes',
    'faction_groups',
    'faction_people',
    'fiction_source_characters',
    'fiction_source_contents'
  ];
  v_trigger_count integer;
  v_table_count integer;
  v_bad_count integer;
begin
  if pg_catalog.cardinality(v_target_tables) <> 22 then
    raise exception 'web revalidation target-table contract must contain 22 tables';
  end if;

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
      'web revalidation trigger contract mismatch: triggers=% tables=%',
      v_trigger_count,
      v_table_count;
  end if;

  select pg_catalog.count(*)::integer
  into v_bad_count
  from pg_catalog.unnest(v_target_tables) as target(table_name)
  where (
    select pg_catalog.count(*)
    from pg_catalog.pg_trigger as trigger_row
    join pg_catalog.pg_class as relation_row
      on relation_row.oid = trigger_row.tgrelid
    join pg_catalog.pg_namespace as namespace_row
      on namespace_row.oid = relation_row.relnamespace
    where not trigger_row.tgisinternal
      and namespace_row.nspname = 'public'
      and relation_row.relname = target.table_name
      and trigger_row.tgname in ('web_reval_ins', 'web_reval_upd', 'web_reval_del')
      and trigger_row.tgfoid = 'public.web_revalidate_trigger()'::regprocedure
      and trigger_row.tgenabled = 'O'
      and trigger_row.tgnargs = 3
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
      )
  ) <> 3;

  if v_bad_count <> 0 then
    raise exception 'web revalidation base trigger contract failed for % tables',
      v_bad_count;
  end if;

  select pg_catalog.count(*)::integer
  into v_bad_count
  from pg_catalog.pg_trigger as trigger_row
  where trigger_row.tgrelid = 'public.celebs'::regclass
    and trigger_row.tgname in (
      'web_reval_list_ins',
      'web_reval_list_upd',
      'web_reval_list_del'
    )
    and not trigger_row.tgisinternal
    and trigger_row.tgfoid = 'public.web_revalidate_celebs_list()'::regprocedure
    and trigger_row.tgenabled = 'O'
    and trigger_row.tgnargs = 0
    and (trigger_row.tgtype & 1) = 0
    and (trigger_row.tgtype & 2) = 0
    and (
      (
        trigger_row.tgname = 'web_reval_list_ins'
        and (trigger_row.tgtype & 4) = 4
        and trigger_row.tgnewtable = 'new_rows'
        and trigger_row.tgoldtable is null
      )
      or (
        trigger_row.tgname = 'web_reval_list_upd'
        and (trigger_row.tgtype & 16) = 16
        and trigger_row.tgnewtable = 'new_rows'
        and trigger_row.tgoldtable = 'old_rows'
      )
      or (
        trigger_row.tgname = 'web_reval_list_del'
        and (trigger_row.tgtype & 8) = 8
        and trigger_row.tgnewtable is null
        and trigger_row.tgoldtable = 'old_rows'
      )
    );

  if v_bad_count <> 3 then
    raise exception 'web revalidation celeb-list trigger contract mismatch: %',
      v_bad_count;
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc as procedure_row
    join pg_catalog.pg_namespace as namespace_row
      on namespace_row.oid = procedure_row.pronamespace
    where namespace_row.nspname = 'public'
      and procedure_row.proname = 'web_revalidate_attach'
  ) then
    raise exception 'web_revalidate_attach must not remain externally callable';
  end if;

  select pg_catalog.count(*)::integer
  into v_bad_count
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

  if v_bad_count <> 0 then
    raise exception 'web revalidation function security contract failed for % functions',
      v_bad_count;
  end if;

  select pg_catalog.count(*)::integer
  into v_bad_count
  from pg_catalog.pg_proc as procedure_row
  join pg_catalog.pg_namespace as namespace_row
    on namespace_row.oid = procedure_row.pronamespace
  where namespace_row.nspname = 'public'
    and pg_catalog.left(procedure_row.proname, 14) = 'web_revalidate';

  if v_bad_count <> 3 then
    raise exception 'unexpected public.web_revalidate* function count: %',
      v_bad_count;
  end if;
end;
$assert_contract$;
