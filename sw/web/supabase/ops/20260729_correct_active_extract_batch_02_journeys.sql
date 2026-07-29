-- 활성 + 감상여정 비정형 추출군 21~40번을 조사하며 확인한 감상여정 오류를 교정한다.
--
-- 원칙:
--   - 본인 공연·저술·건축과 국가적 후원을 개인 감상으로 등록하지 않는다.
--   - 후대 전기 일화와 현대 해석은 직접 독서 기록과 구분한다.
--   - 작품명이 없거나 서비스 콘텐츠로 식별할 수 없으면 open/0을 유지한다.
--   - 근거가 통과한 람모한 로이의 우파니샤드·꾸란·성경만 등록 결과를 반영한다.
--
-- 이 파일은 20260729_apply_active_extract_batch_02.sql 다음에 실행한다.

BEGIN;

DO $$
DECLARE
  affected integer;
  wrong_count integer;
BEGIN
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('4258c664-7faa-480e-bc90-d61278a3b313'::uuid, 'f85be407ca8e4b50613b5c8c1667b16a', '6822bdd5d2f30335236d03ffe5610f26', 'light', 0),
      ('d2b9b2d8-5782-4b80-bd34-e7bf24151c3f'::uuid, '34c27bb9b1464a162cc005be4d0505e9', '7add198d012d724e13a1a13f734bc680', 'light', 0),
      ('599a7af6-c4ec-4165-8e4c-b001165b50bd'::uuid, 'b18c91aaea798c0cc6310947871382f5', '8238a33e23fc0f120269d50710b031fe', 'light', 0),
      ('296e45de-0586-44ab-b48e-f3fe052a6b1d'::uuid, '86730aab819aeaf3b5ac34ff0f0f418d', '49c295e045c06acca5421c8f896ab1e6', 'light', 0),
      ('99f417cc-b585-4157-923f-0bcc1ddac079'::uuid, 'ed4c4c5121469534e4707db9ef88b36f', '71cb98dd5ba996b7f8ccd90051b694ab', 'light', 0),
      ('2b98ba7b-6948-45ee-8832-60f49d4ccc27'::uuid, 'e378056afc0809a98bf037b62f88dbe5', '2f80e973ac14c0255cd0fbb1df213004', 'light', 0),
      ('70478a88-146b-4380-95b0-ae269ce3eb88'::uuid, 'eb450a66216410e4b5a36ddcb1c86d10', '7f13dd0c3d511b5372b5891911eb990e', 'light', 0),
      ('0e7d6179-882d-4e30-a0e9-fd6dc62c438d'::uuid, 'edb2970bc4ac9b3c251cf968e3d03da3', '63116f6b21bd52501723f0e10fd0b23e', 'light', 0),
      ('7ac1d450-4422-4c47-a25c-ab88d1affe47'::uuid, 'fa98d7220fdda6ad934370c737a3e1a3', 'b40e2e8fdb1623143d5eda286963be6b', 'light', 0),
      ('b5a4bd00-664d-468e-a2fc-23c53d0422aa'::uuid, 'a4cc94e0b08cb5ec52c3ea9e82117e5e', '5780c9bde6d00fb2ecb13efd70a22d5d', 'light', 0),
      ('9e8d564e-6371-4244-936f-ffb38989cb82'::uuid, '2e0f830faa00f00874434b00983b2d30', '9b17f1f7ce3d5f2bc149ac1079e1b696', 'light', 0),
      ('f8068ca6-0398-46ac-a302-0ba2025d2e07'::uuid, 'e12244fb1ab5342df4f4abbe115ea659', '9f65a33e51d0d35a31b5354138ee5f93', 'light', 0),
      ('73429b1c-5487-48a6-8660-eea1d159e289'::uuid, '27a6fb583e50b0a0d2d0c46f6c053435', 'c1090678bfa3adff3f3814fe94a2e4ca', 'light', 0),
      ('dd4f0e94-52fe-4eb2-81f9-a9b723c27223'::uuid, 'bd92b1001f80febb51febb244bf10a56', '3d459b662ddfc211a9208ab688d7f248', 'full', 3),
      ('bac67dd1-0b4a-4283-9d50-56eeb0716645'::uuid, '3f6c2e261d937850c9eb8fd48eb8a9fe', '6eb6a2989135eb0814ae3756deb4f519', 'light', 0),
      ('846df8bd-20c2-4c3f-8943-611f7ec88e38'::uuid, 'efc111010417c1e394af3b7b49481f93', 'f9a3d8b99608684e8bd64244c97d15f0', 'light', 0),
      ('7f2aaa13-0ef3-414f-b17c-983611f11746'::uuid, '08ab3ae86da094b0cc8f3f251844b336', '0a79b7eb09c59366cd5b1e20293f9617', 'light', 0)
  ) AS expected(id, ko_md5, en_md5, tier, actual_count)
  LEFT JOIN public.profiles p ON p.id = expected.id
  WHERE p.id IS NULL
     OR p.profile_type IS DISTINCT FROM 'CELEB'
     OR p.status IS DISTINCT FROM 'active'
     OR p.celeb_tier IS DISTINCT FROM expected.tier
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR md5(p.cultural_journey) IS DISTINCT FROM expected.ko_md5
     OR md5(p.cultural_journey_en) IS DISTINCT FROM expected.en_md5
     OR (
       SELECT count(*)
       FROM public.user_contents uc
       WHERE uc.user_id = p.id
     ) <> expected.actual_count;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '비정형 2차 감상여정 교정 기준선이 달라졌습니다. 차이 인물=%',
      wrong_count;
  END IF;

  WITH corrections(id, ko, en) AS (
    VALUES
      (
        '4258c664-7faa-480e-bc90-d61278a3b313'::uuid,
        $ko$448년 훈족 궁정을 방문한 프리스쿠스는 아틸라의 연회에서 두 음유시인이 왕의 승리와 무공을 노래했다고 기록했다. 손님들이 흥분하거나 눈물을 흘린 반면 아틸라는 말없이 앉아 있었다는 장면도 그의 목격담에 포함된다.

이 기록은 아틸라가 자신의 업적을 다룬 노래를 직접 들었다는 근거다. 다만 노래의 개별 제목·작자·고정된 작품 형태는 전하지 않는다. 훈족 사회 전체가 문자를 쓰지 않았다거나 아틸라가 민족 서사를 의도적으로 연출했다고 더 나아갈 근거도 부족하다. 작품 식별자가 없으므로 콘텐츠로 등록하지 않는다.$ko$,
        $en$Priscus, who visited the Hunnic court in 448, recorded two bards singing of Attila's victories and martial deeds at a banquet. His eyewitness account also describes guests becoming excited or tearful while Attila sat in silence.

This establishes that Attila heard songs about his own exploits. It does not preserve individual titles, authors, or fixed work forms. Nor is it sufficient to conclude that the whole Hunnic society lacked writing or that Attila consciously staged a national narrative. Without an identifiable work, no content is registered.$en$
      ),
      (
        'd2b9b2d8-5782-4b80-bd34-e7bf24151c3f'::uuid,
        $ko$넬슨은 열두 살에 해군 생활을 시작했고, 실전에서 항해와 지휘를 배웠다. 그러나 긴 항해의 대부분을 해전사와 항해술 교본 독서로 보냈다거나, 나일 해전 전술이 특정 문헌을 읽은 결과라는 기존 설명은 출처가 확인되지 않는다.

트라팔가르 해전 당일 남긴 기도문은 넬슨 본인의 신앙과 결의를 보여주는 자필 기록이다. “영국은 모든 사람이 의무를 다할 것을 기대한다”는 함대 신호도 성경 인용이 아니라 작전을 위한 신호문이다. 기도와 신앙을 성경 전권의 직접 독서로 넓히지 않으며, 이름이 확인되는 감상 작품은 현재 남지 않는다.$ko$,
        $en$Nelson entered naval service at twelve and learned navigation and command through practice. The former claim that he spent most long voyages reading naval histories and manuals, or that his tactics at the Nile resulted from particular texts, is not supported by an identified source.

The prayer he wrote on the day of Trafalgar is his own record of faith and resolve. "England expects that every man will do his duty" was a fleet signal, not a biblical quotation. Prayer and Christian belief should not be expanded into documented reading of the whole Bible. No named consumed work is currently established.$en$
      ),
      (
        '599a7af6-c4ec-4165-8e4c-b001165b50bd'::uuid,
        $ko$네이선 로스차일드가 사업에 몰두했고 방대한 서신망으로 금융 정보를 다룬 것은 분명하다. 하지만 워털루 승전보를 정부보다 먼저 독점한 뒤 시장에 거짓 매도 신호를 보내 큰돈을 벌었다는 이야기는 로스차일드 아카이브가 근거 없는 전설로 정리한 서사다. 반유대주의 선전에 이용된 형태까지 있으므로 사실처럼 반복하지 않는다.

기존 여정의 “책을 읽지 않고 극장에도 가지 않는다”는 인용도 원문 편지와 정확한 문맥을 확보하기 전에는 확정 발언으로 쓰지 않는다. 장부·가격표·편지는 업무 기록이지 서비스의 감상 작품이 아니다. 현재 등록할 콘텐츠는 확인되지 않는다.$ko$,
        $en$Nathan Rothschild's concentration on business and use of a far-reaching correspondence network are well established. The story that he monopolized advance news of Waterloo, deceived the market by selling, and made a vast killing is treated by the Rothschild Archive as an unsupported legend, one that also fed antisemitic propaganda.

The former quotation claiming that he read no books and attended no theater should likewise not be presented as exact without the original letter and context. Ledgers, prices, and business correspondence are not consumed works in the service. No registrable content is currently established.$en$
      ),
      (
        '296e45de-0586-44ab-b48e-f3fe052a6b1d'::uuid,
        $ko$히데요시는 차 문화를 정치와 권위의 장으로 활용했고 센노 리큐와 관계를 맺었다. 기타노 대다회와 황금 다실은 그의 문화정책을 보여주지만, 차 도구와 다회는 현재 서비스의 콘텐츠 타입이 아니다.

노에 대해서는 관객보다 직접 공연한 권력자에 가깝다. 규슈 나고야 체류기에 여러 시테 역할을 익혀 무대에 섰고, 자신의 생애를 다룬 노 제작에도 관여했다. 이름이 확인되더라도 본인 공연·제작물은 감상 콘텐츠에서 제외한다. “글을 배운 적 없는 농민”이라는 단순한 출신 서사나 예술 취향에 관한 심리 해석도 확정 사실처럼 쓰지 않는다.$ko$,
        $en$Hideyoshi used tea culture as a field of politics and authority and maintained a consequential relationship with Sen no Rikyu. The Great Kitano Tea Gathering and golden tea room illuminate his cultural policy, but tea utensils and gatherings are outside the service's content types.

In Noh he was closer to a performer and producer than an audience member. During the Kyushu campaign he learned leading roles and appeared on stage, and he was involved in Noh works about his own life. Even where titles can be recovered, his own performance and production are excluded from consumed content. Simplified claims that he never learned to write, and psychological readings of his taste, should not be stated as settled fact.$en$
      ),
      (
        '99f417cc-b585-4157-923f-0bcc1ddac079'::uuid,
        $ko$플루타르코스는 테미스토클레스가 연회에서 리라를 연주하지 못한다고 인정하면서도 작은 도시를 위대하게 만드는 법은 안다고 말했다는 일화를 전한다. 또한 그의 스승으로 정치적 지혜를 가르친 므네시필로스를 소개한다. 둘 다 특정 작품을 읽은 기록은 아니다.

기존 여정의 아낙사고라스 수학설은 플루타르코스 자신이 연대와 맞지 않는다고 지적한다. 일식 때 망토로 조타수의 눈을 가린 일화의 주인공도 테미스토클레스가 아니라 페리클레스다. 시모니데스와의 대화는 한 시인과의 일화일 뿐 작품 감상은 아니다. 현재 등록 가능한 작품은 없다.$ko$,
        $en$Plutarch reports the anecdote in which Themistocles admitted that he could not play the lyre but knew how to make a small city great. He also presents Mnesiphilus as a teacher of practical political wisdom. Neither account identifies a work Themistocles read.

Plutarch himself notes that the tradition making Themistocles a pupil of Anaxagoras conflicts with chronology. The cloak-and-eclipse anecdote concerns Pericles, not Themistocles. His exchange with the poet Simonides is an anecdote about a person, not the reception of a work. No registrable content remains.$en$
      ),
      (
        '2b98ba7b-6948-45ee-8832-60f49d4ccc27'::uuid,
        $ko$어린 투키디데스가 헤로도토스의 낭독을 듣고 눈물을 흘렸다는 이야기는 고대의 후대 전승에 남아 있지만, 생애 연대와 행사 장소를 둘러싼 문제가 있어 확정된 감상 기록으로 보기 어렵다. 설령 낭독을 들었다고 해도 어떤 대목과 형태였는지 식별되지 않는다.

투키디데스의 역병 서술을 의학적 관찰과 비교하고, 연설문 구조를 수사학이나 비극과 비교할 수는 있다. 그러나 그런 문체 분석이 히포크라테스 문헌이나 특정 비극을 직접 읽었다는 개인 이력은 아니다. 『펠로폰네소스 전쟁사』는 본인 저술이므로 제외하며, 현재 외부 작품을 등록하지 않는다.$ko$,
        $en$The story that a young Thucydides wept on hearing Herodotus recite survives in later ancient tradition, but problems of chronology and venue make it insecure as a biographical consumption record. Even if a recitation occurred, the passage and form are not identified.

Thucydides' plague narrative can be compared with medical observation, and his speeches with rhetoric or tragedy. Such literary analysis does not prove that he personally read a Hippocratic text or a particular play. His *History of the Peloponnesian War* is his own work and is excluded. No external content is registered.$en$
      ),
      (
        '70478a88-146b-4380-95b0-ae269ce3eb88'::uuid,
        $ko$데이르 엘 바하리의 장제전과 푼트 원정 부조는 하트셉수트 왕권이 의뢰한 건축과 기록이다. 몰약나무를 들여오고 원정 장면을 벽에 새긴 일은 통치와 봉헌의 시각 언어를 보여주지만, 왕이 감상한 외부 작품은 아니다.

신성한 탄생 장면과 남성 파라오의 도상도 정통성을 설계한 왕실 이미지 프로그램으로 보아야 한다. “마음이 이끄는 대로 행했다”는 비문을 현대적인 예술가 선언처럼 확대하지 않는다. 본인 기념 건축과 도상은 보유 콘텐츠에서 제외하며, 현재 별도의 감상 작품은 확인되지 않는다.$ko$,
        $en$The mortuary temple at Deir el-Bahari and its Punt reliefs are architecture and records commissioned by Hatshepsut's kingship. Imported myrrh trees and carved expedition scenes reveal a visual language of rule and dedication, not an external work she consumed.

Scenes of divine birth and male pharaonic imagery belong to a royal program of legitimacy. An inscription about following her heart should not be enlarged into a modern artist's declaration. Her own commemorative architecture and imagery are excluded from holdings, and no separate consumed work is established.$en$
      ),
      (
        '0e7d6179-882d-4e30-a0e9-fd6dc62c438d'::uuid,
        $ko$그리스인 소실로스가 한니발과 함께하며 전쟁사를 썼다는 전승과, 한니발이 그리스어를 사용했다는 기록은 그의 헬레니즘 문화 접촉을 보여준다. 그러나 이를 투키디데스·크세노폰·호메로스의 저술을 직접 읽었다는 확정 목록으로 바꿀 근거는 현재 자료에서 확인되지 않는다.

키케로가 전한 포르미오의 강연 일화는 한니발이 장군의 임무에 관한 철학자의 말을 듣고 경험 없는 이론을 비판했다는 이야기다. 작품명이 있는 책이나 공연이 아니며, 칸나이 전술을 특정 그리스 전술서의 독서 결과로 단정할 수도 없다. 현재 등록할 콘텐츠는 없다.$ko$,
        $en$Traditions that the Greek Sosylus accompanied Hannibal and wrote a history of the war, together with evidence that Hannibal used Greek, show contact with Hellenistic culture. They do not establish a reading list of works by Thucydides, Xenophon, and Homer.

Cicero's anecdote about Phormio concerns Hannibal hearing a philosopher lecture on the duties of a general and dismissing theory without experience. It is not a named book or performance, and Cannae cannot be assigned to the reading of a particular Greek tactical manual. No content is registered.$en$
      ),
      (
        '7ac1d450-4422-4c47-a25c-ab88d1affe47'::uuid,
        $ko$그라쿠스 형제는 코르넬리아가 마련한 교육 환경에서 그리스 철학자 블로시우스와 수사학자 디오파네스 같은 인물의 영향을 받았다. 고대 저자들은 형제의 웅변과 교육을 높이 평가하지만, 어떤 책을 직접 읽었는지는 특정하지 않는다.

토지개혁과 민회 연설은 그들이 배운 철학과 수사학을 정치에 사용한 활동이다. “호메로스를 인용해 대중을 설득했다”는 기존 문장도 정확한 구절과 원자료를 갖추지 못했다. 두 사람을 하나의 계정으로 묶은 만큼, 한 사람의 불확실한 독서를 형제 전체의 콘텐츠로 올리지 않는다.$ko$,
        $en$The Gracchi were shaped by the educational environment Cornelia arranged, including figures such as the Greek philosopher Blossius and the rhetorician Diophanes. Ancient authors praise the brothers' education and oratory but do not identify particular books they read.

Land reform and public speeches show the political use of philosophy and rhetoric. The former claim that they persuaded crowds by quoting Homer lacks an exact passage and source. Because the profile combines two people, an uncertain reading by one brother should not become shared content for both.$en$
      ),
      (
        'b5a4bd00-664d-468e-a2fc-23c53d0422aa'::uuid,
        $ko$선덕여왕 치세의 첨성대, 분황사, 황룡사 9층 목탑은 신라 왕실의 건축과 불교 후원을 보여준다. 다만 첨성대의 돌 단수를 왕위 순번과 연결하거나 목탑 각 층에 아홉 나라 이름이 실제로 새겨졌다고 단정하는 해석은 신중해야 한다.

모란 그림에서 향기의 부재를 알아챘다는 이야기도 후대 사서에 전하는 일화다. 그림의 작자와 독립 작품 식별자는 남지 않는다. 당 유학생 파견과 사찰 건립은 제도·후원 활동이지 개인의 경전 독서가 아니므로 콘텐츠로 등록하지 않는다.$ko$,
        $en$Cheomseongdae, Bunhwangsa, and the nine-story pagoda at Hwangnyongsa show royal construction and Buddhist patronage during Seondeok's reign. Interpretations that map the number of stone tiers directly to her regnal number, or claim that the names of nine enemy states were physically inscribed on each story, should be treated cautiously.

The peony painting without fragrance is also a later historical anecdote, with no surviving artist or independent work identifier. Sending students to Tang and building temples are institutional and patronage activities, not records of the queen reading a scripture. No content is registered.$en$
      ),
      (
        '9e8d564e-6371-4244-936f-ffb38989cb82'::uuid,
        $ko$레이 크록은 젊은 시절 피아노를 연주하고 방송국에서 음악 관련 일을 했다. 이는 본인의 공연·직업 활동이며, 재즈의 박자가 훗날 패스트푸드 공정의 리듬으로 옮겨갔다는 설명은 자료가 아니라 비유다.

그가 캘빈 쿨리지의 “Press On” 문구를 중시한 사실은 사업 철학을 보여주지만, 짧은 인용문은 독립된 서비스 콘텐츠로 식별되지 않는다. 파드리스 매각 기사를 보고 구단을 산 일도 기사명과 발행면이 특정되지 않았다. 현재 보유 콘텐츠로 등록할 작품은 없다.$ko$,
        $en$Ray Kroc played piano and worked in music-related roles in his youth. Those are his own performance and employment, while the claim that jazz rhythm later became the tempo of fast-food production is metaphor rather than evidence.

His attachment to Calvin Coolidge's "Press On" statement illuminates a business philosophy, but the short quotation is not an independently identifiable service item. The report that prompted his purchase of the Padres is likewise unnamed. No work is currently registered as consumed content.$en$
      ),
      (
        'f8068ca6-0398-46ac-a302-0ba2025d2e07'::uuid,
        $ko$아그리파는 옥타비아누스와 함께 아폴로니아에 머물렀고, 뒤에는 함대·수도·건축 사업을 이끈 실무가였다. 그러나 “그리스 지리학 전통을 읽어 제국 실측 자료로 바꿨다”거나 악티움의 승리가 그리스 해전사 독서의 결과라는 문장은 확인된 독서 기록이 아니다.

후대 지리학자들이 활용한 지도·주석과 소실된 회고록은 아그리파가 생산한 자료다. 판테온, 수도교, 항만과 같은 시설도 본인이 의뢰하거나 집행한 사업이다. 본인 저술과 건축을 제외하면 현재 이름이 확인되는 외부 감상 작품은 없다.$ko$,
        $en$Agrippa stayed at Apollonia with Octavian and later directed fleets, water systems, and building projects. The claims that he read the Greek geographical tradition and converted it into imperial survey data, or that Actium resulted from reading Greek naval history, are not documented consumption records.

Maps and commentaries used by later geographers, together with his lost memoirs, were materials Agrippa produced. The Pantheon, aqueducts, and harbors were projects he commissioned or executed. Once his own writings and buildings are excluded, no named external work remains.$en$
      ),
      (
        '73429b1c-5487-48a6-8660-eea1d159e289'::uuid,
        $ko$테오도라의 어린 시절과 무대 경력에 관한 가장 자세한 서술은 적대적인 프로코피오스의 기록에 크게 의존하므로, 공연 장르와 나이·심리를 모두 확정 사실처럼 쓰기 어렵다. 무대에 섰다는 관계 자체도 본인 공연이지 감상 콘텐츠가 아니다.

니카 반란 때 도주에 반대한 연설은 프로코피오스가 전한 유명한 장면이다. “자주빛 예복은 훌륭한 수의”라는 문구를 무대 연기의 결과로 해석하는 것은 현대적 서사이지 사료가 아니다. 단성론 계열 기독교 후원도 특정 경전 독서로 좁혀지지 않으므로 등록하지 않는다.$ko$,
        $en$The most detailed account of Theodora's childhood and stage career depends heavily on the hostile Procopius, so genres, ages, and inner motives cannot all be stated as settled fact. Her appearance on stage would in any case be her own performance, not consumed content.

The speech opposing flight during the Nika revolt is a famous scene reported by Procopius. Interpreting "the purple makes a fine shroud" as the product of stage training is a modern narrative, not evidence. Her support for Miaphysite Christianity also does not identify a scripture she read. No content is registered.$en$
      ),
      (
        'dd4f0e94-52fe-4eb2-81f9-a9b723c27223'::uuid,
        $ko$람모한 로이의 직접 독서는 우파니샤드·꾸란·성경에서 작품 단위로 확인된다. 그의 저술 연표에는 1816년 케나·이샤 우파니샤드의 벵골어·영어 번역을 시작으로 여러 우파니샤드의 번역과 주석을 출간한 기록이 남아 있다. 번역은 원문을 직접 다룬 강한 근거이므로 우파니샤드를 연결했다.

1830년 알렉산더 더프의 학교 개교식 기록에서 로이는 자신이 “꾸란 전체를 거듭 읽었고 성경 전체를 연구했다”고 학생들에게 말했다. 다른 종교의 경전을 읽는 일이 곧 개종은 아니므로 직접 읽고 판단하라는 주장이었다. 이 본인 발언으로 꾸란과 성경도 연결했다. DB의 현대 판본은 작품 식별용이며 그가 사용한 역사적 사본과 같다는 뜻은 아니다.$ko$,
        $en$Roy's direct engagement can be established at work level for the Upanishads, the Quran, and the Bible. His works chronology begins with Bengali and English translations of the Kena and Isha Upanishads in 1816 and continues with translations and commentaries on other Upanishads. Translation is strong evidence of direct textual study, so the Upanishads are linked.

At the opening of Alexander Duff's school in 1830, Roy told students that he had read the whole Koran repeatedly and studied the whole Bible. He used his own example to argue that reading another religion's scripture did not itself mean conversion and that they should read and judge. The modern database editions identify the works and are not claimed to be his historical copies.$en$
      ),
      (
        'bac67dd1-0b4a-4283-9d50-56eeb0716645'::uuid,
        $ko$흥선대원군 이하응은 난초 그림으로 독자적인 석파란 화풍을 남겼다. 김정희와의 교유와 평가가 전하지만, 난초 그림은 이하응 본인의 창작물이므로 감상 콘텐츠에서 제외한다.

청나라 억류기에 그린 난초와 석파정, 경복궁 중건 역시 본인 제작·소유·국가 사업의 범주다. 붓질을 “권력 의지”나 정치적 분노의 전환으로 읽는 것은 해석일 뿐 개인 감상 기록이 아니다. 다른 작가의 특정 회화·책·음악을 소비했다는 근거는 현재 여정에서 확인되지 않는다.$ko$,
        $en$Heungseon Daewongun, Yi Ha-eung, developed a distinctive orchid-painting style known as Seokpa-ran. His association with and evaluation by Kim Jeong-hui are part of the tradition, but the orchid paintings are Yi's own creations and are excluded from consumed content.

Orchids painted during detention in Qing China, Seokpajeong, and the reconstruction of Gyeongbokgung likewise belong to his production, ownership, or state projects. Reading brushwork as political will or displaced anger is interpretation, not a consumption record. No specific work by another creator is currently established.$en$
      ),
      (
        '846df8bd-20c2-4c3f-8943-611f7ec88e38'::uuid,
        $ko$다마스쿠스의 니콜라우스는 헤롯의 궁정과 외교에서 중요한 학자·조언자였고, 헤롯과 철학을 논했다는 전승도 있다. 그러나 니콜라우스의 세계사나 아리스토텔레스 저술을 헤롯이 읽었다는 작품 단위 기록은 현재 여정에 없다.

예루살렘 성전, 카이사레아의 극장과 수도교, 마사다의 궁전은 헤롯이 의뢰한 건축이다. 유대 전통과 헬레니즘·로마 양식을 함께 활용한 통치의 흔적이지만 감상 작품은 아니다. 아우구스투스의 돼지와 아들 말장난도 후대 저자가 전한 풍자이지 경전 독서의 증거가 아니므로 콘텐츠로 등록하지 않는다.$ko$,
        $en$Nicolaus of Damascus was an important scholar and adviser in Herod's court and diplomacy, and tradition associates them with philosophical discussion. The current journey, however, gives no work-level evidence that Herod read Nicolaus' history or Aristotle.

The Jerusalem Temple, the theater and aqueduct at Caesarea, and the palaces at Masada were buildings commissioned by Herod. They show a ruler using Jewish, Hellenistic, and Roman forms, not works he consumed. Augustus' pun about Herod's pig and son is a satire transmitted by a later author, not evidence of scriptural reading. No content is registered.$en$
      ),
      (
        '7f2aaa13-0ef3-414f-b17c-983611f11746'::uuid,
        $ko$대 플리니우스는 미트리다테스 6세가 통치권 안의 여러 민족과 통역 없이 말할 수 있었다고 전한다. 정확히 스물두 언어라는 숫자는 고대의 왕권 이미지와 함께 읽어야 하며, 각 언어권의 문학을 읽었다는 작품 목록으로 확장할 수 없다.

독과 해독제에 관한 연구, 소량 복용을 통한 내성 시도, 패전 뒤 폼페이우스가 확보한 약학 자료도 미트리다테스의 실험과 왕실 수집을 보여준다. 그러나 개별 문헌 제목과 저자가 확인되지 않는다. 몸에 적용했다는 해석만으로 콘텐츠를 만들 수 없으므로 열린 0을 유지한다.$ko$,
        $en$Pliny the Elder reports that Mithridates VI could address the many peoples under his rule without interpreters. The precise number of twenty-two languages belongs partly to ancient royal image-making and cannot be expanded into a reading list of each culture's literature.

Research on poisons and antidotes, attempts to build tolerance through small doses, and pharmacological materials seized by Pompey show experiment and royal collection. They do not preserve individual titles and authors. Bodily application alone cannot create a service item, so the profile remains an open zero.$en$
      )
  )
  UPDATE public.profiles p
  SET consumption_philosophy = corrections.ko,
      consumption_philosophy_en = corrections.en
  FROM corrections
  WHERE p.id = corrections.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 17 THEN
    RAISE EXCEPTION
      '비정형 2차 감상여정 교정 행 수가 17이 아닙니다. 실제=%',
      affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('4258c664-7faa-480e-bc90-d61278a3b313'::uuid),
      ('d2b9b2d8-5782-4b80-bd34-e7bf24151c3f'::uuid),
      ('599a7af6-c4ec-4165-8e4c-b001165b50bd'::uuid),
      ('296e45de-0586-44ab-b48e-f3fe052a6b1d'::uuid),
      ('99f417cc-b585-4157-923f-0bcc1ddac079'::uuid),
      ('2b98ba7b-6948-45ee-8832-60f49d4ccc27'::uuid),
      ('70478a88-146b-4380-95b0-ae269ce3eb88'::uuid),
      ('0e7d6179-882d-4e30-a0e9-fd6dc62c438d'::uuid),
      ('7ac1d450-4422-4c47-a25c-ab88d1affe47'::uuid),
      ('b5a4bd00-664d-468e-a2fc-23c53d0422aa'::uuid),
      ('9e8d564e-6371-4244-936f-ffb38989cb82'::uuid),
      ('f8068ca6-0398-46ac-a302-0ba2025d2e07'::uuid),
      ('73429b1c-5487-48a6-8660-eea1d159e289'::uuid),
      ('dd4f0e94-52fe-4eb2-81f9-a9b723c27223'::uuid),
      ('bac67dd1-0b4a-4283-9d50-56eeb0716645'::uuid),
      ('846df8bd-20c2-4c3f-8943-611f7ec88e38'::uuid),
      ('7f2aaa13-0ef3-414f-b17c-983611f11746'::uuid)
  ) AS touched(id)
  JOIN public.profiles p ON p.id = touched.id
  WHERE NULLIF(btrim(p.cultural_journey), '') IS NULL
     OR NULLIF(btrim(p.cultural_journey_en), '') IS NULL
     OR p.content_research_status IS DISTINCT FROM 'open';

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '비정형 2차 교정 후 여정/research 검증 실패 인물=%',
      wrong_count;
  END IF;
END;
$$;

COMMIT;
