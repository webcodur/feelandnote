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

- 샘플 6명과 chunk-0001~0096, chunk-hold01을 처리했다(조회수 상위 576명). pass 3건(achilles,
  lee-hoe-yeong, sara-blakely), 나머지 573명은 재작성해 반영·게시했고 `verify-published`로 전원을
  DB에서 확인했다(26.09.29). 보류 인물은 없다.
- 음성은 미리 한꺼번에 내리지 않는다. apply-chunks가 묶음을 반영할 때 그 묶음의 재작성 인물 음성만
  내리고 새 본문을 올린 뒤 대기열에 넣는다(사용자 확인 26.09.29).
- 이름 속 라틴 약자 마침표(`사무엘 L. 잭슨`, `J.K. 롤링`)가 문장 경계로 잘리던 문제를 분할기에서 고쳤다
  (d3ea2564). 이 때문에 보류했던 5명과 옛 본명 프로필인 ahn-chae-yeon을 chunk-hold01로 되살려 반영했다.
- 음성: 09-29 08:21 하루 키 한도로 배치가 멈췄다(178개 중 114개 등록). 한도가 풀리는 16시 뒤에
  큐를 다시 만들어 이어 돈다. 품질 검사 보류(held) 25건은 새 run 폴더에서 다시 만든다.
- 서브에이전트 작업자는 호출 제한에 자주 걸린다. 걸리지 않을 때는 3개를 동시에 띄워 각자 3묶음씩 맡긴다.

## 다음

1. chunk-0097부터 이어 간다.
2. 음성 배치가 끝날 때마다 큐를 다시 만들어 이어 돌린다. 보류(held)분은 새 run 폴더에서 다시 만든다.
3. 끝나면 규칙 변경분이 룰북에 있는지 확인하고 이 문서와 README 줄, 임시 폴더를 지운다.
