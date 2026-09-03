# Fiction 인물 연표 릴레이

fiction 인물의 연표를 연결된 원전의 독립 전환점 기준으로 교정하고 운영 DB까지 반영하는 실행 계약이다. 공통 사건 규격은 [`celeb-06-01-timeline.md`](celeb-06-01-timeline.md), 원전·등장 작품 연결은 [`celeb-02-05-fiction-sources.md`](celeb-02-05-fiction-sources.md)가 쥔다.

## 경계

- 기본 대상은 `publication_status='active'`인 fiction 인물이다. 비활성 대상은 사용자가 확정한 slug와 `--allow-inactive`를 함께 지정한다.
- 연결 작품별로 인물을 묶어 원전을 이해하되 각 인물의 실제 등장 범위를 따로 판정한다.
- 한 인물의 후보 작성·dry-run·반영·readback을 끝내기 전에 같은 작업자에게 다음 인물을 배정하지 않는다.
- 다른 인물의 사건을 이름만 바꿔 복제하지 않는다.

## 준비

`sw/web-bo`에서 실행한다.

```bash
pnpm exec tsx scripts/celeb/timeline/prepare-fiction-candidates.ts --all-active
```

비활성 대상은 전체 선택 없이 slug를 고정한다.

```bash
pnpm exec tsx scripts/celeb/timeline/prepare-fiction-candidates.ts \
  --root .tmp-fiction-timeline/<배치명> --slugs=<slug1,slug2> --allow-inactive
```

산출물은 원전별 묶음 `source-index.json`, 인물별 현재값과 지문 `seed.json`, 최종 후보 `candidate.json`이다. 기존 후보가 있으면 준비 도구가 덮어쓰지 않는다. 라이브 연표·프로필·원전 스냅샷이 바뀌었으면 현재값과 후보를 비교한 뒤 다시 시작한다.

## 후보 작성

런타임 계약은 `sw/web-bo/scripts/celeb/timeline/fiction-candidate-contract.ts`다.

한 인물이 여러 연결 원전에 실제로 등장하면 그 사건을 하나의 연표로 통합한다. 원전 하나를 임의로 골라 다른 작품의 등장을 버리지 않는다. 사건의 `sequence_label`은 원전명과 국면을 구별할 수 있게 쓰고 원전별 서사 순서를 지킨다.

- `anchor_source_ids`에는 실제 사건 근거로 사용한 연결 작품을 모두 넣는다.
- `source_selection_reason`에는 각 연결 작품을 어떻게 사용했는지, 사용하지 않은 작품이 있다면 이유를 적는다.
- 각 사건은 기존 ID 또는 신규를 뜻하는 `origin_id`, 국·영문 단계·제목·서술, 종류, 선택 장소·좌표와 `source_refs`를 가진다.
- `source_refs`는 연결된 `content_id`, 권·장·막·행 같은 구체적 위치, 그 대목이 사건을 뒷받침하는 이유를 가진다. URL은 후보에 저장하지 않는다.
- 없앨 기존 사건은 `deletions`에 ID와 이유를 명시한다. 같은 장면의 중복을 합치거나 어느 연결 원전에도 없는 후대 창작일 때만 삭제한다.
- `quality_notes`에는 시작부터 결말까지의 커버리지, 기존 ID 판단, 판본 처리, 의도적으로 뺀 사건을 적는다.

같은 장면의 대사·이동·전투를 수를 채우려고 나누지 않고, 판본 차이와 후대 각색을 한 사건처럼 겹치지 않는다. 기존과 같은 사건을 교정·확장할 때만 `origin_id`를 유지하며 삭제할 ID를 다른 사건에 재사용하지 않는다.

원전이 연결되지 않은 인물은 예외로 진행하지 않는다. 먼저 실제 등장 근거가 있는 작품과 관계를 등록한 뒤 그 콘텐츠 ID를 사용한다.

## 검증·반영·복구

후보 한 명부터 dry-run한다.

```bash
pnpm exec tsx scripts/celeb/timeline/apply-fiction-candidates.ts \
  --root .tmp-fiction-timeline --slugs=achilles --dry

pnpm exec tsx scripts/celeb/timeline/apply-fiction-candidates.ts \
  --root .tmp-fiction-timeline --slugs=achilles --apply
```

비활성 후보에는 준비 때와 같은 slug와 `--allow-inactive`를 붙인다. 반영기는 후보 계약, 티어·공개 상태, 프로필 지문, 기존 사건 지문, 원전 스냅샷을 다시 확인하고 복구 일지를 쓴 뒤 유지 행 수정·신규 추가·명시적 삭제 순으로 적용한다. 전체 payload와 ID가 맞을 때만 후보를 `applied/`로 옮긴다.

중단 뒤 부분 반영이 남았으면 복구 일지와 DB를 대조한다. 최종 상태가 이미 완성됐으면 readback으로 마감하고, 그렇지 않으면 원본으로 되돌린다.

```bash
pnpm exec tsx scripts/celeb/timeline/apply-fiction-candidates.ts \
  --root .tmp-fiction-timeline --all-pending --recover
```

완료한 인물은 연결된 실제 등장 원전의 시작·전환·결말이 한 연표로 이어지고, 국·영문 필드와 fiction 시점 형식이 맞으며, 유지·신규·삭제 ID와 라이브 readback이 일치해야 한다. 좌표·문자열도 후보와 대조하고 인코딩 손상이 없어야 한다.
