---
name: remo-resource-scanner
description: Remotion 서재탐방 에피소드의 롱폼·쇼츠·SOLO 원고, 음성, 이미지 위치와 책 순서를 찾는다. “젠슨 황 원고 어디야”, “쇼츠 몇 편이 무슨 책이야”, “SOLO 자료 찾아줘”처럼 자산 위치와 연결 관계를 확인할 때 사용한다.
---

# 서재탐방 자산 찾기

기본 위치는 `sw/remotion/public/episodes/<person>/`이다.

```text
meta.ko.json                         인물·해설자·공통 음성
books/NN-책이름/book.ko.json         롱폼 책 본문
books/NN-책이름/shorts.ko.json       해당 책 쇼츠
books/NN-책이름/solo.ko.json         해당 책 SOLO 자유 원고
voice/ko/                            생성 음성
```

`books/`의 `NN-` 번호순이 책 순서다. 쇼츠 슬롯과 업로드 충돌까지 확인해야 하면 `remo-shorts-slot-map`을 사용한다.

이야기 통독은 JSON을 직접 펼치지 말고 다음 명령을 쓴다.

```bash
node sw/remotion/scripts/extract-story.mjs <person>
node sw/remotion/scripts/extract-story.mjs <person> --solo
node sw/remotion/scripts/extract-story.mjs <person> --solo=N
```

파일이 없다고 추정 경로를 만들지 않는다. `_status.json`, 실제 책 폴더, 로더 코드를 확인해 현재 구조를 판정한다.
