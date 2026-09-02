begin;

-- PostgREST 13 OpenAPI follows privileges only when deciding whether a table is
-- present. Once present, its write verbs describe structural writeability, not
-- the requesting role's grants. Keep the API-shape check for columns and RPC
-- signatures, but expose the actual authorization contract from pg_catalog.

revoke all on table public.celeb_timeline_research_runs
from public, anon, authenticated, service_role;
grant select on table public.celeb_timeline_research_runs to service_role;

revoke all on function public.enqueue_missing_celeb_timeline_backfill_jobs()
from public, anon, authenticated, service_role;
grant execute on function public.enqueue_missing_celeb_timeline_backfill_jobs()
to service_role;

revoke all on function public.claim_next_celeb_timeline_backfill(text, integer)
from public, anon, authenticated, service_role;
grant execute on function public.claim_next_celeb_timeline_backfill(text, integer)
to service_role;

revoke all on function public.renew_celeb_timeline_backfill_lease(uuid, text, uuid, integer)
from public, anon, authenticated, service_role;
grant execute on function public.renew_celeb_timeline_backfill_lease(uuid, text, uuid, integer)
to service_role;

revoke all on function public.complete_celeb_timeline_backfill(uuid, text, uuid, jsonb, text, jsonb)
from public, anon, authenticated, service_role;
grant execute on function public.complete_celeb_timeline_backfill(uuid, text, uuid, jsonb, text, jsonb)
to service_role;

revoke all on function public.correct_celeb_timeline_backfill(uuid, uuid, text, jsonb, text, jsonb, text)
from public, anon, authenticated, service_role;
grant execute on function public.correct_celeb_timeline_backfill(uuid, uuid, text, jsonb, text, jsonb, text)
to service_role;

revoke all on function public.fail_celeb_timeline_backfill(uuid, text, uuid, text, boolean, jsonb, text, jsonb)
from public, anon, authenticated, service_role;
grant execute on function public.fail_celeb_timeline_backfill(uuid, text, uuid, text, boolean, jsonb, text, jsonb)
to service_role;

revoke all on function public.requeue_celeb_timeline_backfill(uuid, text, boolean)
from public, anon, authenticated, service_role;
grant execute on function public.requeue_celeb_timeline_backfill(uuid, text, boolean)
to service_role;

revoke all on function public.get_celeb_timeline_backfill_status()
from public, anon, authenticated, service_role;
grant execute on function public.get_celeb_timeline_backfill_status()
to service_role;

create or replace function public.get_celeb_timeline_backfill_security_contract()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  with runs_relation as (
    select
      relation.oid,
      relation.relowner,
      relation.relacl,
      relation.relrowsecurity,
      relation.relforcerowsecurity
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'celeb_timeline_research_runs'
      and relation.relkind in ('r', 'p')
  ),
  service_role_relation as (
    select role_row.oid
    from pg_catalog.pg_roles as role_row
    where role_row.rolname = 'service_role'
  ),
  service_role_role_matrix as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'name', role_row.rolname,
        'canLogin', role_row.rolcanlogin,
        'superuser', role_row.rolsuper,
        'inherit', role_row.rolinherit,
        'createRole', role_row.rolcreaterole,
        'createDb', role_row.rolcreatedb,
        'replication', role_row.rolreplication,
        'bypassRls', role_row.rolbypassrls,
        'member', pg_has_role(role_row.oid, service_role_relation.oid, 'MEMBER'),
        'usage', pg_has_role(role_row.oid, service_role_relation.oid, 'USAGE'),
        'set', pg_has_role(role_row.oid, service_role_relation.oid, 'SET')
      )
      order by role_row.rolname
    ), '[]'::jsonb) as value
    from pg_catalog.pg_roles as role_row
    cross join service_role_relation
    where not role_row.rolsuper
      and (
        role_row.rolname in ('anon', 'authenticated')
        or pg_has_role(role_row.oid, service_role_relation.oid, 'MEMBER')
        or pg_has_role(role_row.oid, service_role_relation.oid, 'USAGE')
        or pg_has_role(role_row.oid, service_role_relation.oid, 'SET')
      )
  ),
  service_role_membership_edges as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'member', member_role.rolname,
        'grantedRole', granted_role.rolname,
        'grantor', grantor_role.rolname,
        'adminOption', membership.admin_option,
        'inheritOption', membership.inherit_option,
        'setOption', membership.set_option
      )
      order by member_role.rolname, granted_role.rolname, grantor_role.rolname
    ), '[]'::jsonb) as value
    from pg_catalog.pg_auth_members as membership
    join pg_catalog.pg_roles as granted_role on granted_role.oid = membership.roleid
    join pg_catalog.pg_roles as member_role on member_role.oid = membership.member
    join pg_catalog.pg_roles as grantor_role on grantor_role.oid = membership.grantor
    cross join service_role_relation
    where pg_has_role(granted_role.oid, service_role_relation.oid, 'MEMBER')
      or member_role.rolname in ('anon', 'authenticated', 'service_role')
  ),
  named_runs_privileges as (
    select
      role_spec.role_name,
      jsonb_build_object(
        'select',
          case
            when role_spec.role_name = 'service_role'::name
              then has_table_privilege(role_spec.role_name, runs_relation.oid, 'SELECT')
            else
              has_table_privilege(role_spec.role_name, runs_relation.oid, 'SELECT')
              or has_any_column_privilege(role_spec.role_name, runs_relation.oid, 'SELECT')
          end,
        'insert',
          has_table_privilege(role_spec.role_name, runs_relation.oid, 'INSERT')
          or has_any_column_privilege(role_spec.role_name, runs_relation.oid, 'INSERT'),
        'update',
          has_table_privilege(role_spec.role_name, runs_relation.oid, 'UPDATE')
          or has_any_column_privilege(role_spec.role_name, runs_relation.oid, 'UPDATE'),
        'delete', has_table_privilege(role_spec.role_name, runs_relation.oid, 'DELETE')
      ) as privileges
    from runs_relation
    cross join (
      values ('service_role'::name), ('anon'::name), ('authenticated'::name)
    ) as role_spec(role_name)
  ),
  public_runs_privileges as (
    select
      'public'::name as role_name,
      jsonb_build_object(
        'select',
          exists (
            select 1
            from aclexplode(coalesce(runs_relation_acl.relacl, acldefault('r', runs_relation_acl.relowner))) as privilege_row
            where privilege_row.grantee = 0 and privilege_row.privilege_type = 'SELECT'
          )
          or exists (
            select 1
            from pg_catalog.pg_attribute as attribute
            cross join lateral aclexplode(attribute.attacl) as privilege_row
            where attribute.attrelid = runs_relation_acl.oid
              and attribute.attnum > 0
              and not attribute.attisdropped
              and privilege_row.grantee = 0
              and privilege_row.privilege_type = 'SELECT'
          ),
        'insert',
          exists (
            select 1
            from aclexplode(coalesce(runs_relation_acl.relacl, acldefault('r', runs_relation_acl.relowner))) as privilege_row
            where privilege_row.grantee = 0 and privilege_row.privilege_type = 'INSERT'
          )
          or exists (
            select 1
            from pg_catalog.pg_attribute as attribute
            cross join lateral aclexplode(attribute.attacl) as privilege_row
            where attribute.attrelid = runs_relation_acl.oid
              and attribute.attnum > 0
              and not attribute.attisdropped
              and privilege_row.grantee = 0
              and privilege_row.privilege_type = 'INSERT'
          ),
        'update',
          exists (
            select 1
            from aclexplode(coalesce(runs_relation_acl.relacl, acldefault('r', runs_relation_acl.relowner))) as privilege_row
            where privilege_row.grantee = 0 and privilege_row.privilege_type = 'UPDATE'
          )
          or exists (
            select 1
            from pg_catalog.pg_attribute as attribute
            cross join lateral aclexplode(attribute.attacl) as privilege_row
            where attribute.attrelid = runs_relation_acl.oid
              and attribute.attnum > 0
              and not attribute.attisdropped
              and privilege_row.grantee = 0
              and privilege_row.privilege_type = 'UPDATE'
          ),
        'delete', exists (
          select 1
          from aclexplode(coalesce(runs_relation_acl.relacl, acldefault('r', runs_relation_acl.relowner))) as privilege_row
          where privilege_row.grantee = 0 and privilege_row.privilege_type = 'DELETE'
        )
      ) as privileges
    from pg_catalog.pg_class as runs_relation_acl
    where runs_relation_acl.oid = 'public.celeb_timeline_research_runs'::regclass
  ),
  runs_privileges as (
    select * from named_runs_privileges
    union all
    select * from public_runs_privileges
  ),
  runs_table_acl_tokens as (
    select
      case
        when privilege_row.grantee = 0 then 'public'
        else pg_get_userbyid(privilege_row.grantee)
      end as grantee_name,
      privilege_row.privilege_type as privilege_name,
      case
        when privilege_row.grantor = 0 then 'public'
        else pg_get_userbyid(privilege_row.grantor)
      end as grantor_name,
      privilege_row.is_grantable as grantable
    from runs_relation
    cross join lateral aclexplode(
      coalesce(runs_relation.relacl, acldefault('r', runs_relation.relowner))
    ) as privilege_row
  ),
  runs_column_acl_tokens as (
    select
      attribute.attname as column_name,
      case
        when privilege_row.grantee = 0 then 'public'
        else pg_get_userbyid(privilege_row.grantee)
      end as grantee_name,
      privilege_row.privilege_type as privilege_name,
      case
        when privilege_row.grantor = 0 then 'public'
        else pg_get_userbyid(privilege_row.grantor)
      end as grantor_name,
      privilege_row.is_grantable as grantable
    from runs_relation
    join pg_catalog.pg_attribute as attribute on attribute.attrelid = runs_relation.oid
    cross join lateral aclexplode(attribute.attacl) as privilege_row
    where attribute.attnum > 0
      and not attribute.attisdropped
  ),
  runs_acl_contract as (
    select
      jsonb_build_object(
        'table', coalesce((
          select jsonb_object_agg(grouped.grantee_name, grouped.privileges)
          from (
            select
              grantee_name,
              jsonb_agg(
                jsonb_build_object(
                  'privilege', privilege_name,
                  'grantor', grantor_name,
                  'grantable', grantable
                )
                order by privilege_name, grantor_name, grantable
              ) as privileges
            from runs_table_acl_tokens
            group by grantee_name
          ) as grouped
        ), '{}'::jsonb),
        'columns', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'column', column_name,
              'grantee', grantee_name,
              'privilege', privilege_name,
              'grantor', grantor_name,
              'grantable', grantable
            )
            order by column_name, grantee_name, privilege_name, grantor_name, grantable
          )
          from runs_column_acl_tokens
        ), '[]'::jsonb)
      ) as value,
      md5(
        'table:' || coalesce((
          select string_agg(
            grantee_name || ':' || privilege_name || ':' || grantor_name || ':' || grantable::text,
            ',' order by grantee_name, privilege_name, grantor_name, grantable
          )
          from runs_table_acl_tokens
        ), '')
        || '|columns:' || coalesce((
          select string_agg(
            column_name || ':' || grantee_name || ':' || privilege_name || ':' || grantor_name || ':' || grantable::text,
            ',' order by column_name, grantee_name, privilege_name, grantor_name, grantable
          )
          from runs_column_acl_tokens
        ), '')
      ) as fingerprint
  ),
  dependency_specs as (
    select *
    from (values
      ('celeb_task_queue'::text, 'public.celeb_task_queue'::regclass),
      ('celeb_timeline_events'::text, 'public.celeb_timeline_events'::regclass)
    ) as dependency(table_name, relation_oid)
  ),
  dependency_contracts as (
    select jsonb_object_agg(
      dependency.table_name,
      jsonb_build_object(
        'service_role', jsonb_build_object(
          'select',
            has_table_privilege('service_role', dependency.relation_oid, 'SELECT'),
          'insert',
            has_table_privilege('service_role', dependency.relation_oid, 'INSERT'),
          'update',
            has_table_privilege('service_role', dependency.relation_oid, 'UPDATE'),
          'delete', has_table_privilege('service_role', dependency.relation_oid, 'DELETE')
        )
      )
    ) as value
    from dependency_specs as dependency
  ),
  rpc_specs as (
    select *
    from (values
      (
        'enqueue_missing_celeb_timeline_backfill_jobs'::text,
        'public.enqueue_missing_celeb_timeline_backfill_jobs()'::text
      ),
      (
        'claim_next_celeb_timeline_backfill'::text,
        'public.claim_next_celeb_timeline_backfill(text,integer)'::text
      ),
      (
        'renew_celeb_timeline_backfill_lease'::text,
        'public.renew_celeb_timeline_backfill_lease(uuid,text,uuid,integer)'::text
      ),
      (
        'complete_celeb_timeline_backfill'::text,
        'public.complete_celeb_timeline_backfill(uuid,text,uuid,jsonb,text,jsonb)'::text
      ),
      (
        'correct_celeb_timeline_backfill'::text,
        'public.correct_celeb_timeline_backfill(uuid,uuid,text,jsonb,text,jsonb,text)'::text
      ),
      (
        'fail_celeb_timeline_backfill'::text,
        'public.fail_celeb_timeline_backfill(uuid,text,uuid,text,boolean,jsonb,text,jsonb)'::text
      ),
      (
        'requeue_celeb_timeline_backfill'::text,
        'public.requeue_celeb_timeline_backfill(uuid,text,boolean)'::text
      ),
      (
        'get_celeb_timeline_backfill_status'::text,
        'public.get_celeb_timeline_backfill_status()'::text
      ),
      (
        'get_celeb_timeline_backfill_security_contract'::text,
        'public.get_celeb_timeline_backfill_security_contract()'::text
      )
    ) as rpc(rpc_name, signature)
  ),
  rpc_contracts as (
    select jsonb_object_agg(
      rpc.rpc_name,
      jsonb_build_object(
        'signature', rpc.signature,
        'owner', pg_get_userbyid(procedure_row.proowner),
        'securityDefiner', procedure_row.prosecdef,
        'searchPath', coalesce(to_jsonb(procedure_row.proconfig), '[]'::jsonb),
        'execute', jsonb_build_object(
          'postgres', has_function_privilege('postgres', procedure_row.oid, 'EXECUTE'),
          'service_role', has_function_privilege('service_role', procedure_row.oid, 'EXECUTE'),
          'anon', has_function_privilege('anon', procedure_row.oid, 'EXECUTE'),
          'authenticated', has_function_privilege('authenticated', procedure_row.oid, 'EXECUTE'),
          'public', exists (
            select 1
            from aclexplode(coalesce(procedure_row.proacl, acldefault('f', procedure_row.proowner))) as privilege_row
            where privilege_row.grantee = 0
              and privilege_row.privilege_type = 'EXECUTE'
          )
        ),
        'executeGrantees', coalesce((
          select jsonb_agg(grantee.grantee_name order by grantee.grantee_name)
          from (
            select distinct case
              when privilege_row.grantee = 0 then 'public'
              else pg_get_userbyid(privilege_row.grantee)
            end as grantee_name
            from aclexplode(coalesce(procedure_row.proacl, acldefault('f', procedure_row.proowner))) as privilege_row
            where privilege_row.privilege_type = 'EXECUTE'
          ) as grantee
        ), '[]'::jsonb),
        'executeAcl', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'grantee', case
                when privilege_row.grantee = 0 then 'public'
                else pg_get_userbyid(privilege_row.grantee)
              end,
              'grantor', case
                when privilege_row.grantor = 0 then 'public'
                else pg_get_userbyid(privilege_row.grantor)
              end,
              'grantable', privilege_row.is_grantable
            )
            order by
              case when privilege_row.grantee = 0 then 'public' else pg_get_userbyid(privilege_row.grantee) end,
              case when privilege_row.grantor = 0 then 'public' else pg_get_userbyid(privilege_row.grantor) end,
              privilege_row.is_grantable
          )
          from aclexplode(coalesce(procedure_row.proacl, acldefault('f', procedure_row.proowner))) as privilege_row
          where privilege_row.privilege_type = 'EXECUTE'
        ), '[]'::jsonb)
      )
    ) as value
    from rpc_specs as rpc
    left join pg_catalog.pg_proc as procedure_row
      on procedure_row.oid = to_regprocedure(rpc.signature)
  )
  select jsonb_build_object(
    'schemaVersion', 2,
    'serviceRoleAccess', jsonb_build_object(
      'roleMatrix', (select value from service_role_role_matrix),
      'membershipEdges', (select value from service_role_membership_edges)
    ),
    'runs', (
      select jsonb_build_object(
        'owner', pg_get_userbyid(runs_relation.relowner),
        'rowLevelSecurity', runs_relation.relrowsecurity,
        'forceRowLevelSecurity', runs_relation.relforcerowsecurity,
        'serviceRole', (
          select jsonb_build_object(
            'bypassRls', role_row.rolbypassrls,
            'superuser', role_row.rolsuper,
            'inherit', role_row.rolinherit
          )
          from pg_catalog.pg_roles as role_row
          where role_row.rolname = 'service_role'
        ),
        'policyCount', (
          select count(*)
          from pg_catalog.pg_policy as policy
          where policy.polrelid = runs_relation.oid
        ),
        'privileges', (
          select jsonb_object_agg(role_name, privileges)
          from runs_privileges
        ),
        'acl', (select value from runs_acl_contract),
        'aclFingerprint', (select fingerprint from runs_acl_contract)
      )
      from runs_relation
    ),
    'dependencies', (select value from dependency_contracts),
    'rpcs', (select value from rpc_contracts)
  )
$$;

alter function public.get_celeb_timeline_backfill_security_contract()
owner to postgres;

revoke all on function public.get_celeb_timeline_backfill_security_contract()
from public, anon, authenticated, service_role;
grant execute on function public.get_celeb_timeline_backfill_security_contract()
to service_role;

do $audit$
declare
  v_actual jsonb;
  v_expected constant jsonb := $expected$
  {
    "schemaVersion": 2,
    "serviceRoleAccess": {
      "roleMatrix": [
        { "name": "anon", "canLogin": false, "superuser": false, "inherit": true, "createRole": false, "createDb": false, "replication": false, "bypassRls": false, "member": false, "usage": false, "set": false },
        { "name": "authenticated", "canLogin": false, "superuser": false, "inherit": true, "createRole": false, "createDb": false, "replication": false, "bypassRls": false, "member": false, "usage": false, "set": false },
        { "name": "authenticator", "canLogin": true, "superuser": false, "inherit": false, "createRole": false, "createDb": false, "replication": false, "bypassRls": false, "member": true, "usage": false, "set": true },
        { "name": "cli_login_postgres", "canLogin": true, "superuser": false, "inherit": false, "createRole": false, "createDb": false, "replication": false, "bypassRls": false, "member": true, "usage": false, "set": true },
        { "name": "postgres", "canLogin": true, "superuser": false, "inherit": true, "createRole": true, "createDb": true, "replication": true, "bypassRls": true, "member": true, "usage": true, "set": true },
        { "name": "service_role", "canLogin": false, "superuser": false, "inherit": true, "createRole": false, "createDb": false, "replication": false, "bypassRls": true, "member": true, "usage": true, "set": true },
        { "name": "supabase_storage_admin", "canLogin": true, "superuser": false, "inherit": false, "createRole": true, "createDb": false, "replication": false, "bypassRls": false, "member": true, "usage": false, "set": true }
      ],
      "membershipEdges": [
        { "member": "authenticator", "grantedRole": "service_role", "grantor": "supabase_admin", "adminOption": false, "inheritOption": false, "setOption": true },
        { "member": "cli_login_postgres", "grantedRole": "postgres", "grantor": "supabase_admin", "adminOption": false, "inheritOption": false, "setOption": true },
        { "member": "postgres", "grantedRole": "authenticator", "grantor": "supabase_admin", "adminOption": true, "inheritOption": true, "setOption": true },
        { "member": "postgres", "grantedRole": "service_role", "grantor": "supabase_admin", "adminOption": true, "inheritOption": true, "setOption": true },
        { "member": "supabase_storage_admin", "grantedRole": "authenticator", "grantor": "supabase_admin", "adminOption": false, "inheritOption": false, "setOption": true }
      ]
    },
    "runs": {
      "owner": "postgres",
      "rowLevelSecurity": true,
      "forceRowLevelSecurity": true,
      "serviceRole": { "bypassRls": true, "superuser": false, "inherit": true },
      "policyCount": 0,
      "privileges": {
        "service_role": { "select": true, "insert": false, "update": false, "delete": false },
        "anon": { "select": false, "insert": false, "update": false, "delete": false },
        "authenticated": { "select": false, "insert": false, "update": false, "delete": false },
        "public": { "select": false, "insert": false, "update": false, "delete": false }
      },
      "acl": {
        "table": {
          "postgres": [
            { "privilege": "DELETE", "grantor": "postgres", "grantable": false },
            { "privilege": "INSERT", "grantor": "postgres", "grantable": false },
            { "privilege": "MAINTAIN", "grantor": "postgres", "grantable": false },
            { "privilege": "REFERENCES", "grantor": "postgres", "grantable": false },
            { "privilege": "SELECT", "grantor": "postgres", "grantable": false },
            { "privilege": "TRIGGER", "grantor": "postgres", "grantable": false },
            { "privilege": "TRUNCATE", "grantor": "postgres", "grantable": false },
            { "privilege": "UPDATE", "grantor": "postgres", "grantable": false }
          ],
          "service_role": [
            { "privilege": "SELECT", "grantor": "postgres", "grantable": false }
          ]
        },
        "columns": []
      },
      "aclFingerprint": "8bb0deffc486351368b9ae3d9fb840d2"
    },
    "dependencies": {
      "celeb_task_queue": {
        "service_role": { "select": true, "insert": true, "update": true, "delete": true }
      },
      "celeb_timeline_events": {
        "service_role": { "select": true, "insert": true, "update": true, "delete": true }
      }
    },
    "rpcs": {
      "enqueue_missing_celeb_timeline_backfill_jobs": {
        "signature": "public.enqueue_missing_celeb_timeline_backfill_jobs()",
        "owner": "postgres", "securityDefiner": true, "searchPath": ["search_path=pg_catalog"],
        "execute": { "postgres": true, "service_role": true, "anon": false, "authenticated": false, "public": false },
        "executeGrantees": ["postgres", "service_role"],
        "executeAcl": [
          { "grantee": "postgres", "grantor": "postgres", "grantable": false },
          { "grantee": "service_role", "grantor": "postgres", "grantable": false }
        ]
      },
      "claim_next_celeb_timeline_backfill": {
        "signature": "public.claim_next_celeb_timeline_backfill(text,integer)",
        "owner": "postgres", "securityDefiner": true, "searchPath": ["search_path=pg_catalog"],
        "execute": { "postgres": true, "service_role": true, "anon": false, "authenticated": false, "public": false },
        "executeGrantees": ["postgres", "service_role"],
        "executeAcl": [
          { "grantee": "postgres", "grantor": "postgres", "grantable": false },
          { "grantee": "service_role", "grantor": "postgres", "grantable": false }
        ]
      },
      "renew_celeb_timeline_backfill_lease": {
        "signature": "public.renew_celeb_timeline_backfill_lease(uuid,text,uuid,integer)",
        "owner": "postgres", "securityDefiner": true, "searchPath": ["search_path=pg_catalog"],
        "execute": { "postgres": true, "service_role": true, "anon": false, "authenticated": false, "public": false },
        "executeGrantees": ["postgres", "service_role"],
        "executeAcl": [
          { "grantee": "postgres", "grantor": "postgres", "grantable": false },
          { "grantee": "service_role", "grantor": "postgres", "grantable": false }
        ]
      },
      "complete_celeb_timeline_backfill": {
        "signature": "public.complete_celeb_timeline_backfill(uuid,text,uuid,jsonb,text,jsonb)",
        "owner": "postgres", "securityDefiner": true, "searchPath": ["search_path=pg_catalog"],
        "execute": { "postgres": true, "service_role": true, "anon": false, "authenticated": false, "public": false },
        "executeGrantees": ["postgres", "service_role"],
        "executeAcl": [
          { "grantee": "postgres", "grantor": "postgres", "grantable": false },
          { "grantee": "service_role", "grantor": "postgres", "grantable": false }
        ]
      },
      "correct_celeb_timeline_backfill": {
        "signature": "public.correct_celeb_timeline_backfill(uuid,uuid,text,jsonb,text,jsonb,text)",
        "owner": "postgres", "securityDefiner": true, "searchPath": ["search_path=pg_catalog"],
        "execute": { "postgres": true, "service_role": true, "anon": false, "authenticated": false, "public": false },
        "executeGrantees": ["postgres", "service_role"],
        "executeAcl": [
          { "grantee": "postgres", "grantor": "postgres", "grantable": false },
          { "grantee": "service_role", "grantor": "postgres", "grantable": false }
        ]
      },
      "fail_celeb_timeline_backfill": {
        "signature": "public.fail_celeb_timeline_backfill(uuid,text,uuid,text,boolean,jsonb,text,jsonb)",
        "owner": "postgres", "securityDefiner": true, "searchPath": ["search_path=pg_catalog"],
        "execute": { "postgres": true, "service_role": true, "anon": false, "authenticated": false, "public": false },
        "executeGrantees": ["postgres", "service_role"],
        "executeAcl": [
          { "grantee": "postgres", "grantor": "postgres", "grantable": false },
          { "grantee": "service_role", "grantor": "postgres", "grantable": false }
        ]
      },
      "requeue_celeb_timeline_backfill": {
        "signature": "public.requeue_celeb_timeline_backfill(uuid,text,boolean)",
        "owner": "postgres", "securityDefiner": true, "searchPath": ["search_path=pg_catalog"],
        "execute": { "postgres": true, "service_role": true, "anon": false, "authenticated": false, "public": false },
        "executeGrantees": ["postgres", "service_role"],
        "executeAcl": [
          { "grantee": "postgres", "grantor": "postgres", "grantable": false },
          { "grantee": "service_role", "grantor": "postgres", "grantable": false }
        ]
      },
      "get_celeb_timeline_backfill_status": {
        "signature": "public.get_celeb_timeline_backfill_status()",
        "owner": "postgres", "securityDefiner": true, "searchPath": ["search_path=pg_catalog"],
        "execute": { "postgres": true, "service_role": true, "anon": false, "authenticated": false, "public": false },
        "executeGrantees": ["postgres", "service_role"],
        "executeAcl": [
          { "grantee": "postgres", "grantor": "postgres", "grantable": false },
          { "grantee": "service_role", "grantor": "postgres", "grantable": false }
        ]
      },
      "get_celeb_timeline_backfill_security_contract": {
        "signature": "public.get_celeb_timeline_backfill_security_contract()",
        "owner": "postgres", "securityDefiner": true, "searchPath": ["search_path=pg_catalog"],
        "execute": { "postgres": true, "service_role": true, "anon": false, "authenticated": false, "public": false },
        "executeGrantees": ["postgres", "service_role"],
        "executeAcl": [
          { "grantee": "postgres", "grantor": "postgres", "grantable": false },
          { "grantee": "service_role", "grantor": "postgres", "grantable": false }
        ]
      }
    }
  }
  $expected$::jsonb;
begin
  select public.get_celeb_timeline_backfill_security_contract()
  into v_actual;

  if v_actual is distinct from v_expected then
    raise exception 'timeline security contract mismatch: actual=% expected=%', v_actual, v_expected;
  end if;
end;
$audit$;

notify pgrst, 'reload schema';

commit;
