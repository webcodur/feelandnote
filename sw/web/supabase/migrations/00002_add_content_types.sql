-- 콘텐츠 타입 확장: VIDEO, GAME, MUSIC, CERTIFICATE 추가
-- 기존: BOOK, MOVIE
-- 변경: BOOK, VIDEO, GAME, MUSIC, CERTIFICATE (MOVIE -> VIDEO로 변경)

-- 1. 기존 MOVIE 데이터를 VIDEO로 변환
UPDATE public.contents SET type = 'VIDEO' WHERE type = 'MOVIE';

-- 2. 기존 CHECK 제약조건 삭제
ALTER TABLE public.contents DROP CONSTRAINT IF EXISTS contents_type_check;

-- 3. 새로운 CHECK 제약조건 추가
ALTER TABLE public.contents ADD CONSTRAINT contents_type_check
  CHECK (type IN ('BOOK', 'VIDEO', 'GAME', 'MUSIC', 'CERTIFICATE'));
