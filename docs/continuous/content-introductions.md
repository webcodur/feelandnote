# 작품 소개 보완

서비스에 노출되는 책에 소개가 없는 문제를 처리한다. 실제 번역본이 없어 노출되지 않는 언어 카드는 대상이 아니다.

## 현재 도달점

마지막 작업은 2026-10-24 02:00 KST에 멈췄다. 목표는 **출력되는 결손(소개 없음) 0건**이며, 아직 미완료다.

| 언어 | 남은 소개 없음 |
|---|---:|
| 한국어 | 348건 |
| 영어 | 1,792건 |
| 합계 | **2,140건** |

2026-10-24 01:58 KST 집계다. 기본 선택판과 사용자가 선택할 수 있는 다른 판본을 포함한다. 본문과 사용 가능한 출처 참조가 모두 없는 경우를 센다. 출처 참조가 있지만 원문 요청에 실패한 경우는 이 수치에 포함하지 않았다.

기존 조회 자료는 `%TEMP%\feelandnote\visible-book-intros-20261020-01a1526b\`에 있다. 완료된 대상은 제거했고, 미처리 원문과 현재 대상 목록을 남겼다. 재개할 때 현재 DB를 다시 읽어 대상을 갱신한다.

출처의 CAPTCHA 응답을 소개 없음으로 잘못 판단하지 않게 한 웹 코드 수정은 아직 운영 배포 전이다. 요청 실패만으로 기존 출처를 지우지 않는다.

기존 보류 사항은 변순복의 『토라(상)』와 『도라에몽 50주년 기념 스페셜판 3』의 내용 근거, 『파인먼 씨, 농담이죠!』와 『파인만 씨, 농담도 잘하시네요』의 중복 여부다. 확인 없이 소개를 만들거나 합치지 않는다.

## 반복 실행 순서

`sw/web-bo`에서 실행한다.

```powershell
# 현재 남은 대상 집계
pnpm contents:book-introductions

# 현재 대상의 소개 원문 수집
pnpm contents:book-introductions --collect

# 검수한 소개의 변경 내용 확인 → 반영
pnpm contents:book-introductions --reviewed "<검수 JSON 경로>"
pnpm contents:book-introductions --reviewed "<검수 JSON 경로>" --apply
```

새 책만 처리하려면 `--content-id <작품 ID>`를 붙인다. 기존 조회 자료를 이어 쓰려면 `--collect --work-dir "<기존 작업 폴더>"`로 실행한다. 어느 경우든 현재 DB에서 대상을 다시 읽는다.

수집한 소개는 같은 작품·ISBN·언어·본문 범위인지 읽고 검수한다. 반영 명령은 DB 재조회, 책장 선택 확인, 관련 캐시 갱신, 기본 선택판의 운영 상세 확인까지 수행한다. 입력 형식과 전체 옵션은 [실행 스크립트](../../sw/web-bo/scripts/contents/book-introductions.mjs)의 `--help`를 본다.

출처·번역·조사 작성 규칙은 [소개 수집 룰북](../project/celeb/celeb-02-06-content-introduction-sources.md), 판본·인물 연결은 [인물 도서 정리](figure-books.md)를 따른다. 영상·게임·음악도 같은 출처 룰북을 사용하며, 검수한 소개는 `apply-media-introductions.ts --plan FILE --apply`로 반영한다.
