-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Public profile info)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  nickname text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- 2. CONTENTS (Shared metadata for Books/Movies)
create table public.contents (
  id text not null primary key, -- ISBN or TMDB ID
  type text not null check (type in ('BOOK', 'MOVIE')),
  title text not null,
  creator text, -- Author or Director
  thumbnail_url text,
  metadata jsonb default '{}'::jsonb, -- Page count, runtime, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.contents enable row level security;

-- Policies
create policy "Contents are viewable by everyone." on public.contents
  for select using (true);

create policy "Authenticated users can insert contents." on public.contents
  for insert with check (auth.role() = 'authenticated');

-- 3. USER_CONTENTS (My Archive)
create table public.user_contents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content_id text references public.contents(id) on delete cascade not null,
  status text not null check (status in ('WISH', 'EXPERIENCE')),
  progress integer default 0, -- 0-100% or page number
  progress_type text default 'PERCENT' check (progress_type in ('PERCENT', 'PAGE', 'TIME')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, content_id)
);

-- Enable RLS
alter table public.user_contents enable row level security;

-- Policies
create policy "Users can view own archive." on public.user_contents
  for select using (auth.uid() = user_id);

create policy "Users can insert into own archive." on public.user_contents
  for insert with check (auth.uid() = user_id);

create policy "Users can update own archive." on public.user_contents
  for update using (auth.uid() = user_id);

create policy "Users can delete from own archive." on public.user_contents
  for delete using (auth.uid() = user_id);

-- 4. RECORDS (Unified Reviews, Notes, Quotes)
create table public.records (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content_id text references public.contents(id) on delete cascade not null,
  type text not null check (type in ('REVIEW', 'NOTE', 'QUOTE')),
  content text not null, -- The actual text body
  rating numeric(2,1), -- Optional (0.5 - 5.0)
  location text, -- Page number or timestamp string
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.records enable row level security;

-- Policies
create policy "Users can view own records." on public.records
  for select using (auth.uid() = user_id);

create policy "Users can insert own records." on public.records
  for insert with check (auth.uid() = user_id);

create policy "Users can update own records." on public.records
  for update using (auth.uid() = user_id);

create policy "Users can delete own records." on public.records
  for delete using (auth.uid() = user_id);

-- Helper to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nickname)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
