-- Keep reading publication derived from its two source-of-truth fields:
-- a reviewed explanation is public exactly while its celeb is active.
--
-- The explanation trigger covers direct writes (including attempts to write
-- published_at manually). The celeb trigger uses transition tables so one
-- bulk status change produces one set-based update instead of N statements.
-- Intentionally omit authored BEGIN/COMMIT. Supabase CLI 2.115.0 applies this
-- file and its schema_migrations history row in one transaction.

create or replace function public.lock_celeb_explanation_publication_writes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
begin
  if not (
    (
      tg_op in ('INSERT', 'UPDATE')
      and tg_table_schema = 'public'
      and tg_table_name = 'celeb_explanations'
    )
    or (
      tg_op = 'UPDATE'
      and tg_table_schema = 'public'
      and tg_table_name = 'celebs'
    )
  ) then
    raise exception
      'lock_celeb_explanation_publication_writes called from an unsupported trigger';
  end if;

  -- Both write paths acquire this transaction lock in a BEFORE STATEMENT
  -- trigger, before either parent or child rows are locked. That removes the
  -- parent->child / child->parent lock inversion while preserving the invariant
  -- under concurrent direct SQL and API writes.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'feelandnote.celeb_explanation.publication',
      0
    )
  );

  return null;
end;
$function$;

create or replace function public.set_celeb_explanation_published_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_publication_status text;
begin
  if tg_op not in ('INSERT', 'UPDATE')
     or tg_table_schema <> 'public'
     or tg_table_name <> 'celeb_explanations'
  then
    raise exception
      'set_celeb_explanation_published_at called from an unsupported trigger';
  end if;

  -- A SHARE row lock serializes this decision with concurrent changes to the
  -- parent celeb's publication_status. It is only taken when one of the three
  -- invariant inputs is written, not for ordinary body-copy edits.
  select celeb.publication_status
  into v_publication_status
  from public.celebs as celeb
  where celeb.id = new.profile_id
  for share;

  if not found then
    raise exception using
      errcode = '23503',
      message = pg_catalog.format(
        'celeb_explanations.profile_id %s does not reference public.celebs',
        new.profile_id
      );
  end if;

  if v_publication_status = 'active' and new.review_status is not null then
    new.published_at := coalesce(
      new.published_at,
      pg_catalog.statement_timestamp()
    );
  else
    new.published_at := null;
  end if;

  return new;
end;
$function$;

create or replace function public.sync_celeb_explanation_publication_from_celebs()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
begin
  if tg_op <> 'UPDATE'
     or tg_table_schema <> 'public'
     or tg_table_name <> 'celebs'
  then
    raise exception
      'sync_celeb_explanation_publication_from_celebs called from an unsupported trigger';
  end if;

  with changed_celeb as (
    select
      new_celeb.id,
      new_celeb.publication_status = 'active' as is_active
    from new_rows as new_celeb
    join old_rows as old_celeb on old_celeb.id = new_celeb.id
    where old_celeb.publication_status
      is distinct from new_celeb.publication_status
  )
  update public.celeb_explanations as explanation
  set published_at = case
    when changed_celeb.is_active and explanation.review_status is not null
      then coalesce(
        explanation.published_at,
        pg_catalog.statement_timestamp()
      )
    else null
  end
  from changed_celeb
  where explanation.profile_id = changed_celeb.id
    and (
      (
        changed_celeb.is_active
        and explanation.review_status is not null
        and explanation.published_at is null
      )
      or (
        (
          not changed_celeb.is_active
          or explanation.review_status is null
        )
        and explanation.published_at is not null
      )
    );

  return null;
end;
$function$;

alter function public.lock_celeb_explanation_publication_writes()
  owner to postgres;
alter function public.set_celeb_explanation_published_at() owner to postgres;
alter function public.sync_celeb_explanation_publication_from_celebs()
  owner to postgres;

revoke all on function public.lock_celeb_explanation_publication_writes()
from public, anon, authenticated, service_role;
revoke all on function public.set_celeb_explanation_published_at()
from public, anon, authenticated, service_role;
revoke all on function public.sync_celeb_explanation_publication_from_celebs()
from public, anon, authenticated, service_role;

-- CREATE OR REPLACE preserves prior ACLs. Remove direct EXECUTE grants from
-- custom roles too, so neither trigger function can become a Data API RPC.
do $reset_function_acl$
declare
  v_function record;
  v_grantee name;
begin
  for v_function in
    select *
    from (values
      (
        'public.lock_celeb_explanation_publication_writes()'::regprocedure,
        'public.lock_celeb_explanation_publication_writes()'
      ),
      (
        'public.set_celeb_explanation_published_at()'::regprocedure,
        'public.set_celeb_explanation_published_at()'
      ),
      (
        'public.sync_celeb_explanation_publication_from_celebs()'::regprocedure,
        'public.sync_celeb_explanation_publication_from_celebs()'
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

grant execute on function public.lock_celeb_explanation_publication_writes()
to postgres;
grant execute on function public.set_celeb_explanation_published_at()
to postgres;
grant execute on function public.sync_celeb_explanation_publication_from_celebs()
to postgres;

drop trigger if exists trg_lock_celeb_explanation_publication_write
on public.celeb_explanations;

create trigger trg_lock_celeb_explanation_publication_write
before insert or update of profile_id, review_status, published_at
on public.celeb_explanations
for each statement
execute function public.lock_celeb_explanation_publication_writes();

drop trigger if exists trg_set_celeb_explanation_published_at
on public.celeb_explanations;

create trigger trg_set_celeb_explanation_published_at
before insert or update of profile_id, review_status, published_at
on public.celeb_explanations
for each row
execute function public.set_celeb_explanation_published_at();

drop trigger if exists trg_lock_celeb_explanation_publication_status
on public.celebs;

create trigger trg_lock_celeb_explanation_publication_status
before update of publication_status
on public.celebs
for each statement
execute function public.lock_celeb_explanation_publication_writes();

drop trigger if exists trg_sync_celeb_explanation_publication_from_celebs
on public.celebs;

create trigger trg_sync_celeb_explanation_publication_from_celebs
after update on public.celebs
referencing old table as old_rows new table as new_rows
for each statement
execute function public.sync_celeb_explanation_publication_from_celebs();

-- This migration follows the web-revalidation hardening migration. Refuse to
-- perform the backfill unless its exact explanation UPDATE trigger is present
-- and enabled; disabling an unexpected trigger would hide a deployment drift.
do $assert_web_revalidation_ready$
declare
  v_trigger_count integer;
begin
  select pg_catalog.count(*)::integer
  into v_trigger_count
  from pg_catalog.pg_trigger as trigger_row
  where trigger_row.tgrelid = 'public.celeb_explanations'::regclass
    and trigger_row.tgname = 'web_reval_upd'
    and not trigger_row.tgisinternal
    and trigger_row.tgfoid = 'public.web_revalidate_trigger()'::regprocedure
    and trigger_row.tgenabled = 'O'
    and trigger_row.tgtype = 16
    and trigger_row.tgnewtable = 'new_rows'
    and trigger_row.tgoldtable = 'old_rows';

  if v_trigger_count <> 1 then
    raise exception
      'expected one enabled statement-level celeb_explanations.web_reval_upd trigger, found %',
      v_trigger_count;
  end if;
end;
$assert_web_revalidation_ready$;

-- The backfill changes many rows but represents one release boundary. Suppress
-- only its cache trigger; integrity and updated_at triggers remain enabled.
-- ALTER TRIGGER state is transactional, so any later assertion failure rolls
-- both the data changes and this temporary disable back atomically.
alter table public.celeb_explanations disable trigger web_reval_upd;

update public.celeb_explanations as explanation
set published_at = case
  when celeb.publication_status = 'active'
       and explanation.review_status is not null
    then coalesce(
      explanation.published_at,
      pg_catalog.statement_timestamp()
    )
  else null
end
from public.celebs as celeb
where celeb.id = explanation.profile_id
  and (
    (
      celeb.publication_status = 'active'
      and explanation.review_status is not null
      and explanation.published_at is null
    )
    or (
      (
        celeb.publication_status <> 'active'
        or explanation.review_status is null
      )
      and explanation.published_at is not null
    )
  );

do $assert_backfill$
declare
  v_mismatch_count bigint;
  v_orphan_count bigint;
begin
  select pg_catalog.count(*)
  into v_orphan_count
  from public.celeb_explanations as explanation
  left join public.celebs as celeb on celeb.id = explanation.profile_id
  where celeb.id is null;

  if v_orphan_count <> 0 then
    raise exception
      'celeb explanation publication invariant found % orphan rows',
      v_orphan_count;
  end if;

  select pg_catalog.count(*)
  into v_mismatch_count
  from public.celeb_explanations as explanation
  join public.celebs as celeb on celeb.id = explanation.profile_id
  where (explanation.published_at is not null)
    is distinct from (
      celeb.publication_status = 'active'
      and explanation.review_status is not null
    );

  if v_mismatch_count <> 0 then
    raise exception
      'celeb explanation publication invariant still has % mismatches',
      v_mismatch_count;
  end if;
end;
$assert_backfill$;

alter table public.celeb_explanations enable trigger web_reval_upd;

do $assert_contract$
declare
  v_bad_function_count integer;
  v_explanation_lock_trigger_count integer;
  v_explanation_trigger_count integer;
  v_celeb_lock_trigger_count integer;
  v_celeb_trigger_count integer;
  v_web_trigger_count integer;
begin
  select pg_catalog.count(*)::integer
  into v_bad_function_count
  from pg_catalog.unnest(array[
    'public.lock_celeb_explanation_publication_writes()'::regprocedure,
    'public.set_celeb_explanation_published_at()'::regprocedure,
    'public.sync_celeb_explanation_publication_from_celebs()'::regprocedure
  ]) as expected(function_oid)
  join pg_catalog.pg_proc as procedure_row
    on procedure_row.oid = expected.function_oid
  where not procedure_row.prosecdef
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
    );

  if v_bad_function_count <> 0 then
    raise exception
      'celeb explanation publication function security contract failed for % functions',
      v_bad_function_count;
  end if;

  select pg_catalog.count(*)::integer
  into v_explanation_lock_trigger_count
  from pg_catalog.pg_trigger as trigger_row
  cross join lateral (
    select pg_catalog.array_agg(
      attribute_row.attname::text
      order by attribute_row.attname::text
    ) as column_names
    from pg_catalog.unnest(trigger_row.tgattr::smallint[]) as trigger_column(attnum)
    join pg_catalog.pg_attribute as attribute_row
      on attribute_row.attrelid = trigger_row.tgrelid
     and attribute_row.attnum = trigger_column.attnum
  ) as trigger_columns
  where trigger_row.tgrelid = 'public.celeb_explanations'::regclass
    and trigger_row.tgname = 'trg_lock_celeb_explanation_publication_write'
    and not trigger_row.tgisinternal
    and trigger_row.tgfoid =
      'public.lock_celeb_explanation_publication_writes()'::regprocedure
    and trigger_row.tgenabled = 'O'
    and trigger_row.tgtype = 22
    and trigger_row.tgnargs = 0
    and trigger_row.tgnewtable is null
    and trigger_row.tgoldtable is null
    and trigger_columns.column_names =
      array['profile_id', 'published_at', 'review_status']::text[];

  if v_explanation_lock_trigger_count <> 1 then
    raise exception
      'celeb_explanations publication lock trigger contract mismatch: %',
      v_explanation_lock_trigger_count;
  end if;

  select pg_catalog.count(*)::integer
  into v_explanation_trigger_count
  from pg_catalog.pg_trigger as trigger_row
  cross join lateral (
    select pg_catalog.array_agg(
      attribute_row.attname::text
      order by attribute_row.attname::text
    ) as column_names
    from pg_catalog.unnest(trigger_row.tgattr::smallint[]) as trigger_column(attnum)
    join pg_catalog.pg_attribute as attribute_row
      on attribute_row.attrelid = trigger_row.tgrelid
     and attribute_row.attnum = trigger_column.attnum
  ) as trigger_columns
  where trigger_row.tgrelid = 'public.celeb_explanations'::regclass
    and trigger_row.tgname = 'trg_set_celeb_explanation_published_at'
    and not trigger_row.tgisinternal
    and trigger_row.tgfoid =
      'public.set_celeb_explanation_published_at()'::regprocedure
    and trigger_row.tgenabled = 'O'
    and trigger_row.tgtype = 23
    and trigger_row.tgnargs = 0
    and trigger_row.tgnewtable is null
    and trigger_row.tgoldtable is null
    and trigger_columns.column_names =
      array['profile_id', 'published_at', 'review_status']::text[];

  if v_explanation_trigger_count <> 1 then
    raise exception
      'celeb_explanations publication trigger contract mismatch: %',
      v_explanation_trigger_count;
  end if;

  select pg_catalog.count(*)::integer
  into v_celeb_lock_trigger_count
  from pg_catalog.pg_trigger as trigger_row
  cross join lateral (
    select pg_catalog.array_agg(
      attribute_row.attname::text
      order by attribute_row.attname::text
    ) as column_names
    from pg_catalog.unnest(trigger_row.tgattr::smallint[]) as trigger_column(attnum)
    join pg_catalog.pg_attribute as attribute_row
      on attribute_row.attrelid = trigger_row.tgrelid
     and attribute_row.attnum = trigger_column.attnum
  ) as trigger_columns
  where trigger_row.tgrelid = 'public.celebs'::regclass
    and trigger_row.tgname =
      'trg_lock_celeb_explanation_publication_status'
    and not trigger_row.tgisinternal
    and trigger_row.tgfoid =
      'public.lock_celeb_explanation_publication_writes()'::regprocedure
    and trigger_row.tgenabled = 'O'
    and trigger_row.tgtype = 18
    and trigger_row.tgnargs = 0
    and trigger_row.tgnewtable is null
    and trigger_row.tgoldtable is null
    and trigger_columns.column_names = array['publication_status']::text[];

  if v_celeb_lock_trigger_count <> 1 then
    raise exception
      'celebs explanation-publication lock trigger contract mismatch: %',
      v_celeb_lock_trigger_count;
  end if;

  select pg_catalog.count(*)::integer
  into v_celeb_trigger_count
  from pg_catalog.pg_trigger as trigger_row
  where trigger_row.tgrelid = 'public.celebs'::regclass
    and trigger_row.tgname =
      'trg_sync_celeb_explanation_publication_from_celebs'
    and not trigger_row.tgisinternal
    and trigger_row.tgfoid =
      'public.sync_celeb_explanation_publication_from_celebs()'::regprocedure
    and trigger_row.tgenabled = 'O'
    and trigger_row.tgtype = 16
    and trigger_row.tgnargs = 0
    and trigger_row.tgnewtable = 'new_rows'
    and trigger_row.tgoldtable = 'old_rows';

  if v_celeb_trigger_count <> 1 then
    raise exception
      'celebs explanation-publication sync trigger contract mismatch: %',
      v_celeb_trigger_count;
  end if;

  select pg_catalog.count(*)::integer
  into v_web_trigger_count
  from pg_catalog.pg_trigger as trigger_row
  where trigger_row.tgrelid = 'public.celeb_explanations'::regclass
    and trigger_row.tgname = 'web_reval_upd'
    and not trigger_row.tgisinternal
    and trigger_row.tgfoid = 'public.web_revalidate_trigger()'::regprocedure
    and trigger_row.tgenabled = 'O'
    and trigger_row.tgtype = 16
    and trigger_row.tgnewtable = 'new_rows'
    and trigger_row.tgoldtable = 'old_rows';

  if v_web_trigger_count <> 1 then
    raise exception
      'celeb_explanations.web_reval_upd was not restored: %',
      v_web_trigger_count;
  end if;
end;
$assert_contract$;
