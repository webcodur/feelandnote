-- celeb_relations_external의 rel_type/rel_group CHECK를 celeb_relations와 동일한 집합으로 확장.
-- 수동 조사로 확보한 명단 밖 협력자·스승·공동창업자·대응 인물(QID 기반 외부 노드)을 수용한다.
begin;

alter table public.celeb_relations_external
  drop constraint celeb_relations_external_rel_type_check;
alter table public.celeb_relations_external
  add constraint celeb_relations_external_rel_type_check
  check (rel_type = any (array[
    'father','mother','parent','child','spouse','partner','sibling','relative',
    'teacher','student','influence','influenced','rival','cofounder','friend','colleague','counterpart'
  ]::text[]));

alter table public.celeb_relations_external
  drop constraint celeb_relations_external_rel_group_check;
alter table public.celeb_relations_external
  add constraint celeb_relations_external_rel_group_check
  check (rel_group = any (array['family','thought','rivalry','career','friendship','counterpart']::text[]));

commit;
