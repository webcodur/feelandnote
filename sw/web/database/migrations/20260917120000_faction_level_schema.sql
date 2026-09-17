-- 도감 계층을 celeb_tags 재귀 구조에서 층별 표로 갈아끼운다(26.09.17 사용자 지시).
--
-- 옛 구조: celeb_tags가 1층(분야·「신화와 이야기」 뿌리)과 2층(세력·신화 카드)을 겸하고,
-- parent_id 자기 참조로 층을 나눴다. 화면 소속 판정은 나무 위치(뿌리 아래인가)와
-- slug 앞머리 추측(웹의 MYTH_REGIONS 상수)에 의지했다.
--
-- 새 구조 — 층 이름이 곧 표 이름이다:
--   faction_lv1     L1 테마 — 세력도감의 분야, 신화의 지역
--   faction_lv2     L2 세력 — 팩션·신화 카드. is_myth가 신화의 세계 가지를 가른다
--   faction_lv3     L3 그룹 — 세력 안의 인물 묶음
--   faction_members 인물 배정 — celeb ↔ lv2(↔lv3)
--
-- is_fiction은 「이야기 속 인물 세력」 표시로 그대로 유지된다 — 화면 소속이 아니다.
-- published는 신화 화면 공개 스위치(옛 atlas_published). is_featured는 세력도감
-- 노출·게임 풀 스위치로 따로 살아 있다 — 두 축을 합치면 게임에서 신화가 빠진다.
--
-- 옛 행의 id를 그대로 이어받는다 — p_tag_id 등 기존 참조가 무효화되지 않는다.
-- 옛 표·뷰·캐시는 이 마이그레이션에서 지우지 않는다. 코드 전환·배포 확인 뒤
-- 정리 마이그레이션에서 제거한다.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';

-- ─────────────────────────── 1) 표 생성 ───────────────────────────

create table public.faction_lv1 (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  name_en text,
  slug text unique,
  color text default '#7c4dff',
  description text,
  description_en text,
  sort_order integer not null default 0,
  is_myth boolean not null default false,
  is_fiction boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.faction_lv1 is
  '도감 L1 테마 — 세력도감의 분야(인공지능·산업…), 신화의 세계의 지역(한국·그리스·로마…, is_myth). 자식은 faction_lv2.';

create index faction_lv1_sort_idx on public.faction_lv1 (sort_order);
create index faction_lv1_myth_idx on public.faction_lv1 (is_myth) where is_myth;

create table public.faction_lv2 (
  id uuid primary key default gen_random_uuid(),
  lv1_id uuid not null references public.faction_lv1(id) on delete cascade,
  name text not null unique,
  name_en text,
  slug text unique,
  color text default '#7c4dff',
  description text,
  description_en text,
  sort_order integer not null default 0,
  is_myth boolean not null default false,
  is_fiction boolean not null default false,
  is_featured boolean not null default false,
  published boolean not null default false,
  lead_person_ids uuid[] not null default '{}',
  team_images jsonb not null default '[]',
  theme_music jsonb,
  youtube_videos jsonb,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.faction_lv2 is
  '도감 L2 세력 — 팩션·신화 카드 한 장. is_myth=true면 신화의 세계 소속. published는 신화 화면 공개, is_featured는 세력도감·게임 노출. lead_person_ids는 타이틀 아트 대표 인물(순서 있음).';
comment on column public.faction_lv2.published is
  '신화의 세계에서 이 신화를 공개하는가(옛 celeb_tags.atlas_published). 세력도감 노출은 is_featured다.';
comment on column public.faction_lv2.lead_person_ids is
  '타이틀 아트에 세우는 대표 인물 celebs.id 목록. 배열 순서가 세우는 순서다.';

create index faction_lv2_lv1_idx on public.faction_lv2 (lv1_id);
create index faction_lv2_sort_idx on public.faction_lv2 (sort_order);
create index faction_lv2_myth_idx on public.faction_lv2 (is_myth) where is_myth;
create index faction_lv2_fiction_idx on public.faction_lv2 (is_fiction) where is_fiction;

create table public.faction_lv3 (
  id uuid primary key default gen_random_uuid(),
  lv2_id uuid not null references public.faction_lv2(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  name_en text,
  description text,
  description_en text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faction_lv3_id_lv2_key unique (id, lv2_id),
  constraint faction_lv3_lv2_name_key unique (lv2_id, name)
);

comment on table public.faction_lv3 is
  '도감 L3 그룹 — 세력 안의 인물 묶음(올림포스 신·기초를 놓은 세대).';

create index faction_lv3_lv2_sort_idx on public.faction_lv3 (lv2_id, sort_order);

create table public.faction_members (
  id uuid primary key default gen_random_uuid(),
  lv2_id uuid not null references public.faction_lv2(id) on delete cascade,
  lv3_id uuid,
  celeb_id uuid not null references public.celebs(id) on delete cascade,
  sort_order integer not null default 0,
  hidden boolean not null default false,
  short_desc text,
  short_desc_en text,
  long_desc text,
  long_desc_en text,
  image_url text,
  assigned_at timestamptz default now(),
  constraint faction_members_celeb_lv2_key unique (celeb_id, lv2_id),
  constraint faction_members_lv3_fkey
    foreign key (lv3_id, lv2_id)
    references public.faction_lv3 (id, lv2_id)
    on delete set null (lv3_id)
);

comment on table public.faction_members is
  '도감 인물 배정 — celeb을 lv2 세력(·lv3 그룹)에 연결한다. hidden은 이 세력에서 이 인물만 감춘다.';
comment on column public.faction_members.image_url is
  '세력별 인물 대표 화보(옛 celeb_tag_assignments.faction_image_url). 없으면 celebs.portrait_url을 쓴다.';

create index faction_members_lv2_idx on public.faction_members (lv2_id);
create index faction_members_celeb_idx on public.faction_members (celeb_id);
create index faction_members_lv2_sort_idx on public.faction_members (lv2_id, sort_order);
create index faction_members_visible_idx on public.faction_members (lv2_id) where hidden = false;
create index faction_members_lv3_idx on public.faction_members (lv3_id) where lv3_id is not null;

-- ─────────────────────── 2) RLS·권한·트리거 ───────────────────────

alter table public.faction_lv1 enable row level security;
alter table public.faction_lv2 enable row level security;
alter table public.faction_lv3 enable row level security;
alter table public.faction_members enable row level security;

create policy faction_lv1_select_all on public.faction_lv1 for select using (true);
create policy faction_lv1_admin_insert on public.faction_lv1 for insert with check ((select public.is_admin()));
create policy faction_lv1_admin_update on public.faction_lv1 for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy faction_lv1_admin_delete on public.faction_lv1 for delete using ((select public.is_admin()));

create policy faction_lv2_select_all on public.faction_lv2 for select using (true);
create policy faction_lv2_admin_insert on public.faction_lv2 for insert with check ((select public.is_admin()));
create policy faction_lv2_admin_update on public.faction_lv2 for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy faction_lv2_admin_delete on public.faction_lv2 for delete using ((select public.is_admin()));

create policy faction_lv3_select_all on public.faction_lv3 for select using (true);
create policy faction_lv3_admin_insert on public.faction_lv3 for insert with check ((select public.is_admin()));
create policy faction_lv3_admin_update on public.faction_lv3 for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy faction_lv3_admin_delete on public.faction_lv3 for delete using ((select public.is_admin()));

create policy faction_members_select_all on public.faction_members for select using (true);
create policy faction_members_admin_insert on public.faction_members for insert with check ((select public.is_admin()));
create policy faction_members_admin_update on public.faction_members for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy faction_members_admin_delete on public.faction_members for delete using ((select public.is_admin()));

grant all on table public.faction_lv1 to anon, authenticated, service_role;
grant all on table public.faction_lv2 to anon, authenticated, service_role;
grant all on table public.faction_lv3 to anon, authenticated, service_role;
grant all on table public.faction_members to anon, authenticated, service_role;

-- 행이 바뀌면 DB가 스스로 'tags' 캐시를 비운다(옛 표와 같은 계약).
create trigger web_reval_ins after insert on public.faction_lv1
  referencing new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''tags'']', 'updated_at', 'n.id = o.id');
create trigger web_reval_upd after update on public.faction_lv1
  referencing old table as old_rows new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''tags'']', 'updated_at', 'n.id = o.id');
create trigger web_reval_del after delete on public.faction_lv1
  referencing old table as old_rows for each statement
  execute function public.web_revalidate_trigger('array[''tags'']', 'updated_at', 'n.id = o.id');

create trigger web_reval_ins after insert on public.faction_lv2
  referencing new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''tags'']', 'updated_at', 'n.id = o.id');
create trigger web_reval_upd after update on public.faction_lv2
  referencing old table as old_rows new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''tags'']', 'updated_at', 'n.id = o.id');
create trigger web_reval_del after delete on public.faction_lv2
  referencing old table as old_rows for each statement
  execute function public.web_revalidate_trigger('array[''tags'']', 'updated_at', 'n.id = o.id');

create trigger web_reval_ins after insert on public.faction_lv3
  referencing new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''tags'']', 'updated_at', 'n.id = o.id');
create trigger web_reval_upd after update on public.faction_lv3
  referencing old table as old_rows new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''tags'']', 'updated_at', 'n.id = o.id');
create trigger web_reval_del after delete on public.faction_lv3
  referencing old table as old_rows for each statement
  execute function public.web_revalidate_trigger('array[''tags'']', 'updated_at', 'n.id = o.id');

-- faction_members에는 updated_at이 없다 — 비교에서 제외할 휘발 컬럼을 비워 둔다.
create trigger web_reval_ins after insert on public.faction_members
  referencing new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''tags'']', '', 'n.id = o.id');
create trigger web_reval_upd after update on public.faction_members
  referencing old table as old_rows new table as new_rows for each statement
  execute function public.web_revalidate_trigger('array[''tags'']', '', 'n.id = o.id');
create trigger web_reval_del after delete on public.faction_members
  referencing old table as old_rows for each statement
  execute function public.web_revalidate_trigger('array[''tags'']', '', 'n.id = o.id');

-- ─────────────────────────── 3) 데이터 이관 ───────────────────────────

-- lv1: 분야 테마 — 옛 최상위 태그(「신화와 이야기」 뿌리 제외)
insert into public.faction_lv1
  (id, name, name_en, slug, color, description, description_en, sort_order,
   is_myth, is_fiction, is_featured, created_at, updated_at)
select
  t.id, t.name, t.name_en, t.slug, t.color, t.description, t.description_en,
  coalesce(t.sort_order, 0), false, t.is_fiction, coalesce(t.is_featured, false),
  t.created_at, t.updated_at
from public.celeb_tags t
where t.parent_id is null
  and t.slug <> 'myth-and-fiction';

-- lv1: 신화 지역 18 — 옛 코드 상수 MYTH_REGIONS를 데이터로 내린다.
-- sort_order는 분야 테마 뒤로 밀어 섞인 목록에서 뒤에 선다.
insert into public.faction_lv1 (name, name_en, slug, sort_order, is_myth, is_fiction) values
  ('한국',        'Korea',           'korea',          901, true, true),
  ('일본',        'Japan',           'japan',          902, true, true),
  ('중국',        'China',           'china',          903, true, true),
  ('초원',        'Eurasian Steppe', 'steppe',         904, true, true),
  ('동남아',      'Southeast Asia',  'southeast-asia', 905, true, true),
  ('인도',        'India',           'india',          906, true, true),
  ('페르시아',    'Persia',          'persia',         907, true, true),
  ('메소포타미아','Mesopotamia',     'mesopotamia',    908, true, true),
  ('서아시아',    'West Asia',       'west-asia',      909, true, true),
  ('이집트',      'Egypt',           'egypt',          910, true, true),
  ('아프리카',    'Africa',          'africa',         911, true, true),
  ('그리스·로마', 'Greece & Rome',   'greek-roman',    912, true, true),
  ('켈트',        'Celtic Lands',    'celtic',         913, true, true),
  ('브리튼',      'Britain',         'britain',        914, true, true),
  ('북유럽',      'Northern Europe', 'northern-europe',915, true, true),
  ('슬라브',      'Slavic Lands',    'slavic',         916, true, true),
  ('아메리카',    'The Americas',    'americas',       917, true, true),
  ('오세아니아',  'Oceania',         'oceania',        918, true, true);

-- lv2: 팩션 카드 — 부모가 분야 테마인 옛 자식
insert into public.faction_lv2
  (id, lv1_id, name, name_en, slug, color, description, description_en, sort_order,
   is_myth, is_fiction, is_featured, published, team_images, theme_music,
   youtube_videos, start_date, end_date, created_at, updated_at)
select
  t.id, p.id, t.name, t.name_en, t.slug, t.color, t.description, t.description_en,
  coalesce(t.sort_order, 0), false, t.is_fiction, coalesce(t.is_featured, false), false,
  t.team_images, t.theme_music, t.youtube_videos, t.start_date, t.end_date,
  t.created_at, t.updated_at
from public.celeb_tags t
join public.faction_lv1 p on p.id = t.parent_id;

-- lv2: 신화 카드 — 지역 테마에 배정한다. slug 앞머리 추측이 아니라 명시 대응이다.
with region_map(tag_slug, region_slug) as (
  values
    ('myth-korea-gojoseon','korea'), ('myth-korea-silla','korea'),
    ('myth-korea-gaya','korea'), ('myth-korea-baekje','korea'),
    ('myth-korea-buyeo-goguryeo','korea'), ('myth-korea-tamna','korea'),
    ('myth-korea-goryeo-segye','korea'), ('myth-korea-jeju-bonpuri','korea'),
    ('myth-japan','japan'),
    ('myth-china-ancient','china'), ('myth-china-fengshen','china'), ('myth-china-xiyou','china'),
    ('myth-steppe','steppe'),
    ('myth-southeast-asia','southeast-asia'),
    ('myth-hindu-lineage','india'), ('myth-hindu-mahabharata','india'), ('myth-hindu-ramayana','india'),
    ('myth-persia','persia'),
    ('myth-mesopotamia','mesopotamia'),
    ('myth-west-asia','west-asia'),
    ('myth-egypt','egypt'),
    ('myth-africa','africa'),
    ('greek-roman-myth','greek-roman'), ('myth-roman','greek-roman'),
    ('homer-iliad','greek-roman'), ('homer-odyssey','greek-roman'),
    ('virgil-aeneid','greek-roman'), ('argonauts','greek-roman'),
    ('house-of-atreus','greek-roman'), ('heracles','greek-roman'),
    ('myth-celtic','celtic'),
    ('arthur-round-table','britain'),
    ('myth-norse','northern-europe'), ('myth-germanic','northern-europe'),
    ('myth-slavic','slavic'),
    ('myth-americas','americas'),
    ('myth-oceania','oceania')
)
insert into public.faction_lv2
  (id, lv1_id, name, name_en, slug, color, description, description_en, sort_order,
   is_myth, is_fiction, is_featured, published, team_images, theme_music,
   youtube_videos, start_date, end_date, created_at, updated_at)
select
  t.id, r.id, t.name, t.name_en, t.slug, t.color, t.description, t.description_en,
  coalesce(t.sort_order, 0), true, t.is_fiction, coalesce(t.is_featured, false),
  t.atlas_published, t.team_images, t.theme_music, t.youtube_videos,
  t.start_date, t.end_date, t.created_at, t.updated_at
from public.celeb_tags t
join region_map m on m.tag_slug = t.slug
join public.faction_lv1 r on r.slug = m.region_slug
join public.celeb_tags par on par.id = t.parent_id and par.slug = 'myth-and-fiction';

-- 대표 인물 — 옛 코드 상수 MYTH_LEAD_BY_SLUG를 데이터로 내린다. 값은 인물 slug.
with lead_map(tag_slug, ord, celeb_slug) as (
  values
    ('argonauts',1,'jason'),('argonauts',2,'medea'),('argonauts',3,'heracles'),
    ('arthur-round-table',1,'arthur'),('arthur-round-table',2,'merlin'),('arthur-round-table',3,'lancelot'),
    ('greek-roman-myth',1,'zeus'),('greek-roman-myth',2,'athena'),('greek-roman-myth',3,'heracles'),
    ('heracles',1,'heracles'),('heracles',2,'hera'),('heracles',3,'deianira'),
    ('homer-iliad',1,'achilles'),('homer-iliad',2,'hector'),('homer-iliad',3,'helen-of-troy'),
    ('homer-odyssey',1,'odysseus'),('homer-odyssey',2,'penelope'),('homer-odyssey',3,'telemachus'),
    ('house-of-atreus',1,'agamemnon'),('house-of-atreus',2,'clytemnestra'),('house-of-atreus',3,'orestes'),
    ('myth-africa',1,'sundiata-keita'),('myth-africa',2,'makeda'),('myth-africa',3,'menelik-i'),
    ('myth-americas',1,'quetzalcoatl'),('myth-americas',2,'manco-capac'),('myth-americas',3,'huitzilopochtli'),
    ('myth-celtic',1,'nuada-airgetlam'),('myth-celtic',2,'merlin'),('myth-celtic',3,'brutus-of-troy'),
    ('myth-china-ancient',1,'nuwa'),('myth-china-ancient',2,'yellow-emperor'),('myth-china-ancient',3,'yu-the-great'),
    ('myth-china-fengshen',1,'jiang-ziya'),('myth-china-fengshen',2,'nezha'),('myth-china-fengshen',3,'daji'),
    ('myth-china-xiyou',1,'sun-wukong'),('myth-china-xiyou',2,'tang-sanzang'),('myth-china-xiyou',3,'zhu-bajie'),
    ('myth-egypt',1,'ra'),('myth-egypt',2,'osiris'),('myth-egypt',3,'isis'),
    ('myth-germanic',1,'odin'),('myth-germanic',2,'william-tell'),('myth-germanic',3,'pelayo'),
    ('myth-hindu-lineage',1,'vaivasvata-manu'),('myth-hindu-lineage',2,'bharata-2'),('myth-hindu-lineage',3,'yayati'),
    ('myth-hindu-mahabharata',1,'krishna'),('myth-hindu-mahabharata',2,'arjuna'),('myth-hindu-mahabharata',3,'duryodhana'),
    ('myth-hindu-ramayana',1,'rama'),('myth-hindu-ramayana',2,'sita'),('myth-hindu-ramayana',3,'ravana'),
    ('myth-japan',1,'amaterasu'),('myth-japan',2,'susanoo'),('myth-japan',3,'izanagi'),
    ('myth-korea-baekje',1,'onjo'),('myth-korea-baekje',2,'soseono'),('myth-korea-baekje',3,'biryu'),
    ('myth-korea-buyeo-goguryeo',1,'jumong'),('myth-korea-buyeo-goguryeo',2,'haemosu'),('myth-korea-buyeo-goguryeo',3,'yuhwa'),
    ('myth-korea-gaya',1,'kim-suro'),('myth-korea-gaya',2,'heo-hwang-ok'),('myth-korea-gaya',3,'seok-talhae'),
    ('myth-korea-gojoseon',1,'dangun'),('myth-korea-gojoseon',2,'hwanung'),('myth-korea-gojoseon',3,'ungnyeo'),
    ('myth-korea-goryeo-segye',1,'jakjegeon'),('myth-korea-goryeo-segye',2,'the-dragon-maiden'),('myth-korea-goryeo-segye',3,'yonggeon'),
    ('myth-korea-jeju-bonpuri',1,'seolmundae-halmang'),('myth-korea-jeju-bonpuri',2,'jacheongbi'),('myth-korea-jeju-bonpuri',3,'princess-bari'),
    ('myth-korea-silla',1,'bak-hyeokgeose'),('myth-korea-silla',2,'lady-aryeong'),('myth-korea-silla',3,'kim-alji'),
    ('myth-korea-tamna',1,'go-eulla'),('myth-korea-tamna',2,'yang-eulla'),('myth-korea-tamna',3,'bu-eulla'),
    ('myth-mesopotamia',1,'gilgamesh'),('myth-mesopotamia',2,'enkidu'),('myth-mesopotamia',3,'ishtar'),
    ('myth-norse',1,'odin'),('myth-norse',2,'thor'),('myth-norse',3,'loki'),
    ('myth-oceania',1,'māui'),('myth-oceania',2,'tagaloa'),('myth-oceania',3,'wākea'),
    ('myth-persia',1,'jamshid'),('myth-persia',2,'zahhak'),('myth-persia',3,'fereydun'),
    ('myth-roman',1,'jupiter'),('myth-roman',2,'aeneas'),('myth-roman',3,'romulus'),
    ('myth-slavic',1,'rurik'),('myth-slavic',2,'kyi'),('myth-slavic',3,'lech'),
    ('myth-southeast-asia',1,'lạc-long-quan'),('myth-southeast-asia',2,'au-cơ'),('myth-southeast-asia',3,'sang-nila-utama'),
    ('myth-steppe',1,'oghuz-khagan'),('myth-steppe',2,'manas'),('myth-steppe',3,'alan-gua'),
    ('myth-west-asia',1,'hayk'),('myth-west-asia',2,'ishmael'),('myth-west-asia',3,'kartlos'),
    ('virgil-aeneid',1,'aeneas'),('virgil-aeneid',2,'dido'),('virgil-aeneid',3,'turnus')
)
update public.faction_lv2 f
set lead_person_ids = sub.ids
from (
  select m.tag_slug, array_agg(c.id order by m.ord) as ids
  from lead_map m
  join public.celebs c on c.slug = m.celeb_slug
  group by m.tag_slug
) sub
where f.slug = sub.tag_slug;

-- lv3: 그룹 — 옛 그룹 id를 그대로 이어 배정의 group_id가 그대로 유효하다
insert into public.faction_lv3
  (id, lv2_id, name, name_en, description, description_en, sort_order, created_at, updated_at)
select
  g.id, g.tag_id, g.name, g.name_en, g.description, g.description_en,
  g.sort_order, g.created_at, g.updated_at
from public.celeb_tag_groups g
join public.faction_lv2 f on f.id = g.tag_id;

-- members: 인물 배정 — 죽은 컬럼(quote·quote_en·quote_media·spotlight_image_url)은 버린다
insert into public.faction_members
  (id, lv2_id, lv3_id, celeb_id, sort_order, hidden,
   short_desc, short_desc_en, long_desc, long_desc_en, image_url, assigned_at)
select
  a.id, a.tag_id, a.group_id, a.celeb_id, coalesce(a.sort_order, 0), a.hidden,
  a.short_desc, a.short_desc_en, a.long_desc, a.long_desc_en,
  coalesce(a.faction_image_url, a.spotlight_image_url), a.assigned_at
from public.celeb_tag_assignments a
join public.faction_lv2 f on f.id = a.tag_id;

-- ─────────────────────── 4) 공개 뷰 ───────────────────────

-- 옛 private 원천 뷰 + 캐시 표를 거치던 구조를 버리고 표를 직접 읽는다.
-- 두 표 모두 select-all RLS라 invoker 뷰만으로 공개 읽기가 된다.
create or replace view public.faction_member_rows
with (security_invoker = true)
as
select
  m.lv2_id,
  m.lv3_id,
  m.celeb_id,
  m.short_desc,
  m.short_desc_en,
  m.long_desc,
  m.long_desc_en,
  m.image_url,
  m.hidden,
  m.sort_order,
  m.id as member_id,
  g.name as group_name,
  g.name_en as group_name_en,
  g.sort_order as group_position
from public.faction_members m
left join public.faction_lv3 g on g.id = m.lv3_id;

grant select on public.faction_member_rows to anon, authenticated, service_role;

comment on view public.faction_member_rows is
  '도감 인물 배정 + 그룹 이름. 옛 faction_atlas_members 뷰를 대신한다 — 죽은 컬럼(source·person_id·group_subtitle·group_color·group_logo_url·quote 계열)은 뺐다.';

-- ─────────────────────── 5) RPC 갈아끼우기 ───────────────────────

CREATE OR REPLACE FUNCTION public.count_celebs_filtered(p_profession text DEFAULT NULL::text, p_nationality text DEFAULT NULL::text, p_content_type text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_tag_id uuid DEFAULT NULL::uuid, p_min_content_count integer DEFAULT 0, p_gender text DEFAULT NULL::text, p_include_inactive boolean DEFAULT false, p_celeb_tiers text[] DEFAULT NULL::text[], p_celeb_realities text[] DEFAULT NULL::text[], p_birth_year_min integer DEFAULT NULL::integer, p_birth_year_max integer DEFAULT NULL::integer)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  result bigint;
  v_profession text := coalesce(nullif(p_profession, ''), 'all');
  v_nationality text := coalesce(nullif(p_nationality, ''), 'all');
  v_content_type text := coalesce(nullif(p_content_type, ''), 'all');
  v_search text := coalesce(p_search, '');
  v_gender text := coalesce(nullif(p_gender, ''), 'all');
  v_tiers text[] := nullif(p_celeb_tiers, '{}');
  v_realities text[] := nullif(p_celeb_realities, '{}');
begin
  with type_members as (
    select distinct content_row.celeb_id
    from public.celeb_contents as content_row
    join public.contents as content on content.id = content_row.content_id
    where v_content_type <> 'all'
      and content.type = v_content_type
  )
  select count(*)
  into result
  from public.celebs as celeb
  left join public.celeb_metrics as metrics on metrics.celeb_id = celeb.id
  left join type_members as type_member on type_member.celeb_id = celeb.id
  where (p_include_inactive or celeb.publication_status = 'active')
    and (v_profession = 'all' or celeb.profession = v_profession)
    and (v_nationality = 'all' or celeb.nationality = v_nationality)
    and (
      v_gender = 'all'
      or (v_gender = 'male' and celeb.gender = true)
      or (v_gender = 'female' and celeb.gender = false)
    )
    and (v_content_type = 'all' or type_member.celeb_id is not null)
    and (
      v_search = ''
      or celeb.nickname ilike '%' || v_search || '%'
      or celeb.nickname_en ilike '%' || v_search || '%'
    )
    and (
      p_tag_id is null
      or exists (
        select 1
        from public.faction_members as assignment
        where assignment.celeb_id = celeb.id
          and assignment.lv2_id = p_tag_id
      )
    )
    and (
      coalesce(p_min_content_count, 0) <= 0
      or coalesce(metrics.content_count, 0) >= p_min_content_count
    )
    and (v_tiers is null or coalesce(celeb.celeb_tier, 'full') = any(v_tiers))
    and (v_realities is null or coalesce(celeb.celeb_reality, 'REAL') = any(v_realities))
    and (p_birth_year_min is null or public.celeb_birth_year(celeb.birth_date) >= p_birth_year_min)
    and (p_birth_year_max is null or public.celeb_birth_year(celeb.birth_date) <= p_birth_year_max);

  return result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_celebs_sorted(p_profession text DEFAULT NULL::text, p_nationality text DEFAULT NULL::text, p_content_type text DEFAULT NULL::text, p_sort_by text DEFAULT 'composite'::text, p_search text DEFAULT ''::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_tag_id uuid DEFAULT NULL::uuid, p_min_content_count integer DEFAULT 0, p_gender text DEFAULT NULL::text, p_include_inactive boolean DEFAULT false, p_celeb_tiers text[] DEFAULT NULL::text[], p_celeb_realities text[] DEFAULT NULL::text[], p_birth_year_min integer DEFAULT NULL::integer, p_birth_year_max integer DEFAULT NULL::integer)
 RETURNS TABLE(id uuid, slug text, nickname text, nickname_en text, avatar_url text, portrait_url text, profession text, title text, title_en text, consumption_philosophy text, consumption_philosophy_en text, nationality text, birth_date text, death_date text, bio text, bio_en text, is_verified boolean, claimed_by_member_id uuid, follower_count bigint, total_score integer, content_count bigint, created_at timestamp with time zone, publication_status text, celeb_tier text, celeb_reality text, gender boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_profession text := coalesce(nullif(p_profession, ''), 'all');
  v_nationality text := coalesce(nullif(p_nationality, ''), 'all');
  v_content_type text := coalesce(nullif(p_content_type, ''), 'all');
  v_search text := coalesce(p_search, '');
  v_gender text := coalesce(nullif(p_gender, ''), 'all');
  v_tiers text[] := nullif(p_celeb_tiers, '{}');
  v_realities text[] := nullif(p_celeb_realities, '{}');
begin
  return query
  with type_counts as (
    -- 필터가 있을 때만 채워진다. 'all'이면 빈 집합이라 조인 비용이 없다.
    select content_row.celeb_id, count(*)::bigint as n
    from public.celeb_contents as content_row
    join public.contents as content on content.id = content_row.content_id
    where v_content_type <> 'all'
      and content.type = v_content_type
    group by content_row.celeb_id
  ),
  candidates as (
    select
      celeb.*,
      coalesce(metrics.follower_count, 0)::bigint as computed_follower_count,
      case
        when v_content_type = 'all' then coalesce(metrics.content_count, 0)::bigint
        else coalesce(type_count.n, 0)::bigint
      end as computed_content_count,
      public.celeb_birth_year(celeb.birth_date) as computed_birth_year
    from public.celebs as celeb
    left join public.celeb_metrics as metrics on metrics.celeb_id = celeb.id
    left join type_counts as type_count on type_count.celeb_id = celeb.id
    where (p_include_inactive or celeb.publication_status = 'active')
      and (v_profession = 'all' or celeb.profession = v_profession)
      and (v_nationality = 'all' or celeb.nationality = v_nationality)
      and (
        v_gender = 'all'
        or (v_gender = 'male' and celeb.gender = true)
        or (v_gender = 'female' and celeb.gender = false)
      )
      and (v_content_type = 'all' or type_count.n > 0)
      and (
        v_search = ''
        or celeb.nickname ilike '%' || v_search || '%'
        or celeb.nickname_en ilike '%' || v_search || '%'
      )
      and (
        p_tag_id is null
        or exists (
          select 1
          from public.faction_members as assignment
          where assignment.celeb_id = celeb.id
            and assignment.lv2_id = p_tag_id
        )
      )
      and (
        coalesce(p_min_content_count, 0) <= 0
        or coalesce(metrics.content_count, 0) >= p_min_content_count
      )
      and (v_tiers is null or coalesce(celeb.celeb_tier, 'full') = any(v_tiers))
      and (v_realities is null or coalesce(celeb.celeb_reality, 'REAL') = any(v_realities))
      and (p_birth_year_min is null or public.celeb_birth_year(celeb.birth_date) >= p_birth_year_min)
      and (p_birth_year_max is null or public.celeb_birth_year(celeb.birth_date) <= p_birth_year_max)
  )
  select
    candidate.id,
    candidate.slug,
    candidate.nickname,
    candidate.nickname_en,
    candidate.avatar_url,
    candidate.portrait_url,
    candidate.profession,
    candidate.title,
    candidate.title_en,
    candidate.consumption_philosophy,
    candidate.consumption_philosophy_en,
    candidate.nationality,
    candidate.birth_date,
    candidate.death_date,
    candidate.bio,
    candidate.bio_en,
    candidate.is_verified,
    candidate.claimed_by_member_id,
    candidate.computed_follower_count,
    influence.total_score,
    candidate.computed_content_count,
    candidate.created_at,
    candidate.publication_status,
    candidate.celeb_tier,
    candidate.celeb_reality,
    candidate.gender
  from candidates as candidate
  left join public.celeb_influence as influence on influence.celeb_id = candidate.id
  order by
    case when p_sort_by = 'composite' then
      coalesce(influence.total_score, 0) * ln(candidate.computed_content_count + 2)
    end desc nulls last,
    case when p_sort_by = 'daily_recommend' then
      abs(('x' || substr(md5(candidate.id::text || current_date::text), 1, 8))::bit(32)::bigint)
    end desc nulls last,
    case when p_sort_by = 'influence' then influence.total_score end desc nulls last,
    case when p_sort_by in ('name', 'name_asc') then candidate.nickname end asc,
    case when p_sort_by = 'profession_asc' then candidate.profession end asc nulls last,
    case when p_sort_by = 'profession_desc' then candidate.profession end desc nulls last,
    case when p_sort_by = 'status_asc' then candidate.publication_status end asc nulls last,
    case when p_sort_by = 'status_desc' then candidate.publication_status end desc nulls last,
    case when p_sort_by = 'nationality_asc' then candidate.nationality end asc nulls last,
    case when p_sort_by = 'nationality_desc' then candidate.nationality end desc nulls last,
    case when p_sort_by = 'created_at_desc' then candidate.created_at end desc nulls last,
    case when p_sort_by = 'created_at_asc' then candidate.created_at end asc nulls last,
    case when p_sort_by = 'content_count' then candidate.computed_content_count end desc,
    case when p_sort_by = 'follower' then candidate.computed_follower_count end desc,
    case when p_sort_by = 'birth_date_asc' then candidate.computed_birth_year end asc nulls last,
    case when p_sort_by = 'birth_date_desc' then candidate.computed_birth_year end desc nulls last,
    candidate.nickname asc
  limit p_limit
  offset p_offset;
end;
$function$;

-- ─────────────────────── 6) 인원 검증 ───────────────────────

do $v$
declare
  n_old_lv1 integer; n_old_lv2 integer;
begin
  select count(*) into n_old_lv1
    from public.celeb_tags
    where parent_id is null and slug <> 'myth-and-fiction';
  select count(*) into n_old_lv2 from public.celeb_tags where parent_id is not null;

  if (select count(*) from public.faction_lv1) <> n_old_lv1 + 18 then
    raise exception 'lv1 인원 어긋남 — 기대 %, 실제 %',
      n_old_lv1 + 18, (select count(*) from public.faction_lv1);
  end if;
  if (select count(*) from public.faction_lv2) <> n_old_lv2 then
    raise exception 'lv2 인원 어긋남 — 기대 %, 실제 %',
      n_old_lv2, (select count(*) from public.faction_lv2);
  end if;
  if (select count(*) from public.faction_lv3)
     <> (select count(*) from public.celeb_tag_groups) then
    raise exception 'lv3 인원 어긋남';
  end if;
  if (select count(*) from public.faction_members)
     <> (select count(*) from public.celeb_tag_assignments) then
    raise exception 'members 인원 어긋남';
  end if;
end $v$;

notify pgrst, 'reload schema';

commit;
