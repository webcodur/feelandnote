# 아카이브

완료된 일회성 문서를 보관한다. **현역 규칙이 아니다. 작업 시 참조 대상이 아니며, 이력 추적 목적으로만 남긴다.**

여기 있는 문서의 서술은 작성 당시 상태다. 현재 코드·데이터와 일치한다고 가정하지 않는다.

## 보관 문서

| 문서 | 성격 | 완료 |
|------|------|------|
| `en-book-data-quality.md` | BOOK en 데이터 진단·수정 이력. naver_book 2,364건 전량 verified | 26.03 |
| `video-en-thumbnails.md` | VIDEO 영문 썸네일 수집. 1,326건 수집, 14건 unavailable | 26.03 |
| `content-locales-design.md` | content_locales 설계서 | 26.03 |
| `content-locales-migration-files.md` | content_locales 마이그레이션 파일별 참조 가이드 | 26.03 |
| `tag-missing-celebs.md` | 태그 미배정 셀럽 전원 등록 | 26.03 |
| `book-card-page-break.md` | BookCardVisual 페이지 전환 버그 수정 | 26.03 |
| `shorts-image-changelog.md` | 쇼츠 이미지 타이밍 개선 기록 | 26.04 |
| `explore-restructure.md` | explore 용어 통폐합 실행 지시서. **용어 규칙은 `code-rules.md`로 회수 완료(26.07.16)** | 26.03 |
| `explore-naming-prompt.md` | explore 작명 프롬프트 (일회성) | 26.04 |
| `shorts-image-gen.md` | 영상 이미지 생성 지시서. 유효 규칙은 `book-recommend/image-requirements.md`로 흡수(26.07.16). 남은 것은 에피소드별 프롬프트 이력 | 26.04 |
| `shorts-image-spec.md` | 쇼츠 배경 이미지 명세. 위와 동일하게 흡수 완료 | 26.04 |
| `db-dumps/` | 삭제한 DB 테이블 2종의 전량 덤프(26.07.16). 자체 README 참조 | 26.07 |
| `hell-bar/` | **저승 술집 기획 4종 — 폐기(26.07.16).** 구현된 적 없다(컴포지션·레지스트리 등록 0). 가상 담화(`remotion/discourse.md`)가 대체한다 | 26.05 |
| `voice-file-manager.md` | 음성 파일 매니저 계획서. **실제로는 계획서 쓴 당일 구현 완료**(`84f06090`, 26.04.01)인데 TODO 표만 안 고쳐 "미착수"로 남아 있었다. 본문은 낡음(실제는 3단 구조·`cp`+`rm`) | 26.04 |

## 아카이브 기준

- **완료 보고서·회차 스냅샷·1회성 실행 지시서** → 작업 종료 시 이곳으로 옮기고 이 README 또는 해당 영역 README의 링크를 갱신한다.
- **현역 규격·규칙 문서** → 이곳에 두지 않는다. `docs/project/` 해당 영역에 둔다.
