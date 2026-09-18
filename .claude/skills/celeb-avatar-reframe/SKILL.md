---
name: celeb-avatar-reframe
description: 이미 등록된 배경 제거 아바타의 빛 방향을 한쪽으로 맞추고 정수리·쇄골 실루엣 기준으로 다시 잘라 팩션·명단 단위로 균일하게 맞춘 뒤 R2·DB에 재등록한다. "아바타 규격 통일", "얼굴 위치 제각각", "팩션 아바타 재배치", "정수리·쇄골 맞춰", "빛 방향 통일" 요청에 사용한다. 신규 원본에서 아바타를 만드는 일은 celeb-avatar-register가 맡는다.
---

# 셀럽 아바타 재배치

눈·턱 규격에 합격한 아바타도 정수리 여백과 턱 아래 몸통 양이 제각각이면 나란히 놓았을 때 흐트러진다. 이 스킬은 등록된 아바타를 내려받아 알파 실루엣으로 정수리를, 랜드마크로 눈·턱을 재고 같은 규격으로 다시 자른 뒤 재등록한다. 규격의 뜻은 [`docs/project/celeb/celeb-08-01-avatar.md`](../../../docs/project/celeb/celeb-08-01-avatar.md) 「정규화」, 값은 `sw/web-bo/src/lib/avatar-geometry.ts`의 `AVATAR_SILHOUETTE_SPEC`·`AVATAR_LIGHT_SPEC`이 쥔다. 숫자를 여기 다시 적지 않는다. 등록·교체 배치의 마지막 단계로 `celeb-avatar-register`가 이 스킬을 호출한다.

## 책임 경계

- 크롭 계산: `avatar-geometry.ts`의 `computeCropFromSilhouette`
- 대상 내려받기(팩션·유형·증분·명단): `sw/web-bo/scripts/avatar/pull-avatars.mjs`
- 빛 방향 판정·반전: `sw/web-bo/scripts/avatar/light-unify.ts`
- 회전·기울기 분포 계측: `sw/web-bo/scripts/avatar/landmark-dump.ts`
- 재배치·대조 시트: `sw/web-bo/scripts/avatar/reframe.ts`
- 일괄 재등록: `sw/web-bo/scripts/avatar/upload-reframed.ts` (단건은 `upload-local.ts`)
- 전수 드라이버: `sw/web-bo/scripts/avatar/normalize-all.sh <REALITY> <from> <to>` — 200명 배치로 내려받기→빛→재배치→등록을 잇는다. `ONLY_FLIPPED=1`을 주면 뒤집힌 인물만 재등록한다(빛 방향만 다시 맞추는 회차용). 시트 없이 바로 올리므로 사용자가 전수 적용을 지시한 경우에만 쓴다
- 등록 후 확인: `sw/web-bo/scripts/avatar/contact-sheet.ts`

배경이 지워진(알파 있는) 아바타만 대상이다. 배경이 있는 아바타는 `nobg-cutout`을 먼저 거친다. 신원·원본 교체·신규 제작은 `celeb-avatar-register`가 맡는다.

## 절차

모두 `sw/web-bo`에서 실행한다. 원본은 1단계 폴더에 그대로 남아 롤백 자료가 된다. 지우지 않는다.

1. **내려받기.** 네 가지 조건 중 하나로 고른다. 출력은 `<repo>/_backup/faction-avatars/<조건 이름>/`이고 파일명 `<정렬번호>-<slug>.webp`에서 뒤 단계가 slug를 읽는다.

   ```bash
   node scripts/avatar/pull-avatars.mjs --faction <팩션명|slug>                 # 팩션 한 명단. 후보가 여럿이면 목록만 보여주고 멈춘다
   node scripts/avatar/pull-avatars.mjs --reality FICTION --offset 0 --limit 200 # 유형별 전수를 200명씩. celeb_reality는 REAL·FICTION·BOTH 세 값이다
   node scripts/avatar/pull-avatars.mjs --since 2026-09-18T00:00:00Z           # 커서 이후 등록·교체분(증분 운영)
   node scripts/avatar/pull-avatars.mjs --slugs a,b,c                           # 명시 명단
   ```

2. **빛 방향 통일.** 반대쪽 광원인 이미지를 뒤집어 새 폴더에 쓴다. 실존·허구 구분 없이 뒤집는 것이 기본이다(`--skip-real`은 특수 회차에만). 안대·외눈·글자가 있는 인물은 `--exclude`로 뺀다. 재배치보다 먼저 돌린다 — 뒤집으면 부각된 쪽이 바뀐다.

   ```bash
   npx tsx scripts/avatar/light-unify.ts ../../_backup/faction-avatars/<slug> ../../_backup/faction-avatars/<slug>-lit
   ```

3. **재배치.** 대조 시트를 반드시 함께 만든다. 입력은 2단계 출력이다.

   ```bash
   npx tsx scripts/avatar/reframe.ts ../../_backup/faction-avatars/<slug>-lit ../../_backup/faction-avatars/<slug>-reframed --sheet
   ```

4. **시트 검수.** `_sheet-*.png`(각 쌍 왼쪽 전·오른쪽 후)를 직접 연다. 기계가 못 보는 것을 본다 — 정수리가 잘렸는가, 턱 아래에 가슴이 남았는가, 얼굴이 좌우로 밀렸는가, 확대로 뭉개졌는가. `_report.json`의 `decidedBy`·`warnings`·`upscale`로 의심 인물을 먼저 고른다.
   - `eye-line`·`min-span`: 머리숱·투구·날개 때문에 하단을 고정하고 확대해 정수리를 잘랐다. 장식·머리카락이 잘린 것은 허용, 얼굴(이마·눈썹)이 잘렸으면 불합격.
   - `source-top`: 원본에서 이미 정수리가 위에 붙어 여백을 못 만들었다. 정상.
   - 가로 기준은 `horizontalAnchor`가 정한다 — 정면·약한 부각은 턱선 양끝 중점을, 부각이 강한 3/4 얼굴은 부각된 쪽 눈 쪽으로 보간해 내민 얼굴면을 중앙에 둔다. 출력의 `왼쪽/오른쪽 부각`은 얼굴이 향한 쪽을 알려주는 진단 표시다. 실루엣이 원본 가장자리에 닿아 못 움직였으면 `가로 위치가 N단위 밀렸다` 경고가 남는다.
   - `upscale` 1.3 이상: 원본이 규격보다 많이 넓었다. 뭉개짐을 확대 화면에서 확인한다.
   - 얼굴 미검출(외눈·짐승·가면)은 건너뛴다. 필요하면 사람이 관리자 크롭 창에서 자른다.
   - `실루엣 없음`이나 얼굴 미검출로 건너뛴 인물이 모피·갈기·큰 머리·모자처럼 프레임 가장자리까지 차 있는 원본이면, 28% 안팎의 투명 패딩을 붙여 다시 돌린다. 실루엣이 성립해 재배치가 되고, 미검출이던 얼굴도 살아나는 경우가 있다(2026-09-18, sinfjotli·meir-dagan 등 8명 회수).

5. **등록.** 사용자가 등록을 지시한 뒤에만 실행한다. 재배치 폴더에서 slug를 읽어 DB 인물과 대조하고 한 장씩 올린다. 문제 인물은 `--only`로 빼거나 폴더에서 치운다.

   ```bash
   npx tsx scripts/avatar/upload-reframed.ts ../../_backup/faction-avatars/<slug>-reframed --dry-run
   npx tsx scripts/avatar/upload-reframed.ts ../../_backup/faction-avatars/<slug>-reframed
   ```

   `celebs.avatar_url`이 바뀌면 DB 트리거가 **운영** 웹 캐시를 스스로 만료한다. 로컬 개발 서버는 대상이 아니라 옛 아바타가 남는다 — 로컬 화면으로 확인하려면 `sw/web/.env`의 `CRON_SECRET`으로 `localhost:3000/api/revalidate`에 `celebs` 태그를 한 번 던진다. stale-while-revalidate라 첫 요청은 옛값을 주고 두 번째 요청부터 새 값이 나온다. 로컬 `.env`에 Cloudflare 키가 있으면 운영 앞단 퍼지도 함께 일어나므로 보고에 적는다.

6. **확인.** 서비스에 올라간 것을 다시 받아 격자로 본다.

   ```bash
   npx tsx scripts/avatar/contact-sheet.ts --out <출력폴더> --slugs <a,b,c> --no-guides
   ```

## 보고

대상 수, 성공·건너뜀·실패, 반전 인원과 제외 사유, `decidedBy` 분포, 눈~턱 비율과 정수리 여백의 중앙값·범위, 최대 확대 배율, 직접 열어 확인한 인물과 발견 사항, 시트·폴더 링크를 적는다. 규격을 손봤다면 `AVATAR_SILHOUETTE_SPEC`의 어느 값을 왜 바꿨는지 적는다. 실패 후보를 성공처럼 적지 않는다.
