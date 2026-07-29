-- 활성 + 감상여정 명시 작품군 4차 조사에서 확인한 감상여정 오류 8명을 교정한다.
--
-- 콘텐츠 등록 SQL과 분리해서 실행한다. 대상 원문의 ko/en MD5가 2026-07-29
-- 실DB 기준선과 정확히 일치할 때만 수정하며, 한 글자라도 달라졌으면 전부 롤백한다.
--
-- 교정:
--   - 포카혼타스: 확인된 가면극 관람만 남기고 성경·구전문화·단독 관람 추정 제거
--   - 알 킨디: 번역 집단과 직접 번역을 구분하고 확인된 두 그리스계 문헌만 남김
--   - 푸치니: 『아이다』 관람과 밀라노 극장 경험만 남기고 창작 일화 제거
--   - 비베카난다: 그린 1박→3일, 브리태니커 12권→10권 완료·11권째로 교정
--   - 이치로: 『캡틴』 기숙사 일화·『야구술』 감동·Jump 주문 제작 오인을 교정
--   - 안중근: 유묵 문구를 『명심보감』 독서 증거로 본 오인 제거
--   - 조토: 예배당 도상 프로그램의 문헌 출처를 개인 독서로 단정한 오인 제거
--   - 이상화: 보들레르 비교 연구를 직접 독서 기록으로 확대한 오인 제거

BEGIN;

DO $$
DECLARE
  affected integer;
  wrong_count integer;
BEGIN
  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
포카혼타스는 1616년 영국에 건너갔다. 버지니아 백과사전의 연표는 이듬해 1월 6일 포카혼타스가 화이트홀에서 벤 존슨의 가면극 「환희의 비전」을 관람했다고 기록한다.

당대 인물 존 체임벌린의 편지에는 포카혼타스와 동행인이 공연에서 눈에 띄는 자리에 앉았다는 내용이 남아 있다. 포카혼타스가 혼자 앉았거나 남편 존 롤프와 떨어져 공연을 보았다는 기존 설명은 이 기록에서 확인되지 않는다.

공연을 본 포카혼타스가 무엇을 느꼈는지도 자료에는 남아 있지 않다. 숲의 구전 서사와 궁정 예술을 비교했다는 해석은 제거하고, 특정 작품을 실제로 관람했다는 사실만 기록한다.

이번 조사에서는 포카혼타스가 성경을 읽었다거나 포우하탄의 특정 서사를 감상했다는 근거를 확보하지 못했다. DB에는 「환희의 비전」을 수록한 벤 존슨의 가면극 전집을 가장 가까운 판본으로 연결했다.
$ko$),
      consumption_philosophy_en = btrim($en$
Pocahontas traveled to England in 1616. Encyclopedia Virginia records that on January 6 of the following year she attended Ben Jonson's masque *The Vision of Delight* at Whitehall.

A contemporary letter by John Chamberlain says that Pocahontas and her companion were prominently seated at the performance. It does not support the former account that she sat alone or attended without her husband, John Rolfe.

No source used in this audit records what Pocahontas thought or felt while watching the masque. The comparison between Powhatan oral tradition and English court art was therefore removed, leaving the documented act of attending a named performance.

This audit also found no firm evidence that Pocahontas read the Bible or engaged with a particular Powhatan narrative. The database links *Ben Jonson: The Complete Masques* as the nearest eligible edition containing *The Vision of Delight*.
$en$)
  WHERE id = '60b59a7f-94de-4eb7-9264-52d6712d363b'::uuid
    AND slug = 'pocahontas'
    AND md5(cultural_journey) = 'b974a69c0643e6e5ec48453f0c069e37'
    AND md5(cultural_journey_en) = '5b3efdbca50810b21e178f45cd71b8f2';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '포카혼타스 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
알 킨디는 9세기 바그다드에서 그리스어 저작을 아랍어로 옮긴 번역가 집단을 이끌었다. 스탠퍼드 철학백과는 아리스토텔레스 『형이상학』의 가장 이른 아랍어 번역이 알 킨디를 위해 만들어졌으며, 그 번역이 현존한다고 설명한다.

알 킨디가 모든 문헌을 직접 번역한 것은 아니다. 알려지지 않은 번역가 우스타스가 『형이상학』을 옮겼고, 알 킨디는 번역 집단을 이끌며 문헌을 검토하고 자기 철학에 사용했다. 그의 『제1철학에 관하여』는 아리스토텔레스의 형이상학을 그대로 반복하지 않고 신과 진리의 문제로 다시 구성한다.

플로티노스 저작 일부를 바탕으로 한 『아리스토텔레스의 신학』도 이 집단에서 번역·개작됐으며, 전승문은 알 킨디가 교정자였다고 밝힌다. 다만 이번에는 해당 고대 아랍어 저작과 정확히 일치하는 적격 판본을 찾지 못해 DB 콘텐츠로 등록하지 않았다.

알 킨디 자신의 저작은 감상 콘텐츠에서 제외한다. 이번 조사에서 외부 작품과의 직접 접촉이 판본까지 확인된 항목은 아리스토텔레스의 『형이상학』이다.
$ko$),
      consumption_philosophy_en = btrim($en$
Al-Kindi led a circle of translators who rendered Greek works into Arabic in ninth-century Baghdad. The Stanford Encyclopedia of Philosophy states that the earliest Arabic translation of Aristotle's *Metaphysics* was made for al-Kindi and survives.

Al-Kindi did not personally translate every text associated with the circle. An otherwise unknown translator named Ustath produced the *Metaphysics* translation, while al-Kindi directed the group, examined its texts, and used them in his own philosophy. His *On First Philosophy* does not merely repeat Aristotle; it recasts metaphysical inquiry around God and truth.

The circle also translated and adapted parts of Plotinus under the title *The Theology of Aristotle*, whose incipit identifies al-Kindi as reviser. This audit did not find an eligible edition matching that ancient Arabic work closely enough for database registration.

Al-Kindi's own writings are excluded from his consumed content. Aristotle's *Metaphysics* is the external work for which both direct engagement and an eligible edition were secured in this batch.
$en$)
  WHERE id = '2ffe22f7-9a30-4f76-a4a5-1e0e592ae6f4'::uuid
    AND slug = 'al-kindi'
    AND md5(cultural_journey) = 'fce07d989d102857427edcc84aa401f5'
    AND md5(cultural_journey_en) = '28b668c81c18f94413169fa017a938e1';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '알 킨디 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
자코모 푸치니는 1876년 피사에서 베르디의 오페라 「아이다」를 보았다. 이탈리아 인명사전은 푸치니가 밀라노로 유학하기 전 루카에서 몇 편의 오페라를 보고 피사에서 「아이다」를 관람했다고 기록한다.

푸치니가 밀라노 음악원에서 얻은 가장 중요한 경험은 작곡 훈련만이 아니었다. 그는 여러 극장을 다니며 최신 외국 작품까지 보았고, 관객의 자리에서 오페라가 무엇인지 배웠다.

같은 자료는 푸치니가 동료 피에트로 마스카니와 바그너의 「파르지팔」 악보를 함께 샀고, 훗날 바이로이트에서 「파르지팔」을 관람했다고 전한다. 그러나 기존 감상여정에 있던 「트리스탄과 이졸데」의 밤샘 피아노 편곡은 확인되지 않는다.

일본 민요 음반을 분석했다거나 중국 오르골에서 「모리화」를 직접 채보했다는 설명도 이번에 확인한 자료보다 앞서 나간다. 이 대목들은 제거하고, 작품명과 관람 기록이 분명한 「아이다」를 DB에 연결했다.
$ko$),
      consumption_philosophy_en = btrim($en$
Giacomo Puccini saw Verdi's *Aida* in Pisa in 1876. The *Dizionario Biografico degli Italiani* records that before studying in Milan he had seen a few operas in Lucca and attended *Aida* in Pisa.

Puccini's most important experience at the Milan Conservatory was not technical training alone. He regularly attended several theaters, encountered recent foreign works, and learned what opera was from a spectator's seat.

The same biography says that Puccini and his fellow student Pietro Mascagni bought a score of Wagner's *Parsifal*, and that Puccini later attended *Parsifal* at Bayreuth. It does not support the former story that he spent nights making a piano transcription of *Tristan und Isolde*.

The claims that he analyzed recordings of Japanese folk music or personally transcribed “Mòlìhuā” from a music box also go beyond the material verified here. They have been removed, and *Aida*, whose title and attendance record are explicit, is linked in the database.
$en$)
  WHERE id = 'b713216d-d931-47e1-819b-051bf8f92773'::uuid
    AND slug = 'giacomo-puccini'
    AND md5(cultural_journey) = 'ea741265363854cd7f7f6c2a9cd0fba1'
    AND md5(cultural_journey_en) = 'dc3da0844f323753c28c90b1d5ed696e';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '자코모 푸치니 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
비베카난다는 젊은 시절 역사와 문학을 폭넓게 읽었다. 라마크리슈나·비베카난다 전기는 대학 시절의 나렌드라나트가 서양 철학과 유럽사를 공부했고, J. R. 그린의 『영국민의 역사』를 사흘 만에 소화했다고 기록한다.

기존 감상여정의 ‘하룻밤’은 이 자료보다 과장된 표현이다. 전기에는 그가 시험 전날 밤을 새워 공부하곤 했다는 별도 설명이 있지만, 그린의 책을 읽는 데 걸린 시간은 사흘로 적혀 있다.

말년에는 새로 나온 『브리태니커 백과사전』 25권을 읽었다. 제자들이 쓴 전기에 따르면 그는 열 권을 끝내고 열한 번째 권을 읽고 있었다. 제자가 이미 읽은 열 권에서 질문을 고르자 내용을 답하고 여러 대목을 거의 그대로 되풀이했다.

따라서 열두 권을 모두 읽었다는 기존 설명은 삭제한다. 그린의 역사서와 『브리태니커 백과사전』은 읽은 범위와 확인 경위가 모두 분명해 DB에 연결했다.
$ko$),
      consumption_philosophy_en = btrim($en$
Vivekananda read widely in history and literature as a young man. His Ramakrishna-Vivekananda biography records that, while still Narendranath, he studied Western philosophy and European history in college and assimilated J. R. Green's *History of the English People* in three days.

The former claim that he finished the work in one night was an exaggeration. The biography separately says that he sometimes studied through the night before examinations, but it gives three days as the time required for Green's history.

Late in life he began reading a newly published twenty-five-volume *Encyclopaedia Britannica*. According to the biography written by his disciples, he had completed ten volumes and was reading the eleventh. When a disciple chose questions from the ten completed volumes, Vivekananda answered them and reproduced passages with striking accuracy.

The previous statement that he completed twelve volumes has therefore been removed. Green's history and the *Encyclopaedia Britannica* are both linked in the database because the works, the extent of his reading, and the circumstances are documented.
$en$)
  WHERE id = 'e4f57a9e-a5c5-4303-b26d-390a10397c15'::uuid
    AND slug = 'vivekananda'
    AND md5(cultural_journey) = '9391c7b431d72b8e0fb3d2b5d6f0e78d'
    AND md5(cultural_journey_en) = '28575e8c76d6353bde888b89de04ebf2';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '비베카난다 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
이치로가 야구 만화 『캡틴』을 좋아했다는 증언은 남아 있다. 팀 동료였던 다구치 소는 이치로가 이 작품을 좋아하는 것으로 유명했고, 주인공 다니구치가 남몰래 연습하는 장면을 좋아한다고 자신에게 말했다고 회상했다. 다만 이치로가 오릭스 기숙사에 책을 들고 갔다는 기존 설명은 확인되지 않는다.

문예춘추의 일본어판 소개는 이치로가 메이저리그 도전 전 조지 F. 윌의 『Men at Work』를 “언젠가 반드시 도움이 될 야구서”라고 평가했다고 전한다. 감명받았다고 넓혀 쓰지 않고, 이치로가 남긴 실용적 평가만 기록한다.

음악 선택에는 본인의 설명이 더 구체적으로 남아 있다. 이치로는 2007년 홍백가합전에서 이시카와 사유리의 무대를 본 뒤 직접 공연 표를 사서 콘서트에 갔다. 공연 뒤 「아마기고에」를 타석 등장곡으로 쓰고 싶다고 요청했고, 2008년 실제로 사용했다.

2009년에는 첫 타석에 플로 라이다의 「In the Ayer」, 세 번째 타석에 「Jump」를 썼다. 플로 라이다가 이 소식을 듣고 이치로 특별판을 먼저 제안해 녹음했다. 이치로가 특별판 제작을 주문했다는 기존 설명은 순서를 거꾸로 옮긴 것이어서 바로잡았다.
$ko$),
      consumption_philosophy_en = btrim($en$
Testimony survives that Ichiro liked Akio Chiba's baseball manga *Captain*. His former teammate So Taguchi recalled that Ichiro was well known for liking the series and had told him that he admired the scene in which Taniguchi practices out of sight. The former story that Ichiro carried the manga into the Orix dormitory was not verified.

The publisher's page for the Japanese edition of George F. Will's *Men at Work* says that before moving to Major League Baseball, Ichiro described it as a baseball book that would certainly prove useful someday. The revised account keeps that practical assessment rather than claiming that he was deeply moved.

Ichiro's music choices are documented more directly. After seeing Sayuri Ishikawa on the 2007 *Kōhaku Uta Gassen*, he bought a ticket to her concert. He then asked to use “Amagi-goe” as his walk-up music and did so in 2008.

In 2009, he used Flo Rida's “In the Ayer” for his first plate appearance and “Jump” for his third. After learning this, Flo Rida proposed and recorded a special version for Ichiro. The former claim that Ichiro commissioned the recording reversed the documented sequence and has been corrected.
$en$)
  WHERE id = 'ef589d79-4ae5-4fee-bdba-baf76130189c'::uuid
    AND slug = 'ichiro-suzuki'
    AND md5(cultural_journey) = 'da89dd85dd8a1cc78f6b9669d4b005d6'
    AND md5(cultural_journey_en) = 'd3767cedd5117db7617e24399a970664';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '스즈키 이치로 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
안중근은 뤼순 감옥에서 여러 유묵을 남겼다. 국가유산청은 1910년 3월에 쓴 「일일부독서 구중생형극」을 보물로 지정하고, 그 문구를 “하루라도 글을 읽지 않으면 입안에 가시가 돋는다”는 뜻으로 풀이한다.

그러나 국가유산청 설명은 이 문구가 『명심보감』에서 나왔다고 밝히지 않는다. 이 말은 오래된 격언으로 여러 인물과 문헌에 연결되어 전해져, 유묵만으로 안중근이 『명심보감』을 읽었다고 판단할 수 없다.

안중근은 사형을 앞두고 자서전 『안응칠역사』와 미완의 『동양평화론』을 직접 썼다. 두 저작은 그의 사상을 보여 주는 중요한 자료지만 본인이 만든 작품이므로 감상 콘텐츠에서는 제외한다.

사서삼경, 성경, 만주의 국제정세 문헌을 특정 독서 목록처럼 묶은 기존 설명도 이번 조사에서 판본과 직접 기록을 확인하지 못했다. 확인된 유묵의 뜻은 남기되, 특정 책의 독서 증거로 확대하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
An Jung-geun produced numerous calligraphic works while imprisoned in Lüshun. Korea's Cultural Heritage Administration lists his March 1910 calligraphy *Ilil budokseo gujung saenghyeonggeuk* as a national treasure and explains the phrase as meaning that if one does not read for a day, thorns grow in one's mouth.

The heritage entry does not identify the phrase as a quotation from *Myeongsimbogam*. The maxim has circulated in association with several figures and texts, so the calligraphy alone cannot establish that An read that particular book.

Before his execution, An wrote his autobiography *The History of An Eung-chil* and the unfinished *A Treatise on Peace in the East*. They are crucial evidence for his thought, but they are his own works and therefore are excluded from consumed content.

The former account also grouped the Confucian classics, the Bible, and international-affairs texts from Manchuria into a reading list without edition-level or direct documentation secured in this audit. The meaning of the verified calligraphy remains, but it is no longer expanded into evidence for a named book.
$en$)
  WHERE id = 'b4390552-d9df-4b47-a0c9-51bf1f810c2f'::uuid
    AND slug = 'an-jung-geun'
    AND md5(cultural_journey) = '9c48d0fb68c0ffbc8bbe6006d4283823'
    AND md5(cultural_journey_en) = '3801b650979753ebbdf2bf2630807768';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '안중근 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
조토 디 본도네가 파도바의 스크로베니 예배당에 그린 벽화는 성모와 그리스도의 생애를 여러 장면으로 펼친다. 인물의 자세와 표정, 공간을 다루는 방식은 조토 회화의 중요한 특징이다.

예배당 보존 사업 자료는 이 도상 프로그램이 성경뿐 아니라 위경과 야코부스 데 보라지네의 『황금전설』 등 여러 문헌을 바탕으로 했다고 설명한다. 동시에 전체 프로그램을 설계한 신학 고문이 따로 있었을 가능성도 제시한다.

따라서 『황금전설』이 예배당 벽화의 문헌적 출처라는 사실과 조토가 그 책을 직접 읽었다는 주장은 구분해야 한다. 이번에 확인한 자료만으로는 조토 개인의 독서를 입증할 수 없다.

기존 감상여정은 텍스트를 읽은 조토가 심리적 깊이를 더했다고 서술했지만, 이는 작품 해석을 개인 독서 기록으로 바꾼 것이다. 벽화의 미술사적 의미는 남기되 『황금전설』은 감상 콘텐츠로 등록하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Giotto di Bondone's frescoes in Padua's Scrovegni Chapel unfold the lives of the Virgin and Christ across a sequence of scenes. The treatment of posture, expression, and space is central to the significance of Giotto's painting.

Material from the chapel's conservation project explains that the iconographic program drew on several written sources, including scripture, apocryphal texts, and Jacobus de Voragine's *Golden Legend*. It also allows for the possibility that an unidentified theological adviser designed the overall program.

The fact that *The Golden Legend* served as a source for the chapel must therefore be separated from the claim that Giotto personally read it. The evidence reviewed here does not establish his individual reading.

The former journey turned an interpretation of the frescoes into a personal reading record by saying that Giotto read the text and added psychological depth. The art-historical significance of the frescoes remains, but *The Golden Legend* is not registered as his consumed content.
$en$)
  WHERE id = 'e87c1a55-a21a-4f59-b6ce-dade33298a30'::uuid
    AND slug = 'giotto-di-bondone'
    AND md5(cultural_journey) = '291c88e41ec93e69a6e379d0b5124301'
    AND md5(cultural_journey_en) = 'f321009335c98549e058fe499ad32f45';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '조토 디 본도네 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
이상화의 초기 시는 보들레르와 함께 비교되어 왔다. 국내 비교문학 연구는 「나의 침실로」를 비롯한 초기 작품의 죽음과 관능, 상징적 이미지가 보들레르 시와 가깝다고 분석한다.

그러나 작품 사이의 유사성과 영향 관계를 논하는 연구가 곧 이상화의 독서 기록은 아니다. 이번에 확인한 논문은 이상화가 도쿄 외국어학교에서 『악의 꽃』을 직접 읽었다거나 특정 판본을 소장했다고 기록하지 않는다.

관동대지진 뒤의 변화와 카프 활동, 「빼앗긴 들에도 봄은 오는가」의 발표는 이상화의 생애와 작품 세계를 설명할 수 있다. 다만 그 사실만으로 보들레르 독서의 시기와 경로를 확정할 수는 없다.

이상화 자신의 시는 감상 콘텐츠에서 제외한다. 『악의 꽃』은 비교 연구의 대상이라는 사실만 남기고, 직접 읽었다는 자료가 발견될 때까지 DB 콘텐츠로 등록하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Yi Sang-hwa's early poetry has often been compared with Baudelaire. Korean comparative-literature scholarship analyzes the death, sensuality, and symbolic imagery of poems such as “Into My Chamber” alongside Baudelaire's verse.

A scholarly argument about resemblance or influence is not, however, a reading record. The paper reviewed in this audit does not document Yi reading *Les Fleurs du mal* at Tokyo University of Foreign Studies or owning a particular edition.

His changes after the Great Kantō Earthquake, his participation in KAPF, and the publication of “Does Spring Come to the Stolen Fields?” help explain his life and work. They do not establish when or how he may have read Baudelaire.

Yi's own poems are excluded from consumed content. *Les Fleurs du mal* remains a work used in comparative scholarship, but it will not be registered for Yi until direct evidence of his reading is found.
$en$)
  WHERE id = 'd0a8a92f-e310-4f51-aacc-59456fa34ac2'::uuid
    AND slug = 'yi-sang-hwa'
    AND md5(cultural_journey) = 'f6878f7ba8d73b633b87f8593f6e8225'
    AND md5(cultural_journey_en) = 'd38854585fdf2f716fd4eb61237cc3be';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '이상화 감상여정 기준선이 달라졌습니다.';
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.profiles
  WHERE (
      slug = 'pocahontas'
      AND (
        cultural_journey NOT LIKE '%존 체임벌린%'
        OR cultural_journey_en NOT LIKE '%John Chamberlain%'
      )
    )
     OR (
      slug = 'al-kindi'
      AND (
        cultural_journey NOT LIKE '%우스타스%'
        OR cultural_journey_en NOT LIKE '%Ustath%'
      )
    )
     OR (
      slug = 'giacomo-puccini'
      AND (
        cultural_journey NOT LIKE '%1876년 피사%'
        OR cultural_journey_en NOT LIKE '%Pisa in 1876%'
      )
    )
     OR (
      slug = 'vivekananda'
      AND (
        cultural_journey NOT LIKE '%사흘 만에%'
        OR cultural_journey_en NOT LIKE '%in three days%'
      )
    )
     OR (
      slug = 'ichiro-suzuki'
      AND (
        cultural_journey NOT LIKE '%플로 라이다가 이 소식을 듣고%'
        OR cultural_journey_en NOT LIKE '%Flo Rida proposed and recorded%'
      )
    )
     OR (
      slug = 'an-jung-geun'
      AND (
        cultural_journey NOT LIKE '%유묵만으로%'
        OR cultural_journey_en NOT LIKE '%calligraphy alone cannot establish%'
      )
    )
     OR (
      slug = 'giotto-di-bondone'
      AND (
        cultural_journey NOT LIKE '%문헌적 출처%'
        OR cultural_journey_en NOT LIKE '%source for the chapel%'
      )
    )
     OR (
      slug = 'yi-sang-hwa'
      AND (
        cultural_journey NOT LIKE '%비교 연구의 대상%'
        OR cultural_journey_en NOT LIKE '%comparative scholarship%'
      )
    );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '4차 조사 감상여정 교정 문자열 검증 실패 인물=%',
      wrong_count;
  END IF;
END;
$$;

COMMIT;
