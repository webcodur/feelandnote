# 인물 이미지 지도

같은 사람의 그림이 **자리마다 다른 규격으로 여섯 군데** 들어간다. 어느 그림을 어디에 넣는지, 규격은 어느 문서가 쥐는지를 한 장으로 본다.

**이 문서는 지도이지 규격서가 아니다.** 각 자리의 구도·프레임·발주 프롬프트 본문은 오른쪽 칸의 문서가 SSoT이며, 여기에 규격을 복제하지 않는다 — 2026-08-01 이전에 규격이 다섯 문서에 흩어져 서로 어긋난 이력이 있다.

최초 작성 2026-08-01. 채움 수치는 같은 날 DB 실측.

---

## 자리 여섯

| 자리 | 저장 위치 | 무엇을 넣나 | 파일 | 규격 SSoT | 채움 (26.08.01) |
|------|-----------|-------------|------|-----------|------|
| **얼굴** | `profiles.avatar_url` | 얼굴이 화면을 채우는 정사각 헤드숏. 원형으로 잘려 나간다 | R2 `celebs/{id}/avatar.webp` 800×800 | `celeb-avatar-spec.md` | 1,957 / 2,426 |
| **인물 대문** | `profiles.portrait_url` | 인물 상세 맨 위 정사각 화보. 복식·배경·소품이 있는 환경 사진 | R2 `celebs/{id}/photo.webp` 1024~1080 | `db-celeb.md` 「셀럽 이미지 규격」 + `celeb/hero-photo-status.md` | 390 / 2,426 |
| **세력도감 큰 사진** | `celeb_tag_assignments.faction_image_url` | 태그별 인물 대표 화보. 원본 비율 그대로, **얼굴로 자르지 않는다** | R2 `faction/{tagId}/celeb-{celebId}.webp` | `.agents/skills/faction-celeb-sync/SKILL.md` | 102 / 864 |
| **세력도감 단체** | `celeb_tags.team_images[]` | 단체 화보 여러 장 | R2 `faction/{tagId}/team/g{NN}c{NN}-{hash8}.webp` | 같은 문서 | — |
| **영상 인물 화면** | `faction_people.image` | 세력도감 영상에서 인물이 등장하는 화면 | 저장소 `factions/<편>/<그룹>/<slug>.png` | `.agents/skills/faction-image/SKILL.md` | 986 / 1,220 |
| **영상 단체 화면** | `faction_clusters.image` | 세력도감 영상의 그룹 화면 | 저장소 `factions/<편>/<그룹>/_group.png` | 같은 문서 | 327 / 453 |

---

## 그 밖에 인물에 딸린 것

그림 여섯 자리 외에도 한 인물에 붙는 자산이 더 있다. 규격 문서가 없는 것은 그렇게 적었다.

| 무엇 | 저장 위치 | 상태 |
|------|-----------|------|
| 가상 독백 (1인칭 글) | `profiles.virtual_monologue` · `_en` | 정비 절차는 `docs/todo/virtual-monologue-quality-overhaul.md` |
| 담화 영상 인물 그림 | `discourse_speakers.image` · `discourse_turns.image` | **구도 규격 문서 없음** |
| 관계 인물 사진 (명단 밖 인물) | `celeb_relations_external.image_url` | 위키데이터에서 받아온 것. **규격 없음** |
| 인물이 산 세계의 배경 사진 | 아직 없음 | 발주서만 있고 생성 미착수(`celeb-world-banners.md`) |
| 인사 음성 | `profiles.has_voice` · `voice_id_ko` · `voice_id_en` | 그림이 아니라 소리. 인물 페이지 대문을 누르면 재생된다 |

---

## 비면 무엇이 대신 뜨나

- **인물 상세 대문** — 대문 → 세력도감 큰 사진 → 얼굴 순으로 물러난다(`getCelebBySlug`). 그래서 전량을 안 채워도 화면이 깨지지 않는다.
- **세력도감 Hero** — 세력도감 큰 사진 → 얼굴 순. 큰 사진이 비면 **얼굴 크롭이 큰 자리에 뜬다**. 도감에서 "얼굴만 뜬다"는 증상이 이것이다.

---

## 자주 어긋나는 지점

- **얼굴 자리에만 얼굴 크롭을 쓴다.** 나머지 다섯은 전부 원본 화보다. 세력도감 큰 사진에 얼굴 크롭을 넣으면 Hero가 증명사진이 된다.
- **아바타 규격을 다른 자리에 적용하지 않는다.** 눈높이 46·턱끝 81 같은 프레임 기하는 얼굴 자리 전용이다.
- **영상 인물 화면과 세력도감 큰 사진은 같은 그림이 옮겨간 것이다.** 영상 쪽에서 만든 그림이 출간 패널을 거쳐 도감으로 올라간다. 도감에서 직접 올리는 별도 그림이 아니다.
- **정사각이 기본이다.** 세로(9:16) 대문은 2026-07-31에 폐기됐고 되살릴 원본도 없다. 다시 하려면 신규 생성이다.

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
| 얼굴 | `upload-celeb-image-from-wikimedia.ts`(등록·크롭), `batch-celeb-wikimedia-avatars.ts`(일괄), `crop-faces.ts`(크롭만) |
| 인물 대문 | `generate-celeb-hero-photos.mjs`(생성~등록), `pick-hero-photo-targets.mjs`(대상 추출), `upload-celeb-hero-photo.ts`(손에 있는 파일), `scan-faction-portrait-candidates.mjs`(영상 자산에서 후보 수집) |
| 세력도감 큰 사진·단체 | web-bo `/factions` 출간 패널 (진단 → dry-run → 출간) |
| 영상 인물·단체 화면 | 발주는 `faction-image` 규칙, 전신 크롭은 `crop-body.ts` |

얼굴 자리는 **신원 근거 가드**가 걸려 있다 — 출처 불명 얼굴을 특정 인물에 붙일 수 없고, 등록 도구가 이를 강제한다(`AGENTS.md` 「아바타 신원 소스 가드」).
