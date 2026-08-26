# 배포·비용 남은 작업

사용자 웹과 DB의 현행 운영 규칙은 다음 문서가 쥔다.

- 운영 서버·캐시·배포·DB 백업: `docs/project/platform/external-services.md`
- 환경변수·비밀값: `docs/project/platform/env-vars.md`
- 검색 노출·배포 후 검증: `docs/project/operations/seo.md`

## 1. 도메인 이전 마감

`feelandnote.com`은 26.08.25 Cloudflare Registrar로 이전을 요청했다. 현재 상태는
`Pending Transfer`이며, 인증 코드 제출까지 끝나 기존 등록기관의 release를 기다리는 마지막
단계다. Vercel에는 `Transferring out`으로 표시되지만 수동 승인·release 버튼은 없다. 만료일은
2027년 2월 3일이다. 승인 메일이 새로 오지 않으면 기다렸다가 상태만 다시 확인하고, 이전이
끝나면 등록기관과 만료일을 확인한 뒤 기존 계정을 폐기한다.

불필요한 `feelnnote.com`은 자동 갱신을 껐고 서비스용 DNS 레코드도 제거했다. 별도로
이전하지 않고 2027년 1월 9일 만료시킨다.

## 2. Oracle 웹 메모리 추적

기동 1일 16시간 시점에 `feelandnote-web.service`는 `MemoryCurrent=511MB`,
`MemorySwapCurrent=421MB`, `NRestarts=1`이었다. 서버 전체는 954MB 중 825MB를 사용했고
스왑은 478MB였다. CPU는 유휴라 병목은 메모리다.

경로별 메모리 증가를 추적한다. 확인 명령은
`ssh -i <키> ubuntu@168.107.58.90 "free -m; uptime; systemctl show feelandnote-web.service
-p MemoryCurrent -p MemorySwapCurrent -p NRestarts"`다.

## 3. 사용자 웹 변경 마감

작업 폴더에 남은 다음 변경을 하나의 검증 단위로 마감한다.

- 캐시 만료 시각 분산과 공용 캐시 병합
- 성향별 공통 작품 조회량 축소
- 화면별 다국어 문구 전송 범위 축소
- 검색 공유용 이미지 용량과 CDN 보관 정책 조정
- 관계도·성향 비교 작은 화면 보정

TypeScript, 관련 자동 테스트, 별도 출력 폴더의 전체 프로덕션 빌드, 핵심 화면 육안 검수를
통과한 뒤만 배포한다.

공개 GitHub 저장소의 홈페이지 메타데이터만 아직 옛 `feelnnote.vercel.app`을 가리킨다. 다음
GitHub 인증 때 `https://feelandnote.com`으로 교정한다.

## 4. 외부 운영 마감

- 작업 폴더의 `warm-web.yml` 수정본은 핵심 URL이 2xx가 아니면 실패하도록 검증했지만 아직
  기본 브랜치에는 반영하지 않았다.
- OCI에서 public vantage point의 홈 REST 검사를 10분마다 실행하고
  `MemoryUtilization[5m].mean() > 90` 알람을 같은 이메일 topic에 연결한다.
- 이전 관리형 Supabase Storage의 과거 아바타는 서비스에서 사용하지 않는다. 실제 삭제는
  `sw/web/scripts/delete-old-avatars.mjs --dry-run`으로 대상을 확인하고 별도 승인 뒤 실행한다.
