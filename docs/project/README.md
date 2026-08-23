# 프로젝트 현역 문서

Feel&Note의 현재 앱 구조, 서비스 규격, 데이터 계약, 제작·운영 규칙을 모은다. 게임은 독립 영역인 [`docs/games/`](../games/README.md)에서 관리한다.

## 영역

| 디렉터리 | 책임 |
|---|---|
| [`platform/`](platform/README.md) | 전체 아키텍처, 코드 규칙, 다국어, 환경변수, 외부 서비스, 개발 도구와 전송 비용 |
| [`apps/`](apps/README.md) | web-bo, audio-bo, Android 앱 셸 같은 개별 앱 운영 문서 |
| [`service/`](service/README.md) | 사용자 웹 화면과 라우트 |
| [`data/`](data/README.md) | 핵심 DB와 인물 DB 스키마 |
| [`celeb/`](celeb/README.md) | 인물 생성 파이프라인, 상세 화면, 이미지, 타임라인, 읽어보기 |
| [`remotion/`](remotion/README.md) | 서재 탐방, 책과 사람, 세력도감, 담화, 영상·음성 제작 |
| [`operations/`](operations/README.md) | SEO, 수익화, 유입 감사, SNS 확장 |
| [`production/`](production/README.md) | 글쓰기와 이미지 생성·발주 공통 규칙 |

AI 에이전트가 이 저장소에서 일하는 방식은 [`agent-rules.md`](agent-rules.md)가 쥔다. 루트 [`AGENTS.md`](../../AGENTS.md)는 그중 사고로 직결되는 불변사항만 압축해 둔다.

## 문서 판정

- 이 디렉터리는 현역 문서만 둔다. 완료 보고서와 폐기 문서는 규칙을 담당 SSoT로 옮긴 뒤 지운다.
- 아직 실행할 일이 남은 인수인계·작업 큐는 [`docs/todo/`](../todo/README.md)에 둔다.
- 날짜가 붙은 감사 문서는 해당 현역 영역의 기준선 또는 사고 기록이다. 문서 안의 마지막 실측일과 현재 코드 사실을 구분한다.
- 같은 규칙을 여러 영역 README에 풀어 쓰지 않는다. 책임 문서 링크만 둔다.
