# 노출 0명인 지역 신화 5개 배치

2026-09-23 운영 DB 재조회. 대상은 `myth-africa`, `myth-americas`, `myth-oceania`, `myth-southeast-asia`, `myth-west-asia`다. 배정 132명 중 공개 인물은 작업 전후 모두 **0명**이다. 다섯 팩션은 `published=false`이며 배정 인물 전원이 `inactive`·`hidden=true`다. 선두 15명은 아바타 URL, 한영 bio·읽어보기 초안, `appearance` 관계 17건을 갖고 있다. 15개 아바타 URL은 `HEAD`에서 모두 `200 image/webp`였으나 신원·복식·얼굴 품질을 입증하지 않는다. 원본은 [변경 전 스냅숏](zero-batch-preimage.json), 재조회는 [현재 스냅숏](zero-batch-current.json)에 있다.

| 팩션 | 배정 / 노출 | 현재 선두 | 남은 직접 장애 |
|---|---:|---|---|
| 아프리카 | 37 / 0 | 마케다·메넬리크 1세·순디아타 케이타 | 순디아타의 한국어 책은 [목차에 본인 장](https://www.yes24.com/product/goods/332682)이 있다. 마케다·메넬리크에 연결된 『아프리카의 신화와 전설』의 [공개 목차](https://www.yes24.com/Product/goods/3920986)는 일부만 보여 두 사람의 수록을 입증하지 못한다. 그들을 직접 다루는 『케브라 나가스트』 영문 [ISBN 9781952900556](https://openlibrary.org/books/OL49608757M/The_Kebra_Nagast_The_Glory_of_the_Kings)은 확인했지만 DB에 없어, 작품 등록·관계 전환과 판본 검증이 남았다. 선두 이미지 신원 검수도 남았다. |
| 아메리카 | 32 / 0 | 케찰코아틀·망코 카팍·우이칠로포치틀리 | 우이칠로포치틀리 등록 아바타에 공작새 눈무늬가 있는 기존 확정 결함이 있다. 선두 둘의 아즈텍 한국어판 본문 수록, 망코 카팍 한국어판의 범위가 아직 확인되지 않았다. |
| 오세아니아 | 14 / 0 | 마우이·타갈로아·와케아 | 선두 셋의 등록 아바타 신원과 각 판본의 실제 수록 범위 검수. 나레아우는 아바타가 없지만 선두가 아니므로 세 명만 여는 데 필요한 조건은 아니다. |
| 동남아 | 39 / 0 | 락롱꿘·어우꺼·상 닐라 우타마 | 상 닐라 우타마의 『Genealogy of Kings』 관계는 [싱가포르 국립도서관](https://www.nlb.gov.sg/main/article-detail?cmsuuid=7dc04ff9-f9fb-44ba-867e-8b714f87b324)과 [해당 ISBN](https://www.ipgbook.com/the-genealogy-of-kings-products-9789814914185.php)이 받친다. 락롱꿘·어우꺼의 등록 한국어판 수록 범위 및 선두 이미지 신원 검수는 남았다. |
| 서아시아 | 10 / 0 | 하이크·이스마엘·카르틀로스 | 세 선두의 원전 관계는 기존 감사와 일치하지만 아바타 신원 검수는 남았다. 아드난·카흐탄의 알타바리 관계는 등록 영문판이 [4권](https://sunypress.edu/Books/T/The-History-of-al-abari-Vol.-4)이라 실제 수록 여부를 확인해야 한다. 이 둘은 선두가 아니다. |

확정된 DB 오류 **6행**은 조건부 갱신하고 재조회했다. 네 팩션 소개의 `건국 신화은`을 `건국 신화는`으로, 오세아니아 소개의 `하울로아`를 `할로아`로 바로잡았다. 마우이 bio의 막연한 `조상`은 [Te Ara의 할머니 턱뼈 전승](https://teara.govt.nz/en/photograph/8521/mauis-fish-hook)에 맞춰 한영으로 고쳤다. 타갈로아 읽어보기의 통가·타히티 신과 무조건 같은 신이라는 서술은 [섬마다 계보가 다른 자료](https://teara.govt.nz/en/ranginui-the-sky/page-3)에 맞춰 한영으로 교정했다. [수정 스크립트](zero-batch-fix.mjs), [인물 변경 전](zero-batch-fix-before.json), [팩션 변경 전](zero-batch-faction-fix-before.json)에 값과 조건을 남겼다.

현재는 선두 아바타의 `200` 응답과 필드 존재만으로 공개 판정을 내릴 수 없다. 개별 인물 `active` 전환은 팩션을 닫아도 검색·직접 상세에서 노출되므로, 이 배치에서 132명의 공개 상태·읽어보기 게시·멤버 숨김·팩션 게시 플래그는 변경하지 않았다. 이미지 신원과 위 표의 원전/판본 장애를 해소한 선두부터 묶어 전환해야 한다.
