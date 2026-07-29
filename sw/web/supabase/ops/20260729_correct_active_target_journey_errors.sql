-- 활성 + 감상여정 명시 작품군 조사에서 확인한 감상여정 오류 6명을 교정한다.
--
-- 이 파일은 콘텐츠 등록과 분리한다. 대상 원문의 ko/en MD5가 2026-07-29
-- 실DB 기준선과 정확히 일치할 때만 수정하며, 한 글자라도 달라졌으면 전부 롤백한다.
--
-- 교정 근거:
--   - 구스타브 2세 아돌프: Gutenberg의 1901년 Grotius 판본 서문
--   - 누르하치: 중국인민대학 『청사연구』 PDF
--   - 주세페 가리발디: 자필 최종 원고 기반 『회고록』
--   - 얀 후스: Philip Schaff, History of the Christian Church
--   - 헤르타 뮐러: Graywolf Press 공식 도서 페이지
--   - 이강인: 2019-05-01 스포츠서울 현장 기사

BEGIN;

DO $$
DECLARE
  affected integer;
  wrong_count integer;
BEGIN
  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
구스타브 2세 아돌프는 열일곱에 왕이 되었을 때 이미 라틴어, 독일어, 네덜란드어, 프랑스어, 이탈리아어를 구사했다. 스페인어와 영어도 읽었고, 폴란드어와 러시아어도 어느 정도 이해했다. 외교와 전쟁을 함께 수행해야 했던 왕에게 언어와 독서는 실무의 일부였다.

30년 전쟁 중에도 책은 곁에 있었다. 1901년판 후고 그로티우스의 『전쟁과 평화의 법』 서문은 그가 이 책을 성경 옆, 군인의 베개 아래에 두고 원정을 수행했다고 기록한다. 왕 자신의 일기가 아니라 후대 판본의 서문에 남은 기록이지만, 원정 중 특정 책을 지녔다는 구체적인 증언이다.

그는 정복지의 장서를 스웨덴으로 옮겼고 웁살라 대학을 후원했다. 1632년에는 에스토니아에 타르투 대학을 세우는 칙령을 내렸다. 전장에서 지닌 한 권과 대학에 모은 장서는, 그에게 책이 개인의 독서물이면서 국가의 기반이기도 했음을 보여준다.

구스타브 2세 아돌프는 1632년 뤼첸 전투에서 전사했다. 그가 모으고 지원한 장서와 교육기관은 전쟁 뒤에도 스웨덴 학문의 토대로 남았다.
$ko$),
      consumption_philosophy_en = btrim($en$
Gustavus Adolphus was already able to use Latin, German, Dutch, French, and Italian when he became king at seventeen. He also read Spanish and English and had some understanding of Polish and Russian. For a king who conducted diplomacy and war at the same time, languages and books were part of practical statecraft.

Books remained close during the Thirty Years' War. The introduction to a 1901 edition of Hugo Grotius's *The Rights of War and Peace* records that Gustavus kept the work beside his Bible under his soldier's pillow while campaigning. Although the account appears in a later edition rather than in the king's own diary, it gives specific testimony that he carried the named book in the field.

He transferred captured libraries to Sweden, patronized Uppsala University, and issued the charter founding the University of Tartu in 1632. The volume carried on campaign and the collections assembled for universities show that books served him both as personal reading and as national infrastructure.

Gustavus Adolphus died at the Battle of Lützen in 1632. The libraries and educational institutions he gathered and supported outlived the war and became part of Sweden's scholarly foundation.
$en$)
  WHERE id = '09c6248d-56b8-49a1-84fe-d34c8fd4ac77'::uuid
    AND slug = 'gustavus-adolphus'
    AND md5(cultural_journey) = '21b5e5c0296ccb6fb19f17399f09ca0c'
    AND md5(cultural_journey_en) = 'fa126d1a012b8405cabed3d5ee2fbb91';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION
      '구스타브 2세 아돌프 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
누르하치는 한어로 한족의 소설을 읽었다. 중국인민대학 『청사연구』에 실린 논문은 그가 『삼국지연의』와 『수호전』을 즐겨 읽었다고 전한다. 여진의 지도자가 적국의 언어로 두 장편소설을 읽었다는 사실 자체가 확인되는 감상 기록이다.

두 소설의 어떤 장면이 그의 전술이나 정치에 직접 옮겨졌는지는 자료로 확인되지 않는다. 유비가 민심을 얻는 방식이나 조조가 명분을 세우는 방식을 누르하치가 현실 정치에 적용했다고 단정할 근거도 없다.

1599년 누르하치는 에르데니와 가가이에게 명해 몽골 문자를 바탕으로 만주 문자를 만들게 했다. 훗날 청 조정에서는 『삼국지연의』를 비롯한 중국 문헌이 만주어로 번역됐다. 다만 문자 창제와 두 소설의 독서 사이에 직접적인 인과가 있었다고 보지는 않는다.

누르하치의 독서 기록에서 구체적인 제목까지 확인되는 작품은 『삼국지연의』와 『수호전』 두 편이다. 그는 적국의 언어로 쓴 장편소설을 읽었지만, 그 독서가 곧바로 특정 정책과 전술을 낳았다고 말할 수는 없다.
$ko$),
      consumption_philosophy_en = btrim($en$
Nurhaci read Han Chinese fiction in Chinese. A paper published in *Qing History Journal* at Renmin University of China states that he enjoyed *Romance of the Three Kingdoms* and *Water Margin*. A Jurchen leader reading two long novels in the language of a rival state is itself a documented cultural record.

The available sources do not establish that Nurhaci transferred any particular scene directly into military or political practice. Nor do they support claims that he applied Liu Bei's way of winning popular support or Cao Cao's methods of political justification.

In 1599 Nurhaci ordered Erdeni and Gagai to create the Manchu script on the basis of Mongolian writing. The Qing court later translated Chinese texts, including *Romance of the Three Kingdoms*, into Manchu. That later history should not be turned into a direct causal claim between his reading of the two novels and the creation of the script.

The two titles securely attached to Nurhaci's reading are *Romance of the Three Kingdoms* and *Water Margin*. He read long fiction in a rival state's language, but that fact alone does not establish that the books produced a particular policy or tactic.
$en$)
  WHERE id = '6dd61569-ea13-4261-b94b-057122f2dbc1'::uuid
    AND slug = 'nurhaci'
    AND md5(cultural_journey) = '75b6ee59b277ba960e1ad993e5a36bbd'
    AND md5(cultural_journey_en) = '808137bdf8d9043b8e9e10e2cbae3f0a';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '누르하치 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
주세페 가리발디는 선원 시절 긴 항해 속에서 책과 시를 가까이했다. 그의 자필 최종 원고를 바탕으로 한 『회고록』에는 총상을 입고 죽음을 생각하던 순간이 나온다. 그는 곁을 지키던 루이지 카르닐리아에게 우고 포스콜로의 「묘지에 부쳐」 구절을 직접 읊었다. 회고록이 전하는 것은 위기의 순간에도 떠올린 특정 구절이다. 작품 전체를 외웠는지는 이 기록만으로 알 수 없다.

가정교사 아레나는 그에게 이탈리아어와 서예, 수학을 가르쳤고 로마사를 처음 읽게 했다. 형 안젤로도 이탈리아어 공부를 권했다. 가리발디는 훗날 이 초기 독서가 자기 언어와 역사에 대한 관심을 키웠다고 회고했다.

그는 오스만 제국에 머물 때 이탈리아어와 프랑스어, 수학을 가르치며 생계를 이었다. 항해와 망명 속에서 익힌 언어와 지식은 취미에 머물지 않고 생활의 수단이 되었다.

가리발디의 감상여정에서 가장 분명한 장면은 죽음 가까이에서 포스콜로의 시구를 불러낸 순간이다. 그 장면은 문학이 그의 삶에 남긴 흔적을 보여주지만, 시가 이후의 군사 행동을 직접 만들었다는 인과까지 증명하지는 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Giuseppe Garibaldi kept books and poetry close during long voyages as a sailor. His memoir, prepared from his final autograph manuscript, recalls a moment when he lay wounded and expected to die. He recited lines from Ugo Foscolo's *Dei sepolcri* to Luigi Carniglia, who stayed beside him. The primary text establishes his recall of a particular passage in a crisis; it does not establish that he had memorized the entire poem.

His tutor Arena taught him Italian, penmanship, and mathematics and introduced him to Roman history. His older brother Angelo also urged him to study Italian. Garibaldi later connected that early reading with a growing interest in his language and national history.

While living in the Ottoman Empire, he supported himself by teaching Italian, French, and mathematics. The languages and knowledge acquired through reading became more than a pastime during years of travel and exile; they were also a means of living.

The clearest literary scene in Garibaldi's cultural journey is his recovery of Foscolo's verse when death seemed near. It shows that poetry remained available to him at a decisive moment without requiring the stronger causal claim that the poem produced his later military actions.
$en$)
  WHERE id = '873236c8-ec6d-4064-a6ab-ced908002861'::uuid
    AND slug = 'giuseppe-garibaldi'
    AND md5(cultural_journey) = 'f4abf1536c5c59b57f7962f3a453cb14'
    AND md5(cultural_journey_en) = 'b5a39ec5a914d1d4411d4965cfbce3cf';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '주세페 가리발디 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
얀 후스는 프라하의 베들레헴 예배당에서 체코어로 설교했다. 성직자와 대학인에게만 머물던 논쟁을 사람들이 듣는 언어로 옮겼고, 성서의 권위가 교황의 명령보다 앞선다고 주장했다.

존 위클리프의 저술은 그의 사상 형성에 중요한 자료였다. 후스는 자신과 프라하 대학 구성원들이 위클리프의 글을 20년 넘게 읽어 왔다고 밝혔고, 1398년에는 위클리프 저술 다섯 권을 직접 필사했다. 후스의 『교회론』 첫 세 장은 위클리프의 동명 논고에서 가져온 발췌가 중심을 이룬다.

위클리프의 『교회론』은 영어가 아니라 라틴어로 쓰였다. 후스가 보헤미아로 들여온 것이 영어 원문이었다는 설명은 성립하지 않는다. 그가 체코어로 번역한 위클리프 저술로 확인되는 작품은 『트리알로구스』다.

후스는 1415년 콘스탄츠 공의회에서 자신의 주장을 철회하라는 요구를 거부하고 화형됐다. 그가 읽고 필사하고 다시 쓴 텍스트는 논쟁의 재료를 넘어 그의 재판과 죽음에까지 이어졌다.
$ko$),
      consumption_philosophy_en = btrim($en$
Jan Hus preached in Czech at Prague's Bethlehem Chapel. He carried debates that had largely belonged to clerics and university scholars into a language people could hear, and he argued that the authority of scripture stood above papal commands.

John Wycliffe's writings were an important part of his intellectual formation. Hus stated that he and members of the University of Prague had been reading Wycliffe for more than twenty years, and five copies of Wycliffe's works made in Hus's own hand in 1398 survive. The first three chapters of Hus's *De ecclesia* consist largely of extracts from Wycliffe's treatise of the same title.

Wycliffe wrote *De ecclesia* in Latin, not English. Hus therefore did not carry an English original of that work into Bohemia. The Wycliffite work he is documented as translating into Czech was the *Trialogus*.

At the Council of Constance in 1415, Hus refused demands that he recant and was burned at the stake. The texts he read, copied, and rewrote became more than intellectual material; they formed part of the controversy that led to his trial and death.
$en$)
  WHERE id = 'dff09d95-58cf-4e17-a3c7-321ee87cf0e0'::uuid
    AND slug = 'jan-hus'
    AND md5(cultural_journey) = '22f8b6af8ba5867faa3ca39aa4185c3b'
    AND md5(cultural_journey_en) = 'efb8cd45f331fef32bacb79075cf540d';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '얀 후스 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
헤르타 뮐러는 독일계 루마니아 마을의 침묵을 깨뜨린 첫 번째 충격이 마리아 터너세의 목소리였다고 회고한다. 그녀는 루마니아 농촌의 비탄과 관능이 한 사람의 노래에 함께 담길 수 있음을 음반으로 배웠다.

망명 이후 헤르타 뮐러는 시인 오스카르 파스티오르와 5년에 걸쳐 마주 앉아 그의 시베리아 강제수용소 기억을 들었다. 그 대화와 파스티오르의 언어는 뮐러가 『숨그네』를 쓰는 핵심 자료가 됐다.

2015년에는 가택연금 중이던 중국 시인 류샤의 시집 『빈 의자』에 서문을 썼다. Graywolf Press가 출간한 영문 시집의 앞머리에서, 헤르타 뮐러는 류샤의 시가 영어권 독자에게 닿는 길에 자신의 글을 보탰다.
$ko$),
      consumption_philosophy_en = btrim($en$
Herta Müller has recalled the voice of Maria Tănase as one of the first sounds to break the silence of the German-speaking Romanian village in which she grew up. Through those recordings, she encountered a voice that could hold both the lament and sensuality of rural Romania.

After exile, Müller spent five years in conversation with the poet Oskar Pastior about his memories of a Soviet labor camp. Those conversations and Pastior's language became central material for her novel *The Hunger Angel*.

In 2015 she wrote the foreword to *Empty Chairs*, a collection by the house-arrested Chinese poet Liu Xia. By opening Graywolf Press's English-language edition, Müller lent her own prose to the passage of Liu Xia's poetry into the hands of new readers.
$en$)
  WHERE id = '34d34606-4e61-479a-bb94-cf99d82bc7d9'::uuid
    AND slug = 'herta-muller'
    AND md5(cultural_journey) = 'da6bc0156680bab6c251b03e724e75d9'
    AND md5(cultural_journey_en) = '156d16329fac50bcfdd6c044c76e3e8a';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '헤르타 뮐러 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
이강인은 음악을 대표팀 훈련장의 언어로 썼다. 2019년 U-20 월드컵을 앞둔 파주 훈련에서 선수들이 돌아가며 맡던 DJ 순서가 오자, 자신이 평소 듣는 노래 가운데 형들이 좋아할 만한 곡을 골랐다.

당시 기사에 기록된 플레이리스트는 일곱 곡이다. 우원재의 「시차 (We Are)」, 박재범의 「All I Wanna Do (K)」, Imagine Dragons의 「Thunder」, XXXTENTACION의 「SAD!」, FT아일랜드의 「사랑사랑사랑」, 로꼬의 「시간이 들겠지」, 처진 달팽이의 「말하는 대로」가 훈련장에 울렸다.

이강인은 “원래 노래를 다양하게 듣는다”고 말했고, 스페인 노래나 팝송만 틀면 형들이 싫어할 수 있어 자기 목록 중 함께 들을 곡을 골랐다고 설명했다. 확인되는 취향은 한 장르나 한 감정이 아니라, 여러 장르를 듣고 상황에 맞게 선곡하는 방식이다.

이날의 선곡은 해외 팝과 한국 힙합, 록, 발라드를 오갔다. 이강인에게 음악은 개인적인 감정을 설명하는 표식이라기보다, 세대와 취향이 다른 동료들 사이에서 훈련장의 분위기를 함께 만드는 수단이었다.
$ko$),
      consumption_philosophy_en = btrim($en$
Lee Kang-in used music as a language for the national team's training ground. Before the 2019 Under-20 World Cup, players took turns serving as the session's DJ. When his turn came, Lee selected songs he already listened to and thought the older teammates would enjoy.

The field report records seven tracks: Woo's “We Are,” Jay Park's “All I Wanna Do (K),” Imagine Dragons' “Thunder,” XXXTENTACION's “SAD!,” FTISLAND's “Love Love Love,” Loco's “It Takes Time,” and Sagging Snail's “As I Say.”

Lee said that he normally listened to many kinds of music. He explained that the older players might not like a set made only of Spanish songs or international pop, so he chose from his own listening songs that the group could enjoy together. The documented pattern is not one genre or one emotion but broad listening adapted to the occasion.

The playlist moved between international pop, Korean hip-hop, rock, and ballad. For Lee, music in this setting was less a coded statement of private emotion than a way to shape the training-ground atmosphere among teammates of different ages and tastes.
$en$)
  WHERE id = 'a488a698-eae7-4938-928e-5e5c28f864bd'::uuid
    AND slug = 'lee-kang-in'
    AND md5(cultural_journey) = 'ec56460147946a8fc8b9b17fc053891b'
    AND md5(cultural_journey_en) = '9c1a81d666a71520e08056cb66cc220c';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '이강인 감상여정 기준선이 달라졌습니다.';
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.profiles
  WHERE (
      slug = 'gustavus-adolphus'
      AND cultural_journey LIKE '%안장 가방%'
    )
     OR (
      slug = 'giuseppe-garibaldi'
      AND (
        cultural_journey LIKE '%통째로 암기%'
        OR cultural_journey_en LIKE '%memorized Ugo Foscolo%'
      )
    )
     OR (
      slug = 'jan-hus'
      AND (
        cultural_journey LIKE '%위클리프가 영어로%'
        OR cultural_journey_en LIKE '%Wycliffe had written in English%'
      )
    )
     OR (
      slug = 'lee-kang-in'
      AND (
        cultural_journey LIKE '%윤미래%'
        OR cultural_journey LIKE '%시차를 달리며%'
        OR cultural_journey_en LIKE '%Yoon Mi-rae%'
      )
    );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '알려진 감상여정 오류 문자열이 남았습니다. 남은 인물=%',
      wrong_count;
  END IF;
END;
$$;

COMMIT;
