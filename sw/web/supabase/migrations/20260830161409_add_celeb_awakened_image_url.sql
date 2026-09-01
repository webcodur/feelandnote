begin;

alter table public.celebs
  add column if not exists awakened_image_url text;

comment on column public.celebs.awakened_image_url is
  '대표 사진과 별개로 보관하는 선택형 각성 이미지 URL. 사용자 화면 사용 방식은 아직 정하지 않았다.';

commit;
