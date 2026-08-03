# 가상 독백 작업 데이터

`profiles.virtual_monologue`의 2026-07 전수 품질 정비 기록을 배치 단위 JSON으로 보존한다.

현행 규칙은 `docs/project/celeb/virtual-monologue.md` 하나만 따른다. 아래 내용은 보존된 옛 배치 파일과 도구의 형식 설명이다.

## 파일 규칙

- 구조 감사: `YYYY-MM-DD-structural-audit.json`
- 파일럿·작업 배치: `YYYY-MM-DD-<batch-id>.json`
- 파일명과 JSON의 `batchId`가 일치해야 한다.
- 바꾼 인물은 `currentText`와 `currentHash`를 함께 보존한다.
- 출처 URL만 두지 말고 각 URL이 지지하는 사실·주장을 `supports`에 적는다.
- 후보 상태가 `approved`가 아니면 게시할 수 없다.
- `approved`는 evidence·editorial 독립 검토가 모두 `pass`이고 blocking·major가 0일 때만 기록한다.
- 수정기가 후보를 한 글자라도 바꾸면 이전 검토·승인은 전부 무효화한다.
- 수정 전 후보와 두 검토는 `reviewHistory[]`에 보존해 판단 과정을 잃지 않는다.
- 게시된 배치는 `publishedAt`을 채운다. 공개 서버 렌더링 HTML과 승인 문단의 완전 일치는 `liveHtmlVerification`, CSS·스크롤·반응형 육안 검수는 `liveVerifiedAt`에 분리해 기록한다.

영문 작업은 한국어 배치가 확정된 뒤 별도 배치로 만든다.

## 배치 작업 명령

`sw/web-bo`에서 실행한다. 모든 생성·검토·수정·승인은 배치 파일만 바꾸며, 마지막 게시기만 DB를 갱신한다.

```bash
# 1. 빈 배치
pnpm exec tsx scripts/prepare-virtual-monologue-batch.ts --batch-id VM-P1 --slugs peter-thiel --out ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json

# 2. 조사·route 판정 뒤 후보 생성
pnpm exec tsx scripts/merge-virtual-monologue-dossier.ts --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json --dossier ../../docs/celeb-data/virtual-monologue/dossiers/peter-thiel.json
pnpm exec tsx scripts/generate-virtual-monologue-batch.ts --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json --slugs peter-thiel

# 3. 서로 다른 렌즈의 독립 검토
pnpm exec tsx scripts/review-virtual-monologue-batch.ts --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json --lens evidence --slugs peter-thiel
pnpm exec tsx scripts/review-virtual-monologue-batch.ts --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json --lens editorial --slugs peter-thiel

# 4. 결함이 있으면 수정하고 3번을 처음부터 다시 실행
pnpm exec tsx scripts/revise-virtual-monologue-batch.ts --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json --slugs peter-thiel

# 모델 재수정 대신 사람이 직접 편집한 경우
pnpm exec tsx scripts/set-virtual-monologue-candidate.ts --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json --slug elon-musk --text ../../docs/celeb-data/virtual-monologue/drafts/elon-musk.txt --note "독립 검토를 반영한 직접 편집"

# 5. 두 검토 통과 뒤 명시적 승인. 기본 dry-run이며 --apply가 배치에 승인 기록
pnpm exec tsx scripts/approve-virtual-monologue-batch.ts --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json --slugs peter-thiel --by codex-main --note "근거·문장 재독 완료" --apply

# 6. 게시도 기본 dry-run. --apply가 있어야 조건부 DB 반영
pnpm exec tsx scripts/apply-virtual-monologue-batch.ts --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json

# 7. 게시 뒤 공개 한국어 탭의 서버 렌더링 문단 완전 일치 확인. 기본 dry-run
pnpm exec tsx scripts/verify-virtual-monologue-live-html.ts --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json --slugs peter-thiel
pnpm exec tsx scripts/verify-virtual-monologue-live-html.ts --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json --slugs peter-thiel --apply
```

게시기는 배치 작성 당시 `currentText`와 DB 원문이 정확히 같을 때만 원자적으로 저장한다. 원문 drift, 검토 누락, 승인 누락, 후보 해시 불일치는 모두 실패한다.
