# 아바타 정규화 미결분

전수 정규화(3,283명 중 3,252명 등록)에서 남은 한 덩어리다. 규격은 [`celeb-08-01-avatar.md`](../../project/celeb/celeb-08-01-avatar.md) 「정규화」, 명령은 [`celeb-avatar-reframe`](../../../.agents/skills/celeb-avatar-reframe/SKILL.md) 스킬을 따른다. 이 덩어리가 끝나면 이 문서를 지우고 색인 행을 뺀다.

정규화 자체는 더 이상 별도 과제가 아니다 — 2026-09-18부터 `celeb-avatar-register` 「등록의 마지막 단계」에 흡수돼 등록·교체 배치마다 실행한다.

2026-09-18 마무리: 실존 인물 빛 방향 재회차(REAL·BOTH 1,178명 반전), 배경 남은 인물 누끼(스캔 확정 8 + 검토 3 = 11명), 재회차에서 건너뛴 가장자리찬·미검출 인물 회수를 끝냈다. 소재가 프레임 끝까지 차는 인물은 투명 패딩을 붙여 실루엣을 만들어 재배치했고(yeji·peter-paul-rubens·ma-chao·louis-xiv·oprah-winfrey·dolly-parton·sinfjotli·takeda-shingen), 미검출이던 meir-dagan·roger-beteille도 같은 방법으로 살아났다. 재배치·등록 18명, tiger-korea는 규격 대상 밖.

## 해소됨 — 수동 크롭 2명 (26.10.01 실측)

`murad-ii` `dhritarashtra` — 둘 다 현재 R2본이 파이프라인 검출기(`crop-local.ts`, SSD MobileNet+랜드마크)를 통과한다. `murad-ii`는 재등록됐고(`?v=` 갱신), `dhritarashtra`는 원본 그대로 검출된다(얼굴 작음 경고 159px→800px 확대가 있으나 합격). 수동 크롭은 불필요하다.

구 기록: `murad-ii`는 얼굴이 프레임을 거의 채우고 터번 윗부분이 잘려 있었고, `dhritarashtra`는 눈가리개(맹인 왕의 정체)라 검출이 안 되는 것이 당연했다. 원인은 대개 측면·눈 가림·저대비·회화 질감이다.

## 별도 감사 — 누끼 검토 후보 91명 (26.10.01 실측 잔여)

2026-09-18 스캔의 `opaque_edge` 156명을 현재 R2본에 같은 기준으로 재측정했다. 65명은 재등록으로 해소됐고(알파 정상), 91명이 여전히 가장자리에 닿는다. 머리카락·날개가 프레임 가장자리에 닿는 정상 컷이 섞여 있어 기계가 확정 못 한 목록이다. 눈 검수가 필요한 별도 감사로, 정규화 미결분과는 다른 성격이다.

측정: DB 현재 `avatar_url` 158건 조회 → R2본 다운로드 → `nobg-backfill.ts`와 같은 `analyzeAlpha`·`classify`로 판정(읽기 전용, DB·R2 쓰기 없음). `black-bear-demon` 1명만 스캔 당시 바이트 그대로고, 나머지 90명은 재등록됐으나 지표가 남았다.

명단:

`bartholomew-roberts` `bastet` `bayezid-ii` `black-bear-demon` `bob-marley` `cao-pi` `celine-dion` `ching-shih` `chloe-grace-moretz` `choi-hyun-woo` `christine-de-pizan` `clovis-i` `da-qiao` `dahyun` `demi-moore` `denise-richards` `diana-ross` `dolly-parton` `draupadi` `elizabeth-i` `emperor-yang-of-sui` `empress-elisabeth` `empress-myeongseong` `enheduanna` `eulji-mundeok` `evelyn-glennie` `frederick-the-great` `gaia` `germaine-de-stael` `gloria-estefan` `gottfried-wilhelm-leibniz` `guinevere` `guo-si` `han-xin` `hatshepsut` `hel` `hildegard-of-bingen` `huang-gai` `huang-zhong` `huening-kai` `hwang-jini` `hyuna` `izanami` `jade-emperor` `jalal-ad-din-muhammad-rumi` `jamukha` `jiang-wei` `jodie-foster` `josephine-de-beauharnais` `katy-perry` `lady-gan` `lady-zhurong` `li-mu` `liao-hua` `lorenzo-de-medici` `louis-xiv` `ma-chao` `ma-dai` `ma-teng` `mandodari` `marie-antoinette` `medea` `meng-huo` `michael-jackson` `murasaki-shikibu` `nemean-lion` `penelope-cruz` `peter-the-great` `ptolemy-i` `qi-jiguang` `rabia-al-adawiyya` `ramesses-ii` `richard-i` `scipio-africanus` `sinfjotli` `taishi-ci` `theodora` `toussaint-louverture` `uma-thurman` `ungnyeo` `wu-zetian` `xu-chu` `yeji` `ying-bu` `yue-fei` `yue-jin` `zenobia` `zhang-fei` `zhang-he` `zhang-liao` `zhao-yun`

## 대상 밖 — 손대지 않는다

짐승·용·괴물·가면·베일·집단 로고, 얼굴을 감춘 인물 23명은 눈·턱 규격의 대상이 아니다. 감사에 남더라도 정상이다.

`fafnir` `fenrir` `apep` `argos` `cerberus` `polyphemus` `jatayu` `sobek` `jormungandr` `khnum` `lernaean-hydra` `maricha` `talos` `white-dragon-horse` `yamata-no-orochi` `ymir` `daft-punk` `satoshi-nakamoto` `tiger-korea` `muhammad` `viktor-netyksho` `jang-in-pyo` `clowwindy`
