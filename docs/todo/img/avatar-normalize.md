# 아바타 정규화 미결분

전수 정규화(3,283명 중 3,252명 등록)에서 남은 한 덩어리다. 규격은 [`celeb-08-01-avatar.md`](../../project/celeb/celeb-08-01-avatar.md) 「정규화」, 명령은 [`celeb-avatar-reframe`](../../../.agents/skills/celeb-avatar-reframe/SKILL.md) 스킬을 따른다. 이 덩어리가 끝나면 이 문서를 지우고 색인 행을 뺀다.

정규화 자체는 더 이상 별도 과제가 아니다 — 2026-09-18부터 `celeb-avatar-register` 「등록의 마지막 단계」에 흡수돼 등록·교체 배치마다 실행한다.

2026-09-18 마무리: 실존 인물 빛 방향 재회차(REAL·BOTH 1,178명 반전), 배경 남은 인물 누끼(스캔 확정 8 + 검토 3 = 11명), 재회차에서 건너뛴 가장자리찬·미검출 인물 회수를 끝냈다. 소재가 프레임 끝까지 차는 인물은 투명 패딩을 붙여 실루엣을 만들어 재배치했고(yeji·peter-paul-rubens·ma-chao·louis-xiv·oprah-winfrey·dolly-parton·sinfjotli·takeda-shingen), 미검출이던 meir-dagan·roger-beteille도 같은 방법으로 살아났다. 재배치·등록 18명, tiger-korea는 규격 대상 밖.

## 사람 얼굴인데 검출이 안 된 5명 — 수동 크롭

`dhritarashtra` `clowwindy` `jang-in-pyo` `murad-ii` `viktor-netyksho`

검출기가 얼굴을 못 잡았으므로 자동 경로가 없다(투명 패딩으로도 미검출). **자동 분석이 안 되는 대상은 사람이든 AI든 직접 처리가 필요하다** — 관리자 화면의 크롭 창에서 「정규화」 구도 원칙(턱 아래 목이 끝나는 곳에서 하단, 눈~턱이 프레임의 40% 안팎, 정수리 위 작은 여백)에 맞춰 자른다. 배경이 있으면 누끼도 함께 켠다. 자르고 등록한 뒤에는 다른 등록분과 같이 `light-unify`로 빛 방향을 맞춘다.

원인은 대개 측면·눈 가림·저대비·회화 질감이다. 더 나은 원본이 있으면 `celeb-avatar-register`로 교체하는 편이 빠르다.

## 별도 감사 — 누끼 검토 후보 156명

2026-09-18 nobg 전수 스캔(`sw/web-bo/.tmp/avatar-nobg/scan-2026-09-18_06-34-28-676/scan.json`)이 `opaque_edge` 판정 156명을 검토 후보로 남겼다. 머리카락·날개가 프레임 가장자리에 닿는 정상 컷이 섞여 있어 기계가 확정 못 한 목록이다. 눈 검수가 필요한 별도 감사로, 정규화 미결분과는 다른 성격이다.

## 대상 밖 — 손대지 않는다

짐승·용·괴물·가면·베일·집단 로고 20명은 눈·턱 규격의 대상이 아니다. 감사에 남더라도 정상이다.

`fafnir` `fenrir` `apep` `argos` `cerberus` `polyphemus` `jatayu` `sobek` `jormungandr` `khnum` `lernaean-hydra` `maricha` `talos` `white-dragon-horse` `yamata-no-orochi` `ymir` `daft-punk` `satoshi-nakamoto` `tiger-korea` `muhammad`
