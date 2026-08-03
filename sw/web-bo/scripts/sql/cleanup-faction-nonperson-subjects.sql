begin;

create temporary table cleanup_targets (
  folder text not null,
  person_name text not null,
  delete_profile boolean not null,
  action text not null check (action in ('delete', 'remap')),
  primary key (folder, person_name)
) on commit drop;

insert into cleanup_targets(folder, person_name, delete_profile, action) values
('autonomous-driving','Waymo',true,'delete'),('autonomous-driving','Tesla (FSD)',true,'delete'),('autonomous-driving','Cruise',true,'delete'),
('aviation-industry','Boeing',true,'delete'),('aviation-industry','Airbus',true,'delete'),('aviation-industry','C919',true,'delete'),
('defense-industry','F-35 / F-22',true,'delete'),('defense-industry','방공 요격 미사일',true,'delete'),('defense-industry','B-21 스텔스 폭격기',true,'delete'),('defense-industry','M1 에이브럼스',true,'delete'),('defense-industry','Shield AI',true,'delete'),('defense-industry','BAE Systems',true,'delete'),('defense-industry','Rheinmetall',true,'delete'),('defense-industry','라팔 (Rafale)',true,'delete'),('defense-industry','K9 자주포',true,'delete'),('defense-industry','FA-50',false,'delete'),('defense-industry','K2 흑표',true,'delete'),
('drone-industry','DJI',true,'delete'),('drone-industry','Skydio',true,'delete'),('drone-industry','Reaper / Global Hawk',true,'delete'),
('energy-industry','NuScale',true,'delete'),('energy-industry','TerraPower',true,'delete'),('energy-industry','X-energy',true,'delete'),('energy-industry','Commonwealth Fusion',true,'delete'),('energy-industry','Helion Energy',true,'delete'),('energy-industry','TAE Technologies',true,'delete'),('energy-industry','QuantumScape',true,'delete'),('energy-industry','CATL',true,'delete'),
('ev-wars','Tesla (Cybertruck)',true,'delete'),('ev-wars','BYD',true,'delete'),('ev-wars','현대 아이오닉',true,'delete'),('ev-wars','Rivian',true,'delete'),('ev-wars','Lucid Motors',true,'delete'),('ev-wars','포르쉐 타이칸',true,'delete'),('ev-wars','CATL',true,'delete'),('ev-wars','LG에너지솔루션',true,'delete'),('ev-wars','Panasonic',true,'delete'),
('humanoids','Optimus',true,'delete'),('humanoids','Atlas',true,'delete'),('humanoids','Spot',true,'delete'),('humanoids','Figure 03',true,'delete'),('humanoids','NEO Beta',true,'delete'),('humanoids','Unitree G1',true,'delete'),
('intelligence-agencies','CIA',true,'delete'),('intelligence-agencies','MI6 (SIS)',true,'delete'),('intelligence-agencies','Mossad',true,'delete'),
('space-industry','Falcon 9',true,'delete'),('space-industry','Falcon Heavy',true,'delete'),('space-industry','Starship',true,'delete'),('space-industry','Dragon',true,'delete'),('space-industry','New Shepard',true,'delete'),('space-industry','New Glenn',true,'delete'),('space-industry','Saturn V',true,'delete'),('space-industry','SLS',true,'delete'),('space-industry','Atlas V',true,'delete'),('space-industry','Vulcan Centaur',true,'delete'),('space-industry','Electron',true,'delete'),('space-industry','Neutron',true,'delete'),
('special-forces','DEVGRU (SEAL Team 6)',true,'delete'),('special-forces','SAS',true,'delete'),('special-forces','707 특임단',true,'delete'),
('great-hackers-masked','죽은 소의 교단',true,'delete'),('great-hackers-masked','어나니머스',true,'delete'),('great-hackers-masked','럴즈섹',true,'delete'),('great-hackers-masked','다크사이드',true,'delete'),
('great-hackers-faces','워즈니악 & 잡스',true,'remap'),('digital-gold-rush','윙클보스 형제',true,'remap');

create temporary table cleanup_matches on commit drop as
select t.*, e.id as episode_id, g.id as group_id, c.id as cluster_id,
       fp.id as faction_person_id, fp.celeb_id as old_celeb_id
from cleanup_targets t
join faction_episodes e on e.folder = t.folder
join faction_groups g on g.episode_id = e.id
join faction_clusters c on c.group_id = g.id
join faction_people fp on fp.cluster_id = c.id and fp.name = t.person_name;

do $$
declare
  target_count integer;
  matched_count integer;
  distinct_row_count integer;
  wrong_profile_count integer;
  bad_email_count integer;
  destination_count integer;
  ref record;
  ref_count bigint;
begin
  select count(*) into target_count from cleanup_targets;
  select count(*), count(distinct faction_person_id), count(distinct old_celeb_id) filter (where delete_profile)
    into matched_count, distinct_row_count, wrong_profile_count from cleanup_matches;
  if target_count <> 67 or matched_count <> 67 or distinct_row_count <> 67 or wrong_profile_count <> 65 then
    raise exception '비인물 정리 대상 수량 불일치: targets %, matches %, rows %, profiles %',
      target_count, matched_count, distinct_row_count, wrong_profile_count;
  end if;

  select count(*) into bad_email_count
  from cleanup_matches m
  join auth.users u on u.id = m.old_celeb_id
  where m.delete_profile and u.email like 'celeb_faction_%@feelandnote.local';
  if bad_email_count <> 66 then
    raise exception '일괄 생성 계정 표식 불일치: target rows % / 66', bad_email_count;
  end if;

  select count(*) into destination_count from profiles
  where profile_type = 'CELEB' and status <> 'deleted'
    and nickname in ('스티브 잡스', '카메론 윙클보스');
  if destination_count <> 2 then
    raise exception '개인 재연결 목적 프로필 수 불일치: % / 2', destination_count;
  end if;

  if exists (
    select 1
    from faction_people fp
    join (select distinct old_celeb_id from cleanup_matches where delete_profile) doomed
      on doomed.old_celeb_id = fp.celeb_id
    left join cleanup_matches m on m.faction_person_id = fp.id
    where m.faction_person_id is null
  ) then
    raise exception '삭제 예정 계정이 정리 대상 밖의 faction_people에서도 사용됩니다.';
  end if;

  for ref in
    select tc.table_schema, tc.table_name, kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = tc.constraint_name and kcu.constraint_schema = tc.constraint_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name and ccu.constraint_schema = tc.constraint_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and ccu.table_schema = 'public' and ccu.table_name = 'profiles' and ccu.column_name = 'id'
  loop
    execute format(
      'select count(*) from %I.%I where %I in (select distinct old_celeb_id from cleanup_matches where delete_profile)',
      ref.table_schema, ref.table_name, ref.column_name
    ) into ref_count;
    if ref_count > 0 and not (
      (ref.table_schema = 'public' and ref.table_name = 'faction_people' and ref.column_name = 'celeb_id') or
      (ref.table_schema = 'public' and ref.table_name = 'user_social' and ref.column_name = 'user_id') or
      (ref.table_schema = 'public' and ref.table_name = 'user_scores' and ref.column_name = 'user_id')
    ) then
      raise exception '삭제 예정 계정의 예상 밖 참조: %.%.% = %',
        ref.table_schema, ref.table_name, ref.column_name, ref_count;
    end if;
  end loop;
end $$;

create temporary table affected_clusters(cluster_id uuid primary key) on commit drop;
insert into affected_clusters select distinct cluster_id from cleanup_matches;

-- 둘 이상의 사람을 한 계정으로 묶었던 행은 발언 주체 한 사람에게 정확히 다시 연결한다.
update faction_people fp
set celeb_id = p.id,
    slug = p.slug,
    name = p.nickname,
    name_en = p.nickname_en,
    org = 'Blue Box'
from cleanup_matches m
join profiles p on p.nickname = '스티브 잡스' and p.profile_type = 'CELEB' and p.status <> 'deleted'
where fp.id = m.faction_person_id
  and m.folder = 'great-hackers-faces' and m.person_name = '워즈니악 & 잡스';

update faction_people fp
set celeb_id = p.id,
    slug = p.slug,
    name = p.nickname,
    name_en = p.nickname_en,
    org = 'Gemini',
    epithet = '페이스북 소송 합의금을 비트코인에 투자하고, 규제 안에서 거래하는 미국 거래소 Gemini를 공동 설립했다.',
    epithet_en = 'He invested his Facebook settlement in Bitcoin and co-founded Gemini, a U.S. exchange built to operate within regulation.'
from cleanup_matches m
join profiles p on p.nickname = '카메론 윙클보스' and p.profile_type = 'CELEB' and p.status <> 'deleted'
where fp.id = m.faction_person_id
  and m.folder = 'digital-gold-rush' and m.person_name = '윙클보스 형제';

-- 다른 팩션에서 이미 검증·연결된 실제 인물 행을 관련 회사 그룹 아래로 복제한다.
create temporary table clone_replacements (
  target_folder text not null,
  target_group text not null,
  profile_slug text not null,
  source_folder text not null,
  primary key (target_folder, target_group, profile_slug)
) on commit drop;

insert into clone_replacements values
('energy-industry', E'소형모듈원전(SMR)\n안전하고 거대한 빛', 'bill-gates', 'energy-cartel'),
('energy-industry', E'차세대 배터리\n전기를 담는 궁극의 그릇', 'jb-straubel', 'X-Empire'),
('energy-industry', E'차세대 배터리\n전기를 담는 궁극의 그릇', 'robin-zeng', 'ev-wars'),
('space-industry', 'SpaceX', 'elon-musk', 'space-race'),
('space-industry', 'SpaceX', 'gwynne-shotwell', 'space-race'),
('space-industry', 'Blue Origin', 'jeff-bezos', 'space-race'),
('space-industry', '전통의 거인', 'wernher-von-braun', 'space-race'),
('space-industry', 'Rocket Lab', 'peter-beck', 'space-race');

insert into faction_people (
  cluster_id, position, name, name_en, slug, celeb_id, org, mythical,
  epithet, epithet_en, lines, lines_en, image, quote, quote_en,
  quote_chunks, quote_en_chunks, quote_origin, quote_duration, epithet_duration,
  disabled, longform_only, mined, data, web_hidden
)
select target_cluster.id,
       900 + row_number() over (partition by target_cluster.id order by replacements.profile_slug),
       source_person.name, source_person.name_en, profile.slug, profile.id, source_person.org, source_person.mythical,
       source_person.epithet, source_person.epithet_en, source_person.lines, source_person.lines_en,
       null, source_person.quote, source_person.quote_en,
       source_person.quote_chunks, source_person.quote_en_chunks, source_person.quote_origin,
       source_person.quote_duration, source_person.epithet_duration,
       false, source_person.longform_only, source_person.mined, source_person.data, false
from clone_replacements replacements
join faction_episodes target_episode on target_episode.folder = replacements.target_folder
join faction_groups target_group on target_group.episode_id = target_episode.id and target_group.name = replacements.target_group
join lateral (
  select c.* from faction_clusters c where c.group_id = target_group.id order by c.position limit 1
) target_cluster on true
join profiles profile on profile.slug = replacements.profile_slug and profile.profile_type = 'CELEB' and profile.status <> 'deleted'
join lateral (
  select fp.*
  from faction_people fp
  join faction_clusters c on c.id = fp.cluster_id
  join faction_groups g on g.id = c.group_id
  join faction_episodes e on e.id = g.episode_id
  where e.folder = replacements.source_folder and fp.celeb_id = profile.id
  order by g.position, c.position, fp.position
  limit 1
) source_person on true;

-- 관련 발언 행이 없던 두 그룹은 실제 인물 최소 행으로 만든다. 비인물 설명을 개인 발언으로 옮기지 않는다.
insert into faction_people (
  cluster_id, position, name, name_en, slug, celeb_id, org,
  lines, lines_en, disabled, longform_only, mythical, data, web_hidden
)
select c.id, 950, p.nickname, p.nickname_en, p.slug, p.id, 'Tesla',
       array['Tesla CEO', '자율주행 FSD 추진'], array['CEO of Tesla', 'Leads the FSD autonomous-driving program'],
       false, false, false, '{}'::jsonb, false
from faction_episodes e
join faction_groups g on g.episode_id = e.id and g.name = '비전 AI의 맹신자'
join lateral (select c.* from faction_clusters c where c.group_id = g.id order by c.position limit 1) c on true
join profiles p on p.slug = 'elon-musk' and p.profile_type = 'CELEB' and p.status <> 'deleted'
where e.folder = 'autonomous-driving';

insert into faction_people (
  cluster_id, position, name, name_en, slug, celeb_id, org,
  lines, lines_en, disabled, longform_only, mythical, data, web_hidden
)
select c.id, 950, p.nickname, p.nickname_en, p.slug, p.id, 'Helion Energy',
       array['Helion Energy 이사회 의장', '핵융합 상용화 투자'], array['Chairman of Helion Energy', 'Backer of commercial fusion energy'],
       false, false, false, '{}'::jsonb, false
from faction_episodes e
join faction_groups g on g.episode_id = e.id and g.name = E'핵융합\n인공 태양을 켜다'
join lateral (select c.* from faction_clusters c where c.group_id = g.id order by c.position limit 1) c on true
join profiles p on p.slug = 'sam-altman' and p.profile_type = 'CELEB' and p.status <> 'deleted'
where e.folder = 'energy-industry';

insert into affected_clusters
select distinct c.id
from faction_clusters c
join faction_groups g on g.id = c.group_id
join faction_episodes e on e.id = g.episode_id
where (e.folder = 'energy-industry' and g.name in (E'소형모듈원전(SMR)\n안전하고 거대한 빛', E'핵융합\n인공 태양을 켜다', E'차세대 배터리\n전기를 담는 궁극의 그릇'))
   or (e.folder = 'space-industry')
on conflict do nothing;

delete from faction_people fp
using cleanup_matches m
where fp.id = m.faction_person_id and m.action = 'delete';

-- 공개적으로 특정할 개인을 두지 않은 707 행은 조직 계정을 남기지 않고 그룹만 비활성 보존한다.
update faction_groups g
set disabled = true
from faction_episodes e
where g.episode_id = e.id and e.folder = 'special-forces'
  and g.name = E'한국 707 특수임무단\n국가 대테러 최정예';

-- 삭제 뒤 position의 구멍을 안전하게 압축한다.
update faction_people fp
set position = fp.position + 10000
where fp.cluster_id in (select cluster_id from affected_clusters);

with ranked as (
  select fp.id,
         row_number() over (partition by fp.cluster_id order by fp.position, fp.id)::integer as new_position
  from faction_people fp
  where fp.cluster_id in (select cluster_id from affected_clusters)
)
update faction_people fp
set position = ranked.new_position
from ranked
where fp.id = ranked.id;

do $$
declare
  remaining_targets integer;
  doomed_refs integer;
  total_people integer;
  active_empty_groups integer;
begin
  select count(*) into remaining_targets
  from faction_people fp
  join faction_clusters c on c.id = fp.cluster_id
  join faction_groups g on g.id = c.group_id
  join faction_episodes e on e.id = g.episode_id
  join cleanup_targets t on t.folder = e.folder and t.person_name = fp.name;
  if remaining_targets <> 0 then raise exception '비인물 대상 행이 %개 남았습니다.', remaining_targets; end if;

  select count(*) into doomed_refs
  from faction_people fp
  where fp.celeb_id in (select distinct old_celeb_id from cleanup_matches where delete_profile);
  if doomed_refs <> 0 then raise exception '삭제 예정 계정 참조가 %개 남았습니다.', doomed_refs; end if;

  select count(*) into active_empty_groups
  from faction_groups g
  join faction_episodes e on e.id = g.episode_id
  where e.folder in (select distinct folder from cleanup_targets)
    and not g.disabled
    and not exists (
      select 1 from faction_clusters c join faction_people fp on fp.cluster_id = c.id
      where c.group_id = g.id and not fp.disabled
    );
  if active_empty_groups <> 0 then raise exception '영향 범위에 활성 빈 그룹이 %개 남았습니다.', active_empty_groups; end if;

  select count(*) into total_people from faction_people;
  if total_people <> 1447 then raise exception '최종 faction_people 수량 불일치: % / 1447', total_people; end if;
end $$;

select
  (select count(*) from faction_people) as faction_people_after,
  (select count(distinct old_celeb_id) from cleanup_matches where delete_profile) as auth_profiles_to_delete,
  (select count(*) from cleanup_matches where action = 'delete') as removed_nonperson_rows,
  (select count(*) from cleanup_matches where action = 'remap') as remapped_pair_rows;

commit;
