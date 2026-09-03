# celeb_timeline_events 죽은 컬럼 폐기 요망

`public.celeb_timeline_events`의 `day`·`source_url`·`place_qid` 세 컬럼을 실제로 DROP해야 한다.

## 상태

- 세 컬럼은 어느 화면·조회 코드도 읽지 않는다. 조회 액션 `getCelebTimelineEvents.ts`는 이 셋을
  select하지 않는다. 좌표는 `lat`/`lng`로 충분해 `place_qid`는 중복이고, `source_url`은 아무도 열지
  않는 링크, `day`는 조회조차 없었다.
- **값은 이미 전량 비웠다**(day 3,784 · source_url 11,445 · place_qid 7,675 → 모두 null, 재검증 0건).
  컬럼 껍데기만 남아 있다.
- 규격 문서는 이 셋을 「만들지 않는 값」으로 못박았다(`celeb-06-01-timeline.md`, `03-celeb.md`). 조사·입력
  파이프라인은 다시 채우지 않는다.

## 남은 일

Oracle 운영 DB의 세 컬럼이 아직 남아 있다. 운영 DB SSH 경로로 아래 DDL을 실행하고
`information_schema.columns`에서 세 이름이 모두 사라졌는지 확인한다.

```sql
ALTER TABLE public.celeb_timeline_events DROP COLUMN IF EXISTS day;
ALTER TABLE public.celeb_timeline_events DROP COLUMN IF EXISTS source_url;
ALTER TABLE public.celeb_timeline_events DROP COLUMN IF EXISTS place_qid;
```

`month`는 뒤에 월 표시에 쓸 수 있어 남긴다. `lat`·`lng`·`place_name(_en)`은 지구본이 읽으므로 유지한다.
실행 뒤 이 문서를 지운다.
