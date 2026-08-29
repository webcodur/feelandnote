begin;

create or replace function public.delete_auth_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  has_account boolean;
  has_member boolean;
  has_celeb boolean;
begin
  select exists (
    select 1 from public.user_accounts where id = $1
  ) into has_account;
  select exists (
    select 1 from public.member_profiles where id = $1
  ) into has_member;
  select exists (
    select 1 from public.celebs where id = $1
  ) into has_celeb;

  if has_account or has_member then
    if not has_account or not has_member or has_celeb then
      raise exception 'Member account domain mismatch: %', $1
        using errcode = '23514';
    end if;

    update public.records
    set contributor_id = null
    where contributor_id = $1;

    update public.member_contents
    set contributor_member_id = null
    where contributor_member_id = $1;

    update public.celeb_contents
    set contributor_member_id = null
    where contributor_member_id = $1;

    update public.reports
    set resolved_by = null
    where resolved_by = $1;

    delete from public.user_accounts
    where id = $1;

    if not found then
      raise exception 'Member account not found: %', $1
        using errcode = 'P0002';
    end if;

    delete from auth.users where id = $1;
    return;
  end if;

  if has_celeb then
    delete from public.celebs where id = $1;
    if not found then
      raise exception 'Celeb not found: %', $1
        using errcode = 'P0002';
    end if;

    delete from auth.users where id = $1;
    return;
  end if;

  raise exception 'Profile domain not found: %', $1
    using errcode = 'P0002';
end;
$function$;

-- Logical restores can recreate functions under permissive public default ACLs.
-- Restore the explicit boundaries required by the application.
revoke all on function public.delete_auth_user(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.delete_auth_user(uuid) to service_role;

revoke all on function public.delete_my_account()
from public, anon, authenticated, service_role;
grant execute on function public.delete_my_account() to authenticated;

revoke all on function public.admin_delete_auth_user(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.admin_delete_auth_user(uuid) to authenticated;

revoke all on function public.handle_new_user()
from public, anon, authenticated, service_role;

do $acl$
declare
  function_signature text;
  function_oid regprocedure;
begin
  foreach function_signature in array array[
    'public.assert_celeb_content_research_run_ready(uuid)',
    'public.complete_celeb_content_research_run(uuid)',
    'public.claim_next_celeb_philosophy_rewrite(text,integer)',
    'public.enqueue_missing_celeb_philosophy_rewrite_jobs()',
    'public.faction_replace_episode(text,jsonb,jsonb,jsonb,jsonb,jsonb,timestamp with time zone)',
    'public.discourse_replace_episode(text,jsonb,jsonb,jsonb,timestamp with time zone)',
    'public.set_celeb_quote(uuid,text,text)',
    'public.set_fiction_narrative_events(uuid,jsonb)',
    'public.set_fiction_source_characters(text,uuid[])',
    'public.update_influence(uuid)'
  ]
  loop
    function_oid := pg_catalog.to_regprocedure(function_signature);
    if function_oid is null then
      continue;
    end if;

    execute pg_catalog.format(
      'revoke all on function %s from public, anon, authenticated, service_role',
      function_oid
    );
    execute pg_catalog.format(
      'grant execute on function %s to service_role',
      function_oid
    );
  end loop;
end;
$acl$;

do $verify$
declare
  delete_oid oid := pg_catalog.to_regprocedure('public.delete_auth_user(uuid)');
  self_delete_oid oid := pg_catalog.to_regprocedure('public.delete_my_account()');
  admin_delete_oid oid := pg_catalog.to_regprocedure('public.admin_delete_auth_user(uuid)');
begin
  if delete_oid is null or self_delete_oid is null or admin_delete_oid is null then
    raise exception 'required account deletion function is missing';
  end if;

  if pg_catalog.has_function_privilege('anon', delete_oid, 'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated', delete_oid, 'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role', delete_oid, 'EXECUTE') then
    raise exception 'delete_auth_user EXECUTE privileges differ';
  end if;

  if pg_catalog.has_function_privilege('anon', self_delete_oid, 'EXECUTE')
     or not pg_catalog.has_function_privilege('authenticated', self_delete_oid, 'EXECUTE') then
    raise exception 'delete_my_account EXECUTE privileges differ';
  end if;

  if pg_catalog.has_function_privilege('anon', admin_delete_oid, 'EXECUTE')
     or not pg_catalog.has_function_privilege('authenticated', admin_delete_oid, 'EXECUTE') then
    raise exception 'admin_delete_auth_user EXECUTE privileges differ';
  end if;
end;
$verify$;

notify pgrst, 'reload schema';

commit;
