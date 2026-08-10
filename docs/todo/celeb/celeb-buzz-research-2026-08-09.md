# 인물 화제성 수치 조사 메모

> 작성일: 2026-08-09  
> 상태: 조사·설계 초안. DB, 수집기, 스케줄러는 아직 구현하지 않았다.

## 1. 문제 정의

서비스에는 인물의 장기적·누적적 가치를 나타내는 **영향력 수치**가 있지만, 지금 외부에서 얼마나 주목받는지를 보여 주는 **화제성 수치**는 없다.

세 지표는 의미를 섞지 않는 편이 좋다.

| 지표 | 의미 | 변화 속도 |
|---|---|---|
| 영향력 | 역사적·사회적 영향의 누적 평가 | 매우 느림 또는 고정 |
| 화제성 | 최근 외부 인터넷에서 해당 인물이 받는 관심 | 시간·일 단위로 변동 |
| 서비스 조회수 | Feel&Note 안에서 이용자가 보인 관심 | 실시간 누적 |

서비스 조회수를 화제성 산식에 넣으면 서비스 내부 인기와 외부의 현재 관심이 섞인다. 따라서 **조회수와 화제성은 별도 값으로 유지**하고, 화면에서 나란히 활용하는 방향이 적절하다.

## 2. 현재 우선 후보 데이터

### 2.1 Wikipedia 최근 페이지뷰 — 기본 점수

- Wikimedia Pageviews API에서 인물 문서의 최근 7일 조회수를 가져온다.
- 무료로 호출할 수 있고, 국가와 시대가 다른 많은 인물을 동일한 방식으로 비교하기 쉽다.
- 단순 검색어보다 문서가 특정 인물에 연결되므로 동명이인 문제를 줄일 수 있다.
- 인물별 Wikipedia 문서 제목 또는 Wikidata QID와의 정확한 매핑이 선행돼야 한다.
- 한국어 문서만 쓰면 해외 인물이 불리하고, 영어 문서만 쓰면 한국 인물이 불리할 수 있다. 언어판 합산 여부는 표본 실험으로 결정해야 한다.

원시 조회수를 그대로 0~100점으로 바꾸면 초대형 인물이 점수를 독식한다. 따라서 `log1p(조회수)`로 큰 값의 격차를 줄이고, 서비스 내 비교 대상 인물 사이의 백분위로 변환하는 방식이 유력하다.

### 2.2 Google Trends Trending Now RSS — 급상승 보너스

- Google Trends의 한국 지역 Trending Now RSS에 인물명이 등장하는지 확인한다.
- 모든 인물의 연속적인 관심도를 재는 기본 지표라기보다, **지금 급상승한 인물을 끌어올리는 보너스 신호**로 쓰는 편이 맞다.
- RSS 한 번을 읽고 등록 인물과 매칭할 수 있으므로 인물마다 Google 요청을 보내는 구조보다 단순하다.
- 이름의 표기 변형, 동명이인, 영문명·한국명 매칭이 필요하다.
- RSS 형식과 실제 탐지율은 소규모 프로토타입에서 다시 검증해야 한다.

`pytrends` 같은 비공식 Google Trends 클라이언트를 핵심 의존성으로 두는 안은 우선 제외한다. 비공식 엔드포인트 변경, 차단, 호출 제한에 운영 전체가 흔들릴 수 있기 때문이다.

## 3. 검토한 다른 신호

| 후보 | 장점 | 현재 판단 |
|---|---|---|
| 서비스 인물 상세 조회수 | 이미 보유하거나 쉽게 계측 가능 | 외부 화제성이 아니라 서비스 내부 인기이므로 별도 표시 |
| 뉴스 기사량 | 사건 발생을 빠르게 반영 | API 비용·할당량, 중복 기사, 동명이인, 국가별 편향 처리 필요 |
| 일반 검색량 API | 관심도를 직접 반영 | 공식 대량 API의 비용·쿼터와 인물별 요청 수가 부담 |
| SNS 언급량 | 실시간성이 높음 | 플랫폼별 API 비용·접근 제한·봇/팬덤 편향이 큼 |
| Wikipedia 페이지뷰 | 범용성·비용·식별 안정성의 균형이 좋음 | 1차 기본 신호로 채택 후보 |
| Google Trends 급상승 RSS | 순간적인 급등 포착이 쉬움 | 기본 점수가 아닌 보너스 신호로 채택 후보 |

초기 버전은 데이터원을 더 늘리기보다 **Wikipedia + Google 급상승 보너스**만으로 실제 결과를 보고, 뉴스·SNS는 필요가 확인될 때 추가하는 편이 낫다.

## 4. 1차 산식 후보

아직 확정 산식은 아니다. 표본 결과를 보기 위한 가장 단순한 출발점이다.

```text
wiki_base = percentile_rank(log1p(wikipedia_views_7d)) * 85
trend_bonus = 0 / 5 / 10 / 15
buzz_score = min(100, wiki_base + trend_bonus)
```

- `wikipedia_views_7d`: 최근 7일 인물 문서 조회수
- `percentile_rank`: 화제성을 계산하는 등록 인물 모집단 안의 백분위
- `trend_bonus`: Google Trending Now의 순위 또는 노출 강도에 따른 단계형 보너스
- 최종 점수 범위: 0~100

이 방식의 의도는 다음과 같다.

1. Wikipedia가 평소 관심의 바닥값을 만든다.
2. Google 급상승 신호가 사건·방송·수상·사망 등 순간적인 관심을 올린다.
3. Google에 잡히지 않았다고 화제성이 0이 되지 않는다.
4. 서비스 조회수는 산식에 넣지 않는다.

절대 조회수 자체를 사용자에게 숨길 필요는 없지만, 점수 옆에는 최소한 `최근 7일 기준`과 마지막 갱신 시각을 표시해야 한다.

## 5. 두 데이터원은 하나의 시스템에서 처리

Wikipedia 수집기와 Google 수집기를 서로 다른 제품 시스템으로 운영할 필요는 없다. **한 번의 화제성 동기화 작업 안에 두 수집 단계를 둔다.**

```text
한 개의 스케줄 트리거
  -> 화제성 동기화 작업 시작
  -> Wikipedia 최근 조회수 수집
  -> Google Trending Now RSS 1회 수집
  -> 인물 식별·점수 계산
  -> 검증을 통과한 스냅샷만 DB에 공개
```

데이터 특성상 갱신 주기는 내부적으로 다르게 캐시할 수 있다. 예를 들어 Google 신호는 수 시간마다 확인하고 Wikipedia 7일 합계는 하루 한 번 갱신하더라도, 실행기·코드·DB 공개 절차는 하나로 유지할 수 있다.

## 6. 현재 저장소에서 확인한 자동화 현황

### Vercel Cron

- `sw/web/vercel.json`에 `/api/cron/today-figure`를 매일 호출하는 작업이 이미 있다.
- 실제 처리 코드는 `sw/web/src/app/api/cron/today-figure/route.ts`다.
- `Authorization: Bearer CRON_SECRET`을 검사하고, 서버의 Supabase 관리자 키로 `daily_figures`를 갱신한다.
- 프로젝트 문서에는 이 크론의 **동작 모니터링·실패 알림이 아직 미구현**이라고 기록돼 있다.
- 과거 이 작업은 시간대 불일치와 인증 설정 문제를 겪었고, 인증 문제는 해결됐지만 시간대 문제는 문서상 남아 있다.

Vercel 공식 문서상 중요한 제약은 다음과 같다.

- 실패한 Cron 호출을 Vercel이 자동 재시도하지 않는다.
- 동일한 이벤트가 간혹 중복 전달될 수 있으므로 작업은 멱등적이어야 한다.
- Hobby 플랜의 일일 Cron은 지정한 시각이 아니라 해당 시간대 안에서 실행될 수 있다.

따라서 현재의 Vercel Cron 엔드포인트 형식을 그대로 복사하는 것만으로 화제성 수집의 안정성이 확보되지는 않는다.

### Supabase Cron

- Supabase Cron은 내부적으로 `pg_cron`을 사용한다.
- SQL, DB 함수, HTTP 요청 또는 Edge Function 호출을 예약할 수 있다.
- 실행 결과는 `cron.job_run_details`에서 확인할 수 있다.
- 공식 문서는 동시 실행 작업을 8개 이하, 각 작업을 10분 이하로 유지할 것을 권장한다.

그러나 공식 문서에서 **외부 API 수집 전체가 반드시 한 번 성공할 때까지 자동 재시도된다거나 exactly-once로 실행된다는 보장**은 확인되지 않았다. Supabase Cron은 예약 실행기이지 내구성 있는 작업 큐로 간주하면 안 된다.

수백 명의 외부 API 요청과 부분 실패 처리를 DB 함수 안에 넣는 것도 운영과 디버깅 면에서 불리하다. 따라서 현재 판단은 **Supabase는 결과와 실행 상태를 보관하고, 수집 작업 자체는 별도 서버 작업으로 실행**하는 것이다.

### GitHub Actions

- 저장소에는 이미 `.github/workflows/keep-alive.yml`이 있으며 6시간마다 Supabase를 확인한다.
- `workflow_dispatch`도 설정돼 있어 수동 실행이 가능하다.
- GitHub Actions는 실행 로그를 확인하고 실패한 작업을 다시 실행하기 쉽다.

다만 GitHub 공식 문서도 예약 작업이 부하 시 지연될 수 있고, 부하가 매우 높으면 일부 작업이 누락될 수 있다고 명시한다. 따라서 GitHub Actions 역시 스케줄만 믿으면 완전한 보장이 되지 않는다.

## 7. 현재 우선 구현안

아래는 아직 구현하지 않은 우선 제안이다.

| 책임 | 후보 위치 |
|---|---|
| 화제성 수집·계산 작업 | `sw/web-bo/scripts/celeb-buzz/sync.ts` |
| 수동 실행 명령 | `sw/web-bo/package.json`의 `celeb-buzz:sync` |
| 예약 실행 | `.github/workflows/celeb-buzz-sync.yml` |
| 산식·임계값 단일원천 | `packages/shared/src/constants/celeb-buzz.ts` |
| DB 스키마 | `sw/web/supabase/migrations/*_create_celeb_buzz.sql` |

GitHub Actions를 우선 후보로 본 이유는 다음과 같다.

- 기존 저장소가 이미 Actions 예약 작업을 사용한다.
- Next.js 요청 수명에 대량 외부 API 수집을 억지로 맞추지 않아도 된다.
- 실행 로그, 수동 실행, 실패 작업 재실행 경로가 명확하다.
- Supabase는 실행기 대신 저장소 역할에 집중시킬 수 있다.

그러나 최종 실행 위치는 표본 수집 시간, 저장소 요금제, 비밀키 운영 방식을 확인한 뒤 확정해야 한다.

## 8. 크론보다 중요한 실패 안전장치

어느 스케줄러도 단독으로 exactly-once 실행을 보장하지 않는다. 안정성은 작업 구조로 만들어야 한다.

### 실행 기록과 스냅샷 분리

```text
celeb_buzz_runs
  - 실행 ID, 대상 시각, 상태, 시작/완료 시각, 성공·실패 건수

celeb_buzz_scores
  - 실행 ID, 인물 ID, 원시 신호, 최종 점수, 계산 시각
```

서비스는 `status = succeeded`인 가장 최근 실행의 점수만 읽는다. 새 수집이 중간에 실패하면 이전 정상 스냅샷을 계속 보여 주므로 인물 절반만 새 점수로 바뀌는 일이 없다.

### 필수 보호 장치

- 같은 기준 시각에 대한 고유 키로 중복 실행을 무해하게 만든다.
- Actions의 `concurrency`와 DB 잠금을 함께 써 겹친 실행을 막는다.
- 외부 요청은 짧은 지수 백오프로 제한 횟수만 재시도한다.
- 수집 결과 건수와 대상 인물 수를 비교하고 검증 실패 시 공개하지 않는다.
- 실패 시 기존 정상 점수를 덮어쓰지 않는다.
- 마지막 정상 갱신 시각을 저장하고 화면 또는 운영 화면에서 오래된 값을 식별한다.
- 예약 실행이 누락돼도 다음 실행이 미처리 구간을 다시 계산하도록 한다.
- 수동 실행과 실패 실행 재시도 경로를 항상 둔다.

이 구조라면 스케줄이 조금 늦거나 한 번 빠져도 서비스 데이터가 깨지지 않는다. 반대로 이 구조 없이 Supabase Cron이나 Vercel Cron만 붙이면 호출 성공 여부가 곧 데이터 정합성 문제가 된다.

## 9. 권장 도입 순서

1. 스케줄러 없이 수동 명령으로 대표 인물 50~100명을 수집한다.
2. Wikipedia 문서 매핑, 동명이인, 한국·해외 인물 편향을 확인한다.
3. 점수 분포와 실제 체감이 맞는지 보고 산식을 조정한다.
4. 전체 대상에 대해 한 번 수동 실행하고 소요 시간과 실패율을 측정한다.
5. 실행 기록·멱등성·스냅샷 공개 구조를 만든다.
6. 마지막에 하나의 예약 작업을 연결한다.

표본 검증 전부터 크론을 먼저 붙이면 잘못된 점수가 안정적으로 반복 저장될 뿐이다.

## 10. 아직 결정하지 않은 항목

- 화제성 모집단: 전체 등록 인물인지, `active` 인물만인지
- Wikipedia 언어판: 한국어·영어 중 하나인지, 둘을 어떻게 합산할지
- Wikipedia 문서가 없거나 매핑이 불확실한 인물의 처리
- Google RSS의 지역 범위: 한국만 쓸지, 복수 국가를 합칠지
- Google 급상승 순위를 0/5/10/15로 나누는 정확한 경계
- 갱신 주기: 1일, 6시간 또는 다른 간격
- GitHub Actions 비밀값에 관리자 키를 둘지, 쓰기 범위를 제한한 별도 진입점을 만들지
- 실패 알림 수단과 허용 가능한 데이터 노후 시간
- 사용자 화면에서 조회수와 화제성을 어떤 문구와 시각으로 구분할지

## 11. 참고 자료

- [Wikimedia Analytics API — Page views](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html)
- [Google Trends Trending Now RSS (KR)](https://trends.google.com/trending/rss?geo=KR)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Cron 관리와 신뢰성 주의사항](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [GitHub Actions schedule 이벤트](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [GitHub Actions 수동 실행](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [GitHub Actions 실패 작업 재실행](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)
- 프로젝트 내부: `sw/web/vercel.json`
- 프로젝트 내부: `sw/web/src/app/api/cron/today-figure/route.ts`
- 프로젝트 내부: `.github/workflows/keep-alive.yml`
- 프로젝트 내부: `docs/project/external-services.md`
- 프로젝트 내부: `docs/project/web-egress-audit-2026-06-29.md`
