begin;

-- This table is an operational recovery snapshot, not an application API.
-- Keep it readable only by the server-side service role and enforce RLS as
-- defense in depth while it remains in the exposed public schema.
do $$
begin
  if to_regclass('public.meta_reharvest_backup_20260801') is not null then
    revoke all privileges on table public.meta_reharvest_backup_20260801
      from public, anon, authenticated, service_role;
    grant select on table public.meta_reharvest_backup_20260801
      to service_role;
    alter table public.meta_reharvest_backup_20260801
      enable row level security;
  end if;
end
$$;

-- The compatibility view is read-only to API roles. Run it with the caller's
-- privileges so the underlying profiles RLS is never bypassed.
do $$
begin
  if to_regclass('public.profiles_compat') is not null then
    alter view public.profiles_compat
      set (security_invoker = true);
    revoke all privileges on table public.profiles_compat
      from public, anon, authenticated, service_role;
    grant select on table public.profiles_compat
      to anon, authenticated, service_role;
  end if;
end
$$;

notify pgrst, 'reload schema';

commit;
