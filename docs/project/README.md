# 프로젝트 현역 문서

Feel&Note의 현재 앱 구조, 서비스 규격, 데이터 계약, 제작·운영 규칙을 모은다. 게임은 독립 영역인 [`docs/games/`](../games/README.md)에서 관리한다. 파일명 규칙은 [`docs/README.md`](../README.md) 「파일명 규칙」을 따른다.

## 영역

| 디렉터리 | 접두사 | 책임 |
|---|---|---|
| [`platform/`](platform/README.md) | `platform-` | 전체 아키텍처, 코드 규칙, 다국어, 환경변수, 외부 서비스·운영 인프라, OAuth |
| [`apps/`](apps/README.md) | `apps-` | web-bo, audio-bo, 안드로이드 앱 셸 같은 개별 앱 |
| [`service/`](service/README.md) | `service-` | 사용자 웹 화면과 라우트 |
| [`data/`](data/README.md) | `data-` | 회원·콘텐츠·인물 DB의 물리 관계와 불변사항 |
| [`celeb/`](celeb/README.md) | `celeb-NN-NN-` | 인물 생성 파이프라인, 상세 화면, 이미지, 타임라인, 읽어보기 |
| [`remotion/`](remotion/README.md) | `remotion-`·`br-`·`voice-`·`discourse-` | 서재 탐방, 책과 사람, 담화, 랭킹, 영상·음성 제작 |
| [`operations/`](operations/README.md) | `ops-` | 서비스 방향, SEO, 제휴 판매, 광고 |
| [`production/`](production/README.md) | `prod-` | 이미지 발주, 주요 장면, 합성 음성 배선·정리 |

AI 에이전트가 이 저장소에서 일하는 방식은 [`agent-rules.md`](agent-rules.md)가 쥔다. 루트 [`AGENTS.md`](../../AGENTS.md)는 그중 사고로 직결되는 불변사항만 압축해 둔다. 프로젝트와 무관한 에이전트 기법(CLI 상호 호출, 진단-편집 분업 등)은 [`docs/resource/`](../resource/README.md)에 있다.

## 문서 판정

- 이 디렉터리는 현역 문서만 둔다. 완료 보고서와 폐기 문서는 규칙을 담당 SSoT로 옮긴 뒤 지운다.
- 아직 실행할 일이 남은 인수인계·작업 큐는 [`docs/todo/`](../todo/README.md)에 둔다.
- 같은 규칙을 여러 영역 README에 풀어 쓰지 않는다. 책임 문서 링크만 둔다.
