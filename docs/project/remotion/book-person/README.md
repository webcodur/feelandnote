# 책과 사람

나레이터 혼자 인물 한 명을 소개하고, 그 사람이 읽은 책을 이어서 소개하는 세로 쇼츠다. 서재 탐방은 그대로 둔다.

노래·효과음·셀럽 목소리는 없다. 책 권수는 편마다 다르다. 목록에 있는 만큼 차례로 말한다.

26.09부터는 **책 한 권이 한 편**인 형식을 주력으로 쓴다. 첫 문장이 "인물 + 이 책 + 한 일"이고, 문장마다 이미지가 바뀐다. 이때 `books` 항목 하나가 책이 아니라 **문장 하나**이며 `title`에는 같은 책 제목을 반복해 적는다. 폴더명은 `<셀럽 slug>-<책 키>`(예: `elon-musk-capital`)다. 왜 이 형식인지와 편별 도달점은 [`docs/continuous/book-person.md`](../../../continuous/book-person.md)가 쥔다.

## 형태

서재 탐방 쇼츠와 같은 틀이다. 1080×1920, 위 헤더 / 가운데 이미지 / 아래 자막. 맨 앞은 가운데 문장 제목 한 줄이고, 나레이터가 그걸 읽고 지나간다. 이어서 인물 소개와 책을 자막으로 말한다. 책을 말할 때 헤더 아래가 그 책 제목으로 바뀐다.

## 데이터

```
sw/remotion/public/book-person/<편>/ko.json
```

한 편에 쓰는 칸은 네 가지다.

| 칸 | 역할 |
|---|---|
| `person` | 인물 이름 |
| `role` | 인물 한 줄. 소개하는 동안 헤더 보조 |
| `lead` | 가운데 문장 제목. 나레이터가 읽고 지나간다 |
| `intro` | 인물 소개 나레이션 |
| `books` | 읽은 책 목록. 0권이어도 되고 몇 권이어도 된다 |

각 책은 `title`과 `text`가 필수다. 길이·그림·음성 파일명은 선택이다. 길이를 안 적으면 글자 수로 잰다. `lead`에도 `leadVoice`·`leadDuration`으로 음성과 길이를 붙일 수 있다.

이미지 파일명이 `cover.*`이면 표지로 보고 원본 비율로 가운데에 두며 뒤를 같은 이미지의 흐림으로 채운다. 그 밖의 이미지는 화면을 채우고 비트마다 확대·축소를 번갈아 건다. 한 권 형식 편에는 파일이 둘 더 있다.

| 파일 | 역할 |
|---|---|
| `facts.json` | 원고의 재료. DB 감상배경·출처·같은 인물의 다른 독서 기록. 검수 스크립트가 읽는다 |
| `credits.json` | 실사 이미지의 출처·작가·라이선스. 업로드 설명란에 옮긴다 |

```bash
pnpm --filter remotion exec node scripts/book-person/review.mjs <편>                 # 원고 검수 (agy, 무료)
pnpm --filter remotion exec tsx scripts/book-person/tts.ts --episode <편>            # 나레이션 (Gemini 무료 / --engine elevenlabs 유료)
pnpm render:staged -- --episode <편> --series book-person BookPerson-<편>-KO-S-VID out/BookPerson/<편>.mp4
```

`public/book-person/` 안의 다른 편이 정션에 걸려 있으면 CLI 직접 렌더는 EPERM으로 실패한다. 렌더는 창고(`render:staged`)를 거친다. 확인은 렌더가 아니라 Studio에서 한다.

폴더명은 셀럽 `slug`다. 감상기록이 없어도, 책이 없어도 한 편이 된다. 저장하기 전에는 파일이 없다.

```
http://localhost:3001/book-person
http://localhost:3001/book-person/elon-musk
http://localhost:3002/BookPerson-ElonMusk-KO-S-VID
```

샘플: `public/book-person/sample/ko.json`

## 백오피스

주소는 `/book-person`. 왼쪽 메뉴 영상 「책과 사람」. 셀럽 페이지가 아니다. 활성·비활성 인물을 다 보여 주고, 한 명을 고르면 그 사람 원고를 고친다. 첫 저장이 `ko.json`을 만든다. `REMOTION_LOCAL=1`이 켜져 있어야 저장된다.

오른쪽 사진 목록은 담화·세력도와 같은 공용 풀이다. 파일을 올리거나 바깥 주소를 받아 두고, 소개 칸과 각 책 칸에 끌어다 놓는다. 폴더는 탐색기로 열 수 있다. 칸에 붙은 사진은 `bg`(소개)와 각 책의 `image`에 저장된다.

## 스튜디오

폴더 `BookPerson`. 컴포지션 `BookPerson-<편>-KO-S-VID`.

```
http://localhost:3002/BookPerson-Sample-KO-S-VID
```
