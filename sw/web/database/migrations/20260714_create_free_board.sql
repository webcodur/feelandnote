-- 익명 자유게시판 (agora/board/free)
-- 로그인 없이 누구나 글·댓글 작성. 작성자는 화면에서 "익명"으로만 노출.
-- 본인 글 관리는 작성 시 입력한 4자리 비밀번호로만 가능.
-- 모든 접근은 서버 액션(service role)이 전담하므로 anon/authenticated 직접 접근은 막는다.

-- ===== 게시글 =====
create table if not exists public.free_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  nickname text,                              -- 표시용 닉네임(선택). 비우면 화면에서 "익명"
  password_hash text not null,                -- 4자리 비밀번호 해시 (salt:hash, 절대 응답에 노출 안 함)
  ip_hash text,                               -- 도배 방지·추적용 (원문 IP 저장 안 함)
  view_count integer not null default 0,
  is_deleted boolean not null default false,  -- 관리자 소프트 삭제
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_free_posts_created
  on public.free_posts (created_at desc)
  where is_deleted = false;

create index if not exists idx_free_posts_ip_created
  on public.free_posts (ip_hash, created_at desc);

-- ===== 댓글 =====
create table if not exists public.free_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.free_posts(id) on delete cascade,
  content text not null,
  nickname text,
  password_hash text not null,
  ip_hash text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_free_post_comments_post
  on public.free_post_comments (post_id, created_at);

-- ===== RLS =====
-- select 정책도 만들지 않는다 → anon/authenticated 직접 조회 불가.
-- 서버 액션의 service role 클라이언트만 접근한다(RLS bypass).
alter table public.free_posts enable row level security;
alter table public.free_post_comments enable row level security;
