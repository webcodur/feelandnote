# 단어 단위 voiceTimings 파이프라인 — 2026-03-23

## 개요

WhisperX 전사 + diff-match-patch 매핑으로 **단어별** 타임스탬프를 추출하여 voiceTimings를 생성한다.

## 파이프라인

```bash
pnpm voice -- --episode <name> --update-json    # 1. 음성 생성
python scripts/whisper-words.py --episode <name> # 2. 단어 타임스탬프 (whisperx + diff)
pnpm analyze -- --episode <name> --update-json   # 3. duration 동기화
```

## 핵심 로직

### whisper-words.py (WhisperX + diff-match-patch)

1. WhisperX로 오디오를 **순수 전사** → 단어별 타임스탬프 추출
2. 전사 텍스트와 원문을 **diff-match-patch**로 문자 단위 대조
3. EQUAL 구간을 기준으로 WhisperX 타임스탬프를 원문 단어에 이식
4. 매칭 실패 단어는 이전/다음에서 균등 보간

이 방식의 장점:
- WhisperX가 "인리아스로"로 잘못 인식해도 **타이밍은 정확** → diff가 "일리아스 로"에 매핑
- 한영 혼용("OpenAI", "Claude") 타겟도 타임스탬프 존재 (Whisper가 음성을 인식하므로)
- 원문 강제 정렬(forced alignment)의 영어 단어 누락 문제 없음

### analyze-voice.ts

- whisper-debug.json의 단어별 타이밍을 voiceTimings에 직접 저장
- 각 표시 단어 = 1개 세그먼트 (단어 단위)
- 경계 = 이전 단어 끝 ↔ 다음 단어 시작의 중앙 (무음 구간 한가운데서 전환)

### Typewriter.tsx (하이라이트 UI)

| 상태 | opacity | 색상 |
|------|---------|------|
| 읽을 단어 | 0.25 | 기본색 |
| 읽는 단어 | 0.25→1.0 (스윕) | 기본색→하이라이트색 (`color-mix` 블렌딩) |
| 읽은 단어 | 0.9 | 하이라이트색 30% 블렌딩 |

- 글자별 스윕: 단어 재생 시간의 60%에 걸쳐 왼→오 순차 밝아짐
- 읽는→읽은 전환: 0.3초 페이드아웃

## 적용 현황

- 16개 에피소드 voiceTimings 단어 단위 갱신 완료 (dario-amodei만 diff 방식, 나머지 추후 갱신)
- napoleon-bonaparte만 whisper 미실행

## 이력

| 날짜 | 변경 |
|------|------|
| 03-23 v1 | 갭 기반 문장 분할 (SENTENCE_SPLIT + 갭 매칭) |
| 03-23 v2 | 텍스트-우선 갭 매칭 (글자 비례 추정) |
| 03-23 v3 | 단어 단위 매핑 (Whisper 단어 비례 → 구두점 스냅) |
| 03-23 v4 | 순차 글자 소비 매핑 |
| 03-23 v5 | **WhisperX 전사 + diff-match-patch** (현행) |

v1~v4의 글자/단어 비례 추정은 Whisper 인식 오차로 드리프트 발생. diff-match-patch가 근본 해결.
