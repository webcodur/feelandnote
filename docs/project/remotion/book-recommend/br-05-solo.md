# 서재탐방 — 1권 모드(SOLO)

한 인물의 책 한 권을 16:9 자유 서술 영상으로 만드는 형식이다. 롱폼 책 정보는 공유하지만, 이야기 본문은 책 폴더의 SOLO 파일에 둔다.

## 현재 데이터 구조

```text
episodes/<person>/
  meta.ko.json
  books/NN-책이름/
    book.ko.json       책 정보와 롱폼 본문
    solo.ko.json       SOLO 자유 원고
    shorts.ko.json     쇼츠 원고가 있을 때
```

`solo.ko.json`의 `sections`가 SOLO 이야기의 원본이다. 인사, 책 제목, 아웃트로는 인물·책 정보에서 자동으로 붙는다.

```json
{
  "sections": [
    {
      "id": "s1",
      "text": "본문",
      "voice": "tts",
      "kind": "narration"
    }
  ]
}
```

선택 정보:

- `voice: "actor"` — 인물 음성
- `speaker: "host"` 또는 `meta.ko.json`의 등록 화자 ID
- `kind: "quote"` — 인용 강조
- `quoteSource` — 인용 출처
- `image`, `imageChangeAt` — 이미지와 전환점

장면 `id`는 음성 파일과 시각 정보의 기준이므로 텍스트 편집 중 바꾸지 않는다.

## 원고와 음성 단위

- SOLO 기본 해설 성우는 `Charon`이다. 인물의 실제 발언은 `speaker`에 지정된 ELE 성우가 읽으며 Gemini로 대신하지 않는다.
- 같은 화자가 이어서 설명하는 관련 문단은 대체로 **두 문단 전후를 한 장면·한 음성 파일**로 묶는다. 같은 논지를 잇는 짧은 셋째 문단은 따로 떼지 않고 앞 장면에 붙인다.
- 화면을 자주 바꾸려고 문단마다 장면을 쪼개지 않는다. 이야기의 주제가 바뀌거나 화자가 바뀌거나, 별도 인용·연기가 필요할 때만 나눈다.
- 인물의 실제 발언은 앞뒤 해설과 합치지 않고 독립된 배우 장면으로 둔다.

## 원고 작업

JSON을 직접 읽으며 스토리를 다듬지 않는다.

```bash
# 한 권을 Markdown 편집 원고로 추출
node sw/remotion/scripts/extract-story.mjs <person> --solo=N

# 수정본의 변경 예정 확인
node sw/remotion/scripts/sync-solo-story.mjs <story.md>

# 확정된 본문만 반영
node sw/remotion/scripts/sync-solo-story.mjs <story.md> --apply
```

반영 도구는 장면 개수·번호·순서가 바뀌면 중단하며 `text`만 갱신한다. 화자·출처·이미지·음성 설정은 보존한다. 장면 추가나 배우 변경은 JSON 구조 작업으로 따로 처리한다.

## 영상 조립

`solo-build.ts`가 다음 순서로 영상을 만든다.

```text
인사 → 책 안내 → 제목·표지 → 자유 원고 → 아웃트로
```

음성이 있으면 실제 음성 시각을 사용하고, 없으면 글자 수로 길이를 추정한다. 자유 원고의 배우 대사는 `speaker`에 등록된 음색을 사용한다.

## 텍스트 확정 뒤

1. JSON 파싱과 장면 번호 중복 확인
2. 배우 대사에 화자 지정이 있는지 확인
3. 이미지 연결과 본문 앵커 확인
4. 사용자 승인 뒤 음성 생성
5. 같은 해설자가 읽는 장면이 한 문단씩 잘게 끊기지 않았는지 확인
6. 받아쓰기·자막 시각·의미 단위 분할
7. 렌더와 업로드 정보 확인

텍스트를 바꾼 뒤 기존 음성이나 자막 시각이 자동으로 맞는다고 가정하지 않는다. 유료 음성 생성은 사용자 지시 없이 실행하지 않는다.
