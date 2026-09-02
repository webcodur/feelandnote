create table if not exists public.academy_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id text not null,
  sub_category_id text not null,
  lesson_id text not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  last_studied_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint academy_lesson_progress_user_lesson_key unique (user_id, lesson_id),
  constraint academy_lesson_progress_category_id_check check (char_length(category_id) > 0),
  constraint academy_lesson_progress_sub_category_id_check check (char_length(sub_category_id) > 0),
  constraint academy_lesson_progress_lesson_id_check check (char_length(lesson_id) > 0),
  constraint academy_lesson_progress_completion_check check (
    (is_completed = true and completed_at is not null)
    or (is_completed = false and completed_at is null)
  )
);

create index if not exists academy_lesson_progress_user_id_idx
  on public.academy_lesson_progress (user_id);

create index if not exists academy_lesson_progress_user_id_last_studied_at_idx
  on public.academy_lesson_progress (user_id, last_studied_at desc);

alter table public.academy_lesson_progress enable row level security;

drop policy if exists "Users can view own academy lesson progress" on public.academy_lesson_progress;
create policy "Users can view own academy lesson progress"
  on public.academy_lesson_progress
  for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can insert own academy lesson progress" on public.academy_lesson_progress;
create policy "Users can insert own academy lesson progress"
  on public.academy_lesson_progress
  for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update own academy lesson progress" on public.academy_lesson_progress;
create policy "Users can update own academy lesson progress"
  on public.academy_lesson_progress
  for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete own academy lesson progress" on public.academy_lesson_progress;
create policy "Users can delete own academy lesson progress"
  on public.academy_lesson_progress
  for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

comment on table public.academy_lesson_progress is '학당 레슨 학습 진행 기록';
comment on column public.academy_lesson_progress.category_id is '학당 상위 카테고리 id';
comment on column public.academy_lesson_progress.sub_category_id is '학당 하위 카테고리 id';
comment on column public.academy_lesson_progress.lesson_id is '레슨 콘텐츠 id';
comment on column public.academy_lesson_progress.is_completed is '레슨 완료 여부';
comment on column public.academy_lesson_progress.completed_at is '레슨 완료 시각';
comment on column public.academy_lesson_progress.last_studied_at is '최근 학습 시각';
