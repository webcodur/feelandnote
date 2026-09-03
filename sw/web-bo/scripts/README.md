# web-bo 운영 도구 색인

관리자 백오피스가 화면으로 제공하지 않는 일괄 작업을 명령줄에서 실행한다. 모든 도구는 `pnpm` 명령으로 등록돼 있다. `sw/web-bo` 에서 실행한다.

```bash
cd sw/web-bo
pnpm run                       # 전체 명령 목록
pnpm celeb:audit:tracks        # 인자 없는 도구
pnpm celeb:claim --worker lane-a --count 4      # 인자는 그대로 이어 붙인다
pnpm photo:crop-body public/factions/.../_group.png   # 위치 인자도 동일
```

세부 사용법·옵션은 각 스크립트 첫머리 주석이 쥔다. 이 문서는 어떤 도구가 있는지만 가리킨다.

## 폴더 규칙

**명령 이름이 곧 경로다.** `pnpm a:b` 는 `scripts/a/b.ts`, `pnpm a:b:c` 는 `scripts/a/b-c.ts` 를 실행한다.

```
scripts/
  celeb/          인물 데이터 — 감사·선점·반영·읽어보기
    speech/       말투·한마디·대사 (번호 순서)
    reading/      읽어보기 릴레이·묶음
    timeline/     생애 연표·좌표
  avatar/         아바타 등록·크롭·측정
  photo/          인물 화보·얼굴 크롭·배너
  faction/        세력도감 출간·대사·이미지
  fiction/        신화·전설·허구 인물
  figure-books/   전체 인물의 등장·연관 도서 후보·검수·반영
  curated/        기관 선정 목록
  coupang/        제휴 링크
  book-recommend/ 서재 탐방 자원
  lib/            공용 모듈
  schemas/  sql/  스키마·질의문
```

경로는 파일이 놓인 깊이에 기대지 않는다. `.env`·저장소 루트가 필요하면 `lib/paths.ts` 의 `boPath`·`repoPath`·`scriptsPath` 를 쓴다. `resolve(__dirname, '..')` 같은 상대 홉을 새로 쓰지 않는다.

## 셀럽 데이터

| 명령 | 하는 일 |
|---|---|
| `celeb:audit:activation` | 전체 인물 데이터 보유율·공개 전환 준비도 감사. `--apply` 로 일괄 활성화까지 |
| `celeb:audit:basic` | 기본 정보 결손 전수 조사(읽기 전용) |
| `celeb:audit:tracks` | 전 트랙 결손 전수 감사(읽기 전용) |
| `celeb:audit:public` | 사용자 웹 노출 데이터의 구조·결측 1차 감사 |
| `celeb:audit:spectrum` | 스펙트럼 근거문 감사(읽기 전용). 인물 복제와 근거문 내용 결함을 따로 세어 후보 목록을 쓴다 |
| `celeb:spectrum:check` | 재채점 패치 자가 검사(DB 접속 없음). 사적 신상·대리 기부·길이·중립대 이탈을 잡는다. 조사자가 제출 전에 돌린다 |
| `celeb:spectrum:review` | 재채점 패치의 16축을 출력하고 그대로 반영한다. 판정과 반영을 한 명령으로 묶는다 |
| `celeb:spectrum:test` | 근거문 판정 규칙 단위 테스트 |
| `celeb:claim` | 작업 선점. 레인별로 다음 인물 묶음을 집어간다 |
| `celeb:fill` | 결손 조건부 반영. 빈칸만 채운다. `--replace-spectrum`은 스펙트럼 재채점 덮어쓰기. 스펙트럼은 근거문 중복 게이트를 거친다 |
| `celeb:defer` | 근거 부재 항목을 보류 장부에 기록해 선점에서 제외 |
| `celeb:i18n-backfill` | 활성 셀럽 상세의 KO→EN 누락 필드 백필 |
| `celeb:readings` | 읽어보기(인물 안내·인물 탐구) 집필 배치 |
| `celeb:readings:translate` | 읽어보기 영문 번역 |
| `celeb:relations` | 위키데이터 기반 인물 관계망 수집 |
| `celeb:dialogue-repair` | 대사 데이터 최상위 구조 교정 |

## 셀럽 말투·대사

번호 순서대로 실행한다. 4단계 반영은 위의 `celeb:fill` 이 맡는다. 전체 흐름은 [`docs/project/celeb/celeb-04-02-speech-pipeline.md`](../../../docs/project/celeb/celeb-04-02-speech-pipeline.md)가 쥔다.

| 명령 | 하는 일 |
|---|---|
| `celeb:speech:1-targets` | 대사·한마디를 채울 대상 선별과 현재값 스냅샷 |
| `celeb:speech:2-collect` | 본문 회수와 직접 인용 추출(`probe`·`extract`·`verify`) |
| `celeb:speech:3-patch` | 최소 입력을 `celeb:fill` 패치로 조립. 해시는 DB에서 다시 계산한다 |
| `celeb:speech:test` | 조사 묶음 검증 규칙 단위 테스트 |

`celeb/reading/` 과 `celeb/timeline/` 에는 pnpm 명령이 없는 릴레이 도구가 들어 있다. 각 파일 머리말 주석과 해당 영역 문서를 따른다.

## 아바타

| 명령 | 하는 일 |
|---|---|
| `avatar:batch` | 일괄 등록. QID → 이미지 → 얼굴 크롭 → R2 → DB |
| `avatar:upload` | 한 명 등록. Commons 이미지 기준 |
| `avatar:sm` | 작은 판(96px) 생성 후 나란히 업로드 |
| `avatar:find-unnobg` | 배경이 안 지워진 아바타를 순서대로 한 명씩 찾는다 |
| `avatar:nobg-backfill` | 등록 아바타 전수 검사 → 원본 백업 → 미처리분 배경 제거 → 검증·복원 |
| `avatar:measure` | 얼굴 위치·크기 측정과 합격 판정 |
| `avatar:contact-sheet` | 검수용 격자 이미지 생성 |

## 인물 사진

| 명령 | 하는 일 |
|---|---|
| `photo:hero:pick` | 대표 화보가 없는 인물을 우선순위대로 뽑아 배치 파일로 저장 |
| `photo:hero:generate` | 배치 파일을 받아 생성 → 검증 → 등록 |
| `photo:hero:upload` | 준비된 대표 화보 일괄 등록 |
| `photo:crop-faces` | 화보에서 얼굴 정사각 크롭 추출(아바타용) |
| `photo:crop-body` | 단체샷에서 인물별 전신 크롭 추출 |
| `photo:world-banner` | 세계관 배너 이미지 준비 |

## 세력도감

| 명령 | 하는 일 |
|---|---|
| `faction:publish` | 편 단위 출간. 관리 화면 「전체 출간」과 같은 코드 |
| `faction:publish:photos` | 로고·개인샷·단체샷만 범위를 지정해 출간 |
| `faction:dialogue-apply` | 검수된 대사 배치를 DB에 조건부 반영 |
| `faction:portrait-scan` | 대표 사진으로 쓸 만한 인물 단독 이미지 후보 훑기 |
| `faction:images:person` | 태그 전용 인물 개인샷 일괄 등록 |
| `faction:images:team` | 태그 단체 이미지 일괄 등록 |

## 신화·전설·허구 인물

| 명령 | 하는 일 |
|---|---|
| `fiction:audit` | 프로필·대표 원전 연결 전수 감사 |
| `fiction:seed:inactive` | 이름·영문명·식별 bio와 신규/기존 UUID 판단을 받아 fiction/inactive 후보와 숨김 신화 소속을 등록 |
| `fiction:sync` | 인물 명세를 셀럽 테이블에 동기화 |
| `fiction:sync:faction` | 세력도감의 신화 인물을 비공개 fiction 프로필로 만들고 연결 |
| `fiction:monologue-lock` | 가상 독백 확정 잠금·해제·목록 |

## 기관 선정 목록

| 명령 | 하는 일 |
|---|---|
| `curated:import` | 선정 목록 파일(또는 폴더 전체) 적재 |
| `curated:match` | 목록 항목을 우리 콘텐츠와 연결 |
| `curated:register` | 아직 없는 책을 신규 등록 |
| `curated:titles` | 한국어 정식 출간명 조회 |
| `curated:titles:apply` | 조회된 출간명으로 항목 재연결 |

## 콘텐츠·제휴

| 명령 | 하는 일 |
|---|---|
| `book-recommend:resources` | 서재 탐방 DB 연결·표지 캐시 운영 |
| `figure-books:audit` | 전체 인물의 등장·연관 도서와 공개 쿠팡 판본 커버리지 감사 |
| `figure-books:direct-candidates` | 기존 BOOK의 제목·저자에서 인물 이름이 직접 보이는 후보 추출 |
| `figure-books:context-candidates` | 실존 인물 프로필의 세부 분야·작품·사건과 기존 선정 도서가 만나는 연관 후보 추출. 결과는 최종 관계가 아니라 모델 검수 입력 |
| `figure-books:review-direct` | 후보를 agy로 검수하고 선택 결과를 로컬 JSON에 누적. `--shortlist`를 반복하면 여러 1차 결과를 합쳐 최종 심사 |
| `figure-books:apply-reviewed` | 최종 검수 결과를 작품별 증분 관계로 dry-run·반영. 분할 결과는 `--reviews` 반복. 대량 반영은 `--verified-kakao-only --summary-only`로 출처·ISBN·검증 통과분만 적용 |
| `coupang:candidates` | 제휴 링크 후보 수집 |
| `coupang:inspect` | 선택 전 상품 상세의 배송·판매 근거 회수 |
| `coupang:pick` | 후보 중 선택분 확정 |
| `coupang:audit` | 연결된 제휴 링크 점검 |

`figure-books:review-direct`는 같은 출력 파일로 다시 실행하면 저장 지점부터 이어진다. 검증 메타만 쓰는 대량 심사는 `--offline`, 병렬 분할은 서로 다른 출력 파일과 `--shard 1/3`, 합본 입력 검사는 외부 호출 없는 `--validate-only`를 쓴다.
