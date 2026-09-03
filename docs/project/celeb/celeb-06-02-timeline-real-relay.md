# 실존 인물 연표 릴레이

실존 인물의 현재 연표를 부분 수리하고 운영 DB readback까지 끝내는 실행 계약이다. 사건 선정·문장·장소 규칙은 [`celeb-06-01-timeline.md`](celeb-06-01-timeline.md)가 쥐며 fiction에는 이 문서를 쓰지 않는다.

## 경계

- 기존 DB 사건 또는 같은 DB 지문의 최신 미반영 후보에서 시작한다.
- 문제가 있는 사건만 교정하고, 생애 공백은 정상 사건을 보존한 채 추가한다.
- 사건이 한 건도 없는 인물만 처음부터 전체 후보를 만든다.
- 기존 사건은 ID를 유지해 갱신하고 신규 사건만 추가한다. 전량 삭제 후 재삽입하지 않는다.
- 진행률·클레임·교정 이력은 DB에 저장하지 않는다.

서브에이전트를 쓰면 후보 JSON만 작성하게 하고 DB 반영과 최종 readback은 본체가 수행한다. 사용자가 요청하지 않은 외부 모델 API나 CLI를 호출하지 않는다.

## 후보 계약

작업 루트는 `sw/web-bo/.tmp-celeb-timeline-agent/`다.

```text
.tmp-celeb-timeline-agent/
├─ <slug>/candidate.json
├─ applied/<slug>.json
└─ backups/<slug>-<before-fingerprint>.json
```

후보는 `slug`, `celeb_id`, 원본 `before_events`, 최종 `events`, 사건별 `event_origins`, `evidence`, `quality_notes`를 가진다. 기존 모든 행 ID는 `event_origins`에 정확히 한 번 나타나야 하고 신규 사건만 `null`을 쓴다. 기계 계약은 `sw/web-bo/scripts/celeb/timeline/apply-native-candidates.ts`가 SSoT다.

한글 JSON은 문자열 치환으로 고치지 않고 JSON으로 파싱해 쓴다.

## 실행

### 1. 현재값 준비

```bash
pnpm exec tsx scripts/celeb/timeline/prepare-native-candidates.ts \
  --root .tmp-celeb-timeline-agent --slugs <slug-a>,<slug-b>
```

라이브 DB 지문과 같은 미반영 후보가 있으면 이어 쓰고, 지문이 달라졌으면 현재 DB에서 다시 시작한다.

### 2. 부분 수리와 정성 검수

지적된 사건의 사실·국영문·장소·좌표만 고친다. 사건 자체가 틀렸을 때만 같은 origin ID를 검증된 사건으로 교체하고, 후기 활동이나 생애 양끝의 공백에만 새 사건을 추가한다.

후보 전체를 위에서 아래로 읽어 다음을 확인한다.

- 정상 사건과 기존 ID가 보존됐는가.
- 지적된 사실·한영 충돌이 해결됐는가.
- 추가 사건이 생애 공백을 메우며 중복되지 않는가.
- 불확실한 연도·장소·좌표를 확정하지 않았는가.
- 제목과 서술이 한 사람의 생애로 이어지는가.

문제가 있으면 해당 사건이나 추가분만 다시 고친다.

### 3. dry-run, 반영, readback

```bash
pnpm exec tsx scripts/celeb/timeline/apply-native-candidates.ts \
  --root .tmp-celeb-timeline-agent --slugs <slug-a>,<slug-b> --dry

pnpm exec tsx scripts/celeb/timeline/apply-native-candidates.ts \
  --root .tmp-celeb-timeline-agent --slugs <slug-a>,<slug-b> --apply
```

반영기는 후보 구조·근거·현재 DB 지문·origin ID를 확인한다. 기존 행은 ID를 보존하고 신규만 추가한 뒤 최종 payload와 ID 집합을 다시 읽는다. 실패하면 이번 신규 행을 제거하고 백업 원본을 복구한다.

한 인물은 라이브 DB의 payload·ID·문자열이 후보와 일치해야 끝난다. 이어지는 배치가 없으면 임시 후보·백업과 일회성 보조 파일을 지우고, 미완료 대상만 TODO에 남긴다.
