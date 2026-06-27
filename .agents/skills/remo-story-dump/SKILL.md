---
name: remo-story-dump
description: 에피소드 ko/en JSON에서 스토리 평문만 markdown으로 추출한다. JSON 구조 노이즈를 빼고 narrator·host·books·shorts 텍스트를 영상 흐름 순서대로 한 호흡에 읽도록 돕는다. 편집국 사이클(/remo-write-5-editorial-board), 사료 검증, 결말 매듭 평가의 입력으로 사용한다. /remo-story-dump <에피소드명> 으로 실행.
---

# 에피소드 스토리 추출

## 동기

JSON 필드 구조에서 본문을 직접 분석하면 다음 문제가 생긴다.

- `summary`/`contextMain`/`quotePairs[N].quote`/`after` 같은 키 노이즈에 시선이 분산
- 책 간 흐름이 트리 구조에 묻혀 한 호흡으로 안 읽힘
- 쇼츠가 별도 파일이라 영상 전체 흐름을 한 자리에서 못 봄

이 skill은 모든 텍스트 영역만 평문 markdown 으로 뽑아 검토자가 영상을 처음부터 끝까지 라디오처럼 읽게 한다.

## 실행

```bash
node sw/remotion/scripts/extract-story.mjs <person>
```

옵션:

- `<person>-en` 또는 `<person>-ko` 접미사로 로케일 선택 (기본: ko)
- `--no-shorts`: 쇼츠 영역 제외 (기본은 포함)

출력은 stdout markdown. 파일로 저장하거나 less 등으로 페이지 처리.

```bash
# 빈센트 반 고흐 ko 전체 (롱폼+쇼츠)
node sw/remotion/scripts/extract-story.mjs vincent-van-gogh

# 영문 롱폼만
node sw/remotion/scripts/extract-story.mjs vincent-van-gogh-en --no-shorts

# 파일로 저장 후 정독
node sw/remotion/scripts/extract-story.mjs vincent-van-gogh > /tmp/story.md
```

## 출력 구조

```
# {호스트 닉네임}
*{수식어}*

## 도입
  - 인사 / 안내
  **셀럽 소개**
  **대표 명언**
  - 브릿지

## 감상철학 (호스트 1인칭 독백)

---
## 책 N. {제목}
  **저자** / **출간** / **source**
  ### 책 소개 (summary)
  ### 감상 경위 (contextMain)
  ### 인용 N
    *출처*
    > quote 본문
    #### 후속 (after)

---
## 마무리 (outro)

═══════════════════════════════
# 쇼츠 N (ko-N.json)
  **연결 책**: book[N] — {제목}
  ## [i] {segId} ({role})
    text
```

## 사용 시나리오

1. **편집국 사이클 사전 통독** — `/remo-write-5-editorial-board` 실행 전 한 번 추출하여 영상 전체 흐름·도끼 후보·이탈 지점을 메모하고, 그 메모를 들고 4인 검토 진행
2. **사료 검증 통독** — `/remo-write-1-fact-check` 실행 전 인명·연도·일화를 평문으로 정독해 의심 지점 미리 표식
3. **결말 매듭 평가** — host.philosophy(도입) → 책 9~10권 흐름 → outro 마무리를 한 자리에서 읽어 매듭 강도 점검
4. **쇼츠↔롱폼 일치성 점검** — 쇼츠 segments 텍스트와 롱폼 책 본문이 동일 흐름인지 같은 출력 안에서 비교

## 사용하지 않는 경우

- 단순 텍스트 한 곳만 보고 싶을 때: `node -e` 또는 직접 JSON 읽기가 더 빠르다
- 변경 사항만 비교: git diff 가 더 적합

## 후속 트랙과의 연결

이 skill 자체는 **읽기 전용 추출만** 담당한다. 추출 결과로 흐름을 파악한 뒤에는:

- 위생·도끼 검토 + 4인 비판 사이클 → `remo-write-5-editorial-board`
- 사료 검증 → `remo-write-1-fact-check`
- 비약·과장 정리 → `remo-write-4-prose`
- 시간 흐름 → `remo-write-2-chronology`
- 서사 강도 → `remo-write-3-story-power`

각 후속 skill 의 SKILL.md 가이드대로 진행한다.
