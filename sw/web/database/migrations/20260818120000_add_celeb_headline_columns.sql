-- 20260818120000_add_celeb_headline_columns.sql
-- LIGHT·FICTION 및 전체 인물 한 줄 정의(Headline) 필드 추가

ALTER TABLE celebs
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS headline_en text;

COMMENT ON COLUMN celebs.headline IS '한국어 인물 한 줄 정의 (예: 그리스군 최강의 전사)';
COMMENT ON COLUMN celebs.headline_en IS '영문 인물 한 줄 정의 (예: The Greatest Warrior of the Achaean Army)';
