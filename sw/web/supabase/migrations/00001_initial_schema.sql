-- Feel&Note 초기 스키마
-- 이 파일은 현재 Supabase에 적용된 스키마를 문서화한 것

-- =====================
-- EXTENSIONS
-- =====================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- PROFILES TABLE
-- =====================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON profiles
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON profiles
FOR UPDATE USING (auth.uid() = id);

-- =====================
-- CONTENTS TABLE
-- =====================

CREATE TABLE public.contents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('BOOK', 'MOVIE')),
  title TEXT NOT NULL,
  creator TEXT,
  thumbnail_url TEXT,
  description TEXT,
  publisher TEXT,
  release_date TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- RLS
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contents are viewable by everyone." ON contents
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert contents." ON contents
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================
-- USER_CONTENTS TABLE
-- =====================

CREATE TABLE public.user_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('WISH', 'EXPERIENCE')),
  progress INTEGER DEFAULT 0,
  progress_type TEXT DEFAULT 'PERCENT' CHECK (progress_type IN ('PERCENT', 'PAGE', 'TIME')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,

  UNIQUE(user_id, content_id)
);

-- RLS
ALTER TABLE user_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own archive." ON user_contents
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own archive." ON user_contents
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own archive." ON user_contents
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own archive." ON user_contents
FOR DELETE USING (auth.uid() = user_id);

-- =====================
-- RECORDS TABLE
-- =====================

CREATE TABLE public.records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('REVIEW', 'NOTE', 'QUOTE')),
  content TEXT NOT NULL,
  rating NUMERIC,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- RLS
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own records." ON records
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records." ON records
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records." ON records
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records." ON records
FOR DELETE USING (auth.uid() = user_id);
