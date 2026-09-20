begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

comment on table public.celeb_explanations is
  '인물 안내 한영 본문과 게시 시각. interpretive_*는 비노출인 인물 탐구의 보존값이다.';
comment on column public.celeb_explanations.plain_text is
  '한 사람이 어떻게 생각하고 어떤 활동을 하려 했는지 알 수 있는 한국어 인물 안내';
comment on column public.celeb_explanations.plain_text_en is
  '한국어 인물 안내와 같은 사실과 의미를 담은 영어 본문';
comment on column public.celeb_explanations.interpretive_title is
  '비노출 인물 탐구 제목의 보존값';
comment on column public.celeb_explanations.interpretive_text is
  '비노출 인물 탐구 본문의 보존값';
comment on column public.celeb_explanations.interpretive_title_en is
  '비노출 인물 탐구 영어 제목의 보존값';
comment on column public.celeb_explanations.interpretive_text_en is
  '비노출 인물 탐구 영어 본문의 보존값';

notify pgrst, 'reload schema';
commit;
