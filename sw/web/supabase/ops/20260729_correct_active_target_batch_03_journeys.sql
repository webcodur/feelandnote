-- 활성 + 감상여정 명시 작품군 3차 조사에서 확인한 감상여정 오류 7명을 교정한다.
--
-- 콘텐츠 등록 SQL과 분리해서 실행한다. 대상 원문의 ko/en MD5가 2026-07-29
-- 실DB 기준선과 정확히 일치할 때만 수정하며, 한 글자라도 달라졌으면 전부 롤백한다.
--
-- 교정:
--   - 호쿠사이: 『수호전』 삽화 제작의 확인 범위만 남김
--   - 드보르자크: 서버가 영어판을 건넸다는 설명과 창작 인용 제거
--   - 소진: 『주서 음부』를 현존 『황제음부경』으로 본 오인과 과장된 인과 제거
--   - 사이고: 『언지사록』 101조 발췌 기록만 남기고 정치·전쟁 인과 제거
--   - 야오밍: AP 인터뷰에 없는 자기 투영과 반복 언급 제거
--   - 티치아노: 확인되지 않은 『신곡』·아레티노 연결 제거
--   - 호나우지뉴: 허구의 2013 UAI 인터뷰와 라커룸 일화를 공식 2023 목록으로 교체

BEGIN;

DO $$
DECLARE
  affected integer;
  wrong_count integer;
BEGIN
  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
가쓰시카 호쿠사이는 『수호전』을 일본식으로 각색한 『신편 수호화전』의 삽화를 제작했다. 프린스턴대학교 미술관은 1820년대 후반의 한 소묘를 호쿠사이가 이 책의 삽화를 준비하며 그린 작품으로 분류한다.

호쿠사이는 소묘에서 서로 뒤엉킨 두 인물의 자세를 여러 차례 고쳤다. 미술관은 옅은 먹으로 남은 수정 흔적과 짙은 먹으로 정리한 마지막 선을 구분해 설명한다. 완성된 인쇄본에서는 두 인물이 건물 안에 놓이고 다른 인물 세 명이 장면에 더해졌다.

프린스턴대학교 미술관의 설명을 따르면 호쿠사이는 서사의 한 장면을 검토하고 시각적으로 다시 구성했다. 다만 호쿠사이가 특정 중국어 판본을 처음부터 끝까지 읽었다고 단정할 수는 없다. 따라서 호쿠사이가 삽화를 만들며 작품을 직접 다룬 사실만 남긴다.

호쿠사이가 직접 만든 『호쿠사이 만화』는 그의 감상 콘텐츠로 등록하지 않는다. 이번 조사에서 외부 작품과의 접촉이 확인된 항목은 『신편 수호화전』의 바탕이 된 『수호전』이다.
$ko$),
      consumption_philosophy_en = btrim($en$
Katsushika Hokusai produced illustrations for *Shinpen suiko gaden*, a Japanese adaptation of *Water Margin*. The Princeton University Art Museum identifies a late-1820s drawing as a preparatory study for one of those illustrations.

Hokusai repeatedly revised the positions of the two struggling figures in the drawing. The museum distinguishes the light-ink revisions from the final dark-ink lines. In the printed version, the pair appears inside a building, and three additional figures enter the scene.

The material documents Hokusai studying a narrative episode and reconstructing it visually. It does not establish that he read a particular Chinese edition from beginning to end. This entry therefore rests on his direct work with the story while preparing an illustration, not on a claim of complete reading.

Hokusai's own *Hokusai Manga* is not treated as a consumed work. The external work securely connected to him in this audit is *Water Margin*, through the Japanese adaptation he illustrated.
$en$)
  WHERE id = '66c69179-b3b9-4688-ba22-22fb547acdcf'::uuid
    AND slug = 'katsushika-hokusai'
    AND md5(cultural_journey) = '8ffb4634dde3002a92d010e4dcb8c7bd'
    AND md5(cultural_journey_en) = 'e572b96dfcf1f60eddf98345f13abbdc';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '가쓰시카 호쿠사이 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
안토닌 드보르자크는 미국에 가기 전부터 롱펠로의 『하이아와사의 노래』를 알고 있었다. 안토닌 드보르자크 아카이브에 따르면 그는 친구 요세프 바츨라프 슬라데크가 번역한 체코어판으로 이 서사시를 접했다.

드보르자크는 뉴욕 국립음악원장으로 일할 때 영어 원문도 읽었다. 음악원 설립자 자네트 서버는 미국을 대표할 오페라의 소재로 이 작품을 제안했다. 서버가 영어판을 직접 건넸다는 기존 설명은 확인되지 않는다.

드보르자크는 『하이아와사의 노래』를 오페라로 만들려고 스케치와 메모를 남겼다. 그러나 음악원이 의뢰한 대본들이 승인을 받지 못했고, 그는 끝내 이 오페라를 완성하지 않았다.

아카이브는 『하이아와사의 노래』가 교향곡 9번 「신세계로부터」의 두 중간 악장에도 영향을 주었다고 설명한다. 드보르자크가 체코어 번역과 영어 원문을 모두 접했고, 오페라와 교향곡 작업에 이 소재를 사용한 기록이 남아 있다.
$ko$),
      consumption_philosophy_en = btrim($en$
Antonín Dvořák knew Longfellow's *The Song of Hiawatha* before he traveled to the United States. The Antonín Dvořák archive states that he first encountered the poem in a Czech translation by his friend Josef Václav Sládek.

While directing the National Conservatory in New York, Dvořák also became acquainted with the English original. The conservatory's founder, Jeannette Thurber, proposed the poem as a subject for an American national opera. The former account that she personally handed him an English edition is not supported by the source.

Dvořák left sketches and notes for an opera based on *Hiawatha*. The librettos commissioned by the conservatory did not win approval, and he never completed the opera.

The archive also identifies the poem as an inspiration for the two middle movements of his Ninth Symphony, *From the New World*. Records therefore connect Dvořák with the Czech translation, the English original, his unfinished opera plan, and the symphony.
$en$)
  WHERE id = '03cce456-8367-4164-b026-07b777feb7b2'::uuid
    AND slug = 'antonin-dvorak'
    AND md5(cultural_journey) = '74bdcf23d1b2ffe9bd112cc9b483356d'
    AND md5(cultural_journey_en) = '0df39356cca13c01c75b9e52ababfd12';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '안토닌 드보르자크 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
『사기』 「소진열전」은 소진이 처음 유세에 실패하고 고향으로 돌아온 뒤 다시 공부했다고 기록한다. 가족에게 무시당한 그는 주나라 계통의 문헌으로 적힌 『주서 음부』를 얻어 엎드려 읽었다.

소진은 졸음이 오면 송곳으로 넓적다리를 찌르면서 공부를 이어갔다. 『사기』는 그가 책의 내용을 거듭 헤아린 뒤 군주를 설득할 방법을 찾았다고 서술한다.

그러나 『주서 음부』가 어떤 문헌이었는지는 분명하지 않다. 현존하는 『황제음부경』이나 후대에 태공망의 이름을 붙인 병서와 같은 책으로 볼 근거도 없다. 이번 등록에서는 『사기』에 적힌 제목만 사용한다.

소진은 이 문헌을 실제로 읽고 검토했다. 다만 한 해 동안 공부했다거나 특정한 심리 기술을 완성했다는 기존 설명은 이번에 확인한 본문보다 앞서 나간 해석이어서 제거했다.
$ko$),
      consumption_philosophy_en = btrim($en$
The *Shiji* biography of Su Qin states that he returned home and resumed his studies after his first diplomatic mission failed. Shunned by his family, he obtained a work identified as the *Zhou Shu Yinfu* and bent over it to read.

Su Qin kept studying by pricking his thigh with an awl when he became drowsy. The biography says that he repeatedly pondered the text and then found methods for persuading rulers.

The identity of the *Zhou Shu Yinfu* is uncertain. There is no sound basis for treating it as the extant *Huangdi Yinfujing* or as a later military text attributed to Taigong Wang. This entry preserves the title used in the *Shiji*.

The source documents Su Qin reading and examining the work. The former claims that he studied it for exactly one year or derived a named system of psychological manipulation go beyond the passage used in this audit and have been removed.
$en$)
  WHERE id = '37d269ae-7c6e-438a-b0e3-fff93488b790'::uuid
    AND slug = 'su-qin'
    AND md5(cultural_journey) = 'a3e16350e7712c65828c4a37db57df81'
    AND md5(cultural_journey_en) = '6ae24e972e12f572a2d6a201bd6bff4f';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '소진 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
사이고 다카모리는 사토 잇사이의 『언지사록』을 가까이 두고 읽었다. 『언지사록』은 『언지록』, 『언지후록』, 『언지만록』, 『언지질록』 네 책을 묶어 부르는 이름이다.

도쿄도립도서관에 따르면 사이고는 네 책에서 101조를 직접 뽑아 적었다. 그는 이 발췌문을 곁에 두고 정신적 버팀목으로 삼았다.

도쿄도립도서관 자료로 사이고가 특정 문헌을 읽고 필요한 대목을 골라 계속 참고했다는 사실을 확인할 수 있다. 다만 그가 이 책 한 권으로 양명학에 입문했다거나 모든 정치적 결정과 군사 행동을 정했다는 인과는 자료에서 확인되지 않는다.

이번 콘텐츠는 국내에 나온 『언지록』 판본으로 연결했다. 감상경위에는 사이고가 네 책 전체에서 101조를 발췌했다는 도서관 기록을 분명히 적었다.
$ko$),
      consumption_philosophy_en = btrim($en$
Saigō Takamori kept Sato Issai's *Genshi Shiroku* close and read it regularly. The collective title covers four works: *Genshi-roku*, *Genshi kōroku*, *Genshi banroku*, and *Genshi tetsuroku*.

According to the Tokyo Metropolitan Library, Saigō selected and copied 101 passages from the four books. He kept the extracts at hand and used them as spiritual support.

This record confirms that Saigō read a named body of work, selected the passages he needed, and continued to consult them. It does not establish that this collection alone introduced him to Wang Yangming learning or determined every political and military decision he made.

The content entry uses a Korean edition published under the shorter title *Eonjirok*. The review makes clear that Saigō's own selection drew from all four records.
$en$)
  WHERE id = '5eb8782e-b0fa-47b4-bb8d-ba6da4e7bdac'::uuid
    AND slug = 'saigo-takamori'
    AND md5(cultural_journey) = 'b221c3c7cc036637705193ff8aaffef7'
    AND md5(cultural_journey_en) = 'fdcefc2e5fcbec6f9dc6e9f88b99d377';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '사이고 다카모리 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
야오밍은 NBA 진출을 준비하던 2002년에 AP와 인터뷰했다. 당시 그는 영어를 2년 동안 공부했다고 밝혔고, 가장 좋아하는 미국 영화로 「Star Wars」를 꼽았다.

기사는 부제나 속편을 따로 밝히지 않았다. DB에서는 1977년에 원제 「Star Wars」로 개봉한 영화를 연결하되, 시리즈 전체를 가장 좋아했다고 넓혀 쓰지 않는다.

같은 인터뷰에서 야오밍은 랩 음악이 너무 시끄러워 좋아하지 않는다고 말했다. 기존 감상여정에 있던 미국 국가 선호 발언은 이 기사에서 확인되지 않는다.

야오밍이 영화 속 인물과 자신을 겹쳐 보았다거나 미국에 간 뒤 이 작품을 자주 언급했다는 설명도 근거가 없었다. 이번에는 그가 직접 밝힌 좋아하는 영화와 음악에 대한 짧은 답만 남겼다.
$ko$),
      consumption_philosophy_en = btrim($en$
Yao Ming spoke with the Associated Press in 2002 while preparing for a possible move to the NBA. He said that he had studied English for two years and named “Star Wars” as his favorite American movie.

The article gives no subtitle and does not identify a sequel. The database links the 1977 film originally released as *Star Wars* without expanding the statement into a preference for the entire series.

In the same interview, Yao said that he disliked rap because it was too noisy. The former claim that he named “The Star-Spangled Banner” as his preferred music does not appear in this article.

The source also does not say that Yao saw himself in the film's characters or spoke about the work frequently after moving to the United States. The revised journey keeps only his brief, direct answers about film and music.
$en$)
  WHERE id = '3aff4f9a-286a-49e6-bfe3-5eca1930f059'::uuid
    AND slug = 'yao-ming'
    AND md5(cultural_journey) = '42e8caa354b78bdf72da77b268f8bd2e'
    AND md5(cultural_journey_en) = '13bc5660bf2734f74944a8c672097975';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '야오밍 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
티치아노 베첼리오는 베네치아에서 조반니 벨리니와 조르조네의 작업을 접하며 화가로 성장했다. 그는 색과 빛을 중심에 둔 베네치아 회화의 방식을 이어받아 자신의 작업에 맞게 바꿨다.

티치아노는 1550년대부터 스페인의 펠리페 2세를 위해 대형 신화화를 그렸다. 그는 이 연작을 시와 맞먹는 그림이라는 뜻에서 ‘포에지아’라고 불렀다.

영국 내셔널 갤러리는 「디아나와 칼리스토」, 「디아나와 악타이온」, 「악타이온의 죽음」이 오비디우스의 『변신 이야기』에 나오는 구체적인 장면을 바탕으로 했다고 설명한다. 티치아노는 글로 전해진 이야기를 인물의 동작과 표정, 색으로 다시 구성했다.

기존 감상여정은 단테의 『신곡』과 피에트로 아레티노의 작품까지 한꺼번에 연결했지만, 이번 조사에서는 그 근거를 확인하지 못했다. 직접적인 창작 접촉이 확인된 문학 작품은 『변신 이야기』다.
$ko$),
      consumption_philosophy_en = btrim($en$
Titian developed as a painter in Venice through his contact with the work of Giovanni Bellini and Giorgione. He inherited the Venetian emphasis on color and light and adapted it to his own practice.

From the 1550s, Titian painted a series of large mythological works for Philip II of Spain. He called the series his *poesie*, presenting the paintings as visual equivalents of poetry.

The National Gallery explains that *Diana and Callisto*, *Diana and Actaeon*, and *The Death of Actaeon* draw on specific episodes from Ovid's *Metamorphoses*. Titian reconstructed the written stories through movement, expression, and color.

The former cultural journey also connected Titian with Dante's *Divine Comedy* and works by Pietro Aretino, but this audit did not find evidence strong enough to keep those claims. *Metamorphoses* is the literary work for which direct creative engagement is documented here.
$en$)
  WHERE id = 'e09c74d2-3289-44a3-b3f0-6334944f265f'::uuid
    AND slug = 'tiziano-vecellio'
    AND md5(cultural_journey) = '25cbcc897750906d064aa01e31a4ec73'
    AND md5(cultural_journey_en) = 'fbf284159a0d5da932b94403dd8c973b';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '티치아노 베첼리오 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
FC 바르셀로나와 스포티파이는 2023년 호나우지뉴의 공식 ‘바르사 레전드’ 플레이리스트를 공개했다. 구단은 호나우지뉴가 바르셀로나에서 뛴 2003~2008년에 자신에게 영감과 동기를 준 노래를 직접 골랐다고 설명했다.

목록에는 제카 파고지뉴의 「Faixa Amarela」와 그루포 푼두 지 킨타우의 「Um Lindo Sonho」가 들어 있다. 삼바와 파고지는 전체 목록에서 큰 비중을 차지한다.

호나우지뉴는 음악을 가족에게서 물려받았고, 노래의 리듬을 경기장에서도 사용했다고 구단에 말했다. 그는 음악 없는 삶은 불가능하다며 자신의 목록을 팬들과 공유한다고 밝혔다.

밥 말리 앤 더 웨일러스의 「Could You Be Loved」, 제이지의 「Excuse Me Miss」, 비욘세의 「Naughty Girl」도 같은 공식 목록에 실렸다. 기존 감상여정에 있던 2013년 UAI 인터뷰, 50곡 목록, 바르셀로나 라커룸 회상은 확인되지 않아 제거했다.
$ko$),
      consumption_philosophy_en = btrim($en$
FC Barcelona and Spotify released Ronaldinho's official Barça Legends playlist in 2023. The club states that Ronaldinho selected songs that inspired and motivated him during his years at Barcelona from 2003 to 2008.

The list includes Zeca Pagodinho's “Faixa Amarela” and Grupo Fundo De Quintal's “Um Lindo Sonho.” Samba and pagode make up a large part of the playlist.

Ronaldinho told the club that he inherited music from his family and carried the rhythm of songs onto the field. He said that life without music was impossible for him and that he was excited to share the list with supporters.

Bob Marley and the Wailers' “Could You Be Loved,” JAY-Z's “Excuse Me Miss,” and Beyoncé's “Naughty Girl” also appear on the official playlist. The former claims about a 2013 UAI interview, a fifty-song list, and repeated locker-room listening were not verified and have been removed.
$en$)
  WHERE id = '44ee46f5-42aa-4729-a5b7-34d33b8f48b1'::uuid
    AND slug = 'ronaldinho'
    AND md5(cultural_journey) = 'f6cd357842b48f4039010a006a45dcf6'
    AND md5(cultural_journey_en) = '7489042a97830a4a1a69499cb8df7a91';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '호나우지뉴 감상여정 기준선이 달라졌습니다.';
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.profiles
  WHERE (
      slug = 'su-qin'
      AND (
        cultural_journey NOT LIKE '%『주서 음부』%'
        OR cultural_journey NOT LIKE '%현존하는 『황제음부경』%'
        OR cultural_journey_en NOT LIKE '%Zhou Shu Yinfu%'
      )
    )
     OR (
      slug = 'yao-ming'
      AND (
        cultural_journey NOT LIKE '%랩 음악이 너무 시끄러워%'
        OR cultural_journey_en NOT LIKE '%disliked rap because it was too noisy%'
      )
    )
     OR (
      slug = 'tiziano-vecellio'
      AND (
        cultural_journey NOT LIKE '%직접적인 창작 접촉%'
        OR cultural_journey_en NOT LIKE '%direct creative engagement%'
      )
    )
     OR (
      slug = 'ronaldinho'
      AND (
        cultural_journey NOT LIKE '%2023년%'
        OR cultural_journey_en NOT LIKE '%released Ronaldinho''s official Barça Legends playlist in 2023%'
      )
    )
     OR (
      slug = 'katsushika-hokusai'
      AND (
        cultural_journey NOT LIKE '%프린스턴대학교 미술관%'
        OR cultural_journey_en NOT LIKE '%Princeton University Art Museum%'
      )
    )
     OR (
      slug = 'antonin-dvorak'
      AND (
        cultural_journey NOT LIKE '%체코어판%'
        OR cultural_journey_en NOT LIKE '%Czech translation%'
      )
    )
     OR (
      slug = 'saigo-takamori'
      AND (
        cultural_journey NOT LIKE '%101조%'
        OR cultural_journey_en NOT LIKE '%101 passages%'
      )
    );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '3차 조사에서 확인한 감상여정 오류 문자열이 남았습니다. 남은 인물=%',
      wrong_count;
  END IF;
END;
$$;

COMMIT;
