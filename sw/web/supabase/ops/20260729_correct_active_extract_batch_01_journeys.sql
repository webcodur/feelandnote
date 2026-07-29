-- 활성 + 감상여정 비정형 추출군 1~20번을 조사하며 확인한 감상여정 오류를 교정한다.
--
-- 원칙:
--   - 본인 저술·공연·비문, 국가적 후원, 후대의 영향 추정을 개인의 감상으로 쓰지 않는다.
--   - 오래 뒤에 기록된 전승은 전승이라고 표시한다.
--   - 작품명이 없거나 서비스 콘텐츠로 식별할 수 없으면 open/0을 유지한다.
--   - 직접 근거가 통과한 맥스웰 2건과 프란치스코 1건만 등록 결과를 여정에 반영한다.
--
-- 이 파일은 20260729_apply_active_extract_batch_01.sql 다음에 실행한다.

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
      ('426cd36a-2194-4a5f-8f62-8492b01c27e3'::uuid, 'dee79b1af64fc539c148271c367fadb5', 'e143480fed7c84f7200cd1f29fe656f5', 'light', 0),
      ('7a07bede-805e-4a57-a434-776bf7274b33'::uuid, 'a074c2d5627d05b97b30b85e877ce7a9', '789c36e2d2a1f6e35a47a2d5bde49cc5', 'light', 0),
      ('c7c58a04-0d7d-480a-8a51-3259847bc76f'::uuid, 'd98a269eda450be42e3aab358f4f2e28', '7ebda0d068e3c3362344507b180ba912', 'light', 0),
      ('fc4f0e90-9789-43b6-9bf6-d000fed75cbf'::uuid, '77ca483a2ca3c155326db3a6db119a9f', '5f33c601b680923e8473ba69f60cf961', 'light', 0),
      ('f7afb86b-6a9b-41f0-b3a4-e70a6ea4b3ab'::uuid, 'd58500a1ca0d26fa721eab21d2e598a6', 'f6f98398f6487fd65dbe389c3e422a13', 'light', 0),
      ('4e554ba5-b10d-49f3-a4a5-1e3f8b6af199'::uuid, '9e4671d28e289bfe2c03bced09a747e3', '1369a84074bd7c9bf5a8b0f1b7b30db4', 'light', 0),
      ('78c35399-1a5f-4332-ae3d-ae2db7f425d9'::uuid, 'cf8a4a89652773dda6d95ea6a7e9766b', '4b89a04dd0b0a920fc39576e70821d60', 'light', 0),
      ('bd767625-b7e2-4512-9f9c-ae180a99aea0'::uuid, 'd555284e38745949ddf95f2b494fe90e', '0f6e44bbc655320366c6aad12021a63b', 'light', 0),
      ('1c561714-3504-4bed-a5fc-a60a711a8094'::uuid, 'ac4b6bbb4e3419dfb1af8d39fe1c2f70', '73add0be8e53e4c4470d0bc0e6ec5be1', 'full', 2),
      ('661a6679-447f-43cf-bcc9-1b2b474921f0'::uuid, '6fe78a02b3a66a12911c16cceeb392e1', 'd03f9f8f3923a49ef6458ba28e70ca69', 'light', 0),
      ('a2d32ac5-ff5b-4737-a137-76af22260cca'::uuid, '75ce0b13cebaa7cd11a0795e5f7545da', '0d7fab6823749b708635a19d906a2c28', 'light', 0),
      ('8225a732-17cc-4c93-b6e9-e86c66394f76'::uuid, '6b7ef4f13479d190c646c6057dfeeb25', '00ad68afa283ae1d79ae4a1474ffa379', 'light', 0),
      ('1f0fb8ea-f698-4086-ba6d-fc13e954bebe'::uuid, 'e43580bbd7db6d9f75752a43619871b9', '525b352a2b2b96dcb1e5ebc9e17c7375', 'light', 0),
      ('34daa6a0-f79c-4b2b-86aa-ffb1e8e69ccb'::uuid, '3af87d24097bd24cc0389c54220204b3', 'e8064a03cc9e1a1afca6d057bfc14ecd', 'light', 0),
      ('bdfad568-cd4a-401c-bb67-9b5ddae0a035'::uuid, '4509502106641ee2e47543e888fdf75b', '81696471cb7516c89404d0142b2af5b1', 'light', 0),
      ('143771ff-5b02-4986-a41e-fb7dc64549ec'::uuid, '3368c8c719b4ca62fa371810c68e0148', '6b007add4918c57576f68b93b3ebb3c4', 'full', 1),
      ('3bf77c2d-f5d7-4b32-a04e-93e928e7bc41'::uuid, 'f734a78478b3c385e56b24875c424e7a', '53310952ad407168f293e5bf11f81c92', 'light', 0),
      ('8b98b191-9f66-484f-8c00-6c8cbd7be2f3'::uuid, 'ad424f8de24569582e2f30fa16bf13d6', '26a3e320d8b1c77977712a851f932446', 'light', 0)
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
      '비정형 1차 감상여정 교정 기준선이 달라졌습니다. 차이 인물=%',
      wrong_count;
  END IF;

  WITH corrections(id, ko, en) AS (
    VALUES
      (
        '426cd36a-2194-4a5f-8f62-8492b01c27e3'::uuid,
        $ko$상앙과 『법경』의 관계는 동시대 기록으로 확인되는 독서 이력이 아니다. 훨씬 뒤에 편찬된 사서에는 이회가 정리한 법전을 상앙이 진나라로 가져갔다는 전승이 나오지만, 『법경』의 성립과 전승 자체를 둘러싼 논쟁도 있다. 따라서 상앙이 이 책을 “깊이 읽었다”고 단정할 수는 없다.

상앙의 변법은 위나라의 제도와 전국시대 여러 나라의 행정 경험 속에서 이해할 수 있다. 관중과의 연결 역시 정책의 유사성을 후대에 비교한 것이지, 상앙이 관중의 특정 저술을 읽었다는 기록은 아니다. 현재 감상여정에서 서비스 콘텐츠로 확정할 수 있는 개인 독서 작품은 남지 않는다.$ko$,
        $en$The connection between Shang Yang and the *Canon of Laws* is not a contemporary reading record. A much later historical tradition says that Shang Yang carried to Qin a law code associated with Li Kui, but the formation and transmission of the *Canon* are themselves disputed. It therefore does not establish that Shang Yang personally read the work, much less that he studied it deeply.

His reforms can be placed within the institutional experiments of Wei and the wider Warring States world. Comparisons with Guan Zhong are retrospective parallels between policies, not evidence that Shang Yang read a particular work by him. The present journey therefore yields no identifiable work of personal consumption.$en$
      ),
      (
        '7a07bede-805e-4a57-a434-776bf7274b33'::uuid,
        $ko$페리클레스와 아낙사고라스의 교류는 고대 전기 전승에서 중요하게 다뤄진다. 그러나 일식 때 망토로 조타수의 눈을 가렸다는 일화는 그의 자연철학적 태도를 보여주는 후대 서술이지, 특정 저술을 읽었다는 기록은 아니다.

확실히 이름을 붙일 수 있는 작품 관계는 감상보다 제작 쪽에 있다. 젊은 페리클레스는 기원전 472년 아이스킬로스의 비극 『페르시아인들』 공연에서 코레고스, 즉 합창단 비용을 맡은 시민 후원자였다. 파르테논 건설과 극장 정책도 공공 문화의 조직과 후원에 해당한다. 작품을 보거나 읽은 개인 기록과는 구분해야 하므로 콘텐츠로 등록하지 않는다.$ko$,
        $en$Ancient biographical tradition gives Anaxagoras an important place in Pericles' intellectual formation. The story in which Pericles covers a helmsman's eyes during an eclipse illustrates a rational attitude in later narrative, but it is not evidence that he read a named work.

The clearest named-work relationship belongs to production rather than consumption. In 472 BCE the young Pericles served as choregos, the citizen sponsor responsible for the chorus, for Aeschylus' *The Persians*. His building program and theater policy likewise concern the organization and patronage of public culture. Because these are not records of personally watching or reading a work, they are not registered as consumed content.$en$
      ),
      (
        'c7c58a04-0d7d-480a-8a51-3259847bc76f'::uuid,
        $ko$다리우스 1세에게서 확실히 확인되는 텍스트와 조형물은 그가 소비한 작품이 아니라 왕권이 제작한 기록이다. 베히스툰 비문은 여러 언어로 반란 진압과 정통성을 서술했고, 수사와 페르세폴리스의 건축·부조는 제국의 질서를 시각화했다.

비문에는 아후라 마즈다, 진실과 거짓의 대립이 반복되지만, 이것을 다리우스 개인의 미적 감상이나 특정 종교 문헌의 독서로 확장할 근거는 없다. 남아 있는 것은 왕이 의뢰하고 공표한 자기 기록과 건축이므로, 현재 여정에서는 별도의 감상 콘텐츠를 확정하지 않는다.$ko$,
        $en$The texts and images securely associated with Darius I are not works he consumed but records produced by royal authority. The Behistun inscription narrates rebellion and legitimacy in several languages, while the architecture and reliefs of Susa and Persepolis visualize imperial order.

The inscription repeatedly invokes Ahura Mazda and opposes truth to the Lie, but this cannot be expanded into a record of Darius' private aesthetic response or his reading of a particular religious text. What survives is commissioned royal writing and architecture, so the current journey does not establish separate consumed content.$en$
      ),
      (
        'fc4f0e90-9789-43b6-9bf6-d000fed75cbf'::uuid,
        $ko$관중의 생애는 포숙아와의 우정, 환공을 보좌한 행정, 제나라의 부국강병 정책을 전하는 일화와 사서에서 주로 드러난다. 오늘날 『관자』로 묶인 글 전체를 관중 자신이 쓰거나 읽었다고 볼 수 없으며, 여러 시대의 층위가 쌓인 문헌으로 다뤄진다.

기존 여정이 『시경』의 농가와 관중의 정책을 연결한 부분도 주제의 유사성을 현대적으로 해석한 것이다. 관중이 그 작품을 읽고 영향을 받았다는 개인 기록은 아니다. 제도적 사상 배경은 설명할 수 있지만, 특정 작품의 감상 이력으로 등록할 근거는 확인되지 않는다.$ko$,
        $en$Guan Zhong's life is known chiefly through accounts of his friendship with Bao Shu, his service to Duke Huan, and the administrative policies of Qi. The whole collection now called the *Guanzi* cannot be treated as a book authored or read by Guan Zhong himself; it contains layers from different periods.

The former journey also connected the farming odes of the *Book of Songs* to Guan Zhong's policies by thematic resemblance. That is a modern interpretation, not a personal record that he read and was influenced by the work. His intellectual setting can be described, but no particular consumed work is established.$en$
      ),
      (
        'f7afb86b-6a9b-41f0-b3a4-e70a6ea4b3ab'::uuid,
        $ko$루이 14세는 음악과 무용 교육을 받았고 젊은 시절 궁정 발레 무대에 직접 섰다. 1653년 『밤의 발레』에서는 떠오르는 태양으로 등장했고, 이듬해 『펠레우스와 테티스의 결혼』에서는 아폴론을 연기했다. 이는 작품 감상이 아니라 본인의 공연 참여이므로 보유 콘텐츠에서 제외한다.

베르사유 건설과 몰리에르·라신·륄리 등 예술가에 대한 후원은 그의 통치에서 예술이 차지한 비중을 보여준다. 다만 후원하거나 제작을 지시한 사실만으로 특정 작품을 읽거나 보았다고 바꿔 쓸 수는 없다. 현재 여정에서 서비스에 식별 가능한 개인 감상 작품은 확인되지 않는다.$ko$,
        $en$Louis XIV was trained in music and dance and appeared personally in court ballets. He represented the rising sun in the 1653 *Ballet de la nuit* and played Apollo in *The Marriage of Peleus and Thetis* the following year. These are records of his own performance, not consumption, and are excluded from his holdings.

Versailles and his patronage of artists such as Molière, Racine, and Lully show how central art was to his rule. Patronage or commissioning, however, cannot by itself be rewritten as proof that he read or watched a particular work. The current journey establishes no service-identifiable work of personal consumption.$en$
      ),
      (
        '4e554ba5-b10d-49f3-a4a5-1e3f8b6af199'::uuid,
        $ko$클레오파트라가 여러 언어를 구사했고 프톨레마이오스 왕가에서 드물게 이집트어를 배웠다는 고대 기록은 그녀의 정치적 역량을 보여준다. 그러나 정확히 아홉 개 언어의 문헌을 원문으로 읽었다거나 알렉산드리아 무세이온에서 체계적으로 교육받았다는 세부 사항은 확정된 개인 독서 기록이 아니다.

안토니우스가 페르가몬의 두루마리 20만 점을 선물했다는 이야기도 후대 문헌에 전하는 유명한 일화일 뿐, 특정 작품을 클레오파트라가 읽었다는 증거가 되지 않는다. 도서관 후원과 학식에 관한 일반 서술을 작품 단위 감상으로 바꾸지 않으며, 현재 여정에서는 등록할 콘텐츠를 확정하지 않는다.$ko$,
        $en$Ancient accounts present Cleopatra as a ruler who spoke many languages and, unusually within the Ptolemaic house, learned Egyptian. This supports her political and linguistic ability, but it does not securely establish that she read texts in exactly nine languages or followed a documented course of study at the Alexandrian Mouseion.

The famous story that Antony gave her two hundred thousand scrolls from Pergamon is also a later literary anecdote, not evidence that Cleopatra read a particular work. General learning and royal association with libraries must not be converted into work-level consumption, so the current journey yields no confirmed content.$en$
      ),
      (
        '78c35399-1a5f-4332-ae3d-ae2db7f425d9'::uuid,
        $ko$마리아 테레지아는 언어·역사·음악·무용을 포함한 궁정 교육을 받았고, 음악과 극장을 왕실 문화와 정치의 일부로 후원했다. 1762년 모차르트 남매가 황실 가족 앞에서 연주한 사실은 확인되지만, 그 자리에서 연주된 개별 작품명은 현재 근거에서 특정되지 않는다.

공연 뒤의 선물 액수나 “사치는 필요하다”는 문구를 확실한 본인 발언으로 단정하지 않는다. 학교 제도 개혁과 궁정 예술 후원은 중요한 활동이지만 개인의 작품 감상 이력과는 별개다. 따라서 이름과 메타데이터를 갖춘 콘텐츠는 아직 등록하지 않고 조사 상태를 열어 둔다.$ko$,
        $en$Maria Theresa received a court education that included languages, history, music, and dance, and she supported music and theater as parts of dynastic culture and politics. The Mozart siblings did perform before the imperial family in 1762, but the available evidence here does not identify the individual pieces played.

The precise value of later gifts and the phrase "Luxury is necessary" should not be presented as secure personal evidence without a reliable source. School reform and court patronage are significant activities, but they are not records of consuming a particular work. No content with identifiable work-level metadata is therefore registered yet.$en$
      ),
      (
        'bd767625-b7e2-4512-9f9c-ae180a99aea0'::uuid,
        $ko$란트슈타이너의 전기에는 그가 추리소설을 즐겼고 피아노를 연주했다는 사적인 면모가 전해진다. 그러나 현재 확인된 자료는 작가나 작품명을 제시하지 않는다. 장르 취향은 후보를 찾는 단서일 수 있지만, 서비스에 등록할 작품 식별자는 아니다.

추리의 쾌감과 혈액형 발견의 사고방식이 “정확히 닮았다”는 설명도 자료가 아니라 해석이다. 연구실의 고독과 음악 취향은 인물의 생활상을 보여주되, 과학적 성취의 원인으로 단정하지 않는다. 특정 소설이나 음악 작품이 확인될 때까지 콘텐츠 수는 열린 0으로 남긴다.$ko$,
        $en$Biographical accounts describe Landsteiner as a reader of detective fiction and a pianist, but the material presently available does not name an author or work. A genre preference is a lead for further research, not a service-ready content identifier.

The claim that the pleasure of detection exactly mirrored his discovery of blood groups is interpretation rather than evidence. His private reading and music can illuminate his daily life without being made the cause of his science. The count remains an open zero until a particular novel or musical work can be identified.$en$
      ),
      (
        '1c561714-3504-4bed-a5fc-a60a711a8094'::uuid,
        $ko$맥스웰의 감상 이력에서 작품 단위로 확인되는 두 축은 패러데이의 『전기 실험 연구』와 성경이다. 맥스웰은 자신의 『전기와 자기론』 초판 서문에서 전기학 공부를 시작하기 전에 관련 수학 문헌보다 먼저 패러데이의 『전기 실험 연구』를 끝까지 읽기로 결심했다고 썼다. 그는 패러데이의 현상 이해 방식이 수학의 언어로 표현될 수 있음을 깨달았다고 설명했다.

또한 어린 시절 시편 119편 전체를 암송했고, 성인이 된 뒤에도 캐서린과 편지로 성경을 함께 공부했다는 기록이 남아 있다. 막연한 종교적 영향이 아니라 암송과 지속적 읽기가 확인되므로 성경도 연결했다. 현대 DB 판본은 작품 식별용이며 맥스웰이 실제 사용한 역사적 판본과 같다는 뜻은 아니다.$ko$,
        $en$Two work-level strands can be documented in Maxwell's reading: Faraday's *Experimental Researches in Electricity* and the Bible. In the preface to the first edition of his *Treatise on Electricity and Magnetism*, Maxwell wrote that before beginning the study of electricity he resolved to read through Faraday's work before approaching the mathematical literature. He then explained that Faraday's way of conceiving phenomena could be expressed in mathematical language.

Accounts also state that Maxwell memorized the whole of Psalm 119 as a child and continued studying the Bible by correspondence with Katherine as an adult. This supports a Bible link through sustained reading and memorization rather than vague religious influence. The modern database editions serve as identifiers and are not claimed to be the historical copies Maxwell used.$en$
      ),
      (
        '661a6679-447f-43cf-bcc9-1b2b474921f0'::uuid,
        $ko$히포크라테스의 생애는 동시대 기록이 매우 적고, 아버지에게 의술을 배웠다거나 데모크리토스·고르기아스에게 배웠다는 이야기는 뒤늦은 전기 전승에 크게 의존한다. 이를 확정된 독서와 수학 이력으로 서술해서는 안 된다.

오늘날 히포크라테스 전집으로 불리는 의학 문헌도 여러 저자의 글을 모은 집성으로 이해된다. “인생은 짧고 의술은 길다”는 『격언』의 문구는 그 전통을 대표하지만, 본인의 감상 작품이 아니라 그에게 귀속된 의학 저술 쪽이다. 관찰 중심 의학의 상징성은 남기되, 특정 외부 작품의 독서로 등록할 근거는 없다.$ko$,
        $en$Very little contemporary evidence survives for the life of Hippocrates. Stories that he learned medicine from his father or studied with Democritus and Gorgias depend heavily on later biographical tradition and should not be presented as a documented curriculum of reading.

The writings now called the Hippocratic Corpus are understood as a collection by multiple authors. "Life is short, and the art long" comes from the *Aphorisms* associated with that tradition, but it belongs to attributed medical authorship rather than to a work he consumed. The importance of observation can remain part of his legacy, while no external reading is registered.$en$
      ),
      (
        'a2d32ac5-ff5b-4737-a137-76af22260cca'::uuid,
        $ko$광개토대왕 치세의 평양 사찰 건립은 고구려에서 불교 제도가 확장된 흐름을 보여준다. 그러나 왕이 특정 불경을 읽었다는 기록은 아니며, 정복지마다 승려와 유학자를 보냈다는 기존 문장도 개인 감상 근거로 쓸 수 없다.

광개토대왕비는 아들 장수왕이 부왕의 업적을 기리기 위해 세운 왕실 기념물이다. 광개토대왕이 직접 남긴 작품이나 읽은 텍스트로 취급하지 않는다. 불교 후원과 국가적 기록은 그의 문화정책으로 설명하되, 이름이 확인되는 개인 감상 콘텐츠는 현재 여정에서 확정하지 않는다.$ko$,
        $en$The establishment of temples at Pyongyang during Gwanggaeto's reign belongs to the institutional expansion of Buddhism in Goguryeo. It is not a record that the king read a particular scripture, and the former claim that monks and Confucian scholars followed each conquest cannot serve as evidence of personal consumption.

The Gwanggaeto Stele was erected by his son Jangsu to commemorate the previous king's achievements. It should not be treated as a work Gwanggaeto authored or read. Buddhist patronage and royal commemoration remain parts of his cultural policy, but the current journey establishes no named work of personal consumption.$en$
      ),
      (
        '8225a732-17cc-4c93-b6e9-e86c66394f76'::uuid,
        $ko$투르의 그레고리우스가 전한 전승에는 한 주교가 그리스도의 수난을 이야기하자 클로비스가 자신과 프랑크 병사들이 그 자리에 있었다면 원수를 갚았을 것이라고 반응하는 장면이 나온다. 이는 설교로 들은 수난 서사에 대한 반응이지, 클로비스가 특정 복음서 판본을 읽었다는 기록은 아니다.

클로틸드의 권유, 알레만니와의 전투, 랭스의 세례는 그의 개종 서사에서 중요하다. 다만 그가 문맹이었다거나 카이사르의 통치를 텍스트로 본받았다는 단정은 근거가 부족해 제외한다. 들은 서사의 범위를 성경 전체의 개인 독서로 넓히지 않으며, 작품 식별이 좁혀질 때까지 콘텐츠를 등록하지 않는다.$ko$,
        $en$In the tradition reported by Gregory of Tours, a bishop tells the story of Christ's Passion and Clovis responds that he and his Franks would have avenged the wrong had they been present. This is a reaction to a Passion narrative heard in preaching, not a record that Clovis read a particular Gospel or edition.

Clotild's persuasion, the battle against the Alemanni, and baptism at Reims are central to the conversion story. Claims that Clovis was illiterate or textually modeled his rule on Caesar are not secure enough to retain. A heard Passion narrative should not be expanded into personal reading of the whole Bible, so no work is registered until the source can be identified more narrowly.$en$
      ),
      (
        '1f0fb8ea-f698-4086-ba6d-fc13e954bebe'::uuid,
        $ko$프톨레마이오스 1세와 알렉산드리아의 무세이온·도서관은 헬레니즘 왕권이 지식 기관을 조직한 중요한 사례다. 다만 설립 과정에서 프톨레마이오스 1세와 2세의 역할은 자료마다 나뉘며, 입항한 배의 책을 압수해 원본을 보관했다는 유명한 이야기를 1세 개인의 행동으로 확정할 수는 없다.

프톨레마이오스가 알렉산드로스 원정에 관해 쓴 역사는 후대 저자들이 활용했지만 원문은 전하지 않는다. 이것은 본인 저술이므로 감상 콘텐츠에서도 제외된다. 기관 설립과 수집 정책은 남기되, 프톨레마이오스 1세가 개인적으로 읽은 특정 작품은 현재 여정에서 확인되지 않는다.$ko$,
        $en$Ptolemy I's association with the Mouseion and Library of Alexandria is an important case of Hellenistic kingship organizing institutions of knowledge. The surviving evidence, however, divides the formative role between Ptolemy I and II, and the famous practice of taking books from visiting ships cannot securely be assigned as a personal act of Ptolemy I.

Ptolemy wrote an account of Alexander's campaigns that later historians used, but the original is lost. As his own authorship, it is excluded from consumed content. Institutional foundation and collection policy remain part of the journey, while no particular work personally read by Ptolemy I is established.$en$
      ),
      (
        '34daa6a0-f79c-4b2b-86aa-ffb1e8e69ccb'::uuid,
        $ko$피타고라스 본인이 남긴 글은 없고, 그의 생애를 자세히 전하는 전기들은 대부분 수백 년 뒤에 쓰였다. 이집트에서 22년, 바빌론에서 12년을 배웠다는 정확한 기간이나 제자들에게 5년 침묵을 명했다는 이야기는 확정된 학습 기록이 아니라 후대 피타고라스 전승으로 다뤄야 한다.

대장간의 망치 소리에서 음정 비례를 발견했다는 일화도 늦은 전승이며, 이야기 속 실험은 실제 음향 원리와 맞지 않는다. 수와 음악을 결합한 피타고라스 학파의 전통은 중요하지만, 이를 피타고라스 개인이 감상한 특정 작품으로 바꿀 수는 없다. 현재 등록 가능한 작품은 확인되지 않는다.$ko$,
        $en$Pythagoras left no writings, and the detailed biographies of his life were composed mostly centuries later. Exact periods such as twenty-two years in Egypt and twelve in Babylon, or five years of imposed silence for disciples, belong to later Pythagorean tradition rather than a documented record of study.

The story that he discovered musical ratios from hammers in a smithy is also late, and the experiment as described does not accord with actual acoustics. The Pythagorean tradition linking number and music is historically important, but it cannot be converted into a particular work consumed by Pythagoras himself. No registrable work is established.$en$
      ),
      (
        'bdfad568-cd4a-401c-bb67-9b5ddae0a035'::uuid,
        $ko$요한계 문헌에는 창세기와 시편을 떠올리게 하는 표현, 로고스와 빛·어둠의 언어가 나타난다. 그러나 이러한 텍스트 간 유사성만으로 사도 요한 개인이 필론이나 쿰란 문서를 읽었다고 결론 내릴 수는 없다.

요한복음과 요한서신의 저자 문제 자체도 학술적으로 논쟁 중이다. 그 문헌들을 사도 요한의 본인 저술로 단정해 감상 콘텐츠로 넣지 않으며, 작품의 영향 관계를 개인 독서 이력으로 바꾸지도 않는다. 현재 여정은 초기 기독교의 텍스트 전통을 보여주지만, 서비스에 등록할 외부 감상 작품은 확정하지 않는다.$ko$,
        $en$Johannine writings use language that recalls Genesis and the Psalms, including the Logos and contrasts of light and darkness. Textual resemblance alone, however, cannot establish that the Apostle John personally read Philo or the Qumran writings.

The authorship of the Gospel and Johannine epistles is itself a matter of scholarly debate. Those writings should not be treated as certain personal works and then entered as consumed content, nor should literary influence be converted into a biographical reading record. The journey illuminates an early Christian textual tradition but establishes no external work for registration.$en$
      ),
      (
        '143771ff-5b02-4986-a41e-fb7dc64549ec'::uuid,
        $ko$프란치스코의 삶을 바꾼 작품 관계는 복음서에서 가장 분명하게 확인된다. 교황 베네딕토 16세의 해설에 따르면 그는 1208년 미사에서 사도들을 파견하는 마태오 복음의 말씀을 듣고, 가난하게 살며 설교하라는 부름으로 받아들였다. 작품을 들은 행위와 생활의 변화가 함께 확인된다.

이 근거로 마태오 복음서를 포함하는 성경 콘텐츠를 연결했다. 보나벤투라 등 전기 전승은 그가 성경 구절을 기억하고 되새겼다고 전하지만, 서로 다른 구절과 사건을 한 장면처럼 합치지는 않는다. DB의 현대 성경 판본은 작품 식별용이며 그가 들은 전례용 성서와 같다는 뜻은 아니다.$ko$,
        $en$The clearest work-level relationship in Francis' life is with the Gospel. According to Pope Benedict XVI's account, during Mass in 1208 Francis heard Matthew's discourse commissioning the apostles and received it as a call to live in poverty and preach. Both reception of the text and a resulting change in life are explicit.

The existing Bible content, which contains Matthew, is linked on that basis. Biographical traditions including Bonaventure also describe Francis remembering and returning to scriptural passages, but distinct verses and episodes should not be collapsed into a single scene. The modern database Bible is an identifier, not a claim about the liturgical copy he heard.$en$
      ),
      (
        '3bf77c2d-f5d7-4b32-a04e-93e928e7bc41'::uuid,
        $ko$카니슈카와 불교의 관계는 개인 독서보다 왕실 후원과 제국의 문화 환경에서 드러난다. 카슈미르의 불교 결집을 그가 주재했다는 이야기는 불교 전승에서 중요하지만, 회의의 성격과 역사성에는 논쟁이 있다. 이를 카니슈카가 특정 경전을 읽고 해석을 통일했다는 기록으로 바꿀 수는 없다.

아슈바고샤와 나가르주나를 모두 그의 궁정 인물로 확정하거나, 간다라의 불상 제작을 한 군주의 후원만으로 설명하는 것도 지나치게 단순하다. 불교·그리스·이란·인도 문화가 만난 쿠샨 제국의 조건은 남기되, 후원과 전파를 개인 감상으로 등록하지 않는다. 현재 식별 가능한 작품은 확인되지 않는다.$ko$,
        $en$Kanishka's relationship with Buddhism is visible chiefly through royal patronage and the cultural setting of the Kushan Empire, not through a personal reading record. The Buddhist tradition that he convened a council in Kashmir is important, but the event's character and historicity are debated. It cannot establish that Kanishka personally read a named scripture and standardized its interpretation.

It is also too simple to assign both Ashvaghosha and Nagarjuna securely to his court or to explain Gandharan Buddha images through a single ruler's patronage. The Kushan meeting of Buddhist, Greek, Iranian, and Indian cultures remains central, while patronage and transmission are not registered as personal consumption. No identifiable work is established.$en$
      ),
      (
        '8b98b191-9f66-484f-8c00-6c8cbd7be2f3'::uuid,
        $ko$쇼와 천황은 해양생물학 연구를 오래 이어가며 히드로충류 등을 다룬 논문과 도감을 남겼다. 이는 본인의 연구·저술이므로 감상 콘텐츠에서 제외한다. 서재의 다윈 흉상이나 생물학 교육은 관심 분야를 보여주지만, 다윈의 특정 저술을 읽었다는 작품 단위 근거는 아니다.

전쟁을 앞두고 읊었다고 전하는 “사해는 모두 형제라 생각하는데 어찌하여 파도와 바람이 거센가”라는 취지의 와카는 쇼와 천황의 자작시가 아니라 메이지 천황의 시다. 다만 독립된 출판물이나 음원으로 식별되는 작품은 아니어서 등록하지 않는다. 현재 여정에서는 과학 활동과 한 편의 시 인용을 확인했지만 보유 콘텐츠 수는 열린 0으로 남는다.$ko$,
        $en$Emperor Showa pursued marine biology for decades and produced papers and illustrated studies, including work on hydrozoans. These are his own research and authorship and are excluded from consumed content. A bust of Darwin and his biological education indicate an area of interest but do not identify a particular Darwin work he read.

The waka he is reported to have recited before the war, asking why the waves and winds of the four seas were so troubled when all were thought brothers, was a poem by Emperor Meiji, not Showa's own composition. It is not identifiable here as a separately published or recorded service item, so it is not registered. The journey therefore remains an open zero.$en$
      )
  )
  UPDATE public.profiles p
  SET consumption_philosophy = corrections.ko,
      consumption_philosophy_en = corrections.en
  FROM corrections
  WHERE p.id = corrections.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 18 THEN
    RAISE EXCEPTION
      '비정형 1차 감상여정 교정 행 수가 18이 아닙니다. 실제=%',
      affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('426cd36a-2194-4a5f-8f62-8492b01c27e3'::uuid),
      ('7a07bede-805e-4a57-a434-776bf7274b33'::uuid),
      ('c7c58a04-0d7d-480a-8a51-3259847bc76f'::uuid),
      ('fc4f0e90-9789-43b6-9bf6-d000fed75cbf'::uuid),
      ('f7afb86b-6a9b-41f0-b3a4-e70a6ea4b3ab'::uuid),
      ('4e554ba5-b10d-49f3-a4a5-1e3f8b6af199'::uuid),
      ('78c35399-1a5f-4332-ae3d-ae2db7f425d9'::uuid),
      ('bd767625-b7e2-4512-9f9c-ae180a99aea0'::uuid),
      ('1c561714-3504-4bed-a5fc-a60a711a8094'::uuid),
      ('661a6679-447f-43cf-bcc9-1b2b474921f0'::uuid),
      ('a2d32ac5-ff5b-4737-a137-76af22260cca'::uuid),
      ('8225a732-17cc-4c93-b6e9-e86c66394f76'::uuid),
      ('1f0fb8ea-f698-4086-ba6d-fc13e954bebe'::uuid),
      ('34daa6a0-f79c-4b2b-86aa-ffb1e8e69ccb'::uuid),
      ('bdfad568-cd4a-401c-bb67-9b5ddae0a035'::uuid),
      ('143771ff-5b02-4986-a41e-fb7dc64549ec'::uuid),
      ('3bf77c2d-f5d7-4b32-a04e-93e928e7bc41'::uuid),
      ('8b98b191-9f66-484f-8c00-6c8cbd7be2f3'::uuid)
  ) AS touched(id)
  JOIN public.profiles p ON p.id = touched.id
  WHERE NULLIF(btrim(p.cultural_journey), '') IS NULL
     OR NULLIF(btrim(p.cultural_journey_en), '') IS NULL
     OR p.content_research_status IS DISTINCT FROM 'open';

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '비정형 1차 교정 후 여정/research 검증 실패 인물=%',
      wrong_count;
  END IF;
END;
$$;

COMMIT;
