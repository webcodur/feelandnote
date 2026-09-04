# 기본 프로필

모든 인물은 티어와 무관하게 같은 기본 프로필을 가진다. 이 문서는 기본 프로필 한 건의 결과 계약과 등록 기본값만 쥔다. 이름·직군·성별·국적·생몰처럼 조사해 판정하는 값은 [`celeb-01-01-profile-facts.md`](celeb-01-01-profile-facts.md), 이용자에게 보이는 소개 문구는 [`celeb-01-02-profile-intro.md`](celeb-01-02-profile-intro.md)를 따른다.

## 결과 계약

```json
{
  "nickname": "한국어 이름",
  "nickname_en": "영문 이름",
  "profession": "직군 코드",
  "nationality": "ISO 3166-1 alpha-2 국가 코드",
  "gender": true,
  "birth_date": "YYYY-MM-DD 또는 연도",
  "death_date": "YYYY-MM-DD, 연도 또는 빈 문자열",
  "bio": "한국어 소개",
  "bio_en": "English introduction",
  "title": "한국어 수식어",
  "title_en": "English epithet",
  "headline": "한국어 한 줄 정의",
  "headline_en": "English headline",
  "is_verified": false
}
```

- `gender`는 남성 `true`, 여성 `false`, 판정 불가·해당 없음은 `null`이다.
- 기원전 연도는 음수로 쓴다.
- 값 안의 큰따옴표는 작은따옴표로 바꿔 JSON을 깨뜨리지 않는다.
- 공개된 기존 인물의 영문 결손만 [`celeb-09-01-i18n.md`](celeb-09-01-i18n.md)의 공용 백필로 보완한다.

## 등록 기본값

- 셀럽은 로그인 계정이 아니다. `auth.users`나 가짜 이메일을 만들지 않는다.
- 신규 인물은 실존 축과 무관하게 `light`로 시작한다. 실존 축은 등록 시 고르며 기본값은 `REAL`이다.
- 공개 상태의 기본값은 `inactive`, 공식 인증 여부의 기본값은 `false`다. `active` 전환은 기본 프로필 생성과 분리한다.
- UUID·slug·`celeb_metrics` 초기 행은 정식 등록 경로가 만든다. slug의 원천은 `nickname_en`이며 직접 작성하지 않는다.
- 명언은 기본 프로필에 넣지 않는다. 정본은 `celeb_dialogues.lines.quote`·`lines_en.quote`이고 [`celeb-04-01-speech.md`](celeb-04-01-speech.md)의 「한마디 작성·검수」가 맡는다.
- `celeb_reality='FICTION'`은 기본 프로필만 만들었다고 끝나지 않는다. 인물이 실제 등장하거나 인물을 다루는 작품을 확인해 `figure_book_*` 관계까지 연결한다. 현재 규칙은 [`celeb-00-01-pipeline.md`](celeb-00-01-pipeline.md)의 「원전·등장 도서 연결」이 쥔다.
- `celeb_tier`(`full`·`light`)는 감상 콘텐츠 파이프라인의 단계만 정한다. 세상이 그 인물의 실존을 어떻게 보는지는 별도 축 `celeb_reality`(`REAL`·`BOTH`·`FICTION`)가 쥔다 — 단군왕검·주몽처럼 실존 핵심과 신화 층위가 함께 있는 인물은 `celeb_reality='BOTH'`다. 자세한 구분은 [`celeb-00-01-pipeline.md`](celeb-00-01-pipeline.md)의 「존재와 속성을 구분한다」가 쥔다.
