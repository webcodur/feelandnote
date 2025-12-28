-- 콘텐츠 세부 분류 추가: subtype, genre 컬럼
-- subtype: 콘텐츠 형태 (movie, tv, anime, novel, essay, comic, pc, console, album, single, technical, professional 등)
-- genre: 장르/분야 (액션, 로맨스, SF, RPG, 팝, 정보통신 등)

-- 1. subtype 컬럼 추가
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS subtype TEXT;

-- 2. genre 컬럼 추가
ALTER TABLE public.contents ADD COLUMN IF NOT EXISTS genre TEXT;

-- 3. 인덱스 추가 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_contents_subtype ON public.contents(subtype);
CREATE INDEX IF NOT EXISTS idx_contents_genre ON public.contents(genre);
CREATE INDEX IF NOT EXISTS idx_contents_type_subtype ON public.contents(type, subtype);
CREATE INDEX IF NOT EXISTS idx_contents_type_genre ON public.contents(type, genre);

-- 4. 코멘트 추가
COMMENT ON COLUMN public.contents.subtype IS '콘텐츠 세부 유형 (VIDEO: movie/tv/anime, BOOK: novel/essay/comic, GAME: pc/console/mobile/multi, MUSIC: album/single/ep, CERTIFICATE: technical/professional)';
COMMENT ON COLUMN public.contents.genre IS '장르/분야 (VIDEO: 액션/로맨스/SF, BOOK: 한국소설/추리, GAME: RPG/액션, MUSIC: 팝/록, CERTIFICATE: 정보통신/건설)';
