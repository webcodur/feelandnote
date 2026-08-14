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

## 셀럽 데이터

| 명령 | 하는 일 |
|---|---|
| `celeb:audit:activation` | 전체 인물 데이터 보유율·공개 전환 준비도 감사. `--apply` 로 일괄 활성화까지 |
| `celeb:audit:basic` | 기본 정보 결손 전수 조사(읽기 전용) |
| `celeb:audit:tracks` | 전 트랙 결손 전수 감사(읽기 전용) |
| `celeb:audit:public` | 사용자 웹 노출 데이터의 구조·결측 1차 감사 |
| `celeb:claim` | 작업 선점. 레인별로 다음 인물 묶음을 집어간다 |
| `celeb:fill` | 결손 조건부 반영. 빈칸만 채운다 |
| `celeb:defer` | 근거 부재 항목을 보류 장부에 기록해 선점에서 제외 |
| `celeb:i18n-backfill` | 활성 셀럽 상세의 KO→EN 누락 필드 백필 |
| `celeb:readings` | 읽어보기(인물 안내·인물 탐구) 집필 배치 |
| `celeb:readings:translate` | 읽어보기 영문 번역 |
| `celeb:relations` | 위키데이터 기반 인물 관계망 수집 |
| `celeb:dialogue-repair` | 대사 데이터 최상위 구조 교정 |

## 아바타

| 명령 | 하는 일 |
|---|---|
| `avatar:batch` | 일괄 등록. QID → 이미지 → 얼굴 크롭 → R2 → DB |
| `avatar:upload` | 한 명 등록. Commons 이미지 기준 |
| `avatar:sm` | 작은 판(96px) 생성 후 나란히 업로드 |
| `avatar:find-unnobg` | 배경이 안 지워진 아바타를 순서대로 한 명씩 찾는다 |
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
| `fiction:sync` | 인물 명세를 셀럽 테이블에 동기화 |
| `fiction:sync:faction` | 세력도감의 신화 인물을 검색 가능한 프로필로 전환 |
| `fiction:publish` | 신화·전설·허구 편을 서비스 태그·배정에 투영 |
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
| `coupang:candidates` | 제휴 링크 후보 수집 |
| `coupang:pick` | 후보 중 선택분 확정 |
| `coupang:audit` | 연결된 제휴 링크 점검 |
