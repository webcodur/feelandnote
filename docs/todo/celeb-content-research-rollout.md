# Light 콘텐츠 조사 상태 도입·회수

> 시작: 2026-07-29 · 현행 상태: **실조사 진행 — 최태원·정의선·박찬호·쇼와 천황·이성계·유방·루이 16세·안중근·호레이쇼 넬슨·고종·루이 14세·현장·마리아 테레지아·김홍도·흥선대원군·프톨레마이오스 1세·폴리비오스·투키디데스·헤로도토스·디오게네스·가의·카라바조·나폴레옹 3세·자한기르·자크 루이 다비드·척계광·광해군·안토니오 비발디·필리포 브루넬레스키·정몽주·호스로 1세·조광윤·알 마문 Full 승격, 석가모니·카를 란트슈타이너·칭기즈 칸·손자·유클리드·스키피오 아프리카누스·도요토미 히데요시·유스티니아누스 1세·하룬 알 라시드·김유신·광개토대왕·을지문덕·선덕여왕·강감찬·한니발 바르카·키루스 대왕·네페르티티·아틸라·클레오파트라·항우·하트셉수트·페리클레스·네부카드네자르 2세·이사벨 1세·김옥균·마르코 폴로·호메로스·아르키메데스·히포크라테스·오노노 고마치·테오도라·성삼문·엘레오노르 다키텐·제노비아·노자·신윤복·전봉준·황진이·신사임당·피타고라스·찬드라굽타 마우리아·카니슈카·사포·그라쿠스 형제·안녹산·미트리다테스 6세·클로비스 1세·헤롯 대왕·소하·탁문군·사도 요한·다리우스 1세·마르쿠스 아그리파·카스파르 다비트 프리드리히·우타가와 히로시게·샤 루흐·성덕왕·미하일 8세·상앙·람세스 2세·관중·재러드 카플란 0건 확정, 활성 Light `open 72`**

## 2026-07-30 장부 기반 실조사 시작

첫 운영 대상 최태원은 감상여정에 의존하지 않고 BOOK·VIDEO·GAME·MUSIC
네 유형을 각각 조사했다. 본인 SNS 발언을 보존한 기사, SK 공식 자료,
동시대 보도를 대조하고 네이버 도서·OpenLibrary·TMDB·IGDB에서 작품
메타데이터를 확인했다.

- 채택: BOOK 4건, VIDEO 1건, GAME 1건
- MUSIC: 작품명과 창작자가 함께 특정되는 근거를 이번 검색에서 찾지 못함
- 결과: `light → full`, 실제 콘텐츠 6건
- 장부: 완료 실행 1회, 채택 후보 6건, 출처 11건
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_chey_tae_won_full_research.sql`
- Remotion 스캐폴딩:
  `sw/remotion/public/episodes/chey-tae-won/`
- 적용 후 감사: 활성 Light `open 166 / confirmed_empty 1`, 비활성
  `queued 153 / deferred 148`, 결함 0
- 공개 화면: `https://feelandnote.com/ko/celeb/chey-tae-won`에서 6건 노출 확인

최태원의 문화여정은 폐기 예정 데이터이므로 수정하지 않았다. 다음 순서는
장부 실행이 없는 활성 `open` 163명이다.

두 번째 대상 정의선은 BOOK 1건을 채택했다. 2019년 피터 드러커의
『최고의 질문』을 임원들에게 직접 건네고 이 책을 바탕으로 고객 가치 토론을
이끌었다는 당시 참가 임원의 회고와 동시대 보도를 대조했다. 한국어판은
네이버 도서, 영문판은 OpenLibrary로 판본을 확인했다.

- 결과: `light → full`, 실제 콘텐츠 1건
- VIDEO·GAME: 특정 작품의 감상·추천·플레이 근거 없음
- MUSIC: 학창 시절 클라리넷 활동은 확인했지만 곡명·작곡가가 없어 기각
- 장부: 완료 실행 1회, finding 2건(채택 1·기각 1), 출처 9건
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_chung_eui_sun_full_research.sql`
- Remotion 스캐폴딩:
  `sw/remotion/public/episodes/chung-eui-sun/`
- 공개 화면: `https://feelandnote.com/ko/celeb/chung-eui-sun`에서 1건 노출 확인

세 번째 대상 박찬호는 1997년 조선일보 문답 인터뷰에서 좋아하는 노래로
직접 꼽은 지누션의 「말해줘」를 MUSIC 1건으로 채택했다. Spotify 공개
페이지와 oEmbed에서 트랙 ID·발매일·길이·앨범·표지를 확인했다.

- 결과: `light → full`, 실제 콘텐츠 1건
- BOOK: 장훈의 책을 읽고 영향을 받았다는 직접 발언은 확인했지만, 서명이
  없고 당시 가능한 저서가 복수여서 `장훈의 책(제목 미상)`으로 기각
- VIDEO: 영화 감상은 취미라고 밝혔지만 작품명이 없어 기각
- GAME: 미국식 당구·포켓볼은 실제 큐 스포츠이므로 작품 단위 게임에서 제외
- 장부: 완료 실행 1회, finding 4건(채택 1·기각 3), 출처 7건
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_park_chan_ho_full_research.sql`
- Remotion 스캐폴딩:
  `sw/remotion/public/episodes/park-chan-ho/`
- 적용 후 감사: 활성 Light `open 164 / confirmed_empty 1`, 비활성
  `queued 153 / deferred 148`, 장부 완료 3회, 결함 0
- 공개 화면: `https://feelandnote.com/ko/celeb/park-chan-ho`에서 1건 노출 확인

네 번째 대상 석가모니는 초기 불교 문헌의 자전적 대목과 현대 학술 개설을
대조했다. 두 수행 스승에게서 가르침을 배웠다는 기록은 있지만 제목 있는
책은 아니며, 베다·우파니샤드나 사후 편찬 불경을 본인이 읽은 도서로
역등록할 근거도 없다. 공연·음악·판놀이는 초기 문헌에서 출가 수행자가
삼가는 항목으로 열거될 뿐이었다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 4건 모두 기각
  - BOOK: 두 스승의 가르침은 저작명·판본이 없는 수행 전승
  - VIDEO: 공연·경기 관람은 삼가는 범주이며 작품명 없음
  - GAME: 여덟 줄·열 줄 판놀이 등은 하지 않는 유희 목록
  - MUSIC: 노래·기악을 삼가는 규범이며 특정 곡 없음
- 장부: 완료 실행 1회, 출처 8건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_siddhartha_gautama_empty_research.sql`
- 적용 후 감사: 활성 Light `open 163 / confirmed_empty 2`, 비활성
  `queued 153 / deferred 148`, 장부 완료 4회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/siddhartha-gautama` 응답에서
  `content_count: -1` 확인

다섯 번째 대상 카를 란트슈타이너는 노벨상 공식 전기, 미국
국립과학원 회고록, 오스트리아 대학·의학사 자료를 대조했다. 탐정소설을
남몰래 즐겼다는 기록과 유능한 피아니스트이자 베토벤 해석자였다는 기록은
있지만, 어느 자료도 작품명·작가·곡명을 제시하지 않는다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 2건 모두 기각
  - BOOK: 탐정소설은 장르 선호만 확인되고 작품명·작가가 없음
  - MUSIC: 피아노·베토벤 연주 기록은 있으나 특정 곡명이 없음
- VIDEO·GAME: 생애 자료와 범주별 검색에서 특정 감상·플레이 작품 없음
- 제외: 본인의 저서·논문, 후대 혈액형 교육 콘텐츠, 동명이인인 사제·
  작가 Karl Borromäus Landsteiner와 현대 이론물리학자 자료
- 장부: 완료 실행 1회, finding 2건, 출처 7건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_karl_landsteiner_empty_research.sql`
- 적용 후 감사: 활성 Light `open 162 / confirmed_empty 3`, 비활성
  `queued 153 / deferred 148`, 장부 완료 5회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/karl-landsteiner` 응답에서
  `content_count: -1` 확인

여섯 번째 대상 칭기즈 칸은 『몽골비사』 번역, 구처기 회동 기록, 몽골
놀이 연구와 이란 음악사 자료를 대조했다. 구두 설교, 실제 전통 놀이,
실제 음악 공연까지는 확인했지만 서비스에 등록할 작품 단위 콘텐츠는
식별되지 않았다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 3건 모두 기각
  - BOOK: 『현풍경회록』은 대면 설교의 후대 문헌화이며 완성 도서 독서
    근거가 없음
  - GAME: 어린 시절 자무카와 한 얼음 위 복사뼈 놀이는 디지털 GAME
    작품이 아닌 전통 신체 놀이
  - MUSIC: 부하라 여성 가수들의 공연을 들었지만 곡명·창작자가 전하지 않음
- VIDEO: 생전 매체가 아니며 영화·드라마·다큐멘터리는 모두 후대 재현물
- 장부: 완료 실행 1회, finding 3건, 출처 7건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_genghis_khan_empty_research.sql`
- 적용 후 감사: 활성 Light `open 161 / confirmed_empty 4`, 비활성
  `queued 153 / deferred 148`, 장부 완료 6회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/genghis-khan` 응답에서
  `content_count: -1` 확인

일곱 번째 대상 손자는 『사기』 「손자오기열전」, 『손자병법』 원문·
고전 번역과 현대 전쟁사 연구를 대조했다. 본인 또는 그 학파의 창작물인
『손자병법』은 소비 도서에서 제외했고, 본문이 인용한 선행 병서도
등록 가능한 작품으로 확정하지 못했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 2건 모두 기각
  - BOOK: 『군정(軍政)』은 인용된 선행 병서지만 현전하지 않고 저자·
    판본·역사적 손무 개인의 직접 독서 여부를 확정할 수 없음
  - MUSIC: 징·북은 음악 작품이 아니라 전장 명령 전달 신호
- VIDEO·GAME: 당대 특정 관람 작품이나 디지털 게임 플레이 근거 없음
- 제외: 본인의 『손자병법』, 손빈과 『손빈병법』, 현대 손자 소재 작품
- 장부: 완료 실행 1회, finding 2건, 출처 7건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_sun_tzu_empty_research.sql`
- 적용 후 감사: 활성 Light `open 160 / confirmed_empty 5`, 비활성
  `queued 153 / deferred 148`, 장부 완료 7회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/sun-tzu` 응답에서
  `content_count: -1` 확인

여덟 번째 대상 유클리드는 프로클로스·파포스 전승을 정리한 고전 판본
서문, 수학사 전기와 백과사전을 대조했다. 생애 자료 자체가 극히 적고
모두 수백 년 뒤 기록이라는 한계를 원장에 명시했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: BOOK 1건 기각
  - 에우독소스·테아이테토스의 성과를 종합했다는 증언은 있으나 원저
    제목·판본·전달 방식이 없어 작품 단위 독서로 식별 불가
- VIDEO·GAME·MUSIC: 특정 관람·플레이·감상 작품 근거 없음
- 제외: 본인의 『원론』·『데이터』·『광학』 및 귀속이 논쟁적인 음악이론
  저술, 메가라의 유클리드, 현대 Euclid 소재 콘텐츠
- 장부: 완료 실행 1회, finding 1건, 출처 6건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_euclid_empty_research.sql`
- 적용 후 감사: 활성 Light `open 159 / confirmed_empty 6`, 비활성
  `queued 153 / deferred 148`, 장부 완료 8회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/euclid` 응답에서
  `content_count: -1` 확인

아홉 번째 대상 스키피오 아프리카누스는 리비우스·키케로·세네카의
고대 문헌과 현대 고전학 자료를 대조했다. 가장 큰 함정인 대 스키피오와
양손자 스키피오 아이밀리아누스의 기록을 분리했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 4건 모두 기각
  - BOOK: 그리스어 책은 제목이 없고, 『키루스의 교육』 독자는 소
    스키피오이며, 엔니우스의 『스키피오』는 소비 증거와 연대가 불확실
  - MUSIC: 축제 때 음악·리듬에 맞춰 춤췄다는 기록은 있으나 곡명 없음
- VIDEO·GAME: 특정 생전 관람 작품이나 디지털 게임 플레이 근거 없음
- 장부: 완료 실행 1회, finding 4건, 출처 9건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_scipio_africanus_empty_research.sql`
- 적용 후 감사: 활성 Light `open 158 / confirmed_empty 7`, 비활성
  `queued 153 / deferred 148`, 장부 완료 9회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/scipio-africanus` 응답에서
  `content_count: -1` 확인

열 번째 대상 쇼와 천황은 궁내청 『쇼와천황실록』의 공식 출판 원장과
실록을 읽고 작품명을 공개한 한도 가즈토시의 설명을 대조했다. 기존의
표적 검색 0건 판정을 전면 조사로 뒤집었다.

- 결과: `light → full`, 실제 콘텐츠 2건
- 채택: BOOK 나쓰메 소세키 『도련님』, VIDEO 오카모토 기하치
  《일본의 가장 긴 날》(1967)
- GAME: 골프 활동은 신체 스포츠라 기각
- MUSIC: 1963년 황실 가족 합주는 곡명이 없어 기각
- 장부: 완료 실행 1회, finding 4건(채택 2·기각 2), 출처 10건
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_emperor_showa_full_research.sql`
- Remotion 스캐폴딩:
  `sw/remotion/public/episodes/emperor-showa/`
- 영화의 일본어·영문 TMDB 포스터를 각각 육안 검수했고, 에피소드 JSON
  4개를 모두 파싱 검증했다.
- 공개 화면:
  `https://feelandnote.com/ko/celeb/emperor-showa` 응답에서
  `content_count: 2` 확인

열한 번째 대상 도요토미 히데요시는 노가쿠협회·일본기원 자료와 덴쇼
소년사절단 공연 연구를 대조했다. 문화 향유 자체는 확인됐지만 서비스의
작품 단위 소비 콘텐츠로 확정되는 것은 없었다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 4건 모두 기각
  - BOOK: 보존 서간·주인장은 본인 작성 문서
  - VIDEO: 《다카사고》《다무라》《세키데라 고마치》 등은 본인이 직접
    공연하거나 발주한 노 작품
  - GAME: 바둑 대회 개최는 디지털 GAME 작품이 아님
  - MUSIC: 1591년 서양 음악을 세 차례 반복 청취했지만 곡명 미상
- 장부: 완료 실행 1회, finding 4건, 출처 7건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_toyotomi_hideyoshi_empty_research.sql`
- 적용 후 감사: 활성 Light `open 156 / confirmed_empty 8`, 비활성
  `queued 153 / deferred 148`, 장부 완료 11회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/toyotomi-hideyoshi` 응답에서
  `content_count: -1` 확인

열두 번째 대상 이성계는 『태조실록』 총서의 한문 원문·국역과
하이델베르크대 출판 현대 전기를 대조했다. 실록은 진덕수
『대학연의』를 특히 좋아해 밤중까지 잠들지 않았다고 명시한다.

- 결과: `light → full`, 실제 콘텐츠 1건
- 채택: BOOK 진덕수 『대학연의』
- GAME: 22세 때 직접 한 격구는 실제 승마 구기라 기각
- MUSIC: 정도전의 《몽금척》《수보록》 등은 본인을 찬양하도록 바친
  개국 악장이며 개인의 외부 작품 감상 근거가 없어 제외
- VIDEO: 관람한 특정 연희·극 작품 근거 없음
- 장부: 완료 실행 1회, finding 2건(채택 1·기각 1), 출처 8건
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_yi_seong_gye_full_research.sql`
- 기존 『대학연의』는 저장 `user_count=2`, 실제 연결 3건으로 어긋나
  있었으며 신규 연결 뒤 실측 4건으로 동기화했다.
- Remotion 스캐폴딩:
  `sw/remotion/public/episodes/yi-seong-gye/`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/yi-seong-gye` 응답에서
  `content_count: 1` 확인

열세 번째 대상 유스티니아누스 1세는 법사학 자료, 유스티니아누스 신법
원문, 프로코피오스와 찬송가학 사전을 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 4건 모두 기각
  - BOOK: 로마법대전은 본인이 명한 국가 편찬·교육 사업
  - VIDEO: 극장 공연은 신법의 규제·의례 범주이며 개인 관람 기록 아님
  - GAME: 청색당 지지는 실제 전차경주·정치 파벌 관계
  - MUSIC: 《독생자》는 유스티니아누스·세베루스 사이 저자 귀속이
    논쟁적이며 외부 음악 감상도 아님
- 장부: 완료 실행 1회, finding 4건, 출처 7건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_justinian_i_empty_research.sql`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/justinian-i` 응답에서
  `content_count: -1` 확인

열네 번째 대상 하룬 알 라시드는 그리스-아랍 번역사, 미국
의회도서관 『노래의 책』 원장, 『이란 백과사전』과 알마수디 전승을
대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 4건 모두 기각
  - BOOK: 고대 의학서·『자연학』 번역 후원은 개인 독서작 미확정
  - VIDEO: 『천일야화』는 하룬을 등장시킨 후대 허구 작품
  - GAME: 락까 경마는 실제 스포츠
  - MUSIC: 하룬을 위해 선곡된 100곡의 존재는 강하게 확인되지만,
    개별 청취곡을 현대 작품 식별자와 안전하게 연결할 수 없음
- 장부: 완료 실행 1회, finding 4건, 출처 8건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_harun_al_rashid_empty_research.sql`
- 적용 후 감사: 활성 Light `open 153 / confirmed_empty 10`, 비활성
  `queued 153 / deferred 148`, 장부 완료 14회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/harun-al-rashid` 응답에서
  `content_count: -1` 확인

열다섯 번째 대상 김유신은 『삼국사기』·국사편찬위원회 자료와
국립경주박물관의 임신서기석 설명을 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 2건 모두 기각
  - BOOK: 임신서기석의 경전 학습 맹세는 김유신이 아니라 이름 없는
    신라 청년 두 사람의 기록
  - GAME: 김춘추와 함께 한 축국은 실제 공놀이·신체 운동
- VIDEO·MUSIC: 특정 관람·감상 작품 근거 없음
- 장부: 완료 실행 1회, finding 2건, 출처 6건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_kim_yu_sin_empty_research.sql`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/kim-yu-sin` 응답에서
  `content_count: -1` 확인

열여섯 번째 대상 광개토대왕은 『삼국사기』 광개토왕조,
광개토왕릉비 원문·해제와 국사편찬위원회 생애 자료를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: BOOK 1건 기각
  - 광개토왕릉비는 광개토왕 사후 414년 장수왕대에 세운 능비이며
    본인의 독서물이 아님
- VIDEO·GAME·MUSIC: 특정 작품 근거 없음. 평양 9사 창건은 국가 불교
  후원이지 특정 불경·찬가 감상 기록이 아니며 전쟁은 디지털 게임이 아님
- 장부: 완료 실행 1회, finding 1건, 출처 5건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_gwanggaeto_the_great_empty_research.sql`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/gwanggaeto-the-great` 응답에서
  `content_count: -1` 확인

열일곱 번째 대상 을지문덕은 『삼국사기』 을지문덕 열전과
국사편찬위원회 생애 자료를 대조했다. 사료는 글을 읽고 지을 수 있었다고
전하지만 읽은 작품명은 남기지 않는다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 2건 모두 기각
  - BOOK: 「여수장우중문시」는 본인이 지어 우중문에게 보낸 전술 서신
  - GAME: 정탐·거짓 패배·유인으로 이어진 살수대첩은 실제 전쟁
- VIDEO·MUSIC: 특정 관람·감상 작품 근거 없음
- 장부: 완료 실행 1회, finding 2건, 출처 6건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_eulji_mundeok_empty_research.sql`
- 적용 후 감사: 활성 Light `open 150 / confirmed_empty 13`, 비활성
  `queued 153 / deferred 148`, 장부 완료 17회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/eulji-mundeok` 응답에서
  `content_count: -1` 확인

열여덟 번째 대상 선덕여왕은 『삼국사기』·『삼국유사』 원문과
국사편찬위원회 주석을 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 2건 모두 기각
  - BOOK: 자장이 당에서 가져온 대장경 일부는 승려의 구법·국가 불교
    정비 기록이며 여왕이 읽은 특정 경전이 아님
  - VIDEO: 나비 없는 모란 그림은 정지 회화이고 작자·고유 작품명이 없으며
    중국 측 기록도 없는 후대 왕권 설화
- GAME·MUSIC: 특정 플레이·감상 작품 근거 없음
- 장부: 완료 실행 1회, finding 2건, 출처 6건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_queen_seondeok_empty_research.sql`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/queen-seondeok` 응답에서
  `content_count: -1` 확인

열아홉 번째 대상 강감찬은 『고려사』 열전·세가와 국사편찬위원회
생애·귀주대첩 해설을 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 2건 모두 기각
  - BOOK: 『낙도교거집』·『구선집』은 강감찬 본인의 소실 저술
  - GAME: 귀주대첩은 실제 전투이지 디지털 게임이 아님
- 공부를 좋아했다는 기록에는 읽은 책 제목이 없고 VIDEO·MUSIC에도 특정
  관람·감상 작품 근거가 없음
- 장부: 완료 실행 1회, finding 2건, 출처 6건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_gang_gam_chan_empty_research.sql`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/gang-gam-chan` 응답에서
  `content_count: -1` 확인

스무 번째 대상 한니발 바르카는 코르넬리우스 네포스·폴리비오스·
디오도로스의 고대 기록과 고전학 주석을 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: BOOK 2건 모두 기각
  - 그나이우스 만리우스 불소의 아시아 행적에 관한 책은 한니발 본인의
    그리스어 저술
  - 소실루스의 7권짜리 한니발 전쟁사는 동행자의 소실 저술이며 한니발이
    읽었다는 증거가 없음
- 그리스 문학 교육에는 작품명이 없고 VIDEO·GAME·MUSIC에도 특정
  관람·플레이·감상 작품 근거가 없음
- 장부: 완료 실행 1회, finding 2건, 출처 6건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_hannibal_barca_empty_research.sql`
- 적용 후 감사: 활성 Light `open 147 / confirmed_empty 16`, 비활성
  `queued 153 / deferred 148`, 장부 완료 20회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/hannibal-barca` 응답에서
  `content_count: -1` 확인

스물한 번째 대상 키루스 대왕은 키루스 원통·헤로도토스·크세노폰과
동시대·후대 자료에 대한 자료 비판을 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: BOOK 2건 모두 기각
  - 키루스 원통은 키루스의 명령으로 작성·매장한 왕실 포고문
  - 『키루스의 교육』은 키루스 사후 약 2세기 뒤 크세노폰이 쓴 허구적 전기
- VIDEO·GAME·MUSIC: 특정 관람·플레이·감상 작품 근거 없음
- 장부: 완료 실행 1회, finding 2건, 출처 7건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_cyrus_the_great_empty_research.sql`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/cyrus-the-great` 응답에서
  `content_count: -1` 확인

스물두 번째 대상 네페르티티는 UCL·대영박물관·메트로폴리탄미술관의
아마르나 유물·종교 해설을 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 2건 모두 기각
  - BOOK: 아텐 대찬가는 왕실 종교 의례 비문이며 개인 독서 기록이 아님
  - MUSIC: 여성 음악가 부조는 궁정 음악 일반만 보여 주고 네페르티티의
    참석 여부·곡명·연주자를 식별하지 못함
- 네페르타리의 세네트 장면을 네페르티티로 오인하지 않았고 VIDEO에도
  특정 관람 작품 근거 없음
- 장부: 완료 실행 1회, finding 2건, 출처 6건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_nefertiti_empty_research.sql`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/nefertiti` 응답에서
  `content_count: -1` 확인

스물세 번째 대상 아틸라는 448년 궁정을 직접 방문한 프리스쿠스의 기록을
대학 원문 자료 두 곳에서 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 2건 모두 기각
  - MUSIC: 아틸라의 승리와 무훈을 기린 실제 노래 청취는 확인되지만
    곡명·가수명·가사·현대 음원 식별자가 모두 전하지 않음
  - VIDEO: 제르콘의 연회 희극은 공연명·대본·작품 경계가 없음
- BOOK·GAME: 외교 서신과 실제 사냥·전쟁은 소비한 책·디지털 게임이 아님
- 장부: 완료 실행 1회, finding 2건, 출처 5건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_attila_empty_research.sql`
- 적용 후 감사: 활성 Light `open 144 / confirmed_empty 19`, 비활성
  `queued 153 / deferred 148`, 장부 완료 23회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/attila` 응답에서
  `content_count: -1` 확인

스물네 번째 대상 클레오파트라 7세는 플루타르코스 『안토니우스전』의
그리스어·영문 판본과 현대 도서관사 자료를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 2건 모두 기각
  - BOOK: 페르가몬 도서관 20만 권은 정적이 제기한 혐의이자 장서
    소유·기증 관계일 뿐 개별 작품 독서가 아님
  - MUSIC: 타르수스 입성의 피리·관악 연주는 실제지만 곡명·연주자 미상
- 다언어 능력에는 작품명이 없고 낚시 장난·연회는 VIDEO·GAME 작품이 아님
- 장부: 완료 실행 1회, finding 2건, 출처 6건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_cleopatra_empty_research.sql`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/cleopatra` 응답에서
  `content_count: -1` 확인

스물다섯 번째 대상 항우는 사마천 『사기』 「항우본기」 원문·영역을
대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 3건 모두 기각
  - BOOK: 어릴 때의 학서(學書)는 작품명 없는 문자 학습
  - MUSIC: 「해하가」는 항우 본인의 창작
  - MUSIC: 사면초가의 실제 청취는 확인되지만 곡명·가수명·가사가 없음
- 검술·병법·실제 전쟁은 디지털 GAME이 아니며 VIDEO 작품도 없음
- 장부: 완료 실행 1회, finding 3건, 출처 6건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_xiang_yu_empty_research.sql`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/xiang-yu` 응답에서
  `content_count: -1` 확인

스물여섯 번째 대상 하트셉수트는 UCL·대영박물관·
메트로폴리탄미술관의 비문·부조·생애 자료를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 2건 모두 기각
  - BOOK: 스페오스 아르테미도스 비문은 본인 명의 왕실 선전·봉헌문
  - VIDEO: 데이르 엘바흐리 푼트 원정 부조는 정지 사원 벽화
- GAME·MUSIC: 특정 플레이·감상 작품 근거 없음
- 장부: 완료 실행 1회, finding 2건, 출처 6건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_hatshepsut_empty_research.sql`
- 적용 후 감사: 활성 Light `open 141 / confirmed_empty 22`, 비활성
  `queued 153 / deferred 148`, 장부 완료 26회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/hatshepsut` 응답에서
  `content_count: -1` 확인

스물일곱 번째 대상 페리클레스는 플루타르코스 『페리클레스전』과
현대 고전학 사전·다몬 연구를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 2건 모두 기각
  - VIDEO: 아이스킬로스 《페르시아인들》의 코레고스는 합창단
    훈련·비용을 맡은 제작·후원 역할이며 관객 감상 기록이 아님
  - MUSIC: 다몬·피토클레이데스에게 음악을 배웠지만 곡명이 없음
- BOOK·GAME: 특정 외부 저작 독서나 디지털 게임 플레이 근거 없음
- 장부: 완료 실행 1회, finding 2건, 출처 6건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_pericles_empty_research.sql`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/pericles` 응답에서
  `content_count: -1` 확인

스물여덟 번째 대상 유방은 《사기》·《한서》 육가 열전과 한대 철학
연구를 대조했다.

- 결과: `light → full`, 실제 콘텐츠 1건
- 채택: BOOK 육가 《신어》
  - 유방이 저술을 명하고 육가가 열두 편을 한 편씩 올릴 때마다
    칭찬했다는 직접 수용 기록
- MUSIC: 《대풍가》는 유방 본인의 창작·가창이라 기각
- VIDEO·GAME: 특정 관람·플레이 작품 근거 없음
- 기존 《신어》 en locale의 동명이인 경요(Qiongyao) 책 오매칭을
  네이버 한국어판 ISBN·표지 기준으로 교정
- 장부: 완료 실행 1회, finding 2건(채택 1·기각 1), 출처 7건
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_liu_bang_full_research.sql`
- Remotion 스캐폴딩:
  `sw/remotion/public/episodes/liu-bang/`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/liu-bang` 응답에서
  `content_count: 1` 확인

스물아홉 번째 대상 네부카드네자르 2세는 대영박물관·
메트로폴리탄미술관·바티칸박물관의 왕실 비문과 다니엘서 전승을
대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 2건 모두 기각
  - BOOK: 건축 원통은 본인 명의 왕실 건축·봉헌 비문
  - MUSIC: 다니엘서 3장은 의례 신호용 악기군만 열거하고
    곡명·연주자·왕의 개인 선호를 특정하지 않음
- VIDEO·GAME: 특정 관람·플레이 작품 근거 없음
- 장부: 완료 실행 1회, finding 2건, 출처 6건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_nebuchadnezzar_ii_empty_research.sql`
- 적용 후 감사: 활성 Light `open 138 / confirmed_empty 24`, 비활성
  `queued 153 / deferred 148`, 장부 완료 29회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/nebuchadnezzar-ii` 응답에서
  `content_count: -1` 확인

서른 번째 대상 이사벨 1세는 독서 관행 연구, 왕실 장서, 클리블랜드
미술관 원고 설명과 음악사 연구를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: 4건 모두 기각
  - BOOK: 《Vita Christi》는 번역·필사·인쇄 후원에서 선호를 추론한
    것이며 직접 독서 기록이 아님
  - BOOK: 이름 없는 일상 기도서를 현존
    《Hours of Queen Isabella the Catholic》과 동일시할 수 없음
  - GAME: 체스 교육·도상 연관은 물리 보드게임이며 디지털 작품이 아님
  - MUSIC: 왕실 음악책·궁정 레퍼토리 소유는 특정 곡 감상 증거가 아님
- 장부: 완료 실행 1회, finding 4건, 출처 6건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_isabella_i_empty_research.sql`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/isabella-i` 응답에서
  `content_count: -1` 확인

서른한 번째 대상 김옥균은 한국사데이터베이스·우리역사넷·
한국민족문화대백과와 한일 개화사상 연구를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- finding: BOOK 2건 모두 기각
  - 후쿠자와 유키치의 《문명론의 개략》은 사상적 영향 연구만 있고
    김옥균의 편지·일기·장서·동시대 증언에 직접 독서가 없음
  - 《치도약론》·《갑신일록》은 김옥균 본인의 저술
- VIDEO·GAME·MUSIC: 작품명과 개인 소비 행위가 함께 확인되는 근거 없음
- 장부: 완료 실행 1회, finding 2건, 출처 5건
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_kim_ok_gyun_empty_research.sql`
- 공개 화면:
  `https://feelandnote.com/ko/celeb/kim-ok-gyun` 응답에서
  `content_count: -1` 확인

서른두 번째 대상 루이 16세는 예일대 루이스 월폴 도서관의 친필 원고,
시종 장바티스트 클레리의 감금 일지와 흄 수용사 연구를 대조했다.

- 결과: `light → full`, 실제 콘텐츠 2건
- 채택: BOOK 2건
  - 호러스 월폴
    《Historic Doubts on the Life and Reign of King Richard the Third》
    — 루이 16세가 프랑스어로 완역한 82쪽 친필 원고가 현존
  - 데이비드 흄 《The History of England》
    — 사형 선고 뒤 찰스 1세의 죽음을 다룬 권을 요청해 며칠간 읽었다는
    클레리의 1차 기록
- GAME: 자물쇠 제작·사냥·체스는 기술·스포츠·물리 보드게임이라 기각
- VIDEO·MUSIC: 제목 있는 개인 감상작을 확인하지 못함
- 장부: 완료 실행 1회, finding 3건(채택 2·기각 1), 출처 7건
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_louis_xvi_full_research.sql`
- Remotion 스캐폴딩:
  `sw/remotion/public/episodes/louis-xvi/`
- 기존 흄 콘텐츠에 기번 《로마 제국 쇠망사》 속표지가 잘못 붙은 것을
  육안 검수에서 발견했다. 누락된 ko locale를 만든 뒤 ko/en 모두
  OpenLibrary `OL32761335M`, ISBN `9780353534254`, 정확한 흄 표지로
  교정하고 Remotion 캐시도 다시 받았다.
- 교정 SQL:
  `sw/web/supabase/ops/20260730_fix_louis_xvi_hume_ko_locale.sql`,
  `sw/web/supabase/ops/20260730_fix_hume_history_cover.sql`
- 적용 후 감사: 활성 Light `open 135 / confirmed_empty 26`, 비활성
  `queued 153 / deferred 148`, 장부 완료 32회, 결함 0
- 공개 화면:
  `https://feelandnote.com/ko/celeb/louis-xvi` 응답에서
  `content_count: 2` 확인

서른세 번째 대상 안중근은 1910년 옥중 유묵과 독립기념관·학술 자료를
대조했다. 유묵에 『논어』 여러 편의 구절을 직접 골라 쓴 흔적이 남아 있어
단순 유교 교육 일반이 아닌 작품 단위 수용으로 판정했다.

- 결과: `light → full`, 실제 콘텐츠 1건
- 채택: BOOK 공자 『논어』
- 제외: 본인의 『안응칠 역사』·『동양평화론』과 본인 시가, 후대 전기
  영상, 사격·승마 같은 실제 활동
- 장부: 완료 실행 1회, 채택 finding 1건, 네 유형별 출처·완료 기록 보존
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_an_jung_geun_full_research.sql`
- Remotion 스캐폴딩:
  `sw/remotion/public/episodes/an-jung-geun/`
- 공개 화면: `https://feelandnote.com/celeb/an-jung-geun`에서
  `content_count: 1` 확인

서른네 번째 대상 호레이쇼 넬슨은 1800년 11월 21일자
《Edinburgh Advertiser》 한 호 전체와 해당 신문 실물의 경매 원장,
넬슨 자료집을 대조했다. 헤이마켓 극장에서 「Rule, Britannia!」가
불릴 때 넬슨이 현장에 있었고 관객이 후렴을 함께 불렀다는 동시대 기록을
확인했다.

- 결과: `light → full`, 실제 콘텐츠 1건
- 채택: MUSIC 토머스 아른 「Rule, Britannia!」
- 제외: 넬슨의 기함이 아닌 함대 노래와 제목 없는 물리 카드놀이
- 메타데이터: Spotify 트랙 `3AYHlS6n5jZAwEpqtHTEKA`
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_horatio_nelson_full_research.sql`
- Spotify oEmbed의 CDN 별칭은 기존 이미지 허용 목록과 맞지 않아 같은
  공식 이미지의 `i.scdn.co` 주소로 정규화했다. dry-run 뒤 DB·원본 SQL·
  Remotion을 함께 교정했다:
  `sw/web/supabase/ops/20260730_fix_horatio_nelson_spotify_thumbnail.sql`
- Remotion 스캐폴딩:
  `sw/remotion/public/episodes/horatio-nelson/`
- 공개 화면: `https://feelandnote.com/celeb/horatio-nelson`에서
  `content_count: 1` 확인

서른다섯 번째 대상 고종은 1880년 김홍집이 가져온 황준헌의
『조선책략』을 고종이 전·현직 대신들에게 돌려 검토하게 하고, 나흘 안에
대미 관계 방침을 전달하도록 이동인을 보냈다는 국사편찬위원회 기록을
대조했다.

- 결과: `light → full`, 실제 콘텐츠 1건
- 채택: BOOK 황준헌 『조선책략』
- 제외: 제목을 알 수 없는 1907년 왕실 영화 상영, 실제 당구, 곡명이
  전하지 않는 박춘재 축음기 시연
- 메타데이터: 네이버 BOOK ISBN `9788908062290`
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_gojong_full_research.sql`
- Remotion 스캐폴딩:
  `sw/remotion/public/episodes/gojong/`
- 공개 화면: `https://feelandnote.com/celeb/gojong`에서
  `content_count: 1` 확인

세 대상의 에피소드 JSON 9개를 모두 파싱했고, 『논어』·「Rule,
Britannia!」·『조선책략』 로컬 표지는 작품 일치와 실사용 가능성을 육안
확인했다. 적용 후 전수 감사 기준선은 활성 Light
`open 132 / confirmed_empty 26`, 비활성 `queued 153 / deferred 148`,
장부 완료 35회이며 모든 감사 결함은 0건이다.

서른여섯 번째 대상 루이 14세는 1676년 《아티스》 초판 대본과
베르사유 바로크음악센터 자료를 대조했다. 초판 표제지는 1월 10일
생제르맹앙레에서 국왕 앞에 상연됐다고 적고, 센터는 국왕이 초연 한 달
전부터 여러 리허설에 참석했다고 확인한다.

- 결과: `light → full`, 실제 콘텐츠 1건
- 채택: MUSIC 장바티스트 륄리·필리프 키노 《아티스》
- 제외: 서명·저자가 특정되지 않는 샤를 6세 역사서, 실연 무대인
  코미디 발레, 실제 당구·사냥·보드게임
- 메타데이터: Spotify 전곡 음반 `2zXarYBGc4FPVECGrwYwFq`
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_louis_xiv_full_research.sql`
- Remotion 스캐폴딩:
  `sw/remotion/public/episodes/louis-xiv/`
- 전곡 표지와 에피소드 JSON 3개를 육안·파싱 검수했다.

서른일곱 번째 대상 마르코 폴로는 《동방견문록》 원문·헨리 율 주석,
이란 백과사전과 스미스소니언 전기를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: 알렉산더 로망스의 문학적 흔적은 있으나 읽은 언어·개별
  서명·판본을 특정할 수 없고 루스티켈로의 개입 가능성도 있음
- GAME: 쿠빌라이 궁정의 사냥·유희는 실제 활동이며 수영장 놀이
  Marco Polo와 폴로 경기는 인물과 무관
- MUSIC: 연회·전투 음악 상황은 확인되지만 곡명·창작자가 없음
- VIDEO: 특정 생전 관람작 없이 후대 각색물만 확인됨
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_marco_polo_empty_research.sql`

서른여덟 번째 대상 호메로스는 대영박물관·케임브리지·페르세우스와
고전학 강의를 대조했다. 가장 이른 외부 언급도 추정 생존 시기보다
수세기 늦고 고대 전기들은 출생지·시대·실명부터 충돌한다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: 선행 구전 서사 전통은 제목·개별 창작자·고정 텍스트가 없음
- MUSIC: 눈먼 음유시인·데모도코스 연결은 후대 전기적 추론이며 외부
  곡이 아닌 본인 창작 공연 전승
- VIDEO·GAME: 시대상 존재하지 않고 검색 결과는 후대 각색물뿐임
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_homer_empty_research.sql`

적용 후 전수 감사 기준선은 활성 Light
`open 129 / confirmed_empty 28`, 비활성 `queued 153 / deferred 148`,
장부 완료 38회이며 모든 감사 결함은 0건이다.

서른아홉 번째 대상 아르키메데스는 본인 저술의 서문, 플루타르코스
《마르켈루스전》, 페르세우스와 세인트앤드루스대 수학사 자료를
대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: 알렉산드리아에서 유클리드 후계자들에게 배웠다는 설명은 현대의
  개연성 높은 추정이며 특정 책 독서 기록이 아님
- GAME: 《Stomachion》은 본인 귀속 수학 저술·물리 퍼즐
- VIDEO·MUSIC: 전쟁 기계·후대 전기와 공성 장비의 악기 모양 비유 외에
  제목 있는 소비 작품 없음
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_archimedes_empty_research.sql`

마흔 번째 대상 히포크라테스는 플라톤의 동시대 언급과 NLM·PMC
의학사 연구를 대조했다. 동시대 기록은 의사·교사라는 사실만 전하고
첫 상세 전기는 약 6세기 뒤 소라노스에게서 나온다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: 《히포크라테스 전집》은 본인·학파 귀속 저술이며 개별 저자도
  불확실함. 피타고라스 자연론과의 유사성은 특정 저작 독서가 아님
- VIDEO·GAME·MUSIC: 후대 각색·운동 처방·음악 치료 일반론 외에
  개인이 소비한 식별 작품 없음
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_hippocrates_empty_research.sql`

마흔한 번째 대상 오노노 고마치는 도쿄대, 일본 국립극장
디지털라이브러리, 박물관·문학 연구를 대조했다. 역사적 생애는 거의
알려지지 않고 현존 정보의 상당수가 12세기 이후 전설에서 형성됐다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: 《고킨와카슈》·《고마치슈》는 본인 시와 사후 편집물
- VIDEO: 고마치 노·가부키는 사후 수세기 뒤의 전설 각색
- GAME: 《오구라 백인일수》는 13세기 편찬, 가루타는 에도시대 물리 놀이
- MUSIC: 와카 창작과 후대 각색 외에 특정 감상곡 없음
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_ono_no_komachi_empty_research.sql`

캐시 무효화 뒤 세 공개 페이지 모두 `content_count: -1`을 확인했다.
적용 후 전수 감사 기준선은 활성 Light
`open 126 / confirmed_empty 31`, 비활성 `queued 153 / deferred 148`,
장부 완료 41회이며 모든 감사 결함은 0건이다.

마흔두 번째 대상 테오도라는 프로코피오스 《비사》, 클레어몬트 콥트
백과와 케임브리지 극장·히포드롬 연구를 대조했다. 동시대 핵심 사료가
적대적 수사라는 한계를 별도로 기록했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: 종교 정책·성직자 보호와 별개로 특정 외부 저작 독서 기록 없음
- VIDEO: 확인되는 무대 관계는 테오도라 자신의 공연이며 작품명도 없음
- GAME: 니카 반란의 청색당·녹색당 전차경주는 실제 스포츠·정치 사건
- MUSIC: 피리·하프·춤 대목은 본인의 무대 기능을 논한 것이며 감상곡 아님
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_theodora_empty_research.sql`

마흔세 번째 대상 성삼문은 《조선왕조실록》 원문·국역과
한국민족문화대백과사전·성균관대 한국유경편찬센터 전기를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: 사가독서는 서명 미상, 《홍무정운》·《사성통고》·《동국정운》은
  국가 질정·편찬 업무. 공동 상소의 《시》·《예》 언급은 개인 독서 진술 아님
- VIDEO·MUSIC: 환동 선발과 창기 가무 교육은 명 사신 응대 행정이며
  공연명·곡명·창작자가 없음
- GAME: 바둑·장기·놀이 표기 변형까지 검색했으나 디지털 작품 기록 없음
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_seong_sam_mun_empty_research.sql`

마흔네 번째 대상 엘레오노르 다키텐은 네덜란드 국립도서관의 시편집,
베르나르 드 벤타도른 원문을 인용한 케임브리지 자료와 최신 중세사 연구를
대조했다. 널리 반복되는 “트루바두르의 여왕” 통념을 실제 감상으로
바꾸지 않았다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: 이른바 엘레오노르 시편집은 주문자 귀속이 추정이며 실제
  소유·사용·독서 기록이 없음
- MUSIC: 전령에게 “노르만인의 왕비”에게 노래하라는 문구는 수신자 동일성,
  실제 전달과 청취를 입증하지 못함
- GAME: 사랑의 법정은 실제 행사가 아니라 후대 풍자적 문학 허구
- VIDEO: 생전 특정 공연 관람 기록 없이 후대 로망스·연극·영상만 확인됨
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_eleanor_of_aquitaine_empty_research.sql`

세 SQL은 각각 프로덕션 연결 `ROLLBACK` dry-run을 먼저 통과한 뒤
`COMMIT`했다. 출처 18개는 모두 HTTP 200을 확인했고, 캐시 무효화 뒤 세
공개 페이지 모두 `content_count: -1`을 반환했다. 적용 후 전수 감사
기준선은 활성 Light `open 123 / confirmed_empty 34`, 비활성
`queued 153 / deferred 148`, 장부 완료 44회이며 모든 감사 결함은 0건이다.

마흔다섯 번째 대상 제노비아는 『히스토리아 아우구스타』 원문과
조시무스, Livius의 사료 평가, 프랑스 문화부 팔미라 자료를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: “그리스어로 읽은 로마사”는 작품명·저자가 없고 동방사 요약은 자작물
- VIDEO: 팔미라 극장의 존재와 후대 제노비아 공연은 본인 관람작이 아님
- GAME: 사냥·기마·군사 활동은 실제 활동이며 디지털 작품이 아님
- MUSIC: 왕실 연회 일반론에 곡명·창작자·개인 청취 기록이 없음
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_zenobia_empty_research.sql`

마흔여섯 번째 대상 현장은 혜립·언종이 편찬한 7세기
『대자은사삼장법사전』 BDK 완역 PDF와 IEP·유네스코·국립중앙박물관
자료를 대조했다. 전기에서 현장은 계현에게 『유가사지론』을 배우려고
중국에서 왔다고 직접 말하며, 계현이 현장을 위해 15개월 동안 강의하고
현장이 해설을 세 차례 들었다고 기록한다.

- 결과: `light → full`, 실제 콘텐츠 1건
- 채택: BOOK 『유가사지론』
- 제외: 후대 서유기·현장 영상과 게임, 실제 순례·논쟁, 독경·의례 일반론
- 메타데이터: 네이버 도서 ISBN `9791168561618`
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_xuanzang_full_research.sql`
- Remotion 스캐폴딩:
  `sw/remotion/public/episodes/xuanzang/`
- 대상 리소스 동기화: `1건 성공 / 실패 0`
- 표지는 작품·판본 일치를 육안 확인했고 JSON 3개는 모두 파싱했다.

마흔일곱 번째 대상 노자는 『사기』 권63 원문과 Stanford 철학백과의
현대 문헌학 평가를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: 주 왕실 장서 관리 직책에는 특정 서명이 없고 『도덕경』은
  본인 저술 전승이자 단일 저자·역사 인물 동일성이 불확실함
- VIDEO·MUSIC: 후대 신격화·의례·낭송·음악화는 생전 감상작이 아님
- GAME: 양생·수행 전승과 현대 게임 캐릭터화는 본인 플레이 기록이 아님
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_laozi_empty_research.sql`

세 SQL은 각각 프로덕션 연결 `ROLLBACK` dry-run을 통과한 뒤 `COMMIT`했다.
캐시 무효화 뒤 제노비아·노자는 `content_count: -1`, 현장은
`content_count: 1`과 『유가사지론』 노출을 확인했다. 적용 후 전수 감사
기준선은 활성 Light `open 120 / confirmed_empty 36`, 비활성
`queued 153 / deferred 148`, 장부 완료 47회이며 모든 감사 결함은 0건이다.

마흔여덟 번째 대상 신윤복은 한국민족문화대백과사전의
『신윤복필풍속도화첩』 해설과 국립중앙박물관 소장품 자료를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: 김홍도·신한평·선행 풍속화는 비교·영향 추정이며 특정 감상작 아님
- VIDEO: 「쌍검대무」·「무녀신무」는 그림 제목과 소재이지 관람작이 아님
- GAME: 「연소답청」의 꽃놀이·풍류는 생활 풍속이며 디지털 작품이 아님
- MUSIC: 거문고·생황이 그려졌지만 곡명·창작자·본인 청취가 특정되지 않음
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_shin_yun_bok_empty_research.sql`

마흔아홉 번째 대상 전봉준은 국사편찬위원회의 『전봉준 공초』 원문과
동학 경전·민요 해설, 한국민족문화대백과사전 생애 자료를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: 공초의 “동학 서적 중에”는 서명 불명이며 『동경대전』·
  『용담유사』 독서를 직접 진술하지 않음
- VIDEO: 생전 사건의 후대 공연·영상화는 본인 관람작이 아님
- GAME: 황토현·우금치 전투는 실제 전쟁이며 후대 게임화는 사후 수용물
- MUSIC: 「새야 새야 파랑새야」는 처형 뒤 전봉준을 기린 민요
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_jeon_bong_jun_empty_research.sql`

쉰 번째 대상 황진이는 한국민족문화대백과사전의 사료 한계 설명과
문화체육관광부·국립국악원의 2010년 소리극 제작 기록을 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: “당시를 정공했다”는 후대 야담은 장르 수준이며 작품·저자 불명
- VIDEO: 2010년 소리극과 후대 영화·드라마는 사후 전기 각색물
- GAME: 유혹 일화는 디지털 작품이 아니며 후대 오락화도 생전 이용작 아님
- MUSIC: 거문고·가창 기량에는 곡명이 없고 소리극 34곡은 후대 창작
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_hwang_jini_empty_research.sql`

세 SQL은 각각 프로덕션 연결 `ROLLBACK` dry-run을 통과한 뒤 `COMMIT`했다.
출처 URL은 모두 HTTP 200을 확인했고, 캐시 무효화 뒤 신윤복·전봉준·
황진이 공개 페이지는 모두 `content_count: -1`을 반환했다. 적용 후 전수
감사 기준선은 활성 Light `open 117 / confirmed_empty 39`, 비활성
`queued 153 / deferred 148`, 장부 완료 50회이며 모든 감사 결함은 0건이다.

쉰한 번째 대상 마리아 테레지아는 합스부르크 역사 포털의 궁정 음악·
극장 자료와 빈 미술사박물관 소장으로 안내되는 그라이펠 귀속 초연 그림을
대조했다.

- 결과: `light → full`, 실제 콘텐츠 1건
- 채택: MUSIC 글루크 《Il Parnaso confuso》
- 근거: 1765년 초연 그림에서 네 대공녀는 무대, 마리아 테레지아는
  프란츠 1세·요제프 황태자와 맨 앞줄 관객으로 식별됨
- 제외: 교육개혁·검열 행정, 궁정 실연의 후대 VIDEO 연결, 테니스장·
  후대 교육용 게임
- 메타데이터: Spotify 앨범 `6XAGnK6Cviwpvlzjjbe7qZ`, 16곡·2004년
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_maria_theresa_full_research.sql`

쉰두 번째 대상 김홍도는 한국민족문화대백과사전의 「산수인물도」 실물
해설과 출판사·네이버 도서 메타데이터를 대조했다.

- 결과: `light → full`, 실제 콘텐츠 1건
- 채택: BOOK 『유종원 시선』
- 근거: 김홍도 그림에 유종원 「어옹」 구절이 직접 묵서되고, 연결 판본
  목차에 「늙은 어부(漁翁)」가 실제 수록됨
- 제외: 「무동」의 춤·악대, 「씨름」·「고누놀이」의 물리 놀이,
  곡명 없는 대금·거문고 자가 연주
- 메타데이터: 네이버 도서 ISBN `9791128823107`
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_kim_hong_do_full_research.sql`

쉰세 번째 대상 신사임당은 이이의 「선비행장」을 인용한 국사편찬위원회
자료와 한국민족문화대백과사전을 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: 학문·시문·자녀 교육은 전하지만 특정 외부 서명이 없음
- VIDEO: 안견 화풍 사숙은 작품명 없는 회화 학습이고 후대 영상은 사후 각색
- GAME: 초충도 일화와 후대 교육용 놀이는 본인 이용 작품이 아님
- MUSIC: 거문고 소리에 눈물을 흘린 일화는 곡명·창작자·연주자 불명
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_shin_saimdang_empty_research.sql`

세 SQL은 각각 프로덕션 연결 `ROLLBACK` dry-run을 통과한 뒤 `COMMIT`했다.
마리아 테레지아 음반의 Spotify 표지 원본은 64×64라 영상용으로 불합격
판정했다. 같은 2004년 Albany 전곡 음반의 Apple Music 1000×1000 배포
원본으로 두 locale를 조건부 교정했고, web-bo의 이미지 허용 목록에 공식
CDN `is1-ssl.mzstatic.com` 하나를 추가했다. 최종 Remotion 표지는
마리아 테레지아 620×620, 김홍도 458×672로 작품·판본 일치를 육안 확인했다.
두 대상 리소스 동기화는 각각 `1건 성공 / 실패 0`, JSON 6개 파싱과
허용 목록 파일 lint를 통과했다.

캐시 무효화 뒤 마리아 테레지아·김홍도 공개 페이지는 각각
`content_count: 1`과 작품명을, 신사임당은 `content_count: -1`을
반환했다. 적용 후 전수 감사 기준선은 활성 Light
`open 114 / confirmed_empty 40`, 비활성 `queued 153 / deferred 148`,
장부 완료 53회이며 모든 감사 결함은 0건이다.

쉰네 번째 대상 흥선대원군은 경복궁 낙성연의 진채선 공연을 전한 KBS
역사 자료와 한국민족문화대백과를 대조했다.

- 결과: `light → full`, 실제 콘텐츠 1건
- 채택: MUSIC 「춘향가」 — 오정숙 41곡 완창 음반
- 근거: 진채선이 흥선대원군 앞에서 「성조가」와 「춘향가」를 불렀고,
  그가 소리를 들은 뒤 스승을 묻고 후원했다는 작품 단위 청취 장면
- 제외: 정책 편찬물 『교학정례』, 사후 영화 《도리화가》, 물리 바둑
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_heungseon_daewongun_full_research.sql`

쉰다섯 번째 대상 프톨레마이오스 1세는 프로클로스의 유클리드 주석
공개본 두 종과 UCL·영국박물관 생애 자료를 대조했다.

- 결과: `light → full`, 실제 콘텐츠 1건
- 채택: BOOK 『유클리드 원론』
- 근거: 『원론』보다 기하학을 더 짧게 배우는 길이 있는지 유클리드에게
  물었다는 기록. 수백 년 뒤의 전승이라는 증거 한계는 감상경위에 명시
- 제외: 후대 영상·전략 게임 재현, 궁정 종교·음악 후원 일반론
- 기존 콘텐츠 재사용: 네이버 도서 ISBN `9788957338216`
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_ptolemy_i_full_research.sql`

쉰여섯 번째 대상 폴리비오스는 『역사』 6권 원문과 플라톤
『국가』의 영향을 분석한 현대 고전학 논문을 대조했다.

- 결과: `light → full`, 실제 콘텐츠 1건
- 채택: BOOK 플라톤 『국가·정체』
- 근거: 플라톤과 “플라톤의 정체”를 직접 명명하고 실제 국가의 정체와
  비판적으로 비교한 본문
- 제외: 후대 교육 영상, 역사가와 무관한 동명 아케이드 괴담, 『역사』
  4권의 아르카디아 음악교육 일반론
- 기존 콘텐츠 재사용: 네이버 도서 ISBN `9788930606233`
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_polybius_full_research.sql`

세 SQL은 각각 프로덕션 연결 `ROLLBACK` dry-run을 통과한 뒤 `COMMIT`했다.
DB→Remotion 원칙에 따라 세 에피소드와 콘텐츠 골격을 만들고 대상 리소스
동기화를 각각 `1건 성공 / 실패 0`으로 마쳤다. Spotify 「춘향가」 표지와
네이버 『유클리드 원론』·『국가·정체』 표지는 작품 일치와 가독성을
육안 확인했다.

`celebs`·`contents` 캐시 무효화 뒤 세 공개 페이지는 모두
`content_count: 1`과 연결 콘텐츠 UUID를 반환했다. 적용 후 전수 감사
기준선은 활성 Light `open 111 / confirmed_empty 40`, 비활성
`queued 153 / deferred 148`, 장부 완료 56회·진행 중 0회이며 모든 감사
결함은 0건이다.

쉰일곱 번째 대상 투키디데스는 『펠로폰네소스 전쟁사』 1.10 원문과
『일리아스』 함선 목록의 수치 독해를 분석한 고전학 연구를 대조했다.

- 결과: `light → full`, 실제 콘텐츠 1건
- 채택: BOOK 호메로스 『일리아스』
- 근거: 2권 함선 목록의 1,200척과 승선 인원을 뽑아 평균 병력을 계산하고
  시인의 과장 가능성을 비판한 직접 본문
- 제외: 델로스 제전의 합창·춤·체육 경기, 「아폴론 찬가」 가사 인용을
  개인 관람·디지털 GAME·특정 연주 청취로 중복 확장하지 않음
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_thucydides_full_research.sql`

쉰여덟 번째 대상 피타고라스는 동시대 헤라클레이토스 단편과
스탠퍼드 철학백과의 사료 비판, 이암블리코스 전기를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: “여러 글”과 호메로스·헤시오도스의 “선별 구절”은 작품명 없음
- VIDEO: 춤·연극적 피리 일반론뿐이며 제목 있는 관람작 없음
- GAME: 수학·철학 교육과 후대 이름 사용은 디지털 GAME 소비가 아님
- MUSIC: 프리기아·스폰데이오스 곡조와 치료용 선율은 곡명·창작자 불명
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_pythagoras_empty_research.sql`

쉰아홉 번째 대상 찬드라굽타 마우리아는 메가스테네스 단편의 전승 한계,
『아르타샤스트라』 성립 논쟁, 마우리아 궁정 자료를 대조했다.

- 결과: 실제 콘텐츠 0건, `light / confirmed_empty`
- BOOK: 『아르타샤스트라』의 저자·성립 논쟁과 직접 독서 진술 부재
- VIDEO: 궁정 오락은 작품명이 없고 후대 영화·드라마는 사후 재현
- GAME: 실제 사냥·정복전쟁과 현대 전략 게임을 분리
- MUSIC: 인도 음악으로 잠들었다는 전승은 있으나 곡명·연주자 불명
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_chandragupta_maurya_empty_research.sql`

세 SQL은 프로덕션 연결 `ROLLBACK` dry-run 뒤 `COMMIT`했다. 투키디데스
에피소드와 『일리아스』 골격을 만들고 대상 리소스 동기화를
`1건 성공 / 실패 0`으로 마쳤다. 이 과정에서 기존 『일리아스』 한국어
표지가 실제로는 헤시오도스 『신통기』임을 육안 발견했다. ISBN
`9788991290167` 네이버 검색 결과의 정확한 숲 판본으로 DB·로컬 캐시를
조건부 교정하고 다시 육안 합격 판정했다.

캐시 무효화 뒤 투키디데스는 `content_count: 1`과 연결 UUID,
피타고라스·찬드라굽타 마우리아는 각각 `content_count: -1`을 반환했다.
적용 후 전수 감사 기준선은 활성 Light `open 108 / confirmed_empty 42`,
비활성 `queued 153 / deferred 148`, 장부 완료 59회·진행 중 0회이며
모든 감사 결함은 0건이다.

예순 번째부터 예순두 번째 대상인 카니슈카·사포·그라쿠스 형제는 고대
전승에서 발견되는 문화 활동과 실제 작품 소비를 다시 분리했다.

- 카니슈카: 제4차 불교 결집과 아슈바고샤 후원·학습은 확인되지만
  결집 논서나 스승의 특정 저술을 직접 읽었다는 기록은 없어 BOOK 후보를
  기각했다. 간다라 미술·정복전쟁·쿠샨 문화 일반론도 VIDEO·GAME·MUSIC
  감상작으로 확장하지 않았다.
- 사포: 44번 단편의 헥토르·안드로마케 서사와 호메로스계 언어는 특정
  『일리아스』 판본의 독서가 아니라 공유 구전 전통·상호텍스트성으로
  판정했다. 본인의 노래·공연과 후대 사포 소재 작품도 제외했다.
- 그라쿠스 형제: 코르넬리아의 그리스 교육과 디오파네스·블로시우스의
  영향은 개별 책 제목을 전하지 않는다. 가이우스 연설 때 리키니우스가
  낸 음정관 단음도 곡 감상이 아니며 형제 공통 콘텐츠로 일반화할 수 없다.
- 결과: 세 인물 모두 실제 콘텐츠 0건, `light / confirmed_empty`
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_kanishka_empty_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_sappho_empty_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_the_gracchi_brothers_empty_research.sql`

세 SQL은 각각 프로덕션 연결 `ROLLBACK` dry-run을 통과한 뒤 `COMMIT`했다.
각 실행에는 BOOK·VIDEO·GAME·MUSIC 기각 finding 4건, 출처 5건, 완료 scope
4건이 보존됐다. 캐시 무효화 뒤 세 공개 페이지는 모두 HTTP 200과
`content_count: -1`을 반환했다. 적용 후 전수 감사 기준선은 활성 Light
`open 105 / confirmed_empty 45`, 비활성 `queued 153 / deferred 148`,
장부 완료 62회·진행 중 0회이며 모든 감사 결함은 0건이다.

예순세 번째부터 예순다섯 번째 대상인 안녹산·미트리다테스 6세·
클로비스 1세도 사료에 남은 문화 활동과 개인의 작품 소비를 분리했다.

- 안녹산: 여러 언어의 통역 능력은 특정 책 독서가 아니며, 호선무는
  현종의 명령으로 본인이 춘 공연이다. 당 궁정의 서역계 음악·무용
  일반론에서도 곡명·창작자를 특정하지 못했다.
- 미트리다테스 6세: 의학 자료실은 외부 서명이 식별되지 않는 본인
  수집·연구 기록이고, 페르가몬의 극장 정치와 디오니소스 경연은
  후원·선전 활동이다. 실제 전쟁·고대 체육 경연도 GAME에서 제외했다.
- 클로비스 1세: 레미기우스의 기독교 설교·교육은 구두 전승으로
  제시되며 특정 성경·교리서 독서가 아니다. 세례 의식, 실제 전쟁,
  후대 개종 극화도 작품 소비로 확장하지 않았다.
- 결과: 세 인물 모두 실제 콘텐츠 0건, `light / confirmed_empty`
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_an_lushan_empty_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_mithridates_vi_empty_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_clovis_i_empty_research.sql`

세 SQL은 프로덕션 연결 `ROLLBACK` dry-run 뒤 `COMMIT`했다. 각 실행에는
기각 finding 4건, 출처 5건, 완료 scope 4건이 보존됐다. 캐시 무효화 뒤
세 공개 페이지는 모두 HTTP 200과 `content_count: -1`을 반환했다.
적용 후 전수 감사 기준선은 활성 Light `open 102 / confirmed_empty 48`,
비활성 `queued 153 / deferred 148`, 장부 완료 65회·진행 중 0회이며
모든 감사 결함은 0건이다.

예순여섯 번째부터 예순여덟 번째 대상인 헤롯 대왕·소하·탁문군도
사료에 남은 공연·문서·음악 경험과 작품 단위 소비를 엄격히 분리했다.

- 헤롯 대왕: 요세푸스는 헤롯이 예루살렘과 카이사레아에서 음악·체육·
  무대 공연 경연과 검투·맹수·경마를 포함한 대회를 개최했다고 기록한다.
  그러나 개별 극·곡의 제목과 창작자는 전하지 않아 축제나 장르 전체를
  작품으로 등록하지 않았다.
- 소하: 함양 입성 때 진 승상·어사 관청의 律令圖書를 거둔 행위는
  법령·지도·호적 등 국가 문서 보존이다. 현대적 제목 있는 책 한 권의
  개인 독서로 해석하지 않았고 후대 극화와 실제 초한전쟁도 제외했다.
- 탁문군: 『사기』는 음악을 좋아하던 탁문군이 사마상여의 거문고를
  숨어서 듣고 호감을 품었다고 명시하지만 곡명은 적지 않는다.
  「봉구황」 가사·곡명은 훨씬 뒤 문헌·악보의 논쟁적 귀속이어서
  무명 연주를 특정 작품으로 확대하지 않았다.
- 결과: 세 인물 모두 실제 콘텐츠 0건, `light / confirmed_empty`
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_herod_the_great_empty_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_xiao_he_empty_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_zhuo_wenjun_empty_research.sql`

세 SQL은 프로덕션 연결 `ROLLBACK` dry-run 뒤 `COMMIT`했다. 각 실행에는
기각 finding 4건, 출처 5건, 완료 scope 4건이 보존됐다. 캐시 무효화 뒤
세 공개 페이지는 모두 HTTP 200과 `content_count: -1`을 반환했다.
적용 후 전수 감사 기준선은 활성 Light `open 99 / confirmed_empty 51`,
비활성 `queued 153 / deferred 148`, 장부 완료 68회·진행 중 0회이며
모든 감사 결함은 0건이다.

예순아홉 번째부터 일흔한 번째 대상인 헤로도토스·사도 요한·
다리우스 1세를 이어 조사했다.

- 헤로도토스: 『역사』 2.116은 『일리아스』 6.289~292와
  『오뒷세이아』 4.227~230·351~352를 직접 인용해 헬레네의 이집트
  체류를 논한다. 작품명·권·구체 행을 비판적으로 활용한 근거이므로
  기존 BOOK 2건을 채택했다. 프리니코스의 「밀레토스 함락」,
  올림피아 경기, 마네로스 노래는 타인 관람·실제 경기·민속 서술이라
  나머지 유형에서 기각했다.
- 사도 요한: 요한복음·서신·계시록의 전통적 저자 귀속은 복음사가·
  밧모의 요한·장로 요한과 역사적 사도의 동일성 문제를 통과하지
  못한다. 최후의 만찬 뒤 공동 찬송도 곡명·시편 번호가 없어 작품으로
  특정하지 않았다.
- 다리우스 1세: 베히스툰 비문과 제국 배포 사본은 자기 왕명 기록·
  행정 선전물이고, 궁정 공연은 작품명이 없으며 사냥·원정은 실제
  활동이다. 다리우스 3세 궁정의 가수 기록도 1세에게 소급하지 않았다.
- 결과: 헤로도토스 BOOK 2건·`full`, 사도 요한·다리우스 1세는 실제
  콘텐츠 0건·`light / confirmed_empty`
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_herodotus_full_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_john_the_apostle_empty_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_darius_i_empty_research.sql`

세 SQL은 프로덕션 연결 `ROLLBACK` dry-run 뒤 `COMMIT`했다. 헤로도토스에는
finding 5건(채택 2·기각 3), 출처 9건, 완료 scope 4건을 보존했고 두
0건 실행에는 각각 기각 finding 4건, 출처 5건, 완료 scope 4건을 보존했다.
캐시 무효화 뒤 헤로도토스 공개 페이지는 HTTP 200,
`content_count: 2`와 두 콘텐츠 UUID를, 사도 요한·다리우스 1세는
HTTP 200과 `content_count: -1`을 반환했다.

DB→Remotion 원칙에 따라 `sw/remotion/public/episodes/herodotus/`에
메타와 두 BOOK 골격을 만들고 리소스 동기화를 각각
`1건 성공 / 실패 0`으로 마쳤다. 이 과정에서 기존 『오뒷세이아』
한국어 썸네일이 책이 아닌 선풍기 상품 사진인 결함을 발견했다.
`sw/web/supabase/ops/20260730_fix_odyssey_thumbnail.sql`로 ISBN
`9788991290150`의 숲 2015 개정판 YES24 원본을 DB에 조건부 반영하고
로컬 캐시를 재생성했다. 『일리아스』·『오뒷세이아』 두 표지는 모두
작품·판본 일치와 가독성을 육안 확인했다.

적용 후 전수 감사 기준선은 활성 Light `open 96 / confirmed_empty 53`,
비활성 `queued 153 / deferred 148`, 장부 완료 71회·진행 중 0회이며
모든 감사 결함은 0건이다.

일흔두 번째부터 일흔네 번째 대상인 디오게네스·가의·마르쿠스 아그리파를
이어 조사했다.

- 디오게네스: 디오게네스 라에르티오스 6.36·55·57·67·104의 본문과
  편집 주석은 『메데이아』 410행, 『포이니케 여인들』 40행,
  『일리아스』 3.65·5.83 등, 『오뒷세이아』 1.157·4.70·4.392를
  디오게네스가 대화와 풍자에 활용한 구절로 식별한다. 작품명과 구체
  행을 알아보고 변주한 기록이므로 기존 BOOK 4건을 채택했다.
  디오니시아 공연 일반에 대한 풍자, 올림피아 방문, 무명 노래·연주는
  작품 단위 또는 현대 유형 요건을 통과하지 못했다.
- 가의: 『한서』 「가의전」의 “年十八，以能誦詩書屬文稱於郡中”을
  경학 연구가 `誦《詩》《書》`로 문장부호를 붙여 『시경』·『서경』
  암송으로 해석한다. 「유림전」은 가의가 『춘추좌씨전』을 연구하고
  훈고를 지어 관공에게 전수했다고 별도로 기록한다. 이에 기존 BOOK
  3건을 채택했다. 본인의 『신서』·부·정론과 예악 사상은 외부 작품
  소비에서 제외했다.
- 마르쿠스 아그리파: 수에토니우스계 『베르길리우스 생애』 44의
  “M. Vipsanius”는 아그리파로 보는 견해가 있으나 본문 이문·다른 인물
  가능성이 논쟁적이고 비평 대상 작품명도 없다. 아그리파 자신의 지리
  주석·세계지도, 악티움 축제·키르쿠스·체육·검투 경기 운영, 공연
  시설 후원은 외부 작품의 개인 소비가 아니므로 네 유형 0건을 확정했다.
- 결과: 디오게네스 BOOK 4건·`full`, 가의 BOOK 3건·`full`,
  마르쿠스 아그리파 실제 콘텐츠 0건·`light / confirmed_empty`
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_diogenes_full_research.sql`,
  `sw/web/supabase/ops/20260730_apply_jia_yi_full_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_marcus_agrippa_empty_research.sql`

세 SQL은 프로덕션 연결 `ROLLBACK` dry-run 뒤 `COMMIT`했다. 디오게네스에는
finding 7건(채택 4·기각 3), 출처 11건, 완료 scope 4건을 보존했고,
가의에는 finding 6건(채택 3·기각 3), 출처 12건, 완료 scope 4건을
보존했다. 아그리파 실행에는 기각 finding 4건, 출처 5건, 완료 scope
4건을 보존했다. dry-run 중 기존 『서경』의 `contents.user_count=22`와
실제 연결 24건의 드리프트를 발견했고, 가의 연결 뒤 실측 25건으로
동기화되도록 조건부 검증했다.

DB→Remotion 원칙에 따라 `sw/remotion/public/episodes/diogenes/`에
BOOK 4개, `sw/remotion/public/episodes/jia-yi/`에 BOOK 3개의 골격을
만들고 리소스 동기화 7건을 모두 `1건 성공 / 실패 0`으로 마쳤다.
네이버 API에서 각 ISBN의 판본·출간 연도를 다시 확인했고,
『메데이아』·『포이니케 여인들』·『시경』·『서경』·『춘추좌전』 표지를
육안 검수했다. 재사용한 『일리아스』·『오뒷세이아』도 앞선 배치에서
작품·판본 일치 검수를 통과한 캐시다.

`celebs`·`contents` 캐시 무효화 뒤 디오게네스 공개 페이지는 HTTP 200과
`content_count: 4`, 가의는 HTTP 200과 `content_count: 3` 및 각 연결
콘텐츠 UUID 전부를 반환했다. 마르쿠스 아그리파는 HTTP 200과
`content_count: -1`을 반환했다. 적용 후 전수 감사 기준선은 활성 Light
`open 93 / confirmed_empty 54`, 비활성 `queued 153 / deferred 148`,
장부 완료 74회·진행 중 0회이며 모든 감사 결함은 0건이다.

일흔다섯 번째부터 일흔일곱 번째 대상인 카라바조·카스파르 다비트
프리드리히·나폴레옹 3세를 이어 조사했다.

- 카라바조: 이탈리아 문화부는 그림 속 악보가 실제로 존재하며 지금도
  추적·연주할 수 있다고 밝히고, 《이집트로 피신하는 길의 휴식》의
  노엘 볼드베인 〈Quam Pulchra Es〉, 델 몬테 주문본 《류트 연주자》의
  프란체스코 데 라이올레 〈Lasciar il velo〉와 자케 드 베르켐
  〈Perché non date voi〉, 주스티니아니 주문본의 아르카델트 마드리갈
  4곡을 제목·작곡가 단위로 열거한다. Spotify의 일치 트랙 7건을 새로
  등록했다. 성서·고전 도상은 특정 판본 독서가 아니며 공놀이·테니스
  일화도 디지털 GAME이 아니어서 기각했다.
- 카스파르 다비트 프리드리히: 그라이프스발트대가 원문 소장처와 함께
  공개한 부부 편지 30통을 전수 검색했다. 아내가 남편이 “아마 읽거나
  창밖을 보고 있을 것”이라고 쓴 문장에는 책 제목이 없다. 프리드리히가
  보관한 『Hours of Devotion』 4권은 D. Bechly의 소유물로 반환 방법만
  묻고, 동생의 〈마왕〉 목판화 언급도 괴테 원작 독서를 증명하지 않는다.
  오시안·에다의 미술사적 영향 연구를 직접 독서로 확장하지 않아 네
  유형 0건을 확정했다.
- 나폴레옹 3세: Fondation Napoléon은 1858년 1월 14일 황제 부부가
  파리 오페라에 도착하다 오르시니의 폭탄 공격을 받았고, 그날
  프로그램에 로시니 《기욤 텔》이 있었으며 테러 뒤에도 공연을 관람해
  자정에 떠났다고 기록한다. 작품명·날짜·장소·관람 완료가 함께 확인된
  MUSIC 1건을 새로 등록했다. 함 요새에서 읽은 “발자크 작품들”은 개별
  제목이 없고, 같은 날의 실러 연극·오베르 발레 발췌는 현대 VIDEO가
  아니며 황실 사냥·사교 오락도 디지털 GAME이 아니어서 기각했다.
- 결과: 카라바조 MUSIC 7건·`full`, 프리드리히 실제 콘텐츠
  0건·`light / confirmed_empty`, 나폴레옹 3세 MUSIC 1건·`full`
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_caravaggio_full_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_caspar_david_friedrich_empty_research.sql`,
  `sw/web/supabase/ops/20260730_apply_napoleon_iii_full_research.sql`

세 SQL은 프로덕션 연결 `ROLLBACK` dry-run 뒤 `COMMIT`했다. 카라바조에는
finding 10건(채택 7·기각 3), 출처 17건, 완료 scope 4건을 보존했고,
프리드리히에는 기각 finding 4건·출처 5건·완료 scope 4건,
나폴레옹 3세에는 finding 4건(채택 1·기각 3)·출처 7건·완료 scope
4건을 보존했다.

DB→Remotion 원칙에 따라 `sw/remotion/public/episodes/caravaggio/`에
MUSIC 7개, `sw/remotion/public/episodes/napoleon-iii/`에
《기욤 텔》 1개의 골격을 만들었다. 리소스 동기화 8건은 모두
`1건 성공 / 실패 0`이고 새 JSON 12개는 전부 파싱됐다. 같은 음반 표지를
공유하는 트랙을 묶어 실제 표지 4종을 열어 보았으며 볼드베인·앙상블 코·
아르카델트·로시니 음반이 각각 작품과 일치하고 텍스트도 읽을 수 있어
모두 승인했다.

`celebs`·`contents` 캐시 무효화 뒤 공개 페이지는 카라바조
`content_count: 7`, 프리드리히 `content_count: -1`, 나폴레옹 3세
`content_count: 1`을 반환했다. 적용 후 전수 감사 기준선은 활성 Light
`open 90 / confirmed_empty 55`, 비활성 `queued 153 / deferred 148`,
장부 완료 77회·진행 중 0회이며 모든 감사 결함은 0건이다.

일흔여덟 번째부터 여든 번째 대상인 자한기르·자크 루이 다비드·
척계광을 이어 조사했다.

- 자한기르: 『자한기르 회고록』 원문에서 바부르의 친필 회고록이
  자기 앞을 지나갔고 네 구획을 직접 베껴 썼다는 기록을 확인했다.
  같은 회고록의 하킴 사나이 인용은 편집 주석이 『진리의 정원』
  해당 권으로 식별한다. 기존 『바부르나마』와 신규 『진리의 정원』
  BOOK 2건을 연결했다. 어린 시절 읽었다는 자미의 『사십 언행록』은
  직접 근거가 있지만 허용된 메타데이터 공급원에서 독립적인 일치
  판본을 확보하지 못해 후보 finding으로만 보존했다.
- 자크 루이 다비드: 그로에게 보낸 편지에서 “플루타르코스를 펼쳐
  모두가 아는 주제를 고르라”고 직접 권한 대목과, 루브르 교육 자료가
  《사비니 여인들》의 원천으로 『로물루스 전』을 든 기록을 교차했다.
  기존 『플루타르코스 영웅전』 BOOK 1건을 연결했다. 1782년에 본
  코르네유의 무대극은 서비스 VIDEO 정의 밖이어서 기각했다.
- 척계광: 『기효신서』 서문 원문에서 “손무의 책을 읽었다”고 밝히고
  병법을 무기고에 비유하면서도 실제 운용의 한계를 논한 대목을
  확인했다. 기존 『손자병법』 BOOK 1건을 연결했다. 군사 훈련·무술은
  디지털 GAME이 아니며 본인이 만든 군가는 외부 MUSIC 소비가 아니어서
  기각했다.
- 결과: 자한기르 BOOK 2건·`full`, 자크 루이 다비드 BOOK 1건·`full`,
  척계광 BOOK 1건·`full`
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_jahangir_full_research.sql`,
  `sw/web/supabase/ops/20260730_fix_baburnama_ko_locale.sql`,
  `sw/web/supabase/ops/20260730_apply_jacques_louis_david_full_research.sql`,
  `sw/web/supabase/ops/20260730_apply_qi_jiguang_full_research.sql`

네 SQL은 프로덕션 연결 `ROLLBACK` dry-run 뒤 `COMMIT`했다. 자한기르에는
finding 6건(채택 2·기각 4), 출처 8건, 완료 scope 4건을 보존했고,
자크 루이 다비드에는 finding 4건(채택 1·기각 3), 출처 6건,
척계광에는 finding 4건(채택 1·기각 3), 출처 7건을 보존했다. 두
실행에도 완료 scope는 각각 4건이다. 『바부르나마』의 비어 있던 한국어
판본 ISBN·출판사·표지도 네이버 메타데이터로 함께 보완했다.

DB→Remotion 원칙에 따라 `sw/remotion/public/episodes/jahangir/`에
BOOK 2개, `sw/remotion/public/episodes/jacques-louis-david/`와
`sw/remotion/public/episodes/qi-jiguang/`에 각각 BOOK 1개의 골격을
만들었다. 리소스 동기화 4건은 모두 `1건 성공 / 실패 0`이고 새 JSON
10개는 전부 파싱됐다. 『바부르나마』·『진리의 정원』·
『플루타르코스 영웅전』·『손자병법』 표지 4종도 육안 검수해 작품과
판본이 일치함을 확인했다.

`celebs`·`contents` 캐시 무효화 뒤 공개 페이지는 자한기르
`content_count: 2`, 자크 루이 다비드와 척계광은 각각
`content_count: 1`을 반환했다. 적용 후 전수 감사 기준선은 활성 Light
`open 87 / confirmed_empty 55`, 비활성 `queued 153 / deferred 148`,
장부 완료 80회·진행 중 0회이며 모든 감사 결함은 0건이다.

여든한 번째부터 여든세 번째 대상인 광해군·우타가와 히로시게·
안토니오 비발디를 이어 조사했다.

- 광해군: 『광해군일기』 중초본은 1612년 9월 18일 조강에서 임금이
  《상서》 대고편을 강독하고 “영승우려”의 뜻을 직접 물어 신하들과
  본문을 논했다고 기록한다. 날짜·편명·문답이 함께 남은 직접 독서이므로
  기존 『서경』 BOOK 1건을 연결했다. 궁중 여악의 제도 운영은 특정
  음악 작품의 개인 감상으로 바꾸지 않았다.
- 우타가와 히로시게: 산토리미술관은 명소도회·『북재만화』·
  『산수기관』을 판화의 제작 참고 자료로 열거하고 미국 의회도서관은
  호쿠사이 연작의 영향을 설명한다. 그러나 모두 후대 도상 연구이며,
  히로시게 자신의 편지·일기·서문에 남은 직접 독서 진술이 아니다.
  가부키 《국성야합전》 소재 판화도 특정 공연 관람을 입증하지 않고
  무대극은 VIDEO 정의 밖이어서 네 유형 0건으로 확정했다.
- 안토니오 비발디: 1727년 오페라 《Orlando furioso》 초판 대본의
  `Argomento`가 아리오스토 이야기에서 현재의 극을 취했다고 직접
  명시한다. 비발디가 음악을 붙인 텍스트의 동시대 원전 고지이므로 기존
  『광란의 오를란도』 BOOK 1건을 연결했다. 본인 오페라는 자기 작품이자
  무대극이라 VIDEO에서 제외했고, 코렐리풍 양식은 학술 연구도 간접
  습득 가능성을 제시하므로 직접 MUSIC 청취로 채택하지 않았다.
- 결과: 광해군 BOOK 1건·`full`, 우타가와 히로시게 실제 콘텐츠
  0건·`light / confirmed_empty`, 안토니오 비발디 BOOK 1건·`full`
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_gwanghaegun_full_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_utagawa_hiroshige_empty_research.sql`,
  `sw/web/supabase/ops/20260730_apply_antonio_vivaldi_full_research.sql`

세 SQL은 프로덕션 연결 `ROLLBACK` dry-run 뒤 `COMMIT`했다. 광해군에는
finding 4건(채택 1·기각 3), 출처 6건, 히로시게에는 기각 finding 4건·
출처 5건, 비발디에는 finding 4건(채택 1·기각 3), 출처 7건을 보존했다.
세 실행의 scope 4종은 모두 완료됐다. 비발디 dry-run 중 다른 연결이 먼저
추가되어 실제 공유 수가 5명으로 늘어난 것을 가드가 감지했고, 재대조 후
이번 연결을 포함한 `user_count=6`으로 동기화했다.

DB→Remotion 원칙에 따라 `sw/remotion/public/episodes/gwanghaegun/`과
`sw/remotion/public/episodes/antonio-vivaldi/`에 각각 BOOK 1개의 골격을
만들었다. 리소스 동기화는 각각 `1건 성공 / 실패 0`이고 새 JSON 6개는
전부 파싱됐다. 네이버 『서경』 을유문화사 판본과 『광란의 오를란도』
휴머니스트 1권 표지를 열어 작품·판본 일치와 가독성을 육안 확인했다.

`celebs`·`contents` 캐시 무효화 뒤 공개 페이지는 광해군과 안토니오
비발디가 각각 `content_count: 1`, 우타가와 히로시게가
`content_count: -1`을 반환했다. 적용 후 전수 감사 기준선은 활성 Light
`open 84 / confirmed_empty 56`, 비활성 `queued 153 / deferred 148`,
장부 완료 83회·진행 중 0회이며 모든 감사 결함은 0건이다.

여든네 번째부터 여든여섯 번째 대상인 필리포 브루넬레스키·정몽주·
샤 루흐를 이어 조사했다.

- 필리포 브루넬레스키: 초기 전기 자료의 “단테 작품을 연구하고 잘
  이해했다”는 증언과 우피치의 단테 사후세계 측정·재현 전통 설명을
  교차했다. 대상 작품을 『신곡』으로 식별해 기존 BOOK 1건을 연결했다.
  성경은 일반 독서 전승만 있어 별도 판본에 연결하지 않았다.
- 정몽주: 『포은집』 권2의 「주역을 읽고」와 「겨울밤에 춘추를 읽다」
  원문을 확인했다. 『주역』은 정확한 네이버 판본이 있어 기존 BOOK
  1건을 연결했다. 『춘추』는 직접 증거는 통과했지만 네이버·OpenLibrary에
  원전 독립 판본이 없고 기존 DB 동명 항목이 공양전·좌전·다른 영문
  저작과 뒤섞여 있어 finding만 보존하고 연결하지 않았다.
- 샤 루흐: 헤라트 도서관과 하피즈이 아브루 역사서·코란 필사본·궁정
  음악가 후원은 확인했으나 제작·주문·소장과 직접 독서를 구분했다.
  제목 없는 페르시아 역사 독서 진술과 아들들의 니자미·아미르 호스로
  선호 일화도 채택하지 않아 네 유형 0건으로 확정했다.
- 결과: 필리포 브루넬레스키 BOOK 1건·`full`, 정몽주 BOOK 1건·`full`,
  샤 루흐 실제 콘텐츠 0건·`light / confirmed_empty`
- DB 적용:
  `sw/web/supabase/ops/20260730_apply_filippo_brunelleschi_full_research.sql`,
  `sw/web/supabase/ops/20260730_apply_jeong_mong_ju_full_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_shah_rukh_empty_research.sql`

세 SQL은 프로덕션 연결 `ROLLBACK` dry-run 뒤 `COMMIT`했다. 브루넬레스키는
finding 4건(채택 1·기각 3), 출처 6건, 정몽주는 finding 5건(채택 1·
보류성 기각 1·유형 기각 3), 출처 8건, 샤 루흐는 기각 finding 4건·
출처 7건을 보존했다. 세 실행의 scope 4종은 모두 완료됐다. 정몽주가
연결된 기존 『주역』은 저장된 `user_count=14`와 실제 연결 21건이
어긋나 있었으며 이번 연결을 포함한 실측 22건으로 동기화했다.

DB→Remotion 원칙에 따라
`sw/remotion/public/episodes/filippo-brunelleschi/`와
`sw/remotion/public/episodes/jeong-mong-ju/`에 각각 『신곡』과 『주역』
BOOK 1개 골격을 만들었다. 리소스 동기화는 각각
`1건 성공 / 실패 0`이다. 『신곡』 표지는 작품·판본과 일치했고,
『주역』 표지는 룰렛 사진을 쓴 이례적인 출판사 원본이지만 제목·ISBN·
출판사가 연결 판본과 일치함을 육안 확인했다. 새 JSON 6개는 모두
파싱됐다.

`celebs`·`contents` 캐시 무효화 뒤 공개 페이지는 필리포 브루넬레스키와
정몽주가 각각 `content_count: 1`, 샤 루흐가 `content_count: -1`을
반환했다. 적용 후 전수 감사 기준선은 활성 Light
`open 81 / confirmed_empty 57`, 비활성 `queued 153 / deferred 148`,
장부 완료 86회·진행 중 0회이며 모든 감사 결함은 0건이다.

여든일곱 번째부터 여든아홉 번째 대상인 성덕왕·미하일 8세·호스로 1세를
이어 조사했다.

- 성덕왕: 『삼국사기』 본기와 공식 한국사 해설을 대조했다. 공자·십철·
  72제자 초상 안치, 국학·의박사·산박사 정비, 왕족의 당 유학은 국가
  교육 정책이며 왕 개인의 특정 경전 독서가 아니다. 성덕대왕신종도
  사후 경덕왕의 발원과 혜공왕대 완성 유물이라 네 유형 0건으로 확정했다.
- 미하일 8세: 본인의 두 티피콘에 담긴 자전적 진술, 파키메레스 연대기,
  후기 비잔틴 교육사를 조사했다. 제국 학교와 고전 학문 후원은 개인
  독서가 아니며, 누이 에울로기아가 불렀다는 “도시에 관한 노래”는
  곡명·창작자·고정 텍스트가 없는 예언 자장가 전승이다. 외교를
  “체스 선수”에 비유한 현대 논문도 실제 게임 기록이 아니어서 0건이다.
- 호스로 1세: 미 의회도서관의 16~17세기 《칼릴라와 딤나》 필사본
  설명에서 부르조에가 왕과 신하들에게 책을 읽는 장면을 확인했다.
  동시대 기록이 아니라 여러 후대 판본에 형성된 전승이라는 이란백과의
  비판까지 감상경위에 밝혀 기존 『판차탄트라』 BOOK 1건을 연결했다.
  체스는 보조르메흐가 규칙을 푼 전설이고, 바르바드는 호스로 2세의
  음악가라 제외했다.
- 결과: 성덕왕·미하일 8세 실제 콘텐츠 0건·
  `light / confirmed_empty`, 호스로 1세 BOOK 1건·`full`
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_king_seongdeok_empty_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_michael_viii_palaiologos_empty_research.sql`,
  `sw/web/supabase/ops/20260730_apply_khosrow_i_full_research.sql`

세 SQL은 프로덕션 연결 `ROLLBACK` dry-run 뒤 `COMMIT`했다. 성덕왕은
기각 finding 4건·출처 5건, 미하일 8세는 기각 finding 4건·출처 6건,
호스로 1세는 finding 4건(채택 1·기각 3)·출처 7건을 보존했다.
세 실행의 scope 4종은 모두 완료됐다. 호스로 1세가 연결된 기존
『판차탄트라』 한국어 locale는 네이버 API 설명에 원저자가 명시되어
있으면서 creator가 비어 있던 결함도 `비슈누 샤르마`로 보완했다.

DB→Remotion 원칙에 따라 `sw/remotion/public/episodes/khosrow-i/`에
『세계의 지혜 판차탄트라 세트』 BOOK 1개 골격을 만들었다. 리소스
동기화는 `1건 성공 / 실패 0`이며, 다섯 권 전집을 함께 보여 주는 네이버
원본 표지가 ISBN 9788989370413 판본과 일치함을 육안 확인했다.
새 JSON 3개도 모두 파싱됐다.

`celebs`·`contents` 캐시 무효화 뒤 공개 페이지는 성덕왕과 미하일 8세가
각각 `content_count: -1`, 호스로 1세가 `content_count: 1`을 반환했다.
적용 후 전수 감사 기준선은 활성 Light
`open 78 / confirmed_empty 59`, 비활성 `queued 153 / deferred 148`,
장부 완료 89회·진행 중 0회이며 모든 감사 결함은 0건이다.

아흔 번째부터 아흔두 번째 대상인 상앙·람세스 2세·조광윤을 이어
조사했다.

- 상앙: 《사기·상군열전》과 《진서·형법지》, 초기 중국법 연구를
  대조했다. 이회의 《법경》을 상앙이 전수받았다는 전승은 7세기
  《진서》에 처음 나타나며 원전도 소실됐다. 법제 계승을 개인 독서로
  확정하지 않고 네 유형 0건으로 처리했다.
- 람세스 2세: 대영박물관의 파피루스 살리에 3은 「카데시 시」가
  람세스 자신의 승리를 1인칭으로 선전하는 왕실 문학 기록임을 보여
  준다. 메트로폴리탄미술관의 세드 축제 부조도 의례 개최 증거일 뿐
  제목 있는 공연 감상은 아니다. 동시대 세네트 일반과 왕비 네페르타리의
  유명한 대국 장면도 람세스 개인에게 전가하지 않아 0건으로 확정했다.
- 조광윤: 《송사·형법지》의 “짐은 매번 《한서》를 읽는다”는 직접
  발언과 장석지·우정국의 재판을 신하에게 요구한 문맥을 확인했다.
  기존 『한서 열전 1』 BOOK 1건을 연결하고 `full`로 승격했다.
- 결과: 상앙·람세스 2세 실제 콘텐츠 0건·`light / confirmed_empty`,
  조광윤 BOOK 1건·`full`
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_shang_yang_empty_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_ramesses_ii_empty_research.sql`,
  `sw/web/supabase/ops/20260730_apply_zhao_kuangyin_full_research.sql`

세 SQL은 프로덕션 연결 `ROLLBACK` dry-run 뒤 `COMMIT`했다. 각 실행은
finding 4건을 보존했고, 상앙·람세스 2세는 전부 기각, 조광윤은
채택 1건·기각 3건이다. 출처는 세 실행 모두 6건이며 scope 4종도 전부
완료됐다. 『한서 열전 1』의 기존 `user_count`는 실제 연결 수에 맞춰
2에서 3으로 동기화했다.

DB→Remotion 원칙에 따라 `sw/remotion/public/episodes/zhao-kuangyin/`에
『한서 열전 1』 BOOK 1개 골격을 만들었다. 리소스 동기화는
`1건 성공 / 실패 0`이며 네이버 정식 판본 표지가 제목·저자·ISBN과
일치하고 가독성도 양호함을 육안 확인했다. 새 JSON 3개도 모두
파싱됐다.

`celebs`·`contents` 캐시 무효화 뒤 공개 페이지는 상앙과 람세스 2세가
각각 `content_count: -1`, 조광윤이 `content_count: 1`을 반환했다.
적용 후 전수 감사 기준선은 활성 Light
`open 75 / confirmed_empty 61`, 비활성 `queued 153 / deferred 148`,
장부 완료 92회·진행 중 0회이며 모든 감사 결함은 0건이다.

아흔세 번째부터 아흔다섯 번째 대상인 관중·재러드 카플란·알 마문을
이어 조사했다.

- 관중: 《사기·관안열전》·《국어·제어》와 《관자》 성립 연구를
  대조했다. 후대 복합 문헌 《관자》의 “《시》에 이르기를” 같은 인용은
  관중 자신의 발언으로 소급할 수 없어 네 유형 0건으로 확정했다.
- 재러드 카플란: 존스홉킨스대·Simons Foundation 공식 프로필,
  본인 AI 인터뷰와 구술사를 조사했다. 본인 논문·공개 강연 외에 책·
  영화·게임·음악의 작품 단위 소비 발언은 확인되지 않아 0건으로
  확정했다.
- 알 마문: 《타바리 역사》 제32권이 보존한 833년 친서에서 꾸란
  43:3·6:1·20:99·11:1을 직접 인용하고 해석한 대목을 확인해 기존
  『코란(꾸란)』 BOOK 1건을 연결했다. 체스 향유와 무카리크가
  이븐 수라이즈의 선율로 자리르의 시를 부른 직접 청취 장면도
  보존했지만 IGDB·Spotify에서 작품 단위 메타를 확정할 수 없어
  기각 finding으로 근거와 보류 사유를 남겼다.
- 결과: 관중·재러드 카플란 실제 콘텐츠 0건·
  `light / confirmed_empty`, 알 마문 BOOK 1건·`full`
- DB 적용:
  `sw/web/supabase/ops/20260730_confirm_guan_zhong_empty_research.sql`,
  `sw/web/supabase/ops/20260730_confirm_jared_kaplan_empty_research.sql`,
  `sw/web/supabase/ops/20260730_apply_al_mamun_full_research.sql`

세 SQL은 프로덕션 연결 `ROLLBACK` dry-run 뒤 `COMMIT`했다. 각 실행은
finding 4건을 보존했고, 관중·재러드 카플란은 전부 기각, 알 마문은
채택 1건·기각 3건이다. 출처는 각각 6건·6건·7건이며 scope 4종도
전부 완료됐다. 『코란(꾸란)』의 기존 `user_count`는 실제 연결 수에
맞춰 17에서 18로 동기화했다.

DB→Remotion 원칙에 따라 `sw/remotion/public/episodes/al-mamun/`에
『코란(꾸란)』 BOOK 1개 골격을 만들었다. 리소스 동기화는
`1건 성공 / 실패 0`이다. 기존 표지 URL은 같은 ISBN의 네이버 현행
458×671 원본으로 조건부 교체했고 작품·판본 일치와 제목 가독성을
육안 확인했다. 새 JSON 3개도 모두 파싱됐다. 별도 교정 SQL은
`sw/web/supabase/ops/20260730_refresh_quran_naver_thumbnail.sql`이다.

`celebs`·`contents` 캐시 무효화 뒤 공개 페이지는 관중과 재러드
카플란이 각각 `content_count: -1`, 알 마문이 `content_count: 1`을
반환했다. 적용 후 전수 감사 기준선은 활성 Light
`open 72 / confirmed_empty 63`, 비활성 `queued 153 / deferred 148`,
장부 완료 95회·진행 중 0회이며 모든 감사 결함은 0건이다.

## 2026-07-29 의미 교정

초기 회수는 감상여정에서 뽑은 후보 작품을 검증한 일을 인물의 전 콘텐츠 유형
조사 완료로 잘못 해석했다. 따라서 당시 `confirmed_empty/-1`로 닫은 활성 Light
168명 중, BOOK·VIDEO·GAME·MUSIC 전면 조사를 실제로 마친 앤서니 암스트롱
1명을 제외한 167명을 `open/0`으로 복구했다.

현행 실DB 기준선은 활성 Light `open 167 / confirmed_empty 1`, 비활성 Light
`queued 153 / deferred 148`이다. 아래 본문의 “활성 168명 없음 확정”과 각
배치의 `confirmed_empty` 기록은 **교정 전 회수 이력**이며 현재 판정이 아니다.

재발 방지를 위해 다음 구조를 추가했다.

- 복구 트랜잭션:
  `sw/web/supabase/ops/20260729_reopen_unresearched_active_light.sql`
- 조사 장부 마이그레이션:
  `sw/web/supabase/migrations/20260729144835_create_celeb_content_research_history.sql`
- 장부 권한·인덱스 보강:
  `sw/web/supabase/migrations/20260729150916_harden_celeb_content_research_permissions.sql`
- 장부 시작·취소 트랜잭션과 완료 이력 불변성:
  `sw/web/supabase/migrations/20260729151721_make_celeb_content_research_history_immutable.sql`
- web-bo 인물별 장부:
  `/celebs/content-research/[celebId]`

장부는 실행→BOOK/VIDEO/GAME/MUSIC 범위→후보→출처를 정규화해 보존한다.
네 유형 완료, 유형별 출처, 후보 판정·근거, 채택 콘텐츠의 실제 연결을 DB 완료
함수가 검증한다. 이를 통과하고 실제 콘텐츠가 0건일 때만 신규
`confirmed_empty/-1`을 허용한다.

## 확정 의미

| 표시값 | 의미 |
|---:|---|
| `1 이상` | 실제 `user_contents` 개수 |
| `0` | 기본값. 아직 콘텐츠 없음이 확정되지 않은 열린 상태 |
| `-1` | 정식 조사를 마쳤고 실제 콘텐츠가 0건인 `confirmed_empty` |

- 신규 인물과 기존 0건 인물은 모두 `open`에서 시작한다.
- 콘텐츠가 하나라도 등록되는 즉시 조사 상태보다 실제 개수를 우선한다.
- 빠른 선별, 검색 실패, 자료가 적어 보인다는 판단만으로 `-1`을 부여하지 않는다.

## 구현 상태

- DB 마이그레이션: `sw/web/supabase/migrations/20260729_add_celeb_content_research_status.sql`
- 공용 의미 해석: `packages/shared/src/constants/celeb-content-research.ts`
- 운영 화면: web-bo `/celebs/content-research`
  - 실제 콘텐츠 수·활성 여부·조사 상태·우선순위 신호로만 작업 경로를 나눈다.
  - 폐기 예정인 감상여정은 조회하거나 작품명 추출에 사용하지 않는다.
- 사용자 웹: Light도 양수와 `-1`을 표시하고 열린 `0`만 숨긴다.
- 감사 반영 트랜잭션: `sw/web/supabase/ops/20260729_apply_positive_light_audit.sql`
- 활성 파일럿 반영 트랜잭션:
  `sw/web/supabase/ops/20260729_apply_active_target_pilot.sql`
- 활성 무단서 4명 전면 조사 트랜잭션:
  `sw/web/supabase/ops/20260729_apply_active_full_research.sql`
- 비활성 명시 작품 69명 선별 트랜잭션:
  `sw/web/supabase/ops/20260729_triage_inactive_target_69.sql`
- 비활성 비정형 작품 40명 선별 트랜잭션:
  `sw/web/supabase/ops/20260729_triage_inactive_extract_40.sql`
- 비활성 무단서 192명 선별 트랜잭션:
  `sw/web/supabase/ops/20260729_triage_inactive_full_192.sql`
- 활성 조사 완료·0건 167명 판정 교정 트랜잭션:
  `sw/web/supabase/ops/20260729_confirm_researched_active_light_empty.sql`
- 최종 읽기 전용 감사:
  `sw/web/supabase/ops/20260729_audit_content_research_rollout.sql`
- 타입 검사·타깃 ESLint·분류 실DB 읽기 검증 완료
- 원격 DB 마이그레이션·감사 SQL 적용 완료
- web-bo·web 프로덕션 배포와 실화면 검증 완료

## 기존 Light 기준선

2026-07-29 실DB 읽기 전용 분류:

| 경로 | 인원 |
|---|---:|
| 콘텐츠 보유 → 감사·승격 후보 | 7 |
| 활성 + 감상 여정 명시 작품 표적 검증 | 125 |
| 활성 + 감상 여정 비정형 작품명 추출 | 84 |
| 활성 + 감상 여정 없음 전면 조사 | 4 |
| 비활성 + 감상 여정 명시 작품 표적 검증 | 69 |
| 비활성 + 감상 여정 비정형 작품명 추출 | 40 |
| 비활성 빠른 선별 | 186 |
| 합계 | 515 |

이 표는 작업 시작 스냅샷이다. 마지막 선별 직전 비활성 해커 6명이 새로
등록되어 비활성 빠른 선별 실대상은 192명, 전체 회수 대상은 521명이 됐다.

## 콘텐츠 보유 Light 7명 감사

### 출처 검증 결과

고유 출처 URL 7개는 모두 2026-07-29 HTTP 200을 반환했다. 현재 등록된 표지 URL 30개도 모두 HTTP 200과 이미지 MIME을 반환했다.

| 인물 | 콘텐츠 | 링크 상태 | 내용 정합 | 판정 |
|---|---|---:|---|---|
| 노숙 | 한서 | 200 | 노숙이 한 고조를 비유한 기록일 뿐 《한서》 감상 증거가 아님 | 제거 |
| 노숙 | 전국책 | 200 | 노숙의 동맹 전략을 소진의 합종과 후대에 비교한 것뿐 | 제거 |
| 노숙 | 춘추좌씨전 | 200 | 환공·문공을 언급했을 뿐 《좌전》 감상 증거가 아님 | 제거 |
| 박경리 | 카라마조프가의 형제들 | 200 | 본인이 작품을 “훌륭한 작품”으로 평가 | 통과 |
| 박경리 | 마의 산 | 200 | 본인이 “감명 깊게 읽었다”고 직접 발언 | 통과 |
| 박경리 | 유리알 유희 | 200 | 본인이 읽었으나 좋아하지 않았다고 직접 발언 | 통과 |
| 박경리 | 잃어버린 시간을 찾아서 | 200 | 본인이 읽었으나 좋아하지 않았다고 직접 발언 | 통과 |
| 김민재 | 리그 오브 레전드 | 200 | 본인 인터뷰에서 게임명·이용·중단 이유 확인 | 통과 |
| 소진 | 귀곡자 | 200 | 귀곡 선생에게 배웠다는 기록이지 현전 《귀곡자》를 읽었다는 증거가 아님 | 제거 |
| 소진 | 동이 음부경 강해 | 200 | 《주서 음부》 독서 기록은 맞지만 연결 도서는 별개의 《황제음부경》 현대 해설서 | 제거 |
| 이영표 | 청년아 울더라도 뿌려야 한다 | 200 | 본인이 책명과 추천 이유를 직접 밝힘 | 통과 |
| 이영표 | 성경전서 | 200 | 본인이 네 번 완독·다섯 번째 독서 중이라고 직접 밝힘 | 통과 |
| 주유 | 예기 | 200 | 음률 발언을 《예기》로 확장한 후대 연결일 뿐 | 제거 |
| 주유 | 손자병법 | 200 | review 자체가 직접 학습 사료가 없다고 명시 | 제거 |
| 주유 | 시경 | 200 | ‘아곡’이라는 말을 《시경》 감상으로 확장한 후대 연결일 뿐 | 제거 |
| 빌 러셀 | The Autobiography of Malcolm X | 200 | 연결된 Slate 원문에 Malcolm X나 해당 자서전이 나오지 않음 | 제거 |

결론:

- 즉시 승격 가능: **박경리 4건, 김민재 1건, 이영표 2건 — 3명·7건**
- 잘못된 연결 제거 후 Light 유지: **노숙 3건, 소진 2건, 주유 3건, 빌 러셀 1건 — 4명·9건**
- 7명 전원 승격이 아니라 감사 통과자 3명만 승격한다.
- 제거 뒤 0건이 되는 4명도 `confirmed_empty`로 바꾸지 않는다. 이번 감사는 기존 등록분의 오류를 확인했을 뿐, 인물별 전면 조사를 끝낸 것이 아니다.

### locale·메타데이터 감사

| 대상 | 문제 | 조치 |
|---|---|---|
| 이영표 / 성경전서 en | ISBN `9780310908173`의 실제 출판사는 Zondervan인데 DB는 Faber & Faber, Limited | 승격 전 출판사·OpenLibrary 커버를 같은 에디션으로 교정 |
| 소진 / 동이 음부경 강해 | en locale 없음 | 연결 자체가 잘못돼 user_content 제거 대상. locale 신규 생성 안 함 |
| 노숙 / 춘추좌씨전 en | 표지 없음, `confirmed_unavailable` | 연결 자체가 잘못돼 user_content 제거 대상 |
| 노숙 / 한서 en | ISBN `9781846169380`은 실제로 Hans Christian Andersen 동화책 | 연결 제거. 해당 locale 오매칭은 이 콘텐츠를 공유하는 다른 사용자 감사에서 별도 교정 |
| 주유 / 예기 en | ISBN `9780802071019`는 `Iroquois Book of Rites` | 연결 제거. 공유 콘텐츠 locale 오매칭은 별도 교정 |
| 주유 / 손자병법 en | ISBN `9781979851688`은 스페인어판 `Arte de la Guerra` | 연결 제거. 공유 콘텐츠 에디션 정합은 별도 교정 |
| 빌 러셀 / Malcolm X ko | 한국어 locale이 원제 그대로이고 실제 한국어판 메타가 아님 | 연결 제거 대상이므로 신규 매칭 안 함 |

공유 콘텐츠의 locale 오매칭은 다른 사용자의 정상 연결까지 영향을 주므로 이번 7명 승격 트랜잭션에서 무작정 수정하거나 삭제하지 않는다.

## 원격 적용 순서

1. 마이그레이션 적용
2. 새 컬럼·트리거·기존 0건 `open` 검증
3. web-bo 배포
4. web 배포
5. `20260729_apply_positive_light_audit.sql` 원격 1회 실행
   - 잘못 연결된 `user_contents` 9건 제거
   - 이영표 성경 en 에디션 메타 교정
   - 박경리·김민재·이영표를 `full`로 승격
   - 대상 작품 `contents.user_count` 실측 동기화
   - 전체 결과가 기준선과 다르면 트랜잭션 롤백
6. 캐시 갱신 후 3명 상세·카드와 4명 Light 유지 상태 확인
7. `20260729_apply_active_target_pilot.sql` 원격 1회 실행
   - 신규 도서 2종과 ko/en locale 등록
   - 기존 도서 4종 판본 메타 교정
   - 매직 존슨·일연·왕희지·쇼토쿠 태자 콘텐츠 6건 등록
   - 네 사람 full 승격
   - 가의 2건은 고전 구문 오독으로 명시적 제외
8. 네 사람의 1·1·1·3건 표시와 콘텐츠 상세·카드 확인
9. `20260729_apply_active_target_batch_02.sql` 원격 1회 실행
   - 신규 도서 5종·음악 7종과 ko/en locale 24행 등록
   - 기존 도서 4종 판본 메타 교정, Gradus ko locale 보완
   - 9명에게 16건 연결하고 9명 full 승격
   - 이강인은 원문에 완전한 플레이리스트가 있어 추출된 3곡이 아니라 7곡 전부 반영
10. `20260729_correct_active_target_journey_errors.sql` 원격 1회 실행
    - 원문 ko/en MD5가 조사 시점과 같을 때만 6명 감상여정 교정
    - 한 명이라도 기준선이 달라졌으면 전체 롤백 후 재감사
11. 9명의 1·1·2·1·1·1·1·1·7건 표시와 콘텐츠 상세·카드 확인
12. `20260729_apply_active_target_batch_03.sql` 원격 1회 실행
    - 36~55번 20명 가운데 근거가 확인된 8명에게 12건 연결
    - 신규 도서 3종·음악 6종과 ko/en locale 18행 등록
    - 기존 『수호전』·『변신 이야기』·영화 「스타워즈」 재사용
    - 8명 full 승격, 건드린 12개 작품의 `contents.user_count` 실측 동기화
13. `20260729_correct_active_target_batch_03_journeys.sql` 원격 1회 실행
    - 원문 ko/en MD5가 조사 시점과 같을 때만 7명 감상여정 교정
    - 소진의 『주서 음부』를 현존 『황제음부경』과 분리
    - 야오밍·호나우지뉴·드보르자크 등 기존 여정의 출처 밖 해석 제거
14. 8명의 1·1·1·1·1·1·1·5건 표시, locale·출처·누적값 확인
15. `20260729_apply_active_target_batch_04.sql` 원격 1회 실행
    - 56~75번 20명 가운데 근거와 메타데이터가 모두 확인된 5명에게 9건 연결
    - 신규 도서 3종·음악 4종과 ko/en locale 14행 등록
    - 기존 『형이상학』·『브리태니커 백과사전』의 잘못 섞인 locale·판본 수선
    - 5명 full 승격, 건드린 9개 작품의 `contents.user_count` 실측 동기화
16. `20260729_correct_active_target_batch_04_journeys.sql` 원격 1회 실행
    - 원문 ko/en MD5가 조사 시점과 같을 때만 8명 감상여정 교정
    - 비베카난다의 독서량, 이치로의 특별판 제작 주체 등 기존 과장·오인을 제거
    - 안중근·조토·이상화는 영향·도상·유묵을 개인 독서로 바꾼 오인을 제거
17. 5명의 1·1·1·2·4건 표시, locale·출처·누적값 확인
18. `20260729_apply_active_target_batch_05.sql` 원격 1회 실행
    - 76~95번 20명 가운데 근거와 메타데이터가 모두 확인된 5명에게 7건 연결
    - 기존 콘텐츠 7종 재사용, 잘못 섞인 『소학』·『효경』 en locale 수선
    - 5명 full 승격, 건드린 7개 작품의 `contents.user_count` 실측 동기화
19. `20260729_correct_active_target_batch_05_journeys.sql` 원격 1회 실행
    - 원문 ko/en MD5가 조사 시점과 같을 때만 8명 감상여정 교정
    - 스키피오 두 사람 혼동, 콜럼버스 주석본 연대, 김옥균의 독서 주체 오인을 제거
20. 5명의 1·1·1·1·3건 표시, locale·출처·누적값 확인
21. `20260729_apply_active_target_batch_06.sql` 원격 1회 실행
    - 96~115번 20명 가운데 근거와 메타데이터가 모두 확인된 5명에게 5건 연결
    - 신규 도서 1종·음악 3종과 ko/en locale 8행 등록
    - 기존 성경 콘텐츠 재사용, 비어 있던 creator/publisher와 잘못된 누적값 수선
    - 5명 full 승격, 건드린 5개 작품의 `contents.user_count` 실측 동기화
22. `20260729_correct_active_target_batch_06_journeys.sql` 원격 1회 실행
    - 원문 ko/en MD5가 조사 시점과 같을 때만 16명 감상여정 교정
    - 본인 저작·후대 작품·연구 대상·단순 비교를 개인 감상으로 바꾼 오인 제거
    - 혼다 광고 성격, 발머 퇴임 연도, 제시 오언스 책의 연대 오류 교정
23. 5명의 1·1·1·1·1건 표시, locale·출처·누적값 확인
24. `20260729_apply_active_target_batch_07.sql`과
    `20260729_correct_active_target_batch_07_journeys.sql` 원격 실행
    - 116~125번 10명 가운데 메타데이터까지 통과한 3명에게 7건 연결
    - 신규 VIDEO·BOOK 각 1종 생성, 기존 5종 재사용
    - 잘못 합쳐진 『명상시집』 분석서 레코드를 원작 OpenLibrary 판본으로 교정
    - 3명 full 승격, 9명 감상여정의 추정·오인을 ko/en 함께 교정
25. 활성 + 감상여정 비정형 작품명 1~20번 조사·원격 반영
    - 작품·작품군 후보 18건을 문맥에서 복원하고 본인 저술·공연·후원·후대 전승을 분리
    - 맥스웰 2건, 프란치스코 1건만 근거와 메타데이터 게이트 통과
    - Faraday 도서의 금지된 Google Books 레거시 메타를 OpenLibrary ISBN 판본으로 교정
    - 러더퍼드에 잘못 연결된 Faraday 도서 1건 제거, 18명 감상여정 ko/en 교정
26. 활성 + 감상여정 비정형 작품명 21~40번 조사·원격 반영
    - 20명 가운데 본인의 직접 입증 자료와 작품 식별이 함께 통과한 람 모한 로이 1명에게 3건 연결
    - 기존 꾸란·우파니샤드의 섞인 en 판본과 금지된 Google Books 메타를 OpenLibrary 판본으로 교정
    - 람 모한 로이를 full로 승격하고 17명 감상여정의 추정·오인을 ko/en 함께 교정
27. 활성 + 감상여정 비정형 작품명 41~60번 조사·원격 반영
    - 테오도시우스 2세·테르툴리아누스·량원펑·파가니니 4명에게 각 1건 연결
    - 기존 『파이돈』의 합본 KO ISBN과 섞인 EN 판본을 단행본 판본으로 교정
    - 량원펑에게 잘못 붙은 량원겐의 생애를 포함해 17명 감상여정 ko/en 교정
28. 활성 + 감상여정 비정형 작품명 61~80번 조사·원격 반영
    - 작품 관계와 서비스 식별자가 함께 통과한 후보 0건
    - 이름 없는 경기·훈련 영상, 가수·장르 선호, 본인 경기·창작을 작품 소비와 분리
    - 20명 전원의 감상여정을 ko/en 함께 교정하고 light/open/0 유지
29. 활성 + 감상여정 비정형 작품명 81~84번 조사·원격 반영
    - 알 카밀·상관완아·이운재·박세리 모두 작품 단위 통과 0건
    - 네 명 감상여정을 ko/en 함께 교정하고 light/open/0 유지
30. 활성 + 감상여정 없음 4명 전면 조사·원격 반영
    - 존 허링 1건, 알렉스 스파이로 2건, 얀 르쿤 12건 연결 후 full 승격
    - 앤서니 암스트롱은 전 유형·표기 변형·동명이인 보충 검색까지 완료하고
      유효 작품 0건을 확인해 처음으로 `confirmed_empty(-1)` 적용
    - 신규 콘텐츠 7종·ko/en locale 14행 생성, 기존 콘텐츠 8종 재사용
    - 다른 책의 ISBN·표지가 붙은 『Deep Learning』 한국어판을 『심층 학습』 정식 판본으로 교정
31. 비활성 + 감상여정 명시 작품 69명 빠른 선별·원격 반영
    - 영향력 35 이상 또는 현대 인물의 외부 작품 자료 가능성이 큰 42명 `queued`
    - 본인 산출물·사후 기록·일반 교육 유추만 보이는 27명 `deferred`
    - 콘텐츠·tier·감상여정은 불변, `confirmed_empty(-1)` 생성 0명
32. 비활성 + 감상여정 비정형 작품 40명 빠른 선별·원격 반영
    - 영향력 35 이상 또는 공개 자료 가능성이 큰 24명 `queued`
    - 자기 연구·일반 경험·구전 문화만 보이는 16명 `deferred`
    - 콘텐츠·tier·감상여정은 불변, `confirmed_empty(-1)` 생성 0명
33. 비활성 + 감상여정 없음 전원 빠른 선별·원격 반영
    - 최초 스냅샷 186명 이후 새로 등록된 비활성 해커 6명을 포함해 현재 192명 처리
    - 운영 화면과 같은 영향력·현대 자료 직군·세력도 점수로 `queued` 87 / `deferred` 105
    - 콘텐츠·tier·감상여정은 불변, `confirmed_empty(-1)` 생성 0명
34. 전체 표시값·상태·실제 개수 최종 감사
    - 비활성 0건 `open` 잔존 0명
    - 콘텐츠 보유 `confirmed_empty`, 콘텐츠 보유 Light, 상태 시각 결함 모두 0건
35. 활성 조사 완료·0건 판정 교정 및 감상여정 운영 의존 제거
    - 기존 감사 후 0건 4명 + 명시 작품 검증 후 0건 86명 +
      비정형 후보 검증 후 0건 77명을 `confirmed_empty(-1)`로 교정
    - 앤서니 암스트롱을 합쳐 활성 `-1` 168명, 활성 `open/0` 0명
    - 비활성 301명은 빠른 선별뿐이므로 `queued`·`deferred`와 표시값 `0` 유지
    - 작업대의 감상여정 조회·작품명 추출·감상여정 기반 버킷 제거

## 활성·명시 작품군 파일럿

원격 인증을 기다리는 동안 DB를 수정하지 않고 125명에서 15명을 결정론적으로
표본 추출했다. 재현 기준은 `sha256("pilot-v1:" + slug)` 오름차순 첫 15명이다.
감상여정의 괄호형 제목 36개를 전부 대조했다.

| 인물 | 추출 후보 | 판정 |
|---|---|---|
| 매직 존슨 | Brighter By The Day | 본인 X 추천 원문 확인. 1건 통과 |
| 구스타프 클림트 | 아델레 블로흐바우어의 초상, 키스 | 본인 창작물. 0건 |
| 신사임당 | 소학, 대학 | 구체적인 A~B급 사료를 찾지 못함. 교육 배경 유추이므로 0건 |
| 성삼문 | 예기대문언두 | 본인이 편찬에 참여한 저술. 0건 |
| 마리아 칼라스 | 노르마, 루치아 디 람메르무어, 메데아 | 본인 공연작. 0건 |
| 호나우두 나자리우 | 마스 케 나다 | 본인 출연 광고의 음악이며 DB 여정의 직접 발언은 확인되지 않음. 0건 |
| 일연 | 삼국사기, 삼국유사, 석원사림 | 삼국유사가 삼국사기를 직접 인용. 나머지는 본인 저술. 1건 통과 |
| 알 마문 | 형이상학, 수사학, 국가, 티마이오스 | 번역 후원은 확인되나 본인의 특정 작품 감상 A~B급 증거는 없음. 0건 |
| 왕희지 | 도덕경, 난정서 | 진서의 도덕경 필사 기록 통과. 난정서는 본인 저술. 1건 통과 |
| 에이단 고메즈 | Attention Is All You Need | 본인 공저 논문. 0건 |
| 아놀드 파머 | A Golfer's Life | 본인 자서전. 0건 |
| 신윤복 | 혜원전신첩, 미인도 | 본인 창작물. 0건 |
| 쇼토쿠 태자 | 법화경, 유마경, 승만경, 삼경의소, 논어 | 세 경전의 강론·주석 근거 통과. 삼경의소는 본인 저술, 논어는 유추. 3건 통과 |
| 가의 | 시경, 서경, 과진론, 조굴원부, 복조부, 장자, 초사 | 전부 제외. 『한서』의 `能誦詩屬書`는 “시를 읊고 글을 지었다”는 뜻이지 『시경』·『서경』 두 작품의 독서 기록이 아님 |
| 박찬호 | 돌덩이 | 1973년생 투수와 1995년생 KIA 내야수가 섞인 동명이인 오염. 0건 |

근거:

- 매직 존슨: `https://twitter.com/MagicJohnson/status/1514440754617221125/photo/1`
- 일연: `https://db.history.go.kr/id/sy_005r_0030_0040_0020`
- 왕희지: 『진서·왕희지전』의 “도덕경을 써주면 거위를 주겠다”는 기록
- 쇼토쿠 태자: 일본서기 606년 강론 기록과 세 경전 주석 전승
- 박찬호 동명이인 대조: 2026년 기사에서 KIA 내야수의 테마송이 하현우의
  「돌덩이」였음을 재확인

가의는 최초 판정에서 2건을 통과시켰다가 원문 구문을 다시 대조해 취소했다.
『한서·가의전』의 `年十八，以能誦詩屬書聞於郡中`에서 `屬書`는
『서경』이라는 작품명이 아니라 “글을 짓다”라는 동사구다. 괄호형 제목 추출뿐
아니라 기존 감상여정 자체에도 작품명 과잉 해석이 섞여 있음을 보여 준다.

### 파일럿 적중률

- 인물 적중률: **4/15명 = 26.7%**
- 제목 적중률: **6/36개 = 16.7%**
- 본인 창작·공연·출연·동명이인 오염: **19/36개 = 52.8%**
- A~B급 근거가 없는 교육·영향·후원·고전 구문 오독: **11/36개 = 30.6%**

결론: 125명을 곧바로 웹 검색에 넣으면 낭비가 크다. 먼저 감상여정 문맥에서
본인 창작·공연·출연·전기·동명이인을 제거하는 값싼 1차 필터를 거친 뒤,
남은 후보만 원문 검색해야 한다. 자동 위험 분류는 회고록·저술 같은 단어만 보고
정상 추천까지 버릴 수 있으므로 도입하지 않았다. 대신 운영 화면에서 작품명별
원문 주변 문맥을 펼쳐 보고 사람이 1차 판정하게 했다.

### 기존 콘텐츠 재사용 후보

| 인물·작품 | 기존 content_id | 비고 |
|---|---|---|
| 일연·원본 삼국사기 | `467d387e-c688-43b0-8570-01df791de22b` | ko 재사용. en은 실제 신라본기 영역본 ISBN·표지로 교정 예정 |
| 왕희지·도덕경 | `1704dbb6-82ba-4469-ad53-2e940dbad597` | ko 현암사·en Penguin 에디션의 publisher·sources 교정 예정 |
| 쇼토쿠·법화경 | `dd29f2ad-fc98-4c9c-807c-4b7fe2bcf349` | 양 locale 재사용 가능 |
| 쇼토쿠·유마경 | `37de0d2c-9c7c-4c1e-8211-230a42f4c0c9` | en 표지는 confirmed_unavailable |
| 매직 존슨·Brighter by the Day | 없음 | 신규 등록 준비 완료. ISBN `9781538754610`, OpenLibrary 표지 |
| 쇼토쿠·승만경 | 없음 | 신규 등록 준비 완료. ko `9791128868191`, en `9781886439313` |

신규·교정 대상 표지 8개는 2026-07-29 모두 HTTP 200과 `image/jpeg`를
반환했다. 크기는 4,495~75,624바이트로 OpenLibrary placeholder 기준
1KB도 모두 넘었다. X·한국사데이터베이스·Chinese Text Project·하와이대학교
출판부·일본 e-Museum의 실제 등록 출처도 HTTP 200을 확인했다.

## 활성·명시 작품군 2차 표본

같은 125명에서 결정론적 순번 16~35번째 20명을 이어 조사했다. 감상여정에서
추출된 제목은 46개다.

초기 작업 메모에 적힌 구스타브 2세 아돌프 UUID는 실제 광해군 UUID였다.
실DB의 id·slug·닉네임을 다시 대조해 올바른 `09c6248d-56b8-49a1-84fe-d34c8fd4ac77`로
교정했다. 적용 SQL은 세 값을 함께 검사하므로 같은 종류의 오등록을 롤백한다.

| 인물 | 추출 후보 수 | 통과 | 판정 요약 |
|---|---:|---:|---|
| 구스타브 2세 아돌프 | 1 | 1 | 1901년 Grotius 판본 서문에 전장에서 성경 옆에 둔 책으로 명시 |
| 호스로 1세 | 3 | 0 | 번역·후원·후대 전승이며 본인의 특정 판본 감상 근거 없음 |
| 이창호 | 5 | 1 | 본인 자서전 제외. 『제7의 감각』은 구체적 추천사 확인, 게임 3종은 출처 미확인 |
| 정의선 | 2 | 0 | 조부의 저술·인용 관계이지 본인의 직접 감상 근거가 아님 |
| 누르하치 | 2 | 2 | 『청사연구』 논문에 『삼국지연의』·『수호전』을 즐겨 읽었다고 명시 |
| 정몽주 | 5 | 0 | 근거로 붙은 한국사DB 구절의 주체가 정몽주가 아니라 이제현인 오귀속 |
| 나폴레옹 3세 | 3 | 0 | 모두 본인 저술 |
| 요제프 하이든 | 2 | 1 | 『그라두스 아드 파르나숨』은 작업 기초 사용 확인, 『천지창조』는 본인 작품 |
| 찬드라굽타 마우리아 | 1 | 0 | 스승과의 관계에서 유추했을 뿐 본인 감상 근거 없음 |
| 황지우 | 3 | 1 | 본인 시에 『화엄경』을 펼쳐 읽은 장면, 본인 시집 제외, 『거대한 뿌리』는 출처 미확인 |
| 주세페 가리발디 | 1 | 1 | 자필 원고 기반 회고록에서 포스콜로의 시구를 직접 읊음 |
| 알콰리즈미 | 3 | 0 | 두 권은 본인 저술, 『알마게스트』는 활동 배경에서 유추 |
| 얀 후스 | 1 | 1 | 위클리프 『교회론』의 장문 발췌·오랜 독서와 필사 확인 |
| 유클리드 | 2 | 0 | 『원론』은 본인 저술, 『티마이오스』는 영향 추정 |
| 광해군 | 1 | 0 | 『동의보감』 편찬·간행 후원이지 본인 감상 근거가 아님 |
| 이성계 | 1 | 0 | 국가 편찬·후원 관계 |
| 성덕왕 | 4 | 0 | 김대문의 저술과 왕의 후원 관계를 개인 감상으로 잘못 확장 |
| 헤르타 뮐러 | 2 | 1 | 『숨그네』는 본인 저술, 『빈 의자』는 공식 출판사 페이지에서 서문 집필 확인 |
| 이강인 | 3 | 2 | 추출된 「SAD!」·「Thunder」 통과, 잘못 추출된 「시차를 달리며」는 기각 |
| 추신수 | 1 | 0 | 본인 저술 |

### 2차 적중률과 원문 확장

- 인물 적중률: **9/20명 = 45.0%**
- 추출 제목 적중률: **11/46개 = 23.9%**
- 실제 등록 예정: **9명·16건**

이강인 기사에는 일부 제목의 단서만 있는 것이 아니라 본인이 고른 7곡 전체가
열거되어 있다. 따라서 기계가 괄호에서 뽑은 3곡만 처리하지 않고 원문이 제공한
완전한 목록을 등록한다.

1. 우원재 feat. 로꼬·그레이 — 「시차 (We Are)」
2. 박재범 feat. 후디·로꼬 — 「All I Wanna Do (K)」
3. Imagine Dragons — 「Thunder」
4. XXXTENTACION — 「SAD!」
5. FT아일랜드 — 「사랑사랑사랑」
6. 로꼬 feat. 콜드 — 「시간이 들겠지」
7. 처진 달팽이(이적·유재석) — 「말하는 대로」

기사에서 이강인은 평소 여러 장르를 듣고, 자신이 듣는 곡 중 형들이 좋아할
노래를 골랐다고 설명한다. 기존 감상여정의 윤미래 「시차를 달리며」는
아티스트와 곡명이 모두 잘못됐고, 세 곡에 붙은 개인 심리 해석도 기사에 없는
문장이므로 교정 SQL에서 제거한다.

### 1·2차 누적

- 조사 인물: **35명**
- 근거 통과 인물: **13/35명 = 37.1%**
- 추출 제목: **82개**
- 근거 통과 제목: **17/82개 = 20.7%**
- 원문 완전 목록 확장 후 실제 등록: **13명·22건**

제목 적중률은 여전히 약 21%다. 남은 90명을 제목마다 무차별 검색하는 방식은
쓰지 않는다. 운영 화면의 문맥으로 본인 저술·창작·출연·후원·편찬·동명이인을
먼저 제거하고, 남은 후보만 원문 검색한다. 반대로 이강인처럼 원문이 완전한
목록을 주면 추출 후보에 갇히지 않고 명시된 전체를 회수한다.

### 신규·재사용 콘텐츠

| 인물·작품 | 처리 |
|---|---|
| 구스타브 2세 아돌프·『전쟁과 평화의 법』 | 신규 BOOK, OpenLibrary `9780865974364` |
| 이창호·『제7의 감각: 전략적 직관』 | 신규 BOOK, Naver `9788962600322` |
| 누르하치·『삼국지연의』 | 기존 `420e33ee-db0a-4fbe-ada3-9f4596bb56ae`, en 판본을 UC Press Moss Roberts 번역으로 교정 |
| 누르하치·『수호전』 | 기존 `104be5b3-84dd-4471-b03e-abcc3a3dc135`, en 판본을 Tuttle `9784805317877`로 교정 |
| 하이든·『그라두스 아드 파르나숨』 | 기존 `6b438df7-02c6-440c-a9ef-e34c1b2df44d`, 잘못 섞인 ISBN·표지 교정 및 ko locale 추가 |
| 황지우·『화엄경』 | 기존 `1d935236-c196-4314-9615-9e775ff23186`, ko/en 출판사 보완 |
| 가리발디·「묘지에 부쳐」 | 신규 BOOK, OpenLibrary `9788890292835`, 해당 판본 표지는 `confirmed_unavailable` |
| 얀 후스·위클리프 『교회론』 | 신규 BOOK, OpenLibrary `OL28379697M` |
| 헤르타 뮐러·『빈 의자』 | 신규 BOOK, OpenLibrary `9781555977252` |
| 이강인·7곡 | 신규 MUSIC 7종, Spotify track ID 사용 |

신규 외부 ID 12개와 신규 ISBN 5개는 실DB에서 중복 0건이다. 신규·교정 표지
19개를 다시 GET한 결과 전부 HTTP 200, `image/jpeg`, 11,248~1,016,426바이트였다.
Spotify oEmbed도 7개 track ID의 제목과 표지를 모두 반환했다.

Spotify Web API 토큰 발급은 성공했지만 현재 앱 소유자 계정에 Premium 구독이
필요하다는 응답으로 상세 API 조회가 막혔다. 이 때문에 실패를 빈 결과로
간주하지 않았다. 원문 기사로 곡·아티스트를 확인하고, Spotify 공개 track
페이지와 oEmbed로 ID·제목·표지를 교차 검증했다. `contents.metadata`에는
`entityType=track`과 원본 track URL을 함께 보존한다.

### 조사 중 발견한 감상여정 오류

콘텐츠 연결과 별도로 다음 6명은 `20260729_correct_active_target_journey_errors.sql`
에서 ko/en을 함께 교정한다.

- 구스타브 2세 아돌프: 안장 가방 → 판본 서문에 기록된 “성경 옆 군인의 베개 아래”
- 누르하치: 독서 사실과 유비·조조 전술을 현실에 옮겼다는 후대 해석 분리
- 주세페 가리발디: 「묘지에 부쳐」 전편 암기 → 회고록이 확인하는 특정 시구 낭송
- 얀 후스: 위클리프 『교회론』은 영어가 아니라 라틴어, 첫 10장이 아니라 첫 3장 중심
- 헤르타 뮐러: 공식 출판사 페이지에서 확인되지 않는 직접인용 제거, 서문 집필만 유지
- 이강인: 잘못된 곡명·아티스트와 기사에 없는 심리 해석을 실제 7곡·본인 발언으로 교체

교정 SQL은 현재 원문의 ko/en MD5를 모두 검사한다. 조사 뒤 누군가 한 글자라도
수정했다면 덮어쓰지 않고 트랜잭션 전체가 멈춘다.

## 활성·명시 작품군 3차 배치

결정론적 순번 36~55번째 20명을 조사했다. 감상여정에서 추출된 후보는 31개다.

| 인물 | 추출 후보 | 통과 | 판정 요약 |
|---|---:|---:|---|
| 이승엽 | 2 | 0 | 응원가·등장곡으로 쓰인 정황뿐이며 본인의 청취 발언은 찾지 못함 |
| 마르코 폴로 | 1 | 0 | 본인 구술 저작 |
| 아르키메데스 | 1 | 0 | 유클리드 전통을 배웠다는 학술적 개연성만 있고 특정 저술 독서 기록은 없음 |
| 미야모토 무사시 | 2 | 0 | 모두 본인 저작·작품 |
| 가쓰시카 호쿠사이 | 2 | 1 | 프린스턴대학교 미술관이 『수호전』 일본 각색본 삽화 준비 소묘를 확인, 『호쿠사이 만화』는 본인 저작 |
| 박지성 | 2 | 0 | 본인 자서전과 자신을 다룬 퍼거슨 자서전 |
| 킬리안 음바페 | 1 | 1 | ESPN 영상에서 가장 좋아하는 곡으로 「Controlla」를 직접 답함 |
| 자크 루이 다비드 | 1 | 0 | 본인 회화 |
| 소진 | 1 | 1 | 『사기』에 『주서 음부』를 얻어 읽었다고 명시. 현존 『황제음부경』과 분리 |
| 노자 | 1 | 0 | 본인에게 귀속된 저작 |
| 주유 | 1 | 0 | 자신을 다룬 사서 열전 |
| 사이고 다카모리 | 1 | 1 | 도쿄도립도서관이 『언지사록』 네 책에서 101조를 직접 발췌했다고 설명 |
| 탁문군 | 2 | 0 | 본인 귀속 시와 자신에게 연주된 노래 |
| 야오밍 | 1 | 1 | 2002년 AP 인터뷰에서 가장 좋아하는 미국 영화로 「Star Wars」를 직접 답함 |
| 박태환 | 1 | 0 | 만화 제목에서 나온 별명일 뿐 감상 기록이 아님 |
| 티치아노 베첼리오 | 2 | 1 | 내셔널 갤러리가 『변신 이야기』의 구체적 장면을 여러 회화로 옮겼다고 확인, 『신곡』 근거는 미확인 |
| 안토닌 드보르자크 | 2 | 1 | 공식 아카이브가 『하이아와사의 노래』 체코어 번역·영어 원문 접촉과 오페라 스케치를 확인, 「신세계로부터」는 본인 작품 |
| 하룬 알 라시드 | 1 | 0 | 『천일야화』에 등장하는 인물이지 감상자가 아님 |
| 호나우지뉴 | 5 | 5 | FC 바르셀로나와 스포티파이가 본인 선곡 공식 목록으로 공개 |
| 이사벨 1세 | 1 | 0 | 문법서 헌정·출판 관계이며, 스페인 국립도서관은 초기 후원도 부정함 |

### 3차 적중률

- 인물 적중률: **8/20명 = 40.0%**
- 추출 제목 적중률: **12/31개 = 38.7%**
- 실제 등록: **8명·12건**
- 본인 저작·본인 대상 작품·단순 후원·도상·공연·별명: **15/31개**
- 직접 감상 근거를 확인하지 못한 후보: **4/31개**

이번 배치에서도 작품명처럼 보이는 문자열을 바로 검색하지 않았다. 먼저 본인
저작과 자신을 다룬 작품, 후원·공연·별명 관계를 제거했고 남은 후보만 원문을
대조했다. 소진의 사례처럼 제목이 비슷해도 다른 문헌이면 기존 콘텐츠를
재사용하지 않고 별도 항목으로 분리했다.

### 3차 반영 콘텐츠

| 인물·작품 | 처리 |
|---|---|
| 호쿠사이·『수호전』 | 기존 `104be5b3-84dd-4471-b03e-abcc3a3dc135` 재사용 |
| 음바페·「Controlla」 | 신규 MUSIC `21805094-634d-4f99-9617-8ee9624689ee`, Spotify `4CpKEkdGbOJV51cSvx7SoG` |
| 소진·『주서 음부』 | 신규 소실 문헌 `30842a53-4e7c-46e3-a507-ce034714c198`, 현존 『황제음부경』과 병합 금지 |
| 사이고·『언지록』 | 신규 BOOK `cc4e79de-bd20-4e76-b4b7-f73a0354d82e`, Naver `9788997779895` |
| 야오밍·「스타워즈」 | 기존 `dd2cf84b-e8e4-4669-b22b-d2cb56b8a676` 재사용 |
| 티치아노·『변신 이야기』 | 기존 `13410b89-7c1f-4461-a1e2-b3f2975148e6` 재사용 |
| 드보르자크·『하이아와사의 노래』 | 신규 BOOK `222ad57c-012a-4ac4-a47f-95c60a8dacaa`, Naver `9791127279875` |
| 호나우지뉴·5곡 | 신규 MUSIC 5종, 공식 Barça Legends Spotify 목록의 실제 track ID 사용 |

신규 콘텐츠 9종은 ko/en locale이 각 1행씩 있다. 표지 8개와 Spotify track
페이지 6개는 모두 HTTP 200을 반환했다. 반영 뒤 12개 작품의 `user_count`와
실제 `user_contents` 수를 다시 맞췄다. 기존 『변신 이야기』의 누적값은
12에서 실제 18로, 『수호전』은 13으로, 「스타워즈」는 10으로 교정됐다.

감상여정 교정 SQL의 첫 실행은 검증식이 새 문장의 반박 설명까지 옛 오류로
오인해 전부 롤백했다. 데이터 변경은 없었다. 검사식을 새 사실의 필수 문구를
확인하는 방식으로 바꾼 뒤 다시 실행했고, 7명 모두 ko/en 원문과
`consumption_philosophy`가 일치하는지 확인했다.

## 활성·명시 작품군 4차 배치

결정론적 순번 56~75번째 20명을 조사했다. 감상여정에서 추출된 후보는
43개다. 작품과 인물의 직접 관계가 확인된 후보는 11개였고, 그중 2개는
네이버·OpenLibrary 판본 게이트를 통과하지 못해 등록을 보류했다.

| 인물 | 추출 | 관계 통과 | 등록 | 판정 요약 |
|---|---:|---:|---:|---|
| 마크 첸 | 2 | 0 | 0 | 본인이 만든 대회 문제 |
| 엔헤두안나 | 1 | 0 | 0 | 본인 저작 |
| 안중근 | 3 | 0 | 0 | 유묵 문구는 『명심보감』 독서 증거가 아니며 나머지는 본인 저작 |
| 포카혼타스 | 1 | 1 | 1 | 1617년 화이트홀에서 「환희의 비전」 관람 기록 확인 |
| 프란츠 베켄바워 | 1 | 0 | 0 | 본인 녹음 |
| 헤로도토스 | 1 | 0 | 0 | 본인 저작 |
| 카라바조 | 1 | 0 | 0 | 후대 전기·회화 해석에서 유추한 영향 |
| 의천 | 2 | 0 | 0 | 본인 저작 |
| 베이브 루스 | 1 | 0 | 0 | 본인이 출연한 영화 |
| 유방 | 2 | 0 | 0 | 후대 사서가 붙인 고전 인용이며 개인 독서 기록이 아님 |
| 알 킨디 | 4 | 2 | 1 | 『형이상학』 번역은 그를 위해 제작. 『아리스토텔레스의 신학』은 적격 판본 부재 |
| 이상화 | 4 | 0 | 0 | 보들레르 비교 연구는 직접 독서 기록이 아님 |
| 자코모 푸치니 | 6 | 1 | 1 | 1876년 피사에서 베르디 「아이다」 관람 확인 |
| 슈거 레이 로빈슨 | 1 | 0 | 0 | 본인 공연·출연 |
| 조토 디 본도네 | 1 | 0 | 0 | 예배당 도상 출처와 화가 개인의 독서를 구분할 수 없음 |
| 비베카난다 | 2 | 2 | 2 | 그린의 역사서 3일, 브리태니커 10권 완료·11권째 기록 확인 |
| 소하 | 1 | 0 | 0 | 본인이 편찬한 법전 |
| 이자성 | 2 | 0 | 0 | 구호·정치적 수사 |
| 람세스 2세 | 2 | 0 | 0 | 일반적 서기관 교육에서 유추 |
| 스즈키 이치로 | 5 | 5 | 4 | 4건 등록. 『캡틴』 관계는 통과했으나 적격 판본 부재 |

### 4차 반영 콘텐츠

| 인물·작품 | 처리 |
|---|---|
| 포카혼타스·「환희의 비전」 | 신규 BOOK `1fa2f3ff-7fb6-4ae6-b8ee-54e76fcf11e5`, Yale 전집 ISBN `9780300105384` |
| 알 킨디·『형이상학』 | 기존 `2c4fb84d-3f46-4ac3-8a61-71adccac8eb9` 재사용, 잘못 붙은 하이데거 en locale을 아리스토텔레스판으로 교체 |
| 푸치니·「아이다」 | 신규 MUSIC `c71f849c-d819-453e-9c01-c5a5ab945113`, Spotify album `1DzOlDcp25jxdtz6Qafldl` |
| 비베카난다·『영국민의 짧은 역사』 | 신규 BOOK `620963ff-ba71-4c56-9c85-8f1d011a32e3`, OpenLibrary `9780460007276` |
| 비베카난다·『브리태니커 백과사전』 | 기존 `53061433-86a0-4571-a785-b141fcc3ddea` 재사용, 동명 해설서 ko locale 제거·판본 통일 |
| 이치로·『Men at Work』 | 신규 BOOK `f65dafe8-93a8-49f0-baf4-068b21ba59d3`, OpenLibrary `9780060973728` |
| 이치로·「아마기고에」 | 신규 MUSIC `c352c8bd-c0f2-4760-a939-4ea2b508e378` |
| 이치로·「Jump」 | 신규 MUSIC `a123811a-ee8b-4e68-935c-06dd50c664cf` |
| 이치로·「In the Ayer」 | 신규 MUSIC `81a7f816-e174-4da0-bba1-29d3b8b0713a` |

`형이상학`은 저장된 `user_count=9`와 실제 연결 13건이 이미 어긋나 있었다.
알 킨디를 연결한 뒤 실측 14건으로 바로잡았다. 브리태니커는 기존 1건에서
2건으로 동기화했다. 신규·수선 콘텐츠 9종 모두 ko/en locale 2행,
`verified=true`, 실제 썸네일을 갖추며 저장 누적값과 실제 연결 수가 일치한다.

등록 출처 8개와 새 썸네일 5개는 모두 HTTP 200을 반환했다. 책 메타데이터는
네이버·OpenLibrary만 사용했다. 이치로의 『캡틴』은 집영사에 ISBN과 표지가
있고 인물 관계도 확인됐지만, 프로젝트의 책 메타데이터 원칙을 넘지 않기 위해
네이버·OpenLibrary에 적격 레코드가 생길 때까지 보류한다.

## 활성·명시 작품군 5차 배치

결정론적 순번 76~95번째 20명을 조사했다. 감상여정에서 추출된 후보는
37개다. 추출 후보 8개에서 작품과 인물의 직접 관계를 확인했고, 명성황후
사료를 읽는 과정에서 괄호형 추출에 잡히지 않은 『사기』 1건을 추가로
발견했다. 관계가 확인된 『이마고 문디』와 『여훈』은 네이버·OpenLibrary에서
정확히 대응하는 ISBN 판본을 찾지 못해 보류했다.

| 인물 | 추출 | 관계 통과 | 등록 | 판정 요약 |
|---|---:|---:|---:|---|
| 현장 | 1 | 0 | 0 | 『대당서역기』는 본인 구술·편찬 저작 |
| 기욤 람플 | 3 | 1 | 1 | 논문에서 ViZDoom의 「Doom」을 직접 연구 환경으로 사용. Attention·Chinchilla 개인 감상 근거는 없음 |
| 강감찬 | 2 | 0 | 0 | 본인에게 귀속된 시문 |
| 척계광 | 1 | 0 | 0 | 본인 저술 |
| 조광윤 | 4 | 0 | 0 | 국가 편찬·사료 전승을 개인 독서로 확장할 근거 없음 |
| 크리스토퍼 콜럼버스 | 2 | 2 | 1 | 현존 주석본으로 두 작품의 정독 확인. 『이마고 문디』는 적격 판본 부재 |
| 스키피오 아프리카누스 | 1 | 0 | 0 | 『키루스의 교육』 일화의 인물은 양손자 스키피오 아이밀리아누스 |
| 항우 | 1 | 0 | 0 | 후대 문학적 연결이며 개인 감상 근거 없음 |
| 자한기르 | 1 | 0 | 0 | 본인 회고록 |
| 안토니오 비발디 | 2 | 0 | 0 | 본인 작곡 작품 |
| 김홍도 | 4 | 0 | 0 | 본인 유묵·회화 |
| 양귀비 | 2 | 0 | 0 | 본인 공연·무용 관계이지 감상 기록이 아님 |
| 에피쿠로스 | 1 | 1 | 1 | 디오게네스 라에르티오스가 헤시오도스 ‘카오스’ 구절과의 직접 접촉을 전함 |
| 네페르티티 | 1 | 0 | 0 | 국가 종교 찬가와 왕비 개인의 감상 관계를 입증할 자료 없음 |
| 사이초 | 1 | 1 | 1 | 천태종 공식 전기에 798년부터 『법화경』 강론·연구·보급 기록 |
| 윌트 체임벌린 | 1 | 0 | 0 | 방송 출연 관계 |
| 래리 버드 | 2 | 0 | 0 | 본인 자서전과 본인 출연 영화 |
| 김옥균 | 3 | 0 | 0 | 『갑신일록』은 본인 저술. 나머지 두 책을 연구한 주체는 유홍기 |
| 명성황후 | 3 | 3 | 3 | 『소학』·『효경』 등록, 『여훈』 판본 보류. 같은 사료의 『사기』를 추가 등록 |
| 아르튀르 멘슈 | 1 | 0 | 0 | Attention 개인 독서 기록 없음. Chinchilla는 본인 공저 연구 |

### 5차 반영 콘텐츠

| 인물·작품 | 처리 |
|---|---|
| 기욤 람플·「Doom」 | 기존 `77f89242-93e6-4628-ac7c-e6b9704a16a9` 재사용, 1993년 원작 메타데이터 보완 |
| 콜럼버스·『동방견문록』 | 기존 `47660ad8-4959-4394-8dd6-f452b0db7fbf` 재사용 |
| 에피쿠로스·『신통기』 | 기존 `5c38c188-32a1-4551-9ce7-97c025b2e364` 재사용 |
| 사이초·『법화경』 | 기존 `dd29f2ad-fc98-4c9c-807c-4b7fe2bcf349` 재사용 |
| 명성황후·『소학』 | 기존 `4233ffc3-ee2d-43aa-ab62-32ec65bd113e` 재사용, 동명 교육학 교재 en locale 제거 |
| 명성황후·『효경』 | 기존 `1c55da8a-71d5-44e8-8693-36cff64f3bc4` 재사용, 동명 회화 연구서 en locale 제거 |
| 명성황후·『사기』 | 기존 `13fc7c7e-731e-4de0-a186-3fb8d86616dc` 재사용 |

등록 출처와 현재 표지 URL은 모두 HTTP 200을 확인했다. 7건의 ko/en 감상경위와
출처가 채워졌고, 7개 작품 모두 ko/en locale 2행이 `verified=true`이며 실제
표지를 갖는다. 반영 뒤 저장 누적값과 실측 연결 수는 각각 Doom 2, 동방견문록
3, 신통기 9, 법화경 13, 소학 4, 효경 6, 사기 28로 일치한다.

감상여정은 기욤 람플·콜럼버스·스키피오·에피쿠로스·사이초·김옥균·명성황후·
아르튀르 멘슈 8명을 ko/en 함께 교정했다. 특히 콜럼버스의 현존 주석본은
1496년 이후 입수·주석됐다는 견해도 있어 첫 항해의 원인으로 단정하지 않았다.

## 활성·명시 작품군 6차 배치

결정론적 순번 96~115번째 20명을 조사했다. 감상여정에서 추출된 후보는
49개다. 법현 3건, 그레고리우스 1건, 류현진 2건, 혼다 소이치로 1건,
스티브 발머 1건, 빌리 홀리데이 1건의 직접 관계를 확인했다.

법현의 『대반열반경』·『잡아비담심론』, 류현진의 「Ryu Can Do It」,
혼다의 『輪業の世界』는 관계는 통과했지만 네이버·OpenLibrary·Spotify에서
정확히 대응하는 적격 메타데이터를 확보하지 못해 보류했다.

| 인물 | 추출 | 관계 통과 | 등록 | 판정 요약 |
|---|---:|---:|---:|---|
| 호메로스 | 2 | 0 | 0 | 『일리아스』·『오디세이아』는 본인 귀속 저작 |
| 법현 | 4 | 3 | 1 | 여행기에서 세 율장·경론의 확보·필사를 직접 기록. 『마하승기율』만 적격 판본 확보 |
| 오노노 고마치 | 1 | 0 | 0 | 후대 선집에 수록된 본인 작품 |
| 그레고리우스 1세 | 5 | 1 | 1 | 『욥기 주해』가 성경 욥기의 직접 읽기·해석을 입증. 나머지는 본인 저술 |
| 류현진 | 2 | 2 | 1 | 두 응원가 모두 직접 청취 확인. 「Ryu Can Do It」 원곡 Spotify 식별 보류 |
| 제시 오언스 | 4 | 0 | 0 | 패독 자서전은 연대 불일치, 두 책은 출처 미확인, 한 권은 본인 저술 |
| 손무 | 1 | 0 | 0 | 『손자병법』은 본인 귀속 저작 |
| 혼다 소이치로 | 1 | 1 | 0 | 잡지 광고를 보고 진로 결정. 적격 ISBN 판본 부재 |
| 스티브 발머 | 2 | 1 | 1 | 2013년 마지막 직원 회의에서 작별곡을 직접 선택·해석. 영화 전체 감상은 미확인 |
| 차범근 | 2 | 0 | 0 | 성경의 구체적 반복 독서와 베켄바워 추천 장면의 출처 미확인 |
| 아시시 바스와니 | 1 | 0 | 0 | 본인 공저 연구 |
| 키루스 2세 | 2 | 0 | 0 | 모두 키루스 사후에 쓰인 후대 저술 |
| 빌리 홀리데이 | 2 | 1 | 1 | 자서전에서 「West End Blues」 청취와 반응을 구체적으로 회고 |
| 칭기즈 칸 | 2 | 0 | 0 | 고문의 인용·조언을 군주 개인의 독서로 확장할 수 없음 |
| 유스티니아누스 1세 | 4 | 0 | 0 | 본인이 명한 법전 편찬 사업의 산출물 |
| 안녹산 | 2 | 0 | 0 | 사후 편찬 역사서와 후대 시 |
| 고타마 붓다 | 4 | 0 | 0 | 시대적 사상 배경과 귀속 설법을 특정 텍스트 소비로 바꾼 추정 |
| 루이 16세 | 1 | 0 | 0 | 일반적 도서·지도 관심은 확인되나 『로빈슨 크루소』 직접 독서 미확인 |
| 박노해 | 3 | 0 | 0 | 본인 저작 |
| 마크 레이버트 | 4 | 0 | 0 | 연구 분야·대중적 영화 비교를 개인 감상으로 바꿀 근거 없음 |

### 6차 반영 콘텐츠

| 인물·작품 | 처리 |
|---|---|
| 법현·『마하승기율 (상)』 | 신규 BOOK `a812523e-bfca-469a-b87d-3c7ecda043e7` |
| 그레고리우스 1세·성경 | 기존 `6e5989e2-0cfb-4a4c-8e47-182d0599bfd0` 재사용, locale 편집 주체와 누적값 수선 |
| 류현진·「KOREAN MONSTER」 | 신규 MUSIC `38d653c7-7cbd-43da-8c9b-e94e5f95a5d9` |
| 스티브 발머·「(I've Had) The Time of My Life」 | 신규 MUSIC `0b174b62-6ee3-4807-8b54-58cf27af53bf` |
| 빌리 홀리데이·「West End Blues」 | 신규 MUSIC `a628999c-e526-4e4f-9a4e-6828d6198e81` |

등록 출처 5개와 새 썸네일 4개를 재검사했다. ITV 원문만 이 환경에서
30초 타임아웃이 발생해 같은 장면을 보도하고 HTTP 200인 Guardian 기사로
발머의 출처와 감상문 범위를 교체했다. 최종 출처·썸네일 9개는 모두 HTTP
200이다. 5건 모두 ko/en 감상경위와 verified locale 2행을 갖는다.

성경은 반영 전 `user_count=14`였지만 실제 연결은 30건이었다. 그레고리우스를
연결한 뒤 실측 31건으로 바로잡았고, 나머지 신규 콘텐츠는 모두 1건으로
저장값과 실측값이 일치한다. 감상여정은 조사 중 오류가 확인된 16명을 ko/en
함께 교정했다.

## 활성·명시 작품군 7차 배치

결정론적 순번 116~125번째 마지막 10명을 조사했다. 감상여정에서 추출된
후보는 25개다. 직접 감상·구독·구매 관계가 확인된 후보는 13개였고, 현재
서비스 타입과 외부 메타데이터 게이트까지 통과해 실제 등록한 것은 3명·7건이다.

| 인물 | 추출 | 관계 통과 | 등록 | 판정 요약 |
|---|---:|---:|---:|---|
| 조세 무리뉴 | 1 | 1 | 1 | TNT Sports 본인 답변에서 가장 좋아하는 TV 프로그램으로 「피키 블라인더스」를 직접 지목 |
| 오귀스트 로댕 | 6 | 5 | 5 | Musée Rodin이 단테·위고 3종·보들레르의 직접 독서와 작업 관계를 명시. 「지옥의 문」은 본인 작품 |
| 을지문덕 | 1 | 0 | 0 | 『삼국사기』는 후대 사료이며 특정 고전·병법서의 개인 독서 기록은 없음 |
| 프랑수아 피노 | 2 | 2 | 0 | 두 미술품의 직접 구매·수집 관계는 확인되나 현재 지원 콘텐츠 타입 밖 |
| 네부카드네자르 2세 | 1 | 0 | 0 | 『에누마 엘리시』 의례 낭송과 왕 개인의 청취를 구분할 자료 없음 |
| 우타가와 히로시게 | 2 | 0 | 0 | 모두 본인 연작. 호쿠사이 영향도 특정 작품 직접 감상 기록으로 좁혀지지 않음 |
| 최태원 | 3 | 0 | 0 | ‘知難而行’을 쑨원의 ‘知難行易’와 합친 오류. 『명상록』 독서도 미확인, 한 권은 본인 저작 |
| 마일스 데이비스 | 3 | 3 | 1 | 세 작품의 직접 청취 확인. 「Stand!」만 정확한 Spotify 앨범 식별 |
| 윤봉길 | 4 | 2 | 0 | 우리역사넷이 『개벽』 전호 열독·『동아일보』 구독을 명시하지만 ISBN 판본 아님 |
| 김유신 | 2 | 0 | 0 | 임신서기석의 경전 학습 맹세는 김유신이 아닌 이름 없는 두 청년의 기록 |

### 7차 반영 콘텐츠

| 인물·작품 | 처리 |
|---|---|
| 무리뉴·「피키 블라인더스」 | 신규 VIDEO, TMDB `tmdb-tv-60574` |
| 로댕·『신곡』 | 기존 `70d75785-5f1e-45fb-99ef-f936e6fd8298` 재사용 |
| 로댕·『노트르담 드 파리』 | 기존 `59ad6c47-8297-4852-8ab9-f9079ff843f1` 재사용 |
| 로댕·『동방시집』 | 신규 BOOK, OpenLibrary ISBN `9782080704399` |
| 로댕·『명상시집』 | 기존 `15111ba4-d4bc-4303-a07f-29025d3ef549`의 분석서 오매칭을 원작 ISBN `9782070437283`으로 교정 |
| 로댕·『악의 꽃』 | 기존 `5a918414-ae1e-4578-941c-6a6857e8753b` 재사용 |
| 마일스 데이비스·「Stand!」 | 기존 `432910cb-f643-4165-a2a6-3562615f0713` 재사용 |

출처 4개와 신규·교정 썸네일 3개는 모두 HTTP 200을 반환했다. 썸네일은
실제 화면으로 열어 작품·판본과 일치하는지 육안 확인했다. 신규·교정 콘텐츠는
ko/en verified locale 2행, creator, 실제 표지를 갖춘다.

기존 『신곡』은 반영 전 `user_count=14`였지만 실제 연결은 32건이었다.
로댕 연결 뒤 실측 33건으로 바로잡았다. 나머지 touched contents도 저장값과
실제 연결 수가 모두 일치한다. 등록한 3명은 `full/open`이고 실제 콘텐츠 수는
무리뉴 1, 로댕 5, 마일스 데이비스 1이다. 나머지 7명은 표적 조사만 마쳤으므로
`light/open/0`을 유지하며 `-1`로 확정하지 않았다.

감상여정은 무리뉴·로댕·을지문덕·네부카드네자르·히로시게·최태원·
마일스 데이비스·윤봉길·김유신 9명을 ko/en 함께 교정했다. 피노의 기록은
직접 미술품 수집 관계 자체가 정확해 유지했다.

### 활성 명시 작품군 누적

- 조사 인물: **125명**
- 근거 통과 인물: **41/125명 = 32.8%**
- 추출 제목: **267개**
- 직접 관계 근거 통과 제목: **70/267개 = 26.2%**
- 지원 타입·판본 게이트까지 통과해 실제 등록: **39명·62건**
- 남은 활성 명시 작품군: **0명**

## 활성·비정형 작품군 1차 배치

결정론적 순번 1~20번째 20명을 조사했다. 괄호형 제목 추출기가 놓친
작품·작품군 후보 18건을 원문 문맥에서 복원했다. 대부분은 본인 저술·공연,
국가적 후원, 이름 없는 장르 선호, 후대 전승과 영향 추정이었다. 개인의
직접 감상과 작품 식별이 함께 통과한 것은 2명·3건이다.

| 인물 | 등록 | 판정 요약 |
|---|---:|---|
| 상앙 | 0 | 『법경』 관계는 훨씬 뒤의 논쟁적 전승. 관중과의 연결도 정책 유사성 |
| 페리클레스 | 0 | 『페르시아인들』의 코레고스였으나 제작 후원 관계 |
| 다리우스 1세 | 0 | 비문·궁전은 왕권이 제작한 자기 기록과 건축 |
| 관중 | 0 | 『시경』 영향은 현대적 주제 비교, 『관자』도 복합 문헌 |
| 루이 14세 | 0 | 『밤의 발레』 등은 본인의 공연 참여 |
| 클레오파트라 | 0 | 다언어·도서관 일화는 특정 작품 독서로 좁혀지지 않음 |
| 마리아 테레지아 | 0 | 모차르트 남매의 궁정 연주는 확인되나 작품명 없음 |
| 카를 란트슈타이너 | 0 | 추리소설·피아노라는 장르 취향뿐, 작품명 없음 |
| 제임스 클러크 맥스웰 | 2 | 본인 서문의 Faraday 완독, 시편 암송과 지속적인 성경 연구 |
| 히포크라테스 | 0 | 생애 대부분이 후대 전승, 전집은 본인 감상물이 아닌 복합 저술군 |
| 광개토대왕 | 0 | 사찰 후원과 아들이 세운 비석을 개인 독서로 바꿀 수 없음 |
| 재러드 카플란 | 0 | 이름 없는 SF 장르와 본인 연구·공저 |
| 클로비스 1세 | 0 | 수난 설교 청취 전승은 있으나 특정 복음서 작품으로 식별되지 않음 |
| 프톨레마이오스 1세 | 0 | 도서관 설립·수집은 기관 활동, 원정기는 본인 저술 |
| 피타고라스 | 0 | 정확한 수학 기간과 대장간 일화는 늦은 전승 |
| 사도 요한 | 0 | 문헌 간 영향 추정과 논쟁적인 저자 귀속 |
| 곽자의 | 0 | 원문 자체가 특정 책 기록이 없다고 명시 |
| 아시시의 프란치스코 | 1 | 마태오 복음을 듣고 생활 방식을 바꾼 사실을 교황청 해설로 확인 |
| 카니슈카 | 0 | 불교 결집·학자 후원은 논쟁적 기관 활동, 개인 독서가 아님 |
| 쇼와 천황 | 0 | 과학 논문은 본인 저술, 메이지 천황의 와카는 서비스 식별자 없음 |

### 1차 반영 콘텐츠

| 인물·작품 | 처리 |
|---|---|
| 맥스웰·『전기 실험 연구 1권』 | 기존 레거시 BOOK을 OpenLibrary ISBN `9781108053570` Cambridge 판본으로 교정 |
| 맥스웰·성경 | 기존 `6e5989e2-0cfb-4a4c-8e47-182d0599bfd0` 재사용 |
| 프란치스코·성경 | 기존 `6e5989e2-0cfb-4a4c-8e47-182d0599bfd0` 재사용 |

기존 Faraday 콘텐츠는 금지된 `google_books` ID와 ISBN이 아닌 식별값,
en locale 1행만 가진 상태였다. 이를 OpenLibrary의 Cambridge 2012년 1권으로
교정하고 ko/en verified locale과 실제 표지를 갖췄다. 출처 3개와 표지 URL은
모두 HTTP 200이며 표지는 판본과 일치함을 육안 확인했다.

같은 Faraday 콘텐츠가 러더퍼드에게 연결돼 있었지만 출처에는 러더퍼드의
Faraday 저술 독서가 전혀 나오지 않아 그 1건을 제거했다. 러더퍼드는 다른
정상 콘텐츠 5건과 `full`을 유지한다. Faraday 콘텐츠는 러더퍼드 연결을
맥스웰 연결로 바꿔 실측·저장값 모두 1건이고, 성경은 31건에서 맥스웰과
프란치스코를 더한 실측 33건으로 동기화했다.

맥스웰은 `full/open/2`, 프란치스코는 `full/open/1`로 승격했다. 나머지
18명은 이번 표적 조사로 “없음”을 확정하지 않았으므로 모두 `light/open/0`을
유지한다. 조사 중 발견한 전승·본인 작품·후원 오인은 18명의 ko/en 감상여정에서
교정했다.

## 활성·비정형 작품군 2차 배치

결정론적 순번 21~40번째 20명을 조사했다. 원문에 나타난 교육·후원·건축·
공연·본인 저술과 후대 일화를 작품 소비로 확장하지 않았다. 본인의 직접
발언 또는 기관 연표로 작품 단위 관계를 확인한 것은 람 모한 로이 1명·3건이다.

| 인물 | 등록 | 판정 요약 |
|---|---:|---|
| 아틸라 | 0 | 구전·궁정 시가와 후대 서사는 특정 작품 감상 기록이 아님 |
| 호레이쇼 넬슨 | 0 | 기도와 기독교 신앙은 성경 전체의 작품 단위 독서 증거가 아님 |
| 네이선 로스차일드 | 0 | 워털루 시세 조작 일화는 로스차일드 아카이브가 반박한 후대 전설 |
| 도요토미 히데요시 | 0 | 다도·노·건축 후원과 본인 명령은 외부 작품 감상이 아님 |
| 테미스토클레스 | 0 | 페리클레스의 일화를 잘못 옮겼고 아낙사고라스 제자설은 연대가 맞지 않음 |
| 투키디데스 | 0 | 헤로도토스 낭송을 듣고 울었다는 후대 일화는 장소·대목·형태가 불명확 |
| 노엄 샤지어 | 0 | 이름 없는 SF 취향과 본인 연구·공저만 확인 |
| 하트셉수트 | 0 | 장제전·부조는 왕권이 발주한 건축과 자기 기념물 |
| 한니발 바르카 | 0 | 그리스어 사용·철학자 강연 일화는 특정 책이나 공연으로 식별되지 않음 |
| 그라쿠스 형제 | 0 | 교육자·수사학의 영향은 확인되나 두 형제의 특정 독서 기록은 없음 |
| 박태준 | 0 | 제철소·교육기관 건설과 경영 행적만 확인 |
| 선덕여왕 | 0 | 천문대·사찰·탑은 국가 건축과 후원, 모란 그림은 후대 일화 |
| 레이 크록 | 0 | 피아노 연주와 짧은 인용문은 본인 공연·비식별 문구 |
| 마르쿠스 아그리파 | 0 | 지도·회고록·건축은 본인 생산물과 국가 사업 |
| 테오도라 | 0 | 무대 경력은 본인 공연이며 니카 반란 연설은 감상 작품이 아님 |
| 이온 스토이카 | 0 | 특정 작품이 없는 교육·연구·창업 행적 |
| 람 모한 로이 | 3 | 우파니샤드 번역 연표와 꾸란 반복 완독·성경 전체 연구라는 본인 발언 확인 |
| 흥선대원군 | 0 | 석파란·석파정·궁궐 중건은 본인 창작·소유·국가 사업 |
| 헤롯 대왕 | 0 | 학자 교류와 건축 후원은 특정 문헌 독서로 좁혀지지 않음 |
| 미트리다테스 6세 | 0 | 다언어 능력·독 연구·왕실 수집은 개별 작품명과 저자가 없음 |

### 2차 반영 콘텐츠

| 인물·작품 | 처리 |
|---|---|
| 람 모한 로이·우파니샤드 | 람모한 도서관 연표의 1816년 케나·이샤 우파니샤드 번역 및 후속 번역·주석 기록 |
| 람 모한 로이·꾸란 | 1830년 연설에 인용된 “꾸란 전체를 거듭 읽었다”는 본인 발언 |
| 람 모한 로이·성경 | 같은 연설의 “성경 전체를 연구했다”는 본인 발언과 이후 성경 수업 참여 기록 |

꾸란의 en locale은 서로 다른 ISBN·저자·출판사가 섞인 데다 금지된
Google Books 출처와 HTTP 표지를 사용하고 있었다. 이를 Penguin 2009년
Tarif Khalidi 번역판 ISBN `9780143105886`과 OpenLibrary 표지로 교정했다.
우파니샤드 en locale도 Oxford 2008년 Patrick Olivelle 번역판 ISBN
`9780199540259`로 통일했다. 두 표지는 HTTP 200과 판본 일치를 육안 확인했다.

람 모한 로이는 `full/open/3`으로 승격했다. 저장 누적값과 실제 연결 수는
성경 34건, 꾸란 17건, 우파니샤드 6건으로 동기화했다. 나머지 19명은
전면 조사 완료가 아니므로 `light/open/0`을 유지한다. 추정·주체 혼동·
후대 일화가 있던 17명의 ko/en 감상여정을 교정했다.

## 활성·비정형 작품군 3차 배치

결정론적 순번 41~60번째 20명을 조사했다. 경전군·저자명·궁정 후원·본인
저술과 양식 영향만 남은 사례를 작품 소비와 분리했다. 특정 작품을 직접
다룬 원문이나 초기 전기 기록과 식별 가능한 메타데이터가 함께 통과한 것은
4명·4건이다.

| 인물 | 등록 | 판정 요약 |
|---|---:|---|
| 위안스카이 | 0 | 전통 경전군과 이름 없는 군사 교재만 확인 |
| 테오도시우스 2세 | 1 | 동시대 교회사가가 성경 암기·토론을 명시 |
| 아키텐의 엘레오노르 | 0 | 트루바두르 후원은 확인되나 특정 작품명 없음 |
| 구처기 | 0 | 도가 경전 전반을 읽었다는 기록뿐 『도덕경』 특정 불가 |
| 전봉준 | 0 | 서당 교육·동학 교리는 확인되나 읽은 경전 제목 없음 |
| 테르툴리아누스 | 1 | 본인 『영혼론』에서 플라톤의 『파이돈』을 직접 지목·논박 |
| 폴리비오스 | 0 | 호메로스 인용은 있으나 투키디데스 수용은 현대 연구의 추론 |
| 빌헬름 9세 | 0 | 본인 시와 구전·안달루시아 영향 가설 |
| 사포 | 0 | 본인 시의 호메로스적 상호텍스트성을 개인 독서로 확장 불가 |
| 샤 루흐 | 0 | 도서관·필사본 제작 후원이며 개인 독서 작품명 없음 |
| 티베리우스 | 0 | 선호 시인 이름만 전하고 개별 작품명은 남지 않음 |
| 다니엘 데 프레이타스 | 0 | 본인 공저 논문과 창업 행적 |
| 량원펑 | 1 | 중국어판 『시장을 풀어낸 수학자』 추천 서문과 본인 답변 확인 |
| 크리스 말라코프스키 | 0 | 본인 기술·창업·교육 후원 행적 |
| 디오게네스 | 0 | 스승과 후대 일화만 있고 이름이 확인되는 텍스트 없음 |
| 코넬리어스 밴더빌트 | 0 | 모라비안 소속·묘지 기부는 확인, 성경·찬송가 독서는 미확인 |
| 니콜로 파가니니 | 1 | 동시대 음악학자 페티스의 초기 전기에 로카텔리 작품 접촉 명시 |
| 라비아 알아다위야 | 0 | 생애·발언이 수세기 뒤 성인전에 의존해 작품 단위 확정 불가 |
| 샘 맥캔들리시 | 0 | 본인 연구·공저 |
| 제노비아 | 0 | 롱기누스와 호메로스·플라톤 독서 이야기는 후대 전승·해석 |

### 3차 반영 콘텐츠

| 인물·작품 | 처리 |
|---|---|
| 테오도시우스 2세·성경 | 기존 `6e5989e2-0cfb-4a4c-8e47-182d0599bfd0` 재사용 |
| 테르툴리아누스·『파이돈』 | 기존 `76043dee-c9e2-4380-b0a4-ebbfcdbdddbe` 재사용·판본 교정 |
| 량원펑·『시장을 풀어낸 수학자』 | 신규 BOOK `22cacbc6-6246-4cae-af97-a284f4b4edaa` |
| 파가니니·로카텔리 『바이올린 예술』 | 신규 MUSIC `6ba641a3-5cbd-4e98-a249-bb187b42a9b0` |

기존 『파이돈』의 KO ISBN `9788930606202`는 실제로 네 대화편 합본이었고
EN locale은 ISBN·출판사가 다른 판본끼리 섞여 있었다. KO는 아카넷 2020년
단행본 ISBN `9788957336762`, EN은 Routledge 2000년 *Plato's Phaedo*
ISBN `9780415225168`로 교정했다. 『시장을 풀어낸 수학자』는 Naver BOOK
KO 판본과 OpenLibrary EN 판본, 로카텔리 음반은 Spotify 60트랙 앨범과
Hyperion 공식 트랙리스트를 대조했다. 다섯 표지는 작품·판본 일치를 육안
확인했다.

최종 출처 4개와 Spotify·Hyperion 메타 원문은 모두 HTTP 200을 반환했다.
네 콘텐츠는 ko/en verified locale, creator, 실제 표지, ko/en 감상경위를
갖춘다. 저장 누적값과 실제 연결 수는 성경 35, 『파이돈』 4, 신규 두 작품
각 1건으로 일치한다.

테오도시우스 2세·테르툴리아누스·량원펑·파가니니는 각각 `full/open/1`로
승격했다. 나머지 16명은 `light/open/0`을 유지하며 `-1` 전환은 없다.
감상여정은 세 현대 기술인의 본인 연구 서술을 제외한 17명을 ko/en 함께
교정했다. 특히 량원펑의 한국어 여정에 잘못 붙어 있던 싼이중공업 창업자
량원겐의 생애를 전부 제거했다.

## 활성·비정형 작품군 4차 배치

결정론적 순번 61~80번째 20명을 조사했다. 스포츠 인물이 15명이라 상대
경기·훈련 영상과 롤 모델 서술이 많았지만 영상의 정식 제목·제작 주체·
서비스 식별자가 없었다. 경기 화면을 보았다는 사실을 임의의 다큐멘터리나
대표 경기 콘텐츠로 바꾸지 않았다.

| 인물 | 등록 | 판정 요약 |
|---|---:|---|
| 송종국 | 0 | 피구 경기 분석은 이름 없는 훈련 영상 |
| 거스 히딩크 | 0 | 서울시향 홍보와 클래식 장르 관심, 특정 작품 없음 |
| 김광현 | 0 | 박찬호 활약 시청은 확인되나 경기·방송 제목 없음 |
| 디에고 시메오네 | 0 | 감독에게 배운 전술·훈련법과 본인의 구호 |
| 황진이 | 0 | 후대 전승과 본인 시조·한시, 경전 제목 특정 불가 |
| 최진철 | 0 | 본인 경기·인터뷰와 코칭 경험 |
| 김우진 | 0 | 메시·호날두 경기 일반 시청, 특정 콘텐츠 없음 |
| 카스파르 다비트 프리드리히 | 0 | 오시안·에다·낭만주의 영향 연구는 직접 독서 기록이 아님 |
| 양용은 | 0 | 팔도·우즈의 이름 없는 훈련 영상과 본인 경기 |
| 미하일 8세 | 0 | 학자·고전 편집 후원과 후대 예언 전승 |
| 이세돌 | 0 | 무협 장르 선호만 확인, 작품·작가명 없음 |
| 미하엘 슈마허 | 0 | 좋아하는 가수 3명만 확인, 곡·음반명 없음 |
| 커티스 프림 | 0 | 본인 음악 교육·연주와 기관 후원 |
| 앤드류 펠드만 | 0 | 본인의 기술 비유와 조직 표어 |
| 요한 크라위프 | 0 | 감독의 전술과 카탈루냐 문화 연대 |
| 유상철 | 0 | 선수·지도자 생애와 본인 발언 |
| 기성용 | 0 | 제라드 경기 일반 시청과 본인 맞대결 |
| 박인비 | 0 | 박세리 경기 장면·기록과 본인 대회, 지원 작품 메타 아님 |
| 황선홍 | 0 | 롤 모델의 경기 일반 관찰과 본인 경기 |
| 고종 | 0 | 집옥재 장서 목록·국가 문물 도입은 개별 완독 기록이 아님 |

프리드리히는 오시안 시와 에다 전승이 회화에 미친 영향이 반복 인용되지만,
이는 양식 연구이며 특정 판본의 직접 독서를 입증하지 않는다. 고종의 집옥재는
『만국공보』를 포함한 근대 지식 장서를 보관했으나 왕실 도서관 소장이 곧
군주의 개별 완독은 아니다. 이세돌은 무협 소설 장르, 슈마허는 티나 터너·
필 콜린스·마이클 잭슨을 좋아했다는 데서 멈추고 임의의 대표작을 붙이지 않았다.

20명 모두 `light/open/0`을 유지하며 `confirmed_empty(-1)`로 닫지 않았다.
작품 소비처럼 적힌 비유·영향·훈련·자기 행적을 제거하거나 증거 성격을
드러내도록 감상여정 20명을 ko/en 함께 교정했다. 원격 적용 후 프로필 상태,
실제 콘텐츠 0건, 한영 감상여정 감사 결함은 모두 0건이다.

## 활성·비정형 작품군 5차 배치

마지막 순번 81~84번째 알 카밀·상관완아·이운재·박세리를 조사했다.

| 인물 | 등록 | 판정 요약 |
|---|---:|---|
| 알 카밀 | 0 | 종교 시가 장르·학자 토론과 프란치스코 회동, 작품명 없음 |
| 상관완아 | 0 | 고전 교육과 본인 시문·궁정 문학 활동 |
| 이운재 | 0 | 본인 경기·인터뷰·해설 경력 |
| 박세리 | 0 | 낸시 로페즈의 이름 없는 경기 영상과 본인·후배 경기 |

네 명 모두 `light/open/0`을 유지했고 `confirmed_empty(-1)`로 닫지 않았다.
감상여정은 장르·교육·자기 행적을 작품처럼 읽지 않도록 ko/en 함께 교정했다.
원격 적용 뒤 프로필 상태·실제 콘텐츠 0건·한영 감상여정 감사 결함은 0건이다.

### 활성 비정형 작품군 누적

- 조사 인물: **84/84명 = 100%**
- 직접 관계와 작품 식별 통과: **7명·10건**
- 실제 등록·승격: **7명·10건**
- 감상여정 교정: **76명**
- 남은 활성 비정형 작품군: **0명**

## 활성·감상여정 없음 4명 전면 조사

이 네 명만은 과거 조사 흔적이나 감상여정을 재사용할 수 없어 도서·영상·게임·
음악·팟캐스트 통합 검색부터 타입별·표기 변형·동명이인 보충 검색까지 처음부터
실행했다.

| 인물 | 등록 | 최종 상태 | 판정 요약 |
|---|---:|---|---|
| 존 허링 | 1 | `full/open/1` | 「포천」 본인 인터뷰에서 가장 좋아한 게임 「SimCity」와 첫 해킹 계기 확인 |
| 알렉스 스파이로 | 2 | `full/open/2` | 릭 루빈 인터뷰에서 「A Few Good Men」·「My Cousin Vinny」 선호와 로스쿨 진학 영향 확인 |
| 얀 르쿤 | 12 | `full/open/12` | 본인 게시물·공식 추천사·기관 인터뷰로 도서 9·영화 1·음반 2 확인 |
| 앤서니 암스트롱 | 0 | `light/confirmed_empty/-1` | 전 유형 검색에서 금융 경력·거래 보도와 동명이인 자료만 반복, 작품 관계 0건 |

### 반영·감사 결과

- 신규 생성: GAME 1, VIDEO 1, BOOK 4, MUSIC 1 = **7종**
- 기존 재사용: VIDEO 2, BOOK 5, MUSIC 1 = **8종**
- 인물 연결: **3명·15건**, full 승격 3명
- 전면 조사 0건 확정: **1명**. 이번 회수 작업에서 최초로 `-1`을 적용했다.
- 신규 7종의 ko/en locale 14행과 재사용 8종 모두 verified·제목·creator·
  실제 표지를 갖추며 감사 결함은 0건이다.
- 건드린 15개 콘텐츠의 `contents.user_count`와 실제 `user_contents` 수는
  모두 일치한다.
- 고유 근거 URL 10개 가운데 9개는 HTTP 200을 반환했다. MIT Press는
  명령행 요청에 403을 반환했지만 일반 웹 열람으로 본문과 얀 르쿤 추천사를
  다시 확인한 봇 차단 응답이다.
- 신규·교정 표지는 전부 내려받아 작품·판본 일치를 육안 확인했다.
- 기존 『Deep Learning』 정본의 한국어 locale에는 ISBN
  `9791169213608`인 별도 도서 『혼자 공부하는 머신러닝+딥러닝』의 정보가
  잘못 붙어 있었다. 이를 제이펍 『심층 학습』 ISBN `9791188621422`와
  실제 표지·저자 3인으로 교정했다. 별도 중복 콘텐츠 병합은 이번 범위에서
  수행하지 않았다.

## 비활성·감상여정 명시 작품 69명 빠른 선별

이 단계는 69명의 작품을 다시 검증하는 작업이 아니다. 현재 인물의 조사
가치만 훑어 다음 작업 큐를 보존했다.

- `queued` **42명**
  - 영향력 35 이상 19명은 현재 작품 단서가 약하거나 후대 유추여도 인물의
    중요성만으로 조사 큐에 남겼다.
  - 영향력 35 미만 23명은 현대 인물이며 추천 목록·인터뷰·기관 프로필에서
    외부 작품 관계가 나올 가능성이 큰 경우다.
- `deferred` **27명**
  - 본인 저술·본인 연구 논문·자기 제작 영화·자기 회사 제품만 보이는 경우
  - 인물 사후 편찬 기록을 생전 감상으로 바꾼 경우
  - 고대 왕족·장수의 일반 교양 교육을 호메로스 독서로 확장한 경우
- 선별 뒤 69명 모두 `light/inactive`, 실제 콘텐츠 0건을 유지한다.
- `confirmed_empty`, 콘텐츠 연결, tier 승격, 감상여정 수정은 모두 0건이다.
- 원격 재감사 결과는 `queued 42 / deferred 27`, 상태 시각 누락 0,
  잘못 채워진 없음 확정 시각 0, 콘텐츠 행 0이다.

이 분류에서 `deferred`는 “없음”이 아니다. 우선순위를 미뤘을 뿐이므로
표시값은 계속 `0`이고, 나중에 외부 단서가 생기면 언제든 `queued`로 되돌린다.

## 비활성·감상여정 비정형 작품 40명 빠른 선별

괄호형 작품명은 없지만 감상여정이 남은 40명도 작품을 새로 추출하지 않고
인물 단위 조사 가치만 선별했다.

- `queued` **24명**
  - 영향력 35 이상 11명은 작품명이 없어도 큐에 보존했다.
  - 나머지 13명은 현대 기업가·작가·연구자 또는 고대 직접 사료 가능성이
    상대적으로 큰 인물이다.
- `deferred` **16명**
  - 자기 연구, 일반 업무 경험, 몽골 구전 문화, 헬레니즘 일반 교양처럼
    개별 작품으로 좁히기 어려운 단서만 있는 인물이다.
- 40명 모두 `light/inactive`, 실제 콘텐츠 0건을 유지한다.
- 원격 재감사 결과는 `queued 24 / deferred 16`, 상태 시각 누락 0,
  잘못 채워진 없음 확정 시각 0, 콘텐츠 행 0이다.

비활성 감상여정 보유군 109명을 합치면 `queued` 66명, `deferred` 43명이다.
어느 쪽도 전면 조사 완료가 아니므로 전원 표시값은 계속 `0`이다.

## 비활성·감상여정 없음 전원 빠른 선별

최초 분류 스냅샷은 186명이었지만 적용 직전 실DB에는 192명이 있었다.
2026-07-29에 다음 비활성 해커 6명이 새로 등록됐기 때문이다.

- 왕둥, 쑨카이량, 빅토르 네틱쇼
- 유리 안드리엔코, 박진혁, 림종혁

과거 스냅샷의 186명만 잘라내지 않고 “현재 비활성 전원”이라는 원칙대로
192명을 함께 선별했다. 운영 화면이 이미 쓰는 우선순위 신호를 그대로
재현했다.

| 신호 | 점수 |
|---|---:|
| 영향력 50 이상 | +3 |
| 영향력 35 이상 | +2 |
| 1850년 이후 자료 풍부 직군 | +2 |
| 세력도 연결 | +1 |

합계 2 이상을 `queued`, 그 아래를 `deferred`로 두었다. 세력도 연결
하나만으로는 큐에 넣지 않아 단순 출연 명단이 조사 우선순위를 독점하지
않는다.

- 대상: **192명**
- `queued`: **87명**
- `deferred`: **105명**
- 새로 합류한 해커 6명은 생년·영향력 신호 없이 세력도만 연결되어 모두
  `deferred`가 됐다. 이는 없음 확정이 아니라 우선순위 보류다.
- 콘텐츠·tier·감상여정·없음 확정 시각 변경은 0건이다.

## 최종 전수 감사

Light 전체의 실제 `user_contents`를 다시 세어 상태와 표시 의미를 대조했다.

| 구분 | `open` | `queued` | `deferred` | `confirmed_empty` |
|---|---:|---:|---:|---:|
| 활성 Light | 167 | 0 | 0 | 1 |
| 비활성 Light | 0 | 153 | 148 | 0 |
| 합계 | 167 | 153 | 148 | 1 |

결함은 모두 0건이다.

- 비활성 0건인데 `open`으로 남은 인물
- 콘텐츠가 있는데 `confirmed_empty(-1)`인 인물
- `queued`·`deferred`인데 콘텐츠가 있거나 상태 시각이 없는 인물
- `queued`·`deferred`인데 없음 확정 시각이 채워진 인물
- 실제 콘텐츠가 있는데 여전히 Light인 인물
- 양수 콘텐츠가 음수 표시로 해석되는 인물

활성 0건군 중 전 콘텐츠 유형 조사를 마친 앤서니 암스트롱 1명만
`confirmed_empty(-1)`다. 기존 양수 Light 감사에서 등록분이 기각된 4명,
명시 작품 후보 검증 후 0건인 86명, 비정형 후보 검증 후 0건인 77명은 모두
`open/0`으로 복구했다.

감상여정은 이미 수행된 조사를 처음부터 반복하지 않기 위한 일회성 레거시
단서로만 사용했다. 최종 표시값과 조사 상태는 감상여정 유무·본문에 의존하지
않으며, 운영 작업대에서도 감상여정 조회·작품명 추출을 제거했다.

비활성 301명은 전부 빠른 선별만 거쳤으므로 `queued`든 `deferred`든 표시값은
계속 `0`이다.

## 원격 반영 상태

- 스키마 마이그레이션, web-bo·web 배포, 기존 양수 Light 감사 완료
- 파일럿·2차·3차·4차·5차·6차·7차로 활성 명시 작품군 125명 전수 처리 완료
- 활성 비정형 작품군 84명 전수 원격 반영·검증 완료
- 활성 무단서 4명 전면 조사 완료: 3명·15건 등록·승격, 1명 `confirmed_empty`
- 활성 0건 168명 중 앤서니 암스트롱 1명만 `light/confirmed_empty/-1`,
  나머지 167명은 `light/open/0`
- 활성 비정형군 누적 7명·10건 등록 및 승격, 나머지 77명은 후보 검증만
  완료한 상태로 `light/open/0`
- 비활성 명시 작품 69명 선별 완료: `queued` 42명, `deferred` 27명
- 비활성 비정형 작품 40명 선별 완료: `queued` 24명, `deferred` 16명
- 비활성 무단서 192명 선별 완료: `queued` 87명, `deferred` 105명
- 비활성 전체 301명: `queued` 153명, `deferred` 148명, `open`·`confirmed_empty` 0명
- 신규·교정 콘텐츠의 locale·출처·감상경위·누적값 감사 결함 0건
- 장부·완료 게이트 도입 뒤 최종 전수 감사 결함 0건. 신규 전면 조사는 장부를
  통해 167명을 차례로 처리한다
