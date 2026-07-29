-- 승인된 가상 독백 후보를 원문 일치 조건으로만 게시한다.
--
-- profiles에는 updated_at이 없고, 긴 한국어 본문을 PostgREST URL의 eq 필터에 싣는 것은
-- URL 한도에 걸릴 수 있다. 예상 원문과 현재 원문 비교를 DB 안에서 원자적으로 수행한다.

create or replace function public.apply_virtual_monologue_candidate(
  p_slug text,
  p_expected_text text,
  p_candidate_text text
)
returns table (
  applied boolean,
  current_text text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved_text text;
begin
  if p_slug is null or btrim(p_slug) = '' then
    raise exception 'slug is required';
  end if;
  if p_candidate_text is null or btrim(p_candidate_text) = '' then
    raise exception 'candidate text is required';
  end if;

  update public.profiles
  set virtual_monologue = p_candidate_text
  where slug = p_slug
    and profile_type = 'CELEB'
    and status = 'active'
    and coalesce(virtual_monologue, '') = coalesce(p_expected_text, '')
  returning virtual_monologue into saved_text;

  if found then
    return query select true, saved_text;
    return;
  end if;

  select coalesce(p.virtual_monologue, '')
  into saved_text
  from public.profiles p
  where p.slug = p_slug
    and p.profile_type = 'CELEB';

  return query select false, saved_text;
end;
$$;

revoke all on function public.apply_virtual_monologue_candidate(text, text, text) from public;
revoke all on function public.apply_virtual_monologue_candidate(text, text, text) from anon;
revoke all on function public.apply_virtual_monologue_candidate(text, text, text) from authenticated;
grant execute on function public.apply_virtual_monologue_candidate(text, text, text) to service_role;

comment on function public.apply_virtual_monologue_candidate(text, text, text)
is 'Publishes an approved virtual monologue only when the current text still matches the audited source text.';

