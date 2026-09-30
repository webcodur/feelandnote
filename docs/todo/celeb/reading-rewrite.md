# 인물 안내 전량 개편

규격은 [`celeb-05-01-reading.md`](../../project/celeb/celeb-05-01-reading.md)가 쥔다. 폐기로 판정한 인물은
음성을 먼저 내리고 재작성·반영·게시한 뒤 새 본문의 음성을 만든다(같은 문서 「본문 교체와 음성」).
음성 작업 폴더와 이 PC의 실행 환경은 [`celeb-tts-reading.md`](../../continuous/celeb-tts-reading.md)가 쥔다.

## 착수 시점 현황 (26.09.28 실측)

- active 5,560명 전원에게 한영 안내가 있다. 게시 3,310명, 미게시 2,250명이다. 인물을 active로 바꿔도
  안내가 게시되지 않아 09-17·09-18 생성분이 거의 그대로 미게시로 남았다.
- `readings.ts --stats` 형식 검사에서 3,002명이 걸렸다(게시 중 2,068명).
- 형식을 통과한 2,558명도 09-18 생성분처럼 인명사전식 찬사로 채운 글이 섞여 있어 읽어서 판정한다.

## 작업 방식

노트북(D: 없음, subst로 붙임)의 `sw/web-bo/.tmp-celeb-reading/rewrite/`에서 돈다. 임시 폴더라 git에 없다.

- `queue/chunk-NNNN.json`: 작업 분배 단위(묶음). 조회수 높은 순으로 6명씩 끊은 926묶음(샘플 6명 제외
  5,554명)이다. `index.json`이 목록이다. `chunk-hold01`은 보류했다 되살린 6명이다.
- `WRITER_BRIEF.md`: 묶음 작업자 지시서. 작업자는 묶음마다 판정(pass·rewrite·hold)과 조사·재작성을
  `out/chunk-NNNN.json`에 쓰고 `scripts/celeb/reading/check-format.ts`로 형식을 통과시킨다.
- `tools/apply-chunks.mts`: 끝난 묶음을 검증해 음성 내림 → 반영·게시 → DB 재조회 → 음성 대기열
  (`audio-pending.json`) 추가 → `ledger.json` 기록까지 한다. 여러 묶음을 한 번에 넘길 수 있고,
  중간에 죽으면(끝줄이 `Node.js v20…`뿐) 그대로 다시 돌리면 된다.
- `tools/verify-published.mts <chunk…>`: 반영한 재작성 본문이 DB에 한영 그대로 게시됐는지 대조한다.
- `tools/audio-queue.mts` → run 폴더의 `run-audio.ps1`: 대기열에서 미등록분만 큐로 만들어 음성 배치를
  독립 프로세스로 띄운다. 무료 TTS 키가 하루 한도에 닿으면 `FREE_KEYS_EXHAUSTED: daily`로 멈추고,
  태평양 자정(한국 16시)에 풀린다.

## 진행

- 샘플 6명과 chunk-0001~0217, chunk-hold01을 처리했다. out 파일 1302명 기준 pass 125건, 나머지 1177명은
  재작성해 반영·게시했고 반영 직후 `verify-published`로 확인했다(26.09.29). 보류 인물은 없다.
- 문단 나눔(26.09.29 규칙): 한국어 300자·영어 450자 이상은 문장 경계에서 두 문단으로 쓴다(룰북 「형식」,
  `READING_FORMAT.paragraphs`). 바깥 작업이 3,827행을 먼저 나눴고, 이 작업이 처리한 744명 중 남은 긴
  한 문단 285건은 `tools/paragraphize.mts`로 나눠 DB와 out 파일에 반영했다. 앞으로 쓰는 원고는
  check-format·apply-chunks가 문단 나눔을 요구한다.
- 대명사(26.09.29 규칙): 여성은 그녀. 처리한 여성 137명 중 126명의 한국어 본문 370곳을
  `tools/pronoun-fix.mts`로 고쳤다. 다른 남성을 가리키던 5곳은 검토해 그로 남겼다. 영어 he/his는
  모두 남성 인물을 가리키는 것으로 확인했다. 새 묶음을 반영한 뒤에도 이 도구를 다시 돌린다.
  같은 날 `--all`로 active 여성 1,241명 전체에 넓혀 아직 묶음에 들지 않은 211명의 358곳을 더 고쳤다. 남성을
  가리키던 44곳(40명)은 전문 검토로 골라 `rewrite/pronoun-keep-male.json`에 두고 그로 남겼다. 여성으로 잘못
  기록된 vishnu·brahma는 `celebs.gender`를 남성으로 고쳤다.
- 대명사 수정으로 본문과 어긋난 한국어 음성 248개(여성)는 내리고 `audio-pending.json`에 넣었다(26.09.29 사용자 지시).
  61개 백업은 `C:/Users/webco/feelnnote-audio-backup/unpublish-pronoun-20260929`에 있다. 나머지 187개는 D: 외장
  디스크 run으로 내리던 중 디스크가 빠져 백업 위치를 확인하지 못했다. voice_v는 모두 올리고 캐시를 비웠다.
- D: 외장 디스크가 빠져 apply-chunks의 음성 내림 run을 `C:/Users/webco/feelnnote-audio-backup/celeb-reading-unpublish`로
  옮겼다. 옛 run 폴더(`D:/audios/...`)는 디스크를 다시 꽂아야 열린다.
- 문단 나눔으로 본문이 바뀐 인물은 기존 음성의 문장 강조가 꺼진다. `scripts/celeb/reading/paragraph-pause.mts`가
  문단 경계 두 문장 사이에 0.4초 무음을 넣고 강조 시각을 옮겨 다시 게시한다(26.09.29 전체 4,019명 실행,
  run 폴더 `D:/audios/interview-cleaner/celeb-reading-paragraph-pause-20260929`). 3,171명을 다시 게시했고 실패는
  없다. 강조 시각이 없는 1,133명, 본문이 바뀐 34명, 문장 경계가 맞지 않는 25명은 건너뛰었다. 빈 줄이 문장 하나로
  잡히던 `readingSentences` 버그도 고쳤다. 대명사가 바뀐 음성은 낱말이 달라 건너뛰며, 새 모델 전량
  재생성 때 다시 만든다.
- 음성 신규 생성은 중단했다(26.09.29 사용자 지시). 새 Gemini TTS 모델로 전량 재생성할 예정이라 기존 run
  폴더 배치는 다시 띄우지 않는다. apply-chunks의 음성 내림과 `audio-pending.json` 기록은 그대로 둔다.
- 26.09.29 pass 기준을 조정했다(`WRITER_BRIEF.md` 「판정」). 재작성하면 음성도 새로 만들어야 하므로,
  사실이 맞고 구체적인 장면이나 인과가 있으며 나열·찬사·흐름 밖 마무리 같은 실패가 없으면 문장이 최선이
  아니어도 둔다. 한국어 본문에 따옴표 인용이 있으면 재작성한다.
- 음성은 미리 한꺼번에 내리지 않는다. apply-chunks가 묶음을 반영할 때 그 묶음의 재작성 인물 음성만
  내리고 새 본문을 올린 뒤 대기열에 넣는다(사용자 확인 26.09.29).
- 이름 속 라틴 약자 마침표(`사무엘 L. 잭슨`, `J.K. 롤링`)가 문장 경계로 잘리던 문제를 분할기에서 고쳤다
  (d3ea2564). 이 때문에 보류했던 5명과 옛 본명 프로필인 ahn-chae-yeon을 chunk-hold01로 되살려 반영했다.
- 서브에이전트 작업자는 호출 제한에 자주 걸린다. 동시에 여러 개를 띄우면 걸리고, 하나씩 띄우면 대체로 통과한다.

## 다음

1. chunk-0218부터 이어 간다.
2. 음성은 새 모델로 전량 재생성할 때 다시 다룬다. 그때까지 배치를 띄우지 않는다.
3. 끝나면 규칙 변경분이 룰북에 있는지 확인하고 이 문서와 README 줄, 임시 폴더를 지운다.
