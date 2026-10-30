-- 셀럽 감상 관계의 WANT 상태를 폐기한다. 서비스 집계·서재는 FINISHED만 세므로 WANT 행은 화면에서 빠졌다.
-- 감상 예정이라는 사실은 감상배경(review)에 쓴다. 회원 기록(member_contents)의 WANT는 유지한다.
update public.celeb_contents
set status = 'FINISHED', updated_at = now()
where status = 'WANT';

alter table public.celeb_contents drop constraint celeb_contents_status_check;
alter table public.celeb_contents add constraint celeb_contents_status_check check (status = 'FINISHED');
alter table public.celeb_contents alter column status set default 'FINISHED';
