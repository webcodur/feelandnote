# 신규 인물 등록 작업 디렉터리

DB 미등록 실존 인물을 발굴해 프로필 데이터까지 채우고, 지목된 인물부터 서비스에 등록하는 작업의 작업장이다.

## 파일 구성

| 경로 | 역할 |
|---|---|
| [`candidates.md`](candidates.md) | 후보 풀 — 판정 기준·특수 판정·분야별 서사 인덱스 |
| [`register-checklist.md`](register-checklist.md) | 다음 단계: 인물 1명 등록할 때 밟는 절차·검사 목록 |
| `data/celeb/new-figures/*.json` | 등록용 레코드 원장 — 프로필 계약 필드를 채운 실제 데이터 |

데이터 원장 필드는 `docs/project/celeb/celeb-01-00-profile.md` 계약 + `celeb_reality` + 진행 상태(`status`)다.

## 진행 보드

| 단계 | 상태 | 설명 |
|---|---|---|
| 1. 후보 수집 | ✅ 완료 | 라운드1 287명 + 관계망 발굴 라운드2 287명 = 574명. 분야별 서사 인덱스는 candidates.md |
| 2. 프로필 초안(bio·title·headline, 한영) | ✅ 완료 | `data/celeb/new-figures/` 26개 JSON(라운드1 13 + round2 13), 574건 전원 작성 |
| 3. 중복 대조 | ✅ 완료 | 라운드1 정확일치 + 라운드2 DB 대조에서 tech.json 5건(하사비스·스워츠·짐머먼·부시넬·러키 — DB에 다른 표기로 등록) 추가 제거. 발주 직전 표기 변형 재확인 필수 |
| 3-2~3-3. headline 경쟁전(라운드1) | ✅ 완료 | 292명 무기명 경쟁 — 한국어 252 교체·40 유지, 영어 242 교체·50 유지. 하드규칙 위반 3건은 풀 내 차선 대체. 플래그·대체 경위는 `flags.json` |
| 3-4. 관계망 작성 | ✅ 완료 | `celeb-07-01` 규격으로 라운드1 인물의 검증된 관계 894건을 `relations/` 13개 파일에 기록(to_en·to_ko·rel_type·note 한영·prospect). 관계 상대마다 등록 가치(hit/candidate/skip) 판정 |
| 3-5. 관계망 신규 후보(라운드 2) | ✅ 완료 | hit 판정 미등록 305명 → `round2-*.json` 287건 작성(프로필 성립 불가 16건 탈락, 라운드1 중복 1건 제거, 등록된 인물 재확인 5건 제거). 같은 무기명 경쟁으로 헤드라인 확정 — 한국어 224 교체·63 유지, 영어 191 교체·96 유지. 플래그 26건·대체 2건은 `flags.json`에 병합 |
| 3-6. 타임라인 초안 | ✅ 완료 | `data/celeb/new-figures/timelines/` 26개 JSON에 574명·2,773사건 기록(celeb-06 계약 필드, kind는 birth·death·education·work·publish·battle·travel·office·meeting·other). 생애 궤적(성장·수학·전환점·관계·말년) 축 위주 인당 평균 4.8건·상한 30. 생몰년 있는 인물의 출생·사망 필수, 연도 0·좌표 반쪽·비정렬 0건. lat/lng는 전부 null — 등록 시 Wikidata 좌표로 보강 |
| 4. 팩트체크 | ✅ 완료 | `factcheck/flags-check.json` — 헤드라인 플래그 73건을 웹 독립 사료로 검증(확인 24·정정 26·논쟁 13·불가검증 9·오류 1, 출처 URL 병기). 정정분은 원장 bio·헤드라인·타임라인에 반영. `factcheck/bio-fixes.json` — 반영 정정 이력 32건(최상급 오류 5 + 판정 반영 27). 논쟁·불가검증 항목은 「전해진다」「추정」류 헤징 유지 |
| 4-2. 감상 콘텐츠 조사 | ✅ 완료 | `contents/` 26개 JSON — 574명 전원 조사, 근거 확인된 관계 482건(BOOK 360·VIDEO 44·MUSIC 37·GAME 41), 채택 인물 202명. celeb-02-01·02-03 규격(type·title 한영·creator·status FINISHED/WANT·source_url·evidence·review 한영). 규격서는 `contents/_spec.md`. 등록 시 각 항목의 source_url 재확인 + 작품 메타 등록(celeb-02-02) 필요 |
| 4-3. 영향력·스펙트럼 초안 | ✅ 완료 | `spectrum/` — 원장과 동명 26개 JSON(닉네임 키 → `influence` 7축 + `persona` 16축 + rationale 한영), `celeb:fill apply` 패치 형식 그대로. 574명 전수, 28배치(4병렬). 검증: 커버리지 574/574·범위·길이·공유 규칙 위반 0, 저장소 게이트(findContentIssues, 실메타 적용) ERROR 0. 영향력 총점 상한 59(B급 7명·C 46·D 521). `no-year` WARN 8,343은 허용 수준 |
| 4-4. 세력도감 배정 설계 | ✅ 완료 | `factions/` — `assignments.json`에 574명 배정안(tag·secondary·reason + 배정 546명에 도감 텍스트 `short_desc`/`long_desc` 한영·`quote` 97건). null 28명은 억지 매칭 회피. 규격 `_spec.md`, 리포트 `_report.md` |
| 4-5. 세력도감 DB 반영 | ✅ 완료 | 신규 테마 19개 `celeb_tags` 생성(is_featured·atlas_published=false) + 배정 622행 `celeb_tag_assignments` 삽입(hidden=true 전원 비노출). `sw/web-bo/scripts/celeb/seed-faction-assignments.ts` (`pnpm --dir sw/web-bo celeb:seed:factions`) |
| 4-6. 부가 데이터 DB 반영 | ✅ 완료 | 스펙트럼·영향력 574명(`celeb:fill apply`, fill.ts에 deceased/profession 메타 전달 누락 수정). 타임라인 2,773건(`seed-timelines.ts`). 감상내역 482건(`seed-contents.ts`, 작품 353 신규+79 기존 매칭). 관계 407건(`seed-relations.ts`, 양끝 등록분만·기존 중복 스킵) |
| 5. 등록 | ✅ 완료(비활성 일괄) | 574명 전원 `inactive`/`light`로 등록 — `sw/web-bo/scripts/celeb/seed-real-inactive.ts`(createCeleb 계약과 동일: generated slug·slug_suffix 충돌 해소·celeb_metrics 초기화). 원장 레코드에 `status: registered`·`celeb_id`·`slug` 기록. readback 574/574 검증 |
| 6. 아바타·활성화 | ⬜ 등록 뒤 작업 | `celeb-avatar-register` 스킬·`celeb-08-01-avatar.md` |
| 7. 등록 후 감사 | ✅ 완료 | QID 512/574(62명은 위키데이터 항목 없음 확정 — `wikidata-qid-retry-sparql.json`). 외부 관계 `celeb_relations_external` 67건 삽입(84건 중 QID 해결분), 잔여 17건은 대상에 항목이 없어 보류. 1950년대생 0건 인물 재조사로 워릭 2권·불로비치 음악 등 3건 `celeb_contents` 추가. 4유형 조사 완료+0건 127명에 `content_research_confirmed_empty_at` 기록 |

## 데이터 원장 (574명)

라운드1 `*.json` 287명 + 라운드2 `round2-*.json` 287명. 라운드2는 관계망에서 발굴된 인물이라 같은 카테고리를 따른다. `relations/`는 라운드1 인물의 관계 원장, `timelines/`는 574명 전원의 생애 사건 초안(파일명 = 원장 파일명), `flags.json`은 헤드라인 심사 플래그(73건)·대체 경위(5건) 보존, `factcheck/`는 4단계 팩트체크 산출물(`flags-check.json` 73건 판정, `bio-fixes.json` 32건 정정 이력).

| 파일 | 라운드1 | 라운드2 | 분야 |
|---|---:|---:|---|
| `archaeology` | 20 | 22 | 발굴·고고학 |
| `exploration` | 27 | 41 | 극지·대탐험 + 여행가·동방 답사 |
| `fortune-eccentric` | 21 | 8 | 부호·수집가·괴짜 귀족 |
| `fraud-mystery` | 21 | 30 | 사기꾼·가짜·미스터리 |
| `espionage` | 18 | 21 | 첩보원·비밀요원 |
| `military` | 15 | 13 | 군사·전쟁 괴짜 |
| `survival-extreme` | 32 | 30 | 생존·인간 극한 |
| `frontier` | 14 | 7 | 서부·인디언·미국 개척 |
| `science` | 26 | 12 | 과학·의학 괴짜·자가실험 |
| `power` | 16 | 30 | 정치·권력·기타 |
| `asia` | 10 | 10 | 아시아·기타 |
| `tech` | 47 | 33 | IT·AI·해커·게임 개발·테크 괴짜 |
| `finance` | 20 | 30 | 금융 투기·사기·기업가 |

## 원장 규칙

- 생몰년: 확실하면 `YYYY-MM-DD`, 불확실하면 연도만, 기원전은 음수(`-595`), 서기 1000년 미만은 0패딩(`0635`). 생존자·미상은 `death_date`를 빈 문자열.
- 직군은 `packages/shared/src/constants/celeb-professions.ts` 16개 코드만.
- 각 레코드의 `status` 필드로 진행을 추적한다: `draft`(초안) → `fact_checked`(검증됨) → `registered`(DB 반영, `celeb_id` 기록).
- 한글 JSON은 Edit 도구로 고치지 않고 Node·Python으로 읽기→파싱→쓰기 한다.
- bio는 조사 초안이다. 「전해진다」류의 일화는 팩트체크 단계에서 살리거나 뺀다.
