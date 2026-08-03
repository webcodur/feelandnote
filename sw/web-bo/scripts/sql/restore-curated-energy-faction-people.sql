begin;

create temporary table energy_curated_people (
  group_name text not null,
  profile_id uuid not null,
  position integer not null,
  org text not null,
  short_desc text not null,
  long_desc text not null,
  primary key (group_name, profile_id)
) on commit drop;

insert into energy_curated_people values
(E'핵융합\n인공 태양을 켜다', '8a70f436-28cc-4965-82e7-930358f5674c', 1, 'Commonwealth Fusion Systems / MIT', '작고 강한 핵융합로', '세계 최강 초전도 자석을 만들어 거대하지 않은 핵융합로를 가능하게 했다.'),
(E'핵융합\n인공 태양을 켜다', '6e6484a4-4a83-4df6-8f97-850ca8074f4b', 2, 'Commonwealth Fusion Systems', '전기를 먼저 팔았다', '핵융합 전기를 구글과 에니에 미리 팔았다. 아직 켜지지도 않은 발전소의 계약이다.'),
(E'핵융합\n인공 태양을 켜다', '6d98d79a-e1f1-47e1-9888-88217251ae34', 3, 'Helion Energy', '2028년까지라는 약속', '마이크로소프트에 2028년까지 핵융합 전기를 대겠다고 계약했다. 가장 무모한 약속이다.'),
(E'핵융합\n인공 태양을 켜다', '6372b863-9c07-4d79-b067-98a3a76fb6da', 4, 'TAE Technologies', '남들과 다른 방식', '수소-붕소 방식을 고집해 온 핵융합 진영의 이단아다.'),
(E'소형모듈원전(SMR)\n안전하고 거대한 빛', 'e155d6a9-de55-459b-8b3c-8e8821d53860', 1, 'NuScale Power', '작은 원자로를 설계하다', '미국 최초로 설계 인증을 받은 소형모듈원자로를 설계했다.'),
(E'소형모듈원전(SMR)\n안전하고 거대한 빛', '2d6ec78e-d992-417b-8b64-b413f28db08f', 2, 'TerraPower', '건설 허가를 받아낸 쪽', '미국 최초로 상업 규모 차세대 원자로 건설 허가를 받아냈다.'),
(E'소형모듈원전(SMR)\n안전하고 거대한 빛', 'ac9dfdab-f1c0-43be-a08f-24d043f1cece', 3, 'X-energy', '규제하던 사람이 만든다', '에너지부 부장관으로 원자력을 규제하다가 직접 원자로 회사를 이끈다.'),
(E'차세대 배터리\n전기를 담는 궁극의 그릇', 'e0a2aaa1-1436-4b29-938c-27743d7a9f4d', 1, 'QuantumScape', '전고체를 실제로 굴리다', '시험생산 라인을 돌려 전고체 배터리를 실물로 만들기 시작했다.');

do $$
declare
  current_count integer;
  profile_count integer;
begin
  select count(*) into current_count
  from faction_people fp
  join faction_clusters c on c.id = fp.cluster_id
  join faction_groups g on g.id = c.group_id
  join faction_episodes e on e.id = g.episode_id
  where e.folder = 'energy-industry';
  if current_count <> 4 then raise exception 'energy-industry 교체 전 인물 수 불일치: % / 4', current_count; end if;

  select count(*) into profile_count
  from profiles p join energy_curated_people target on target.profile_id = p.id
  where p.profile_type = 'CELEB' and p.status in ('active','inactive','suspended');
  if profile_count <> 8 then raise exception '에너지 정본 CELEB 수 불일치: % / 8', profile_count; end if;
end $$;

delete from faction_people fp
using faction_clusters c, faction_groups g, faction_episodes e
where fp.cluster_id = c.id and c.group_id = g.id and g.episode_id = e.id and e.folder = 'energy-industry';

insert into faction_people (
  cluster_id, position, name, name_en, slug, celeb_id, org,
  lines, epithet, disabled, longform_only, mythical, data, web_hidden
)
select cluster.id, target.position, profile.nickname, profile.nickname_en, profile.slug, profile.id, target.org,
       array[target.short_desc], target.long_desc, false, false, false, '{}'::jsonb, false
from energy_curated_people target
join faction_episodes episode on episode.folder = 'energy-industry'
join faction_groups faction_group on faction_group.episode_id = episode.id and faction_group.name = target.group_name
join lateral (
  select c.* from faction_clusters c where c.group_id = faction_group.id order by c.position limit 1
) cluster on true
join profiles profile on profile.id = target.profile_id;

update faction_episodes set updated_at = now() where folder = 'energy-industry';

do $$
declare
  final_count integer;
  total_people integer;
begin
  select count(*) into final_count
  from faction_people fp
  join faction_clusters c on c.id = fp.cluster_id
  join faction_groups g on g.id = c.group_id
  join faction_episodes e on e.id = g.episode_id
  where e.folder = 'energy-industry';
  if final_count <> 8 then raise exception 'energy-industry 교체 후 인물 수 불일치: % / 8', final_count; end if;
  select count(*) into total_people from faction_people;
  if total_people <> 1446 then raise exception '최종 faction_people 수량 불일치: % / 1446', total_people; end if;
end $$;

select (select count(*) from faction_people) faction_people_after,
       (select count(*) from energy_curated_people) energy_people_after;

commit;
