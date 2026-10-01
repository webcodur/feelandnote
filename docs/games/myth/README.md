# 신화 게임

> **마지막 코드 대조: 26.09.28** — 여덟 게임을 실제 DB(개발 서버)로 한 판씩 끝까지 돌리고, 영어·390px 폭 첫 화면을 확인했다.

「신화의 세계」에 실린 신화 인물·무리·관계로 만든 게임 묶음이다. 실험 구역이라 개발 서버에서만 열린다(`/lab`은 운영에서 `notFound`). 공개 쉼터(`/rest`)에는 올리지 않았다.

## 진입

| 주소 | 화면 |
|---|---|
| `/lab/games/myth` | 신화 게임 목록. `/lab/games` 맨 위에서 들어간다 |
| `/lab/games/myth/<키>` | 게임 하나. 들어가면 바로 전체화면이고, 나가기(ESC)는 목록으로 돌아간다 |

목록과 표지는 `sw/web/src/components/features/game/myth/registry.ts`, 게임 이름·규칙 문구는 `sw/web/messages/{ko,en}/game-myth.json`의 `gameMyth.<키>`가 쥔다.

## 게임

| 키 | 이름 | 하는 일 | 쓰는 데이터 |
|---|---|---|---|
| `sort` | 신화 가르기 | 얼굴을 보고 60초 동안 신화권(지역)별로 가른다. 세 번 이어 맞힐 때마다 배수가 오른다 | 인물 아바타, 소속 신화의 지역 |
| `odd` | 다른 하나 찾기 | 한 무리 넷과 섞여 든 하나 가운데 하나를 고른다. 이어 맞힐수록 같은 신화 안의 다른 무리에서 섞인다 | 신화 무리(`faction_lv3`) |
| `blank` | 빈칸 인물 맞히기 | 관계 설명 한 줄에서 가린 이름을 보기 넷 가운데 고른다 | 관계 설명(`celeb_relations.note`) |
| `path` | 관계 잇기 | 출발 인물에서 관계를 한 칸씩 밟아 도착 인물까지 간다. 걸음마다 가까워졌는지와 두 사람 이야기를 보인다 | 관계망 |
| `guess` | 인물 추리 | 몰래 고른 한 명을 성별·무리·관계 질문으로 좁혀 맞힌다 | 성별, 무리, 관계 |
| `seat` | 연회 자리 배치 | 부부·연인은 나란히, 맞선 사이는 떨어뜨리고, 부모와 자식은 마주 보게 둥근 상에 앉힌다. 연회 주인은 아가톤이다 | 관계(부부·연인·부모·맞선 사이) |
| `voyage` | 오디세우스의 귀향 | 트로이에서 이타카까지 기항지마다 선택해 배·선원·세월·포세이돈의 분노·아테나의 도움을 관리한다. 결말 여섯 가지 | 오디세이아 인물 사진, 신화 테마곡 |
| `labors` | 헤라클레스의 열두 과업 | 열두 과업 가운데 여섯을 손으로 푼다(사자 조르기·히드라 지지기·물길 돌리기·새 쏘기·아틀라스 속이기·케르베로스 누르기) | 헤라클레스 신화 인물 사진 |
| `troy` | 트로이 전쟁 | 그리스군을 이끌고 상륙부터 목마까지 열 장을 칸 위에서 싸운다(조조전식 전술 RPG). 3D 디오라마 판, 장마다 사건과 이야기, 영웅 수준이 장을 넘어 이어진다 | 『일리아스』 명단 인물(이름·아바타·대표 사진), 관계(인연·맞수), 인물 고유 대사 |

`voyage`의 장면은 『오디세이아』, `labors`의 과업은 아폴로도로스 『비블리오테케』 2권 5장의 차례와 사건을 따른다. 호메로스와 다른 선택을 고르면 결과 화면이 「호메로스와 다른 길」이라고 알린다. 그 갈래와 게임 수치(배 한 척 50명, 판정 확률)는 게임이 지은 값이다. 장면 글은 두 게임 폴더의 `stops/`·`content.ts`에 두 언어로 둔다(공용 문구 파일에 올리면 다른 화면 응답에도 실린다).

인물 능력치를 DB에서 가져오는 수치 전투는 만들지 않았다. 신화 인물 915명 가운데 성향 수치(`celeb_persona`)가 있는 인물은 143명뿐이라, 나머지는 값을 지어내야 한다. `troy`의 병과·능력치도 DB 값이 아니라 게임이 지은 값이다.

## 트로이 전쟁(`troy`)
- 자리: `sw/web/src/components/features/game/myth/troy/` — `engine/`(규칙·AI, 순수 TS), `scene/`(three.js 3D 판), `campaign/`(장 지도·배치·사건·영웅 명단·저장), `story/`(장면 글, 두 언어), `ui/`(화면). 문구는 자기 파일 `messages/{ko,en}/game-myth-troy.json`(`gameMythTroy`)에 둔다.
- 모델: `sw/web/public/models/myth-troy/*.glb` 43종(장수 말·건물·소품, 목마는 문이 열린 `horse`와 닫힌 `horseClosed` 두 벌 — 닫힌 목마는 10장 이야기 배경에만 쓴다). 원본은 `sw/web/scripts/myth-troy-models/`의 Blender 스크립트이고, 저장소 뿌리에서 `Blender -b --factory-startup -P sw/web/scripts/myth-troy-models/build_all.py`로 굽고 `node sw/web/scripts/myth-troy-models/check_glb.mjs`로 three.js 읽기를 확인한다. 파일이 없거나 깨진 모델은 3D 판이 도형으로 대신 그린다.
- DB: 『일리아스』 명단(`homer-iliad`)의 인물과 그 사이 관계만 `pool.ts`가 추린다. 부부·형제·벗 같은 관계는 인연(곁에 서면 명중·회피·방어가 오른다), `rival`은 맞수(처음 맞붙을 때 두 사람의 장면을 띄우고 치명이 오른다)다. 인물 고유 대사(`celeb_dialogues`)는 싸움 외침(`clash_attack`)·출진 준비의 대답(`roll_call`)·이긴 뒤 한마디(`battle_win`)로 쓴다. DB 대사는 특정 장면을 떠올리며 쓴 줄이 많아서, 장 배경(배·성벽·성문·밤·트로이 함락)·이야기에서 죽은 인물(복수·추모 줄)·곁의 우리 편·싸우는 상대에 맞는 줄만 고른다. 규칙은 `campaign/lineRules.ts`, 장마다의 배경은 `campaign/lineScene.ts`가 쥔다. 판에 서는 인물의 아바타는 서버가 128px data URL 얼굴 메달로 바꿔 넘긴다(아바타 저장소에 CORS가 없다).
- 게임이 지은 값: 병과·무기·기술·능력치·경험치(`engine/tables.ts`, `campaign/heroes.ts`·`foes.ts`), 장 지도와 사건(`campaign/chNN.ts`). 장면 글은 『일리아스』·서사시권 요약·『오디세이아』·『아이네이스』를 따르고, 이음 대사를 넣은 곳은 각 장 파일 주석에 출전과 함께 적었다.
- 호메로스와 다른 길: 4장에서 파트로클로스가, 8장에서 안틸로코스가 살아서 이기면 다른 결말 장면을 틀고 결과 화면이 알린다. 이야기에서 죽는 영웅(파트로클로스·안틸로코스·아킬레우스·대 아이아스)은 다음 장 명단에서 빠지고, 그 밖에 쓰러진 영웅은 다음 장에 돌아온다.
- 저장: 브라우저 `localStorage`의 `myth-troy:v1`(난이도·이긴 장·가장 빠른 판·영웅 수준·이야기 표지·싸우던 판)과 `myth-troy:fast`(빠르게). 우리 차례가 열릴 때마다 싸우던 판을 적어 이어 할 수 있다.
- 난이도·균형: 출진 준비에서 쉬움·보통·어려움을 언제든 고른다. 난이도는 적(사건으로 나오는 원군 포함)의 능력치만 바꾸고 수준·우리 편·아군은 그대로 둔다(`campaign/difficulty.ts`). 적 수준은 장 자료(`campaign/chNN.ts`)에 곧바로 적은 값이 기준이고, 경험치가 수준 차로 셈해지므로 난이도로 수준을 옮기지 않는다. 출진하지 않은 영웅도 진영에서 몫을 받아(`campaign/progress.ts`의 `benchExp`) 반드시 나가야 하는 장에서 혼자 뒤처지지 않는다. 균형은 `campaign/journey.test.ts`가 지킨다 — 실제 진행 코드로 수준을 이어 가며 조심스러운 AI로 열 장을 돌고, 쉬움·보통이 시험에 적은 판 수 안에 넘는지 본다. 어려움은 시험에 묶지 않았다.
- 성능: 3D 판은 여러 초 이어 느리면 스스로 픽셀 배율을 한 단씩 낮추고(`scene/perfGovernor.ts`, 2 → 1.5 → 1.25 → 1 → 0.75), 메모리 3GB 이하·코어 셋 이하 기기는 처음부터 그림자 없는 낮은 품질로 연다(`scene/BoardCanvas.tsx`).
- 조작: 장수 → 칸(움직이기) 또는 적(예측) → 「공격하기」나 적을 한 번 더 눌러 친다. PC에서 갈 칸을 가리키면 걸어갈 길이 먼저 그려진다. 장수 칸에는 승패가 걸린 장수(쓰러지면 패배·쓰러뜨리면 승리) 표시가 붙고, 싸우는 법은 「목표」 펼침에서 다시 연다. 기술은 누르면 설명 칸(`ui/battle/SkillSheet.tsx`)이 먼저 뜬다. 아직 움직이지 않은 장수가 있으면 「차례 끝내기」를 한 번 더 눌러야 끝난다. 「빠르게」는 카메라 단추 줄과 적 차례 안내에 있고 브라우저에 기억한다(`ui/battle/useBattleSpeed.ts`, 판 연출 시계 `scene/tween.ts`의 `scale`). 판 누름은 말 몸통 원기둥과 얼굴 메달, 칸 기둥으로 가린다(`scene/picking.ts`). 판 위에 뜬 단추 줄은 단추만 누름을 받고 빈틈은 판으로 넘긴다. 손가락 화면은 두 손가락으로 확대하므로 확대 단추를 숨긴다. 진 판 결과는 진 까닭(쓰러진 대장이나 지는 조건)을 앞세우고, 남지 않는 경험은 보이지 않는다.
- 나가기: 싸움판에서 ESC는 「취소」라서 다른 게임과 달리 ESC로 나가지 않는다. 나가기는 화면 왼쪽 위 단추가 맡는다.
- 검수 손잡이(개발 서버에서만): `?chapter=chNN`은 그 장의 출진 준비부터 열고, `window.__troy`는 판 상태 읽기·칸 누르기·우리 편 AI로 한 차례 두기를 연다.

## 데이터

- 진입점은 `sw/web/src/actions/game/myth/getMythWorld.ts` 하나다. 공개 신화(`faction_lv2.is_myth`·`published`)의 숨기지 않은 배정과 활성 인물, 그 인물들 사이의 관계를 두 언어로 읽어 캐시한다(`CACHE_TAGS.FACTIONS`·`CELEBS`). 인물 목록과 관계는 캐시를 나눠 한 항목이 커지지 않게 했다.
- 관계는 `resolveWorld.ts`가 표준 방향(「to가 from의 type」) 하나로 맞추고 같은 사실을 한 줄로 합친다. 보는 사람 쪽 이름표는 `shared/relations.ts`가 정한다.
- 게임마다 `pool.ts`가 서버에서 필요한 값만 추려 화면에 넘긴다. 전체 데이터는 브라우저로 가지 않는다.
- DB 연결값(`NEXT_PUBLIC_DB_API_URL`·`NEXT_PUBLIC_DB_PUBLISHABLE_KEY`)이 없거나 조회가 실패하면 체험 표본(`shared/fixture.json`, 실제 DB에서 뽑은 신화 9개·인물 216명·관계 331건)으로 돌고, 화면 위에 표본 모드임을 띄운다. 실패 이유는 서버 기록에 남긴다.
- 표본 다시 뽑기(읽기 전용): `sw/web`에서 `node --env-file=<DB 키가 든 .env> scripts/build-myth-game-fixture.mjs`
- 최고 기록과 찾은 결말은 브라우저 `localStorage`에만 남긴다. 서버에 쓰는 값은 없다.

## 검증

```bash
# sw/web에서 — 여덟 게임의 규칙 엔진(판 생성·판정·완주 흉내) 26건
pnpm exec tsx --test src/components/features/game/myth/*/engine.test.ts src/components/features/game/myth/labors/pipes.test.ts
# 트로이 전쟁 — 규칙 엔진, 장 자료 검사, 수준을 이어 가는 열 장 원정(난이도별), 대사 거르기, 동적 해상도
pnpm exec tsx --test src/components/features/game/myth/troy/engine/*.test.ts src/components/features/game/myth/troy/campaign/*.test.ts src/components/features/game/myth/troy/scene/*.test.ts
```

엔진 시험은 표본 데이터로 게임마다 여러 판을 끝까지 돌려 빈 문제·답 중복·풀 수 없는 판·막다른 장면이 없는지 본다. 화면은 개발 서버에서 한국어·영어, 1280px·390px로 확인했다. 조작감(히드라 제한 시간, 새 속도 같은 값)은 사람이 해 보고 고칠 여지가 있다.
