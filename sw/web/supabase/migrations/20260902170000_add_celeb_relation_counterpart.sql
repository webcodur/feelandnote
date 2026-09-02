begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  existing_expression text;
begin
  select pg_get_expr(conbin, conrelid)
    into strict existing_expression
  from pg_constraint
  where conrelid = 'public.celeb_relations'::regclass
    and conname = 'celeb_relations_rel_group_check'
    and contype = 'c';

  if position('counterpart' in existing_expression) = 0 then
    execute 'alter table public.celeb_relations drop constraint celeb_relations_rel_group_check';
    execute format(
      'alter table public.celeb_relations add constraint celeb_relations_rel_group_check check ((%s) or rel_group = %L) not valid',
      existing_expression,
      'counterpart'
    );
  end if;
end
$$;

do $$
declare
  existing_expression text;
begin
  select pg_get_expr(conbin, conrelid)
    into strict existing_expression
  from pg_constraint
  where conrelid = 'public.celeb_relations'::regclass
    and conname = 'celeb_relations_rel_type_check'
    and contype = 'c';

  if position('counterpart' in existing_expression) = 0 then
    execute 'alter table public.celeb_relations drop constraint celeb_relations_rel_type_check';
    execute format(
      'alter table public.celeb_relations add constraint celeb_relations_rel_type_check check ((%s) or rel_type = %L) not valid',
      existing_expression,
      'counterpart'
    );
  end if;
end
$$;

commit;

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.celeb_relations
  validate constraint celeb_relations_rel_group_check;

alter table public.celeb_relations
  validate constraint celeb_relations_rel_type_check;

insert into public.celeb_relations (
  from_id,
  to_id,
  rel_type,
  rel_group,
  source,
  note,
  note_en
)
values
  (
    '3c79a77a-b0d1-4adc-808c-ec2e2556ee8f',
    'a3c83e3e-dc4d-44fa-8a60-a37eb17287aa',
    'counterpart',
    'counterpart',
    'manual',
    '그리스의 제우스와 로마의 유피테르는 고대 지중해 세계에서 서로 대응하는 최고신으로 동일시되었지만, 각 문화권에서 독자적인 이름과 숭배·국가적 역할을 지녔다.',
    'Zeus and Jupiter were identified as corresponding supreme gods in the Greco-Roman world, while retaining distinct Greek and Roman names, cults, and civic roles.'
  ),
  (
    '274e2a28-1167-4dc0-be7c-f781a0ac2d6d',
    'ac4f88e1-8d7b-4583-9934-59b471018146',
    'counterpart',
    'counterpart',
    'manual',
    '그리스의 헤라와 로마의 유노는 혼인과 왕권을 관장하는 대응 여신으로 동일시되었지만, 유노는 로마 국가와 카피톨리누스 삼신 안에서 독자적인 공적 역할을 지녔다.',
    'Hera and Juno were identified as corresponding goddesses of marriage and sovereignty, while Juno held a distinct civic role in the Roman state and the Capitoline Triad.'
  ),
  (
    '874a2818-b593-4097-b27a-71ff33ed70b0',
    'fb09753f-9645-4344-a536-3addc13e5988',
    'counterpart',
    'counterpart',
    'manual',
    '그리스의 헤르메스와 로마의 메르쿠리우스는 신들의 전령이자 여행과 교역의 수호신으로 대응하지만, 각 문화권의 이름과 숭배 전통은 별개다.',
    'Hermes and Mercury correspond as divine messengers and patrons of travel and trade, while retaining distinct Greek and Roman names and cult traditions.'
  ),
  (
    '04440a25-0846-4ca1-9538-968427909caa',
    '40e2cbfd-b019-45ec-8468-3e7fba825bf0',
    'counterpart',
    'counterpart',
    'manual',
    '그리스의 아프로디테와 로마의 베누스는 사랑과 미의 대응 여신으로 동일시되었지만, 베누스는 아이네이아스와 로마인의 시조 계보에서 독자적인 국가적 의미를 얻었다.',
    'Aphrodite and Venus were identified as corresponding goddesses of love and beauty, while Venus gained a distinct civic meaning through Aeneas and Rome''s ancestral lineage.'
  )
on conflict (from_id, to_id, rel_type) do update
set rel_group = excluded.rel_group,
    source = excluded.source,
    note = excluded.note,
    note_en = excluded.note_en;

commit;
