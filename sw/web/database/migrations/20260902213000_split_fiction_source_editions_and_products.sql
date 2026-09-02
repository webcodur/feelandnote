begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- contents는 작품, 이 표는 그 작품을 실제로 읽고 살 수 있는 판본이다.
-- 인물 관계는 fiction_source_characters에 작품 단위로 한 번만 둔다.
create table public.fiction_source_editions (
  id bigint generated always as identity primary key,
  content_id text not null references public.fiction_source_contents(content_id) on delete cascade,
  locale text not null,
  title text not null,
  creator text,
  description text,
  isbn text,
  publisher text,
  thumbnail_url text,
  release_date date,
  edition_kind text,
  text_scope text,
  sort_order integer not null default 0,
  verified boolean,
  sources jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fiction_source_editions_locale_check
    check (locale in ('ko', 'en')),
  constraint fiction_source_editions_title_check
    check (btrim(title) <> ''),
  constraint fiction_source_editions_isbn_check
    check (isbn is null or btrim(isbn) <> ''),
  constraint fiction_source_editions_kind_check
    check (
      edition_kind is null
      or edition_kind in ('full', 'abridged', 'retelling', 'adaptation', 'selection', 'volume')
    ),
  constraint fiction_source_editions_scope_check
    check (text_scope is null or btrim(text_scope) <> ''),
  constraint fiction_source_editions_sort_order_check
    check (sort_order >= 0),
  constraint fiction_source_editions_sources_check
    check (sources is null or jsonb_typeof(sources) in ('array', 'object'))
);

create unique index fiction_source_editions_content_locale_isbn_uidx
  on public.fiction_source_editions(content_id, locale, isbn)
  where isbn is not null;

create index fiction_source_editions_content_locale_order_idx
  on public.fiction_source_editions(content_id, locale, sort_order, id);

-- 상품은 판본보다 수명이 짧다. 교체 시 기존 행을 비활성화해 어떤 상품을 골랐는지 보존한다.
create table public.fiction_source_products (
  id bigint generated always as identity primary key,
  edition_id bigint not null references public.fiction_source_editions(id) on delete cascade,
  platform text not null,
  product_id text,
  product_url text,
  affiliate_url text not null,
  quality_evidence jsonb not null default '[]'::jsonb,
  checked_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fiction_source_products_platform_check
    check (platform in ('coupang', 'amazon')),
  constraint fiction_source_products_product_id_check
    check (product_id is null or btrim(product_id) <> ''),
  constraint fiction_source_products_product_url_check
    check (product_url is null or product_url ~ '^https://'),
  constraint fiction_source_products_affiliate_url_check
    check (affiliate_url ~ '^https://'),
  constraint fiction_source_products_quality_evidence_check
    check (jsonb_typeof(quality_evidence) = 'array'),
  constraint fiction_source_products_coupang_verification_check
    check (
      platform <> 'coupang'
      or (
        product_id is not null
        and product_url ~ '^https://(www\.)?coupang\.com/vp/products/[0-9]+'
        and substring(product_url from '/vp/products/([0-9]+)') = product_id
        and affiliate_url ~ '^https://link\.coupang\.com/a/[A-Za-z0-9]+/?$'
        and jsonb_array_length(quality_evidence) > 0
        and checked_at is not null
      )
    )
);

create index fiction_source_products_edition_id_idx
  on public.fiction_source_products(edition_id);

create unique index fiction_source_products_one_active_platform_uidx
  on public.fiction_source_products(edition_id, platform)
  where is_active;

create index fiction_source_products_active_platform_edition_idx
  on public.fiction_source_products(platform, edition_id)
  where is_active;

comment on table public.fiction_source_editions is
  '픽션 원전 작품에 연결된 항구적 도서 판본. 작품×인물 관계를 복제하지 않는다';
comment on column public.fiction_source_editions.content_id is
  '원전 작품인 contents.id. 한 작품에 읽을 가치가 다른 판본을 여러 개 둘 수 있다';
comment on column public.fiction_source_editions.edition_kind is
  'full/abridged/retelling/adaptation/selection/volume 판본 성격';
comment on column public.fiction_source_editions.text_scope is
  'complete 또는 실제 수록 범위를 식별하는 안정 키';
comment on table public.fiction_source_products is
  '판본의 현재 판매 상품과 교체 이력. 활성 상품은 판본·플랫폼마다 하나';
comment on column public.fiction_source_products.quality_evidence is
  '정확한 ISBN·배송 배지·판매 신호를 상품 화면에서 확인한 근거 배열';

create or replace function public.touch_fiction_source_catalog_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_fiction_source_editions_touch_updated_at
before update on public.fiction_source_editions
for each row execute function public.touch_fiction_source_catalog_updated_at();

create trigger trg_fiction_source_products_touch_updated_at
before update on public.fiction_source_products
for each row execute function public.touch_fiction_source_catalog_updated_at();

alter table public.fiction_source_editions enable row level security;
alter table public.fiction_source_products enable row level security;

create policy "Public can view fiction source editions"
  on public.fiction_source_editions
  for select
  to anon, authenticated
  using (true);

create policy "Public can view fiction source products"
  on public.fiction_source_products
  for select
  to anon, authenticated
  using (is_active);

revoke all on public.fiction_source_editions from public, anon, authenticated;
revoke all on public.fiction_source_products from public, anon, authenticated;
grant select on public.fiction_source_editions to anon, authenticated;
grant select on public.fiction_source_products to anon, authenticated;
grant select, insert, update, delete on public.fiction_source_editions to service_role;
grant select, insert, update, delete on public.fiction_source_products to service_role;
grant usage, select on sequence public.fiction_source_editions_id_seq to service_role;
grant usage, select on sequence public.fiction_source_products_id_seq to service_role;

-- 현재 작품 locale은 작품 표시와 대표 판본 정보가 섞여 있다. 우선 각 locale을 첫 판본으로 보존한다.
insert into public.fiction_source_editions (
  content_id,
  locale,
  title,
  creator,
  description,
  isbn,
  publisher,
  thumbnail_url,
  release_date,
  edition_kind,
  text_scope,
  sort_order,
  verified,
  sources,
  created_at,
  updated_at
)
select
  locale.content_id,
  locale.locale,
  coalesce(nullif(btrim(locale.title), ''), content.external_id, content.id),
  nullif(btrim(locale.creator), ''),
  locale.description,
  nullif(btrim(locale.isbn), ''),
  nullif(btrim(locale.publisher), ''),
  locale.thumbnail_url,
  case
    when content.release_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      then left(content.release_date, 10)::date
    else null
  end,
  case
    when content.metadata #>> '{fictionSource,editionKind}'
      in ('full', 'abridged', 'retelling', 'adaptation', 'selection', 'volume')
      then content.metadata #>> '{fictionSource,editionKind}'
    else null
  end,
  nullif(content.metadata #>> '{fictionSource,textScope}', ''),
  0,
  locale.verified,
  locale.sources,
  coalesce(locale.created_at, now()),
  coalesce(locale.updated_at, locale.created_at, now())
from public.fiction_source_contents as source
join public.contents as content on content.id = source.content_id
join public.content_locales as locale on locale.content_id = source.content_id
where content.type = 'BOOK';

-- 기존 리비우스 로마사 링크는 1권 locale이 아니라 전4권 세트 상품을 가리킨다.
-- 작품은 그대로 두고, 실제 상품과 일치하는 세트 판본을 별도 행으로 보존한다.
insert into public.fiction_source_editions (
  content_id,
  locale,
  title,
  creator,
  description,
  isbn,
  publisher,
  thumbnail_url,
  release_date,
  edition_kind,
  text_scope,
  sort_order,
  verified,
  sources
)
select
  source.content_id,
  'ko',
  '리비우스 로마사 세트',
  '티투스 리비우스',
  '현재 전하는 『리비우스 로마사』 35권을 전4권에 완역한 세트다. 1~10권과 21~45권을 수록한다.',
  '9791187142331',
  '현대지성',
  'https://t1.daumcdn.net/lbook/image/5546454?timestamp=20260305142338',
  '2020-12-17'::date,
  'full',
  'extant-books-1-10-and-21-45',
  1,
  true,
  '["kakao_book"]'::jsonb
from public.fiction_source_contents as source
where source.content_id = '4ee36aab-cc98-426f-9302-39242a50b651'
on conflict (content_id, locale, isbn) where isbn is not null do nothing;

-- 로버트 그레이브스의 작품은 2권짜리 한국어판이다. 기존 데이터의 2권 상품만
-- 작품 전체처럼 보이지 않도록 작품 이름과 두 권의 판본을 분리한다.
update public.fiction_source_editions
set edition_kind = 'volume',
    text_scope = 'volume-2',
    sort_order = 1
where content_id = 'd0ae4f4f-2e9b-41e7-9670-72eaf2f85528'
  and locale = 'ko'
  and isbn = '9791189333669';

insert into public.fiction_source_editions (
  content_id,
  locale,
  title,
  creator,
  description,
  isbn,
  publisher,
  thumbnail_url,
  release_date,
  edition_kind,
  text_scope,
  sort_order,
  verified,
  sources
)
select
  edition.content_id,
  'ko',
  '그리스 신화 1: 신의 시대',
  edition.creator,
  '영국의 계관시인, 작가, 고전학자, 신화 연구가인 로버트 그레이브스의 『그리스 신화』가 출간 70여 년 만에 국내 첫 번역·출간되었다. 『그리스 신화』는 시인이자 작가인 로버트 그레이브스가 평론과 분석, 설명을 곁들여 1955년에 출간한 책이다. 작가적 상상력을 발휘하여 그리스 신화를 재구성한 그레이브스는 그리스 로마의 문헌에 인용된 신화의 내용을 시인의 언어로 풀어서 이야기해 준다. 무엇보다 로버트 그레이브스의 『그리스 신화』는, ‘이형(異形)과 이설(異說)로 읽는 그리스 신화’라는 말로 설명할 수 있다. 그레이브스는 수많은 고전을 탐색하고, 문헌학적·고고인류학적 분석과 상상력 넘치는 해석을 통해 방대한 분량의 ‘그리스 신화’를 엮어 냈다. 이때 그레이브스의 접근법은 여러 신화에 흩어져 있는 요소들을 조화로운 내러티브 속에 모두 모아 보는 것이었다. 세상에 거의 알려지지 않은 이형을 활용하면 그 의미를 확정하는 데 도움이 된다. 따라서 이 책에 가장 자주 등장하는 어구 역시 “어떤 이는 …… 이렇게 말했다”이다. 독자들은 정설로 굳혀진 신화 이야기가 아니라, 이설로 엮어 내는 신화 내러티브를 읽게 되는 것이다.',
  '9791189333652',
  edition.publisher,
  'https://t1.daumcdn.net/lbook/image/6401728?timestamp=20251107152041',
  '2023-07-25'::date,
  'volume',
  'volume-1',
  0,
  true,
  jsonb_build_object(
    'primary', 'https://search.daum.net/search?w=bookpage&bookId=6401728&q=%EA%B7%B8%EB%A6%AC%EC%8A%A4+%EC%8B%A0%ED%99%94+1%3A+%EC%8B%A0%EC%9D%98+%EC%8B%9C%EB%8C%80',
    'description', 'https://search.daum.net/search?w=bookpage&bookId=6401728&q=%EA%B7%B8%EB%A6%AC%EC%8A%A4+%EC%8B%A0%ED%99%94+1%3A+%EC%8B%A0%EC%9D%98+%EC%8B%9C%EB%8C%80'
  )
from public.fiction_source_editions as edition
where edition.content_id = 'd0ae4f4f-2e9b-41e7-9670-72eaf2f85528'
  and edition.locale = 'ko'
  and edition.isbn = '9791189333669'
on conflict (content_id, locale, isbn) where isbn is not null do update
set edition_kind = excluded.edition_kind,
    text_scope = excluded.text_scope,
    sort_order = excluded.sort_order;

update public.content_locales
set title = '그리스 신화',
    affiliate_url = null
where content_id = 'd0ae4f4f-2e9b-41e7-9670-72eaf2f85528'
  and locale = 'ko';

-- 기존 Amazon 링크는 해당 영문판 상품으로 옮긴다. 상품 ID는 URL에서 복원 가능한 경우만 기록한다.
insert into public.fiction_source_products (
  edition_id,
  platform,
  product_id,
  product_url,
  affiliate_url,
  quality_evidence,
  checked_at,
  is_active
)
select
  edition.id,
  'amazon',
  coalesce(
    substring(link.value ->> 'url' from '/dp/([^/?]+)'),
    substring(link.value ->> 'url' from '/gp/product/([^/?]+)')
  ),
  link.value ->> 'url',
  link.value ->> 'url',
  jsonb_build_array('기존 영문 판본의 Amazon 구매 경로에서 이관'),
  null,
  true
from public.fiction_source_editions as edition
join public.content_locales as locale
  on locale.content_id = edition.content_id
 and locale.locale = edition.locale
cross join lateral jsonb_array_elements(
  case
    when jsonb_typeof(locale.affiliate_url) = 'array' then locale.affiliate_url
    else '[]'::jsonb
  end
) as link(value)
where edition.locale = 'en'
  and link.value ->> 'platform' = 'amazon'
  and link.value ->> 'url' ~ '^https://';

create temporary table verified_coupang_source_products (
  content_id text not null,
  isbn text not null,
  product_id text not null,
  product_url text not null,
  affiliate_url text not null,
  quality_evidence jsonb not null,
  primary key (content_id, isbn)
) on commit drop;

insert into verified_coupang_source_products values
  ('020eb69c-4f27-4f8e-a1b1-a35ddf26a66b', '9791139700107', '6113338215', 'https://www.coupang.com/vp/products/6113338215', 'https://link.coupang.com/a/f114MI3oBw', '["exact ISBN","next-day delivery badge","64 product ratings"]'),
  ('6bbf26a8-979b-455d-aa6a-1e84e64e68af', '9791127480998', '8384329715', 'https://www.coupang.com/vp/products/8384329715', 'https://link.coupang.com/a/gBA6zp7Fu0', '["exact ISBN","arrival-guarantee badge","six units in stock at review time"]'),
  ('aed16cb6-be49-4234-925a-651e4d3c55d7', '9788970096223', '4432141', 'https://www.coupang.com/vp/products/4432141', 'https://link.coupang.com/a/f11vOOHNe0', '["exact ISBN","next-day delivery badge","four product ratings"]'),
  ('340c4bd2-39da-47c9-b8f6-3604e73fb87b', '9788984317925', '19800147', 'https://www.coupang.com/vp/products/19800147', 'https://link.coupang.com/a/gDlHCBhqeq', '["exact ISBN","next-day free delivery badge","21 product ratings"]'),
  ('79334378-a390-40bb-9dd9-025c41eed94f', '9788937461668', '4128796', 'https://www.coupang.com/vp/products/4128796', 'https://link.coupang.com/a/f1OBowGvbo', '["exact ISBN","arrival-guarantee badge","47 product ratings"]'),
  ('0818cbb2-d0f5-43d0-b57d-cb3c6d0522bd', '9791139721973', '8715613735', 'https://www.coupang.com/vp/products/8715613735', 'https://link.coupang.com/a/d0ybK3', '["exact ISBN","next-day delivery badge","more than 300 purchases in the displayed month"]'),
  ('f44760c9-113f-4a04-89da-6eaca5f8af13', '9791139721966', '8715620548', 'https://www.coupang.com/vp/products/8715620548', 'https://link.coupang.com/a/f11SGXT6d2', '["exact ISBN","next-day free delivery badge","11 or more product ratings"]'),
  ('02db5067-3541-406c-a0d2-2641fddc2bb7', '9791160201048', '339969914', 'https://www.coupang.com/vp/products/339969914', 'https://link.coupang.com/a/gHrxgNEphs', '["exact ISBN","complete ten-volume set","Rocket next-day badge","11 product ratings"]'),
  ('ef076fd8-206e-4488-a0cb-e641dfd7c56a', '9788949717937', '4798387132', 'https://www.coupang.com/vp/products/4798387132', 'https://link.coupang.com/a/gHrC50MCDA', '["exact ISBN","904-page combined source edition","Rocket next-day badge","five product ratings"]'),
  ('1ca908d5-f3c1-4f97-afb5-3cb8fcb880c7', '9791156620228', '35239113', 'https://www.coupang.com/vp/products/35239113', 'https://link.coupang.com/a/gHrG0E5uRU', '["exact ISBN","Rocket next-day badge","seven product ratings"]'),
  ('6e58b318-78e4-458e-83c3-d629fd6cdb60', '9788997779925', '48012038', 'https://www.coupang.com/vp/products/48012038', 'https://link.coupang.com/a/gHrKIUTzCC', '["exact ISBN","Rocket next-day badge"]'),
  ('ac9f1d4e-f76b-4c27-8570-7657483f1a5a', '9788957336656', '1156870452', 'https://www.coupang.com/vp/products/1156870452', 'https://link.coupang.com/a/gHrNY7ebf2', '["exact ISBN","Rocket next-day badge","one product rating"]'),
  ('659578fc-407e-42a4-b378-33229c9b8ae2', '9788952237309', '34334188', 'https://www.coupang.com/vp/products/34334188?itemId=128106354&vendorItemId=3275480998', 'https://link.coupang.com/a/gHuaZA6MCW', '["exact ISBN","Rocket delivery badge","next-day arrival guarantee on the default offer"]'),
  ('05e29748-3ebe-4c98-9c44-38a6816d1213', '9788982812118', '36480771', 'https://www.coupang.com/vp/products/36480771?itemId=134727440&vendorItemId=3285833517', 'https://link.coupang.com/a/gHuc0Dfl2y', '["exact ISBN","Rocket delivery badge","next-day arrival guarantee on the default offer"]'),
  ('ff0392c6-49b3-4cd4-ba03-7c1c0ec83014', '9788932404592', '20324905', 'https://www.coupang.com/vp/products/20324905?itemId=80491556&vendorItemId=3295336357', 'https://link.coupang.com/a/gHt7KKGHNk', '["exact ISBN","delivery badge","same-day arrival guarantee on the default offer"]'),
  ('5c38c188-32a1-4551-9ce7-97c025b2e364', '9788991290297', '20407725', 'https://www.coupang.com/vp/products/20407725?itemId=80577294&vendorItemId=3313791189', 'https://link.coupang.com/a/gHvT7ULOYS', '["exact ISBN","delivery badge","next-day arrival guarantee","20 product ratings","four units left at review time"]'),
  ('55a6b05c-a738-44ef-8a97-80b3d3d3feed', '9788957339893', '9057359529', 'https://www.coupang.com/vp/products/9057359529?itemId=26589156122&vendorItemId=93614221093', 'https://link.coupang.com/a/gHv0SJdFM4', '["exact ISBN","complete seven-play new translation","delivery badge","next-day arrival guarantee","three product ratings"]'),
  ('13410b89-7c1f-4461-a1e2-b3f2975148e6', '9788991290808', '43260021', 'https://www.coupang.com/vp/products/43260021?itemId=156444880&vendorItemId=3366806065', 'https://link.coupang.com/a/gHv3lV4kx2', '["exact ISBN","complete Latin-source translation","delivery badge","14 product ratings"]'),
  ('467d387e-c688-43b0-8570-01df791de22b', '9788935651757', '20355415', 'https://www.coupang.com/vp/products/20355415?itemId=80523583&vendorItemId=3285588689', 'https://link.coupang.com/a/gHv5TrskrA', '["exact ISBN","exact critical source edition","delivery badge"]'),
  ('21dd08de-dc3f-4a9c-a8be-0af89ebdaaf6', '9791130665382', '8733943062', 'https://www.coupang.com/vp/products/8733943062?itemId=25380273740&vendorItemId=92369299401', 'https://link.coupang.com/a/gHv7UkXyPA', '["exact ISBN","exact first volume","delivery badge"]'),
  ('6f3e70ea-0bb9-458f-a4ab-2e35d5dc1adc', '9791128898648', '7941425943', 'https://www.coupang.com/vp/products/7941425943?itemId=21874176221&vendorItemId=88945770369', 'https://link.coupang.com/a/gHUngC4unk', '["exact ISBN and publisher","delivery badge on the exact product card","complete Korean translation"]'),
  ('a9e6c779-00e8-4492-8c58-7c85b9ffb934', '9791128856105', '4743854057', 'https://www.coupang.com/vp/products/4743854057?itemId=6030943301&vendorItemId=73328539687', 'https://link.coupang.com/a/gHU5N7GAVM', '["exact title and publisher","exact ISBN cross-check","delivery badge on the exact retail product card"]'),
  ('26dbc4a6-5497-4f40-8673-bb9083a09d9d', '9788930041379', '7606378944', 'https://www.coupang.com/vp/products/7606378944?itemId=20134176809&vendorItemId=87366037695', 'https://link.coupang.com/a/gHU7UuXF00', '["exact ISBN in the product-card cover path","exact three-volume complete set","delivery badge on the exact retail product card"]'),
  ('24d56c9e-ad64-5c95-b1e3-4bd7f029f92c', '9791139703603', '6457848784', 'https://www.coupang.com/vp/products/6457848784?itemId=14043532345', 'https://link.coupang.com/a/gHXd38QG0y', '["exact ISBN and Korean edition","dawn-arrival guaranteed delivery badge","more than 200 purchases in one month","134 product ratings","complete one-volume mythology with a dedicated Heracles chapter"]'),
  ('4ee36aab-cc98-426f-9302-39242a50b651', '9791187142331', '4629536430', 'https://www.coupang.com/vp/products/4629536430?itemId=5747526567&vendorItemId=73046164419', 'https://link.coupang.com/a/f1IUlRAjdI', '["exact four-volume-set ISBN","next-day guaranteed free-delivery badge","18 product ratings","eight units left at review time"]');

do $$
begin
  if exists (
    select 1
    from public.fiction_source_contents as source
    join public.content_locales as locale
      on locale.content_id = source.content_id
     and locale.locale = 'ko'
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(locale.affiliate_url) = 'array' then locale.affiliate_url
        else '[]'::jsonb
      end
    ) as link(value)
    left join verified_coupang_source_products as verified
      on verified.content_id = locale.content_id
     and verified.affiliate_url = link.value ->> 'url'
    where link.value ->> 'platform' = 'coupang'
      and verified.content_id is null
  ) then
    raise exception '검증 자료 없이 이관될 기존 픽션 원전 쿠팡 링크가 있습니다';
  end if;

  if exists (
    select 1
    from verified_coupang_source_products as verified
    left join public.fiction_source_editions as edition
      on edition.content_id = verified.content_id
     and edition.locale = 'ko'
     and edition.isbn = verified.isbn
    where edition.id is null
  ) then
    raise exception '쿠팡 검증 자료와 현재 원전 판본 ISBN이 다릅니다';
  end if;

  if exists (
    select 1
    from verified_coupang_source_products as verified
    join public.content_locales as locale
      on locale.content_id = verified.content_id
     and locale.locale = 'ko'
    where not exists (
      select 1
      from jsonb_array_elements(
        case
          when jsonb_typeof(locale.affiliate_url) = 'array' then locale.affiliate_url
          else '[]'::jsonb
        end
      ) as link(value)
      where link.value ->> 'platform' = 'coupang'
        and link.value ->> 'url' = verified.affiliate_url
    )
  ) then
    raise exception '쿠팡 검증 자료와 현재 파트너스 링크가 다릅니다';
  end if;
end;
$$;

insert into public.fiction_source_products (
  edition_id,
  platform,
  product_id,
  product_url,
  affiliate_url,
  quality_evidence,
  checked_at,
  is_active
)
select
  edition.id,
  'coupang',
  verified.product_id,
  verified.product_url,
  verified.affiliate_url,
  verified.quality_evidence,
  '2026-09-02 00:00:00+09'::timestamptz,
  true
from verified_coupang_source_products as verified
join public.fiction_source_editions as edition
  on edition.content_id = verified.content_id
 and edition.locale = 'ko'
 and edition.isbn = verified.isbn;

-- 신규 작품을 원전으로 지정할 때 현재 locale을 첫 판본으로 이관한다.
-- 상품은 검증 근거가 필요한 별도 쓰기 경로에서만 만든다.
create or replace function public.seed_fiction_source_editions()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  insert into public.fiction_source_editions (
    content_id, locale, title, creator, description, isbn, publisher,
    thumbnail_url, release_date, edition_kind, text_scope, sort_order,
    verified, sources
  )
  select
    locale.content_id,
    locale.locale,
    coalesce(nullif(btrim(locale.title), ''), content.external_id, content.id),
    nullif(btrim(locale.creator), ''),
    locale.description,
    nullif(btrim(locale.isbn), ''),
    nullif(btrim(locale.publisher), ''),
    locale.thumbnail_url,
    case
      when content.release_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
        then left(content.release_date, 10)::date
      else null
    end,
    case
      when content.metadata #>> '{fictionSource,editionKind}'
        in ('full', 'abridged', 'retelling', 'adaptation', 'selection', 'volume')
        then content.metadata #>> '{fictionSource,editionKind}'
      else null
    end,
    nullif(content.metadata #>> '{fictionSource,textScope}', ''),
    0,
    locale.verified,
    locale.sources
  from public.contents as content
  join public.content_locales as locale on locale.content_id = content.id
  where content.id = new.content_id
    and content.type = 'BOOK'
  on conflict (content_id, locale, isbn) where isbn is not null do nothing;

  return new;
end;
$$;

create trigger trg_seed_fiction_source_editions
after insert on public.fiction_source_contents
for each row execute function public.seed_fiction_source_editions();

-- 같은 상품을 재검증하면 근거만 갱신하고, 다른 상품이면 기존 상품을 비활성화한 뒤 새 행을 만든다.
create or replace function public.replace_fiction_source_product(
  p_edition_id bigint,
  p_platform text,
  p_product_id text,
  p_product_url text,
  p_affiliate_url text,
  p_quality_evidence jsonb,
  p_checked_at timestamptz default now()
)
returns bigint
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  active_product public.fiction_source_products%rowtype;
  saved_id bigint;
begin
  if not exists (
    select 1 from public.fiction_source_editions where id = p_edition_id
  ) then
    raise exception '원전 판본을 찾을 수 없습니다: %', p_edition_id;
  end if;

  if p_platform not in ('coupang', 'amazon') then
    raise exception '지원하지 않는 판매처입니다: %', p_platform;
  end if;

  if jsonb_typeof(p_quality_evidence) is distinct from 'array'
     or jsonb_array_length(p_quality_evidence) = 0 then
    raise exception '상품 품질 근거가 한 건 이상 필요합니다';
  end if;

  select * into active_product
  from public.fiction_source_products
  where edition_id = p_edition_id
    and platform = p_platform
    and is_active
  for update;

  if found
     and active_product.product_id is not distinct from nullif(btrim(p_product_id), '')
     and active_product.affiliate_url = btrim(p_affiliate_url) then
    update public.fiction_source_products
    set product_url = nullif(btrim(p_product_url), ''),
        quality_evidence = p_quality_evidence,
        checked_at = p_checked_at
    where id = active_product.id
    returning id into saved_id;
    return saved_id;
  end if;

  update public.fiction_source_products
  set is_active = false
  where edition_id = p_edition_id
    and platform = p_platform
    and is_active;

  insert into public.fiction_source_products (
    edition_id, platform, product_id, product_url, affiliate_url,
    quality_evidence, checked_at, is_active
  ) values (
    p_edition_id,
    p_platform,
    nullif(btrim(p_product_id), ''),
    nullif(btrim(p_product_url), ''),
    btrim(p_affiliate_url),
    p_quality_evidence,
    p_checked_at,
    true
  ) returning id into saved_id;

  return saved_id;
end;
$$;

create or replace function public.deactivate_fiction_source_product(
  p_edition_id bigint,
  p_platform text
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  changed_count integer;
begin
  update public.fiction_source_products
  set is_active = false
  where edition_id = p_edition_id
    and platform = p_platform
    and is_active;
  get diagnostics changed_count = row_count;
  return changed_count > 0;
end;
$$;

revoke all on function public.seed_fiction_source_editions() from public, anon, authenticated;
revoke all on function public.replace_fiction_source_product(bigint, text, text, text, text, jsonb, timestamptz)
  from public, anon, authenticated;
revoke all on function public.deactivate_fiction_source_product(bigint, text)
  from public, anon, authenticated;
grant execute on function public.replace_fiction_source_product(bigint, text, text, text, text, jsonb, timestamptz)
  to service_role;
grant execute on function public.deactivate_fiction_source_product(bigint, text)
  to service_role;

create view public.fiction_source_purchase_options
with (security_invoker = true)
as
select
  edition.id as edition_id,
  edition.content_id,
  edition.locale,
  edition.title,
  edition.creator,
  edition.description,
  edition.isbn,
  edition.publisher,
  edition.thumbnail_url,
  edition.release_date,
  edition.edition_kind,
  edition.text_scope,
  edition.sort_order,
  product.platform,
  product.affiliate_url
from public.fiction_source_editions as edition
join public.fiction_source_products as product
  on product.edition_id = edition.id
 and product.is_active;

revoke all on public.fiction_source_purchase_options from public;
grant select on public.fiction_source_purchase_options to anon, authenticated, service_role;

-- 새 표가 바뀌면 해당 작품과 원전 책장 캐시만 무효화한다.
create trigger web_reval_ins
after insert on public.fiction_source_editions
referencing new table as new_rows
for each statement
execute function public.web_revalidate_trigger(
  $tag$array[
    'fiction-sources',
    'contents:' || r.content_id,
    'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
  ]$tag$,
  '',
  'n.id = o.id'
);

create trigger web_reval_upd
after update on public.fiction_source_editions
referencing old table as old_rows new table as new_rows
for each statement
execute function public.web_revalidate_trigger(
  $tag$array[
    'fiction-sources',
    'contents:' || r.content_id,
    'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
  ]$tag$,
  'updated_at',
  'n.id = o.id'
);

create trigger web_reval_del
after delete on public.fiction_source_editions
referencing old table as old_rows
for each statement
execute function public.web_revalidate_trigger(
  $tag$array[
    'fiction-sources',
    'contents:' || r.content_id,
    'contents:' || (select c.external_id from public.contents as c where c.id = r.content_id)
  ]$tag$,
  '',
  'n.id = o.id'
);

create trigger web_reval_ins
after insert on public.fiction_source_products
referencing new table as new_rows
for each statement
execute function public.web_revalidate_trigger(
  $tag$array[
    'fiction-sources',
    'contents:' || (select e.content_id from public.fiction_source_editions as e where e.id = r.edition_id),
    'contents:' || (
      select c.external_id
      from public.fiction_source_editions as e
      join public.contents as c on c.id = e.content_id
      where e.id = r.edition_id
    )
  ]$tag$,
  '',
  'n.id = o.id'
);

create trigger web_reval_upd
after update on public.fiction_source_products
referencing old table as old_rows new table as new_rows
for each statement
execute function public.web_revalidate_trigger(
  $tag$array[
    'fiction-sources',
    'contents:' || (select e.content_id from public.fiction_source_editions as e where e.id = r.edition_id),
    'contents:' || (
      select c.external_id
      from public.fiction_source_editions as e
      join public.contents as c on c.id = e.content_id
      where e.id = r.edition_id
    )
  ]$tag$,
  'updated_at',
  'n.id = o.id'
);

create trigger web_reval_del
after delete on public.fiction_source_products
referencing old table as old_rows
for each statement
execute function public.web_revalidate_trigger(
  $tag$array[
    'fiction-sources',
    'contents:' || (select e.content_id from public.fiction_source_editions as e where e.id = r.edition_id),
    'contents:' || (
      select c.external_id
      from public.fiction_source_editions as e
      join public.contents as c on c.id = e.content_id
      where e.id = r.edition_id
    )
  ]$tag$,
  '',
  'n.id = o.id'
);

do $$
declare
  expected_editions integer;
  actual_editions integer;
  expected_products integer;
  actual_products integer;
begin
  select count(*) into expected_editions
  from (
    select locale.content_id, locale.locale, locale.isbn
    from public.fiction_source_contents as source
    join public.contents as content on content.id = source.content_id and content.type = 'BOOK'
    join public.content_locales as locale on locale.content_id = source.content_id
    union
    select
      '4ee36aab-cc98-426f-9302-39242a50b651',
      'ko',
      '9791187142331'
    union
    select
      'd0ae4f4f-2e9b-41e7-9670-72eaf2f85528',
      'ko',
      '9791189333652'
  ) as expected;

  select count(*) into actual_editions from public.fiction_source_editions;

  select count(*) into expected_products
  from public.fiction_source_contents as source
  join public.content_locales as locale on locale.content_id = source.content_id
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(locale.affiliate_url) = 'array' then locale.affiliate_url
      else '[]'::jsonb
    end
  ) as link(value)
  where link.value ->> 'platform' in ('coupang', 'amazon')
    and link.value ->> 'url' ~ '^https://';

  select count(*) into actual_products
  from public.fiction_source_products
  where is_active;

  if actual_editions <> expected_editions then
    raise exception '픽션 원전 판본 이관 수 불일치: expected %, actual %', expected_editions, actual_editions;
  end if;

  if actual_products <> expected_products then
    raise exception '픽션 원전 상품 이관 수 불일치: expected %, actual %', expected_products, actual_products;
  end if;
end;
$$;

commit;
