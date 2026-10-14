# 천도 게임 개발 룰북

게임 규격은 [README](README.md)에서 찾고, 모듈 진입점은 [기술 구조](08-tech.md)를 따른다. 수정할 엔진과 호출 화면을 함께 읽고, 실행 수치와 허용값은 `constants.ts`·`map.ts`를 고친다.

플레이어·AI·화면 미리보기가 같은 명령·확률·전력·수지 함수를 사용해야 한다. 상태를 바꾸는 함수에는 복제한 판을 넘기고, 엔진 안의 난수는 `rng.ts`를 사용한다. 정렬 비교 함수 안에서 난수를 새로 뽑지 않는다.

DB 조회는 공개 명부와 필요한 대사만 읽는다. 명부 직렬화는 `roster-data.ts`를 서비스와 실 DB 검사에서 공유한다. 게임 진행을 위한 테이블·컬럼이나 별도 원장을 만들지 않는다.

## 검증

`sw/web`에서 실행한다.

```powershell
pnpm exec tsc --noEmit --incremental false
pnpm exec tsx --test src/lib/game/suikoden/game.test.ts
node --env-file=.env --import tsx scripts/tests/game-engine-data-audit.ts
```

브라우저에서는 `/rest?dev=1#suikoden`과 `/en/rest?dev=1#suikoden`에서 제목·주군·방랑·거병·명령·월 진행·전투·결말·저장·이어하기를 확인한다. 좁은 화면과 키보드 선택도 확인한다.

빌드는 루트의 개발 서버 안전 규칙을 따른다. 검증용 산출 경로는 `next.config.ts`의 `NEXT_DIST_DIR`로 분리할 수 있다. 검증 뒤 생성된 산출물은 작업 파일 관리 원칙에 따라 정리한다.
