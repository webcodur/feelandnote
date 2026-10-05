-- 판매처·감상처로 나간 클릭과 구매 창 열림을 모으는 수익화 장부다.
-- 실제 구매·수수료는 yes24 애드온 정산과 링크프라이스 AC에서만 확인되고, 이 표는 「무엇을 눌렀나」만 담는다.
-- 쓰기는 서버의 service_role 경유(/api/track/commerce)뿐이고, 읽기는 관리자에게만 연다.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.commerce_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null,
  platform text,
  target text not null,
  screen text not null,
  locale text not null default 'ko',
  content_id text references public.contents(id) on delete set null,
  content_type text,
  edition_id bigint,
  -- 우리 작품이 아닌 대상(베스트셀러 차트 항목 등)의 식별자 — contents 참조가 아니라 원본 키를 그대로 둔다
  external_ref text,
  constraint commerce_events_kind_check check (kind in ('open', 'click')),
  constraint commerce_events_platform_check check (platform is null or (btrim(platform) <> '' and length(platform) <= 40)),
  constraint commerce_events_target_check check (btrim(target) <> '' and length(target) <= 40),
  constraint commerce_events_screen_check check (length(screen) <= 200),
  constraint commerce_events_locale_check check (btrim(locale) <> '' and length(locale) <= 12),
  constraint commerce_events_content_type_check check (content_type is null or (btrim(content_type) <> '' and length(content_type) <= 12)),
  constraint commerce_events_external_ref_check check (external_ref is null or (btrim(external_ref) <> '' and length(external_ref) <= 120))
);

create index commerce_events_created_at_idx
  on public.commerce_events(created_at desc);

create index commerce_events_kind_created_at_idx
  on public.commerce_events(kind, created_at desc);

create index commerce_events_platform_created_at_idx
  on public.commerce_events(platform, created_at desc)
  where platform is not null;

create index commerce_events_content_id_idx
  on public.commerce_events(content_id, created_at desc)
  where content_id is not null;

alter table public.commerce_events enable row level security;

create policy "Admins can view commerce events"
  on public.commerce_events
  for select
  to authenticated
  using (public.is_admin());

revoke all on public.commerce_events from public, anon, authenticated;
grant select on public.commerce_events to authenticated;
grant select, insert on public.commerce_events to service_role;
grant usage, select on sequence public.commerce_events_id_seq to service_role;

commit;
