# 실존 인물 연표 에이전트 릴레이

실존 인물 연표의 현재 후보를 부분 수리하고 운영 DB readback까지 끝내는 실행 규격이다.
사건 필드·표시·문장·장소 규칙은 [`celeb-timeline.md`](celeb-timeline.md)가 쥔다.
허구 인물 연표는 이 문서의 대상이 아니다.

## 실행 경계

- Kiro 배치에서는 Kiro 본체와 내장 `general-task-execution` 서브에이전트를 사용한다. Kiro를 쓸 수 없으면
  현재 작업 에이전트가 같은 후보·검증 계약으로 직접 수행한다.
- 사용자가 요청하지 않은 외부 모델 API·CLI와 그 래퍼를 호출하지 않는다.
- 서브에이전트를 쓰는 경우 후보 JSON만 만든다. 운영 DB 쓰기와 최종 readback은 본체만 수행한다.
- 로컬 Node·TypeScript 검증기와 프로젝트 DB read/write는 모델 호출이 아닌 결정론적 실행으로 사용한다.
- 사람 승인 단계를 만들지 않는다. 구조·사실·문장 검수와 dry 검증을 통과하면 본체가 바로 반영한다.

## 완료 원칙

한 인물의 현재 후보를 끝까지 고쳐 라이브 `celeb_timeline_events`에 반영하고, payload와 행 ID를
다시 읽어 후보와 일치시킨 뒤에만 다음 인물을 맡는다. 후보 작성, 문제 발견, dry 성공은 완료가 아니다.

- 기존 DB 사건 또는 DB 지문이 같은 최신 미반영 산출물이 출발점이다.
- 문제가 있는 사건은 해당 index만 수정한다. 핵심이 틀렸으면 같은 origin ID를 검증된 사건으로 교체한다.
- 생애 공백은 기존 사건을 보존한 채 필요한 사건만 추가한다.
- 사건이 한 건도 없는 인물만 최초 전체 후보를 만든다.
- 기존 DB 행은 ID를 유지해 UPDATE하고 새 사건만 INSERT한다. 전량 DELETE+INSERT는 금지한다.
- 어려운 인물을 보류·재생성·별도 종료 목록으로 넘기지 않는다. 현재 인물을 완성하기 전에는 그 레인에
  다음 대상을 배정하지 않는다.

진행률·클레임·교정 이력은 DB에 저장하지 않는다. DB에는 최종 사건 데이터만 남긴다.

## 역할

| 역할 | 책임 | DB 쓰기 |
|---|---|---|
| 본체 에이전트 | 대상 배정, live seed·지문 확인, 후보 정성 검수, dry·apply·readback·복구 | 있음 |
| 후보 작성 서브에이전트 | 배정된 한 인물의 기존 감사·현재 후보를 종합해 부분 수리 후보 생성 | 없음 |

각 레인은 자기 인물을 DB readback까지 끝낸 뒤에만 다음 대상을 받는다. 서브에이전트 발주에는 이 문서와
`celeb-timeline.md`를 반드시 함께 준다.

## 후보 산출물

현행 작업 루트는 `sw/web-bo/.tmp-celeb-timeline-agent/`다.

```text
.tmp-celeb-timeline-agent/
├── <slug>/candidate.json
├── applied/<slug>.json
└── backups/<slug>-<before-fingerprint>.json
```

`candidate.json`은 다음 계약을 만족해야 한다.

- `slug`, `celeb_id`
- 라이브 DB에서 읽은 원본 `before_events`
- 최종 `events`
- 최종 사건마다 기존 행 ID 또는 신규를 뜻하는 `null`을 담은 `event_origins`
- 모든 사건을 설명하는 `evidence`
- seed·보존·불확실성을 설명하는 `quality_notes`

모든 원본 행 ID는 `event_origins`에 정확히 한 번 있어야 한다. 신규 사건만 `null`을 쓴다. 사건·근거·ID
완전성의 기계 기준은 `sw/web-bo/scripts/celeb/timeline/apply-native-candidates.ts`가 SSoT다.

한글 JSON을 직접 문자열 치환하지 않는다. Node나 TypeScript로 읽고 파싱해 객체를 수정한 뒤
`JSON.stringify`로 저장한다.

## 한 인물의 실행 순서

### 1. 현재 후보를 잡는다

1. 라이브 DB 사건과 fingerprint를 읽는다.
2. 같은 fingerprint의 미반영 후보가 있으면 최신 후보를 이어 쓴다.
3. 없으면 라이브 DB 사건을 seed로 쓴다.
4. 라이브 DB에 사건이 없을 때만 최초 전체 후보를 만든다.

과거 감사와 working 산출물은 사실 판단 재료이지 완료 기록이 아니다. 라이브 DB 지문이 달라졌으면
과거 후보를 억지로 적용하지 않고 현재 DB에서 다시 시작한다. 라이브 seed는 다음 읽기 전용 명령으로
만든다.

```bash
pnpm exec tsx scripts/celeb/timeline/prepare-native-candidates.ts \
  --root .tmp-celeb-timeline-agent --slugs <slug-a>,<slug-b>,<slug-c>
```

### 2. 부분 수리한다

모든 기존 사건을 먼저 보존한다. 감사에서 지목된 index의 연도·종류·국영문·장소·좌표만 고치고,
사건 자체가 틀린 경우에만 같은 origin ID에서 다른 검증된 핵심 사건으로 교체한다. 후기 활동이나
생애 양끝이 비었을 때만 신규 사건을 추가한다.

장소명과 좌표는 모두 선택값이다. 사건 도시를 확인하지 못하면 장소명과 좌표를 모두 `null`로 두고,
도시만 확인했으면 장소명만 저장한다. 온라인 공개·음반 발매·계약·출간에 회사 소재지를 대신 붙이지 않는다.

### 3. 본체가 후보 전체를 읽는다

본체는 사건을 위에서 아래로 읽어 다음을 판단한다.

- 기존 정상 사건과 모든 origin ID가 보존됐는가
- 지목된 사실·국영문 충돌이 실제로 해결됐는가
- 추가 사건이 생애 공백을 메우며 중복되지 않는가
- 불확실한 연도·장소·좌표를 억지로 확정하지 않았는가
- 제목과 서술을 이어 읽었을 때 한 사람의 생애가 자연스럽게 이어지는가

문제가 있으면 해당 index나 addition만 같은 레인에 돌려보낸다. 후보 전체를 버리고 다시 만들지 않는다.

### 4. 결정론적으로 반영한다

`sw/web-bo`에서 같은 후보 묶음에 dry와 apply를 순서대로 실행한다.

```bash
pnpm exec tsx scripts/celeb/timeline/apply-native-candidates.ts \
  --root .tmp-celeb-timeline-agent --slugs <slug-a>,<slug-b>,<slug-c> --dry

pnpm exec tsx scripts/celeb/timeline/apply-native-candidates.ts \
  --root .tmp-celeb-timeline-agent --slugs <slug-a>,<slug-b>,<slug-c> --apply
```

반영기는 후보 구조·근거·현재 DB fingerprint·origin ID를 먼저 검사한다. 기존 행은 ID를 보존해 upsert하고
신규만 insert한 뒤, 최종 payload와 ID 집합을 다시 읽어 비교한다. 실패하면 이번 신규 행을 제거하고
백업한 기존 행을 복구한다. 성공한 후보는 `applied/`, 반영 전 원본은 `backups/`에 남긴다.

## 완료 후

- DB 결과를 `기존 수 → 최종 수`, 보존 ID 수, 신규 수로 확인한다.
- 배치를 이어갈 때만 `applied/`와 `backups/`를 중간 복구 자료로 둔다.
- 배치가 끝나고 모든 대상의 readback이 통과하면 작업 루트와 일회성 생성·감사·readback 스크립트를 삭제한다.
- 완료표나 완료 보고서를 남기지 않는다. 미완료 대상이 있을 때만 다음 작업을 TODO에 남긴다.
