-- Separate user-generated boards by locale and require both Korean and English notice copy.

begin;

alter table public.free_posts
  add column if not exists locale text not null default 'ko';

alter table public.feedbacks
  add column if not exists locale text not null default 'ko';

alter table public.board_comments
  add column if not exists locale text not null default 'ko';

alter table public.notices
  add column if not exists title_en text,
  add column if not exists content_en text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'free_posts_locale_check'
      and conrelid = 'public.free_posts'::regclass
  ) then
    alter table public.free_posts
      add constraint free_posts_locale_check check (locale in ('ko', 'en'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'feedbacks_locale_check'
      and conrelid = 'public.feedbacks'::regclass
  ) then
    alter table public.feedbacks
      add constraint feedbacks_locale_check check (locale in ('ko', 'en'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'board_comments_locale_check'
      and conrelid = 'public.board_comments'::regclass
  ) then
    alter table public.board_comments
      add constraint board_comments_locale_check check (locale in ('ko', 'en'));
  end if;
end
$$;

update public.notices as notice
set
  title_en = translation.title_en,
  content_en = translation.content_en
from (
  values
    (
      'c3f03c88-107b-4a03-adff-23d5152ff5b4'::uuid,
      'More Sign-In Options Added (PC)',
      'Kakao, Google, and email sign-in are now available.'
    ),
    (
      '7a3616b2-92d7-4f5d-8dc6-049d7d883c37'::uuid,
      'Text Formatting Display Improved',
      E'Text formatting display has been improved.\n\n- Double corner brackets and double angle brackets\n- Single corner brackets and angle brackets\n- Single and double quotation marks\n\nThese characters are now emphasized for improved legibility.'
    ),
    (
      '24c8bc43-2729-4ba5-adcd-1048e00ae110'::uuid,
      'Notifications Added',
      'Notifications are now sent when someone signs your guestbook, likes or follows you, or comments on a board post.'
    ),
    (
      'd450ef95-7f49-4571-93f2-da3504e2797d'::uuid,
      'Content Recommendations Added',
      'Open the detail view of a review card in your archive to recommend it to friends and followers.'
    ),
    (
      'f62b4dcb-083c-41d3-8904-1e71113d9993'::uuid,
      'Library Page Added',
      'A content-focused information page called Library is now available.'
    )
) as translation(id, title_en, content_en)
where notice.id = translation.id;

do $$
begin
  if exists (
    select 1
    from public.notices
    where nullif(btrim(title_en), '') is null
       or nullif(btrim(content_en), '') is null
  ) then
    raise exception 'Every notice must have an English title and content before locale support is enabled.';
  end if;
end
$$;

alter table public.notices
  alter column title_en set not null,
  alter column content_en set not null;

create index if not exists idx_free_posts_locale_created
  on public.free_posts (locale, created_at desc)
  where is_deleted = false;

create index if not exists idx_feedbacks_locale_created
  on public.feedbacks (locale, created_at desc);

create index if not exists idx_feedbacks_locale_category_created
  on public.feedbacks (locale, category, created_at desc);

create index if not exists idx_board_comments_type_locale_post_created
  on public.board_comments (board_type, locale, post_id, created_at);

commit;
