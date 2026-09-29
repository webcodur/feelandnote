# 비공개 해외 신화 9개 구조 점검

2026-09-23 DB 재조회. 구조 점검 재현: `node data/celeb/myth-opening/hidden-review/world/audit.mjs`. 성서 대표 인물 변경은 [별도 기록](bible-leads.md)을 따른다. `appearance` 수는 `figure_book_characters.relation_type`의 **등록 건수**다. 책 본문에서 실제로 등장하는지까지 이 점검이 입증하지는 않는다.

9개 팩션 모두 `published=false`, 배정 인물 219명 모두 `faction_members.hidden=true` 및 `celebs.publication_status=inactive`다. 한영 팩션 소개는 모두 있다. 인물 219명 모두 한영 bio·한영 읽어보기 초안과 `appearance` 관계가 1건 이상 있지만, 읽어보기 `published_at`은 모두 비어 있다. 아바타 URL은 217명에게 있다. URL의 실제 이미지·신원·크롭과 본문 및 책 관계의 사실성은 별도 검수 대상이다.

| 팩션 | 배정 | 아바타 없는 인물 | 최소 아바타 보유 공개 후보 | 구조상 남은 일 |
|---|---:|---|---|---|
| `myth-africa` | 37 | 없음 | 기존 lead 3명: Makeda, Menelik I, Sundiata Keita | 후보 공개 상태·읽어보기 게시·멤버 숨김·팩션 게시 전환 |
| `myth-americas` | 32 | 없음 | 기존 lead 3명: Huitzilopochtli, Manco Capac, Quetzalcoatl | 동일 |
| `myth-bible` | 25 | Job | Abraham·Moses·Mary를 [대표 인물](bible-leads.md)로 지정 | Job을 포함해 전체 명단을 열려면 아바타 필요 |
| `myth-hindu-lineage` | 16 | 없음 | 기존 lead 3명: Bharata II, Vaivasvata Manu, Yayati | 후보 3명은 구조상 가능; 전원 공개는 별도 검수 |
| `myth-oceania` | 14 | Nareau | 기존 lead 3명: Māui, Tagaloa, Wākea | 후보 3명은 구조상 가능; Nareau를 열려면 아바타 필요 |
| `myth-persia` | 14 | 없음 | 기존 lead 3명: Fereydun, Jamshid, Zahhak | 후보 공개 상태·읽어보기 게시·멤버 숨김·팩션 게시 전환 |
| `myth-slavic` | 32 | 없음 | 기존 lead 3명: Kyi, Lech, Rurik | 동일 |
| `myth-southeast-asia` | 39 | 없음 | 기존 lead 3명: Âu Cơ, Lạc Long Quân, Sang Nila Utama | 동일 |
| `myth-west-asia` | 10 | 없음 | 기존 lead 3명: Hayk, Ishmael, Kartlos | 동일 |

위 선두 27명은 전원 `hidden=true`, `inactive`, 아바타 URL·한영 bio·한영 읽어보기 초안·등장 관계를 보유한다. 저장된 선두 ID는 다음과 같다.

| 팩션 | 숨은 lead ID (`slug`: UUID) |
|---|---|
| Bible | `abraham`: `05340b60-dad1-487e-b705-f81833cd5679`; `moses`: `afaaeba2-9731-47a4-a326-c5d9102f81c3`; `mary`: `c5eb467e-d3d9-4819-b714-f7384506a7ae` |
| Africa | `makeda`: `22e3dc03-fd1a-4ad2-bf49-6affcf36190c`; `menelik-i`: `b96d838e-3dc7-4d40-862b-4d443e7aba93`; `sundiata-keita`: `a38e070b-775b-4668-9f56-05e7c8e54a18` |
| Americas | `huitzilopochtli`: `4e58da0d-4655-47ba-8522-c8906d359a07`; `manco-capac`: `9a69b068-5402-49d8-afdf-18d5af7f2806`; `quetzalcoatl`: `c40cad1f-8cba-4c4b-8965-609deaadfcbf` |
| Hindu lineage | `bharata-2`: `219db041-df14-477a-a47e-41841ebab25e`; `vaivasvata-manu`: `d2d38af7-497b-45f6-bbd1-7dadb4d80dc6`; `yayati`: `fce6657f-0689-4af7-a06b-50551ccb491b` |
| Oceania | `māui`: `a726c494-810e-4826-81e3-2023297f894f`; `tagaloa`: `d3625009-0db1-41ce-8bb7-a9598d74f4bd`; `wākea`: `b7b83a27-e4b3-45bb-a16e-c2ed20709a2d` |
| Persia | `fereydun`: `173be99f-07c3-4c74-a4ea-0cfa4cdc6ed4`; `jamshid`: `0170e0b7-9593-492a-964f-39ae68ab78a3`; `zahhak`: `4b7408d6-edb1-4f73-bdcb-a92cd1037bd8` |
| Slavic | `kyi`: `f60aeff2-e4ac-4c0c-9cf3-7b5f3a14dfcc`; `lech`: `7553a535-8e4c-4e98-84f0-5624d850a862`; `rurik`: `7be1f631-a01e-48ab-a789-e67eeaf1a82f` |
| Southeast Asia | `au-cơ`: `a16372bc-cc86-4d90-b0de-1b14ddd16973`; `lạc-long-quan`: `77036753-fb6f-47a7-ac8e-1cf2c3892084`; `sang-nila-utama`: `7b7f8cbc-56aa-46ee-a680-32d75626e79f` |
| West Asia | `hayk`: `309408c3-5c0a-4fa6-abe5-5c468ddeac49`; `ishmael`: `eca25f05-9d11-4467-b9f6-62780333dd13`; `kartlos`: `630703b9-799c-4e92-b37f-acefac879b46` |

최근 책 보정은 현재 관계에서 확인된다. Lech·Čech·Rus는 각각 `The Slavic Myths`와 `Poland: The First Thousand Years`의 `appearance` 관계 2건이다. Sang Nila Utama는 종전의 무관한 책 대신 `The Genealogy of Kings` 1건이다. 이 두 건의 변경은 여기서 재수정하지 않았다. 등록 건수가 1 이상이라는 사실을 작품 본문의 등장 검증 완료로 해석해서는 안 된다.

구조만으로 전원 공개할 수 있는 상태는 아니다. 먼저 선택한 인물의 이미지 신원·본문·관계 근거를 검수하고, 인물 `active` → 읽어보기 게시 → 해당 멤버 `hidden=false` → 팩션 `published=true` 순서로 반영해야 한다. 나머지 인물은 숨김을 유지할 수 있다. Job·Nareau는 아바타가 없어 active 전환이 DB에서 거부된다.
