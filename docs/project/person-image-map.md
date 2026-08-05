# 인물 이미지 지도

같은 사람의 그림이 **자리마다 다른 규격으로 여섯 군데** 들어간다. 어느 그림을 어디에 넣는지, 규격은 어느 문서가 쥐는지를 한 장으로 본다.

**이 문서는 지도이지 규격서가 아니다.** 각 자리의 구도·프레임·발주 프롬프트 본문은 오른쪽 칸의 문서가 SSoT이며, 여기에 규격을 복제하지 않는다 — 2026-08-01 이전에 규격이 다섯 문서에 흩어져 서로 어긋난 이력이 있다.

최초 작성 2026-08-01. 채움 수치는 같은 날 DB 실측.

**이름은 넷으로 굳혔다** — 동그란 얼굴은 **아바타**, 인물 페이지 맨 위 큰 사진은 **대표 사진**, 세력도감 인물 그림은 **개인화보**·**단체화보**다.

"초상"이라는 말은 쓰지 않는다. 이미 아바타를 가리키는 자리에 쓰이고 있어 대표 사진까지 그렇게 부르면 두 가지가 한 이름을 갖는다(26.08.01 정리). 다만 쉼터 게임 「시대의 초상」과 수호전·전투 카드의 캐릭터 그림은 별개 도메인이라 그대로 둔다.

---

## 자리 여섯

| 자리 | 저장 위치 | 무엇을 넣나 | 파일 | 규격 SSoT | 채움 (26.08.01) |
|------|-----------|-------------|------|-----------|------|
| **아바타** | `profiles.avatar_url` | 얼굴이 화면을 채우는 정사각 헤드숏. 원형으로 잘려 나간다 | R2 `celebs/{id}/avatar.webp` 800×800 | `celeb-avatar-spec.md` | 1,957 / 2,426 |
| **대표 사진** | `profiles.portrait_url` | 인물 상세 PC 상단의 세로 환경 사진. 복식·배경·소품을 함께 담는다 | R2 `celebs/{id}/photo.webp` | `packages/shared/src/constants/celeb-hero-photo.ts`(비율·픽셀) + `db-celeb.md` 「셀럽 이미지 규격」 + `celeb/hero-photo-status.md` | 390 / 2,426 |
| **개인화보** | `faction_people.web_image_url`(제작 유래) · `celeb_tag_assignments.faction_image_url`(웹 전용 배정) — 화면은 뷰 `faction_atlas_members`로 읽는다(26.08.03 단일화) | 태그별 인물 대표 화보. 원본 비율 그대로, **얼굴로 자르지 않는다** | R2 `faction/{tagId}/celeb-{celebId}.webp` | `.agents/skills/faction-celeb-sync/SKILL.md` | 102 / 864 (26.08.01, 단일화 이전 배정 기준 집계) |
| **단체화보** | `celeb_tags.team_images[]` | 단체 화보 여러 장 | R2 `faction/{tagId}/team/g{NN}c{NN}-{hash8}.webp` | 같은 문서 | — |
| **개인화보(영상 원본)** | `faction_people.image` | 세력도감 영상에서 인물이 등장하는 화면 | 저장소 `factions/<편>/<그룹>/<slug>.png` | `.agents/skills/faction-image/SKILL.md` | 986 / 1,220 |
| **단체화보(영상 원본)** | `faction_clusters.image` | 세력도감 영상의 그룹 화면 | 저장소 `factions/<편>/<그룹>/_group.png` | 같은 문서 | 327 / 453 |

---

## 그 밖에 인물에 딸린 것

그림 여섯 자리 외에도 한 인물에 붙는 자산이 더 있다. 규격 문서가 없는 것은 그렇게 적었다.

| 무엇 | 저장 위치 | 상태 |
|------|-----------|------|
| 가상 독백 (1인칭 글) | `profiles.virtual_monologue` · `_en` | 규칙은 `docs/project/celeb/virtual-monologue.md` |
| 담화 영상 인물 그림 | `discourse_speakers.image` · `discourse_turns.image` | **구도 규격 문서 없음** |
| 관계 인물 사진 (명단 밖 인물) | `celeb_relations_external.image_url` | 위키데이터에서 받아온 것. **규격 없음** |
| 인물이 산 세계의 배경 사진 | `sw/web-bo/output/worlds-raw/` 원본 · `sw/web/public/images/worlds/` 운영본 | **39세계 완료.** 규격·발주·검수·초점 예외는 `celeb-world-banners.md` |
| 인사 음성 | `profiles.has_voice` · `voice_id_ko` · `voice_id_en` | 그림이 아니라 소리. 인물 페이지의 대표 사진을 누르면 재생된다 |

---

## 비면 무엇이 대신 뜨나

- **인물 페이지 맨 위** — 대표 사진 → 개인화보 → 아바타 순으로 물러난다(`getCelebBySlug`). 그래서 전량을 안 채워도 화면이 깨지지 않는다.
- **세력도감 큰 자리** — 개인화보 → 아바타 순. 개인화보가 비면 **얼굴만 잘린 아바타가 큰 자리에 뜬다**. 도감에서 "얼굴만 뜬다"는 증상이 이것이다.

---

## 자주 어긋나는 지점

- **얼굴을 잘라 쓰는 것은 아바타뿐이다.** 나머지 다섯은 전부 원본 화보다. 개인화보에 얼굴 크롭을 넣으면 세력도감 큰 자리가 증명사진이 된다.
- **아바타 규격을 다른 자리에 적용하지 않는다.** 눈높이 46·턱끝 81 같은 프레임 기하는 아바타 전용이다.
- **영상 원본과 도감의 개인화보는 같은 그림이다.** 영상 쪽에서 만든 그림이 출간 패널을 거쳐 도감으로 올라간다. 도감에서 직접 올리는 별도 그림이 아니다.
- **대표 사진의 숫자 규격은 공용 상수만 바꾼다.** `CELEB_HERO_PHOTO_SPEC`이 화면·백오피스 크롭·저장 도구의 단일원천이다. 2026-08-05 이전 정사각 파일은 R2에서 덮어쓰지 않고 PC 화면에서 현행 세로 비율로 중앙 크롭한다.

---

## 배포 뒤 마무리 (2026-08-01 진행 중)

세력도감 개편 때 안 따라온 옛 이름(`spotlight`)을 겉이름에 맞추는 중이다. 사진이 잠깐도 안 끊기도록 **새것을 먼저 만들고 옛것을 남겨둔 상태**다.

| 끝난 것 | 남은 것 |
|---|---|
| 새 칸 `faction_image_url` 추가·값 복사 102건 | 옛 칸 `spotlight_image_url` 삭제 |
| 저장소 `faction/` 폴더로 138장 복사·주소 갱신 | 옛 폴더 `spotlight/` 파일 삭제 |
| 코드·문서 전량 새 이름으로 교체 | — |

**둘 다 새 코드가 배포된 뒤에 한다.** 배포 전에 지우면 아직 옛 이름을 읽는 화면에서 사진이 사라진다.

```sql
alter table public.celeb_tag_assignments drop column spotlight_image_url;
```
```bash
cd sw/web-bo && node scripts/migrate-spotlight-to-faction-r2.mjs --purge
```

---

## 만드는 도구

| 자리 | 도구 |
|------|------|
| 아바타 | `upload-celeb-avatar.ts`(등록·크롭), `batch-celeb-avatars.ts`(일괄), `crop-faces.ts`(크롭만) |
| 대표 사진 | `generate-celeb-hero-photos.mjs`(생성~등록), `pick-hero-photo-targets.mjs`(대상 추출), `upload-celeb-hero-photo.ts`(손에 있는 파일), `scan-faction-portrait-candidates.mjs`(영상 자산에서 후보 수집) |
| 개인화보·단체화보 | web-bo `/factions` 출간 패널 (진단 → dry-run → 출간). 26.08.03부터 이 패널은 사진·영상·음악 업로드 전용이다(텍스트 복사 폐기). 개인샷 주소는 `faction_people.web_image_url`에 기록된다 |
| 영상 원본 | 발주는 `faction-image` 규칙, 전신 크롭은 `crop-body.ts` |

아바타에는 **신원 근거 가드**가 걸려 있다 — 출처 불명 얼굴을 특정 인물에 붙일 수 없고, 등록 도구가 이를 강제한다(`AGENTS.md` 「아바타 신원 소스 가드」).
