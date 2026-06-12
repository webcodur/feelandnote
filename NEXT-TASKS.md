# 다음 작업 목록

2026-06-12 전면 리팩토링(데드코드 → 타입 → 캐싱 → 분할) 이후 남긴 후속 과제. 완료 시 항목을 지우고, 전부 끝나면 이 파일을 삭제한다.

## sw/web — 리팩토링 잔여

| 우선순위 | 작업 | 내용 |
|---|---|---|
| 상 | 친구 활동 타입 필터 풀스캔 | `getFeedActivities`가 콘텐츠 타입 필터 시 해당 타입 contents id 전량을 받아 `.in()`으로 되넘김. activity_logs→contents FK 추가 또는 RPC 이관 필요 |
| 상 | Supabase 클라이언트 Database 제네릭 | `lib/supabase/server.ts`·`static.ts`가 `createClient<Database>` 없이 생성됨. 제네릭을 달면 다대일 조인 오추론이 사라져 잔존 정밀 캐스트(`overrideTypes`, `as unknown as`) 대부분 자연 해소 |
| 중 | React 훅 린트 203건 | `eslint src --quiet` 잔여: set-state-in-effect 40, static-components 37, refs 19, rules-of-hooks 16, no-html-link-for-pages 55 등. 전부 리팩토링 이전부터 있던 동작 변경 필요 건이라 별도 사이클로 분리 |
| 중 | 대사 페이로드 추가 절감 | egress 점검 INFO 5건: 캐시는 적용됐지만 `lines, lines_en` 통째 select 중 (getCelebJsonLdData·getCelebCards·getDawnDialogues·suikoden·getFeaturedTags). `DIALOGUE_BRIEF_SELECT` 계열로 교체 시 페이로드 추가 절감 |
| 중 | 게임 도메인 재편 | 이번 리팩토링에서 의도적으로 제외한 영역. `features/game/` 하위 8개 폴더 100+ 파일, DawnGame/dawn 식 폴더명 혼재, 300줄 초과 파일 다수 (turnEngine 1,173줄 등) |
| 하 | 모달 공통화 검토 | 사용 중 모달 다수가 각자 구현. 공통 베이스 추출 여부 판단 |
| 하 | 기존 문서 잔여 항목 | external-services.md 잔여 체크리스트: CelebDetailModal SWR 도입, CelebPageContent props 슬림화, lucide 아이콘 dynamic import, HeaderNotifications realtime 비용 점검, daily_figures cron 실패 알림, Pro 업그레이드 검토 |

## 정리 보류 (사람 판단 필요)

- `sw/remotion/sw/remotion/public/episodes/elon-musk/books/03-국부론/shorts.ko.json` — 잘못된 상대경로로 쓰인 길 잃은 파일. 정식 위치의 `_archived/03-국부론/shorts.ko.json`과 내용이 달라(어느 쪽이 최신인지 불명) 삭제하지 않고 남겨둠. 대조 후 한쪽으로 정리할 것
- 루트 `머스크_대사_원문.txt` — 작업 원자료로 보여 커밋하지 않음. 보관 위치 결정 필요
- `_backup/` — 빈 폴더. 용도 없으면 삭제
- `sw/remotion/scripts/voice/__pycache__/` — 파이썬 캐시. `.gitignore`에 `__pycache__/` 추가 권장

## 참고

- 캐싱 규칙·이력 SSoT: `docs/project/external-services.md` (5차 정리까지 기록)
- egress 점검: `sw/web`에서 `node scripts/check-egress-patterns.mjs` (현재 exit 0)
- 거대 파일 점검: 게임 제외 비자동생성 파일은 현재 전부 400줄 미만
