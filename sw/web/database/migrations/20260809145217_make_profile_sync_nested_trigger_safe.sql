begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create or replace function private.sync_profile_split()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  previous_source text := pg_catalog.current_setting(
    'app.profile_sync_source',
    true
  );
begin
  if previous_source = 'canonical' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  perform pg_catalog.set_config('app.profile_sync_source', 'profiles', true);

  if tg_op = 'DELETE' then
    delete from public.member_profiles where id = old.id;
    delete from public.celebs where id = old.id;
    perform pg_catalog.set_config(
      'app.profile_sync_source',
      coalesce(previous_source, ''),
      true
    );
    return old;
  end if;

  if new.profile_type = 'USER' then
    if exists (
      select 1
      from public.user_accounts as account
      where account.id = new.id
    ) then
      insert into public.member_profiles (
        id,
        nickname,
        avatar_url,
        bio,
        birth_date,
        nationality,
        is_verified,
        selected_title,
        showcase_titles,
        created_at,
        updated_at
      )
      values (
        new.id,
        new.nickname,
        new.avatar_url,
        new.bio,
        new.birth_date,
        new.nationality,
        coalesce(new.is_verified, false),
        new.selected_title,
        coalesce(new.showcase_titles, '{}'::text[]),
        new.created_at,
        new.updated_at
      )
      on conflict (id) do update set
        nickname = excluded.nickname,
        avatar_url = excluded.avatar_url,
        bio = excluded.bio,
        birth_date = excluded.birth_date,
        nationality = excluded.nationality,
        is_verified = excluded.is_verified,
        selected_title = excluded.selected_title,
        showcase_titles = excluded.showcase_titles,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at;
    end if;

    delete from public.celebs where id = new.id;
    perform pg_catalog.set_config(
      'app.profile_sync_source',
      coalesce(previous_source, ''),
      true
    );
    return new;
  end if;

  if new.profile_type = 'CELEB' then
    insert into public.celebs (
      id,
      nickname,
      avatar_url,
      created_at,
      publication_status,
      claimed_by_member_id,
      is_verified,
      bio,
      profession,
      portrait_url,
      nationality,
      birth_date,
      death_date,
      title,
      consumption_philosophy,
      gender,
      nickname_en,
      slug_suffix,
      speech_tone,
      title_en,
      bio_en,
      consumption_philosophy_en,
      celeb_tier,
      has_voice,
      voice_id_ko,
      voice_id_en,
      voice_v,
      wikidata_qid,
      voice_speed,
      youtube_videos,
      virtual_monologue,
      virtual_monologue_en,
      view_count,
      content_research_status,
      content_research_updated_at,
      content_research_confirmed_empty_at,
      portrait_caption,
      portrait_caption_en,
      virtual_monologue_locked_at,
      updated_at
    )
    values (
      new.id,
      new.nickname,
      new.avatar_url,
      new.created_at,
      new.status,
      new.claimed_by,
      new.is_verified,
      new.bio,
      new.profession,
      new.portrait_url,
      new.nationality,
      new.birth_date,
      new.death_date,
      new.title,
      new.consumption_philosophy,
      new.gender,
      new.nickname_en,
      new.slug_suffix,
      new.speech_tone,
      new.title_en,
      new.bio_en,
      new.consumption_philosophy_en,
      new.celeb_tier,
      new.has_voice,
      new.voice_id_ko,
      new.voice_id_en,
      new.voice_v,
      new.wikidata_qid,
      new.voice_speed,
      new.youtube_videos,
      new.virtual_monologue,
      new.virtual_monologue_en,
      new.view_count,
      new.content_research_status,
      new.content_research_updated_at,
      new.content_research_confirmed_empty_at,
      new.portrait_caption,
      new.portrait_caption_en,
      new.virtual_monologue_locked_at,
      new.updated_at
    )
    on conflict (id) do update set
      nickname = excluded.nickname,
      avatar_url = excluded.avatar_url,
      created_at = excluded.created_at,
      publication_status = excluded.publication_status,
      claimed_by_member_id = excluded.claimed_by_member_id,
      is_verified = excluded.is_verified,
      bio = excluded.bio,
      profession = excluded.profession,
      portrait_url = excluded.portrait_url,
      nationality = excluded.nationality,
      birth_date = excluded.birth_date,
      death_date = excluded.death_date,
      title = excluded.title,
      consumption_philosophy = excluded.consumption_philosophy,
      gender = excluded.gender,
      nickname_en = excluded.nickname_en,
      slug_suffix = excluded.slug_suffix,
      speech_tone = excluded.speech_tone,
      title_en = excluded.title_en,
      bio_en = excluded.bio_en,
      consumption_philosophy_en = excluded.consumption_philosophy_en,
      celeb_tier = excluded.celeb_tier,
      has_voice = excluded.has_voice,
      voice_id_ko = excluded.voice_id_ko,
      voice_id_en = excluded.voice_id_en,
      voice_v = excluded.voice_v,
      wikidata_qid = excluded.wikidata_qid,
      voice_speed = excluded.voice_speed,
      youtube_videos = excluded.youtube_videos,
      virtual_monologue = excluded.virtual_monologue,
      virtual_monologue_en = excluded.virtual_monologue_en,
      view_count = excluded.view_count,
      content_research_status = excluded.content_research_status,
      content_research_updated_at = excluded.content_research_updated_at,
      content_research_confirmed_empty_at =
        excluded.content_research_confirmed_empty_at,
      portrait_caption = excluded.portrait_caption,
      portrait_caption_en = excluded.portrait_caption_en,
      virtual_monologue_locked_at = excluded.virtual_monologue_locked_at,
      updated_at = excluded.updated_at;

    delete from public.member_profiles where id = new.id;
  end if;

  perform pg_catalog.set_config(
    'app.profile_sync_source',
    coalesce(previous_source, ''),
    true
  );
  return new;
end;
$$;

create or replace function private.sync_member_profile_to_compat()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  previous_source text := pg_catalog.current_setting(
    'app.profile_sync_source',
    true
  );
begin
  if previous_source = 'profiles' then
    return new;
  end if;

  perform pg_catalog.set_config('app.profile_sync_source', 'canonical', true);

  if tg_op = 'INSERT' then
    update public.profiles as profile
    set nickname = new.nickname,
        avatar_url = new.avatar_url,
        bio = new.bio,
        birth_date = new.birth_date,
        nationality = new.nationality,
        is_verified = new.is_verified,
        selected_title = new.selected_title,
        showcase_titles = new.showcase_titles,
        created_at = new.created_at,
        updated_at = new.updated_at
    where profile.id = new.id
      and profile.profile_type = 'USER';

    if found then
      perform pg_catalog.set_config(
        'app.profile_sync_source',
        coalesce(previous_source, ''),
        true
      );
      return new;
    end if;

    if exists (
      select 1
      from public.profiles as profile
      where profile.id = new.id
    ) then
      raise exception 'member compatibility profile has wrong type: %', new.id
        using errcode = '23514';
    end if;

    insert into public.profiles (
      id,
      profile_type,
      nickname,
      avatar_url,
      bio,
      birth_date,
      nationality,
      is_verified,
      selected_title,
      showcase_titles,
      created_at,
      updated_at
    )
    values (
      new.id,
      'USER',
      new.nickname,
      new.avatar_url,
      new.bio,
      new.birth_date,
      new.nationality,
      new.is_verified,
      new.selected_title,
      new.showcase_titles,
      new.created_at,
      new.updated_at
    );

    perform pg_catalog.set_config(
      'app.profile_sync_source',
      coalesce(previous_source, ''),
      true
    );
    return new;
  end if;

  update public.profiles as profile
  set nickname = new.nickname,
      avatar_url = new.avatar_url,
      bio = new.bio,
      birth_date = new.birth_date,
      nationality = new.nationality,
      is_verified = new.is_verified,
      selected_title = new.selected_title,
      showcase_titles = new.showcase_titles,
      created_at = new.created_at,
      updated_at = new.updated_at
  where profile.id = new.id
    and profile.profile_type = 'USER';

  if not found then
    if exists (
      select 1
      from public.profiles as profile
      where profile.id = new.id
    ) then
      raise exception 'member compatibility profile has wrong type: %', new.id
        using errcode = '23514';
    end if;

    raise exception 'member compatibility profile is missing: %', new.id
      using errcode = 'P0002';
  end if;

  perform pg_catalog.set_config(
    'app.profile_sync_source',
    coalesce(previous_source, ''),
    true
  );
  return new;
end;
$$;

create or replace function private.sync_celeb_to_compat()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  previous_source text := pg_catalog.current_setting(
    'app.profile_sync_source',
    true
  );
begin
  if previous_source = 'profiles' then
    return new;
  end if;

  perform pg_catalog.set_config('app.profile_sync_source', 'canonical', true);

  if tg_op = 'INSERT' then
    if exists (
      select 1
      from public.profiles as profile
      where profile.id = new.id
    ) then
      raise exception 'celeb compatibility profile already exists: %', new.id
        using errcode = '23505';
    end if;

    insert into public.profiles (
      id,
      profile_type,
      nickname,
      avatar_url,
      created_at,
      status,
      claimed_by,
      is_verified,
      bio,
      profession,
      portrait_url,
      nationality,
      birth_date,
      death_date,
      title,
      consumption_philosophy,
      gender,
      nickname_en,
      slug_suffix,
      speech_tone,
      title_en,
      bio_en,
      consumption_philosophy_en,
      celeb_tier,
      has_voice,
      voice_id_ko,
      voice_id_en,
      voice_v,
      wikidata_qid,
      voice_speed,
      youtube_videos,
      virtual_monologue,
      virtual_monologue_en,
      view_count,
      content_research_status,
      content_research_updated_at,
      content_research_confirmed_empty_at,
      portrait_caption,
      portrait_caption_en,
      virtual_monologue_locked_at,
      updated_at
    )
    values (
      new.id,
      'CELEB',
      new.nickname,
      new.avatar_url,
      new.created_at,
      new.publication_status,
      new.claimed_by_member_id,
      new.is_verified,
      new.bio,
      new.profession,
      new.portrait_url,
      new.nationality,
      new.birth_date,
      new.death_date,
      new.title,
      new.consumption_philosophy,
      new.gender,
      new.nickname_en,
      new.slug_suffix,
      new.speech_tone,
      new.title_en,
      new.bio_en,
      new.consumption_philosophy_en,
      new.celeb_tier,
      new.has_voice,
      new.voice_id_ko,
      new.voice_id_en,
      new.voice_v,
      new.wikidata_qid,
      new.voice_speed,
      new.youtube_videos,
      new.virtual_monologue,
      new.virtual_monologue_en,
      new.view_count,
      new.content_research_status,
      new.content_research_updated_at,
      new.content_research_confirmed_empty_at,
      new.portrait_caption,
      new.portrait_caption_en,
      new.virtual_monologue_locked_at,
      new.updated_at
    );

    perform pg_catalog.set_config(
      'app.profile_sync_source',
      coalesce(previous_source, ''),
      true
    );
    return new;
  end if;

  update public.profiles as profile
  set nickname = new.nickname,
      avatar_url = new.avatar_url,
      created_at = new.created_at,
      status = new.publication_status,
      claimed_by = new.claimed_by_member_id,
      is_verified = new.is_verified,
      bio = new.bio,
      profession = new.profession,
      portrait_url = new.portrait_url,
      nationality = new.nationality,
      birth_date = new.birth_date,
      death_date = new.death_date,
      title = new.title,
      consumption_philosophy = new.consumption_philosophy,
      gender = new.gender,
      nickname_en = new.nickname_en,
      slug_suffix = new.slug_suffix,
      speech_tone = new.speech_tone,
      title_en = new.title_en,
      bio_en = new.bio_en,
      consumption_philosophy_en = new.consumption_philosophy_en,
      celeb_tier = new.celeb_tier,
      has_voice = new.has_voice,
      voice_id_ko = new.voice_id_ko,
      voice_id_en = new.voice_id_en,
      voice_v = new.voice_v,
      wikidata_qid = new.wikidata_qid,
      voice_speed = new.voice_speed,
      youtube_videos = new.youtube_videos,
      virtual_monologue = new.virtual_monologue,
      virtual_monologue_en = new.virtual_monologue_en,
      view_count = new.view_count,
      content_research_status = new.content_research_status,
      content_research_updated_at = new.content_research_updated_at,
      content_research_confirmed_empty_at = new.content_research_confirmed_empty_at,
      portrait_caption = new.portrait_caption,
      portrait_caption_en = new.portrait_caption_en,
      virtual_monologue_locked_at = new.virtual_monologue_locked_at,
      updated_at = new.updated_at
  where profile.id = new.id
    and profile.profile_type = 'CELEB';

  if not found then
    if exists (
      select 1
      from public.profiles as profile
      where profile.id = new.id
    ) then
      raise exception 'celeb compatibility profile has wrong type: %', new.id
        using errcode = '23514';
    end if;

    raise exception 'celeb compatibility profile is missing: %', new.id
      using errcode = 'P0002';
  end if;

  perform pg_catalog.set_config(
    'app.profile_sync_source',
    coalesce(previous_source, ''),
    true
  );
  return new;
end;
$$;

revoke all on function private.sync_profile_split()
from public, anon, authenticated, service_role;

revoke all on function private.sync_member_profile_to_compat()
from public, anon, authenticated, service_role;

revoke all on function private.sync_celeb_to_compat()
from public, anon, authenticated, service_role;

drop trigger trg_profiles_sync_profile_split on public.profiles;
drop trigger trg_member_profiles_sync_profile_compat on public.member_profiles;
drop trigger trg_celebs_sync_profile_compat on public.celebs;

create trigger trg_profiles_sync_profile_split
after insert or update or delete on public.profiles
for each row execute function private.sync_profile_split();

create trigger trg_member_profiles_sync_profile_compat
after insert or update on public.member_profiles
for each row execute function private.sync_member_profile_to_compat();

create trigger trg_celebs_sync_profile_compat
after insert or update on public.celebs
for each row execute function private.sync_celeb_to_compat();

do $$
begin
  if (
    select count(*)
    from pg_catalog.pg_trigger as trigger_record
    where not trigger_record.tgisinternal
      and trigger_record.tgenabled = 'O'
      and trigger_record.tgqual is null
      and (
        (
          trigger_record.tgrelid = 'public.profiles'::pg_catalog.regclass
          and trigger_record.tgname = 'trg_profiles_sync_profile_split'
          and trigger_record.tgtype = 29
        )
        or (
          trigger_record.tgrelid =
            'public.member_profiles'::pg_catalog.regclass
          and trigger_record.tgname =
            'trg_member_profiles_sync_profile_compat'
          and trigger_record.tgtype = 21
        )
        or (
          trigger_record.tgrelid = 'public.celebs'::pg_catalog.regclass
          and trigger_record.tgname = 'trg_celebs_sync_profile_compat'
          and trigger_record.tgtype = 21
        )
      )
  ) <> 3 then
    raise exception 'nested-safe profile synchronization triggers differ';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
