-- Direct-to-DB celebrity content research pipeline.
--
-- The worker keeps research payloads in memory only. PostgreSQL is the durable
-- queue, audit ledger, and domain SSoT. External HTTP/LLM work must happen
-- outside these RPC transactions.

begin;

set local lock_timeout = '5s';

-- One durable clock per external provider prevents independent worker
-- processes from each treating their own in-memory limiter as global.
create table public.external_provider_rate_limits (
  provider text primary key,
  available_at timestamptz not null default clock_timestamp(),
  min_interval_ms integer not null default 2000,
  last_reserved_at timestamptz,
  last_reserved_by text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint external_provider_rate_limits_provider_check
    check (provider = 'openlibrary'),
  constraint external_provider_rate_limits_interval_check
    check (min_interval_ms between 1100 and 60000),
  constraint external_provider_rate_limits_worker_check
    check (
      last_reserved_by is null
      or (length(btrim(last_reserved_by)) between 1 and 200)
    )
);

create table public.external_provider_rate_limit_reservations (
  provider text not null
    references public.external_provider_rate_limits(provider) on delete restrict,
  request_token uuid not null,
  worker text not null,
  available_at timestamptz not null,
  next_available_at timestamptz not null,
  min_interval_ms integer not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (provider, request_token),
  constraint external_provider_rate_limit_reservations_provider_check
    check (provider = 'openlibrary'),
  constraint external_provider_rate_limit_reservations_worker_check
    check (length(btrim(worker)) between 1 and 200),
  constraint external_provider_rate_limit_reservations_interval_check
    check (min_interval_ms between 1100 and 60000),
  constraint external_provider_rate_limit_reservations_window_check
    check (next_available_at > available_at)
);

alter table public.external_provider_rate_limits enable row level security;
alter table public.external_provider_rate_limits force row level security;
alter table public.external_provider_rate_limit_reservations enable row level security;
alter table public.external_provider_rate_limit_reservations force row level security;

revoke all on table
  public.external_provider_rate_limits,
  public.external_provider_rate_limit_reservations
from public, anon, authenticated, service_role;

grant select, insert, update on table public.external_provider_rate_limits
to service_role;
grant select, insert on table public.external_provider_rate_limit_reservations
to service_role;

-- A single interview can legitimately support more than one content scope.
-- The previous key omitted content_type and forced callers to mutate URLs with
-- artificial fragments. Keep real evidence URLs unchanged.
alter table public.celeb_content_research_sources
  drop constraint celeb_content_research_sources_run_url_finding_key;

alter table public.celeb_content_research_sources
  add constraint celeb_content_research_sources_run_type_url_finding_key
  unique nulls not distinct (run_id, content_type, url, finding_id);

alter table public.celeb_content_research_sources
  add column supports_candidate boolean not null default false;

alter table public.celeb_content_research_findings
  add column external_source text,
  add column external_id text,
  add column content_metadata jsonb;

alter table public.celeb_content_research_findings
  drop constraint celeb_content_research_findings_decision_check,
  drop constraint celeb_content_research_findings_decision_shape_check;

alter table public.celeb_content_research_findings
  add constraint celeb_content_research_findings_decision_check
    check (decision in ('candidate', 'accepted', 'rejected', 'evidence_verified')),
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
        and external_source is null
        and external_id is null
        and content_metadata is null
      )
      or (
        decision = 'evidence_verified'
        and content_type = 'MUSIC'
        and content_id is null
        and evidence_summary is not null
        and length(btrim(evidence_summary)) > 0
        and rejection_reason is null
        and external_source = 'itunes'
        and external_id ~ '^itunes-[0-9]+$'
        and jsonb_typeof(content_metadata) = 'object'
      )
    );

create or replace function private.content_research_has_exact_keys(
  target jsonb,
  expected text[]
)
returns boolean
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select jsonb_typeof(target) = 'object'
    and target ?& expected
    and not exists (
      select key
      from jsonb_object_keys(target) as actual(key)
      except
      select key
      from unnest(expected) as required(key)
    )
    and not exists (
      select key
      from unnest(expected) as required(key)
      except
      select key
      from jsonb_object_keys(target) as actual(key)
    );
$$;

create or replace function private.content_research_is_nullable_text(
  target jsonb,
  key_name text
)
returns boolean
language sql
immutable
strict
security invoker
set search_path = pg_catalog
as $$
  select target ? key_name
    and (
      target -> key_name = 'null'::jsonb
      or jsonb_typeof(target -> key_name) = 'string'
    );
$$;

create or replace function private.content_research_is_valid_source_url(
  value text
)
returns boolean
language plpgsql
immutable
strict
security invoker
set search_path = pg_catalog
as $$
declare
  v_rest text;
  v_authority text;
  v_host text;
  v_port_text text;
  v_port_numeric_text text;
  v_colon_count integer;
begin
  if length(value) not between 1 and 4096
     or octet_length(value) > 4096
     or value !~* '^https://'
     or value ~ '[[:space:][:cntrl:]]' then
    return false;
  end if;

  v_rest := regexp_replace(value, '^https://', '', 'i');
  v_authority := substring(v_rest from '^([^/?#]+)');
  if v_authority is null or v_authority = '' or position('@' in v_authority) > 0 then
    return false;
  end if;

  v_colon_count := length(v_authority) - length(replace(v_authority, ':', ''));
  if v_colon_count > 1 then
    return false;
  end if;
  if v_colon_count = 1 then
    v_port_text := substring(v_authority from ':([0-9]+)$');
    if v_port_text is null then
      return false;
    end if;
    v_port_numeric_text := ltrim(v_port_text, '0');
    if v_port_numeric_text = ''
       or length(v_port_numeric_text) > 5
       or v_port_numeric_text::integer not between 1 and 65535 then
      return false;
    end if;
    v_host := left(v_authority, length(v_authority) - length(v_port_text) - 1);
  else
    v_host := v_authority;
  end if;

  if length(v_host) not between 3 and 253 then
    return false;
  end if;

  -- ASCII FQDN only: at least two labels, no IP literals/single-label hosts,
  -- RFC-sized labels, and a letter-led final label (including xn-- IDNs).
  return v_host ~* '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$';
end;
$$;

create or replace function private.content_research_stable_json(
  target jsonb
)
returns text
language plpgsql
immutable
strict
security invoker
set search_path = pg_catalog
as $$
declare
  v_type text := jsonb_typeof(target);
  v_result text;
  v_separator text := '';
  v_item record;
  v_number double precision;
  v_number_text text;
  v_number_sign text;
  v_mantissa text;
  v_digits text;
  v_exponent integer;
  v_decimal_position integer;
  v_leading_zeroes integer;
  v_decimal_k integer;
  v_scientific_exponent integer;
begin
  if v_type = 'object' then
    v_result := '{';
    for v_item in
      select item.key, item.value
      from jsonb_each(target) as item(key, value)
      order by item.key collate "C"
    loop
      v_result := v_result || v_separator || to_jsonb(v_item.key)::text || ':'
        || private.content_research_stable_json(v_item.value);
      v_separator := ',';
    end loop;
    return v_result || '}';
  end if;

  if v_type = 'array' then
    v_result := '[';
    for v_item in
      select item.value
      from jsonb_array_elements(target) with ordinality as item(value, ordinality)
      order by item.ordinality
    loop
      v_result := v_result || v_separator
        || private.content_research_stable_json(v_item.value);
      v_separator := ',';
    end loop;
    return v_result || ']';
  end if;

  if v_type = 'number' then
    -- The worker fingerprints the JSON value after JavaScript parsing. Cast
    -- through float8 so PostgreSQL uses the same IEEE-754 value, then normalize
    -- PostgreSQL's padded exponent to ECMAScript JSON.stringify spelling.
    v_number := (target #>> '{}')::double precision;
    if v_number = 'Infinity'::double precision
       or v_number = '-Infinity'::double precision
       or v_number <> v_number then
      raise exception 'invalid content research payload: non-finite JSON number';
    end if;
    v_number_text := lower(v_number::text);
    if v_number_text in ('0', '-0') then
      return '0';
    end if;

    v_number_sign := case when left(v_number_text, 1) = '-' then '-' else '' end;
    v_number_text := ltrim(v_number_text, '-');
    if position('e' in v_number_text) > 0 then
      v_mantissa := split_part(v_number_text, 'e', 1);
      v_exponent := split_part(v_number_text, 'e', 2)::integer;
    else
      v_mantissa := v_number_text;
      v_exponent := 0;
    end if;
    v_decimal_position := case
      when position('.' in v_mantissa) > 0 then position('.' in v_mantissa) - 1
      else length(v_mantissa)
    end;
    v_digits := replace(v_mantissa, '.', '');
    v_leading_zeroes := length(v_digits) - length(ltrim(v_digits, '0'));
    v_digits := ltrim(v_digits, '0');
    if v_digits = '' then
      return '0';
    end if;
    v_decimal_k := v_decimal_position + v_exponent - v_leading_zeroes;
    v_digits := rtrim(v_digits, '0');

    -- ECMAScript Number::toString uses fixed notation for [1e-6, 1e21)
    -- and scientific notation outside it. PostgreSQL and V8 both expose the
    -- shortest round-tripping IEEE-754 digits; only that notation threshold
    -- and exponent spelling need to be made explicit here.
    if v_decimal_k > 0 and v_decimal_k <= 21 then
      if length(v_digits) <= v_decimal_k then
        return v_number_sign || v_digits
          || repeat('0', v_decimal_k - length(v_digits));
      end if;
      return v_number_sign || left(v_digits, v_decimal_k) || '.'
        || substring(v_digits from v_decimal_k + 1);
    end if;
    if v_decimal_k <= 0 and v_decimal_k > -6 then
      return v_number_sign || '0.' || repeat('0', -v_decimal_k) || v_digits;
    end if;

    v_scientific_exponent := v_decimal_k - 1;
    return v_number_sign || left(v_digits, 1)
      || case when length(v_digits) > 1 then '.' || substring(v_digits from 2) else '' end
      || 'e'
      || case when v_scientific_exponent >= 0 then '+' else '' end
      || v_scientific_exponent::text;
  end if;

  return target::text;
end;
$$;

create or replace function private.content_research_sha256(
  target jsonb
)
returns text
language sql
immutable
strict
security invoker
set search_path = pg_catalog
as $$
  select encode(
    extensions.digest(
      convert_to(private.content_research_stable_json(target), 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function private.assert_content_research_json_safe(
  target jsonb,
  target_path text default '$'
)
returns void
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  v_item record;
  v_key_bytes bytea;
  v_key_index integer;
  v_normalized_key text;
  v_string text;
begin
  if target is null then
    return;
  end if;

  if jsonb_typeof(target) = 'object' then
    for v_item in select item.key, item.value from jsonb_each(target) as item(key, value)
    loop
      v_key_bytes := convert_to(v_item.key, 'UTF8');
      if octet_length(v_key_bytes) not between 1 and 128 then
        raise exception
          'invalid content research payload: object key must be 1..128 printable ASCII bytes at %.%',
          target_path, v_item.key;
      end if;
      for v_key_index in 0..octet_length(v_key_bytes) - 1 loop
        if get_byte(v_key_bytes, v_key_index) not between 32 and 126 then
          raise exception
            'invalid content research payload: object key must be 1..128 printable ASCII bytes at %.%',
            target_path, v_item.key;
        end if;
      end loop;

      v_normalized_key := regexp_replace(lower(v_item.key), '[^a-z0-9]', '', 'g');
      if v_normalized_key ~ '(secret|accesstoken|refreshtoken|idtoken|apitoken|authtoken|bearer|credential|servicerole|privatekey|password|cookie|authorization|jwt|apikey)' then
        raise exception 'invalid content research payload: secret-bearing key at %.%', target_path, v_item.key;
      end if;
      perform private.assert_content_research_json_safe(
        v_item.value,
        target_path || '.' || v_item.key
      );
    end loop;
    return;
  end if;

  if jsonb_typeof(target) = 'array' then
    for v_item in
      select item.value, item.ordinality
      from jsonb_array_elements(target) with ordinality as item(value, ordinality)
    loop
      perform private.assert_content_research_json_safe(
        v_item.value,
        target_path || '[' || (v_item.ordinality - 1) || ']'
      );
    end loop;
    return;
  end if;

  if jsonb_typeof(target) = 'string' then
    v_string := target #>> '{}';
    if v_string ~* 'Bearer[[:space:]]+[A-Za-z0-9._~+/-]+'
       or v_string ~ '(^|[^A-Za-z0-9])eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'
       or v_string ~* '(^|[^A-Za-z0-9])(sk|sb_secret)_[A-Za-z0-9_-]{8,}'
       or v_string ~* '(^|[^A-Za-z0-9])(client[_-]?secret|access[_-]?token|refresh[_-]?token|id[_-]?token|api[_-]?token|auth[_-]?token|bearer|credentials?|service[_-]?role([_-]?key)?|private[_-]?key|password|cookie|authorization|jwt|api[_-]?key)[[:space:]]*[=:][[:space:]]*[^[:space:],;]+'
       or v_string ~* 'postgres(ql)?://[^/[:space:]:]+:[^@[:space:]]+@' then
      raise exception 'invalid content research payload: secret-bearing value at %', target_path;
    end if;
  end if;
end;
$$;

create or replace function private.content_research_normalize_isbn(
  value text
)
returns text
language sql
immutable
strict
security invoker
set search_path = pg_catalog
as $$
  select upper(regexp_replace(value, '[[:space:]-]', '', 'g'));
$$;

create or replace function private.content_research_is_valid_isbn(
  value text
)
returns boolean
language plpgsql
immutable
strict
security invoker
set search_path = pg_catalog
as $$
declare
  v_isbn text := private.content_research_normalize_isbn(value);
  v_sum integer := 0;
  v_index integer;
  v_digit integer;
begin
  if v_isbn ~ '^[0-9]{9}[0-9X]$' then
    for v_index in 1..10 loop
      v_digit := case
        when substring(v_isbn from v_index for 1) = 'X' then 10
        else substring(v_isbn from v_index for 1)::integer
      end;
      v_sum := v_sum + v_digit * (11 - v_index);
    end loop;
    return v_sum % 11 = 0;
  end if;

  if v_isbn ~ '^97[89][0-9]{10}$' then
    for v_index in 1..13 loop
      v_digit := substring(v_isbn from v_index for 1)::integer;
      v_sum := v_sum + v_digit * case when v_index % 2 = 1 then 1 else 3 end;
    end loop;
    return v_sum % 10 = 0;
  end if;

  return false;
end;
$$;

create or replace function private.content_research_canonical_isbn(
  value text
)
returns text
language plpgsql
immutable
strict
security invoker
set search_path = pg_catalog
as $$
declare
  v_isbn text := private.content_research_normalize_isbn(value);
  v_body text;
  v_sum integer := 0;
  v_index integer;
begin
  if not private.content_research_is_valid_isbn(v_isbn) then
    return null;
  end if;
  if length(v_isbn) = 13 then
    return v_isbn;
  end if;

  v_body := '978' || substring(v_isbn from 1 for 9);
  for v_index in 1..12 loop
    v_sum := v_sum
      + substring(v_body from v_index for 1)::integer
        * case when v_index % 2 = 1 then 1 else 3 end;
  end loop;
  return v_body || ((10 - (v_sum % 10)) % 10)::text;
end;
$$;

create or replace function private.content_research_json_fill_missing(
  existing_value jsonb,
  incoming_value jsonb
)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $$
declare
  v_result jsonb := coalesce(existing_value, '{}'::jsonb);
  v_item record;
  v_existing jsonb;
begin
  if jsonb_typeof(incoming_value) <> 'object' then
    return existing_value;
  end if;
  if jsonb_typeof(v_result) <> 'object' then
    v_result := '{}'::jsonb;
  end if;

  for v_item in select item.key, item.value from jsonb_each(incoming_value) as item(key, value)
  loop
    v_existing := v_result -> v_item.key;
    if v_existing is null
       or v_existing = 'null'::jsonb
       or (jsonb_typeof(v_existing) = 'string' and btrim(v_existing #>> '{}') = '')
       or (jsonb_typeof(v_existing) = 'array' and jsonb_array_length(v_existing) = 0)
    then
      v_result := jsonb_set(v_result, array[v_item.key], v_item.value, true);
    elsif jsonb_typeof(v_existing) = 'object'
          and jsonb_typeof(v_item.value) = 'object' then
      v_result := jsonb_set(
        v_result,
        array[v_item.key],
        private.content_research_json_fill_missing(v_existing, v_item.value),
        true
      );
    end if;
  end loop;
  return v_result;
end;
$$;

create unique index contents_book_canonical_isbn_key
  on public.contents (private.content_research_canonical_isbn(external_id))
  where type = 'BOOK'
    and external_id is not null
    and private.content_research_canonical_isbn(external_id) is not null;

create index celeb_task_queue_content_research_claim_idx
  on public.celeb_task_queue (priority desc, created_at, celeb_id)
  where task_type = 'content_research_v1'
    and status in ('pending', 'in_progress');

create or replace function private.build_celeb_content_research_profile_snapshot(
  p_celeb_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'id', celeb.id,
    'slug', celeb.slug,
    'nickname', celeb.nickname,
    'nicknameEn', celeb.nickname_en,
    'profession', celeb.profession,
    'nationality', celeb.nationality,
    'birthDate', celeb.birth_date,
    'deathDate', celeb.death_date,
    'wikidataQid', celeb.wikidata_qid,
    'publicationStatus', celeb.publication_status,
    'celebTier', celeb.celeb_tier
  )
  from public.celebs as celeb
  where celeb.id = p_celeb_id;
$$;

create or replace function private.assert_celeb_content_research_source(
  source jsonb
)
returns void
language plpgsql
volatile
security invoker
set search_path = pg_catalog
as $$
declare
  v_checked_at timestamptz;
begin
  if not private.content_research_has_exact_keys(
    source,
    array[
      'url', 'sourceTier', 'sourceKind', 'accessStatus',
      'supportsCandidate', 'title', 'notes', 'checkedAt'
    ]::text[]
  ) then
    raise exception 'invalid content research payload: source keys';
  end if;

  if jsonb_typeof(source -> 'url') <> 'string'
     or not private.content_research_is_valid_source_url(source ->> 'url') then
    raise exception 'invalid content research payload: source URL';
  end if;
  if jsonb_typeof(source -> 'sourceTier') <> 'string'
     or source ->> 'sourceTier' not in ('primary', 'secondary') then
    raise exception 'invalid content research payload: source tier';
  end if;
  if jsonb_typeof(source -> 'sourceKind') <> 'string'
     or source ->> 'sourceKind' not in (
    'direct_statement', 'interview', 'official_profile', 'social_post',
    'transcript', 'archive', 'article', 'other'
  ) then
    raise exception 'invalid content research payload: source kind';
  end if;
  if jsonb_typeof(source -> 'accessStatus') <> 'string'
     or source ->> 'accessStatus' not in (
    'accessible', 'bot_blocked', 'archived', 'unavailable'
  ) then
    raise exception 'invalid content research payload: source access status';
  end if;
  if jsonb_typeof(source -> 'supportsCandidate') <> 'boolean' then
    raise exception 'invalid content research payload: source supportsCandidate';
  end if;
  if not private.content_research_is_nullable_text(source, 'title')
     or not private.content_research_is_nullable_text(source, 'notes') then
    raise exception 'invalid content research payload: source nullable text fields';
  end if;
  if jsonb_typeof(source -> 'checkedAt') <> 'string'
     or source ->> 'checkedAt' !~
       '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$' then
    raise exception 'invalid content research payload: source checkedAt';
  end if;

  -- PostgreSQL accepts infinity as timestamptz; an audit timestamp must be a
  -- finite observation and cannot be minted materially in the future.
  v_checked_at := (source ->> 'checkedAt')::timestamptz;
  if not isfinite(v_checked_at)
     or v_checked_at > clock_timestamp() + interval '5 minutes' then
    raise exception 'invalid content research payload: source checkedAt is non-finite or future-dated';
  end if;
end;
$$;

create or replace function public.fail_celeb_content_research(
  p_celeb_id uuid,
  p_worker text,
  p_claim_token uuid,
  p_error text,
  p_retry boolean default true,
  p_skip boolean default false,
  p_research_payload jsonb default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = pg_catalog
as $$
declare
  v_worker text := btrim(coalesce(p_worker, ''));
  v_error text := btrim(coalesce(p_error, ''));
  v_retry boolean := coalesce(p_retry, true);
  v_skip boolean := coalesce(p_skip, false);
  v_queue public.celeb_task_queue%rowtype;
  v_run_id uuid;
  v_terminal_status text;
  v_retry_exhausted boolean := false;
  v_retry_not_before timestamptz;
  v_backoff_seconds integer;
begin
  if p_celeb_id is null or p_claim_token is null or v_worker = '' then
    raise exception 'content research fail requires celeb_id, worker, and claim token';
  end if;
  if v_error = '' then
    raise exception 'content research fail error is required';
  end if;
  if p_research_payload is not null
     and jsonb_typeof(p_research_payload) <> 'object' then
    raise exception 'invalid content research payload: failure payload must be an object';
  end if;
  perform private.assert_content_research_json_safe(p_research_payload, '$.failureResearchPayload');

  select queue.*
  into v_queue
  from public.celeb_task_queue as queue
  where queue.task_type = 'content_research_v1'
    and queue.celeb_id = p_celeb_id
  for update;

  if not found
    or v_queue.status <> 'in_progress'
    or v_queue.claimed_by is distinct from v_worker
    or v_queue.payload ->> 'claimToken' is distinct from p_claim_token::text
    or v_queue.lease_expires_at is null
    or v_queue.lease_expires_at < now()
  then
    raise exception
      'active content research claim not owned or lease expired: celeb_id=%',
      p_celeb_id;
  end if;

  v_run_id := nullif(v_queue.payload ->> 'runId', '')::uuid;
  if v_run_id is null or not exists (
    select 1
    from public.celeb_content_research_runs as run
    where run.id = v_run_id
      and run.celeb_id = p_celeb_id
      and run.status = 'in_progress'
  ) then
    raise exception 'content research failure run is not resumable: celeb_id=%', p_celeb_id;
  end if;

  if v_retry and not v_skip and v_queue.attempt_count < 5 then
    v_backoff_seconds := least(
      3600,
      (30 * power(2::numeric, greatest(v_queue.attempt_count - 1, 0)))::integer
    );
    v_retry_not_before := now() + make_interval(secs => v_backoff_seconds);
    update public.celeb_task_queue as queue
    set status = 'pending',
        claimed_by = null,
        claimed_at = null,
        lease_expires_at = null,
        completed_at = null,
        last_error = v_error,
        payload = (queue.payload - 'claimToken') || jsonb_build_object(
          'lastFailureAt', now(),
          'lastFailureWorker', v_worker,
          'lastFailureSkipped', false,
          'retryNotBefore', v_retry_not_before,
          'failureResearchPayload', p_research_payload
        ),
        updated_at = now()
    where queue.task_type = 'content_research_v1'
      and queue.celeb_id = p_celeb_id;

    return jsonb_build_object(
      'status', 'pending',
      'celebId', p_celeb_id,
      'runId', v_run_id,
      'claimToken', p_claim_token,
      'error', v_error,
      'retryExhausted', false,
      'retryNotBefore', v_retry_not_before
    );
  end if;

  v_retry_exhausted := v_retry and not v_skip and v_queue.attempt_count >= 5;

  update public.celeb_content_research_runs as run
  set status = 'cancelled',
      summary = coalesce(run.summary, v_error)
  where run.id = v_run_id
    and run.celeb_id = p_celeb_id
    and run.status = 'in_progress';

  if not found then
    raise exception 'content research failure run lost ownership: celeb_id=%', p_celeb_id;
  end if;

  update public.celebs as celeb
  set content_research_status = 'open'
  where celeb.id = p_celeb_id
    and celeb.content_research_status = 'researching';

  v_terminal_status := case when v_skip then 'skipped' else 'failed' end;
  update public.celeb_task_queue as queue
  set status = v_terminal_status,
      claimed_by = null,
      claimed_at = null,
      lease_expires_at = null,
      completed_at = case when v_skip then now() else null end,
      last_error = v_error,
      payload = (queue.payload - 'claimToken') || jsonb_build_object(
        'lastFailureAt', now(),
        'lastFailureWorker', v_worker,
        'lastFailureSkipped', v_skip,
        'retryExhausted', v_retry_exhausted,
        'retryNotBefore', null,
        'lastRunId', v_run_id,
        'failureResearchPayload', p_research_payload
      ),
      updated_at = now()
  where queue.task_type = 'content_research_v1'
    and queue.celeb_id = p_celeb_id;

  return jsonb_build_object(
    'status', v_terminal_status,
    'celebId', p_celeb_id,
    'runId', v_run_id,
    'claimToken', p_claim_token,
    'error', v_error,
    'retryExhausted', v_retry_exhausted,
    'retryNotBefore', null
  );
end;
$$;

create or replace function public.requeue_celeb_content_research(
  p_celeb_id uuid,
  p_reason text,
  p_reset_attempts boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_reason text := btrim(coalesce(p_reason, ''));
  v_queue public.celeb_task_queue%rowtype;
  v_generation integer;
  v_attempt_count integer;
begin
  if p_celeb_id is null or v_reason = '' then
    raise exception 'content research requeue requires celeb_id and reason';
  end if;

  select queue.*
  into v_queue
  from public.celeb_task_queue as queue
  where queue.task_type = 'content_research_v1'
    and queue.celeb_id = p_celeb_id
  for update;

  if found
    and v_queue.status = 'in_progress'
    and v_queue.lease_expires_at is not null
    and v_queue.lease_expires_at >= now()
  then
    raise exception 'cannot requeue an active content research lease: celeb_id=%', p_celeb_id;
  end if;

  perform 1
  from public.celebs as celeb
  where celeb.id = p_celeb_id
    and celeb.content_research_status in ('open', 'researching')
  for update;

  if not found then
    raise exception 'content research celeb is not requeueable: celeb_id=%', p_celeb_id;
  end if;
  if exists (
    select 1 from public.celeb_contents as link where link.celeb_id = p_celeb_id
  ) then
    raise exception 'cannot requeue content research after domain links exist: celeb_id=%', p_celeb_id;
  end if;

  update public.celeb_content_research_runs as run
  set status = 'cancelled',
      summary = coalesce(run.summary, 'Superseded by explicit requeue: ' || v_reason)
  where run.celeb_id = p_celeb_id
    and run.status = 'in_progress';

  update public.celebs as celeb
  set content_research_status = 'open'
  where celeb.id = p_celeb_id
    and celeb.content_research_status = 'researching';

  v_generation := greatest(
    case
      when coalesce(v_queue.payload ->> 'generation', '') ~ '^[0-9]{1,9}$'
        then (v_queue.payload ->> 'generation')::integer + 1
      else 1
    end,
    1
  );

  insert into public.celeb_task_queue as queue (
    task_type, celeb_id, status, priority, payload, attempt_count,
    claimed_by, claimed_at, lease_expires_at, completed_at, last_error, updated_at
  ) values (
    'content_research_v1', p_celeb_id, 'pending', 0,
    jsonb_build_object(
      'schemaVersion', 1,
      'generation', v_generation,
      'batchKey', format('content-research-direct-v1:g%s', v_generation),
      'reason', v_reason,
      'retryNotBefore', null,
      'requeuedAt', now()
    ),
    0, null, null, null, null, null, now()
  )
  on conflict (task_type, celeb_id) do update
  set status = 'pending',
      payload = jsonb_build_object(
        'schemaVersion', 1,
        'generation', v_generation,
        'batchKey', format('content-research-direct-v1:g%s', v_generation),
        'reason', v_reason,
        'retryNotBefore', null,
        'requeuedAt', now()
      ),
      attempt_count = case
        when coalesce(p_reset_attempts, false)
          or queue.status in ('completed', 'failed', 'skipped')
          or queue.attempt_count >= 5
        then 0
        else queue.attempt_count
      end,
      claimed_by = null,
      claimed_at = null,
      lease_expires_at = null,
      completed_at = null,
      last_error = null,
      updated_at = now()
  returning queue.attempt_count into v_attempt_count;

  return jsonb_build_object(
    'status', 'pending',
    'celebId', p_celeb_id,
    'generation', v_generation,
    'attemptCount', v_attempt_count,
    'reason', v_reason
  );
end;
$$;

create or replace function public.get_celeb_content_research_status()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  with queue_counts as (
    select
      count(*)::bigint as total,
      count(*) filter (where queue.status = 'pending')::bigint as pending,
      count(*) filter (where queue.status = 'in_progress')::bigint as in_progress,
      count(*) filter (where queue.status = 'completed')::bigint as completed,
      count(*) filter (where queue.status = 'failed')::bigint as failed,
      count(*) filter (where queue.status = 'skipped')::bigint as skipped,
      count(*) filter (
        where queue.status = 'in_progress'
          and (queue.lease_expires_at is null or queue.lease_expires_at < now())
      )::bigint as expired_leases
    from public.celeb_task_queue as queue
    where queue.task_type = 'content_research_v1'
  ),
  run_counts as (
    select
      count(*) filter (where run.status = 'in_progress')::bigint as in_progress,
      count(*) filter (where run.status = 'completed')::bigint as completed,
      count(*) filter (where run.status = 'cancelled')::bigint as cancelled
    from public.celeb_content_research_runs as run
  ),
  integrity as (
    select
      count(*) filter (
        where queue.status = 'in_progress'
          and not exists (
            select 1
            from public.celeb_content_research_runs as run
            where run.id::text = queue.payload ->> 'runId'
              and run.celeb_id = queue.celeb_id
              and run.status = 'in_progress'
          )
      )::bigint as active_queue_without_run,
      (
        select count(*)::bigint
        from public.celeb_content_research_runs as run
        where run.status = 'in_progress'
          and not exists (
            select 1
            from public.celeb_task_queue as active_queue
            where active_queue.task_type = 'content_research_v1'
              and active_queue.celeb_id = run.celeb_id
              and active_queue.status in ('pending', 'in_progress')
              and active_queue.payload ->> 'runId' = run.id::text
          )
      ) as active_run_without_queue,
      count(*) filter (
        where queue.status = 'completed'
          and not exists (
            select 1
            from public.celeb_content_research_runs as run
            where run.id::text = queue.payload ->> 'runId'
              and run.celeb_id = queue.celeb_id
              and run.status in ('completed', 'cancelled')
          )
      )::bigint as completed_queue_without_closed_run,
      count(*) filter (
        where queue.status = 'completed'
          and queue.payload -> 'result' ->> 'status' = 'music_deferred'
          and not exists (
            select 1
            from public.celeb_content_research_runs as run
            join public.celeb_content_research_findings as finding
              on finding.run_id = run.id
             and finding.content_type = 'MUSIC'
             and finding.decision = 'evidence_verified'
            where run.id::text = queue.payload ->> 'runId'
              and run.celeb_id = queue.celeb_id
          )
      )::bigint as music_deferred_queue_without_verified_finding,
      (
        select count(*)::bigint
        from public.celeb_content_research_findings as finding
        join public.celeb_content_research_runs as run on run.id = finding.run_id
        where finding.content_type = 'MUSIC'
          and finding.decision = 'evidence_verified'
          and not exists (
            select 1
            from public.celeb_music_candidates as music
            where music.celeb_id = run.celeb_id
              and lower(btrim(music.title)) = lower(btrim(finding.title))
              and lower(btrim(coalesce(music.artist, ''))) =
                  lower(btrim(coalesce(finding.creator, '')))
          )
      ) as verified_music_finding_without_candidate,
      count(*) filter (
        where queue.status = 'completed'
          and queue.payload -> 'result' ->> 'status' = 'music_deferred'
          and exists (
            select 1
            from public.celebs as celeb
            where celeb.id = queue.celeb_id
              and celeb.content_research_status = 'confirmed_empty'
          )
      )::bigint as music_deferred_celeb_confirmed_empty
    from public.celeb_task_queue as queue
    where queue.task_type = 'content_research_v1'
  )
  select jsonb_build_object(
    'taskType', 'content_research_v1',
    'queue', jsonb_build_object(
      'total', queue_counts.total,
      'pending', queue_counts.pending,
      'inProgress', queue_counts.in_progress,
      'completed', queue_counts.completed,
      'failed', queue_counts.failed,
      'skipped', queue_counts.skipped,
      'expiredLeases', queue_counts.expired_leases
    ),
    'researchRuns', jsonb_build_object(
      'inProgress', run_counts.in_progress,
      'completed', run_counts.completed,
      'cancelled', run_counts.cancelled
    ),
    'integrity', jsonb_build_object(
      'activeQueueWithoutRun', integrity.active_queue_without_run,
      'activeRunWithoutQueue', integrity.active_run_without_queue,
      'completedQueueWithoutClosedRun', integrity.completed_queue_without_closed_run,
      'musicDeferredQueueWithoutVerifiedFinding', integrity.music_deferred_queue_without_verified_finding,
      'verifiedMusicFindingWithoutCandidate', integrity.verified_music_finding_without_candidate,
      'musicDeferredCelebConfirmedEmpty', integrity.music_deferred_celeb_confirmed_empty
    )
  )
  from queue_counts
  cross join run_counts
  cross join integrity;
$$;

create or replace function private.insert_celeb_content_research_source(
  p_run_id uuid,
  p_content_type text,
  p_finding_id uuid,
  p_source jsonb
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = pg_catalog
as $$
declare
  v_source_id uuid;
begin
  perform private.assert_celeb_content_research_source(p_source);

  insert into public.celeb_content_research_sources as stored (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, supports_candidate, title, notes, checked_at
  )
  values (
    p_run_id,
    p_content_type,
    p_finding_id,
    p_source ->> 'url',
    p_source ->> 'sourceTier',
    p_source ->> 'sourceKind',
    p_source ->> 'accessStatus',
    (p_source ->> 'supportsCandidate')::boolean,
    nullif(btrim(p_source ->> 'title'), ''),
    nullif(btrim(p_source ->> 'notes'), ''),
    (p_source ->> 'checkedAt')::timestamptz
  )
  on conflict on constraint celeb_content_research_sources_run_type_url_finding_key
  do update set
    source_tier = excluded.source_tier,
    source_kind = excluded.source_kind,
    access_status = excluded.access_status,
    supports_candidate = stored.supports_candidate or excluded.supports_candidate,
    title = coalesce(stored.title, excluded.title),
    notes = coalesce(stored.notes, excluded.notes),
    checked_at = greatest(stored.checked_at, excluded.checked_at)
  returning stored.id into v_source_id;

  return v_source_id;
end;
$$;

create or replace function public.renew_celeb_content_research_lease(
  p_celeb_id uuid,
  p_worker text,
  p_claim_token uuid,
  p_lease_minutes integer default 60
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_worker text := btrim(coalesce(p_worker, ''));
  v_lease_minutes integer := greatest(1, least(coalesce(p_lease_minutes, 60), 1440));
  v_lease_expires_at timestamptz;
begin
  if p_celeb_id is null or p_claim_token is null or v_worker = '' then
    raise exception 'content research renew requires celeb_id, worker, and claim token';
  end if;

  update public.celeb_task_queue as queue
  set lease_expires_at = now() + make_interval(mins => v_lease_minutes),
      updated_at = now()
  where queue.task_type = 'content_research_v1'
    and queue.celeb_id = p_celeb_id
    and queue.status = 'in_progress'
    and queue.claimed_by = v_worker
    and queue.payload ->> 'claimToken' = p_claim_token::text
    and queue.lease_expires_at is not null
    and queue.lease_expires_at >= now()
  returning queue.lease_expires_at into v_lease_expires_at;

  if v_lease_expires_at is null then
    raise exception
      'active content research claim not owned or lease expired: celeb_id=%',
      p_celeb_id;
  end if;

  return jsonb_build_object(
    'status', 'in_progress',
    'celebId', p_celeb_id,
    'claimToken', p_claim_token,
    'leaseExpiresAt', v_lease_expires_at
  );
end;
$$;

create or replace function public.reserve_external_provider_request(
  p_provider text,
  p_worker text,
  p_request_token uuid,
  p_min_interval_ms integer default 2000
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = pg_catalog
as $$
declare
  v_provider text := coalesce(p_provider, '');
  v_worker text := btrim(coalesce(p_worker, ''));
  v_now timestamptz;
  v_available_at timestamptz;
  v_next_available_at timestamptz;
  v_wait_ms integer;
  v_state public.external_provider_rate_limits%rowtype;
  v_reservation public.external_provider_rate_limit_reservations%rowtype;
begin
  if v_provider <> 'openlibrary' then
    raise exception 'unsupported external provider: %', v_provider;
  end if;
  if v_worker = '' or length(v_worker) > 200 then
    raise exception 'external provider reservation worker must be 1..200 characters';
  end if;
  if p_request_token is null then
    raise exception 'external provider reservation request token is required';
  end if;
  if p_min_interval_ms is null or p_min_interval_ms not between 1100 and 60000 then
    raise exception 'external provider reservation interval must be 1100..60000 milliseconds';
  end if;

  insert into public.external_provider_rate_limits as rate_limit (
    provider, available_at, min_interval_ms
  )
  values (v_provider, clock_timestamp(), p_min_interval_ms)
  on conflict (provider) do nothing;

  select rate_limit.*
  into strict v_state
  from public.external_provider_rate_limits as rate_limit
  where rate_limit.provider = v_provider
  for update;

  select reservation.*
  into v_reservation
  from public.external_provider_rate_limit_reservations as reservation
  where reservation.provider = v_provider
    and reservation.request_token = p_request_token;

  if found then
    if v_reservation.worker is distinct from v_worker
       or v_reservation.min_interval_ms is distinct from p_min_interval_ms then
      raise exception
        'external provider reservation token parameter mismatch: provider=%, request_token=%',
        v_provider, p_request_token;
    end if;
    v_wait_ms := greatest(
      0,
      ceil(
        extract(epoch from (v_reservation.available_at - clock_timestamp())) * 1000
      )::integer
    );
    return jsonb_build_object(
      'provider', v_provider,
      'worker', v_worker,
      'requestToken', p_request_token,
      'availableAt', v_reservation.available_at,
      'nextAvailableAt', v_reservation.next_available_at,
      'waitMs', v_wait_ms,
      'minIntervalMs', p_min_interval_ms,
      'replayed', true
    );
  end if;

  v_now := clock_timestamp();
  v_available_at := greatest(v_state.available_at, v_now);
  v_next_available_at := v_available_at
    + make_interval(secs => p_min_interval_ms::double precision / 1000.0);

  update public.external_provider_rate_limits as rate_limit
  set available_at = v_next_available_at,
      min_interval_ms = p_min_interval_ms,
      last_reserved_at = v_now,
      last_reserved_by = v_worker,
      updated_at = v_now
  where rate_limit.provider = v_provider;

  insert into public.external_provider_rate_limit_reservations (
    provider, request_token, worker, available_at, next_available_at,
    min_interval_ms
  ) values (
    v_provider, p_request_token, v_worker, v_available_at,
    v_next_available_at, p_min_interval_ms
  );

  v_wait_ms := greatest(
    0,
    ceil(extract(epoch from (v_available_at - clock_timestamp())) * 1000)::integer
  );
  return jsonb_build_object(
    'provider', v_provider,
    'worker', v_worker,
    'requestToken', p_request_token,
    'availableAt', v_available_at,
    'nextAvailableAt', v_next_available_at,
    'waitMs', v_wait_ms,
    'minIntervalMs', p_min_interval_ms,
    'replayed', false
  );
end;
$$;

create or replace function public.complete_celeb_content_research_direct(
  p_celeb_id uuid,
  p_worker text,
  p_claim_token uuid,
  p_research_fingerprint text,
  p_research_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_worker text := btrim(coalesce(p_worker, ''));
  v_queue public.celeb_task_queue%rowtype;
  v_run_id uuid;
  v_snapshot jsonb;
  v_live_snapshot jsonb;
  v_scope jsonb;
  v_scope_source jsonb;
  v_candidate jsonb;
  v_candidate_source jsonb;
  v_primary_source jsonb;
  v_content jsonb;
  v_locale jsonb;
  v_content_type text;
  v_external_source text;
  v_external_id text;
  v_canonical_isbn text;
  v_expected_locale_source text;
  v_content_id text;
  v_existing_type text;
  v_existing_source text;
  v_finding_id uuid;
  v_link_id uuid;
  v_decision text;
  v_result jsonb;
  v_final_status text;
  v_actual_content_count bigint := 0;
  v_contents_created integer := 0;
  v_links_created integer := 0;
  v_music_upserted integer := 0;
  v_music_findings_recorded integer := 0;
  v_non_music_accepted integer := 0;
  v_music_eligible integer := 0;
  v_db_fingerprint text;
  v_seen_content_identities text[] := array[]::text[];
begin
  if p_celeb_id is null or p_claim_token is null or v_worker = '' then
    raise exception 'content research commit requires celeb_id, worker, and claim token';
  end if;
  if coalesce(p_research_fingerprint, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid content research fingerprint';
  end if;
  if jsonb_typeof(p_research_payload) <> 'object' then
    raise exception 'invalid content research payload: root must be an object';
  end if;
  perform private.assert_content_research_json_safe(p_research_payload);
  v_db_fingerprint := private.content_research_sha256(p_research_payload);
  if v_db_fingerprint is distinct from p_research_fingerprint then
    raise exception 'invalid content research fingerprint: canonical JSON mismatch';
  end if;

  select queue.*
  into v_queue
  from public.celeb_task_queue as queue
  where queue.task_type = 'content_research_v1'
    and queue.celeb_id = p_celeb_id
  for update;

  if not found then
    raise exception 'content research queue row is missing: celeb_id=%', p_celeb_id;
  end if;

  if v_queue.status = 'completed' then
    if v_queue.payload ->> 'claimToken' is distinct from p_claim_token::text then
      raise exception 'completed content research claim token mismatch';
    end if;
    if v_queue.payload ->> 'researchFingerprint' is distinct from p_research_fingerprint then
      raise exception 'completed content research fingerprint mismatch';
    end if;
    if v_queue.payload -> 'researchPayload' is distinct from p_research_payload then
      raise exception 'completed content research payload mismatch';
    end if;
    v_result := v_queue.payload -> 'result';
    if jsonb_typeof(v_result) <> 'object' then
      raise exception 'completed content research result is missing';
    end if;
    return v_result || jsonb_build_object('status', 'already_completed');
  end if;

  if v_queue.status <> 'in_progress'
     or v_queue.claimed_by is distinct from v_worker
     or v_queue.payload ->> 'claimToken' is distinct from p_claim_token::text
     or v_queue.lease_expires_at is null
     or v_queue.lease_expires_at < now() then
    raise exception
      'active content research claim not owned or lease expired: celeb_id=%',
      p_celeb_id;
  end if;

  v_run_id := nullif(v_queue.payload ->> 'runId', '')::uuid;
  if v_run_id is null or not exists (
    select 1
    from public.celeb_content_research_runs as run
    where run.id = v_run_id
      and run.celeb_id = p_celeb_id
      and run.status = 'in_progress'
  ) then
    raise exception 'content research commit run is not active: celeb_id=%', p_celeb_id;
  end if;

  if not private.content_research_has_exact_keys(
    p_research_payload,
    array['profileSnapshot', 'nameVariants', 'homonymNotes', 'summary', 'scopes']::text[]
  ) then
    raise exception 'invalid content research payload: top-level keys';
  end if;

  v_snapshot := p_research_payload -> 'profileSnapshot';
  v_live_snapshot := private.build_celeb_content_research_profile_snapshot(p_celeb_id);
  if v_snapshot is distinct from v_queue.payload -> 'profileSnapshot'
     or v_snapshot is distinct from v_live_snapshot then
    raise exception 'invalid content research payload: profile snapshot drift';
  end if;

  if jsonb_typeof(p_research_payload -> 'nameVariants') <> 'array'
     or jsonb_array_length(p_research_payload -> 'nameVariants') = 0
     or exists (
       select 1
       from jsonb_array_elements(p_research_payload -> 'nameVariants') as variants(value)
       where jsonb_typeof(variants.value) <> 'string'
         or nullif(btrim(variants.value #>> '{}'), '') is null
     )
     or not exists (
       select 1
       from jsonb_array_elements_text(p_research_payload -> 'nameVariants') as variants(value)
       where btrim(variants.value) = v_snapshot ->> 'nickname'
     )
     or (
       nullif(btrim(v_snapshot ->> 'nicknameEn'), '') is not null
       and not exists (
         select 1
         from jsonb_array_elements_text(p_research_payload -> 'nameVariants') as variants(value)
         where btrim(variants.value) = v_snapshot ->> 'nicknameEn'
       )
     )
     or (
       select count(*) <> count(distinct btrim(variants.value))
       from jsonb_array_elements_text(
         p_research_payload -> 'nameVariants'
       ) as variants(value)
     ) then
    raise exception 'invalid content research payload: name variants';
  end if;
  if jsonb_typeof(p_research_payload -> 'homonymNotes') <> 'string'
     or nullif(btrim(p_research_payload ->> 'homonymNotes'), '') is null then
    raise exception 'invalid content research payload: homonym notes';
  end if;
  if jsonb_typeof(p_research_payload -> 'summary') <> 'string'
     or nullif(btrim(p_research_payload ->> 'summary'), '') is null then
    raise exception 'invalid content research payload: summary';
  end if;
  if jsonb_typeof(p_research_payload -> 'scopes') <> 'array'
     or jsonb_array_length(p_research_payload -> 'scopes') <> 4
     or 4 <> (
       select count(distinct scope ->> 'contentType')
       from jsonb_array_elements(p_research_payload -> 'scopes') as scopes(scope)
       where scope ->> 'contentType' in ('BOOK', 'VIDEO', 'GAME', 'MUSIC')
     ) then
    raise exception 'invalid content research payload: exactly four scopes are required';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_research_payload -> 'scopes') as scopes(scope)
    cross join lateral jsonb_array_elements(scope -> 'candidates') as candidates(candidate)
    where candidate ->> 'decision' = 'unresolved'
  ) then
    raise exception 'invalid content research payload: unresolved candidate remains';
  end if;
  if exists (
    select candidate_key
    from (
      select candidate ->> 'candidateKey' as candidate_key
      from jsonb_array_elements(p_research_payload -> 'scopes') as scopes(scope)
      cross join lateral jsonb_array_elements(scope -> 'candidates') as candidates(candidate)
    ) as candidate_keys
    group by candidate_key
    having candidate_key is null or btrim(candidate_key) = '' or count(*) > 1
  ) then
    raise exception 'invalid content research payload: duplicate or blank candidate key';
  end if;

  update public.celeb_content_research_runs as run
  set researcher_label = v_worker,
      name_variants = array(
        select distinct btrim(value)
        from jsonb_array_elements_text(p_research_payload -> 'nameVariants') as variants(value)
        where btrim(value) <> ''
        order by btrim(value)
      ),
      homonym_notes = btrim(p_research_payload ->> 'homonymNotes'),
      summary = btrim(p_research_payload ->> 'summary')
  where run.id = v_run_id;

  for v_scope in
    select scope
    from jsonb_array_elements(p_research_payload -> 'scopes') as scopes(scope)
  loop
    if not private.content_research_has_exact_keys(
      v_scope,
      array['contentType', 'status', 'searchNotes', 'scopeSources', 'candidates']::text[]
    ) then
      raise exception 'invalid content research payload: scope keys';
    end if;
    v_content_type := v_scope ->> 'contentType';
    if jsonb_typeof(v_scope -> 'contentType') <> 'string'
       or jsonb_typeof(v_scope -> 'status') <> 'string'
       or jsonb_typeof(v_scope -> 'searchNotes') <> 'string'
       or v_content_type not in ('BOOK', 'VIDEO', 'GAME', 'MUSIC')
       or v_scope ->> 'status' <> 'completed'
       or nullif(btrim(v_scope ->> 'searchNotes'), '') is null then
      raise exception 'invalid content research payload: scope status/type';
    end if;
    if jsonb_typeof(v_scope -> 'scopeSources') <> 'array'
       or jsonb_array_length(v_scope -> 'scopeSources') = 0 then
      raise exception 'invalid content research payload: scope source required for %', v_content_type;
    end if;
    if jsonb_typeof(v_scope -> 'candidates') <> 'array' then
      raise exception 'invalid content research payload: candidates array required';
    end if;

    for v_scope_source in
      select source
      from jsonb_array_elements(v_scope -> 'scopeSources') as sources(source)
    loop
      perform private.insert_celeb_content_research_source(
        v_run_id, v_content_type, null, v_scope_source
      );
    end loop;

    if not exists (
      select 1
      from jsonb_array_elements(v_scope -> 'scopeSources') as sources(source)
      where source ->> 'accessStatus' in ('accessible', 'archived')
    ) then
      raise exception 'invalid content research payload: scope lacks usable source for %', v_content_type;
    end if;

    for v_candidate in
      select candidate
      from jsonb_array_elements(v_scope -> 'candidates') as candidates(candidate)
    loop
      if not private.content_research_has_exact_keys(
        v_candidate,
        array[
          'candidateKey', 'decision', 'title', 'creator', 'evidenceSummary',
          'rejectionReason', 'content', 'sources'
        ]::text[]
      ) then
        raise exception 'invalid content research payload: candidate keys';
      end if;
      v_decision := v_candidate ->> 'decision';
      if jsonb_typeof(v_candidate -> 'candidateKey') <> 'string'
         or jsonb_typeof(v_candidate -> 'decision') <> 'string'
         or jsonb_typeof(v_candidate -> 'title') <> 'string'
         or not private.content_research_is_nullable_text(v_candidate, 'creator')
         or jsonb_typeof(v_candidate -> 'evidenceSummary') <> 'string'
         or not private.content_research_is_nullable_text(v_candidate, 'rejectionReason')
         or v_decision not in ('eligible', 'rejected')
         or nullif(btrim(v_candidate ->> 'candidateKey'), '') is null
         or nullif(btrim(v_candidate ->> 'title'), '') is null
         or nullif(btrim(v_candidate ->> 'evidenceSummary'), '') is null
         or jsonb_typeof(v_candidate -> 'sources') <> 'array'
         or jsonb_array_length(v_candidate -> 'sources') = 0 then
        raise exception 'invalid content research payload: candidate shape';
      end if;

      v_primary_source := null;
      for v_candidate_source in
        select source
        from jsonb_array_elements(v_candidate -> 'sources') as sources(source)
      loop
        perform private.assert_celeb_content_research_source(v_candidate_source);
        if v_primary_source is null
           and v_candidate_source ->> 'sourceTier' = 'primary'
           and v_candidate_source ->> 'accessStatus' in ('accessible', 'archived')
           and (v_candidate_source ->> 'supportsCandidate')::boolean then
          v_primary_source := v_candidate_source;
        end if;
      end loop;

      if v_decision = 'eligible' then
        if v_primary_source is null then
          raise exception 'invalid content research payload: eligible candidate lacks usable primary source';
        end if;
        if jsonb_typeof(v_candidate -> 'content') <> 'object'
           or v_candidate -> 'rejectionReason' <> 'null'::jsonb then
          raise exception 'invalid content research payload: eligible content is required';
        end if;
      else
        if v_candidate -> 'content' <> 'null'::jsonb
           or jsonb_typeof(v_candidate -> 'rejectionReason') <> 'string'
           or nullif(btrim(v_candidate ->> 'rejectionReason'), '') is null then
          raise exception 'invalid content research payload: rejected candidate shape';
        end if;
      end if;

      if v_decision = 'eligible' then
        v_content := v_candidate -> 'content';
        if not private.content_research_has_exact_keys(
          v_content,
          array[
            'type', 'externalSource', 'externalId', 'subtype', 'releaseDate',
            'metadata', 'locales'
          ]::text[]
        ) then
          raise exception 'invalid content research payload: content keys';
        end if;
        v_external_source := v_content ->> 'externalSource';
        v_external_id := nullif(btrim(v_content ->> 'externalId'), '');
        if jsonb_typeof(v_content -> 'type') <> 'string'
           or jsonb_typeof(v_content -> 'externalSource') <> 'string'
           or jsonb_typeof(v_content -> 'externalId') <> 'string'
           or not private.content_research_is_nullable_text(v_content, 'subtype')
           or not private.content_research_is_nullable_text(v_content, 'releaseDate')
           or v_content ->> 'type' <> v_content_type or v_external_id is null
           or jsonb_typeof(v_content -> 'metadata') <> 'object'
           or jsonb_typeof(v_content -> 'locales') <> 'array'
           or jsonb_array_length(v_content -> 'locales') = 0 then
          raise exception 'invalid content research payload: content identity/locales';
        end if;
        if not (
          (v_content_type = 'BOOK' and v_external_source in ('kakao_book', 'openlibrary'))
          or (v_content_type = 'VIDEO' and v_external_source = 'tmdb')
          or (v_content_type = 'GAME' and v_external_source = 'igdb')
          or (v_content_type = 'MUSIC' and v_external_source = 'itunes')
        ) then
          raise exception 'invalid content research payload: prohibited new metadata source %', v_external_source;
        end if;

        if v_content_type = 'BOOK' then
          v_canonical_isbn := private.content_research_canonical_isbn(v_external_id);
          if v_canonical_isbn is null then
            raise exception 'invalid content research payload: BOOK externalId checksum';
          end if;
          -- New BOOK identities are canonical ISBN-13. Existing ISBN-10 rows are
          -- reused through the canonical expression index below.
          v_external_id := v_canonical_isbn;
        elsif v_content_type = 'VIDEO' and v_external_id !~ '^tmdb-(movie|tv)-[0-9]+$' then
          raise exception 'invalid content research payload: VIDEO externalId format';
        elsif v_content_type = 'GAME' and v_external_id !~ '^igdb-[0-9]+$' then
          raise exception 'invalid content research payload: GAME externalId format';
        elsif v_content_type = 'MUSIC' and v_external_id !~ '^itunes-[0-9]+$' then
          raise exception 'invalid content research payload: MUSIC externalId format';
        end if;

        if (v_external_source || ':' || v_external_id) = any(v_seen_content_identities) then
          raise exception 'invalid content research payload: duplicate content identity %:%',
            v_external_source, v_external_id;
        end if;
        v_seen_content_identities := array_append(
          v_seen_content_identities,
          v_external_source || ':' || v_external_id
        );

        if (
          select count(*) <> count(distinct locale ->> 'locale')
          from jsonb_array_elements(v_content -> 'locales') as locales(locale)
        ) then
          raise exception 'invalid content research payload: duplicate locale';
        end if;

        for v_locale in
          select locale
          from jsonb_array_elements(v_content -> 'locales') as locales(locale)
        loop
          if not private.content_research_has_exact_keys(
            v_locale,
            array[
              'locale', 'title', 'creator', 'thumbnailUrl', 'description',
              'isbn', 'publisher', 'verified', 'sources'
            ]::text[]
          )
             or jsonb_typeof(v_locale -> 'locale') <> 'string'
             or jsonb_typeof(v_locale -> 'title') <> 'string'
             or not private.content_research_is_nullable_text(v_locale, 'creator')
             or not private.content_research_is_nullable_text(v_locale, 'thumbnailUrl')
             or not private.content_research_is_nullable_text(v_locale, 'description')
             or not private.content_research_is_nullable_text(v_locale, 'isbn')
             or not private.content_research_is_nullable_text(v_locale, 'publisher')
             or v_locale ->> 'locale' not in ('ko', 'en')
             or nullif(btrim(v_locale ->> 'title'), '') is null
             or v_locale -> 'verified' <> 'true'::jsonb
             or jsonb_typeof(v_locale -> 'sources') <> 'object' then
            raise exception 'invalid content research payload: verified locale shape';
          end if;

          v_expected_locale_source := case
            when v_content_type = 'BOOK' and v_locale ->> 'locale' = 'ko' then 'kakao_book'
            when v_content_type = 'BOOK' and v_locale ->> 'locale' = 'en' then 'openlibrary'
            when v_content_type = 'VIDEO' then 'tmdb'
            when v_content_type = 'GAME' then 'igdb'
            when v_content_type = 'MUSIC' then 'itunes'
          end;
          if v_locale -> 'sources' ->> 'primary' is distinct from v_expected_locale_source then
            raise exception 'invalid content research payload: locale provider provenance';
          end if;
          if nullif(btrim(v_locale ->> 'isbn'), '') is not null
             and not private.content_research_is_valid_isbn(v_locale ->> 'isbn') then
            raise exception 'invalid content research payload: locale ISBN checksum';
          end if;
        end loop;

        if v_content_type = 'BOOK' and not exists (
          select 1
          from jsonb_array_elements(v_content -> 'locales') as locales(locale)
          where locale ->> 'locale' = case
              when v_external_source = 'kakao_book' then 'ko'
              else 'en'
            end
            and private.content_research_canonical_isbn(locale ->> 'isbn') = v_external_id
        ) then
          raise exception 'invalid content research payload: BOOK externalId and provider locale ISBN mismatch';
        end if;

        if v_external_source = 'openlibrary' then
          if jsonb_typeof(v_content -> 'metadata' -> 'languages') <> 'array' then
            raise exception 'invalid content research payload: OpenLibrary metadata languages array';
          end if;
          if not exists (
            select 1
            from jsonb_array_elements_text(v_content -> 'metadata' -> 'languages') as language(value)
            where language.value = 'eng'
          ) then
            raise exception 'invalid content research payload: OpenLibrary edition language must include eng';
          end if;
        end if;

        if v_content_type = 'MUSIC' then
          insert into public.celeb_music_candidates as stored_music (
            celeb_id, title, artist, source_url, evidence, status
          )
          values (
            p_celeb_id,
            btrim(v_candidate ->> 'title'),
            nullif(btrim(v_candidate ->> 'creator'), ''),
            v_primary_source ->> 'url',
            btrim(v_candidate ->> 'evidenceSummary'),
            'pending'
          )
          on conflict (
            celeb_id,
            lower(title),
            lower(coalesce(artist, ''))
          ) do update set
            source_url = case
              when btrim(stored_music.source_url) = '' then excluded.source_url
              else stored_music.source_url
            end,
            evidence = case
              when stored_music.evidence is null or btrim(stored_music.evidence) = ''
              then excluded.evidence
              else stored_music.evidence
            end,
            updated_at = now();
          v_music_upserted := v_music_upserted + 1;
          v_music_eligible := v_music_eligible + 1;
          insert into public.celeb_content_research_findings (
            run_id, content_type, decision, title, creator, content_id,
            evidence_summary, rejection_reason, external_source, external_id,
            content_metadata
          ) values (
            v_run_id,
            'MUSIC',
            'evidence_verified',
            btrim(v_candidate ->> 'title'),
            nullif(btrim(v_candidate ->> 'creator'), ''),
            null,
            btrim(v_candidate ->> 'evidenceSummary'),
            null,
            v_external_source,
            v_external_id,
            v_content -> 'metadata'
          )
          returning id into v_finding_id;
          v_music_findings_recorded := v_music_findings_recorded + 1;
        end if;

        if v_content_type <> 'MUSIC' then
        -- BOOK edition identity must be fixed before registration.
        if v_content_type = 'BOOK' and not exists (
          select 1
          from jsonb_array_elements(v_content -> 'locales') as locales(locale)
          where nullif(btrim(locale ->> 'isbn'), '') is not null
            and (
              (v_external_source = 'kakao_book' and locale ->> 'locale' = 'ko')
              or (v_external_source = 'openlibrary' and locale ->> 'locale' = 'en')
            )
        ) then
          raise exception 'invalid content research payload: BOOK ISBN/source locale is required';
        end if;

        v_content_id := null;
        v_existing_type := null;
        v_existing_source := null;

        if v_content_type = 'BOOK' then
          select content.id, content.type, content.external_source
          into v_content_id, v_existing_type, v_existing_source
          from public.contents as content
          where content.type = 'BOOK'
            and private.content_research_canonical_isbn(content.external_id) = v_external_id
          order by content.id
          limit 1
          for update of content;
        end if;

        if v_content_id is null then
          insert into public.contents as stored_content (
            type, subtype, metadata, release_date, external_source, external_id
          )
          values (
            v_content_type,
            nullif(btrim(v_content ->> 'subtype'), ''),
            v_content -> 'metadata',
            nullif(btrim(v_content ->> 'releaseDate'), ''),
            v_external_source,
            v_external_id
          )
          on conflict do nothing
          returning stored_content.id into v_content_id;

          if v_content_id is not null then
            v_contents_created := v_contents_created + 1;
          elsif v_content_type = 'BOOK' then
            select content.id, content.type, content.external_source
            into v_content_id, v_existing_type, v_existing_source
            from public.contents as content
            where content.type = 'BOOK'
              and private.content_research_canonical_isbn(content.external_id) = v_external_id
            order by content.id
            limit 1
            for update of content;
            if v_content_id is null then
              select content.id, content.type, content.external_source
              into v_content_id, v_existing_type, v_existing_source
              from public.contents as content
              where content.external_id = v_external_id
              for update of content;
            end if;
          else
            select content.id, content.type, content.external_source
            into v_content_id, v_existing_type, v_existing_source
            from public.contents as content
            where content.external_id = v_external_id
            for update of content;
          end if;
        end if;

        if v_existing_type is not null then
          if v_content_id is null or v_existing_type is distinct from v_content_type then
            raise exception 'content research external_id type conflict: %', v_external_id;
          end if;
          if v_content_type <> 'BOOK'
             and v_existing_source is not null
             and v_existing_source is distinct from v_external_source then
            raise exception 'content research external_id source conflict: %', v_external_id;
          end if;

          update public.contents as content
          set external_source = coalesce(content.external_source, v_external_source),
              subtype = coalesce(nullif(btrim(content.subtype), ''), nullif(btrim(v_content ->> 'subtype'), '')),
              release_date = coalesce(nullif(btrim(content.release_date), ''), nullif(btrim(v_content ->> 'releaseDate'), '')),
              metadata = private.content_research_json_fill_missing(
                content.metadata,
                v_content -> 'metadata'
              )
          where content.id = v_content_id;
        end if;

        if v_content_id is null then
          raise exception 'content research content identity conflict: %', v_external_id;
        end if;

        for v_locale in
          select locale
          from jsonb_array_elements(v_content -> 'locales') as locales(locale)
        loop
          insert into public.content_locales as stored_locale (
            content_id, locale, title, creator, thumbnail_url, description,
            isbn, publisher, verified, sources
          )
          values (
            v_content_id,
            v_locale ->> 'locale',
            btrim(v_locale ->> 'title'),
            nullif(btrim(v_locale ->> 'creator'), ''),
            nullif(btrim(v_locale ->> 'thumbnailUrl'), ''),
            nullif(btrim(v_locale ->> 'description'), ''),
            case
              when nullif(btrim(v_locale ->> 'isbn'), '') is null then null
              else private.content_research_canonical_isbn(v_locale ->> 'isbn')
            end,
            nullif(btrim(v_locale ->> 'publisher'), ''),
            (v_locale ->> 'verified')::boolean,
            v_locale -> 'sources'
          )
          on conflict (content_id, locale) do update set
            title = coalesce(nullif(btrim(stored_locale.title), ''), excluded.title),
            creator = coalesce(nullif(btrim(stored_locale.creator), ''), excluded.creator),
            thumbnail_url = coalesce(nullif(btrim(stored_locale.thumbnail_url), ''), excluded.thumbnail_url),
            description = coalesce(nullif(btrim(stored_locale.description), ''), excluded.description),
            isbn = coalesce(nullif(btrim(stored_locale.isbn), ''), excluded.isbn),
            publisher = coalesce(nullif(btrim(stored_locale.publisher), ''), excluded.publisher),
            verified = coalesce(stored_locale.verified, false) or coalesce(excluded.verified, false),
            sources = private.content_research_json_fill_missing(
              stored_locale.sources,
              excluded.sources
            ),
            updated_at = now();
        end loop;

        v_link_id := null;
        insert into public.celeb_contents as stored_link (
          celeb_id, content_id, status, review, review_en, source_url, visibility
        )
        values (
          p_celeb_id,
          v_content_id,
          'FINISHED',
          btrim(v_candidate ->> 'evidenceSummary'),
          null,
          v_primary_source ->> 'url',
          'public'
        )
        on conflict on constraint celeb_contents_celeb_id_content_id_key do nothing
        returning stored_link.id into v_link_id;

        if v_link_id is null then
          update public.celeb_contents as stored_link
          set review = coalesce(nullif(btrim(stored_link.review), ''), btrim(v_candidate ->> 'evidenceSummary')),
              source_url = coalesce(nullif(btrim(stored_link.source_url), ''), v_primary_source ->> 'url'),
              updated_at = now()
          where stored_link.celeb_id = p_celeb_id
            and stored_link.content_id = v_content_id;
        else
          v_links_created := v_links_created + 1;
        end if;

        insert into public.celeb_content_research_findings (
          run_id, content_type, decision, title, creator, content_id,
          evidence_summary, rejection_reason, external_source, external_id,
          content_metadata
        )
        values (
          v_run_id,
          v_content_type,
          'accepted',
          btrim(v_candidate ->> 'title'),
          nullif(btrim(v_candidate ->> 'creator'), ''),
          v_content_id,
          btrim(v_candidate ->> 'evidenceSummary'),
          null,
          v_external_source,
          v_external_id,
          v_content -> 'metadata'
        )
        returning id into v_finding_id;
        v_non_music_accepted := v_non_music_accepted + 1;
        end if;
      else
        insert into public.celeb_content_research_findings (
          run_id, content_type, decision, title, creator, content_id,
          evidence_summary, rejection_reason
        )
        values (
          v_run_id,
          v_content_type,
          'rejected',
          btrim(v_candidate ->> 'title'),
          nullif(btrim(v_candidate ->> 'creator'), ''),
          null,
          btrim(v_candidate ->> 'evidenceSummary'),
          btrim(v_candidate ->> 'rejectionReason')
        )
        returning id into v_finding_id;
      end if;

      for v_candidate_source in
        select source
        from jsonb_array_elements(v_candidate -> 'sources') as sources(source)
      loop
        perform private.insert_celeb_content_research_source(
          v_run_id, v_content_type, v_finding_id, v_candidate_source
        );
      end loop;
    end loop;

    update public.celeb_content_research_scopes as scope
    set status = 'completed',
        search_notes = nullif(btrim(v_scope ->> 'searchNotes'), ''),
        completed_at = now()
    where scope.run_id = v_run_id
      and scope.content_type = v_content_type;
    if not found then
      raise exception 'content research scope is missing: run_id=% type=%', v_run_id, v_content_type;
    end if;
  end loop;

  if v_non_music_accepted = 0 and v_music_eligible > 0 then
    if v_music_findings_recorded <> v_music_eligible
       or v_music_upserted <> v_music_eligible then
      raise exception 'content research MUSIC ledger/domain count mismatch';
    end if;

    -- The run is a complete audit record. We deliberately bypass the generic
    -- status decision only because pending music candidates are not yet
    -- celeb_contents and therefore must not produce confirmed_empty.
    update public.celeb_content_research_runs as run
    set status = 'completed'
    where run.id = v_run_id
      and run.status = 'in_progress';
    if not found then
      raise exception 'content research MUSIC-only run could not be completed';
    end if;

    update public.celebs as celeb
    set content_research_status = 'open'
    where celeb.id = p_celeb_id;
    v_final_status := 'open';
    select count(*) into v_actual_content_count
    from public.celeb_contents as link
    where link.celeb_id = p_celeb_id;
    v_result := jsonb_build_object(
      'status', 'music_deferred',
      'celebId', p_celeb_id,
      'runId', v_run_id,
      'actualContentCount', v_actual_content_count,
      'finalResearchStatus', v_final_status,
      'contentsCreated', v_contents_created,
      'linksCreated', v_links_created,
      'musicCandidatesUpserted', v_music_upserted,
      'musicFindingsRecorded', v_music_findings_recorded,
      'researchFingerprint', p_research_fingerprint
    );
  else
    select completed.final_research_status, completed.actual_content_count
    into v_final_status, v_actual_content_count
    from public.complete_celeb_content_research_run(v_run_id) as completed;

    v_result := jsonb_build_object(
      'status', 'completed',
      'celebId', p_celeb_id,
      'runId', v_run_id,
      'actualContentCount', v_actual_content_count,
      'finalResearchStatus', v_final_status,
      'contentsCreated', v_contents_created,
      'linksCreated', v_links_created,
      'musicCandidatesUpserted', v_music_upserted,
      'musicFindingsRecorded', v_music_findings_recorded,
      'researchFingerprint', p_research_fingerprint
    );
  end if;

  update public.celeb_task_queue as queue
  set status = 'completed',
      completed_at = now(),
      claimed_by = null,
      claimed_at = null,
      lease_expires_at = null,
      last_error = null,
      payload = queue.payload || jsonb_build_object(
        'claimToken', p_claim_token,
        'researchFingerprint', p_research_fingerprint,
        'researchPayload', p_research_payload,
        'result', v_result
      ),
      updated_at = now()
  where queue.task_type = 'content_research_v1'
    and queue.celeb_id = p_celeb_id;

  return v_result;
end;
$$;

create or replace function public.enqueue_celeb_content_research_jobs(
  p_celeb_ids uuid[],
  p_reason text default 'general'
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_reason text := btrim(coalesce(p_reason, ''));
  v_requested integer := 0;
  v_eligible integer := 0;
  v_changed integer := 0;
  v_active integer := 0;
begin
  if v_reason = '' then
    raise exception 'content research enqueue reason is required';
  end if;

  select count(*)::integer
  into v_requested
  from (
    select distinct requested_id
    from unnest(coalesce(p_celeb_ids, array[]::uuid[])) as requested(requested_id)
    where requested_id is not null
  ) as requested;

  with requested as (
    select distinct requested_id as celeb_id
    from unnest(coalesce(p_celeb_ids, array[]::uuid[])) as input(requested_id)
    where requested_id is not null
  ), eligible as (
    select celeb.id as celeb_id
    from requested
    join public.celebs as celeb on celeb.id = requested.celeb_id
    where celeb.content_research_status = 'open'
      and not exists (
        select 1
        from public.celeb_contents as link
        where link.celeb_id = celeb.id
      )
      and not exists (
        select 1
        from public.celeb_content_research_runs as run
        where run.celeb_id = celeb.id
          and run.status = 'in_progress'
      )
      and (
        v_reason = 'followup'
        or not exists (
          select 1
          from public.celeb_music_candidates as music
          where music.celeb_id = celeb.id
            and music.status in ('pending', 'registered')
        )
      )
  ), upserted as (
    insert into public.celeb_task_queue as queue (
      task_type, celeb_id, status, priority, payload, attempt_count,
      claimed_by, claimed_at, lease_expires_at, last_error, completed_at,
      created_at, updated_at
    )
    select
      'content_research_v1',
      eligible.celeb_id,
      'pending',
      case when v_reason = 'followup' then 100 else 0 end,
      jsonb_build_object(
        'schemaVersion', 1,
        'reason', v_reason,
        'generation', 1,
        'batchKey', 'content-research-direct-v1:g1',
        'runId', null,
        'claimToken', null,
        'profileSnapshot', null,
        'researchFingerprint', null,
        'result', null,
        'retryNotBefore', null
      ),
      0, null, null, null, null, null, now(), now()
    from eligible
    on conflict (task_type, celeb_id) do update
    set priority = greatest(
          public.celeb_task_queue.priority,
          excluded.priority
        ),
        payload = public.celeb_task_queue.payload
          || jsonb_build_object('reason', v_reason),
        status = case
          when public.celeb_task_queue.status = 'in_progress'
            and (
              public.celeb_task_queue.lease_expires_at is null
              or public.celeb_task_queue.lease_expires_at < now()
            )
          then 'pending'
          else public.celeb_task_queue.status
        end,
        claimed_by = case
          when public.celeb_task_queue.status = 'in_progress'
            and (
              public.celeb_task_queue.lease_expires_at is null
              or public.celeb_task_queue.lease_expires_at < now()
            )
          then null
          else public.celeb_task_queue.claimed_by
        end,
        claimed_at = case
          when public.celeb_task_queue.status = 'in_progress'
            and (
              public.celeb_task_queue.lease_expires_at is null
              or public.celeb_task_queue.lease_expires_at < now()
            )
          then null
          else public.celeb_task_queue.claimed_at
        end,
        lease_expires_at = case
          when public.celeb_task_queue.status = 'in_progress'
            and (
              public.celeb_task_queue.lease_expires_at is null
              or public.celeb_task_queue.lease_expires_at < now()
            )
          then null
          else public.celeb_task_queue.lease_expires_at
        end,
        updated_at = now()
    where public.celeb_task_queue.status = 'pending'
       or (
         public.celeb_task_queue.status = 'in_progress'
         and (
           public.celeb_task_queue.lease_expires_at is null
           or public.celeb_task_queue.lease_expires_at < now()
         )
       )
    returning queue.celeb_id
  )
  select
    (select count(*)::integer from eligible),
    (select count(*)::integer from upserted)
  into v_eligible, v_changed;

  select count(*)::integer
  into v_active
  from public.celeb_task_queue as queue
  where queue.task_type = 'content_research_v1'
    and queue.celeb_id = any(coalesce(p_celeb_ids, array[]::uuid[]))
    and queue.status = 'in_progress'
    and queue.lease_expires_at >= now();

  return jsonb_build_object(
    'taskType', 'content_research_v1',
    'requested', v_requested,
    'eligible', v_eligible,
    'insertedOrRequeued', v_changed,
    'activeLeasePreserved', v_active,
    'terminalPreserved', greatest(v_eligible - v_changed - v_active, 0),
    'rejected', greatest(v_requested - v_eligible, 0)
  );
end;
$$;

create or replace function public.claim_next_celeb_content_research(
  p_worker text,
  p_lease_minutes integer default 60
)
returns table(
  celeb_id uuid,
  slug text,
  nickname text,
  nickname_en text,
  profession text,
  nationality text,
  birth_date text,
  death_date text,
  wikidata_qid text,
  run_id uuid,
  priority integer,
  attempt_count integer,
  claim_token uuid,
  profile_snapshot jsonb,
  claimed_at timestamptz,
  lease_expires_at timestamptz
)
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_worker text := btrim(coalesce(p_worker, ''));
  v_lease_minutes integer := greatest(1, least(coalesce(p_lease_minutes, 60), 1440));
  v_queue public.celeb_task_queue%rowtype;
  v_celeb public.celebs%rowtype;
  v_run_id uuid;
  v_claim_token uuid := gen_random_uuid();
  v_snapshot jsonb;
  v_batch_key text;
  v_name_variants text[];
begin
  if v_worker = '' then
    raise exception 'content research claim worker is required';
  end if;

  -- A worker can disappear during its final allowed attempt. Fence and close
  -- one such expired claim before selecting new work so it cannot remain an
  -- in_progress zombie forever or be reclaimed past the retry ceiling.
  select queue.*
  into v_queue
  from public.celeb_task_queue as queue
  where queue.task_type = 'content_research_v1'
    and queue.status = 'in_progress'
    and queue.attempt_count >= 5
    and (
      queue.lease_expires_at is null
      or queue.lease_expires_at < now()
    )
  order by queue.updated_at, queue.celeb_id
  limit 1
  for update skip locked;

  if found then
    update public.celeb_content_research_runs as run
    set status = 'cancelled',
        summary = coalesce(run.summary, 'Lease expired after maximum research attempts')
    where run.id::text = v_queue.payload ->> 'runId'
      and run.celeb_id = v_queue.celeb_id
      and run.status = 'in_progress';

    update public.celebs as celeb
    set content_research_status = 'open'
    where celeb.id = v_queue.celeb_id
      and celeb.content_research_status = 'researching';

    update public.celeb_task_queue as queue
    set status = 'failed',
        claimed_by = null,
        claimed_at = null,
        lease_expires_at = null,
        completed_at = null,
        last_error = coalesce(queue.last_error, 'Lease expired after maximum research attempts'),
        payload = (
          case when jsonb_typeof(queue.payload) = 'object'
            then queue.payload - 'claimToken'
            else '{}'::jsonb
          end
        ) || jsonb_build_object(
          'schemaVersion', 1,
          'retryExhausted', true,
          'retryNotBefore', null,
          'lastFailureAt', now(),
          'lastFailureWorker', coalesce(queue.claimed_by, 'unknown')
        ),
        updated_at = now()
    where queue.task_type = 'content_research_v1'
      and queue.celeb_id = v_queue.celeb_id;
  end if;

  select queue.*
  into v_queue
  from public.celeb_task_queue as queue
  join public.celebs as celeb on celeb.id = queue.celeb_id
  where queue.task_type = 'content_research_v1'
    and queue.attempt_count < 5
    and jsonb_typeof(queue.payload) = 'object'
    and queue.payload -> 'schemaVersion' = '1'::jsonb
    and jsonb_typeof(queue.payload -> 'generation') = 'number'
    and queue.payload ->> 'generation' ~ '^[1-9][0-9]{0,8}$'
    and nullif(btrim(queue.payload ->> 'batchKey'), '') is not null
    and (
      queue.payload -> 'runId' is null
      or queue.payload -> 'runId' = 'null'::jsonb
      or (
        jsonb_typeof(queue.payload -> 'runId') = 'string'
        and queue.payload ->> 'runId' ~
          '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
      )
    )
    and case
      when queue.payload -> 'retryNotBefore' is null
        or queue.payload -> 'retryNotBefore' = 'null'::jsonb
      then true
      when jsonb_typeof(queue.payload -> 'retryNotBefore') = 'string'
        and queue.payload ->> 'retryNotBefore' ~
          '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$'
      then (queue.payload ->> 'retryNotBefore')::timestamptz <= now()
      else false
    end
    and (
      queue.status = 'pending'
      or (
        queue.status = 'in_progress'
        and (
          queue.lease_expires_at is null
          or queue.lease_expires_at < now()
        )
      )
    )
    and (
      (
        queue.payload ->> 'runId' is null
        and celeb.content_research_status = 'open'
        and not exists (
          select 1 from public.celeb_contents as link
          where link.celeb_id = celeb.id
        )
        and not exists (
          select 1
          from public.celeb_content_research_runs as active_run
          where active_run.celeb_id = celeb.id
            and active_run.status = 'in_progress'
        )
      )
      or exists (
        select 1
        from public.celeb_content_research_runs as resumable_run
        where resumable_run.id::text = queue.payload ->> 'runId'
          and resumable_run.celeb_id = queue.celeb_id
          and resumable_run.status = 'in_progress'
      )
    )
  order by queue.priority desc, queue.created_at, queue.celeb_id
  limit 1
  for update of queue skip locked;

  if not found then
    return;
  end if;

  select celeb.*
  into strict v_celeb
  from public.celebs as celeb
  where celeb.id = v_queue.celeb_id;

  v_snapshot := private.build_celeb_content_research_profile_snapshot(v_queue.celeb_id);
  v_run_id := case
    when v_queue.payload -> 'runId' is null
      or v_queue.payload -> 'runId' = 'null'::jsonb
    then null
    else (v_queue.payload ->> 'runId')::uuid
  end;
  v_batch_key := coalesce(
    nullif(v_queue.payload ->> 'batchKey', ''),
    format(
      'content-research-direct-v1:g%s',
      greatest(coalesce((v_queue.payload ->> 'generation')::integer, 1), 1)
    )
  );

  select array_agg(distinct variant order by variant)
  into v_name_variants
  from unnest(array[
    nullif(btrim(v_celeb.nickname), ''),
    nullif(btrim(v_celeb.nickname_en), ''),
    nullif(btrim(v_celeb.slug), '')
  ]::text[]) as names(variant)
  where variant is not null;

  if v_run_id is null then
    insert into public.celeb_content_research_runs (
      celeb_id, batch_key, researcher_id, researcher_label,
      name_variants, homonym_notes, summary
    )
    values (
      v_queue.celeb_id, v_batch_key, null, v_worker,
      v_name_variants, null, null
    )
    returning id into v_run_id;
  else
    update public.celeb_content_research_runs as run
    set researcher_label = v_worker
    where run.id = v_run_id
      and run.celeb_id = v_queue.celeb_id
      and run.status = 'in_progress';
    if not found then
      raise exception 'content research claim run is not resumable: celeb_id=%', v_queue.celeb_id;
    end if;
  end if;

  update public.celeb_task_queue as queue
  set status = 'in_progress',
      claimed_by = v_worker,
      claimed_at = now(),
      lease_expires_at = now() + make_interval(mins => v_lease_minutes),
      attempt_count = queue.attempt_count + 1,
      last_error = null,
      completed_at = null,
      payload = queue.payload || jsonb_build_object(
        'schemaVersion', 1,
        'runId', v_run_id,
        'batchKey', v_batch_key,
        'claimToken', v_claim_token,
        'profileSnapshot', v_snapshot,
        'researchFingerprint', null,
        'result', null,
        'retryNotBefore', null
      ),
      updated_at = now()
  where queue.task_type = 'content_research_v1'
    and queue.celeb_id = v_queue.celeb_id
  returning queue.priority, queue.attempt_count, queue.claimed_at,
            queue.lease_expires_at
  into v_queue.priority, v_queue.attempt_count, v_queue.claimed_at,
       v_queue.lease_expires_at;

  return query
  select
    v_celeb.id,
    v_celeb.slug,
    v_celeb.nickname,
    v_celeb.nickname_en,
    v_celeb.profession,
    v_celeb.nationality,
    v_celeb.birth_date,
    v_celeb.death_date,
    v_celeb.wikidata_qid,
    v_run_id,
    v_queue.priority,
    v_queue.attempt_count,
    v_claim_token,
    v_snapshot,
    v_queue.claimed_at,
    v_queue.lease_expires_at;
end;
$$;

alter function private.content_research_has_exact_keys(jsonb, text[]) owner to postgres;
alter function private.content_research_is_nullable_text(jsonb, text) owner to postgres;
alter function private.content_research_is_valid_source_url(text) owner to postgres;
alter function private.content_research_stable_json(jsonb) owner to postgres;
alter function private.content_research_sha256(jsonb) owner to postgres;
alter function private.assert_content_research_json_safe(jsonb, text) owner to postgres;
alter function private.content_research_normalize_isbn(text) owner to postgres;
alter function private.content_research_is_valid_isbn(text) owner to postgres;
alter function private.content_research_canonical_isbn(text) owner to postgres;
alter function private.content_research_json_fill_missing(jsonb, jsonb) owner to postgres;
alter function private.build_celeb_content_research_profile_snapshot(uuid) owner to postgres;
alter function private.assert_celeb_content_research_source(jsonb) owner to postgres;
alter function private.insert_celeb_content_research_source(uuid, text, uuid, jsonb) owner to postgres;
alter function public.enqueue_celeb_content_research_jobs(uuid[], text) owner to postgres;
alter function public.claim_next_celeb_content_research(text, integer) owner to postgres;
alter function public.renew_celeb_content_research_lease(uuid, text, uuid, integer) owner to postgres;
alter function public.reserve_external_provider_request(text, text, uuid, integer) owner to postgres;
alter function public.complete_celeb_content_research_direct(uuid, text, uuid, text, jsonb) owner to postgres;
alter function public.fail_celeb_content_research(uuid, text, uuid, text, boolean, boolean, jsonb) owner to postgres;
alter function public.requeue_celeb_content_research(uuid, text, boolean) owner to postgres;
alter function public.get_celeb_content_research_status() owner to postgres;

revoke all on function
  private.content_research_has_exact_keys(jsonb, text[]),
  private.content_research_is_nullable_text(jsonb, text),
  private.content_research_is_valid_source_url(text),
  private.content_research_stable_json(jsonb),
  private.content_research_sha256(jsonb),
  private.assert_content_research_json_safe(jsonb, text),
  private.content_research_normalize_isbn(text),
  private.content_research_is_valid_isbn(text),
  private.content_research_canonical_isbn(text),
  private.content_research_json_fill_missing(jsonb, jsonb),
  private.build_celeb_content_research_profile_snapshot(uuid),
  private.assert_celeb_content_research_source(jsonb),
  private.insert_celeb_content_research_source(uuid, text, uuid, jsonb),
  public.enqueue_celeb_content_research_jobs(uuid[], text),
  public.claim_next_celeb_content_research(text, integer),
  public.renew_celeb_content_research_lease(uuid, text, uuid, integer),
  public.reserve_external_provider_request(text, text, uuid, integer),
  public.complete_celeb_content_research_direct(uuid, text, uuid, text, jsonb),
  public.fail_celeb_content_research(uuid, text, uuid, text, boolean, boolean, jsonb),
  public.requeue_celeb_content_research(uuid, text, boolean),
  public.get_celeb_content_research_status()
from public, anon, authenticated, service_role;

grant usage on schema private to service_role;
grant execute on function
  private.content_research_has_exact_keys(jsonb, text[]),
  private.content_research_is_nullable_text(jsonb, text),
  private.content_research_is_valid_source_url(text),
  private.content_research_stable_json(jsonb),
  private.content_research_sha256(jsonb),
  private.assert_content_research_json_safe(jsonb, text),
  private.content_research_normalize_isbn(text),
  private.content_research_is_valid_isbn(text),
  private.content_research_canonical_isbn(text),
  private.content_research_json_fill_missing(jsonb, jsonb),
  private.build_celeb_content_research_profile_snapshot(uuid),
  private.assert_celeb_content_research_source(jsonb),
  private.insert_celeb_content_research_source(uuid, text, uuid, jsonb),
  public.enqueue_celeb_content_research_jobs(uuid[], text),
  public.claim_next_celeb_content_research(text, integer),
  public.renew_celeb_content_research_lease(uuid, text, uuid, integer),
  public.reserve_external_provider_request(text, text, uuid, integer),
  public.complete_celeb_content_research_direct(uuid, text, uuid, text, jsonb),
  public.fail_celeb_content_research(uuid, text, uuid, text, boolean, boolean, jsonb),
  public.requeue_celeb_content_research(uuid, text, boolean),
  public.get_celeb_content_research_status()
to service_role;

-- Migration-time catalog assertions only. No job or domain rows are written.
do $$
declare
  v_function text;
  v_relation text;
  v_provider_first jsonb;
  v_provider_replay jsonb;
begin
  if not exists (
    select 1
    from pg_roles as role_row
    where role_row.rolname = 'service_role'
      and role_row.rolbypassrls
  ) then
    raise exception 'service_role must exist with BYPASSRLS';
  end if;

  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception 'extensions.digest(bytea,text) is required for canonical fingerprints';
  end if;
  if private.content_research_stable_json(
       '{"z":1,"a":{"y":2,"x":3},"rows":[1,2],"text":"ko"}'::jsonb
     ) <> '{"a":{"x":3,"y":2},"rows":[1,2],"text":"ko","z":1}'
     or private.content_research_stable_json(
       '{"small":0.0000001,"edge":0.000001,"large":1e20,"scientific":1e21}'::jsonb
     ) <> '{"edge":0.000001,"large":100000000000000000000,"scientific":1e+21,"small":1e-7}'
     or private.content_research_sha256(
       '{"z":1,"a":{"y":2,"x":3},"rows":[1,2],"text":"ko"}'::jsonb
     ) <> '3ca597176c3e261838c842892d31774149dd014708004f41b3f36a2b92bb69e6'
  then
    raise exception 'content research canonical JSON/SHA-256 fixture mismatch';
  end if;

  perform private.assert_content_research_json_safe(
    '{"metadata":{"ASCII key-1":"한글 값은 허용"}}'::jsonb,
    '$.asciiKeyFixture'
  );
  begin
    perform private.assert_content_research_json_safe(
      '{"metadata":{"한글키":1}}'::jsonb,
      '$.unicodeKeyFixture'
    );
    raise exception 'content research Unicode object-key probe was accepted';
  exception when raise_exception then
    if position('object key must be 1..128 printable ASCII bytes' in sqlerrm) = 0 then
      raise;
    end if;
  end;

  if not private.content_research_is_valid_source_url(
       'https://openlibrary.org:443/books/OL1M?mode=full#edition'
     )
     or private.content_research_is_valid_source_url('http://openlibrary.org/books/OL1M')
     or private.content_research_is_valid_source_url('https://localhost/books/OL1M')
     or private.content_research_is_valid_source_url('https://127.0.0.1/books/OL1M')
     or private.content_research_is_valid_source_url('https://example.com:65536/path')
     or private.content_research_is_valid_source_url('https://example/path')
     or private.content_research_is_valid_source_url('https://user@example.com/path')
  then
    raise exception 'content research source URL validation fixture mismatch';
  end if;

  foreach v_function in array array[
    'private.content_research_has_exact_keys(jsonb,text[])',
    'private.content_research_is_nullable_text(jsonb,text)',
    'private.content_research_is_valid_source_url(text)',
    'private.content_research_stable_json(jsonb)',
    'private.content_research_sha256(jsonb)',
    'private.assert_content_research_json_safe(jsonb,text)',
    'private.content_research_normalize_isbn(text)',
    'private.content_research_is_valid_isbn(text)',
    'private.content_research_canonical_isbn(text)',
    'private.content_research_json_fill_missing(jsonb,jsonb)',
    'private.build_celeb_content_research_profile_snapshot(uuid)',
    'private.assert_celeb_content_research_source(jsonb)',
    'private.insert_celeb_content_research_source(uuid,text,uuid,jsonb)',
    'public.enqueue_celeb_content_research_jobs(uuid[],text)',
    'public.claim_next_celeb_content_research(text,integer)',
    'public.renew_celeb_content_research_lease(uuid,text,uuid,integer)',
    'public.reserve_external_provider_request(text,text,uuid,integer)',
    'public.complete_celeb_content_research_direct(uuid,text,uuid,text,jsonb)',
    'public.fail_celeb_content_research(uuid,text,uuid,text,boolean,boolean,jsonb)',
    'public.requeue_celeb_content_research(uuid,text,boolean)',
    'public.get_celeb_content_research_status()'
  ] loop
    if to_regprocedure(v_function) is null then
      raise exception 'required content research function missing: %', v_function;
    end if;
    if (
      select procedure.prosecdef
        or procedure.proowner <> 'postgres'::regrole
        or not (
          coalesce(procedure.proconfig, '{}'::text[])
            @> array['search_path=pg_catalog']::text[]
        )
      from pg_proc as procedure
      where procedure.oid = to_regprocedure(v_function)
    ) then
      raise exception 'content research function attributes invalid: %', v_function;
    end if;
    if has_function_privilege('anon', v_function, 'EXECUTE')
      or has_function_privilege('authenticated', v_function, 'EXECUTE')
      or not has_function_privilege('service_role', v_function, 'EXECUTE')
    then
      raise exception 'content research function is not service_role-only: %', v_function;
    end if;
  end loop;

  foreach v_relation in array array[
    'celebs', 'contents', 'content_locales', 'celeb_contents',
    'celeb_music_candidates', 'celeb_content_research_runs',
    'celeb_content_research_scopes', 'celeb_content_research_findings',
    'celeb_content_research_sources', 'celeb_task_queue'
  ] loop
    if not exists (
      select 1
      from pg_class as relation
      join pg_namespace as namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = v_relation
        and relation.relkind in ('r', 'p')
        and relation.relrowsecurity
    ) then
      raise exception 'content research relation RLS missing: public.%', v_relation;
    end if;
    if not has_table_privilege(
      'service_role', format('public.%I', v_relation), 'SELECT,INSERT,UPDATE'
    ) then
      raise exception 'service_role table privileges missing: public.%', v_relation;
    end if;
  end loop;

  foreach v_relation in array array[
    'external_provider_rate_limits',
    'external_provider_rate_limit_reservations'
  ] loop
    if not exists (
      select 1
      from pg_class as relation
      join pg_namespace as namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = v_relation
        and relation.relkind = 'r'
        and relation.relrowsecurity
        and relation.relforcerowsecurity
        and relation.relowner = 'postgres'::regrole
    ) then
      raise exception 'external provider rate relation attributes invalid: public.%', v_relation;
    end if;
    if has_table_privilege(
      'anon', format('public.%I', v_relation),
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
    ) or has_table_privilege(
      'authenticated', format('public.%I', v_relation),
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
    ) then
      raise exception 'external provider rate relation is not service_role-only: public.%', v_relation;
    end if;
  end loop;

  if not has_table_privilege(
       'service_role', 'public.external_provider_rate_limits',
       'SELECT,INSERT,UPDATE'
     )
     or has_table_privilege(
       'service_role', 'public.external_provider_rate_limits',
       'DELETE,TRUNCATE,REFERENCES,TRIGGER'
     )
     or not has_table_privilege(
       'service_role', 'public.external_provider_rate_limit_reservations',
       'SELECT,INSERT'
     )
     or has_table_privilege(
       'service_role', 'public.external_provider_rate_limit_reservations',
       'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
     )
  then
    raise exception 'external provider rate service_role table privilege mismatch';
  end if;

  if exists (
    select 1
    from unnest(array[
      'private.content_research_has_exact_keys(jsonb,text[])',
      'private.content_research_is_nullable_text(jsonb,text)',
      'private.content_research_is_valid_source_url(text)',
      'private.content_research_stable_json(jsonb)',
      'private.content_research_sha256(jsonb)',
      'private.assert_content_research_json_safe(jsonb,text)',
      'private.content_research_normalize_isbn(text)',
      'private.content_research_is_valid_isbn(text)',
      'private.content_research_canonical_isbn(text)',
      'private.content_research_json_fill_missing(jsonb,jsonb)'
    ]::text[]) as expected(signature)
    join pg_proc as procedure on procedure.oid = to_regprocedure(expected.signature)
    where procedure.provolatile <> 'i'
  ) then
    raise exception 'immutable content research helper volatility mismatch';
  end if;
  if (
    select procedure.provolatile <> 's'
    from pg_proc as procedure
    where procedure.oid =
      to_regprocedure('private.build_celeb_content_research_profile_snapshot(uuid)')
  ) or (
    select procedure.provolatile <> 's'
    from pg_proc as procedure
    where procedure.oid =
      to_regprocedure('public.get_celeb_content_research_status()')
  ) then
    raise exception 'stable content research function volatility mismatch';
  end if;
  if exists (
    select 1
    from unnest(array[
      'private.assert_celeb_content_research_source(jsonb)',
      'private.insert_celeb_content_research_source(uuid,text,uuid,jsonb)',
      'public.reserve_external_provider_request(text,text,uuid,integer)'
    ]::text[]) as expected(signature)
    join pg_proc as procedure on procedure.oid = to_regprocedure(expected.signature)
    where procedure.provolatile <> 'v'
  ) then
    raise exception 'volatile content research source helper attributes mismatch';
  end if;

  if not exists (
    select 1
    from pg_attribute as attribute
    left join pg_attrdef as default_row
      on default_row.adrelid = attribute.attrelid
     and default_row.adnum = attribute.attnum
    where attribute.attrelid = 'public.celeb_content_research_sources'::regclass
      and attribute.attname = 'supports_candidate'
      and attribute.atttypid = 'boolean'::regtype
      and attribute.attnotnull
      and pg_get_expr(default_row.adbin, default_row.adrelid) = 'false'
  ) then
    raise exception 'celeb_content_research_sources.supports_candidate attributes mismatch';
  end if;
  if (
    select count(*)
    from pg_attribute as attribute
    where attribute.attrelid = 'public.celeb_content_research_findings'::regclass
      and not attribute.attisdropped
      and (
        (attribute.attname in ('external_source', 'external_id')
          and attribute.atttypid = 'text'::regtype and not attribute.attnotnull)
        or (attribute.attname = 'content_metadata'
          and attribute.atttypid = 'jsonb'::regtype and not attribute.attnotnull)
      )
  ) <> 3 then
    raise exception 'celeb_content_research_findings evidence identity columns mismatch';
  end if;

  if not exists (
    select 1
    from pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.celeb_content_research_findings'::regclass
      and constraint_row.conname = 'celeb_content_research_findings_decision_check'
      and pg_get_constraintdef(constraint_row.oid) like '%evidence_verified%'
  ) then
    raise exception 'content research finding decision constraint mismatch';
  end if;

  if not exists (
    select 1
    from pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.celeb_content_research_sources'::regclass
      and constraint_row.conname = 'celeb_content_research_sources_run_type_url_finding_key'
      and pg_get_constraintdef(constraint_row.oid) =
        'UNIQUE NULLS NOT DISTINCT (run_id, content_type, url, finding_id)'
  ) then
    raise exception 'content research source identity constraint mismatch';
  end if;

  if not exists (
    select 1
    from pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.celeb_task_queue'::regclass
      and constraint_row.contype in ('p', 'u')
      and (
        select array_agg(attribute.attname order by key_column.ordinality)
        from unnest(constraint_row.conkey) with ordinality as key_column(attnum, ordinality)
        join pg_attribute as attribute
          on attribute.attrelid = constraint_row.conrelid
         and attribute.attnum = key_column.attnum
      ) = array['task_type', 'celeb_id']::name[]
  ) then
    raise exception 'celeb_task_queue must uniquely identify (task_type, celeb_id)';
  end if;

  if not exists (
    select 1
    from pg_index as index_row
    where index_row.indexrelid =
      'public.contents_book_canonical_isbn_key'::regclass
      and index_row.indisunique
      and index_row.indisvalid
  ) then
    raise exception 'BOOK canonical ISBN unique index missing or invalid';
  end if;
  if not exists (
    select 1
    from pg_index as index_row
    where index_row.indexrelid =
      'public.celeb_task_queue_content_research_claim_idx'::regclass
      and index_row.indisvalid
  ) then
    raise exception 'content research claim index missing or invalid';
  end if;

  if not exists (
    select 1
    from pg_constraint as constraint_row
    where constraint_row.conrelid = 'public.external_provider_rate_limits'::regclass
      and constraint_row.contype = 'p'
      and pg_get_constraintdef(constraint_row.oid) = 'PRIMARY KEY (provider)'
  ) or not exists (
    select 1
    from pg_constraint as constraint_row
    where constraint_row.conrelid =
      'public.external_provider_rate_limit_reservations'::regclass
      and constraint_row.contype = 'p'
      and pg_get_constraintdef(constraint_row.oid) =
        'PRIMARY KEY (provider, request_token)'
  ) or not exists (
    select 1
    from pg_constraint as constraint_row
    where constraint_row.conrelid =
      'public.external_provider_rate_limit_reservations'::regclass
      and constraint_row.contype = 'f'
      and constraint_row.conname =
        'external_provider_rate_limit_reservations_provider_fkey'
      and constraint_row.confrelid = 'public.external_provider_rate_limits'::regclass
      and constraint_row.confdeltype = 'r'
      and constraint_row.convalidated
  ) then
    raise exception 'external provider rate identity constraints mismatch';
  end if;

  if (
    select count(*)
    from pg_constraint as constraint_row
    where constraint_row.conrelid in (
      'public.external_provider_rate_limits'::regclass,
      'public.external_provider_rate_limit_reservations'::regclass
    )
      and constraint_row.conname in (
        'external_provider_rate_limits_provider_check',
        'external_provider_rate_limits_interval_check',
        'external_provider_rate_limits_worker_check',
        'external_provider_rate_limit_reservations_provider_check',
        'external_provider_rate_limit_reservations_worker_check',
        'external_provider_rate_limit_reservations_interval_check',
        'external_provider_rate_limit_reservations_window_check'
      )
      and constraint_row.contype = 'c'
      and constraint_row.convalidated
  ) <> 7 then
    raise exception 'external provider rate check constraints mismatch';
  end if;

  -- Exercise serialization and replay without leaving rows behind. The raised
  -- marker rolls this nested subtransaction back; any unexpected error escapes.
  begin
    v_provider_first := public.reserve_external_provider_request(
      'openlibrary',
      'migration-provider-probe',
      '00000000-0000-4000-8000-000000000001'::uuid,
      2000
    );
    v_provider_replay := public.reserve_external_provider_request(
      'openlibrary',
      'migration-provider-probe',
      '00000000-0000-4000-8000-000000000001'::uuid,
      2000
    );
    if not private.content_research_has_exact_keys(
         v_provider_first,
         array[
           'provider', 'worker', 'requestToken', 'availableAt',
           'nextAvailableAt', 'waitMs', 'minIntervalMs', 'replayed'
         ]::text[]
       )
       or v_provider_first -> 'replayed' <> 'false'::jsonb
       or v_provider_replay -> 'replayed' <> 'true'::jsonb
       or v_provider_first -> 'availableAt' is distinct from
         v_provider_replay -> 'availableAt'
       or v_provider_first -> 'nextAvailableAt' is distinct from
         v_provider_replay -> 'nextAvailableAt'
       or v_provider_first -> 'requestToken' is distinct from
         v_provider_replay -> 'requestToken'
       or v_provider_first -> 'minIntervalMs' <> '2000'::jsonb
       or jsonb_typeof(v_provider_first -> 'waitMs') <> 'number'
       or (v_provider_first ->> 'waitMs')::integer < 0
       or (v_provider_first ->> 'nextAvailableAt')::timestamptz
         - (v_provider_first ->> 'availableAt')::timestamptz <>
           interval '2 seconds'
       or (
         select count(*) <> 1
         from public.external_provider_rate_limit_reservations as reservation
         where reservation.provider = 'openlibrary'
           and reservation.request_token =
             '00000000-0000-4000-8000-000000000001'::uuid
       )
       or (
         select to_jsonb(rate_limit.available_at) is distinct from
           v_provider_first -> 'nextAvailableAt'
         from public.external_provider_rate_limits as rate_limit
         where rate_limit.provider = 'openlibrary'
       )
    then
      raise exception 'content research provider reservation fixture mismatch';
    end if;

    begin
      perform public.reserve_external_provider_request(
        'openlibrary',
        'different-worker',
        '00000000-0000-4000-8000-000000000001'::uuid,
        2000
      );
      raise exception 'content research provider token mismatch probe was accepted';
    exception when raise_exception then
      if position('reservation token parameter mismatch' in sqlerrm) = 0 then
        raise;
      end if;
    end;

    raise exception 'content research provider rollback probe';
  exception when raise_exception then
    if sqlerrm <> 'content research provider rollback probe' then
      raise;
    end if;
  end;
  if exists (select 1 from public.external_provider_rate_limits)
     or exists (select 1 from public.external_provider_rate_limit_reservations) then
    raise exception 'content research provider rollback probe leaked rows';
  end if;

  if exists (
    select 1
    from (values
      ('celeb_content_research_runs', 'trg_initialize_celeb_content_research_scopes'),
      ('celeb_content_research_runs', 'trg_guard_closed_celeb_content_research_run'),
      ('celeb_content_research_scopes', 'trg_guard_celeb_content_research_scope_mutation'),
      ('celeb_content_research_findings', 'trg_guard_celeb_content_research_finding_mutation'),
      ('celeb_content_research_sources', 'trg_guard_celeb_content_research_source_mutation'),
      ('celeb_content_research_runs', 'trg_guard_celeb_content_research_run_completion'),
      ('celebs', 'trg_celebs_guard_content_research_status')
    ) as expected(relation_name, trigger_name)
    where not exists (
      select 1
      from pg_trigger as trigger_row
      join pg_class as relation on relation.oid = trigger_row.tgrelid
      join pg_namespace as namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = expected.relation_name
        and trigger_row.tgname = expected.trigger_name
        and not trigger_row.tgisinternal
        and trigger_row.tgenabled <> 'D'
    )
  ) then
    raise exception 'required content research trigger missing or disabled';
  end if;

  if exists (
    select 1
    from public.celeb_task_queue as queue
    where queue.task_type = 'content_research_v1'
      and (
        jsonb_typeof(queue.payload) <> 'object'
        or queue.payload -> 'schemaVersion' <> '1'::jsonb
        or jsonb_typeof(queue.payload -> 'generation') <> 'number'
        or queue.payload ->> 'generation' !~ '^[1-9][0-9]{0,8}$'
        or nullif(btrim(queue.payload ->> 'batchKey'), '') is null
      )
  ) then
    raise exception 'existing content research queue payload violates schemaVersion 1 preconditions';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
