---
name: celeb-avatar-register
description: 셀럽 아바타의 신원을 확인하고 얼굴 크롭을 검수해 R2와 celebs.avatar_url에 등록하거나 교체한다. "셀럽 이미지 채워줘", "avatar 등록", "얼굴 사진 교체" 요청에 사용한다.
---

# 셀럽 아바타 등록

아바타 후보를 인물과 대조하고, 서비스 프레임에 맞게 잘라 R2와 DB에 등록한다. 작업 전에 [`docs/project/celeb/celeb-08-01-avatar.md`](../../../docs/project/celeb/celeb-08-01-avatar.md)를 끝까지 읽는다.

## 책임 경계

- 신원·구도·원본 선택·눈 검수: `docs/project/celeb/celeb-08-01-avatar.md`
- 목표값·허용 범위·크롭 계산: `sw/web-bo/src/lib/avatar-geometry.ts`의 `AVATAR_SPEC`
- 원본·작은 판의 파일·출력 기본값: `packages/shared/src/constants/celeb-avatar-small.ts`
- 일괄 등록: `sw/web-bo/scripts/avatar/batch.ts`
- 단건 등록·교체: `sw/web-bo/scripts/avatar/upload.ts`
- 출처 로그: `sw/web-bo/scripts/avatar/credits.log`

문서에 기하 숫자나 스크립트 기본값을 복제하지 않는다. 실제 값과 허용 인자는 코드를 따른다.

R2 업로드와 DB 갱신은 사용자가 등록·교체를 명시했을 때만 실행한다. 조사·감사 요청에서는 후보와 로컬 미리보기까지만 만든다. 유료 이미지 생성도 별도 명시가 있어야 한다.

## 원본 선택

신원이 확실한 후보 안에서 얼굴 크기·정면성·선명도를 비교한다. Commons, 공식 사이트, 소속기관, 권위 매체, 본인 계정은 후보 경로이지 품질 순위가 아니다.

- 사진이 남은 실존 인물은 실제 얼굴 사진을 쓴다.
- 사진이 없는 고대·역사 인물은 그 인물만을 위해 만든 제작본을 쓸 수 있다. 다른 인물용 얼굴을 재사용하지 않는다.
- 신원이 공개되지 않은 인물은 임의 얼굴을 만들지 않고 익명성을 형상화한다.
- fiction은 원전 또는 팩션 SSoT로 캐릭터를 특정한다.
- 동명이인, 작품 표지, 기념물, 밀랍 인형, 다른 인물의 사진은 제외한다.

로컬 입력의 `_재료`, `서비스_재료`, `_refs` 폴더와 기존 Feel&Note R2 아바타는 신원 근거가 아니다. `PROVENANCE_QUARANTINED_SLUGS`에 있는 인물은 인물별 출처 감사를 해결하기 전 등록하지 않는다.

## 일괄 등록

`sw/web-bo`에서 먼저 dry-run으로 후보와 실패 사유를 확인한다.

```bash
npx tsx scripts/avatar/batch.ts --scan-db --offset 0 --limit 50 --dry-run
```

필요하면 `--only`, `--targets-file`, `--exclude-file`로 대상을 고정한다. 라이브 일괄 등록은 다음 조건을 모두 확인한 뒤 같은 명령에서 `--dry-run`만 뺀다.

- 사용자가 등록을 지시했다.
- DB의 `wikidata_qid`가 해당 인물로 독립 검증됐다.
- 후보 사진의 얼굴과 프로필 신원이 일치한다.
- dry-run 결과를 직접 열어봤다.

자동 검색은 검증되지 않은 QID를 라이브에서 채택하지 않는다. 라이선스 때문에 자동 배치에서 빠진 후보는 사진 결함으로 단정하지 말고, 신원과 출처를 확인한 뒤 단건 경로에서 판단한다.

## 단건 등록

단건 명령은 실행 즉시 R2와 DB를 갱신하므로 등록 권한을 확인한 뒤 사용한다. `--celeb-id`와 `--slug`는 DB에서 같은 인물인지 먼저 대조한다.

Commons 파일:

```bash
npx tsx scripts/avatar/upload.ts \
  --celeb-id <uuid> --slug <slug> \
  --commons-file "<Commons 파일명>" \
  --identity-evidence "<신원을 확인할 수 있는 URL>" \
  --source-note "<신원과 편집·재구성 방식>"
```

일반 웹 이미지나 로컬 완성본은 각각 `--image-url` 또는 `--image-file`을 쓴다. 세 입력 방식은 동시에 사용하지 않는다. 실존 인물의 `--identity-evidence`에는 공식·기관·본인 페이지 등 독립적인 HTTP(S) 근거가 필요하다. fiction은 `fiction:<원전·팩션 SSoT>` 형식을 쓴다. `--source-note`에는 그 사진을 해당 인물로 판정한 이유와 가공 방식을 적는다.

업로드본과 같은 로컬 파일이 필요하면 `--preview-path`를 함께 준다.

## 얼굴 검출과 예외

기본 경로는 랜드마크를 검출해 `avatar-geometry.ts`로 자른다. 얼굴을 찾지 못하면 업로드 전에 실패하며, 임의 위치를 잘라 성공 처리하지 않는다.

- 더 큰 정면 얼굴 원본이 있으면 원본을 교체한다.
- 신원 비공개 인물처럼 얼굴이 없는 것이 정상이라면 `--allow-no-face true`로 중앙 크롭을 명시한다.
- 사람이 이미 규격에 맞춘 완성 정사각을 그대로 등록해야 할 때만 `--face-detect false --crop-gravity center`를 쓴다.

얼굴 검출을 우회한 결과는 기하 합격으로 간주하지 않고 직접 비교한다. 원본 여백 부족, 상자 기반 폴백, 중심축 이탈 등 스크립트 경고도 무시하지 않는다.

## 검수와 보고

등록 전후에 원본, 로컬 출력, R2 재다운로드본을 비교한다. 같은 인물인지 먼저 보고 작은 원형과 확대 화면에서 얼굴 잘림·중심·시선·상반신·소품·글자·배경·질감을 확인한다.

```bash
cd sw/web-bo
npx tsx scripts/avatar/measure.ts <이미지폴더>
npx tsx scripts/avatar/contact-sheet.ts --out <출력폴더> --slugs <slug-a,slug-b>
```

기계 검사는 기하 이상 후보를 고를 뿐 신원과 시각 품질을 대신 판정하지 않는다. 완료 보고에는 대상별 출처, 최종 URL, 경고 또는 실패 사유, 직접 확인한 결과를 적는다.
