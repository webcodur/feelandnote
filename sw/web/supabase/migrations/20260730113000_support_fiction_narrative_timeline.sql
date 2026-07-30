begin;

alter table public.celeb_timeline_events
  add column if not exists sequence_label text,
  add column if not exists sequence_label_en text;

alter table public.celeb_timeline_events
  alter column year drop not null;

alter table public.celeb_timeline_events
  drop constraint if exists chk_timeline_year_end;

alter table public.celeb_timeline_events
  add constraint chk_timeline_year_end
  check (
    year_end is null
    or (year is not null and year_end >= year)
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_timeline_position'
      and conrelid = 'public.celeb_timeline_events'::regclass
  ) then
    alter table public.celeb_timeline_events
      add constraint chk_timeline_position
      check (
        (year is not null and sequence_label is null)
        or (
          year is null
          and nullif(btrim(sequence_label), '') is not null
          and year_end is null
          and month is null
          and day is null
        )
      );
  end if;
end
$$;

create index if not exists idx_celeb_timeline_narrative_order
  on public.celeb_timeline_events (celeb_id, sort_order)
  where year is null;

comment on column public.celeb_timeline_events.sequence_label is
  '픽션 인물의 원전 내 서사 단계. year와 동시에 쓰지 않는다.';

comment on column public.celeb_timeline_events.sequence_label_en is
  'English narrative-stage label for fiction characters.';

commit;
