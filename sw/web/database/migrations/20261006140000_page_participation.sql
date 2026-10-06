begin;

create table public.celeb_likes (
  celeb_id uuid not null references public.celebs(id) on delete cascade,
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  votes bigint not null default 1 check (votes > 0),
  last_liked_at timestamptz not null default now(),
  primary key (celeb_id, visitor_hash)
);

create table public.faction_likes (
  faction_id uuid not null references public.faction_lv2(id) on delete cascade,
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  votes bigint not null default 1 check (votes > 0),
  last_liked_at timestamptz not null default now(),
  primary key (faction_id, visitor_hash)
);

alter table public.celeb_likes enable row level security;
alter table public.faction_likes enable row level security;
revoke all on public.celeb_likes, public.faction_likes from anon, authenticated;
grant all on public.celeb_likes, public.faction_likes to service_role;

alter table public.faction_lv2 add column view_count bigint not null default 0 check (view_count >= 0);

-- 방문자 해시는 서버만 넘긴다. 제한 시간은 page-engagement.ts의 공용 상수를 사용한다.
create or replace function public.page_likes(
  p_kind text, p_target_id uuid, p_visitor_hash text, p_like boolean, p_cooldown_seconds integer
)
returns table (like_count bigint, next_like_at timestamptz, accepted boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_table text;
  v_column text;
  v_accepted boolean := false;
  v_next timestamptz;
  v_count bigint;
begin
  if p_visitor_hash is null or p_visitor_hash !~ '^[0-9a-f]{64}$'
    or p_cooldown_seconds is null or p_cooldown_seconds <= 0 then
    raise exception 'Invalid participation request';
  end if;
  if p_kind = 'celeb' then
    if not exists (select 1 from public.celebs where id = p_target_id and publication_status = 'active') then return; end if;
    v_table := 'celeb_likes'; v_column := 'celeb_id';
  elsif p_kind = 'faction' then
    if not exists (select 1 from public.faction_lv2 where id = p_target_id and (not is_myth or published)) then return; end if;
    v_table := 'faction_likes'; v_column := 'faction_id';
  else
    raise exception 'Invalid participation target';
  end if;

  if p_like then
    execute pg_catalog.format(
      'insert into public.%I as votes (%I, visitor_hash, votes, last_liked_at) values ($1, $2, 1, now())
       on conflict (%I, visitor_hash) do update set votes = votes.votes + 1, last_liked_at = now()
       where votes.last_liked_at <= now() - pg_catalog.make_interval(secs => $3)
       returning true', v_table, v_column, v_column
    ) into v_accepted using p_target_id, p_visitor_hash, p_cooldown_seconds;
  end if;

  execute pg_catalog.format(
    'select coalesce(sum(votes), 0)::bigint from public.%I where %I = $1', v_table, v_column
  ) into v_count using p_target_id;
  execute pg_catalog.format(
    'select last_liked_at + pg_catalog.make_interval(secs => $3) from public.%I where %I = $1 and visitor_hash = $2',
    v_table, v_column
  ) into v_next using p_target_id, p_visitor_hash, p_cooldown_seconds;
  return query select v_count, v_next, coalesce(v_accepted, false);
end;
$$;

create or replace function public.increment_faction_view(p_faction_id uuid, p_increment boolean)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_count bigint;
begin
  if p_increment then
    update public.faction_lv2 set view_count = view_count + 1
      where id = p_faction_id and (not is_myth or published) returning view_count into v_count;
  else
    select view_count into v_count from public.faction_lv2 where id = p_faction_id and (not is_myth or published);
  end if;
  return v_count;
end;
$$;

revoke all on function public.page_likes(text, uuid, text, boolean, integer) from public, anon, authenticated;
revoke all on function public.increment_faction_view(uuid, boolean) from public, anon, authenticated;
grant execute on function public.page_likes(text, uuid, text, boolean, integer) to service_role;
grant execute on function public.increment_faction_view(uuid, boolean) to service_role;
notify pgrst, 'reload schema';

commit;
