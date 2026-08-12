# 가상 독백 작업 데이터

`celebs.virtual_monologue`의 2026-07 전수 품질 정비 기록을 배치 단위 JSON으로 보존한다.
당시 배치 JSON에 남은 `profile` 명칭은 파일 형식의 역사일 뿐 현재 DB 테이블명이 아니다.

서비스 화면 노출과 신규 작성은 중단됐다. 보존 규칙은 `docs/project/celeb/retire/virtual-monologue.md`를 따른다.

## 파일 규칙

- 구조 감사: `YYYY-MM-DD-structural-audit.json`
- 파일럿·작업 배치: `YYYY-MM-DD-<batch-id>.json`
- 파일명과 JSON의 `batchId`가 일치해야 한다.
- 바꾼 인물은 `currentText`와 `currentHash`를 함께 보존한다.
- 출처 URL만 두지 말고 각 URL이 지지하는 사실·주장을 `supports`에 적는다.
- 후보 상태가 `approved`가 아니면 게시할 수 없다.
- `approved`는 evidence·editorial 독립 검토가 모두 `pass`이고 blocking·major가 0일 때만 기록한다.
- 수정기가 후보를 한 글자라도 바꾸면 이전 검토·승인은 전부 무효화한다.
- 수정 전 후보와 두 검토는 `reviewHistory[]`에 보존해 판단 과정을 잃지 않는다.
- 게시된 배치는 `publishedAt`을 채운다. 공개 서버 렌더링 HTML과 승인 문단의 완전 일치는 `liveHtmlVerification`, CSS·스크롤·반응형 육안 검수는 `liveVerifiedAt`에 분리해 기록한다.

영문 작업은 한국어 배치가 확정된 뒤 별도 배치로 만든다.

## 폐기 상태

생성·검토·수정·승인·게시 스크립트는 모두 삭제했다. 이 폴더의 JSON과 원고는 과거 검토 자료이며 실행 입력으로 사용하지 않는다.
