# 인물 데이터 작업 자료

이 디렉터리는 DB 반영 전 검토가 필요한 인물별 원고만 보관한다. 서비스 값의 단일 원천은 DB다.

## 디렉터리

```text
data/celeb/
├── README.md
├── dialogue/
│   ├── 01-괴테.md ... 12-박상영.md
│   └── _unregistered/{nickname}.json
├── headline-rewrite/            # 회차 중에만 존재
│   └── ledger/lane-NN.json
├── timeline-life-rewrite/
│   ├── korean-diagnostic/
│   ├── pilots/
│   └── db-*.json
└── viewing-research/
    └── YYYY-MM-DD-<scope>.md
```

### `headline-rewrite/`

한 줄 정의 회차의 레인별 원장이다. 인물마다 최종 한영값·`phase`·심사 버전·반영 여부를 남기며,
작업 PC 간 이어 붙이기 위해 회차 중에는 커밋으로 공유하고 apply가 끝나면 지운다.
호출은 `celeb-headline-rewrite` 스킬, 룰은 `docs/project/celeb/celeb-1-basic-profile.md`
한 줄 정의 절이다. 서비스 값의 원천은 DB다.

`packs/`·`reviews/`·`drafts/`와 `.tmp/relay/`는 claim이 만들고 덮어쓰는 작업 파일이라 회차가
끝나면 지운다. 최종값을 판단할 때는 원장만 본다.

### `dialogue/`

인물별 고유 대사의 등록 전 원고와 등록 완료 참고본이다. 작성·등록 규칙은
`docs/project/celeb/celeb-speech.md`를 따른다. 실제 서비스 값의 원천은
`celeb_dialogues` 테이블이다.

### `viewing-research/`

인물군의 콘텐츠 감상 언급을 조사한 날짜별 스냅샷이다. 실제 서비스 관계와 출처는 DB 반영·감사 절차를 통과한 값만 정본으로 본다.

### `timeline-life-rewrite/`

실존 인물 연표 부분 수리의 과거 국문 진단, 사실 감사 표본, 중간 반영 전 백업과 결과다. 재개 근거는
이 폴더의 `README.md`, 실행 규칙은 `docs/project/celeb/celeb-timeline-agent-relay.md`가 쥔다.

## 타임라인

타임라인의 서비스 값은 `public.celeb_timeline_events`에 저장하며 이 디렉터리에서 관리하지
않는다. 위 중간 데이터는 작업 재개용 스냅샷일 뿐이다. 사건 필드·화면 표시·백오피스 수동 편집
규칙은 `docs/project/celeb/celeb-timeline.md`를 따른다.
