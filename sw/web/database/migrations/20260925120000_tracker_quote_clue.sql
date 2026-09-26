-- 미궁 마지막 단서는 감상여정 대신 celeb_dialogues의 한마디를 사용한다.
-- 자리 표시 값은 packages/shared/src/constants/celeb-speech.ts를 따른다.
create or replace function public.get_tracker_candidates(
  exclude_ids text[] default '{}'::text[]
)
returns table(
  id text,
  slug text,
  nickname text,
  nickname_en text,
  profession text,
  avatar_url text,
  nationality text,
  birth_date text,
  death_date text
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select
    celeb.id::text,
    celeb.slug,
    celeb.nickname,
    celeb.nickname_en,
    celeb.profession,
    celeb.avatar_url,
    celeb.nationality,
    celeb.birth_date,
    celeb.death_date
  from public.celebs as celeb
  where celeb.publication_status = 'active'
    and nullif(celeb.death_date, '') is not null
    and (
      celeb.death_date like '-%'
      or (
        left(celeb.death_date, 4) ~ '^\d+$'
        and left(celeb.death_date, 4)::integer <= 1920
      )
    )
    and exists (
      select 1
      from public.celeb_persona as persona
      where persona.celeb_id = celeb.id
    )
    and (
      select count(*)
      from public.celeb_contents as content_row
      where content_row.celeb_id = celeb.id
        and nullif(btrim(content_row.review), '') is not null
    ) >= 4
    and exists (
      select 1
      from public.celeb_dialogues as dialogue
      where dialogue.celeb_id = celeb.id
        and (
          (nullif(btrim(dialogue.lines->>'quote'), '') is not null
            and btrim(dialogue.lines->>'quote') <> '[확인된 어록이 없습니다]'
            and btrim(dialogue.lines->>'quote') <> '[No verified quote]')
          or (nullif(btrim(dialogue.lines_en->>'quote'), '') is not null
            and btrim(dialogue.lines_en->>'quote') <> '[확인된 어록이 없습니다]'
            and btrim(dialogue.lines_en->>'quote') <> '[No verified quote]')
        )
    )
    and celeb.id::text <> all(coalesce(exclude_ids, '{}'::text[]));
$$;
