---
name: audit-web-i18n
description: Feel&Note 사용자 웹의 한국어·영어 locale 대응을 코드, DB 콘텐츠, 실화면에서 함께 감사하고 필요 시 교정한다. 번역 누락, 하드코딩 문구, 상세 페이지 locale 점검, KO/EN 의미 대응, 영어 문장 자연스러움, 번역 확장으로 인한 레이아웃 깨짐, hreflang·canonical·중복 ID·스크롤 앵커를 확인해 달라는 요청에 사용한다.
---

# Web i18n 감사

번역 키의 개수만 맞추지 말고 `메시지 구조 → DB 번역 쌍 → 렌더 결과 → 의미와 시각 품질` 순서로 확인한다. 자동 검사는 후보를 찾는 장치이고, 뜻과 배치는 실제 화면을 읽고 보는 판단으로 마무리한다.

## 1. 범위 정하기

- 사용자가 지정한 route·slug를 우선한다.
- “상세 페이지 전체” 요청이면 데이터가 풍부한 인물과 미등록 구획이 있는 인물을 최소 한 명씩 고른다. 한 인물의 통과를 전체 데이터 통과로 일반화하지 않는다.
- 전수 데이터 커버리지 요청에만 `audit-celeb-data.mjs --all`을 사용한다.
- Remotion 원고 번역은 이 스킬의 범위가 아니다.

작업 전 `docs/project/i18n.md`와 관련 화면 문서를 읽는다. 문구를 고치면 `docs/project/writing-rules.md`, UI를 고치면 `docs/project/code-rules.md`도 읽는다.

## 2. 정적 대응 검사

저장소 루트에서 실행한다.

```bash
node .agents/skills/audit-web-i18n/scripts/audit-static.mjs
```

검사 항목:

- `messages/ko`와 `messages/en` 파일·leaf key·값 타입 대응
- ICU 변수명 대응
- 메시지 번들의 `src/i18n/request.ts` 등록
- `useTranslations`·`getTranslations`의 정적 키 존재 여부
- locale 화면의 한국어·영어 하드코딩, 접근성 속성 literal, locale 삼항문

`ERROR`는 먼저 고친다. `WARN`은 실제 문맥을 확인한다. 경고까지 0이어야 하는 정리 작업에서만 `--strict`를 쓴다. 동적 키 호출은 자동 증명할 수 없으므로 요약 건수를 보고 해당 호출부를 직접 확인한다.

고유명사처럼 의도된 literal은 같은 줄에 `i18n-audit-ignore`를 남길 수 있다. 단순히 경고를 숨기기 위한 사용은 금지한다.

## 3. 셀럽 DB 번역 쌍 검사

상세 페이지를 점검할 때 실행한다.

```bash
node .agents/skills/audit-web-i18n/scripts/audit-celeb-data.mjs --slugs=stanley-kubrick
```

여러 인물은 쉼표로 잇는다. 전체는 `--all`, 기계 판독 결과는 `--json`을 사용한다.

```bash
node .agents/skills/audit-web-i18n/scripts/audit-celeb-data.mjs --all --json
```

이 스크립트는 읽기 전용이다. 프로필, 영향력 설명, 페르소나 근거, 대사, 타임라인, 관계, 세력 설명, 감상문의 KO→EN 존재 여부와 JSON 구조를 검사한다. 판정과 수정 규칙은 [data-coverage.md](references/data-coverage.md)를 읽고 따른다.

## 4. KO/EN 실화면 검사

`http://localhost:3000`이 열리는지 확인하고, 없으면 `pnpm dev:web`으로 개발 서버를 실행한다. 그 뒤:

```bash
node .agents/skills/audit-web-i18n/scripts/audit-routes.mjs \
  --slugs=stanley-kubrick \
  --screenshots=.artifacts/i18n-audit
```

Windows PowerShell에서는 한 줄로 실행해도 된다. 다른 서버는 `--base-url=http://localhost:3000`, 느린 환경은 `--timeout=60000`을 지정한다.

스크립트는 slug마다 KO/EN × 1440px/390px 네 화면을 렌더하고 다음을 검사한다.

- 응답, `<html lang>`, title·description
- canonical, `og:url`, ko/en/x-default hreflang
- Person JSON-LD URL
- 중복 DOM id, 끊어진 섹션 앵커
- 페이지 가로 넘침, 조작 요소·제목의 텍스트 잘림
- 영문 화면에 노출된 한글, 브라우저 오류

생성된 스크린샷은 반드시 직접 열어 본다. 자동 PASS만으로 시각 검수를 끝내지 않는다.

의도적으로 한국어 원문을 보여 주는 fallback 컨테이너에는 `data-i18n-fallback`을 붙일 수 있다. 영문 데이터가 없다는 사실과 이유를 사용자에게 설명하는 UI가 있을 때만 허용한다.

## 5. 의미·문장·레이아웃 검수

[review-rubric.md](references/review-rubric.md)를 완전히 읽고 KO/EN 화면을 나란히 검수한다.

특히 다음을 놓치지 않는다.

- 같은 key가 있다는 사실이 아니라 같은 개념과 위계를 전달하는가
- 내부 enum(`diligence`, `cautious_bold`)이 사용자 문장에 새지 않는가
- 미개방 구획이 “원래 무엇인지, 어떤 정보가 나오는지, 왜 현재 없는지”를 설명하는가
- 같은 설명이 제목·부제·본문에서 중복되지 않는가
- 영어가 직역투가 아니며 UI 폭에 맞는 길이인가
- 영어 확장 때문에 탭, 필터, 카드, sticky aside, 이전·다음 섹션 이동이 깨지지 않는가

## 6. 교정과 재검증

- “점검”만 요청받았으면 원인과 증거를 보고하고 임의 수정하지 않는다.
- “처리·수정”까지 요청받았으면 코드·메시지·레이아웃을 교정하고 세 검사를 다시 실행한다.
- DB 누락은 감사 스크립트로 쓰지 않는다. 해당 데이터의 기존 SSoT·생성기를 사용한다. 인용·명언·사료는 번역 누락이라고 자동 창작하지 않는다.
- 한 언어의 문구를 줄이기 위해 의미를 버리지 않는다. 컴포넌트 폭, 줄바꿈, 계층을 먼저 조정하고 양쪽 문구를 함께 다시 읽는다.

## 7. 보고

최종 보고에는 다음을 구분해서 적는다.

- 자동 검사: 오류·경고 수와 실행 범위
- 데이터 대응: 필드별 커버리지와 실제 누락
- 의미 검수: 어색한 용어·번역·중복 설명과 판정
- 시각 검수: 확인한 viewport, 넘침·잘림·위계
- 수정한 파일·데이터와 재검증 결과
- 자동화로 증명할 수 없어 사람이 확인한 항목
