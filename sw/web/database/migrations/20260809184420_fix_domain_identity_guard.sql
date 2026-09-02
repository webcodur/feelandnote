begin;

-- A RECORD trigger cannot safely reference fields from several unrelated
-- tables in one boolean expression.  PostgreSQL may resolve a field from a
-- non-matching branch before boolean short-circuiting, which broke
-- member_notifications updates on member_guestbook-only columns.  Enter the
-- table-specific branch first, then access only that table's row shape.
create or replace function private.guard_domain_relation_identity()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_table_name = 'member_guestbook_entries' then
    if new.id is distinct from old.id
       or new.owner_member_id is distinct from old.owner_member_id
       or new.author_member_id is distinct from old.author_member_id
       or new.created_at is distinct from old.created_at
    then
      raise exception 'Member guestbook identity is immutable'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'celeb_guestbook_entries' then
    if new.id is distinct from old.id
       or new.celeb_id is distinct from old.celeb_id
       or new.author_member_id is distinct from old.author_member_id
       or new.created_at is distinct from old.created_at
    then
      raise exception 'Celeb guestbook identity is immutable'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'member_notifications' then
    if new.id is distinct from old.id
       or new.member_id is distinct from old.member_id
       or new.actor_member_id is distinct from old.actor_member_id
       or new.created_at is distinct from old.created_at
    then
      raise exception 'Notification identity is immutable'
        using errcode = '42501';
    end if;
  else
    raise exception 'Unsupported identity-guard table: %', tg_table_name;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_domain_relation_identity()
from public, anon, authenticated, service_role;

commit;
