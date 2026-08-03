begin;

create temporary table collective_targets(folder text, person_name text, primary key(folder, person_name)) on commit drop;
insert into collective_targets values
('argonauts', '하르피이아'),
('Homer-Odyssey', '라이스트뤼고네스'),
('Homer-Odyssey', '세이렌'),
('Homer-Odyssey', '로토스파고스족'),
('myth-norse', '기주키의 형제들');

create temporary table collective_matches on commit drop as
select t.*, fp.id faction_person_id, fp.cluster_id, fp.celeb_id
from collective_targets t
join faction_episodes e on e.folder = t.folder
join faction_groups g on g.episode_id = e.id
join faction_clusters c on c.group_id = g.id
join faction_people fp on fp.cluster_id = c.id and fp.name = t.person_name;

do $$
declare
  matched_count integer;
  profile_count integer;
begin
  select count(*), count(distinct celeb_id) into matched_count, profile_count from collective_matches;
  if matched_count <> 5 or profile_count <> 5 then
    raise exception '집단형 fiction 대상 수량 불일치: rows %, profiles %', matched_count, profile_count;
  end if;
  if exists (
    select 1 from faction_people fp
    join (select distinct celeb_id from collective_matches) target on target.celeb_id = fp.celeb_id
    left join collective_matches matched on matched.faction_person_id = fp.id
    where matched.faction_person_id is null
  ) then
    raise exception '집단형 fiction 계정이 대상 밖 faction_people에서도 사용됩니다.';
  end if;
  if exists (select 1 from discourse_speakers where celeb_id in (select distinct celeb_id from collective_matches)) then
    raise exception '집단형 fiction 계정이 discourse_speakers에서 사용됩니다.';
  end if;
end $$;

create temporary table affected_clusters on commit drop as
select distinct cluster_id from collective_matches;

delete from faction_people fp using collective_matches m where fp.id = m.faction_person_id;

update faction_people fp set position = fp.position + 10000
where fp.cluster_id in (select cluster_id from affected_clusters);

with ranked as (
  select fp.id, row_number() over (partition by fp.cluster_id order by fp.position, fp.id)::integer new_position
  from faction_people fp where fp.cluster_id in (select cluster_id from affected_clusters)
)
update faction_people fp set position = ranked.new_position from ranked where fp.id = ranked.id;

do $$
declare
  remaining integer;
  empty_groups integer;
  total_people integer;
begin
  select count(*) into remaining from faction_people where celeb_id in (select distinct celeb_id from collective_matches);
  if remaining <> 0 then raise exception '집단형 fiction 계정 참조가 %개 남았습니다.', remaining; end if;
  select count(*) into empty_groups
  from faction_groups g
  where g.id in (
    select distinct c.group_id from faction_clusters c join collective_matches m on m.cluster_id = c.id
  ) and not exists (
    select 1 from faction_clusters c join faction_people fp on fp.cluster_id = c.id where c.group_id = g.id
  );
  if empty_groups <> 0 then raise exception '집단 행 제거로 빈 그룹이 %개 생겼습니다.', empty_groups; end if;
  select count(*) into total_people from faction_people;
  if total_people <> 1442 then raise exception '최종 faction_people 수량 불일치: % / 1442', total_people; end if;
end $$;

select (select count(*) from faction_people) faction_people_after,
       (select count(distinct celeb_id) from collective_matches) auth_profiles_to_delete;

commit;
