---
name: remo-image-anchor-sync
description: ko 에피소드의 이미지 배치(file + field + text 앵커)를 en 에피소드에 동기화. LLM이 ko 앵커의 의미를 파악하여 en 번역문에서 대응 위치를 찾아 앵커를 자동 생성한다. /image-anchor-sync <에피소드명> 으로 실행.
---

# 이미지 앵커 동기화 (ko → en)

ko 에피소드에서 사람이 설정한 이미지 배치를 en 에피소드에 자동 반영한다.

## 전제 조건

- ko 에피소드에 이미지 + 앵커가 설정되어 있어야 한다
- en 에피소드가 존재해야 한다 (번역 완료 상태)
- 실행 전 ko 에피소드의 이미지 배치가 최종 확정된 상태여야 한다

## 실행

```
/image-anchor-sync <에피소드명>
```

예: `/image-anchor-sync alexander-the-great`

## 워크플로우

### 1. 데이터 로드

```
ko = public/episodes/{status}/{name}/ko.json
en = public/episodes/{status}/{name}/en.json
```

에피소드 위치는 done → live → todo 순서로 탐색한다.

### 2. 롱폼 이미지 동기화

각 book에 대해:

1. ko `book.images[]`를 순회
2. 첫 이미지(index 0): `file` + `field` 복사, `text` 없음 (시작 이미지이므로 앵커 불필요)
3. 이후 이미지: `file` + `field` 복사 + **en 앵커 생성**

#### en 앵커 생성 (LLM 판단)

ko 앵커와 en 텍스트를 제시하고, 의미적으로 대응하는 en 텍스트 구간의 시작 부분(3~5 단어)을 앵커로 선정한다.

프롬프트 구조:
```
ko 필드({field}) 본문:
"{ko 본문}"

ko 앵커: "{ko 앵커 텍스트}"
→ 이 앵커는 "{ko 앵커가 포함된 문장}" 에서 시작되는 이미지 전환점이다.

en 필드({field}) 본문:
"{en 본문}"

위 ko 앵커와 의미적으로 동일한 지점에서 시작하는 en 텍스트의 처음 3~5단어를 답하라.
규칙:
- en 본문에 실제 존재하는 연속 텍스트여야 한다
- 해당 위치부터 이미지가 바뀌므로, 새로운 장면/맥락이 시작되는 정확한 지점이어야 한다
- 앵커 텍스트만 출력하라 (따옴표, 설명 없이)
```

### 3. 쇼츠 이미지 동기화

각 segment에 대해:

1. `seg.image`: ko와 동일한 파일 경로 복사
2. `seg.imageChangeAt[]`: 각 항목의 `image` 복사 + `text` → en 앵커 생성 (위와 동일한 LLM 프롬프트)
3. `t` 값: 0으로 초기화 (analyze-voice 실행 시 text 앵커 기반으로 자동 산출)

### 4. 저장

en.json에 결과를 저장한다.

### 5. 검증 출력

동기화 결과를 테이블로 출력:

```
=== 롱폼 ===
Book 1: 일리아스 → The Iliad
  #1 trojan-war.jpg [summary] (시작)
  #2 warrior.png [summary] ko:"최고의" → en:"The greatest"
  #3 reading.png [context] ko:"알렉산더에게" → en:"For Alexander, the"
  ...

=== 쇼츠 ===
#4 book-context
  image: sleeping.png (복사)
  changeAt[0]: shorts-3.png ko:"트로이에서는" → en:"At Troy, he"
  changeAt[1]: shorts-4.png ko:"페르시아 정복" → en:"After conquering Persia"

총 N장 동기화 완료
```

## 주의사항

- en 앵커는 반드시 en 본문에 **정확히 포함**되는 문자열이어야 한다. `includes()` 매칭이 되어야 영상 렌더링에서 동작한다.
- LLM이 생성한 앵커가 en 본문에 포함되지 않으면 즉시 재시도한다 (최대 2회).
- 재시도 실패 시 해당 앵커는 비우고 경고를 출력한다.
- 쇼츠 `imageChangeAt[].t` 값은 0으로 설정 — `pnpm analyze` 실행 시 text 앵커 기반으로 자동 계산된다.
- 이 스킬은 ko → en 단방향이다. en → ko는 지원하지 않는다.

## 파일 경로

```
sw/remotion/public/episodes/{done|live|todo}/{name}/ko.json
sw/remotion/public/episodes/{done|live|todo}/{name}/en.json
```
