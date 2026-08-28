# 배포·비용 남은 작업

사용자 웹과 DB의 현행 운영 규칙은 다음 문서가 쥔다.

- 운영 서버·캐시·배포·DB 백업: `docs/project/platform/external-services.md`
- 환경변수·비밀값: `docs/project/platform/env-vars.md`
- 검색 노출·배포 후 검증: `docs/project/operations/seo.md`

## 1. 사용자 웹 변경 마감

작업 폴더에 남은 다음 변경을 하나의 검증 단위로 마감한다.

- 캐시 만료 시각 분산과 공용 캐시 병합
- 성향별 공통 작품 조회량 축소
- 화면별 다국어 문구 전송 범위 축소
- 검색 공유용 이미지 용량과 CDN 보관 정책 조정
- 관계도 모바일·데스크톱 실화면 검수 뒤 `RELATION_MAP_ENABLED` 운영 차단 제거
- 성향 비교 작은 화면 보정

TypeScript, 관련 자동 테스트, 별도 출력 폴더의 전체 프로덕션 빌드, 핵심 화면 육안 검수를
통과한 뒤만 배포한다.

공개 GitHub 저장소의 홈페이지 메타데이터만 아직 옛 `feelnnote.vercel.app`을 가리킨다. 다음
GitHub 인증 때 `https://feelandnote.com`으로 교정한다.

## 2. 외부 운영 마감

- 작업 폴더의 `warm-web.yml` 수정본은 핵심 URL이 2xx가 아니면 실패하도록 검증했지만 아직
  기본 브랜치에는 반영하지 않았다.
- OCI에서 public vantage point의 홈 REST 검사를 10분마다 실행하고
  `MemoryUtilization[5m].mean() > 90` 알람을 같은 이메일 topic에 연결한다.
- 이전 관리형 Supabase Storage의 과거 아바타는 서비스에서 사용하지 않는다. 실제 삭제는
  `sw/web/scripts/delete-old-avatars.mjs --dry-run`으로 대상을 확인하고 별도 승인 뒤 실행한다.
