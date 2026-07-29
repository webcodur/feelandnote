-- 활성 + 감상여정 명시 작품군 5차 조사에서 확인한 감상여정 오류 8명을 교정한다.
--
-- 콘텐츠 등록 SQL과 분리해서 실행한다. 대상 원문의 ko/en MD5가 2026-07-29
-- 실DB 기준선과 정확히 일치할 때만 수정하며, 한 글자라도 달라졌으면 전부 롤백한다.
--
-- 교정:
--   - 기욤 람플: ViZDoom 1트랙 우승→두 트랙 2위, 논문 독서 추정 제거
--   - 콜럼버스: 현존 주석본을 첫 항해 전 독서로 단정한 연대 오류 제거
--   - 스키피오: 『키루스의 교육』 일화를 스키피오 아이밀리아누스와 구분
--   - 에피쿠로스: 헤시오도스의 카오스 구절 일화만 남기고 반복 독서 추정 제거
--   - 사이초: 공식 천태종 전기의 『법화경』 강론·보급 기록으로 구체화
--   - 김옥균: 스승들이 연구한 두 신서를 본인의 직접 독서로 확대한 오인 제거
--   - 명성황후: 독서 시기를 어린 시절→왕비 책봉 뒤 별관으로 교정
--   - 아르튀르 멘슈: 본인 공저 연구와 외부 콘텐츠 소비를 구분

BEGIN;

DO $$
DECLARE
  affected integer;
  wrong_count integer;
BEGIN
  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
기욤 람플은 데벤드라 차플롯과 함께 고전 FPS 「Doom」을 연구 환경으로 사용했다. 두 사람이 2016년에 발표한 논문은 ViZDoom에서 화면 픽셀만 보고 이동하고 전투하는 에이전트 Arnold를 설명한다.

기존 감상여정은 Arnold가 2016년 ViZDoom AI Competition 1트랙에서 우승했다고 적었다. 논문에 기록된 결과는 두 트랙 모두 2위다. 화면에서 적을 알아보는 보조 학습과 이동·전투 네트워크를 나눈 구조가 연구의 핵심이었다.

「Attention Is All You Need」와 Chinchilla 연구가 람플의 후속 작업과 기술적으로 이어진다는 사실만으로 그가 해당 논문을 특정 시점에 정독했고 곧바로 설계를 바꿨다고 말할 수는 없다. 이번 조사에서는 그런 개인 독서 기록을 확인하지 못해 인과 서술을 제거했다.

DB에는 직접 사용이 확인된 1993년 원작 「Doom」만 연결한다. 논문은 람플 자신의 저작이므로 감상 콘텐츠로 등록하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Guillaume Lample and Devendra Chaplot used the classic FPS *Doom* as a research environment. Their 2016 paper describes Arnold, an agent trained in ViZDoom to navigate and fight from screen pixels.

The former journey said Arnold won Track 1 of the 2016 ViZDoom AI Competition. The paper reports second place in both tracks. Its central contribution was the combination of auxiliary enemy detection with separate networks for navigation and combat.

The technical relevance of *Attention Is All You Need* and the Chinchilla research to Lample's later work does not by itself establish that he reread either paper at a specific moment and immediately changed a model design. This audit found no personal reading record supporting that causal sequence, so it has been removed.

Only the 1993 *Doom* game, whose direct use is documented, is linked in the database. Lample's own paper is not treated as consumed content.
$en$)
  WHERE id = 'cc1b6ad3-5140-4fbc-9ace-f753cdc9ad71'::uuid
    AND slug = 'guillaume-lample'
    AND md5(cultural_journey) = 'a3ca04a81af05d2f6840a8f4e3acb591'
    AND md5(cultural_journey_en) = '9551f43d298a3d99d7817303422d4959';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '기욤 람플 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
콜럼버스가 직접 주석을 남긴 책들은 세비야의 콜롬비나 도서관에 보존되어 있다. 미겔 데 세르반테스 가상도서관은 1485년판 마르코 폴로 『동방견문록』, 피에르 다이의 『이마고 문디』, 피콜로미니의 역사서 세 권에 모두 2,125개의 여백 주석이 있다고 설명한다.

다만 이 책들이 첫 항해의 설계도가 되었다고 단정할 수는 없다. 같은 자료는 보존된 『동방견문록』 판본의 연대와 주석 상태를 근거로 콜럼버스가 1496년 이후 책들을 샀다는 견해를 소개한다. 『이마고 문디』도 첫 항해 전에 읽었다고 보기 어렵다는 지적이 있다.

따라서 기존 감상여정의 ‘898개 주석’과 첫 항해 전 경제적 동기, 대서양 폭 계산을 한 줄의 확정된 인과로 묶은 설명은 제거한다. 확인되는 것은 콜럼버스가 생애 어느 시점엔가 세 책을 세밀하게 읽고 주석했다는 사실이다.

DB에는 적격 판본이 있는 『동방견문록』을 연결한다. 『이마고 문디』는 직접 관계는 확인됐지만 네이버와 OpenLibrary에서 정확히 대응하는 ISBN 판본을 찾지 못해 보류한다.
$ko$),
      consumption_philosophy_en = btrim($en$
Books bearing Columbus's own annotations survive in Seville's Biblioteca Colombina. The Miguel de Cervantes Virtual Library states that the 1485 Marco Polo, Pierre d'Ailly's *Imago Mundi*, and Piccolomini's history contain 2,125 marginal notes in total.

These surviving volumes cannot simply be treated as blueprints for the first voyage. The same source presents the argument that Columbus acquired and annotated them after 1496, based on the edition dates and the state of the notes. It also questions whether he could have read the surviving *Imago Mundi* before the first voyage.

The former journey therefore no longer turns the figure of 898 notes, an economic motive, and a calculation of the Atlantic's width into one settled pre-voyage causal chain. The evidence establishes close reading and annotation at some point in his life, while the chronology remains disputed.

The database links *The Travels of Marco Polo*, for which an eligible edition exists. *Imago Mundi* passed the relationship check but remains unregistered because no matching Naver or Open Library ISBN edition was found.
$en$)
  WHERE id = '368c8bc0-0e1e-441e-8240-3f957602accc'::uuid
    AND slug = 'christopher-columbus'
    AND md5(cultural_journey) = '2845f5b5f287caee2f38e4cb47d862cc'
    AND md5(cultural_journey_en) = '211471c577440b766d54ef1189660552';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '크리스토퍼 콜럼버스 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
스키피오 아프리카누스는 제2차 포에니 전쟁에서 한니발을 꺾은 기원전 236~183년의 장군이다. 리비우스는 그가 시라쿠사에 머물 때 그리스식 망토와 샌들을 신고 체육관을 거닐며 책과 운동에 시간을 썼다는 비판이 제기됐다고 전한다. 이 기록은 그가 그리스 문화와 문자를 접했다는 정황을 보여 주지만 읽은 책의 제목은 밝히지 않는다.

기존 감상여정의 『키루스의 교육』 일화는 다른 인물의 기록이 섞인 것이다. 키케로가 크세노폰을 늘 손에 들고 있었다고 말한 ‘아프리카누스’는 기원전 185~129년의 스키피오 아이밀리아누스다. 그는 한니발을 꺾은 장군의 양손자로, 현재 프로필의 스키피오 아프리카누스가 아니다.

『키루스의 교육』에서 읽은 계책을 전날 밤 바로 전장에 옮겼다는 설명, 그리스어 회고록과 철학자 후원을 지배 전략으로 해석한 문장도 이번에 확인한 고대 자료로 뒷받침되지 않는다. 인물 혼동과 추정을 제거한다.

현재 확인된 자료만으로는 이 스키피오에게 연결할 수 있는 특정 작품이 없다. 그리스 문화와 가까웠다는 사실은 남기되, 작품 소비 기록으로 확장하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Scipio Africanus, the general who defeated Hannibal in the Second Punic War, lived from about 236 to 183 BCE. Livy reports criticism that while in Syracuse he wore a Greek cloak and sandals, walked in the gymnasium, and devoted time to books and exercise. This indicates engagement with Greek culture but does not name a work he read.

The former journey's story about the *Cyropaedia* belongs to a different man. The “Africanus” whom Cicero says kept Xenophon constantly in hand was Scipio Aemilianus, who lived from 185 to 129 BCE. He was the adopted grandson of the general represented by this profile.

The claims that Scipio copied a stratagem from Cyrus after reading it the previous night, wrote Greek memoirs as a weapon of psychological warfare, and patronized philosophy as an instrument of domination are not supported by the ancient evidence reviewed here. The identity error and these inferences have been removed.

No named external work can currently be linked to this Scipio. His contact with Greek culture remains part of the account, but it is not converted into a specific consumption record.
$en$)
  WHERE id = 'e0965abb-0d3a-4133-9e36-07372e12d699'::uuid
    AND slug = 'scipio-africanus'
    AND md5(cultural_journey) = '65e85e789f8d4b8443165f3bad1053b3'
    AND md5(cultural_journey_en) = '856194f96e5f4f91d0e0090bd410f6fc';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '스키피오 아프리카누스 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
디오게네스 라에르티오스는 에피쿠로스가 열네 살에 철학을 처음 알게 됐다고 전한다. 아폴로도로스의 전기에 따르면 문법 교사들이 헤시오도스의 ‘카오스’ 구절을 설명하지 못하자, 에피쿠로스는 그 답을 찾으려고 철학으로 향했다.

이 일화는 헤시오도스 『신통기』의 특정 대목과 에피쿠로스의 직접 접촉을 보여 준다. 그러나 그가 어린 시절 『신통기』를 매일 밤 읽었다거나, 교사의 실패에 분노해 원자론을 만들었다는 식의 연속된 인과는 자료에 없다.

디오게네스는 또 에피쿠로스가 데모크리토스의 저작을 접한 뒤 철학에 몰두했다는 헤르미포스의 전승을 함께 적는다. 다만 어느 저작인지 제목은 전하지 않는다. 이번 조사에서는 이름이 분명한 『신통기』만 DB에 연결한다.

에피쿠로스의 정원과 저술, 제자들과의 토론은 그의 철학 활동을 보여 주지만 특정 외부 작품의 감상 기록과는 구분한다.
$ko$),
      consumption_philosophy_en = btrim($en$
Diogenes Laertius reports that Epicurus first encountered philosophy at fourteen. According to the biography by Apollodorus, his teachers of literature could not explain the passage about Chaos in Hesiod, and Epicurus turned to philosophy in search of an answer.

The story establishes direct engagement with a passage from Hesiod's *Theogony*. It does not say that Epicurus read the whole poem every night, nor does it support a continuous causal story in which anger at his teachers produced atomism.

Diogenes also preserves Hermippus's report that Epicurus became eager for philosophy after encountering the writings of Democritus, but no title is given. *Theogony* is the only named external work linked in this audit.

Epicurus's Garden, writings, and discussions with disciples belong to his philosophical activity. They are kept separate from evidence that he consumed a particular external work.
$en$)
  WHERE id = '57b1cb45-79bb-4171-ad58-e714a89c6b2f'::uuid
    AND slug = 'epicurus'
    AND md5(cultural_journey) = '2768c716196ef950381565dbf2138a17'
    AND md5(cultural_journey_en) = '994fe4bde0b608de4b3c32403a32b8b7';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '에피쿠로스 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
사이초는 스무 살 무렵 히에이산에 들어가 공부와 수행을 이어갔다. 일본 천태종 공식 전기는 그가 눈과 마음이 맑아질 때까지 세상에 나가지 않겠다는 서원을 세웠다고 기록한다.

사이초는 불교 경전을 모아 798년부터 『법화경』 강론회를 해마다 열었다. 801년에는 나라의 고승 열 명을 초청했고, 이 강론을 통해 그의 학문이 널리 알려졌다. 804년 당나라에 건너간 목적도 일본에 부족한 천태 문헌을 보완하고 중국 천태 승려에게 직접 배우는 데 있었다.

귀국 뒤에도 『법화경』 강론은 계속됐다. 공식 전기는 814년의 강론과 817년의 탑 건립 사업을 기록하며, 각 탑에 『법화경』 천 부를 두고 이를 중심 가르침으로 보급하려 했다고 설명한다.

기존 감상여정은 여러 종파가 모두 사이초의 독법에서 곧바로 나왔다고 단순화했다. 이번에는 확인되는 경전 수집, 강론, 유학, 보급의 흐름을 중심으로 정리하고 『법화경』을 DB에 연결한다.
$ko$),
      consumption_philosophy_en = btrim($en$
Around the age of twenty, Saicho withdrew to Mount Hiei and continued his study and practice. The Tendai denomination's official biography records his vow not to enter the world until his eyes and heart were clear.

Saicho assembled Buddhist scriptures and began holding annual lecture ceremonies on the *Lotus Sutra* in 798. In 801 he invited ten senior monks from Nara, and the lectures made his scholarship widely known. His 804 journey to Tang China was also intended to fill gaps in the Tendai manuscripts available in Japan and study directly with Chinese Tendai teachers.

His Lotus Sutra teaching continued after his return. The official biography records lectures in 814 and a pagoda project in 817 that sought to place one thousand copies in each pagoda and propagate the sutra as a central teaching.

The former journey compressed the later emergence of several Japanese schools into a direct product of Saicho's personal reading method. The revised account stays with the documented sequence of collecting, teaching, studying abroad, and disseminating the sutra, which is linked in the database.
$en$)
  WHERE id = 'e8b01b85-b1fa-4bbf-ab67-a91f16051a20'::uuid
    AND slug = 'saicho'
    AND md5(cultural_journey) = '44a394710841ab856fbf50e4d54ca7a9'
    AND md5(cultural_journey_en) = '88b185e57cb198113533439c6f54d150';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '사이초 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
김옥균은 북촌의 양반 자제들과 교유하면서 개화 사상을 접했다. 국사편찬위원회 우리역사넷은 오경석과 유홍기가 이들에게 큰 영향을 미쳤다고 설명한다. 그중 유홍기는 『해국도지』와 『영환지략』 같은 신서를 연구한 인물이었다.

이 자료는 두 책을 연구한 주체를 유홍기로 적는다. 김옥균이 박규수의 사랑방에서 두 책을 직접 읽었다거나, 그 자리에서 처음 세계를 알게 됐다고 기록하지 않는다. 기존 감상여정은 사상적 영향 관계를 김옥균 개인의 독서 장면으로 바꿔 썼으므로 해당 문장을 제거한다.

박영효의 회고에 따르면 김옥균과 동료들은 박규수의 사랑방에서 평등사상을 배웠다. 김옥균은 1881년 일본을 방문해 후쿠자와 유키치의 주선으로 여러 인사를 만났고 일본의 제도를 살폈다. 다만 후쿠자와의 집에서 네 달을 살며 특정 책을 읽었다는 기존 설명은 이번 자료에서 확인되지 않는다.

『갑신일록』은 김옥균 자신의 저작이므로 감상 콘텐츠에서 제외한다. 이번 표적 조사에서는 김옥균에게 연결할 수 있는 외부 작품을 확보하지 못했다.
$ko$),
      consumption_philosophy_en = btrim($en$
Kim Ok-gyun encountered reformist thought through the network of young elites in northern Seoul. The National Institute of Korean History's Our History Net identifies Oh Kyung-seok and Yoo Hong-gi as major influences on the group and says that Yoo studied new works such as *Haiguo Tuzhi* and *Yinghuan Zhilüe*.

The source names Yoo, not Kim, as the reader of those two books. It does not place the books in Park Gyu-su's salon or describe Kim reading them there for his first encounter with the wider world. The former journey converted an intellectual network into a personal reading scene, so that claim has been removed.

According to Park Yeong-hyo's recollection, Kim and his peers learned ideas of equality in Park Gyu-su's salon. Kim visited Japan in 1881, met political figures through Fukuzawa Yukichi, and observed Japanese institutions. The material reviewed here does not support the former claim that he lived in Fukuzawa's home for four months while reading a particular work.

*Gapsin Ilrok* is Kim's own work and is excluded from consumed content. This targeted audit did not secure an external work that can be linked to him.
$en$)
  WHERE id = '268395ee-01e0-45ab-ae24-6a399d4b0dec'::uuid
    AND slug = 'kim-ok-gyun'
    AND md5(cultural_journey) = 'ebb6ea539518b191eeee878caef073db'
    AND md5(cultural_journey_en) = '4b83c0d9a120c9dab720cec3f5e4f0e5';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '김옥균 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
한국학중앙연구원 디지털장서각의 명성황후 홍릉비 해제는 독서 시점을 어린 시절이 아니라 왕비 책봉 뒤로 기록한다. 명성황후는 별관에 머물며 『소학』, 『효경』, 『여훈』을 밤이 깊도록 손에서 놓지 않았다.

같은 자료는 명성황후가 『사기』에 통달했고 백관의 장주를 직접 읽었다고 설명한다. 작품명과 독서 정도가 함께 확인되는 『소학』, 『효경』, 『사기』를 DB에 연결한다. 『여훈』도 직접 관계는 분명하지만, 네이버와 OpenLibrary에서 이 기록의 작품과 정확히 대응하는 적격 판본을 찾지 못해 보류한다.

기존 감상여정은 부친에게 이 책들을 배운 시점을 여덟 살 이전으로 앞당겼고, 이 독서가 러시아와 일본 사이의 외교 판단을 만들었다고 연결했다. 확인한 자료는 독서 사실과 정치 활동을 함께 서술하지만 특정 책이 특정 외교 결정을 낳았다고 입증하지 않는다.

따라서 왕비 책봉 뒤의 구체적인 독서 기록은 남기고, 어린 시절 장면과 개별 정책에 대한 인과 추정은 제거한다.
$ko$),
      consumption_philosophy_en = btrim($en$
The Academy of Korean Studies' Digital Jangseogak entry on the Hongneung inscription places the reading after Empress Myeongseong's selection as queen, not in her childhood. While staying in a separate pavilion, she kept *Xiaoxue*, the *Classic of Filial Piety*, and *Yeohun* in hand late into the night.

The same entry says that she mastered Sima Qian's *Records of the Grand Historian* and personally read officials' memorials. *Xiaoxue*, the *Classic of Filial Piety*, and *Records of the Grand Historian* are linked because both the titles and the extent of reading are documented. *Yeohun* also passed the relationship check, but no Naver or Open Library edition could be matched securely to the work named in the source.

The former journey moved these readings back to lessons from her father before the age of eight and linked them directly to diplomatic judgment between Russia and Japan. The source describes both her reading and her political activity, but it does not prove that a particular book caused a particular diplomatic decision.

The revised account retains the concrete post-selection reading record and removes the unsupported childhood scene and policy-level causal claims.
$en$)
  WHERE id = 'bfd405b3-17c2-49fe-b507-f8f9a35938ea'::uuid
    AND slug = 'empress-myeongseong'
    AND md5(cultural_journey) = 'b6a4e0456ddab83250f4a4a31ddef39d'
    AND md5(cultural_journey_en) = '15e61507c221d8ecdd66c6c4393fd477';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '명성황후 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
아르튀르 멘슈는 기능성 자기공명영상의 대규모 데이터를 다루는 기계학습 연구로 박사 과정을 밟았다. 그가 줄리앙 메랄, 베르트랑 티리옹, 가엘 바로쿠아와 함께 발표한 2016년 논문은 거대한 행렬을 처리하는 사전 학습 방법을 제안한다.

이 연구는 멘슈 자신의 저작이다. 줄리앙 메랄의 기존 논문을 읽은 직후 박사 논문의 방향을 정했다거나, 그 과정에서 ‘모델은 크기보다 데이터와의 비례로 완성된다’는 신념을 얻었다는 기존 설명은 확인한 자료에 없다.

멘슈는 이후 딥마인드 파리에서 대규모 언어 모델 연구에 참여했다. Chinchilla 연구에도 공동 저자로 이름을 올렸다. 따라서 Chinchilla를 외부에서 읽고 산업의 자원 배분 원칙을 깨달았다는 문장은 본인 연구 참여를 독서 일화로 잘못 바꾼 것이다.

2023년 멘슈는 기욤 람플, 티모테 라크루아와 미스트랄 AI를 세웠다. 이번 표적 조사에서는 「Attention Is All You Need」를 멘슈가 직접 읽었다는 개인 기록을 확보하지 못했고, 본인 공저 논문도 감상 콘텐츠에서 제외한다.
$ko$),
      consumption_philosophy_en = btrim($en$
Arthur Mensch pursued doctoral research in machine learning for large functional MRI datasets. His 2016 paper with Julien Mairal, Bertrand Thirion, and Gael Varoquaux proposed a dictionary-learning method for massive matrices.

That paper is Mensch's own work. The material reviewed here does not support the former story that reading a particular Mairal paper immediately set the direction of his doctorate or produced a personal maxim about the ratio of models to data.

Mensch later worked on large language models at DeepMind Paris and was a coauthor of the Chinchilla research. Presenting Chinchilla as an external paper he read and from which he discovered an industrial resource-allocation principle therefore misclassified his own research participation as a reading anecdote.

In 2023 Mensch founded Mistral AI with Guillaume Lample and Timothee Lacroix. This targeted audit did not find a personal record of Mensch reading *Attention Is All You Need*, and his own coauthored papers are excluded from consumed content.
$en$)
  WHERE id = '492a347d-18fe-46b6-9f31-4bcf067a1f3f'::uuid
    AND slug = 'arthur-mensch'
    AND md5(cultural_journey) = '07cc3d28074fff5109049fed7950c8ae'
    AND md5(cultural_journey_en) = 'e671ae475d7c3ff7b60de09a41a888ff';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '아르튀르 멘슈 감상여정 기준선이 달라졌습니다.';
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.profiles
  WHERE (
      slug = 'guillaume-lample'
      AND (
        cultural_journey NOT LIKE '%두 트랙 모두 2위%'
        OR cultural_journey_en NOT LIKE '%second place in both tracks%'
      )
    )
     OR (
      slug = 'christopher-columbus'
      AND (
        cultural_journey NOT LIKE '%1496년 이후%'
        OR cultural_journey_en NOT LIKE '%after 1496%'
      )
    )
     OR (
      slug = 'scipio-africanus'
      AND (
        cultural_journey NOT LIKE '%스키피오 아이밀리아누스%'
        OR cultural_journey_en NOT LIKE '%Scipio Aemilianus%'
      )
    )
     OR (
      slug = 'epicurus'
      AND (
        cultural_journey NOT LIKE '%헤시오도스의 ‘카오스’ 구절%'
        OR cultural_journey_en NOT LIKE '%passage about Chaos in Hesiod%'
      )
    )
     OR (
      slug = 'saicho'
      AND (
        cultural_journey NOT LIKE '%798년부터%'
        OR cultural_journey_en NOT LIKE '%annual lecture ceremonies%'
      )
    )
     OR (
      slug = 'kim-ok-gyun'
      AND (
        cultural_journey NOT LIKE '%주체를 유홍기로%'
        OR cultural_journey_en NOT LIKE '%names Yoo, not Kim%'
      )
    )
     OR (
      slug = 'empress-myeongseong'
      AND (
        cultural_journey NOT LIKE '%왕비 책봉 뒤%'
        OR cultural_journey_en NOT LIKE '%after Empress Myeongseong''s selection as queen%'
      )
    )
     OR (
      slug = 'arthur-mensch'
      AND (
        cultural_journey NOT LIKE '%Chinchilla 연구에도 공동 저자%'
        OR cultural_journey_en NOT LIKE '%coauthor of the Chinchilla research%'
      )
    );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '5차 조사 감상여정 교정 문자열 검증 실패 인물=%',
      wrong_count;
  END IF;
END;
$$;

COMMIT;
