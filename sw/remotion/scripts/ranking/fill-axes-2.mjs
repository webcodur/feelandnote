import fs from 'node:fs'
import path from 'node:path'

const root = path.join(process.cwd(), 'public', 'rankings')

const added = {
  'mafia-top10': {
    keep: '조직',
    extra: [
      {
        name: '잔혹',
        entries: [
          { rank: 1, name: '알 카포네', celebSlug: 'al-capone', line: '발렌타인데이에 부하를 경찰로 입혀 창고에 세우고 노스사이드 갱 일곱을 쏘게 했다.', note: '학살' },
          { rank: 2, name: '존 고티', celebSlug: 'john-gotti', line: '술집에서 제임스 맥브래트니를 쳐 죽였다. 카스텔라노도 길에서 쏘게 했다.', note: '구타' },
          { rank: 3, name: '벅시 시겔', celebSlug: 'bugsy-siegel', line: '뉴욕 조직의 집행자로 직접 사람을 쏘는 일로 이름이 났다.', note: '집행' },
          { rank: 4, name: '비토 제노베제', celebSlug: 'vito-genovese', line: '1934년 페르디난도 보치아를 죽인 뒤 이탈리아로 도망쳤다.', note: '살인' },
          { rank: 5, name: '럭키 루치아노', celebSlug: 'lucky-luciano', line: '마세라아를 식당에서 쏘게 하고 마란자노도 사무실에서 죽이게 했다.', note: '제거' },
          { rank: 6, name: '딘 오배니언', celebSlug: "dean-o'banion", line: '시카고 북부에서 밀주 트럭을 빼앗고 상대 조직을 총으로 밀어냈다.', note: '탈취' },
          { rank: 7, name: '범피 존슨', celebSlug: 'bumpy-johnson', line: '할렘 숫자판을 지키며 침입자를 폭력으로 막았다.', note: '폭력' },
          { rank: 8, name: '조니 토리오', celebSlug: 'johnny-torrio', line: '밀주 구역을 지키려고 상대 조직을 무력으로 눌렀다.', note: '무력' },
        ],
      },
      {
        name: '신화',
        entries: [
          { rank: 1, name: '알 카포네', celebSlug: 'al-capone', line: '공공의 적 1호로 지목됐다. 경기장과 식당을 자기 집처럼 드나들었다.', note: '공적' },
          { rank: 2, name: '존 고티', celebSlug: 'john-gotti', line: '법정에서 세 번 빠져나왔다. 신문이 그를 테플론 돈이라 불렀다.', note: '테플론' },
          { rank: 3, name: '럭키 루치아노', celebSlug: 'lucky-luciano', line: '1929년 목을 그인 채 길에 버려졌고 살아났다.', note: '생존' },
          { rank: 4, name: '벅시 시겔', celebSlug: 'bugsy-siegel', line: '할리우드 스타들과 어울리며 사막에 카지노 도시를 이야기했다.', note: '할리우드' },
          { rank: 5, name: '마이어 랜스키', celebSlug: 'meyer-lansky', line: '조직의 회계사로 불렸고 큰 죄목으로는 거의 감옥에 가지 않았다.', note: '회계' },
          { rank: 6, name: '스테파니 세인트 클레어', celebSlug: 'stephanie-st.-clair', line: '신문에 광고를 내 더치 슐츠를 고발했다. 할렘의 여왕으로 불렸다.', note: '여왕' },
          { rank: 7, name: '카를로 감비노', celebSlug: 'carlo-gambino', line: '보스 자리 19년을 감옥 없이 버텼다. 집에서 심장마비로 죽었다.', note: '침묵' },
          { rank: 8, name: '범피 존슨', celebSlug: 'bumpy-johnson', line: '할렘 암흑가를 수십 년 이끈 보스로 이름이 남았다.', note: '할렘' },
          { rank: 9, name: '딘 오배니언', celebSlug: "dean-o'banion", line: '꽃집을 운영하는 갱 보스로 알려졌다. 그 가게에서 총을 맞았다.', note: '꽃집' },
          { rank: 10, name: '조니 토리오', celebSlug: 'johnny-torrio', line: '카포네를 후계로 키운 스승으로 이름이 남았다.', note: '스승' },
        ],
      },
      {
        name: '몰락',
        entries: [
          { rank: 1, name: '알 카포네', celebSlug: 'al-capone', line: '탈세 혐의로 유죄 판결을 받고 앨커트래즈에 갇혔다.', note: '탈세' },
          { rank: 2, name: '존 고티', celebSlug: 'john-gotti', line: '부하 새미 그라바노가 증언하자 종신형을 받고 감옥에서 죽었다.', note: '배신' },
          { rank: 3, name: '럭키 루치아노', celebSlug: 'lucky-luciano', line: '포주 혐의로 수십 년 형을 받은 뒤 이탈리아로 추방됐다.', note: '추방' },
          { rank: 4, name: '비토 제노베제', celebSlug: 'vito-genovese', line: '아파라친 회합이 들킨 뒤 마약 혐의로 감옥에서 죽었다.', note: '옥사' },
          { rank: 5, name: '벅시 시겔', celebSlug: 'bugsy-siegel', line: '베벌리힐스 집에서 창문으로 총을 맞고 죽었다.', note: '암살' },
          { rank: 6, name: '딘 오배니언', celebSlug: "dean-o'banion", line: '자기 꽃집에서 세 사람에게 총을 맞고 죽었다.', note: '피살' },
          { rank: 7, name: '조니 토리오', celebSlug: 'johnny-torrio', line: '아파트 앞에서 총을 맞은 뒤 조직을 카포네에게 넘기고 물러났다.', note: '은퇴' },
          { rank: 8, name: '마이어 랜스키', celebSlug: 'meyer-lansky', line: '카스트로가 하바나를 접수하자 카지노를 잃었다. 이스라엘도 받아주지 않았다.', note: '추방' },
          { rank: 9, name: '스테파니 세인트 클레어', celebSlug: 'stephanie-st.-clair', line: '슐츠와의 전쟁 뒤 숫자판에서 손을 떼고 할렘에서 물러났다.', note: '은퇴' },
          { rank: 10, name: '범피 존슨', celebSlug: 'bumpy-johnson', line: '감옥을 들락거리다 1968년 할렘에서 죽었다.', note: '옥고' },
        ],
      },
    ],
  },
  'pirates-top10': {
    keep: '악명',
    extra: [
      {
        name: '함대',
        entries: [
          { rank: 1, name: '정일수', celebSlug: 'ching-shih', line: '홍기방 배 300척이 넘게 남중국해를 장악했다.', note: '300척' },
          { rank: 2, name: '헨리 모건', celebSlug: 'henry-morgan', line: '배 서른여섯 척과 병력 2천을 모아 파나마로 갔다.', note: '원정' },
          { rank: 3, name: '바솔로뮤 로버츠', celebSlug: 'bartholomew-roberts', line: '로열 포춘을 기함으로 여러 척을 거느리고 대서양 상선을 나포했다.', note: '기함' },
          { rank: 4, name: '프랜시스 드레이크', celebSlug: 'francis-drake', line: '카디스 항에 함대를 몰아 스페인 배를 불태웠다.', note: '카디스' },
          { rank: 5, name: '에드워드 티치', celebSlug: 'blackbeard', line: '퀸 앤스 리벤지를 기함으로 작은 함대를 이끌고 찰스턴을 막았다.', note: '봉쇄' },
          { rank: 6, name: '앤 보니', celebSlug: 'anne-bonny', line: '캘리코 잭의 슬루프 한 척에서 싸웠다.', note: '단함' },
        ],
      },
      {
        name: '전설',
        entries: [
          { rank: 1, name: '에드워드 티치', celebSlug: 'blackbeard', line: '죽은 뒤 목이 메이너드 뱃전에 걸렸다. 그 머리가 버지니아로 실려 갔다.', note: '수급' },
          { rank: 2, name: '프랜시스 드레이크', celebSlug: 'francis-drake', line: '엘리자베스 여왕이 골든하인드 갑판에서 그를 기사로 서임했다.', note: '서임' },
          { rank: 3, name: '헨리 모건', celebSlug: 'henry-morgan', line: '파나마를 불태운 이야기가 책으로 퍼져 런던에서 유명해졌다.', note: '간행' },
          { rank: 4, name: '정일수', celebSlug: 'ching-shih', line: '청이 함대를 꺾지 못하고 사면을 제안했다. 그녀는 조건을 달고 받았다.', note: '사면' },
          { rank: 5, name: '앤 보니', celebSlug: 'anne-bonny', line: '재판에서 캘리코 잭에게 남자처럼 싸웠으면 죽지 않았을 것이라고 말했다.', note: '법정' },
          { rank: 6, name: '바솔로뮤 로버츠', celebSlug: 'bartholomew-roberts', line: '빨간 조끼를 입고 싸우다 카보 로페스 앞바다에서 쓰러졌다.', note: '홍의' },
        ],
      },
      {
        name: '최후',
        entries: [
          { rank: 1, name: '에드워드 티치', celebSlug: 'blackbeard', line: '오크라코크 모래톱에서 메이너드와 싸우다 스무 군데를 맞고 쓰러졌다.', note: '전사' },
          { rank: 2, name: '바솔로뮤 로버츠', celebSlug: 'bartholomew-roberts', line: '카보 로페스 앞바다에서 영국 군의 포도탄을 맞고 쓰러졌다.', note: '전사' },
          { rank: 3, name: '앤 보니', celebSlug: 'anne-bonny', line: '교수형을 선고받고 임신했다고 하여 형을 미뤘다. 그 뒤 기록이 끊겼다.', note: '실종' },
          { rank: 4, name: '프랜시스 드레이크', celebSlug: 'francis-drake', line: '포르토벨로 앞바다에서 이질로 죽고 바다에 묻혔다.', note: '수장' },
          { rank: 5, name: '헨리 모건', celebSlug: 'henry-morgan', line: '자메이카 부총독으로 살다 포트로얄에서 죽었다.', note: '병사' },
          { rank: 6, name: '정일수', celebSlug: 'ching-shih', line: '사면을 받고 도박장을 열었다. 마카오에서 죽었다.', note: '말년' },
        ],
      },
    ],
  },
  'wild-west-top10': {
    keep: '사격',
    extra: [
      {
        name: '악명',
        entries: [
          { rank: 1, name: '제시 제임스', celebSlug: 'jesse-james', line: '중서부 은행과 열차를 털어 현상금 수배자가 됐다.', note: '현상' },
          { rank: 2, name: '빌리 더 키드', celebSlug: 'billy-the-kid', line: '링컨 카운티 전쟁에서 보안관 브래디를 죽였다.', note: '사살' },
          { rank: 3, name: '닥 홀리데이', celebSlug: 'doc-holliday', line: '도박장에서 사람을 쏘고 툼스톤까지 떠돌았다.', note: '도박' },
          { rank: 4, name: '와일드 빌 히콕', celebSlug: 'wild-bill-hickok', line: '결투와 보안관 일로 이름이 신문에 올랐다.', note: '결투' },
          { rank: 5, name: '와이어트 어프', celebSlug: 'wyatt-earp', line: 'OK 목장 이후 클랜튼 일당을 쫓아 보복 원정을 했다.', note: '보복' },
          { rank: 6, name: '애니 오클리', celebSlug: 'annie-oakley', line: '서부쇼에서 총을 쏘아 유럽 왕들 앞에서 이름을 알렸다.', note: '공연' },
        ],
      },
      {
        name: '정의',
        entries: [
          { rank: 1, name: '와이어트 어프', celebSlug: 'wyatt-earp', line: '툼스톤 보안관 대리로 OK 목장 앞에서 클랜튼 일당과 맞섰다.', note: '보안' },
          { rank: 2, name: '와일드 빌 히콕', celebSlug: 'wild-bill-hickok', line: '에이빌린 보안관으로 거리의 총을 단속했다.', note: '치안' },
          { rank: 3, name: '닥 홀리데이', celebSlug: 'doc-holliday', line: '어프의 편으로 임시 보안관이 되어 OK 목장에 섰다.', note: '임시' },
          { rank: 4, name: '애니 오클리', celebSlug: 'annie-oakley', line: '허스트 신문이 그녀를 도둑으로 몰자 소송을 내 이겼다.', note: '소송' },
          { rank: 5, name: '빌리 더 키드', celebSlug: 'billy-the-kid', line: '팻 개릿 보안관에게 쫓기다 포트섬너에서 죽었다.', note: '추격' },
          { rank: 6, name: '제시 제임스', celebSlug: 'jesse-james', line: '미주리 주지사가 현상금을 걸었고 로버트 포드가 그를 쏘았다.', note: '현상' },
        ],
      },
      {
        name: '전설',
        entries: [
          { rank: 1, name: '와일드 빌 히콕', celebSlug: 'wild-bill-hickok', line: '데드우드 포커 테이블에서 에이스와 에이트를 들고 등 뒤에서 총을 맞았다.', note: '포커' },
          { rank: 2, name: '빌리 더 키드', celebSlug: 'billy-the-kid', line: '포트섬너 어둠 속에서 팻 개릿이 그를 쏘았다.', note: '암실' },
          { rank: 3, name: '제시 제임스', celebSlug: 'jesse-james', line: '집에 걸린 액자를 고치다 로버트 포드에게 후두부를 맞았다.', note: '배신' },
          { rank: 4, name: '와이어트 어프', celebSlug: 'wyatt-earp', line: '툼스톤 결투 이후 오래 살며 OK 목장 이야기를 직접 전했다.', note: '증언' },
          { rank: 5, name: '닥 홀리데이', celebSlug: 'doc-holliday', line: '결핵을 않으며 총을 들고 어프와 함께 싸웠다. 글렌우드스프링스에서 죽었다.', note: '결핵' },
          { rank: 6, name: '애니 오클리', celebSlug: 'annie-oakley', line: '시팅 불이 그녀를 리틀 슈어샷이라 불렀다.', note: '별명' },
        ],
      },
    ],
  },
  'hackers-top10': {
    keep: '파괴',
    extra: [
      {
        name: '건설',
        entries: [
          { rank: 1, name: '스티브 잡스', celebSlug: 'steve-jobs', line: '애플을 세우고 매킨토시와 아이폰을 냈다.', note: '창업' },
          { rank: 2, name: '존 드레이퍼', celebSlug: 'john-draper', line: '블루박스로 장거리망의 빈틈을 열었다. 뒤에 소프트웨어를 만들었다.', note: '제작' },
          { rank: 3, name: '로버트 모리스', celebSlug: 'robert-tappan-morris', line: '웜 사건 뒤 MIT 교수가 되어 분산 시스템을 가르쳤다.', note: '교수' },
          { rank: 4, name: '로이드 블랭큰십', celebSlug: 'loyd-blankenship', line: '해커 선언문을 써서 해커가 지켜야 할 말을 남겼다.', note: '선언' },
          { rank: 5, name: '케빈 미트닉', celebSlug: 'kevin-mitnick', line: '출소 뒤 보안 컨설팅 회사를 열었다.', note: '컨설팅' },
          { rank: 6, name: '케빈 폴슨', celebSlug: 'kevin-poulsen', line: '출소 뒤 보안 기자가 되어 해킹 사건을 기사로 썼다.', note: '기자' },
          { rank: 7, name: '마이클 칼스', celebSlug: 'michael-calce', line: '출소 뒤 보안 컨설턴트로 일했다.', note: '전업' },
          { rank: 8, name: '오넬 데 구즈만', celebSlug: 'onel-de-guzman', line: '마닐라 컴퓨터 학원에서 메일 웜 프로그램을 짰다.', note: '코딩' },
        ],
      },
      {
        name: '추적',
        entries: [
          { rank: 1, name: '케빈 미트닉', celebSlug: 'kevin-mitnick', line: 'FBI가 2년 쫓았고 쓰토무 시모무라가 그를 찾아냈다. 1995년 롤리에서 잡혔다.', note: '수배' },
          { rank: 2, name: '케빈 폴슨', celebSlug: 'kevin-poulsen', line: 'FBI 수배자가 되어 열여덟 달을 숨었다. 1991년 잡혔다.', note: '도피' },
          { rank: 3, name: '마이클 칼스', celebSlug: 'michael-calce', line: '야후 공격 뒤 캐나다와 미국이 그를 쫓았다. 2000년 잡혔다.', note: '검거' },
          { rank: 4, name: '로버트 모리스', celebSlug: 'robert-tappan-morris', line: '웜의 작성자로 드러나 컴퓨터 사기 금지법으로 유죄 판결을 받았다.', note: '기소' },
          { rank: 5, name: '오넬 데 구즈만', celebSlug: 'onel-de-guzman', line: 'ILOVEYOU의 작성자로 지목되어 마닐라에서 조사를 받았다.', note: '조사' },
          { rank: 6, name: '존 드레이퍼', celebSlug: 'john-draper', line: '무료 전화 혐의로 여러 번 체포됐다.', note: '체포' },
          { rank: 7, name: '로이드 블랭큰십', celebSlug: 'loyd-blankenship', line: '해킹 혐의로 잡혀 감옥에서 선언문을 썼다.', note: '투옥' },
          { rank: 8, name: '스티브 잡스', celebSlug: 'steve-jobs', line: '워즈니악과 블루박스를 팔았다.', note: '판매' },
        ],
      },
      {
        name: '신화',
        entries: [
          { rank: 1, name: '스티브 잡스', celebSlug: 'steve-jobs', line: '집 차고에서 애플을 시작했다. 뒤에 아이폰을 내놓았다.', note: '차고' },
          { rank: 2, name: '케빈 미트닉', celebSlug: 'kevin-mitnick', line: '콘도르라는 이름으로 신문 1면을 차지했다.', note: '콘도르' },
          { rank: 3, name: '존 드레이퍼', celebSlug: 'john-draper', line: '캡틴 크런치 호루라기로 장거리망을 열었다는 이야기가 해커들 사이에 퍼졌다.', note: '호각' },
          { rank: 4, name: '로이드 블랭큰십', celebSlug: 'loyd-blankenship', line: '해커 선언문이 프랙에 실렸다.', note: '프랙' },
          { rank: 5, name: '로버트 모리스', celebSlug: 'robert-tappan-morris', line: '인터넷을 멈춘 첫 웜의 작성자로 남았다.', note: '최초' },
          { rank: 6, name: '오넬 데 구즈만', celebSlug: 'onel-de-guzman', line: 'ILOVEYOU라는 제목의 메일이 전 세계로 퍼졌다.', note: '메일' },
          { rank: 7, name: '마이클 칼스', celebSlug: 'michael-calce', line: '열다섯 마피아보이가 야후를 멈췄다는 이야기가 남았다.', note: '소년' },
          { rank: 8, name: '케빈 폴슨', celebSlug: 'kevin-poulsen', line: '라디오를 장악하고 포르쉐를 가져간 해커로 남았다.', note: '포르쉐' },
        ],
      },
    ],
  },
  'spies-top10': {
    keep: '침투',
    extra: [
      {
        name: '배신',
        entries: [
          { rank: 1, name: '스튜어트 멘지스', celebSlug: 'stewart-menzies', line: '킴 필비가 MI6 안에서 소련에 정보를 넘기는 동안 국장을 맡았다.', note: '필비' },
          { rank: 2, name: '엘리 코헨', celebSlug: 'eli-cohen', line: '시리아 장성들 사이에서 동지 행세를 하다 발각됐다. 다마스쿠스에서 교수형에 처해졌다.', note: '처형' },
          { rank: 3, name: '이세르 하렐', celebSlug: 'isser-harel', line: '이집트의 독일 과학자를 겨냥한 작전을 두고 벤구리온과 싸운 뒤 사임했다.', note: '사임' },
          { rank: 4, name: '윌리엄 도너번', celebSlug: 'william-j-donovan', line: '전쟁이 끝나자 백악관이 OSS를 해체했다. 그는 반대해도 막지 못했다.', note: '해체' },
        ],
      },
      {
        name: '신화',
        entries: [
          { rank: 1, name: '엘리 코헨', celebSlug: 'eli-cohen', line: '다마스쿠스 교수형이 라디오로 중계됐다.', note: '중계' },
          { rank: 2, name: '토니 멘데즈', celebSlug: 'tony-mendez', line: '가짜 영화사로 테헤란을 빠져나온 이야기가 나중에 영화가 됐다.', note: '아르고' },
          { rank: 3, name: '이세르 하렐', celebSlug: 'isser-harel', line: '아이히만을 아르헨티나에서 잡아 예루살렘 법정에 세웠다.', note: '재판' },
          { rank: 4, name: '윌리엄 도너번', celebSlug: 'william-j-donovan', line: '와일드 빌로 불리며 전략사무국을 이끌었다.', note: '별명' },
          { rank: 5, name: '맨스필드 스미스커밍', celebSlug: 'mansfield-smith-cumming', line: '서류에 C라고만 서명했다. 그 이니셜이 MI6 국장의 전통이 됐다.', note: '서명' },
          { rank: 6, name: '메이르 다간', celebSlug: 'meir-dagan', line: '애꾸 국장으로 알려졌고 이란 핵을 막은 사람으로 불렸다.', note: '애꾸' },
          { rank: 7, name: '스튜어트 멘지스', celebSlug: 'stewart-menzies', line: '울트라 암호를 작전에 쓴 국장으로 남았다.', note: '울트라' },
          { rank: 8, name: '레우벤 실로아흐', celebSlug: 'reuven-shiloah', line: '모사드의 첫 국장으로 남았다.', note: '초대' },
        ],
      },
      {
        name: '실체',
        entries: [
          { rank: 1, name: '윌리엄 도너번', celebSlug: 'william-j-donovan', line: '전략사무국을 세워 전시 정보 조직을 처음 만들었다.', note: '창설' },
          { rank: 2, name: '맨스필드 스미스커밍', celebSlug: 'mansfield-smith-cumming', line: '1909년 해군 정보장교로 해외 비밀정보국을 맡았다.', note: '개국' },
          { rank: 3, name: '레우벤 실로아흐', celebSlug: 'reuven-shiloah', line: '분산된 정보 조직을 모아 모사드로 재편하고 초대 국장을 맡았다.', note: '재편' },
          { rank: 4, name: '스튜어트 멘지스', celebSlug: 'stewart-menzies', line: '2차대전 내내 MI6를 이끌며 블레츨리 파크와 작전이 만나게 했다.', note: '전시' },
          { rank: 5, name: '이세르 하렐', celebSlug: 'isser-harel', line: '신베트와 모사드를 함께 지휘하며 기관을 키웠다.', note: '겸임' },
          { rank: 6, name: '메이르 다간', celebSlug: 'meir-dagan', line: '모사드를 현장 위주로 다시 짜고 8년 이끌었다.', note: '개편' },
          { rank: 7, name: '토니 멘데즈', celebSlug: 'tony-mendez', line: 'CIA 위장 기술을 담당하며 테헤란 탈출을 실행했다.', note: '실행' },
          { rank: 8, name: '엘리 코헨', celebSlug: 'eli-cohen', line: '기관장이 아니라 현장 요원으로 다마스쿠스에 살았다.', note: '현장' },
        ],
      },
    ],
  },
  'special-forces-top10': {
    keep: '침투',
    extra: [
      {
        name: '전설',
        entries: [
          { rank: 1, name: '데이비드 스털링', celebSlug: 'david-stirling', line: '북아프리카에서 소규모 부대로 비행장을 습격하는 부대를 만들었다.', note: '창설' },
          { rank: 2, name: '윌리엄 맥레이븐', celebSlug: 'william-mcraven', line: '빈 라덴이 숨은 집을 급습하는 작전을 짠 사령관으로 이름이 남았다.', note: '급습' },
          { rank: 3, name: '리처드 마신코', celebSlug: 'richard-marcinko', line: '로그 워리어라는 이름으로 회고록을 냈다.', note: '회고' },
          { rank: 4, name: '울리히 베게너', celebSlug: 'ulrich-wegener', line: '모가디슈에서 납치기를 기습해 인질을 빼냈다.', note: '구출' },
          { rank: 5, name: '찰리 벡위드', celebSlug: 'charles-beckwith', line: '영국 SAS를 본받아 델타포스를 세웠다.', note: '델타' },
          { rank: 6, name: '조영주', celebSlug: 'cho-young-joo', line: '아덴만 여명 작전으로 청해부대 함장 이름이 알려졌다.', note: '여명' },
          { rank: 7, name: '크리스티앙 프루토', celebSlug: 'christian-prouteau', line: '프랑스 헌병 특공대 GIGN을 창설했다.', note: '창설' },
          { rank: 8, name: '백문오', celebSlug: 'baek-mun-oh', line: '특전사의 모체가 된 제1전투단을 창설했다.', note: '모체' },
          { rank: 9, name: '장인표', celebSlug: 'jang-in-pyo', line: '해군 수중파괴대 초대 대장을 맡았다.', note: '초대' },
        ],
      },
      {
        name: '실전',
        entries: [
          { rank: 1, name: '울리히 베게너', celebSlug: 'ulrich-wegener', line: '1977년 모가디슈 공항에서 납치기를 기습해 인질 86명을 빼냈다.', note: '기습' },
          { rank: 2, name: '조영주', celebSlug: 'cho-young-joo', line: '소말리아 해역에서 삼호주얼리호에 잠입해 선원 21명을 구했다.', note: '구출' },
          { rank: 3, name: '데이비드 스털링', celebSlug: 'david-stirling', line: '사막에서 직접 부대를 이끌고 독일 후방 비행장을 습격했다.', note: '습격' },
          { rank: 4, name: '크리스티앙 프루토', celebSlug: 'christian-prouteau', line: '지부티 로야다에서 납치된 통학버스를 탈환했다.', note: '탈환' },
          { rank: 5, name: '윌리엄 맥레이븐', celebSlug: 'william-mcraven', line: '아보타바드 급습을 합동특수작전사령관으로 지휘했다.', note: '지휘' },
          { rank: 6, name: '찰리 벡위드', celebSlug: 'charles-beckwith', line: '베트남에서 특수전을 했고 테헤란 구출은 사막에서 멈췄다.', note: '실패' },
          { rank: 7, name: '리처드 마신코', celebSlug: 'richard-marcinko', line: '베트남에서 SEAL로 싸웠고 뒤에 6팀을 세웠다.', note: '참전' },
          { rank: 8, name: '백문오', celebSlug: 'baek-mun-oh', line: '제1전투단을 창설하고 그 부대를 지휘했다.', note: '창설' },
          { rank: 9, name: '장인표', celebSlug: 'jang-in-pyo', line: '1955년 수중파괴대를 세우고 초대 대장을 맡았다.', note: '창설' },
        ],
      },
      {
        name: '신화',
        entries: [
          { rank: 1, name: '데이비드 스털링', celebSlug: 'david-stirling', line: '포로로 잡힌 뒤 탈출을 반복하다 콜디츠에 갇혔다.', note: '탈주' },
          { rank: 2, name: '리처드 마신코', celebSlug: 'richard-marcinko', line: '레드 셀을 만들어 미 해군 기지를 몰래 뚫고 들어갔다.', note: '침투' },
          { rank: 3, name: '윌리엄 맥레이븐', celebSlug: 'william-mcraven', line: '빈 라덴 급습의 사령관으로 불렸다.', note: '상징' },
          { rank: 4, name: '찰리 벡위드', celebSlug: 'charles-beckwith', line: '테헤란 인질을 빼내려다 사막에서 헬기가 부딪혀 작전이 멈췄다.', note: '추락' },
          { rank: 5, name: '울리히 베게너', celebSlug: 'ulrich-wegener', line: '모가디슈 구출로 GSG 9 이름을 세계에 알렸다.', note: '명성' },
          { rank: 6, name: '조영주', celebSlug: 'cho-young-joo', line: '아덴만 여명으로 청해부대 이름을 알렸다.', note: '여명' },
          { rank: 7, name: '크리스티앙 프루토', celebSlug: 'christian-prouteau', line: '대테러 헌병대의 창설자로 불렸다.', note: '창설' },
          { rank: 8, name: '백문오', celebSlug: 'baek-mun-oh', line: '특전사 모체를 세운 장교로 남았다.', note: '기원' },
          { rank: 9, name: '장인표', celebSlug: 'jang-in-pyo', line: '해군 수중파괴 초대 대장으로 남았다.', note: '기원' },
        ],
      },
    ],
  },
  'logistics-top10': {
    keep: '속도',
    extra: [
      {
        name: '규모',
        entries: [
          { rank: 1, name: '클라우스 춤빙켈', celebSlug: 'klaus-zumwinkel', line: '도이체포스트가 DHL을 사들이게 해 세계 물류 그룹으로 키웠다.', note: '인수' },
          { rank: 2, name: '짐 케이시', celebSlug: 'james-e-casey', line: 'UPS를 미국 전역 트럭망으로 키웠다.', note: '전국' },
          { rank: 3, name: '프레드 스미스', celebSlug: 'frederick-w-smith', line: '페덱스를 세계 항공 특송으로 키웠다.', note: '세계' },
          { rank: 4, name: '프랑크 아펠', celebSlug: 'frank-appel', line: '도이체포스트 DHL을 15년 이끌며 세계망을 유지했다.', note: '15년' },
          { rank: 5, name: '마이클 에스큐', celebSlug: 'michael-eskew', line: 'UPS 해외 사업과 항공 허브를 넓혔다.', note: '해외' },
          { rank: 6, name: '토비아스 마이어', celebSlug: 'tobias-meyer', line: 'DHL 그룹 최고경영자를 맡아 세계 물류망을 운영했다.', note: '총괄' },
          { rank: 7, name: '데이비드 애브니', celebSlug: 'david-abney', line: 'UPS 회장으로 세계 배송망을 맡았다.', note: '회장' },
          { rank: 8, name: '켄트 넬슨', celebSlug: 'kent-c-nelson', line: 'UPS 추적 시스템을 전국 기사에게 깔았다.', note: '전국' },
          { rank: 9, name: '래리 힐블롬', celebSlug: 'larry-hillblom', line: 'DHL을 태평양과 아시아로 넓혔다.', note: '아시아' },
          { rank: 10, name: '마이클 배시', celebSlug: 'michael-d-basch', line: '멤피스 거점으로 페덱스 화물 규모를 받쳤다.', note: '허브' },
        ],
      },
      {
        name: '노동',
        entries: [
          { rank: 1, name: '제임스 P. 호파', celebSlug: 'james-p-hoffa', line: '팀스터스 위원장으로 23년 동안 UPS와 화물 노조를 이끌었다.', note: '노조' },
          { rank: 2, name: '숀 오브라이언', celebSlug: "sean-o'brien", line: '팀스터스 위원장으로 UPS 계약을 협상했다.', note: '협상' },
          { rank: 3, name: '데이비드 애브니', celebSlug: 'david-abney', line: '시간제 하역으로 시작해 UPS 회장까지 올랐다.', note: '하역' },
          { rank: 4, name: '조지 케이시', celebSlug: 'george-washington-casey', line: '열네 살 배달원으로 시작해 UPS 이사가 됐다.', note: '배달' },
          { rank: 5, name: '짐 케이시', celebSlug: 'james-e-casey', line: '심부름꾼을 모아 회사를 열었고 기사 조직을 전국으로 키웠다.', note: '기사' },
          { rank: 6, name: '켄트 넬슨', celebSlug: 'kent-c-nelson', line: '휴대 스캐너를 기사 손에 쥐어 주었다.', note: '스캐너' },
          { rank: 7, name: '클로드 라이언', celebSlug: 'claude-ryan', line: '케이시와 함께 배달원을 고용해 회사를 열었다.', note: '고용' },
          { rank: 8, name: '프레드 스미스', celebSlug: 'frederick-w-smith', line: '멤피스 허브 밤 노동으로 익일 배송을 돌렸다.', note: '야간' },
          { rank: 9, name: '마이클 에스큐', celebSlug: 'michael-eskew', line: 'UPS 기사와 허브 인력을 해외로 넓혔다.', note: '인력' },
          { rank: 10, name: '프랑크 아펠', celebSlug: 'frank-appel', line: 'DHL 그룹의 현장 노동과 배송망을 15년 맡았다.', note: '현장' },
        ],
      },
      {
        name: '지배',
        entries: [
          { rank: 1, name: '프레드 스미스', celebSlug: 'frederick-w-smith', line: '익일 항공 배송을 페덱스가 먼저 쥐게 했다.', note: '선점' },
          { rank: 2, name: '짐 케이시', celebSlug: 'james-e-casey', line: '미국 지상 택배의 뼈대를 UPS가 쥐게 했다.', note: '지상' },
          { rank: 3, name: '클라우스 춤빙켈', celebSlug: 'klaus-zumwinkel', line: '도이체포스트로 DHL을 사들여 유럽 물류를 쥐었다.', note: '유럽' },
          { rank: 4, name: '제임스 P. 호파', celebSlug: 'james-p-hoffa', line: '팀스터스로 미국 화물 운송 노동을 쥐었다.', note: '교섭' },
          { rank: 5, name: '프랑크 아펠', celebSlug: 'frank-appel', line: 'DHL 그룹을 15년 이끌었다.', note: '장기' },
          { rank: 6, name: '마이클 에스큐', celebSlug: 'michael-eskew', line: 'UPS 회장으로 세계 물류 계약을 늘렸다.', note: '계약' },
          { rank: 7, name: '래리 힐블롬', celebSlug: 'larry-hillblom', line: 'DHL 지분을 쥐고 태평양 노선을 좌우했다.', note: '지분' },
          { rank: 8, name: '숀 오브라이언', celebSlug: "sean-o'brien", line: '팀스터스 위원장으로 UPS 협상을 주도했다.', note: '주도' },
          { rank: 9, name: '토비아스 마이어', celebSlug: 'tobias-meyer', line: 'DHL 그룹 최고경영자를 맡아 세계망을 운영했다.', note: '총수' },
          { rank: 10, name: '데이비드 애브니', celebSlug: 'david-abney', line: 'UPS를 회장으로 이끌었다.', note: '회장' },
        ],
      },
    ],
  },
  'payment-top10': {
    keep: '수수료',
    extra: [
      {
        name: '침투',
        entries: [
          { rank: 1, name: '조지프 윌리엄스', celebSlug: 'joseph-p-williams', line: '프레즈노에 카드를 대량으로 뿌렸다.', note: '살포' },
          { rank: 2, name: '앨프리드 블루밍데일', celebSlug: 'alfred-bloomingdale', line: '다이너스 클럽을 미국 전역 식당으로 넓혔다.', note: '전국' },
          { rank: 3, name: '디 호크', celebSlug: 'dee-hock', line: '비자 마크를 세계 가맹점에 붙였다.', note: '가맹' },
          { rank: 4, name: '아제이 방가', celebSlug: 'ajay-banga', line: '마스터카드를 신흥국 상점까지 밀어 넣었다.', note: '신흥' },
          { rank: 5, name: '랠프 리드', celebSlug: 'ralph-t-reed', line: '아멕스 카드를 여행자와 식당에 넣었다.', note: '여행' },
          { rank: 6, name: '프랭크 맥너마라', celebSlug: 'frank-x-mcnamara', line: '뉴욕 식당에 카드 결제를 처음 넣었다.', note: '식당' },
          { rank: 7, name: '칼 힌케', celebSlug: 'karl-hinke', line: '인터뱅크를 은행 150곳으로 넓혔다.', note: '은행' },
          { rank: 8, name: '러셀 호그', celebSlug: 'russell-hogg', line: '골드카드를 내 상위 고객층에 카드를 밀어 넣었다.', note: '골드' },
          { rank: 9, name: '존 버터필드', celebSlug: 'john-butterfield', line: '대륙 횡단 우편 노선으로 서류와 돈을 서부에 넣었다.', note: '우편' },
          { rank: 10, name: '랠프 슈나이더', celebSlug: 'ralph-schneider', line: '다이너스 클럽 가맹 계약을 짜 식당에 카드를 넣었다.', note: '계약' },
        ],
      },
      {
        name: '독점',
        entries: [
          { rank: 1, name: '디 호크', celebSlug: 'dee-hock', line: '비자 규칙을 은행들이 따르게 만들어 카드망을 한 줄로 묶었다.', note: '규약' },
          { rank: 2, name: '아마데오 지아니니', celebSlug: 'amadeo-giannini', line: '캘리포니아 은행을 합병해 뱅크오브아메리카를 서부 최대 은행으로 키웠다.', note: '합병' },
          { rank: 3, name: '칼 힌케', celebSlug: 'karl-hinke', line: '뱅크아메리카드가 독점한 은행 카드망에 맞서 인터뱅크를 만들었다.', note: '대항' },
          { rank: 4, name: '헨리 웰스', celebSlug: 'henry-wells', line: '특송 노선을 모아 아멕스와 웰스파고를 세웠다.', note: '특송' },
          { rank: 5, name: '윌리엄 파고', celebSlug: 'william-fargo', line: '웰스파고로 서부 금 수송을 맡았다.', note: '금송' },
          { rank: 6, name: '하비 골럽', celebSlug: 'harvey-golub', line: '증권과 보험을 팔고 아멕스를 카드 회사에 집중시켰다.', note: '집중' },
          { rank: 7, name: '조지프 윌리엄스', celebSlug: 'joseph-p-williams', line: '뱅크아메리카드가 한동안 은행 카드의 유일한 전국망이었다.', note: '유일' },
          { rank: 8, name: '아제이 방가', celebSlug: 'ajay-banga', line: '마스터카드로 비자 옆에 두 번째 망을 키웠다.', note: '양강' },
          { rank: 9, name: '랠프 리드', celebSlug: 'ralph-t-reed', line: '아멕스 카드로 여행 결제를 아멕스가 쥐게 했다.', note: '여행' },
          { rank: 10, name: '존 버터필드', celebSlug: 'john-butterfield', line: '대륙 횡단 우편 계약을 따냈다.', note: '특허' },
        ],
      },
      {
        name: '신뢰',
        entries: [
          { rank: 1, name: '아마데오 지아니니', celebSlug: 'amadeo-giannini', line: '지진 다음 날 부두에서 금을 내주고 대출했다.', note: '부두' },
          { rank: 2, name: '마셀러스 베리', celebSlug: 'marcellus-berry', line: '여행자 수표를 분실해도 다시 받게 만들었다.', note: '보장' },
          { rank: 3, name: '케네스 셔놀트', celebSlug: 'kenneth-chenault', line: '9·11 다음 날 아멕스 고객 대책을 지휘했다.', note: '위기' },
          { rank: 4, name: '스티븐 스퀘리', celebSlug: 'stephen-squeri', line: '고객 민원에 직접 답하며 아멕스를 이끌었다.', note: '민원' },
          { rank: 5, name: '제임스 파고', celebSlug: 'james-c-fargo', line: '베리에게 여행자 수표를 만들게 해 아멕스 신용을 여행에 실었다.', note: '수표' },
          { rank: 6, name: '헨리 웰스', celebSlug: 'henry-wells', line: '금과 어음을 맡기면 목적지에서 내주는 특송을 열었다.', note: '위탁' },
          { rank: 7, name: '윌리엄 파고', celebSlug: 'william-fargo', line: '웰스파고 마차로 서부 송금을 맡았다.', note: '송금' },
          { rank: 8, name: '랠프 슈나이더', celebSlug: 'ralph-schneider', line: '다이너스 클럽 회원 계약을 변호사로서 짜 가게와 손님을 이었다.', note: '계약' },
          { rank: 9, name: '프랭크 맥너마라', celebSlug: 'frank-x-mcnamara', line: '식당이 카드 전표를 받고 음식을 내주게 했다.', note: '전표' },
          { rank: 10, name: '랠프 리드', celebSlug: 'ralph-t-reed', line: '아멕스 카드로 여행자가 현금 없이 계산하게 했다.', note: '현금' },
        ],
      },
    ],
  },
}

function attachPhotos(entry, photos) {
  const prev = photos.get(entry.celebSlug)
  if (!prev) return entry
  const next = { ...entry }
  if (prev.avatar) next.avatar = prev.avatar
  if (prev.image) next.image = prev.image
  return next
}

const report = []

for (const [folder, spec] of Object.entries(added)) {
  const file = path.join(root, folder, 'ranking-data.json')
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (data.categories.length !== 1) {
    throw new Error(`${folder}: categories=${data.categories.length}, 1축만 있어야 한다`)
  }
  if (data.categories[0].name !== spec.keep) {
    throw new Error(`${folder}: 1축이 ${data.categories[0].name}, 기대 ${spec.keep}`)
  }
  const firstJson = JSON.stringify(data.categories[0])
  const photos = new Map()
  for (const e of data.categories[0].entries) {
    photos.set(e.celebSlug, e)
  }
  for (const cat of spec.extra) {
    data.categories.push({
      name: cat.name,
      entries: cat.entries.map((e) => attachPhotos(e, photos)),
    })
  }
  if (JSON.stringify(data.categories[0]) !== firstJson) {
    throw new Error(`${folder}: 1축이 변했다`)
  }
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  report.push({
    folder,
    axes: data.categories.map((c) => `${c.name} ${c.entries.length}`),
  })
}

console.log(JSON.stringify(report, null, 2))
