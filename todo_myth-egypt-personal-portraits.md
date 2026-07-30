# TODO — 이집트 신화 개인화보 17명

> 최종 정리: 2026-07-30
> 목적: 대화 세션 없이 이 문서 하나로 작업을 재개한다.
> 현재 판정: **2026-07-30 사용자 방향 전환으로 그룹샷 제작은 완전히 종료했다. 인간 신격 16명은 각자 `얼굴 이미지 1장 + 1:1 개인화보 1장`만 만들고, 얼굴은 fiction 프로필 아바타로, 개인화보는 팩션 인물 이미지로 업로드한 뒤 마친다. 아펩은 인간 얼굴 이미지 없이 비인간 개인화보 1장만 만든다. 여성 얼굴 REF 7명은 유지하고, 남성 v5 캐스팅 9명은 승인 뒤 정면 얼굴 후보까지 `_staging/personal-v5/`에 생성했다. 아직 정식 업로드·데이터 연결은 0건이다.**

## 1. 작업 목표와 현재 범위

`myth-egypt` 등장 신격을 **개인 단위 자산만으로** 완성한다. 인간 신격 16명은 얼굴 이미지와 1:1 개인화보를 한 장씩, 아펩은 1:1 비인간 개인화보 한 장을 만든다. 단체샷·공통 배경·그룹 크롭은 만들지 않는다.

| 구분 | 대상 | 현재 상태 |
|---|---|---|
| 여성 7명 | 테프누트, 누트, 마아트, 이시스, 네프티스, 하토르, 바스테트 | 기존 1254×1254 이미지는 얼굴 원천으로만 사용. `crop-faces.ts` 800×800 얼굴 추출·육안 검수·`_refs` 배치 완료. 최종 개인화보는 별도 신규 생성 |
| 남성 9명 | 라, 아툼, 슈, 게브, 토트, 오시리스, 아누비스, 세트, 호루스 | v5 신격 우선 캐스팅 승인. 웹 원본을 800×800 크롭한 뒤 정면·중립 배경 얼굴 후보 9장을 `generated-face-refs-v1/`에 생성·육안 검수. 정식 얼굴 이미지 승인과 개인화보는 미완료 |
| 비인간 1개체 | 아펩 | 인간 얼굴 이미지 없음. 거대 심연 뱀의 1:1 개인화보 한 장만 생성·업로드 |

이집트 완료 뒤 북유럽 신화 개인화보를 처리한다는 초기 범위가 있었으나, 북유럽은 캐스팅·생성 모두 미착수다. 다음 세션은 먼저 이집트를 끝낸다.

## 2. 사용자 결정

- “이집트인데 너무 꽁꽁 싸매지 말자”를 복식의 최우선 피드백으로 적용한다.
- 더운 기후의 얇은 린넨을 쓰고, 어깨·팔·윗가슴을 인물 성격에 맞게 드러낸다.
- 미라처럼 전신을 감거나 중갑을 입히지 않는다.
- 여성 REF 테스트에는 사용자가 직접 지정한 `D:\image\_재료\for_egypt`를 사용했다. 이는 이번 테스트에 대한 명시적 예외다.
- 얼굴 REF는 자동 배정하지 않고 한 장씩 직접 열어 신원과 배역 적합성을 판단한다.
- 인터넷에서 대체 얼굴을 임의로 내려받지 않는다. 2026-07-30 사용자가 웹 수집을 직접 요청한 회차만 명시적 예외로 삼았고, 출처와 육안 판정은 별도 장부에 남겼다.
- 사용자 승인 전에는 정식 자산 승격, DB 저장, 렌더 데이터 연결을 하지 않는다.
- 2026-07-30 사용자가 남성 웹 REF를 승인하고, 여성 개인화보는 최종본이 아니라 `crop-faces.ts`로 얼굴만 추출해 REF로 쓰도록 결정했다.
- 2026-07-30 최종 방향 전환: **그룹샷·공통 배경·그룹 크롭을 모두 폐기**한다.
- 인간 신격마다 얼굴 이미지 1장과 개인화보 1장만 만든다. 얼굴 이미지는 프로필 아바타용, 개인화보는 팩션 `person.image`용이다.
- 얼굴 이미지와 개인화보는 서로 다른 최종 자산이다. 개인화보를 다시 잘라 얼굴 이미지로 대체하지 않는다.
- 아펩은 인간 얼굴이 없으므로 개인화보 한 장만 만든다.

## 3. 핵심 경로

- 에피소드 데이터: `sw/remotion/public/factions/myth-egypt/faction-data.json`
- 이번 작업 폴더: `sw/remotion/public/factions/myth-egypt/_staging/personal-v2/`
- 전체 캐스팅·동일 배역 검증·남성 외형 발주서: `sw/remotion/public/factions/myth-egypt/_staging/personal-v2/casting.md`
- 남성 웹 REF 후보·출처·육안 판정: `sw/remotion/public/factions/myth-egypt/_staging/personal-v2/male-ref-web-candidates/README.md`
- 여성 REF 매핑·프롬프트·SHA-256·육안 검수: `sw/remotion/public/factions/myth-egypt/_staging/personal-v2/female-ref-set-v1.md`
- 승인 REF와 인물별 구별 기준: `sw/remotion/public/factions/myth-egypt/_refs/info.md`
- 중지된 그룹샷 발주서 이력: `sw/remotion/public/factions/myth-egypt/00-발주서-인덱스.md`
- 사용자 탈락 그룹샷 v1 5개와 검수 정정: `sw/remotion/public/factions/myth-egypt/_archive/groups-v1-rejected-2026-07-30/README.md`
- 탈락한 실제 패션 모델 남성 v3 후보판: `sw/remotion/public/factions/myth-egypt/_archive/recast-v3-rejected-2026-07-30/male-model-ref-candidates/README.md`
- 중단한 슈퍼모델 중심 v4 초안: `sw/remotion/public/factions/myth-egypt/_archive/recast-v4-supermodel-draft-rejected-2026-07-30/README.md`
- 신격 우선 남성 v5 후보판·출처·역할 매핑: `sw/remotion/public/factions/myth-egypt/_staging/personal-v5/divine-face-candidates/README.md`
- 남성 v5 정면 얼굴 후보 9장: `sw/remotion/public/factions/myth-egypt/_staging/personal-v5/divine-face-candidates/generated-face-refs-v1/`
- 하토르 1·2차 수정 기록: `sw/remotion/public/factions/myth-egypt/_staging/personal-v2/hathor-ref-test-v1.md`
- 기존 실패 이력: `sw/remotion/public/factions/myth-egypt/_docs/image-handoff.md`
- 제작 규칙: `.agents/skills/faction-image/SKILL.md`, `.agents/skills/faction-character-info/SKILL.md`, `docs/project/image-generation.md`

`faction-data.json`은 2026-07-30 Node `JSON.parse`로 5개 진영·17개 slug를 정상 확인했다. DB에서 내보낸 렌더 산출물이므로 직접 편집하지 않는다.

## 4. 여성 7명 완료분

최종 스테이징 후보는 모두 1254×1254 PNG다.

| 신격 | 최종 후보 | 판정 |
|---|---|---|
| 테프누트 | `tefnut-ref-v3.png` | 내부 검수 통과 |
| 누트 | `nut-ref-v2.png` | 내부 검수 통과 |
| 마아트 | `maat-ref-v2.png` | 내부 검수 통과 |
| 이시스 | `isis-ref-v2.png` | 내부 검수 통과 |
| 네프티스 | `nephthys-ref-v2.png` | 내부 검수 통과 |
| 하토르 | `hathor-ref-test-v2.png` | 조건부 통과 |
| 바스테트 | `bastet-ref-v1.png` | 내부 검수 통과 |

검수한 항목:

- 얼굴 REF의 주요 골격과 눈·코·입 비례
- 손·관절·물체 그립·석재 접지
- 장면 안의 광원과 그림자 일관성
- 인물별 의상 실루엣과 상징의 구별
- 320×320 축소 상태의 얼굴과 핵심 상징 식별력

하토르는 소뿔·태양 원반·시스트럼·새벽 신전으로 식별된다. 바닥의 제의 맥주는 320px에서 젖은 석재로 먼저 읽히므로 조건부 통과다. 소품을 키우면 인물보다 먼저 읽힐 위험이 있어 현 후보를 유지했다.

여성 7장의 얼굴 크롭 REF는 사용자 지시에 따라 세력별 `_refs`에서 유지한다. 단, 원천이 된 기존 개인화보 자체는 최종 개인화보가 아니다.

## 5. 남성 9명 얼굴 발주 기준

기존 배우·보디빌더 예시와 그에 기반한 남성 REF는 모델성 부족으로 재사용을 보류했다. 실제 패션 모델 경력을 아름다움의 대리 지표로 사용한 v3와 v4 접근도 폐기했다. 아래는 얼굴만 확대했을 때 숭배 대상으로 보이는지를 우선해 만든 v5 후보 매핑이며, 사용자가 승인하기 전에는 정식 `_refs`에 반영하지 않는다. 원본과 출처는 `personal-v5/divine-face-candidates/README.md`가 쥔다.

| 신 | 필요한 모델 |
|---|---|
| 라 | Regé-Jean Page — 따뜻한 정면 대칭, 열린 눈과 왕성의 태양 군주 |
| 아툼 | Mark Vanderloo — 깊은 주름과 청회색 눈이 원초적 권위로 읽히는 창조주 |
| 슈 | Manu Ríos — 긴 목, 가벼운 하관, 유동적인 공기감의 젊은 신 |
| 게브 | Can Yaman — 넓은 턱, 두꺼운 머리카락, 육체성과 온기가 함께 있는 대지의 신 |
| 토트 | Burak Özçivit — 짙은 눈썹과 계산하는 시선, 정밀한 긴장의 기록자 |
| 오시리스 | Dhafer L'Abidine — 북아프리카권의 고전적 골격, 성숙한 왕성과 고요한 비극을 지닌 죽음의 왕 |
| 아누비스 | Toni Mahfud — 밝은 눈과 검은 머리의 극단적 대비를 지닌 냉정한 문지기 |
| 세트 | Michele Morrone — 거친 골격, 공격적 응시, 정돈되지 않은 위험미의 파괴자 |
| 호루스 | Lucien Laviscount — 빠르고 밝은 눈, 전진하는 젊은 왕의 에너지 |

반드시 갈라야 하는 대비:

- `라 ↔ 아툼 ↔ 오시리스`: 성숙한 태양 군주 ↔ 가장 늙고 육중한 창조주 ↔ 가늘고 죽음처럼 고요한 왕
- `슈 ↔ 게브`: 가장 길고 가벼운 몸 ↔ 가장 넓고 무거운 몸
- `토트 ↔ 오시리스`: 관찰하고 계산하는 지성 ↔ 정면 대칭과 멈춘 듯한 비극
- `아누비스 ↔ 세트 ↔ 호루스`: 조용한 안내자 ↔ 불안하게 튀는 파괴자 ↔ 곧게 밀어붙이는 젊은 왕

얼굴이 닮더라도 체형·연령·눈의 에너지 중 최소 두 축이 겹치면 다른 모델을 고른다.

## 6. 아펩

- 사람 모델과 얼굴 REF가 필요 없다.
- 인간 얼굴·인간 몸·왕관·갑옷을 주지 않는다.
- 빛을 거의 반사하지 않는 먹빛 비늘, 넓고 둔중한 쐐기형 머리, 끝이 보이지 않는 거대 뱀의 몸으로 만든다.
- 코브라 마스코트나 서양 용이 아니라 태양선의 진로를 가로막는 심연의 덩어리로 설계한다.

## 7. 기존 1024×1024 초안

다음 파일은 사용자 제공 남성 REF 세트가 들어오기 전에 만든 내부 초안 또는 실패 비교본이다.

```text
ra-v1.png
ra-v2.png
atum-v1.png
atum-v2.png
shu-v1.png
shu-v2.png
geb-v1.png
thoth-v1.png
osiris-v1.png
tefnut-v1.png
nephthys-v1.png
```

- 남성 6신의 초안은 `ra`, `atum`, `shu`, `geb`, `thoth`, `osiris`까지만 있다.
- 아누비스·세트·호루스·아펩은 아직 없다.
- 여성 최종 REF 세트와 규격·얼굴 원천이 다르므로 그대로 정식 세트에 섞지 않는다.
- 삭제하지는 않았지만 사용자 승인 자산도 아니다.

## 8. 재개 순서

1. 남성 `generated-face-refs-v1/` 9장을 원본과 대조하고 사용자에게 얼굴 이미지 최종 승인을 받는다. 실패 인물만 다시 만든다.
2. 승인된 남성 얼굴 9장과 기존 여성 얼굴 7장을 각각 정식 `_refs/<group-slug>/<slug>.png`에 배치한다.
3. 같은 16장으로 fiction 프로필용 800×800 WebP 얼굴 이미지를 만들고, 인물별 프로필 신원·slug를 확인한 뒤 한 명씩 업로드한다.
4. 인물별 얼굴 REF 하나만 사용해 16명의 1:1 개인화보를 **각자 독립된 공간·포즈·조명**으로 생성한다. 그룹샷·공통 배경·그룹 크롭은 사용하지 않는다.
5. 아펩은 인간 REF 없이 거대 심연 뱀의 1:1 개인화보 한 장을 생성한다.
6. 총 17장 개인화보를 원본 크기와 320×320에서 얼굴 신원·신격·해부학·복식·상징·실사용성을 육안 검수한다.
7. 사용자 승인본만 `<group-folder>/<cluster>/<slug>.png`로 배치하고 web-bo `/factions` 정상 저장 경로로 `person.image`를 연결한다.
8. web-bo 출간 패널에서 dry-run → 인물별 개인화보 업로드 → 실제 반영 → 공개 도감/프로필 역검증을 수행한다. 단체사진 업로드 수는 의도적으로 0건이다.
9. 렌더에서 `cluster.image`가 비어도 `TEAM SHOT` 플레이스홀더가 노출되지 않도록 이 편의 개인화보 전용 편성을 확인한 뒤 완료한다.

## 9. 금지·승인 경계

- `faction-data.json` 직접 수정 금지
- 사용자 승인 전 정식 폴더 승격·DB 저장·데이터 연결 금지
- 별도 사용자 지시 없는 인터넷 얼굴 다운로드와 임의 대체 금지. 2026-07-30 수집분은 명시적 요청에 따른 승인 전 스테이징 후보다.
- 얼굴 검색·할당용 일회성 JS/Python 자동화 금지
- 같은 신을 연기한 배우·성우·퍼포먼스 캡처 인물 사용 금지
- 사람 얼굴에 개 귀·매 부리·동물 마스크만 붙이는 값싼 동물신 표현 금지
- 천으로 전신을 과하게 싸매거나 모든 신에게 같은 사제복을 입히는 방식 금지
- 파일 존재·육안 검수·축소 검사를 거치지 않은 결과를 완료 처리하지 않음

## 10. 현재 사용 가능 여부

| 항목 | 상태 |
|---|---|
| 여성 7명 기존 개인화보 | 최종본으로 사용하지 않음. 승인 얼굴 이미지 원천 |
| 남성 외형 발주서 | 모델 선정에 사용 가능 |
| 기존 남성 웹 REF 9장·게브 체격 보조 1장 | 과거 사용자 승인본이지만 그룹샷 품질 실패로 재사용 보류. 정식 `_refs`는 아직 덮어쓰지 않음 |
| 남성 패션 모델 v3·슈퍼모델 v4 | 사용자 피드백으로 탈락·중단. `_archive/recast-v3-rejected-2026-07-30/`, `_archive/recast-v4-supermodel-draft-rejected-2026-07-30/`에 보관 |
| 남성 신격 우선 v5 원본 9장 | `_staging/personal-v5/divine-face-candidates/selected/`에 수집·육안 검수 완료. 캐스팅 승인 |
| 남성 v5 정면 얼굴 후보 9장 | `generated-face-refs-v1/`에 생성·육안 검수 완료. 사용자 최종 승인 전이라 정식 승격·업로드 대기 |
| 승인 얼굴 REF | 여성 7명은 유지. 남성 9명은 v5 정면 후보 승인 뒤 교체. 아펩은 얼굴 REF 없음 |
| 그룹샷 v1 5개 | 사용자 전량 탈락. `_archive/groups-v1-rejected-2026-07-30/`에 격리, 재사용·승격 불가 |
| 향후 그룹샷 | 제작 종료. 신규 생성·승격·업로드 0건 유지 |
| 남성 1024 초안 | 참고만 가능, 정식 사용 불가 |
| 아펩 | v1 형태는 그룹샷과 함께 탈락. 인간 얼굴 없이 개인화보 한 장만 신규 생성 |
| 이집트 17명 정식 세트 | 미완료 |
| 사용자 승인 | 개인화보 전용 방향 확정. 여성 얼굴 7명 유지, 남성 v5 캐스팅 승인. 남성 정면 얼굴 9장과 개인화보 17장은 최종 승인 대기 |
| DB·렌더 연결 | 변경 없음 |
| 북유럽 개인화보 | 미착수 |

## 11. 2026-07-31 실행 체크포인트

이 절이 위의 과거 상태표보다 우선한다.

| 항목 | 최신 상태 |
|---|---|
| 최종 개인화보 | 인간 16명 + 아펩 1개, 총 17장 생성·육안 검수 통과 |
| 최종 후보 원본 | `sw/remotion/public/factions/myth-egypt/_staging/personal-v8-grounded/portraits/` |
| 표준 팩션 파일 | `01-sun-creation/1/`부터 `05-horus-camp/1/`까지 `<slug>.png` 17장 배치 완료. `_group.png`는 0장 |
| 얼굴샷 | 아펩 제외 16명, `personal-v8-grounded/faces/`에 800×800 PNG 생성·육안 검수 통과 |
| 서비스 아바타 | 16명 모두 R2 업로드와 `profiles.avatar_url` 갱신 완료. R2 재다운로드 16/16 HTTP 200, WebP 800×800 확인 |
| 아펩 아바타 | 의도적으로 없음 |
| 크롭 도구 | `crop-faces.ts`에 높은 왕관·깃털용 `--headroom` 옵션 추가 |
| 단체샷 렌더 | `cluster.image`가 없으면 인원 수와 무관하게 cluster cue를 만들지 않도록 수정. `myth-egypt` 실측 cluster cue 0, person cue 17 |
| 타입 검증 | `sw/remotion`의 `pnpm exec tsc --noEmit` 통과 |
| 팩션 `person.image` DB 저장 | 대기. 연결 브라우저가 제공되지 않아 web-bo `/factions` 정상 저장 경로를 실행하지 못함 |
| 팩션 출간 | 위 DB 저장 뒤 web-bo 출간 패널의 진단 → dry-run → 출간이 필요 |

최종 화보의 프롬프트 원칙과 17명별 육안 판정은
`sw/remotion/public/factions/myth-egypt/_staging/personal-v8-grounded/README.md`에 기록했다.
