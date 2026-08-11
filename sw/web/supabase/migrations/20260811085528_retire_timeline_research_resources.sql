begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- 타임라인에는 사용자 화면이 읽는 최종 사건만 영속한다.
-- 조사 실행·클레임·리스·실패·교정 계보는 세션의 오케스트레이터가 맡고 DB에 남기지 않는다.

-- 조사 파이프라인 공개 진입점부터 제거한다.
drop function if exists public.enqueue_missing_celeb_timeline_backfill_jobs();
drop function if exists public.claim_next_celeb_timeline_backfill(text, integer);
drop function if exists public.renew_celeb_timeline_backfill_lease(uuid, text, uuid, integer);
drop function if exists public.complete_celeb_timeline_backfill(uuid, text, uuid, jsonb, text, jsonb);
drop function if exists public.fail_celeb_timeline_backfill(uuid, text, uuid, text, boolean, jsonb, text, jsonb);
drop function if exists public.requeue_celeb_timeline_backfill(uuid, text, boolean);
drop function if exists public.correct_celeb_timeline_backfill(uuid, uuid, text, jsonb, text, jsonb, text);
drop function if exists public.get_celeb_timeline_backfill_status();
drop function if exists public.get_celeb_timeline_backfill_security_contract();
drop function if exists public.set_fiction_narrative_events(uuid, jsonb);

-- 공용 큐와 조사 이력에 붙은 타임라인 전용 트리거만 제거한다.
drop trigger if exists timeline_backfill_preserve_requeue_predecessor
  on public.celeb_task_queue;
drop trigger if exists timeline_backfill_link_requeued_completion
  on public.celeb_timeline_research_runs;

-- 트리거와 RPC가 사라진 뒤 조사 전용 내부 함수를 제거한다.
drop function if exists private.timeline_backfill_link_requeued_completion();
drop function if exists private.timeline_backfill_preserve_requeue_predecessor();
drop function if exists private.timeline_backfill_validate_complete_payload(uuid, jsonb, jsonb);
drop function if exists private.timeline_backfill_validate_blocking_issues(jsonb, jsonb);
drop function if exists private.timeline_backfill_validate_profile_conflicts(jsonb, jsonb, jsonb);
drop function if exists private.timeline_backfill_validate_evidence_refs(jsonb, jsonb, text);
drop function if exists private.timeline_backfill_validate_sources(jsonb);
drop function if exists private.timeline_backfill_expected_events(uuid, jsonb);
drop function if exists private.timeline_backfill_live_events(uuid, uuid[]);
drop function if exists private.timeline_backfill_profile_snapshot(uuid);
drop function if exists private.timeline_backfill_exact_profile_date(text);

-- celeb_task_queue는 다른 셀럽 작업도 쓰므로 테이블은 보존하고 타임라인 행만 폐기한다.
delete from public.celeb_task_queue
where task_type = 'timeline_backfill_v1';

-- 조사 원문·출처 묶음·검증 이력·교정 계보는 데이터와 함께 폐기한다.
drop table if exists public.celeb_timeline_research_runs;

do $$
begin
  if to_regclass('public.celeb_timeline_events') is null then
    raise exception '최종 타임라인 사건 테이블이 누락되었습니다.';
  end if;

  if to_regclass('public.celeb_timeline_research_runs') is not null then
    raise exception '폐기 대상 타임라인 조사 이력 테이블이 남아 있습니다.';
  end if;

  if exists (
    select 1
    from public.celeb_task_queue
    where task_type = 'timeline_backfill_v1'
  ) then
    raise exception '폐기 대상 타임라인 작업 큐 행이 남아 있습니다.';
  end if;

  if to_regprocedure('private.timeline_event_position_guard()') is null
     or to_regprocedure('private.timeline_celeb_tier_position_guard()') is null
     or to_regprocedure('public.touch_celeb_timeline_events()') is null
  then
    raise exception '최종 사건 데이터의 무결성 함수가 누락되었습니다.';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
