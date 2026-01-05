-- 방명록 테이블
CREATE TABLE guestbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_guestbook_profile ON guestbook_entries(profile_id, created_at DESC);
CREATE INDEX idx_guestbook_author ON guestbook_entries(author_id);

-- RLS 활성화
ALTER TABLE guestbook_entries ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 공개글은 누구나 조회, 비밀글은 주인/작성자만
CREATE POLICY "guestbook_select" ON guestbook_entries
  FOR SELECT USING (
    is_private = false
    OR profile_id = auth.uid()
    OR author_id = auth.uid()
  );

-- RLS 정책: 로그인 사용자만 작성 (차단된 사용자 제외)
CREATE POLICY "guestbook_insert" ON guestbook_entries
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = profile_id
      AND blocked_id = auth.uid()
    )
  );

-- RLS 정책: 작성자만 수정
CREATE POLICY "guestbook_update" ON guestbook_entries
  FOR UPDATE USING (auth.uid() = author_id);

-- RLS 정책: 주인 또는 작성자만 삭제
CREATE POLICY "guestbook_delete" ON guestbook_entries
  FOR DELETE USING (
    auth.uid() = profile_id
    OR auth.uid() = author_id
  );
