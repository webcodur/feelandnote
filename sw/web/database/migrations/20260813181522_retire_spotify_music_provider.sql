drop table if exists public.meta_reharvest_backup_20260801;

alter table public.contents
  drop constraint if exists check_external_source;

alter table public.contents
  add constraint check_external_source
  check (
    external_source is null
    or external_source = any (
      array[
        'kakao_book'::text,
        'google_books'::text,
        'openlibrary'::text,
        'aladin'::text,
        'tmdb'::text,
        'igdb'::text,
        'itunes'::text
      ]
    )
  ) not valid;

alter table public.contents
  validate constraint check_external_source;

alter table public.contents
  add constraint contents_music_uses_itunes
  check (type <> 'MUSIC' or external_source = 'itunes') not valid;

alter table public.contents
  validate constraint contents_music_uses_itunes;
