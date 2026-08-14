-- Ratings belong to individual member records only. Celeb-content rows describe
-- a source-backed relationship between a person and a work and cannot be rated.

create or replace function public.get_shared_contents_by_celebs(
  p_celeb_ids uuid[],
  p_content_type text default null,
  p_limit integer default 10
)
returns table(
  content_id text,
  title text,
  creator text,
  thumbnail_url text,
  content_type text,
  celeb_count bigint,
  avg_rating numeric,
  celeb_nicknames text[]
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  with member_ratings as (
    select
      member_row.content_id,
      round(avg(member_row.rating) filter (where member_row.rating is not null), 1) as avg_rating
    from public.member_contents as member_row
    where member_row.status = 'FINISHED'
    group by member_row.content_id
  )
  select
    content_row.content_id,
    locale.title,
    locale.creator,
    locale.thumbnail_url,
    content.type,
    count(distinct content_row.celeb_id)::bigint,
    member_ratings.avg_rating,
    array_agg(distinct celeb.nickname order by celeb.nickname)
  from public.celeb_contents as content_row
  join public.contents as content on content.id = content_row.content_id
  join public.celebs as celeb on celeb.id = content_row.celeb_id
  left join public.content_locales as locale
    on locale.content_id = content_row.content_id
   and locale.locale = 'ko'
  left join member_ratings on member_ratings.content_id = content_row.content_id
  where content_row.celeb_id = any(p_celeb_ids)
    and content_row.visibility = 'public'::public.visibility_type
    and (p_content_type is null or content.type = p_content_type)
  group by
    content_row.content_id,
    locale.title,
    locale.creator,
    locale.thumbnail_url,
    content.type,
    member_ratings.avg_rating
  having count(distinct content_row.celeb_id) >= 2
  order by
    count(distinct content_row.celeb_id) desc,
    member_ratings.avg_rating desc nulls last,
    locale.title
  limit greatest(coalesce(p_limit, 10), 1);
$$;

create or replace function public.get_chosen_scriptures(
  p_category text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table(
  content_id text,
  title text,
  creator text,
  thumbnail_url text,
  content_type text,
  celeb_count bigint,
  user_count bigint,
  avg_rating numeric,
  total_count bigint,
  title_ko text,
  title_en text,
  creator_en text,
  isbn_en text,
  thumbnail_en text
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  with celeb_content_stats as (
    select
      content_row.content_id,
      count(distinct content_row.celeb_id)::bigint as celeb_count
    from public.celeb_contents as content_row
    join public.celebs as celeb on celeb.id = content_row.celeb_id
    join public.contents as content on content.id = content_row.content_id
    where content_row.status = 'FINISHED'
      and celeb.publication_status = 'active'
      and (p_category is null or content.type = p_category)
    group by content_row.content_id
  ),
  member_stats as (
    select
      content_row.content_id,
      count(distinct content_row.member_id)::bigint as member_count,
      round(avg(content_row.rating) filter (where content_row.rating is not null), 1) as avg_rating
    from public.member_contents as content_row
    where content_row.status = 'FINISHED'
    group by content_row.content_id
  ),
  total as (
    select count(*)::bigint as count
    from celeb_content_stats
  )
  select
    content.id,
    coalesce(locale_ko.title, locale_en.title, '')::text,
    coalesce(locale_ko.creator, locale_en.creator, '')::text,
    coalesce(locale_ko.thumbnail_url, locale_en.thumbnail_url)::text,
    content.type::text,
    celeb_stats.celeb_count,
    coalesce(member_stats.member_count, 0)::bigint,
    member_stats.avg_rating,
    total.count,
    locale_ko.title::text,
    locale_en.title::text,
    locale_en.creator::text,
    locale_en.isbn::text,
    locale_en.thumbnail_url::text
  from public.contents as content
  join celeb_content_stats as celeb_stats on celeb_stats.content_id = content.id
  cross join total
  left join member_stats on member_stats.content_id = content.id
  left join public.content_locales as locale_ko
    on locale_ko.content_id = content.id
   and locale_ko.locale = 'ko'
  left join public.content_locales as locale_en
    on locale_en.content_id = content.id
   and locale_en.locale = 'en'
  order by
    celeb_stats.celeb_count desc,
    coalesce(locale_ko.title, locale_en.title, '')
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.get_scriptures_by_era(
  p_era text default null,
  p_category text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table(
  era text,
  era_label text,
  era_period text,
  era_description text,
  celeb_count_in_era bigint,
  content_id text,
  title text,
  creator text,
  thumbnail_url text,
  content_type text,
  celeb_count bigint,
  user_count bigint,
  avg_rating numeric,
  total_count bigint,
  title_ko text,
  title_en text,
  creator_en text,
  isbn_en text,
  thumbnail_en text
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_era_keys text[] := case
    when p_era is not null then array[p_era]
    else array['ancient', 'medieval', 'modern', 'contemporary']
  end;
  v_current_era text;
  v_minimum_year integer;
  v_maximum_year integer;
  v_label text;
  v_period text;
  v_description text;
begin
  foreach v_current_era in array v_era_keys loop
    case v_current_era
      when 'ancient' then
        v_minimum_year := -9999;
        v_maximum_year := 500;
        v_label := '고대';
        v_period := '~500년';
        v_description := '철학과 사상의 씨앗이 뿌려진 시대입니다. 소크라테스, 공자, 붓다가 던진 근본적인 질문들이 오늘날까지 인류를 이끌고 있습니다.';
      when 'medieval' then
        v_minimum_year := 500;
        v_maximum_year := 1500;
        v_label := '중세';
        v_period := '500~1500년';
        v_description := '신앙과 기사도가 꽃피운 시대입니다. 어둠 속에서도 지혜의 불씨를 꺼뜨리지 않은 수도원과 학자들의 헌신이 오늘의 문명을 만들었습니다.';
      when 'modern' then
        v_minimum_year := 1500;
        v_maximum_year := 1900;
        v_label := '근대';
        v_period := '1500~1900년';
        v_description := '이성의 빛이 세상을 깨운 시대입니다. 르네상스, 계몽주의, 산업혁명을 통해 인류는 전례 없는 변화를 경험했습니다.';
      when 'contemporary' then
        v_minimum_year := 1900;
        v_maximum_year := 9999;
        v_label := '현대';
        v_period := '1900년~';
        v_description := '격변과 혁신의 세기입니다. 지금 우리의 생각과 삶의 방식을 형성한 거인들이 이 시대를 살아갔습니다.';
      else
        continue;
    end case;

    return query
    with era_celebs as (
      select celeb.id
      from public.celebs as celeb
      cross join lateral (
        select case
          when celeb.birth_date ~ '^-?\d+$' then celeb.birth_date::integer
          when celeb.birth_date ~ '^-?\d+' then
            (regexp_match(celeb.birth_date, '^(-?\d+)'))[1]::integer
          else null
        end as birth_year
      ) as parsed
      where celeb.publication_status = 'active'
        and celeb.birth_date is not null
        and parsed.birth_year >= v_minimum_year
        and parsed.birth_year < v_maximum_year
    ),
    era_celeb_total as (
      select count(*)::bigint as count
      from era_celebs
    ),
    era_content_stats as (
      select
        content_row.content_id,
        count(distinct content_row.celeb_id)::bigint as era_count
      from public.celeb_contents as content_row
      join era_celebs on era_celebs.id = content_row.celeb_id
      join public.contents as content on content.id = content_row.content_id
      where content_row.status = 'FINISHED'
        and (p_category is null or content.type = p_category)
      group by content_row.content_id
    ),
    global_celeb_counts as (
      select
        content_row.content_id,
        count(distinct content_row.celeb_id)::bigint as global_count
      from public.celeb_contents as content_row
      join public.celebs as celeb on celeb.id = content_row.celeb_id
      join era_content_stats on era_content_stats.content_id = content_row.content_id
      where content_row.status = 'FINISHED'
        and celeb.publication_status = 'active'
      group by content_row.content_id
    ),
    member_stats as (
      select
        content_row.content_id,
        count(distinct content_row.member_id)::bigint as member_count,
        round(avg(content_row.rating) filter (where content_row.rating is not null), 1) as avg_rating
      from public.member_contents as content_row
      join era_content_stats on era_content_stats.content_id = content_row.content_id
      where content_row.status = 'FINISHED'
      group by content_row.content_id
    ),
    total as (
      select count(*)::bigint as count
      from era_content_stats
    )
    select
      v_current_era::text,
      v_label::text,
      v_period::text,
      v_description::text,
      era_celeb_total.count,
      content.id::text,
      coalesce(locale_ko.title, locale_en.title, '')::text,
      coalesce(locale_ko.creator, locale_en.creator, '')::text,
      coalesce(locale_ko.thumbnail_url, locale_en.thumbnail_url)::text,
      content.type::text,
      coalesce(global_counts.global_count, era_stats.era_count)::bigint,
      coalesce(member_stats.member_count, 0)::bigint,
      member_stats.avg_rating,
      total.count,
      locale_ko.title::text,
      locale_en.title::text,
      locale_en.creator::text,
      locale_en.isbn::text,
      locale_en.thumbnail_url::text
    from public.contents as content
    join era_content_stats as era_stats on era_stats.content_id = content.id
    cross join era_celeb_total
    cross join total
    left join global_celeb_counts as global_counts
      on global_counts.content_id = content.id
    left join member_stats on member_stats.content_id = content.id
    left join public.content_locales as locale_ko
      on locale_ko.content_id = content.id
     and locale_ko.locale = 'ko'
    left join public.content_locales as locale_en
      on locale_en.content_id = content.id
     and locale_en.locale = 'en'
    order by
      coalesce(global_counts.global_count, era_stats.era_count) desc,
      coalesce(locale_ko.title, locale_en.title, '')
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
  end loop;
end;
$$;

alter table public.celeb_contents
  drop column if exists rating;
