# 팩션 배정 계획 — 최종 리포트

## 상태
- 배정안: `assignments.json` (574명 전원, `{tag, secondary, reason}` + 배정자 546명에 도감 텍스트)
- 도감 텍스트: `short_desc`/`short_desc_en`/`long_desc`/`long_desc_en`/`quote`/`quote_en` — `celeb_tag_assignments` 수동 행 필드 그대로. 인용구 97건(검증된 발언만, 나머지 null)
- 신규 태그 초안: `new-tags.json` — 19개, name·description 한영·color·parent 완비 (`is_featured`·`sort_order`는 생성 시 부여)
- 배치 산출물: `_out/b1~b6.json` (병합 완료)
- 검증: missing 0 / extra 0 / invalid tag 0 / fiction·myth 태그 0 / 필드·인용쌍 누락 0
- DB 쓰기: 없음 (전원 미등록 후보라 설계도만)
- 미배정(null): 28명 — 억지 매칭 회피. 후원자·혈연·조연급

## 신규 테마 제안 (19개, 승인 요청)

| slug | 한글 후보 | 인원(주+부) | 대분류 제안 |
|---|---|---:|---|
| impostors-and-mysteries | 사칭과 미스터리 | 78 | shadow-world |
| great-explorers | 위대한 탐험가 | 60 | special-features |
| spies | 스파이 | 45 | shadow-world |
| record-breakers | 기록의 인간들 | 37 | paths-of-a-life |
| great-archaeologists | 고고학의 거인 | 37 | special-features |
| survivors | 생존자 | 26 | paths-of-a-life |
| eccentric-fortunes | 괴짜 부호들 | 21 | business-and-industry |
| software-legends | 소프트웨어 거장 | 15 | technology-and-science |
| mad-scientists | 프린지 과학자 | 14 | technology-and-science |
| game-masters | 게임 디자이너 거장 | 12 | technology-and-science |
| computing-pioneers | 컴퓨팅 개척자 | 11 | technology-and-science |
| great-inventors | 위대한 발명가 | 9 | technology-and-science |
| cold-war-frontlines | 냉전 최전선 | 9 | power-and-war |
| soldiers-of-fortune | 용병·모험군인 | 7 | power-and-war |
| self-experimenters | 자기 몸 실험자 | 6 | technology-and-science |
| crime-lords | 조직범죄의 왕 | 6 | shadow-world |
| dictators | 독재자 | 5 | power-and-war |
| measuring-the-earth | 지구를 잰 사람들 | 3 | technology-and-science |
| chinese-warlords | 중국 군벌 | 2 | power-and-war |

## 병합/축소 검토 대상
- `measuring-the-earth` (3명) — 인원 부족. `classical-scholarship` 흡수 또는 유지.
- `chinese-warlords` (2명) — 최소 인원. 시대 고유성은 명확.
- `spies` vs 기존 `spymasters` — 정보기관장 vs 현장 요원, 별개 유지 권장.
- `crime-lords` vs 기존 `mafia` — mafia는 미국 한정, 세계 조직범죄왕 별개 권장.

## 기존 태그 주배정 상위
wild-west 18, wall-street 17, road-to-space 11, revolutionaries 11, self-made 10 —
기존 체계가 수용 가능한 인물은 이동, 어긋나는 묶음은 신규 테마로 제안.

## null 28명
재닛 스탠콤-윌스, 레온 아문센, 콜린 아처, 나바라나 메쿠팔루크, 세첼레, 셀림 아흐메드,
베네시아 버디컴, 시드케옹 툴쿠 남갈, 아나우카크, 마리아 쾨프케, 한스빌헬름 쾨프케,
잭 험프리스, 에밀 가냥, 존 미첼, 로저 스미스, 오토 커너 주니어, 조지프 로이어,
윌리엄 홀 워커, 조지 휠라이트 3세, 엘칸 블라우트, 찰스 제임스 애퍼리, 파트리시오 리바스,
노웰 새먼, 하먼 블레너해싯, 알렉상드르 반자, 이야수 5세, 세르비아의 나탈리예, 드라가 마신

## 다음 단계 (승인 후)
1. 승인된 `new:` slug를 web-bo 테마 편집기로 실제 `celeb_tags` 생성 (비활성 기본)
2. 등록 지목 인물을 `/celebs/new` + register-checklist로 등록
3. 팩션 편집기에서 `celeb_tag_assignments` 배정 + 텍스트 편집
4. 출간 패널로 사진·영상·음악 배치, 진단·퍼블리시 체크
