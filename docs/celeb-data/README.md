# 인물 데이터 작업 자료

이 디렉터리는 DB 반영 전 검토가 필요한 인물별 원고만 보관한다. 서비스 값의 단일 원천은 DB다.

## 디렉터리

```text
docs/celeb-data/
├── README.md
└── dialogue/
    ├── 01-관태.md ... 11-카라바조.md
    └── _unregistered/{nickname}.json
```

### `dialogue/`

인물별 고유 대사의 등록 전 원고와 등록 완료 참고본이다. 작성·등록 규칙은
`docs/project/celeb/celeb-speech.md`를 따른다. 실제 서비스 값의 원천은
`celeb_dialogues` 테이블이다.

## 타임라인

타임라인의 서비스 값은 `public.celeb_timeline_events`에 저장하며 이 디렉터리에서 관리하지
않는다. 사건 필드·화면 표시·백오피스 수동 편집 규칙은 `docs/project/celeb-journey.md`를 따른다.
