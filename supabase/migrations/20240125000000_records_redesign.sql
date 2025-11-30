-- Records Management Redesign: POINT System & 2-Part Structure
-- Migration for cultural experience recording platform

-- ============================================================================
-- 1. CREATE POINT SYSTEM TABLES
-- ============================================================================

-- Points table: Saved text snippets that can be referenced in records
-- Users save memorable quotes/passages and reference them in notes using [[text]] syntax
CREATE TABLE IF NOT EXISTS public.points (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_id text REFERENCES public.contents(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,  -- The actual text/quote to be saved: "인생은 초콜릿 상자와 같다"
  label text,  -- Optional short nickname for long quotes: "초콜릿 명언"
  location text,  -- Optional source location: "p.142", "01:23:45", "Chapter 3"
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Junction table for many-to-many relationship between records and points
CREATE TABLE IF NOT EXISTS public.record_points (
  record_id uuid REFERENCES public.records(id) ON DELETE CASCADE NOT NULL,
  point_id uuid REFERENCES public.points(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (record_id, point_id),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 2. EXTEND RECORDS TABLE
-- ============================================================================

-- Add new columns for 2-part structure
ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS part text CHECK (part IN ('PART1', 'PART2')),
  ADD COLUMN IF NOT EXISTS subtype text,
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add comment to explain part/subtype
COMMENT ON COLUMN public.records.part IS 'PART1: In-progress notes (기록 관리), PART2: Post-completion reviews (리뷰)';
COMMENT ON COLUMN public.records.subtype IS 'Part1: MOMENT_NOTE|PROGRESS_NOTE|PERSONAL_REACTION, Part2: EXPERIENCE_SNAPSHOT|KEY_CAPTURE|CREATIVE_PLAYGROUND';
COMMENT ON COLUMN public.records.is_public IS 'Part1 default: false, Part2 default: true';
COMMENT ON COLUMN public.records.metadata IS 'JSONB field for structured data: experience_snapshot, creative_playground, etc.';

-- ============================================================================
-- 3. MIGRATE EXISTING DATA
-- ============================================================================

-- Migrate existing records to new structure
-- All existing records are treated as PART2 (completed reviews)
-- Map old type to new subtype
UPDATE public.records
SET 
  part = 'PART2',
  subtype = CASE 
    WHEN type = 'REVIEW' THEN 'EXPERIENCE_SNAPSHOT'
    WHEN type = 'NOTE' THEN 'PROGRESS_NOTE'
    WHEN type = 'QUOTE' THEN 'KEY_CAPTURE'
    ELSE 'EXPERIENCE_SNAPSHOT'
  END,
  is_public = false  -- All existing records default to private
WHERE part IS NULL;

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for points lookup by content and user
CREATE INDEX IF NOT EXISTS idx_points_content_user 
  ON public.points(content_id, user_id);

-- Index for points lookup by user
CREATE INDEX IF NOT EXISTS idx_points_user 
  ON public.points(user_id);

-- Index for record_points lookup
CREATE INDEX IF NOT EXISTS idx_record_points_record 
  ON public.record_points(record_id);

CREATE INDEX IF NOT EXISTS idx_record_points_point 
  ON public.record_points(point_id);

-- Index for records by part and subtype
CREATE INDEX IF NOT EXISTS idx_records_part_subtype 
  ON public.records(part, subtype);

-- Index for public records
CREATE INDEX IF NOT EXISTS idx_records_is_public 
  ON public.records(is_public) WHERE is_public = true;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on points table
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

-- Points policies: Users can only manage their own points
CREATE POLICY "Users can view own points" 
  ON public.points
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points" 
  ON public.points
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own points" 
  ON public.points
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own points" 
  ON public.points
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Enable RLS on record_points junction table
ALTER TABLE public.record_points ENABLE ROW LEVEL SECURITY;

-- record_points policies: Inherit from parent record permissions
CREATE POLICY "Users can view own record_points" 
  ON public.record_points
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.records 
      WHERE records.id = record_points.record_id 
      AND records.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own record_points" 
  ON public.record_points
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.records 
      WHERE records.id = record_points.record_id 
      AND records.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own record_points" 
  ON public.record_points
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.records 
      WHERE records.id = record_points.record_id 
      AND records.user_id = auth.uid()
    )
  );

-- Update records policies to support public viewing
DROP POLICY IF EXISTS "Users can view own records." ON public.records;

CREATE POLICY "Users can view own or public records" 
  ON public.records
  FOR SELECT 
  USING (auth.uid() = user_id OR is_public = true);

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for points table
DROP TRIGGER IF EXISTS update_points_updated_at ON public.points;
CREATE TRIGGER update_points_updated_at
  BEFORE UPDATE ON public.points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. VALIDATION CHECKS
-- ============================================================================

-- Add constraint to ensure subtype matches part
ALTER TABLE public.records
  ADD CONSTRAINT records_part_subtype_check CHECK (
    (part = 'PART1' AND subtype IN ('MOMENT_NOTE', 'PROGRESS_NOTE', 'PERSONAL_REACTION'))
    OR (part = 'PART2' AND subtype IN ('EXPERIENCE_SNAPSHOT', 'KEY_CAPTURE', 'CREATIVE_PLAYGROUND'))
    OR (part IS NULL)  -- Allow NULL for backward compatibility
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
DO $$
DECLARE
  points_count int;
  records_migrated_count int;
BEGIN
  SELECT COUNT(*) INTO points_count FROM public.points;
  SELECT COUNT(*) INTO records_migrated_count FROM public.records WHERE part IS NOT NULL;
  
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Points table created with % records', points_count;
  RAISE NOTICE 'Records migrated: % records updated with new structure', records_migrated_count;
END $$;
