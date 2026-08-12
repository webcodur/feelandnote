---
name: faction-data-manage
description: 팩션 제작 데이터의 DB·web-bo 편집 화면·Remotion faction-data.json·이미지 경로를 안전하게 연결하고 검증한다. "팩션 데이터 연결", "영상화 준비", "그룹샷·개인샷 연결", "백오피스에 반영", "DB와 로컬 팩션 동기화", "faction-data 조작" 요청에 사용한다.
---

# 팩션 데이터 연결

DB를 제작 원천으로 유지하면서 확정 이미지와 로컬 렌더 산출물을 백오피스에 연결한다. 텍스트·배치까지 바꾸는 전체 저장과 이미지 경로만 연결하는 작업을 먼저 구분한다.

## 원천과 경계

- 제작 원천은 `faction_episodes` → `faction_groups` → `faction_clusters` → `faction_people`다.
- 편집 화면은 `http://localhost:3001/factions/<folder>/<locale>/info`다.
- 로컬 `sw/remotion/public/factions/<folder>/faction-data.json`은 DB export 산출물이다.
- 그룹샷은 `faction_clusters.image`, 개인샷은 `faction_people.image`에 상대 경로로 기록한다.
- `faction_people.web_image_url`과 `celeb_tags.team_images`는 출간 산출물이다. 영상화 준비의 로컬 이미지 연결과 구분한다.
- 이미지 제작·선정·REF 판단은 `faction-image`를 함께 적용한다. DB 조작은 `supabase`를 함께 적용한다.

## 실행

1. `docs/project/remotion/faction/unification.md`와 `docs/project/apps/web-bo.md`에서 현재 저장·출간 경계를 확인한다.
2. DB의 현행 에피소드를 먼저 읽는다. 로컬 JSON 전체 import로 현재 DB 원고를 덮어쓰지 않는다.
3. 이미지 연결만 요청받았으면 확정 파일을 에피소드 폴더의 최종 상대 경로에 놓고 진단한다.

```powershell
Set-Location C:\project\feelandnote\sw\remotion
pnpm faction:images-sync -- --episode <folder>
```

4. 다음 조건을 모두 통과해야 반영한다.
   - 로컬과 DB의 세력·묶음·인물 수가 같다.
   - 같은 자리의 인물 slug가 같다.
   - 모든 비어 있지 않은 이미지 경로가 에피소드 안의 실제 이미지 파일을 가리킨다.
   - 비어 있는 보류 항목은 변경 대상에 포함되지 않는다.
5. 변경 목록을 확인한 뒤 이미지 열만 반영하고 DB를 로컬로 다시 export한다.

```powershell
pnpm faction:images-sync -- --episode <folder> --apply
pnpm faction:export -- --episode <folder> --force
pnpm faction:verify -- --episode <folder> --drift
```

`--force`는 확정 이미지 경로를 의도적으로 로컬에 먼저 적은 경우에만 사용한다. DB export가 끝나면 `_generated.from=db`와 검증 결과를 확인한다.
이미지 열이 바뀌면 동기화 명령이 에피소드 `updated_at`도 갱신한다. 이미 열어 둔 편집 화면은 새로고침한 뒤 추가 편집한다.

6. 백오피스 URL을 새로고침해 그룹샷·개인샷 표시를 확인한다. 브라우저 연결이 불가능하면 DB 재조회, export된 JSON, 파일 존재·규격, HTTP 200을 각각 검증하고 화면 미검수 사실을 보고한다.

## 전체 원고 저장과 출간

- 텍스트·인물 순서·세력 구조까지 바꿀 때만 web-bo의 정상 저장 경로 `saveFactionScript`/`replaceFactionEpisode`를 사용한다.
- 도감 공개용 R2 업로드와 `web_*` 갱신은 사용자가 출간까지 요청했을 때 `faction-celeb-sync`로 수행한다.
- 이미지 후보는 사용자가 확인하기 전에 삭제하지 않는다. 확정 파일 연결과 후보 정리는 별도 작업으로 보고한다.

## 완료 기준

- DB 재조회에서 요청한 이미지 경로가 모두 일치한다.
- DB export 후 로컬 JSON과 DB drift가 없다.
- 연결한 모든 파일이 존재하고 렌더러가 읽을 수 있다.
- 보류 항목과 이미지 외 데이터가 보존된다.
- 보고에 DB 변경 수, 연결된 그룹샷·개인샷 수, 보류 수, 검증 결과, 백오피스 화면 검수 여부를 적는다.
