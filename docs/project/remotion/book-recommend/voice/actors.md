# 서재탐방 음성 배정

## 고정 원칙

| 대상 | 엔진 | 보이스 | 비고 |
|------|------|--------|------|
| 해설·요약·SOLO 해설 | Gemini | `Charon` | 사실 설명, 책 요약, 감상 배경, 연결 문장 |
| 실제 인물의 검증된 발언 | ElevenLabs | 인물별 ELE ID | 진행 인물과 조연을 포함한 모든 등장인물 |

- 서재탐방에서 `Kore`는 사용하지 않는다.
- 실제 인물에게 `Puck`, `Orus`, `Iapetus` 등 Gemini 보이스를 배정하지 않는다.
- ELE ID가 없으면 GEM으로 임시 대체하지 않는다. ELE 후보를 캐스팅하고 청음한 뒤 ID를 등록해야 음성 설정이 완료된다.
- AI가 쓴 1인칭 감상문은 인물 대사가 아니다. 3인칭 해설로 고쳐 `Charon`이 읽는다.
- 인물 음성은 검증된 직접 인용에만 사용한다.

## 등록 방식

진행 인물은 에피소드 메타의 `host`에, 조연은 `speakers`에 기록한다.

```json
{
  "host": {
    "voiceEngine": "elevenlabs",
    "elevenlabsVoiceId": "<ELE voice id>"
  },
  "speakers": [
    {
      "id": "guest",
      "engine": "elevenlabs",
      "voiceId": "<ELE voice id>"
    }
  ]
}
```

진행 인물의 DB에 검증된 음성이 있으면 그 ID를 우선한다. 없으면 `sw/remotion/public/factions/_voice-casting/ele-voice-notes.json`에서 차단되지 않고 청음 기록이 있는 후보를 고른다. 에피소드 안에서 실제로 함께 말하는 인물끼리는 음색이 겹치지 않게 한다.

`host.geminiVoice`, 장면별 `geminiVoice`, `speakers[].engine: "gemini"`는 서재탐방 인물 배정에 사용하지 않는다.
