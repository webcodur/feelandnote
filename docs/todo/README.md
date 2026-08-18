# 미완료 과제

아직 만들지 결정하지 않은 기능과 실제 실행할 작업을 구분한다. 현역 규칙은 각 문서가
연결하는 `docs/project/`·`docs/games/` SSoT를 따른다.

## 확정 작업

실행 방향이 확정됐고 재개 지점·종료 조건이 있는 과제다.

| 경로 | 다음 작업 |
|---|---|
| [`celeb/README.md#확정-작업`](celeb/README.md#확정-작업) | 읽어보기, 연표, 아바타 결함 |
| [`external-api-migration-2026-08-01.md`](external-api-migration-2026-08-01.md) | 영문판이 확인된 레거시 도서의 EN locale 보완 |
| [`web-deployment-platform-research.md`](web-deployment-platform-research.md) | 현재 성능·비용 변경 마감, 배포비 재측정, 플랫폼 검증 |
| [`document-audit.md`](document-audit.md) | 현역 문서와 코드·DB 대조 |
| [`web-section-lanes.md`](web-section-lanes.md) | 회원 기록 첫 화면, 인물 목록, 인물 상세 스크롤·실화면 검수 |

## 기획·결정 대기

기능을 만들지, 사용자가 무엇을 보게 할지, DB·운영 비용을 허용할지 확정하지 않은
기획이다. 사용자가 채택·범위를 확정하기 전에는 코드·DB·외부 서비스를 바꾸지 않는다.

| 경로 | 결정할 것 |
|---|---|
| [`celeb/README.md#기획결정-대기`](celeb/README.md#기획결정-대기) | 인물 화제성 수치 |

## 문서 수명

- 확정 작업에는 목표·재개 지점·검증·종료 조건만 둔다.
- 기획은 사용자가 기능을 채택하면 확정 작업으로 옮기고, 채택하지 않으면 삭제한다.
- 남은 일이 없으면 현재 규칙만 담당 SSoT에 반영하고 TODO 문서를 삭제한다.
- 완료 경과·회차·실적은 보관하지 않고 커밋 이력에서 회수한다.
