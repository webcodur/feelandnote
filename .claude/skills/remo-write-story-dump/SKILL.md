---
name: remo-write-story-dump
description: 서재탐방 롱폼·쇼츠·SOLO JSON에서 이야기만 Markdown 편집 원고로 추출한다. JSON 구조를 보지 않고 통독·자료검증·문장수정을 할 때 사용한다. SOLO는 확정된 Markdown 본문만 원래 JSON에 안전하게 되돌릴 수 있다. /remo-write-story-dump 에피소드명.
---

# 서재탐방 편집 원고

스토리 작업은 JSON에서 시작하지 않는다. 먼저 Markdown을 뽑아 전체를 읽고, 텍스트가 확정된 뒤 제작 데이터에 반영한다.

## 추출

```bash
# 롱폼과 쇼츠
node sw/remotion/scripts/extract-story.mjs <person>

# SOLO 전체 또는 한 권
node sw/remotion/scripts/extract-story.mjs <person> --solo
node sw/remotion/scripts/extract-story.mjs <person> --solo=2

# 영문
node sw/remotion/scripts/extract-story.mjs <person>-en --solo
```

출력은 검토용 Markdown이다. 파일로 보관할 때는 에피소드의 `_writer/` 또는 작업 중인 임시 위치를 사용한다. 책 폴더에 제2의 원본처럼 상시 보관하지 않는다.

## SOLO 편집 규칙

- `SOLO_SECTION` 표식 사이의 본문만 고친다.
- 제목, 장면 번호, 표식, 화자, 출처 설명은 고치지 않는다.
- 같은 화자의 관련된 해설은 대체로 두 문단 전후를 한 장면·한 음성 파일로 묶는다. 두 문단은 상한이 아니며, 같은 논지를 잇는 짧은 셋째 문단은 앞 장면에 붙인다. 문단마다 잘게 나누지 않는다.
- 인물의 실제 발언은 앞뒤 해설과 합치지 않고 독립된 배우 장면으로 유지한다.
- 장면 추가·삭제·순서 변경, 배우 지정, 출처, 이미지 연결은 JSON 구조 작업으로 따로 처리한다.
- 자료조사와 사실검증이 끝나기 전에는 반영하지 않는다.

## SOLO 반영

```bash
# 변경 예정 확인
node sw/remotion/scripts/sync-solo-story.mjs <story.md>

# 확정본 반영
node sw/remotion/scripts/sync-solo-story.mjs <story.md> --apply
```

반영 도구는 다음을 보장한다.

- 기존 장면 번호·개수·순서가 달라지면 중단
- `text`만 변경
- 화자·음성·출처·이미지 정보 보존
- 기본 동작은 미리보기이며 `--apply` 없이는 쓰지 않음

반영 후 JSON 파싱, 중복 장면 번호, 배우 화자 누락, 이미지 앵커, 음성 재생성 필요 여부를 별도로 검사한다.

## 역할 경계

이 스킬은 원고 추출과 SOLO 본문 반영만 담당한다. 서사 평가는 `remo-write-3-story-power`, 사실검증은 `remo-write-1-fact-check`, 한국어 문장은 `remo-write-4-prose`를 사용한다.
