-- 익명 자유게시판 로그인 사용자 지원
-- 로그인=계정으로(author_id), 비로그인=익명(password_hash). 로그인 사용자도 익명 선택 가능(is_anonymous).
-- author_id 있고 is_anonymous=false → 계정 표시. 그 외 → "익명"(또는 입력 닉네임).

alter table public.free_posts
  add column if not exists author_id uuid references public.profiles(id) on delete set null,
  add column if not exists is_anonymous boolean not null default false;
alter table public.free_posts alter column password_hash drop not null;
create index if not exists idx_free_posts_author on public.free_posts(author_id);

alter table public.free_post_comments
  add column if not exists author_id uuid references public.profiles(id) on delete set null,
  add column if not exists is_anonymous boolean not null default false;
alter table public.free_post_comments alter column password_hash drop not null;
create index if not exists idx_free_post_comments_author on public.free_post_comments(author_id);
