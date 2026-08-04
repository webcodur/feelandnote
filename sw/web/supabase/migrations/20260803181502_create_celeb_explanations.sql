-- 인물 상세의 두 설명 층을 보관한다.
-- plain_text는 처음 보는 독자를 위한 사실 설명이고,
-- interpretive_text는 같은 사실을 되풀이하지 않고 인물을 읽는 관점을 제시한다.

create table public.celeb_explanations (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  plain_text text not null,
  interpretive_title text not null,
  interpretive_text text not null,
  plain_text_en text,
  interpretive_title_en text,
  interpretive_text_en text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint celeb_explanations_plain_text_not_blank
    check (length(btrim(plain_text)) > 0),
  constraint celeb_explanations_interpretive_title_not_blank
    check (length(btrim(interpretive_title)) > 0),
  constraint celeb_explanations_interpretive_text_not_blank
    check (length(btrim(interpretive_text)) > 0),
  constraint celeb_explanations_plain_text_en_not_blank
    check (plain_text_en is null or length(btrim(plain_text_en)) > 0),
  constraint celeb_explanations_interpretive_title_en_not_blank
    check (interpretive_title_en is null or length(btrim(interpretive_title_en)) > 0),
  constraint celeb_explanations_interpretive_text_en_not_blank
    check (interpretive_text_en is null or length(btrim(interpretive_text_en)) > 0)
);

create table public.celeb_explanation_sources (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.celeb_explanations(profile_id) on delete cascade,
  scope text not null default 'both',
  source_tier text not null,
  title text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint celeb_explanation_sources_scope_check
    check (scope in ('plain', 'interpretation', 'both')),
  constraint celeb_explanation_sources_source_tier_check
    check (source_tier in ('primary', 'scholarly', 'reference', 'official')),
  constraint celeb_explanation_sources_title_not_blank
    check (length(btrim(title)) > 0),
  constraint celeb_explanation_sources_url_not_blank
    check (length(btrim(url)) > 0),
  constraint celeb_explanation_sources_sort_order_check
    check (sort_order >= 0),
  constraint celeb_explanation_sources_profile_url_key
    unique (profile_id, url)
);

create index celeb_explanation_sources_profile_sort_idx
  on public.celeb_explanation_sources (profile_id, sort_order, id);

comment on table public.celeb_explanations is
  '인물 상세 읽어보기의 인물 안내와 인물 탐구를 한 행에 보관한다';
comment on column public.celeb_explanations.plain_text is
  '처음 보는 독자가 인물의 핵심 행적을 이해하도록 쓴 중립적 설명';
comment on column public.celeb_explanations.interpretive_text is
  '인물 안내의 사실을 반복하지 않고 사실 사이의 관계를 읽는 탐구글';
comment on table public.celeb_explanation_sources is
  '인물 안내와 인물 탐구를 검증하는 원전·학술·공식·권위 참고자료';

create function public.guard_celeb_explanation_profile()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = new.profile_id
      and p.profile_type = 'CELEB'
  ) then
    raise exception
      '인물 설명은 CELEB 프로필에만 만들 수 있습니다. profile_id=%',
      new.profile_id;
  end if;

  return new;
end;
$$;

create trigger trg_guard_celeb_explanation_profile
before insert or update of profile_id on public.celeb_explanations
for each row
execute function public.guard_celeb_explanation_profile();

create function public.touch_celeb_explanation_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_touch_celeb_explanation_updated_at
before update on public.celeb_explanations
for each row
execute function public.touch_celeb_explanation_updated_at();

alter table public.celeb_explanations enable row level security;
alter table public.celeb_explanation_sources enable row level security;

create policy "Public can view published celeb explanations"
  on public.celeb_explanations
  for select
  to anon, authenticated
  using (published_at is not null);

create policy "Public can view sources of published celeb explanations"
  on public.celeb_explanation_sources
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.celeb_explanations e
      where e.profile_id = celeb_explanation_sources.profile_id
        and e.published_at is not null
    )
  );

revoke all on table public.celeb_explanations
  from public, anon, authenticated;
revoke all on table public.celeb_explanation_sources
  from public, anon, authenticated;

grant select on table public.celeb_explanations
  to anon, authenticated;
grant select on table public.celeb_explanation_sources
  to anon, authenticated;
grant select, insert, update, delete on table public.celeb_explanations
  to service_role;
grant select, insert, update, delete on table public.celeb_explanation_sources
  to service_role;
grant usage, select on sequence public.celeb_explanation_sources_id_seq
  to service_role;

revoke all on function public.guard_celeb_explanation_profile()
  from public, anon, authenticated;
revoke all on function public.touch_celeb_explanation_updated_at()
  from public, anon, authenticated;

-- 시범 다섯 명이 하나라도 없으면 일부만 조용히 적재하지 않고 마이그레이션을 중단한다.
do $$
declare
  missing_slugs text;
begin
  with required_slugs(slug) as (
    values
      ('ungnyeo'),
      ('yi-sun-sin'),
      ('genghis-khan'),
      ('peter-thiel'),
      ('achilles')
  )
  select string_agg(required_slugs.slug, ', ' order by required_slugs.slug)
  into missing_slugs
  from required_slugs
  where not exists (
    select 1
    from public.profiles p
    where p.slug = required_slugs.slug
      and p.profile_type = 'CELEB'
  );

  if missing_slugs is not null then
    raise exception '인물 설명 시범 대상 프로필을 찾을 수 없습니다: %', missing_slugs;
  end if;
end;
$$;

with seed (
  slug,
  plain_text,
  interpretive_title,
  interpretive_text
) as (
  values
    (
      'ungnyeo',
      E'웅녀는 《삼국유사》의 단군 신화에 나오는 존재다. 곰과 호랑이가 환웅에게 사람이 되게 해 달라고 빌자, 환웅은 쑥과 마늘을 먹으며 햇빛을 보지 말라고 했다. 호랑이는 견디지 못했지만 곰은 스무하루를 버텨 여자가 되었다.\n\n사람이 된 웅녀에게는 함께 살 짝이 없었다. 웅녀가 신단수 아래에서 아이를 갖게 해 달라고 빌자 환웅이 사람의 모습으로 혼인했고, 둘 사이에서 단군왕검이 태어났다. 웅녀는 고조선 건국자의 어머니로 전해진다.',
      '환웅의 하강과 웅녀의 상승이 만나 고조선이 태어났다',
      E'환웅은 무리 삼천을 이끌고 하늘에서 내려와 인간 세상을 다스린다. 웅녀는 그 세상 바깥에서 출발해 사람이 되기를 청한다. 한쪽은 이미 권위와 조직을 지녔고, 다른 쪽은 몸을 바꾸는 시험과 기다림을 통과한다. 단군의 탄생은 내려온 통치자와 올라가려는 존재가 만나는 지점에 놓인다.\n\n웅녀의 변화는 여자가 되는 순간에도 끝나지 않는다. 사람이 되었어도 짝이 없어 다시 신단수 아래에서 빈다. 이 대목은 인간의 몸을 얻는 일과 인간 사회에서 자리를 얻는 일이 같지 않음을 보여 준다. 웅녀는 기다림과 청원을 거듭하고, 환웅은 그 요청에 사람의 모습으로 응한다. 고조선의 시작에는 하늘의 권위와 함께, 인간 세계에 들어가려는 웅녀의 끈질긴 소망이 놓여 있다.'
    ),
    (
      'yi-sun-sin',
      E'이순신은 임진왜란 때 조선 수군을 지휘한 장수다. 전쟁 전 전라좌수사로 부임해 배와 무기를 점검하고 군사를 훈련했으며, 전쟁이 일어나자 옥포와 한산도 등에서 일본 수군의 보급로를 공격했다. 조정의 명령을 어겼다는 죄로 파직과 고문을 당한 뒤 백의종군했다.\n\n원균이 이끈 조선 수군이 칠천량에서 무너지자 다시 삼도수군통제사가 되었다. 남은 전력으로 명량 해협에서 일본 함대를 막고 수군을 재건했으며, 1598년 노량해전에서 전사했다. 《난중일기》에는 전투뿐 아니라 군량, 질병, 가족에 대한 걱정과 수군 운영의 기록이 함께 남아 있다.',
      '이순신에게 전술과 살림은 같은 전쟁이었다',
      E'이순신의 승리에는 해전 당일의 기동과 그 이전의 군영 운영이 함께 들어 있다. 그는 군량을 마련하고 배와 화포를 손보며 병사들의 질병과 탈영을 관리했다. 피란민의 생업을 보장하고 군영의 생산 기반을 지키는 일도 전투 준비에 포함됐다. 바다에서 적선을 깨뜨리는 지휘와, 다음 전투가 가능하도록 사람과 물자를 유지하는 살림이 한 체계 안에서 움직였다.\n\n그 체계는 지휘관 개인의 결단에 크게 기대면서도 기록과 점검으로 반복될 수 있게 만들어졌다. 이순신이 물러난 뒤 수군은 칠천량에서 무너졌고, 돌아온 그는 남은 배와 흩어진 병력을 다시 묶었다. 명량의 좁은 물길을 이용한 판단은 그런 재건 위에서 힘을 냈다. 이순신은 죽음을 무릅쓴 영웅이면서도, 영웅적 결단이 나오기 전의 지루한 준비를 놓치지 않은 운영자였다.'
    ),
    (
      'genghis-khan',
      E'칭기즈 칸은 테무진이라는 이름으로 태어나 초원의 여러 집단을 통합하고 몽골 제국을 세운 통치자다. 그는 동맹과 혼인, 전쟁을 거쳐 경쟁 세력을 꺾었고, 1206년 쿠릴타이에서 칭기즈 칸으로 추대되었다. 이후 북중국과 중앙아시아까지 정복 전쟁을 넓혔다.\n\n그는 군대를 십진 단위로 재편하고 서로 다른 집단의 사람들을 섞어 기존 지도자에게 쏠리던 충성을 자신에게 돌렸다. 출신이 낮아도 능력과 충성을 보인 인물을 기용했다. 이런 통합은 도시 파괴와 대규모 살육을 동반했고, 권력은 그의 자손인 칭기즈 가문을 중심으로 이어졌다.',
      '칭기즈 칸은 혈연을 가로질러 더 큰 혈통의 제국을 세웠다',
      E'칭기즈 칸은 부족의 울타리를 약화시키고 사람들을 십호, 백호, 천호 단위로 다시 편성했다. 기존 귀족과 혈연 집단도 남았고, 그 위에 전공과 충성을 기준으로 새 지휘망이 놓였다. 이 체제는 출신이 낮은 장수에게도 상승 통로를 열었고, 정복한 여러 집단을 하나의 군사 질서 안에 묶었다.\n\n동시에 그 질서의 꼭대기는 칭기즈 칸의 가족에게 집중됐다. 측근에게 열린 발탁과 칭기즈 가문의 세습 원리는 함께 작동했다. 그의 능력 중심 인사는 부족 귀족을 누르고 군주에게 직접 연결되는 인재를 고르는 방식이었다. 낮은 출신에게 열린 상승 통로와 군주 권력의 강화가 그 안에서 함께 움직였다. 그는 초원의 오래된 소속을 가로지르는 개혁자이면서, 유라시아 전역에 자기 혈통의 통치권을 확장한 왕조의 창건자였다.'
    ),
    (
      'peter-thiel',
      E'피터 틸은 페이팔을 공동 창업하고 팔란티어를 세운 독일 태생 미국 기업가이자 투자자다. 페이팔 매각 뒤 초기 페이스북에 투자했고, 파운더스 펀드를 통해 여러 기술 기업을 지원했다. 그는 경쟁이 심한 시장에서 조금 더 잘하는 회사보다, 남들이 아직 만들지 못한 독자 기술을 가진 회사를 선호한다.\n\n그의 글과 투자는 기술이 정체된 사회에서 새로운 선택지를 만드는 데 초점을 둔다. 정치적 합의만으로 자유를 넓히기 어렵다고 보며 인터넷, 우주, 해상도시 같은 새로운 영역에 기대를 걸었다. 동시에 팔란티어는 정보 분석 소프트웨어를 미국 정부와 군, 정보기관에 공급해 성장했다.',
      '피터 틸은 자유의 출구를 찾으며 국가 권력의 안쪽으로 들어갔다',
      E'피터 틸은 기존 제도 안에서 다수를 설득하는 일에 회의적이며, 기술로 새로운 선택지를 만드는 일에 무게를 둔다. 경쟁을 피할 독점적 기술, 국경의 제약을 덜 받는 인터넷, 우주와 해상도시는 모두 이미 정해진 경기장 밖으로 나가려는 구상이다. 창업자는 투표로 모든 결정을 미루지 않고 한 방향을 오래 밀어붙일 수 있다는 점도 그가 기업을 높게 보는 이유다.\n\n이 출구의 철학은 팔란티어 사업과 함께 놓여 있다. 팔란티어는 복잡한 세계를 데이터로 읽고 소수의 판단자가 더 빠르게 결정하도록 돕는다. 그 결과 개인의 탈출을 꿈꾸는 자유지상주의와 정부와 군의 판단 능력을 강화하는 사업이 한 인물 안에서 함께 자랐다. 틸에게 기술은 기존 권력에서 벗어나는 통로이면서, 자신이 신뢰하는 권력의 실행력을 키우는 도구이기도 하다.'
    ),
    (
      'achilles',
      E'아킬레우스는 호메로스의 《일리아스》에서 아카이아군 최강으로 묘사되는 전사다. 총사령관 아가멤논이 전리품 브리세이스를 빼앗아 명예를 훼손하자 전투에서 물러난다. 아카이아군이 밀리고 아가멤논이 보상과 사과를 제안해도 쉽게 돌아오지 않는다.\n\n가까운 동료 파트로클로스가 자신의 갑옷을 입고 싸우다 헥토르에게 죽자, 아킬레우스는 자신의 죽음이 가까워질 것을 알면서도 전장으로 돌아와 헥토르를 죽인다. 그는 시신을 모욕하지만, 아버지 프리아모스가 직접 찾아와 돌려 달라고 빌자 함께 울고 시신을 내준다. 《일리아스》는 아킬레우스의 죽음이 아니라 헥토르의 장례로 끝난다.',
      '아킬레우스의 분노는 적을 쓰러뜨리고, 적의 슬픔 앞에서 멈춘다',
      E'《일리아스》의 아킬레우스에게 힘과 분노는 떨어지지 않는다. 모욕당했을 때 그는 전우들의 패배를 알면서도 전투를 거부하고, 파트로클로스를 잃은 뒤에는 자신의 죽음까지 받아들이며 복수에 나선다. 그의 분노는 명예를 지키는 힘이면서 가까운 사람과 자기 삶을 함께 태우는 힘이다.\n\n헥토르를 죽인 뒤에도 분노는 끝나지 않아 시신을 거듭 끌고 다닌다. 그러나 프리아모스가 찾아와 아킬레우스의 아버지 펠레우스를 떠올리게 하자 두 사람은 각자의 잃을 사람을 생각하며 함께 운다. 아킬레우스는 헥토르의 시신을 돌려주고 장례를 위한 휴전까지 허락한다. 잔혹함은 그대로 남아 있고, 그 곁에 연민이 생긴다. 그는 적의 슬픔도 자기 슬픔과 같은 종류라는 사실을 잠시 받아들인다.'
    )
)
insert into public.celeb_explanations (
  profile_id,
  plain_text,
  interpretive_title,
  interpretive_text
)
select
  p.id,
  seed.plain_text,
  seed.interpretive_title,
  seed.interpretive_text
from seed
join public.profiles p
  on p.slug = seed.slug
 and p.profile_type = 'CELEB';

with source_seed (
  slug,
  scope,
  source_tier,
  title,
  url,
  sort_order
) as (
  values
    ('ungnyeo', 'both', 'reference', '한국민족문화대백과사전: 웅녀', 'https://encykorea.aks.ac.kr/Article/E0040541', 0),
    ('ungnyeo', 'both', 'official', '우리역사넷: 단군 신화', 'https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_n100800', 1),
    ('yi-sun-sin', 'both', 'reference', '한국민족문화대백과사전: 이순신', 'https://encykorea.aks.ac.kr/Article/E0044900', 0),
    ('yi-sun-sin', 'both', 'official', '우리역사넷: 난중일기', 'https://contents.history.go.kr/mobile/ts/view.do?levelId=ts_b03', 1),
    ('genghis-khan', 'both', 'primary', 'The Secret History of the Mongols, translated by Igor de Rachewiltz', 'https://sourcebooks.web.fordham.edu/basis/The%20Secret%20History%20of%20the%20Mongols_%20A%20Mongolian%20Epic%20Chronicle%20of.pdf', 0),
    ('genghis-khan', 'interpretation', 'scholarly', 'The Rise of the Chinggisid Dynasty', 'https://www.cambridge.org/core/journals/international-journal-of-asian-studies/article/rise-of-the-chinggisid-dynasty-premodern-eurasian-political-order-and-culture-at-a-glance/352DF0C8B1D1ACE0767EC0E27029A8AC', 1),
    ('genghis-khan', 'interpretation', 'scholarly', 'The Military Formation from the Mongol Empire to the Yuan Dynasty', 'https://www.jstage.jst.go.jp/article/shigaku/95/7/95_KJ00003674014/_article/-char/en', 2),
    ('peter-thiel', 'interpretation', 'primary', 'The Education of a Libertarian', 'https://www.cato-unbound.org/2009/04/13/peter-thiel/education-libertarian/', 0),
    ('peter-thiel', 'plain', 'official', 'Founders Fund: Peter Thiel', 'https://foundersfund.com/team/peter-thiel/', 1),
    ('peter-thiel', 'plain', 'official', 'Palantir Technologies: Board of Directors', 'https://investors.palantir.com/board.html', 2),
    ('peter-thiel', 'both', 'official', 'Palantir Technologies 2025 Annual Report', 'https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm', 3),
    ('achilles', 'both', 'primary', 'Homer, Iliad, Book 9', 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0217%3Abook%3D9', 0),
    ('achilles', 'both', 'primary', 'Homer, Iliad, Book 18', 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0217%3Abook%3D18', 1),
    ('achilles', 'both', 'primary', 'Homer, Iliad, Book 24', 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0217%3Abook%3D24', 2)
)
insert into public.celeb_explanation_sources (
  profile_id,
  scope,
  source_tier,
  title,
  url,
  sort_order
)
select
  p.id,
  source_seed.scope,
  source_seed.source_tier,
  source_seed.title,
  source_seed.url,
  source_seed.sort_order
from source_seed
join public.profiles p
  on p.slug = source_seed.slug
 and p.profile_type = 'CELEB';

do $$
declare
  seeded_count integer;
begin
  select count(*)
  into seeded_count
  from public.celeb_explanations e
  join public.profiles p on p.id = e.profile_id
  where p.slug in (
    'ungnyeo',
    'yi-sun-sin',
    'genghis-khan',
    'peter-thiel',
    'achilles'
  );

  if seeded_count <> 5 then
    raise exception '인물 설명 시범 적재 수가 5명이 아닙니다. actual=%', seeded_count;
  end if;
end;
$$;
