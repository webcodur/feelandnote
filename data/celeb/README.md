# 인물 데이터 작업 자료

이 디렉터리는 DB 반영 전 검토가 필요한 인물별 원고만 보관한다. 서비스 값의 단일 원천은 DB다.

## 디렉터리

```text
data/celeb/
├── README.md
├── video-review-audit-remainder.json # 이번 티스토리 교정에서 빠진 영상 리뷰 대상·원문
├── dialogue/                    # 인물별 대사 원고와 등록 완료 참고본
│   ├── 01-괴테.md ... 12-박상영.md
│   └── _unregistered/{nickname}.json
├── fiction/                     # 원전별 인물 조사 묶음
├── figure-books/                # 등장·연관 도서 후보와 반영 전 검수본
├── book-introductions/          # 작품 소개 수집 원문·검수·번역 자료
├── founding-myth/               # 건국신화 배치. 반영 뒤 _backup 만 남긴다
│   └── _backup/
├── myth-plan/missing-figures.md # 신화 정비안이 넣자고 한 미등록 인물. 등록·배정하면 지운다
├── hero-photo/                  # 대표 사진 연출문 초안. 생성·등록 뒤 삭제
│   └── scene-manifest.md
├── headline-rewrite/            # 회차 중에만 존재. apply 뒤 통째로 삭제
│   └── ledger/lane-NN.json
├── profession-reclass/          # 직군 재분류 배치
├── relations-dense/             # 관계 밀도 보강 레인
├── timeline-life-rewrite/
│   ├── korean-diagnostic/
│   ├── pilots/
│   └── db-*.json
├── viewing-research/
│   └── YYYY-MM-DD-<scope>.md
└── virtual-monologue/           # 가상독백 보류 기록(light.jsonl)·감시자 로그. 빈칸이 모두 채워지면 지운다
```

**배치 산출물은 DB 반영이 끝나면 지운다.** 생성 스크립트가 만드는 작업 폴더(`gap-fill/`처럼
필드·트랙 이름을 딴 것)는 반영과 왕복 검증을 통과한 순간 쓸모가 끝난다. 남겨 두면 다음 배치가
옛 산출물을 완료로 착각하고 건너뛴다. 경위는 커밋 이력이 아니라 DB와 룰북이 쥔다. 되돌릴 값이
있으면 `_backup/`에 원본만 남기고 나머지는 폐기한다.

`book-introductions/`의 JSON·JSONL은 원문 재조회와 중복 번역을 막는 로컬 작업 자료로 Git에서 제외한다. 실행 코드(`.mjs`·`.ts`)는 추적 대상이며, 소개 작업 백업은 `D:/feelandnote-backups/book-descriptions/`에 보존한다.

### `headline-rewrite/`

한 줄 정의 회차의 레인별 원장이다. 인물마다 최종 한영값·`phase`·심사 버전·반영 여부를 남기며,
작업 PC 간 이어 붙이기 위해 회차 중에는 커밋으로 공유하고 apply가 끝나면 지운다.
호출은 `celeb-headline-rewrite` 스킬, 룰은 `docs/project/celeb/celeb-01-02-profile-intro.md`다.
서비스 값의 원천은 DB다.

`packs/`·`reviews/`·`drafts/`와 `.tmp/relay/`는 claim이 만들고 덮어쓰는 작업 파일이라 회차가
끝나면 지운다. 최종값을 판단할 때는 원장만 본다.

### `dialogue/`

인물별 고유 대사의 등록 전 원고와 등록 완료 참고본이다. 작성·등록 규칙은
`docs/project/celeb/celeb-04-01-speech.md`를 따른다. 실제 서비스 값의 원천은
`celeb_dialogues` 테이블이다.

### `hero-photo/`

아바타·대표 사진이 둘 다 없는 인물의 대표 사진 연출문 초안이다. `SHOT MODE`·`ACTION`·`SETTING`을 인물별로 배분해 두고 발주할 때 꺼내 쓴다. 규격은 `docs/project/celeb/celeb-08-02-hero-photo.md`, 얼굴·복식과 금지 항목은 `docs/todo/img/avatar-backlog.md`가 쥔다. 생성과 등록이 끝나면 지운다.

### `viewing-research/`

인물군의 콘텐츠 감상 언급을 조사한 날짜별 스냅샷이다. 실제 서비스 관계와 출처는 DB 반영·감사 절차를 통과한 값만 정본으로 본다.

### `timeline-life-rewrite/`

실존 인물 연표 부분 수리의 과거 국문 진단, 사실 감사 표본, 중간 반영 전 백업과 결과다. 재개 근거는
이 폴더의 `README.md`, 실행 규칙은 `docs/project/celeb/celeb-06-02-timeline-real-relay.md`가 쥔다.

## 타임라인

타임라인의 서비스 값은 `public.celeb_timeline_events`에 저장하며 이 디렉터리에서 관리하지
않는다. 위 중간 데이터는 작업 재개용 스냅샷일 뿐이다. 사건 필드·화면 표시·백오피스 수동 편집
규칙은 `docs/project/celeb/celeb-06-01-timeline.md`를 따른다.
