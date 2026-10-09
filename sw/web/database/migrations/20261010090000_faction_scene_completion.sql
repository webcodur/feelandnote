begin;

alter table public.faction_lv2
  add column if not exists scenes_complete boolean not null default false;

comment on column public.faction_lv2.scenes_complete is
  'Editorial confirmation that the current key scene sequence is complete. Never inferred from image count or an ending card.';

update public.faction_lv2
set scenes_complete = true, updated_at = now()
where slug in ('homer-odyssey', 'myth-japan');

notify pgrst, 'reload schema';
commit;
