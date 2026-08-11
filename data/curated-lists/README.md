# 기관 선정 목록 적재 자료

작품 화면의 「기관 선정」에 넣는 기관·시상·분야별 목록 JSON과 수집·매칭 보고서를 보관한다. 화면 구조와 적재 도구의 현역 규격은 [`docs/project/service/curated-lists.md`](../docs/project/service/curated-lists.md)가 쥔다.

## 파일 규칙

| 형태 | 성격 |
|---|---|
| `<slug>.json` | 기관·시상·분야별 작품 목록 원본·정규화 데이터 |
| `_curators.json`, `_curator-logos*.json` | 기관 메타와 로고 자료 |
| `_author-aliases.json` | 저자명 정규화 보조 자료 |
| `_match-report.json`, `_register-report.json` | 연결·등록 실행 보고서 |
| `_fivebooks-*.json`, `_wolfson-history.json` | 특정 출처 수집 자료 |
| [`_field-list-sources.md`](_field-list-sources.md) | 분야별 목록 출처 조사 기록 |
| `_korean-titles/` | 한국어 제목 대조 입력·응답 자료 |

언더스코어로 시작하는 파일은 공개 목록 자체가 아니라 수집·정규화·검증을 위한 보조 자료다.
