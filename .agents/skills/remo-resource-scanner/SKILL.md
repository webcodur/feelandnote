---
name: remo-resource-scanner
description: 리모션(Remotion) 에피소드 및 쇼츠의 리소스 위치(오디오, 이미지, 대본)를 빠르고 정확하게 파악하고 스캔하는 전문 안티그래비티 스킬입니다. "리모션 머스크 리소스", "쇼츠 N편이 무슨 책인지" 등 리모션 자산 탐색 및 정보 매칭 요청 시 자동으로 활성화됩니다.
---

# 리모션 리소스 & 쇼츠 스캐너 스킬 (Remotion Resource & Shorts Scanner)

이 스킬은 안티그래비티(Antigravity) 에이전트가 리모션 에피소드 구조 및 쇼츠 정보를 비효율적인 전체 디렉토리 탐색 없이 즉각적으로 인덱싱하고 정확하게 파악할 수 있도록 가이드합니다.

---

## 📂 리모션 자산 구조 및 SSoT (Single Source of Truth)

리모션 리소스의 기본 디렉토리는 `sw/remotion/public/episodes/{person}` 입니다. 에피소드는 신구조(책 단위 분할)와 레거시 구조로 나뉩니다.

### 1. 롱폼 및 전체 메타데이터 위치
* **신구조 (최신):**
  * 통합 메타데이터 (대본 및 호스트 프로필): `sw/remotion/public/episodes/{person}/meta.ko.json`
  * 서재 책 개별 파일: `sw/remotion/public/episodes/{person}/books/{slug}/book.ko.json`
* **레거시 구조:**
  * `sw/remotion/public/episodes/{person}/ko.json.backup` 또는 `ko.json`

### 2. 쇼츠 정보 및 연결 서적 인덱싱 규칙
* **신구조 쇼츠 매핑:**
  * 각 도서 폴더 내부의 `books/{slug}/shorts.ko.json` 파일이 존재할 때만 활성화됩니다.
  * **중요 (쇼츠 순서 결정 공식):**
    1. 책의 디렉토리명(`01-반지의 제왕`, `05-낯선 땅 이방인` 등)을 **오름차순(sort())**으로 정렬합니다.
    2. 정렬된 폴더들 중 내부에 `shorts.ko.json` 파일이 존재하는 책들만 순서대로 추출하여 `shorts` 배열을 조립합니다.
    3. 이 배열의 0-based 인덱스에 1을 더한 값이 **쇼츠 N편**의 기준이 됩니다.
    * *예시 (일론 머스크 쇼츠 순서):*
      * `05-낯선 땅 이방인` → **쇼츠 1편**
      * `07-파운데이션` → **쇼츠 2편**
      * `08-구조: 구조물은 왜 무너지지 않는가?` → **쇼츠 3편**
      * `09-슈퍼인텔리전스` → **쇼츠 4편**

---

## ⚡ 초고속 스캔 프로토콜

리소스 및 쇼츠 탐색 요청 시 아래 절차를 통해 최단 시간 내에 자산을 스캔합니다.

### Step 1. 대본 덤프 스크립트 실행 (가장 추천)
직접 파일을 탐색하는 대신, 빌드 타임 덤프 스크립트를 실행하여 에피소드 전체의 책 목록과 쇼츠 대본/페어 구성을 한눈에 평문으로 확보합니다.
```bash
node sw/remotion/scripts/extract-story.mjs <person>
```
*이 스크립트는 롱폼 10권의 흐름과 설치된 모든 쇼츠의 세그먼트 텍스트를 Markdown으로 초고속 출력해 줍니다.*

### Step 2. 오디오 슬롯 검증
특정 쇼츠 세그먼트의 오디오 설정이나 ElevenLabs/Gemini 보이스 매핑이 궁금할 때는 다음 파일을 조회합니다.
* `sw/remotion/public/episodes/{person}/voice/ko/voice-select.json`
* *예시:* `shorts-4/S13-philosophy-mirror.wav` 등의 오디오 합성 지정 정보가 담겨 있습니다.

### Step 3. 이미지 에셋 매핑
쇼츠나 책에 적용된 AI 생성 이미지 프롬프트 및 파일명을 확인하려면 아래 경로의 Markdown 문서를 읽습니다.
* `sw/remotion/public/episodes/{person}/books/{slug}/image-prompts-*.md`
