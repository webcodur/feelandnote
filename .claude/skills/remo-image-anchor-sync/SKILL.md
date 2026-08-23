---
name: remo-image-anchor-sync
description: 에피소드 이미지 폴더를 전수 분석하여 품질 기준을 통과하는 이미지에 ko 앵커(file+field+text)를 자동 부착하고, 이어서 en 에피소드에 대응 앵커를 동기화한다. SUMMARY/CONTEXT 시작 이미지 1장 이상 보장. /image-anchor-sync <에피소드명> 으로 실행.
---

# 이미지 앵커 동기화 (이미지 폴더 → ko → en)

**상세 가이드**: `docs/project/remotion/book-recommend/image-anchor-sync.md`

실행 전 반드시 위 문서를 Read tool로 먼저 읽는다. 품질 기준, 데이터 구조, 앵커 규칙, 검증 포맷, 주의사항이 모두 그 문서에 있다.

## 실행

```
/image-anchor-sync <에피소드명>
```

예: `/image-anchor-sync alexander-the-great`

## 파이프라인 요약

책 폴더마다 A→B를 돈다. 이미지도 본문도 책 단위로 쪼개져 있다.

| Phase | 작업 |
|-------|------|
| A-1 | `book.ko.json` 전문(+`shorts.ko.json`) + 그 책의 `images/` 폴더 Glob 스캔 |
| A-2 | 이미지 시각 분석 + 품질 평가 (8개 기준, PASS/REJECT) |
| A-3 | PASS 이미지 → `(field, 앵커)` 매칭 (롱폼 + 쇼츠) |
| A-4 | SUMMARY·CONTEXT 시작 이미지 최소 1장 보장 |
| A-5 | `book.ko.json`·`shorts.ko.json` 저장 (기존 앵커 보존, 전면 재작성은 승인 필요) |
| B-1 | 롱폼 `images[]` 복사 + en 앵커 생성 |
| B-2 | 쇼츠 `segments[].imageChangeAt[]` 복사 + en 앵커 생성 |
| B-3 | en 앵커 `includes()` 검증, 실패 시 최대 2회 재시도 |
| B-4 | `book.en.json`·`shorts.en.json` 저장 |

## 전제 조건

- 대상 책의 `images/` 폴더에 이미지 파일이 존재한다.
- `book.ko.json` 본문과 `shorts.ko.json`의 `segments[].text`가 확정되어 있다.
- `book.en.json`이 존재한다 (번역 완료).

## 파일 경로

에피소드는 인물 폴더 바로 아래에 있다. **단계(stage) 폴더는 없다.**

```
sw/remotion/public/episodes/{인물}/
  meta.ko.json / meta.en.json          ← narrator·host (책 본문 없음, 앵커 대상 아님)
  books/{NN-책제목}/
    book.ko.json / book.en.json        ← summary·contextMain·quotePairs·images
    shorts.ko.json / shorts.en.json    ← segments (쇼츠 있는 책만)
    images/                            ← 그 책 전용 이미지
```

- `done/`·`live/`는 존재하지 않고 `todo/`·`pre-todo/`는 빈 폴더다. **단계별 탐색을 하지 않는다.**
- 인물 폴더 루트에서 `sw/remotion/public/episodes/{인물}/`을 바로 연다.
- 이미지는 에피소드 루트가 아니라 **책 폴더마다 따로** 있다. 루트의 `images_backup/`·`images_unused/`·`_backup_*`은 대상이 아니다.
- `ko.json`·`en.json` 단일 파일은 폐기된 레거시 레이아웃이다. `peter-thiel`만 아직 남아 있다.

## 실행 시 주의

- **기존 앵커는 기본 보존**. 전면 재작성이 필요하면 사용자에게 명시적 승인을 받는다.
- **앵커 길이는 단어 1~2개**. 3단어 이상은 WhisperX 세그먼트 경계를 넘어 매칭이 깨진다.
- **앵커 위치는 문장 또는 문단의 시작점만**. 앵커 텍스트 직전 문자가 `.`, `?`, `!`, `\n` 중 하나여야 한다(본문 첫 글자 제외). **콤마 직후는 금지** — 문장 중간에서 화면이 바뀌면 호흡을 끊는다. 상세는 가이드 § "앵커 규칙 (공통)" 6번.
- **`summary`·`context` 첫 이미지는 그 field 본문 첫 단어를 `text` 앵커로 반드시 가진다.** `text` 없는 배치는 금지.
- **같은 단어가 여러 번 나오면 그냥 같은 텍스트로 N번 적는다.** 매칭 엔진이 이미지 배열 순서를 본문 등장 순서로 보고 N번째 위치에 자동 매핑한다. `nth`·`before`·`after` 같은 보조 필드는 쓰지 않는다. 대신 **이미지 배열을 본문 등장 순서대로 정렬**해야 한다.
- **50장 이상**은 sub-agent 스워밍(10~15장 단위 병렬 분석)으로 context 압박 완화.
- **SUMMARY/CONTEXT 시작 이미지 규칙이 품질 기준보다 우선**. 필수 슬롯이 비면 REJECT 이미지 중 경미한 결함만 있는 것을 승격.
- 이미지 파일 **이동/삭제 금지**. REJECT 파일도 `images/`에 그대로 둔다.
- 방향은 **이미지 폴더 → ko → en** 단방향. en → ko 없음.

## 출력

검증 보고서를 터미널에 출력한다 (포맷은 상세 가이드 § "검증 출력 포맷" 참조).
