-- Retire the unused direct content-research worker layer.
-- Confirmed content remains in contents, content_locales, and celeb_contents.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
declare
  v_payload_count bigint;
begin
  if exists (
    select 1
    from public.celeb_task_queue
    where task_type = 'content_research_v1'
  ) then
    raise exception 'content_research_v1 queue is not empty';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'celeb_content_research_findings'
      and column_name in ('external_source', 'external_id', 'content_metadata')
  ) then
    execute $query$
      select count(*)
      from public.celeb_content_research_findings
      where decision = 'evidence_verified'
         or external_source is not null
         or external_id is not null
         or content_metadata is not null
    $query$ into v_payload_count;

    if v_payload_count > 0 then
      raise exception 'direct-pipeline finding payload exists';
    end if;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'celeb_content_research_sources'
      and column_name = 'supports_candidate'
  ) then
    execute $query$
      select count(*)
      from public.celeb_content_research_sources
      where supports_candidate
    $query$ into v_payload_count;

    if v_payload_count > 0 then
      raise exception 'direct-pipeline source payload exists';
    end if;
  end if;

  if exists (
    select 1
    from public.celeb_content_research_sources
    group by run_id, url, finding_id
    having count(*) > 1
  ) then
    raise exception 'legacy source key cannot be restored';
  end if;
end;
$$;

drop function if exists public.get_celeb_content_research_status();
drop function if exists public.requeue_celeb_content_research(uuid, text, boolean);
drop function if exists public.fail_celeb_content_research(uuid, text, uuid, text, boolean, boolean, jsonb);
drop function if exists public.complete_celeb_content_research_direct(uuid, text, uuid, text, jsonb);
drop function if exists public.reserve_external_provider_request(text, text, uuid, integer);
drop function if exists public.renew_celeb_content_research_lease(uuid, text, uuid, integer);
drop function if exists public.claim_next_celeb_content_research(text, integer);
drop function if exists public.enqueue_celeb_content_research_jobs(uuid[], text);

drop function if exists private.insert_celeb_content_research_source(uuid, text, uuid, jsonb);
drop function if exists private.assert_celeb_content_research_source(jsonb);
drop function if exists private.build_celeb_content_research_profile_snapshot(uuid);
drop function if exists private.content_research_json_fill_missing(jsonb, jsonb);

drop index if exists public.celeb_task_queue_content_research_claim_idx;
drop index if exists public.contents_book_canonical_isbn_key;

drop function if exists private.content_research_canonical_isbn(text);
drop function if exists private.content_research_is_valid_isbn(text);
drop function if exists private.content_research_normalize_isbn(text);
drop function if exists private.assert_content_research_json_safe(jsonb, text);
drop function if exists private.content_research_sha256(jsonb);
drop function if exists private.content_research_stable_json(jsonb);
drop function if exists private.content_research_is_valid_source_url(text);
drop function if exists private.content_research_is_nullable_text(jsonb, text);
drop function if exists private.content_research_has_exact_keys(jsonb, text[]);

alter table public.celeb_content_research_sources
  drop constraint if exists celeb_content_research_sources_run_type_url_finding_key,
  drop constraint if exists celeb_content_research_sources_run_url_finding_key;

alter table public.celeb_content_research_sources
  add constraint celeb_content_research_sources_run_url_finding_key
  unique nulls not distinct (run_id, url, finding_id);

alter table public.celeb_content_research_sources
  drop column if exists supports_candidate;

alter table public.celeb_content_research_findings
  drop constraint if exists celeb_content_research_findings_decision_shape_check,
  drop constraint if exists celeb_content_research_findings_decision_check;

alter table public.celeb_content_research_findings
  add constraint celeb_content_research_findings_decision_check
  check (decision in ('candidate', 'accepted', 'rejected')),
  add constraint celeb_content_research_findings_decision_shape_check
  check (
    (
      decision = 'candidate'
      and content_id is null
      and rejection_reason is null
    )
    or (
      decision = 'accepted'
      and content_id is not null
      and evidence_summary is not null
      and length(btrim(evidence_summary)) > 0
      and rejection_reason is null
    )
    or (
      decision = 'rejected'
      and content_id is null
      and evidence_summary is not null
      and length(btrim(evidence_summary)) > 0
      and rejection_reason is not null
      and length(btrim(rejection_reason)) > 0
    )
  );

alter table public.celeb_content_research_findings
  drop column if exists external_source,
  drop column if exists external_id,
  drop column if exists content_metadata;

drop table if exists public.external_provider_rate_limit_reservations;
drop table if exists public.external_provider_rate_limits;

commit;
