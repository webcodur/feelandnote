-- 연표 사건에서 화면에 쓰이지 않는 필드를 폐기한다 (2026-08-14).
--
-- 사용자 화면이 그리는 값은 제목·설명·장소명·연도, 그리고 지구본이 쓰는 좌표뿐이다.
-- 아래 넷은 사용자 화면·관리 화면 어디에서도 읽지 않으면서 조사 비용만 발생시켰다.
--
--   source_url  근거 링크. 확인되지 않은 링크는 근거가 아니라 근거라는 주장이며,
--               아무도 열어보지 않는 값이 붙어 있으면 오히려 잘못된 안심을 준다.
--               사실 확인은 본문 문장을 직접 검색해서 한다.
--   place_qid   위키데이터 장소 식별자. 좌표를 따로 저장하므로 읽는 곳이 없다.
--   month, day  연도 아래 정밀도. 조사비가 급등하는데 화면에 나오지 않는다.
--
-- 남기는 값: year, year_end, title(_en), description(_en), kind, place_name(_en),
--            lat, lng, sequence_label(_en), source, sort_order.
-- kind는 조사 비용이 없고 관리 화면이 쓰므로 유지한다.

ALTER TABLE public.celeb_timeline_events
  DROP COLUMN IF EXISTS source_url,
  DROP COLUMN IF EXISTS place_qid,
  DROP COLUMN IF EXISTS month,
  DROP COLUMN IF EXISTS day;
