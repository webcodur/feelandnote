# Fiction 인물 연표 내장 에이전트 릴레이

fiction 인물의 연표를 대표 원전의 독립 전환점 기준으로 조사·교정하고 운영 DB까지 반영하는 실행 계약이다.
사건 데이터와 문장 품질은 [`celeb-timeline.md`](celeb-timeline.md), 전체 인물 분류와 대표 원전 연결은
[`celeb-pipeline.md`](celeb-pipeline.md)를 먼저 따른다.

## 범위와 도구

- 기본 일괄 대상은 `publication_status='active'`인 fiction 인물이다. 비활성 인물은 공개 준비처럼 사용자가
  확정한 명단만 `--slugs`와 `--allow-inactive`를 함께 지정해 처리한다. 삭제 상태 인물은 대상에 넣지 않는다.
- Kiro 본체와 내장 서브에이전트 두 대만 작업한다. Grok을 비롯한 외부 모델 API·CLI는 호출하지 않는다.
- 대표 원전별로 연결 인물을 묶어 원전을 한 번 이해한 뒤 각 인물의 실제 등장 범위를 따로 판정한다.
- 작업자 하나는 인물 하나의 후보 작성부터 dry, 반영, readback까지 끝내기 전 다음 인물을 받지 않는다.
- 같은 원전을 맡은 작업자끼리 원전 개요를 공유할 수 있지만, 다른 인물의 사건을 이름만 바꿔 복제하지 않는다.

## 준비

`sw/web-bo`에서 실행한다.

```bash
pnpm exec tsx scripts/celeb/timeline/prepare-fiction-candidates.ts --all-active
```

비활성 명단은 전체 선택 옵션을 쓰지 않고 명시한 slug만 준비한다.

```bash
pnpm exec tsx scripts/celeb/timeline/prepare-fiction-candidates.ts --root .tmp-fiction-timeline/<배치명> --slugs=<slug1,slug2> --allow-inactive
```

기본 산출물 루트는 `.tmp-fiction-timeline`이다.

- `source-index.json`: 대표 원전별 인물 묶음과 미연결 인물
- `<slug>/seed.json`: 인물·기존 사건·기존 사건 지문·대표 원전 스냅샷
- `<slug>/candidate.json`: 조사자가 작성할 최종 후보

기존 후보가 있으면 prepare는 덮어쓰지 않는다. 라이브 연표나 원전 스냅샷이 바뀌었으면 중단해 기존
후보를 검토하게 한다. 한글 JSON은 셸 치환으로 고치지 않고 UTF-8 JSON 파싱·쓰기로 다룬다.

## 조사와 후보 작성

후보의 런타임 SSoT는
`sw/web-bo/scripts/celeb/timeline/fiction-candidate-contract.ts`다. `seed.json`의 식별자·기존 사건·지문·
원전 스냅샷은 그대로 복사하고 다음 판단을 채운다.

**한 인물이 여러 원전에 나오면 그 원전들을 하나의 연표로 통합한다.** 오디세우스가 《일리아스》와
《오디세이아》에 다 나오면 트로이 전쟁과 귀향을 한 연표에 함께 담고, 그리스 신이 신통기·일리아스·
오디세이아·아폴로도로스에 걸쳐 나오면 그 등장을 모두 살린다. 「대표 원전」 하나를 골라 다른 원전의
등장을 잘라내는 것은 금지다. 연표는 그 인물의 탄생·기원부터 결말·파멸까지 연결된 원전 전체를 가로질러
끝까지 이어져야 한다. 사건은 `sequence_label`을 「원전명 · 국면」으로 묶어 원전별로 순서대로 배열한다.
같은 사건이 여러 원전에 나오면 `source_refs`에 그 원전들을 함께 단다.

1. `anchor_source_ids`에는 연결된 원전 가운데 실제 사건 근거로 삼은 것을 **모두** 넣는다. 한 인물이
   여러 원전에 나오면 그 원전을 하나로 좁히지 않는다. 근거가 된 원전이 셋이면 셋을 다 넣는다.
2. `source_selection_reason`에 각 연결 원전을 사건 근거로 어떻게 썼는지, 근거로 쓰지 않은 연결 작품이
   있다면 왜인지 적는다. 특정 원전을 「대표」로 골라 나머지를 버리는 것이 아니다.
3. 각 사건은 `origin_id`, `identity_judgment`, 국·영문 단계·제목·서술, 종류, 선택 장소·좌표,
   `source_refs`를 가진다.
4. 각 `source_refs`는 그 사건이 실제로 나오는 연결 원전의 `content_id`, 권·장·막·행 등 구체적 `locus`,
   해당 대목이 이 사건을 뒷받침한다는 `judgment`를 가진다. URL은 후보에 저장하지 않는다.
5. 없앨 기존 사건은 `deletions`에 ID와 이유를 명시한다. 조용히 누락하지 않는다. 삭제는 두 경우뿐이다.
   같은 장면을 쪼갠 중복을 하나로 합칠 때, 또는 연결된 어느 원전에도 없는 후대 창작일 때. **다른 연결
   원전의 사건이라는 이유로 삭제하지 않는다.**
6. `quality_notes`에는 시작부터 결말까지의 커버리지, 기존 ID 정체성 검토, 판본 처리, 의도적으로 뺀
   사건을 적는다.

원전에서 인물의 상태·관계·목표·행로·권한·결말이 독립적으로 달라질 때만 사건을 나눈다. 사건 수를
목표로 삼지 않는다. 짧은 등장과 장편 주인공의 분량이 다른 것은 정상이다. 같은 장면의 대사·이동·전투를
숫자를 채우려고 쪼개거나, 같은 사건의 여러 판본과 후대 각색을 겹쳐 넣지 않는다.

기존 ID는 같은 사건을 교정·확장할 때만 `origin_id`로 유지한다. 새 전환점은 `origin_id=null`이다.
없애기로 한 ID를 다른 사건에 재사용하지 않는다. 유지 ID와 삭제 ID는 기존 ID 전체를 정확히 한 번씩
나눠 가져야 한다.

원전 미연결 예외는 허용하지 않는다. 멤논과 펜테실레이아도 《일리아스》 본문 인물로 소급하지 말고,
《아이티오피스》 잔존 줄거리를 실제로 다루는 판본을 먼저 `adaptation`으로 연결한 뒤 그 콘텐츠 ID를
연표 근거로 사용한다.

## 검증·반영·중단 복구

후보 한 명을 먼저 dry한다.

```bash
pnpm exec tsx scripts/celeb/timeline/apply-fiction-candidates.ts --root .tmp-fiction-timeline --slugs=achilles --dry
```

통과한 같은 후보만 반영한다.

```bash
pnpm exec tsx scripts/celeb/timeline/apply-fiction-candidates.ts --root .tmp-fiction-timeline --slugs=achilles --apply
```

비활성 후보의 dry·apply·recover에는 준비 때와 같은 명시적 `--slugs`와 `--allow-inactive`를 붙인다.
후보에는 seed의 `publication_status`와 `profile_fingerprint`를 그대로 복사해야 한다. 반영기는 기존 사건·원전
스냅샷뿐 아니라 후보 작성 뒤 프로필이나 공개 상태가 바뀌지 않았는지도 재검증한다. `--allow-inactive`는
`--all-ready`·`--all-pending` 같은 전체 선택 옵션과 함께 쓸 수 없다.

반영기는 다음 순서를 지킨다.

1. 후보 계약과 현재 fiction·active 상태를 확인한다.
2. 기존 사건 지문과 대표 원전 스냅샷을 라이브 DB에서 다시 읽어 비교한다.
3. 원본 전체 백업과 새 사건 ID까지 포함한 불변 복구 일지를 먼저 저장한다.
4. 유지 행 수정, 새 행 추가, 명시적 삭제 순으로 쓴다.
5. 전체 payload와 ID를 다시 읽어 후보와 일치할 때만 후보를 `applied/`로 옮기고 receipt를 남긴다.
6. 실패하면 새 ID를 제거하고 원본 전체를 복구한 뒤 다시 읽는다.

프로세스가 강제 종료돼도 다음 실행은 복구 일지와 DB를 비교한다. 최종 상태가 완성돼 있으면 readback 후
마감하고, 부분 반영이면 원본으로 되돌린다. 복구만 따로 실행할 수 있다.

```bash
pnpm exec tsx scripts/celeb/timeline/apply-fiction-candidates.ts --root .tmp-fiction-timeline --all-pending --recover
```

`--slugs`는 PowerShell의 쉼표 해석을 피하도록 `--slugs=이름1,이름2` 형식을 쓴다. 전체 후보 일괄 dry는
`--all-ready --dry`로 할 수 있지만, 운영 반영은 작업자별 인물 완료 루프를 유지한다.

## 완료 판정

한 인물은 다음이 모두 확인돼야 완료다.

- 연결된 모든 원전을 가로질러 인물의 시작·주요 전환·결말이 이어진다. 여러 원전에 나오는 인물이면
  그 원전들의 등장이 한 연표에 통합돼 탄생부터 파멸까지 빠짐없이 담긴다.
- 국·영문 단계·제목·서술이 모두 있고 fiction 사건의 달력 연도는 비어 있다.
- 유지 ID, 새 ID, 삭제 ID가 receipt와 라이브 readback에 일치한다.
- 좌표는 두 값이 함께 있으며, 좌표가 있으면 국·영문 도시명이 있다.
- 문자열이 작성 payload와 같고 대체 문자 손상이 없다.
- 백업, applied 후보, receipt가 남아 중단 뒤에도 결과를 재구성할 수 있다.
