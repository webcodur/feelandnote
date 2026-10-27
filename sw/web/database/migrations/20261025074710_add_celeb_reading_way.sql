begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.celebs
  add column reading_way text,
  add column reading_way_en text;

comment on column public.celebs.reading_way is
  'Korean account of reading and learning. NULL = unresearched; empty string = researched, insufficient material for a section; nonempty text = usable account. Insufficient results are excluded from routine research until explicitly reopened.';

comment on column public.celebs.reading_way_en is
  'English translation of reading_way. Set both fields to empty strings for a researched insufficient result; NULL with a nonempty Korean account means translation is pending.';

notify pgrst, 'reload schema';

commit;
