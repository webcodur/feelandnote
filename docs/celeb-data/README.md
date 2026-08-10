# 인물 데이터 작업 자료

이 디렉터리는 DB 반영 전 검토가 필요한 인물별 원고만 보관한다. 서비스 값의 단일 원천은 DB다.

## 디렉터리

```text
docs/celeb-data/
├── README.md
└── dialogue/
    ├── 01-관태.md ... 11-카라바조.md
    └── _unregistered/{nickname}.json
```

### `dialogue/`

인물별 고유 대사의 등록 전 원고와 등록 완료 참고본이다. 작성·등록 규칙은
`docs/project/celeb/celeb-speech.md`를 따른다. 실제 서비스 값의 원천은
`celeb_dialogues` 테이블이다.

## 타임라인 자료는 DB에 둔다

타임라인은 이 디렉터리에 회차별 자료를 영구 보관하지 않는다. 다음 세 DB 원천이 전체 상태와
근거를 보존한다.

- `celeb_timeline_events`: 화면에 제공하는 사건 정본
- `celeb_timeline_research_runs`: 출처, 사건별 근거, 프로필 충돌, 차단 사유, 조사 payload를
  보존하는 append-only 감사 원장
- `celeb_task_queue`: `timeline_backfill_v1`의 claim, lease, retry, skip, complete 상태

2026-08-10 역사 실측으로 기존 회차는 `complete` 245명과 사건 1,571건이었고, 조사 결과
246건을 감사 원장으로 이관했다. Ahmed Sherif 1건은 신원 근거 부족으로
`blocked`·`quarantined`, 사건 0건을 유지했다. 이 수치는 현재 작업량이 아니다.

2026-08-10 이번 회차 종료 시점의 live 읽기 전용 실측은 인물 2,966명, 사건 보유 1,111명,
결손 1,855명, 사건 14,644건이다. 큐는 completed 15, pending 1,854다. 다중 출처와 사건별
근거는 로컬 회차 파일이 아니라 `celeb_timeline_research_runs`에 계속 보존한다.

기본 큐·교정·보안 계약과 함께 다음 migration까지 운영 DB 적용·검증을 마쳤다.

- `20260810020404_timeline_terminal_requeue_completion_lineage.sql`
- `20260810024854_timeline_undated_life_events.sql`
- `20260810123232_timeline_celeb_tier_position_guard.sql`
- `20260810034422_timeline_event_position_guard_serialization.sql`

이번 세션의 추가 claim과 조사는 종료했다. 남은 pending 1,854건은 이 문서만 근거로 자동
재개하지 않으며, 사용자가 승인한 별도 회차에서만 다시 시작한다.

다음 대상은 live DB에서 `celeb_timeline_events`가 0행인 `celebs` 전원이다. 공개 상태·등급·생년·
사망 여부로 제외하지 않는다. 조사는 독립 레인이 공용 큐에서 claim하고, complete 또는 blocked
payload를 표준입력으로 worker에 전달한다.

운영 규칙과 명령은 `docs/project/celeb-journey.md`, 현재 착수점은
`docs/todo/celeb/celeb-timeline-backfill-handoff-2026-08-08.md`만 참조한다.
