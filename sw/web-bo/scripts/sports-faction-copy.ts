export type SportsPersonCopy = {
  slug: string
  name: string
  epithet: string
  epithetEn: string
  lines: [string, string, string]
  linesEn: [string, string, string]
  quote: string
  quoteChunks: string[]
  quoteOrigin: string
}

export type SportsGroupCopy = {
  name: string
  color: string
  tagline: string
  taglineEn: string
  part: number
  people: SportsPersonCopy[]
}

export type SportsEpisodeCopy = {
  folder: 'world-best-2026' | 'nba-21c-club-best'
  loglineEn: string
  outroTitle: string
  outroNote: string
  groups: SportsGroupCopy[]
}

const WORLD_SOURCE = 'https://www.englandfootball.com/articles/2026/Jul/22/jude-bellingham-fifa-world-cup-2026-team-of-the-tournament-20262007'
const LAKERS_SOURCE = 'https://www.nba.com/lakers/history'
const SPURS_SOURCE = 'https://www.nba.com/spurs/history'
const WARRIORS_SOURCE = 'https://www.nba.com/warriors/history'

function creativeOrigin(source: string): string {
  return `팩션용 창작 대사이며 실제 발언 인용이 아님. 출연·역할 근거: ${source}`
}

export const SPORTS_FACTION_COPY: SportsEpisodeCopy[] = [
  {
    folder: 'world-best-2026',
    loglineEn: 'Eleven faces chosen by fans from the 2026 World Cup.',
    outroTitle: '열한 명, 하나의 경기장',
    outroNote: '2026 월드컵 드림 XI',
    groups: [
      {
        name: '골키퍼', color: '#0EA5E9', part: 1,
        tagline: '끝까지 남는 마지막 한 명',
        taglineEn: 'The last man standing',
        people: [
          {
            slug: 'vozinha', name: '보지냐',
            epithet: '마흔의 푸른 장벽', epithetEn: 'The Blue Wall at Forty',
            lines: ['카보베르데의 마지막 방어선', '40세에 맞은 첫 월드컵', '노련함으로 지키는 골문'],
            linesEn: ["Cape Verde's last line", 'A first World Cup at forty', 'Experience guarding the goal'],
            quote: '마흔에 처음 선 월드컵이었다. 나는 골문 앞에서 카보베르데가 이 무대에 어울린다는 걸 끝까지 지켰다.',
            quoteChunks: ['마흔에 처음 선 월드컵이었다.', '나는 골문 앞에서 카보베르데가 이 무대에 어울린다는 걸', '끝까지 지켰다.'],
            quoteOrigin: creativeOrigin(WORLD_SOURCE),
          },
        ],
      },
      {
        name: '수비수', color: '#2563EB', part: 2,
        tagline: '선을 닫고 전진을 여는 네 사람',
        taglineEn: 'Four who close lanes and open attacks',
        people: [
          {
            slug: 'pedro-porro', name: '페드로 포로',
            epithet: '오른쪽을 여는 엔진', epithetEn: 'The Engine on the Right',
            lines: ['오른쪽 측면의 왕복자', '크로스로 여는 공격', '멈추지 않는 전진'],
            linesEn: ['Relentless on the right flank', 'Opening attacks with crosses', 'Always driving forward'],
            quote: '오른쪽 선을 비워두면 내가 찌른다. 상대가 막으러 오면 그 뒤 공간은 이미 우리 것이다.',
            quoteChunks: ['오른쪽 선을 비워두면 내가 찌른다.', '상대가 막으러 오면', '그 뒤 공간은 이미 우리 것이다.'],
            quoteOrigin: creativeOrigin(WORLD_SOURCE),
          },
          {
            slug: 'lisandro-martinez', name: '리산드로 마르티네스',
            epithet: '먼저 읽는 선제 수비', epithetEn: 'The Defender Who Reads First',
            lines: ['전진해서 끊는 센터백', '왼발로 시작하는 빌드업', '몸을 아끼지 않는 압박'],
            linesEn: ['A centre-back who steps in', 'Build-up launched by his left foot', 'Pressure without hesitation'],
            quote: '키로 수비하지 않는다. 먼저 읽고, 더 빨리 들어가고, 끝까지 물러서지 않는다.',
            quoteChunks: ['키로 수비하지 않는다.', '먼저 읽고, 더 빨리 들어가고,', '끝까지 물러서지 않는다.'],
            quoteOrigin: creativeOrigin(WORLD_SOURCE),
          },
          {
            slug: 'dayot-upamecano', name: '다요 우파메카노',
            epithet: '속도를 잠그는 중앙벽', epithetEn: 'The Wall That Locks Down Speed',
            lines: ['속도에 맞서는 속도', '넓은 공간을 지키는 수비', '탈압박으로 잇는 전진'],
            linesEn: ['Speed against speed', 'Defending the wide spaces', 'Turning pressure into progress'],
            quote: '공격수가 속도를 올릴수록 내 판단은 단순해진다. 길을 닫고, 공을 빼앗고, 다시 전진한다.',
            quoteChunks: ['공격수가 속도를 올릴수록', '내 판단은 단순해진다.', '길을 닫고, 공을 빼앗고, 다시 전진한다.'],
            quoteOrigin: creativeOrigin(WORLD_SOURCE),
          },
          {
            slug: 'marc-cucurella', name: '마르크 쿠쿠레야',
            epithet: '왼쪽을 휘젓는 압박자', epithetEn: 'The Pressing Force on the Left',
            lines: ['왼쪽에서 시작하는 압박', '안쪽까지 좁히는 움직임', '공수를 잇는 활동량'],
            linesEn: ['Pressure beginning on the left', 'Movement that folds inside', 'Work rate linking both ends'],
            quote: '왼쪽 선은 내 출발점일 뿐이다. 압박할 때는 앞으로, 공을 돌릴 때는 안으로 들어가 경기를 넓힌다.',
            quoteChunks: ['왼쪽 선은 내 출발점일 뿐이다.', '압박할 때는 앞으로, 공을 돌릴 때는 안으로 들어가', '경기를 넓힌다.'],
            quoteOrigin: creativeOrigin(WORLD_SOURCE),
          },
        ],
      },
      {
        name: '미드필더', color: '#7C3AED', part: 3,
        tagline: '경기의 속도와 방향을 바꾸는 세 축',
        taglineEn: 'Three axes that change pace and direction',
        people: [
          {
            slug: 'rodri', name: '로드리',
            epithet: '경기의 중심축', epithetEn: 'The Axis of the Match',
            lines: ['중앙을 지키는 기준점', '패스로 조절하는 속도', '공수 전환의 첫 판단'],
            linesEn: ['The reference point in midfield', 'Controlling pace through passing', 'The first read in transition'],
            quote: '내가 공을 오래 쥐는 이유는 화려하게 보이기 위해서가 아니다. 다음 패스가 팀 전체를 움직이게 하려는 것이다.',
            quoteChunks: ['내가 공을 오래 쥐는 이유는', '화려하게 보이기 위해서가 아니다.', '다음 패스가 팀 전체를 움직이게 하려는 것이다.'],
            quoteOrigin: creativeOrigin(WORLD_SOURCE),
          },
          {
            slug: 'michael-olise', name: '마이클 올리세',
            epithet: '왼발로 만드는 균열', epithetEn: 'A Left Foot That Cracks Defences',
            lines: ['한 번에 흐름을 바꾸는 터치', '오른쪽에서 파고드는 왼발', '패스와 슛 사이의 선택'],
            linesEn: ['A touch that changes the flow', 'A left foot cutting in from the right', 'Choosing between pass and shot'],
            quote: '한 번의 터치로 수비수의 발을 멈춘다. 그 짧은 틈이 생기면 왼발은 이미 다음 장면을 고른다.',
            quoteChunks: ['한 번의 터치로 수비수의 발을 멈춘다.', '그 짧은 틈이 생기면', '왼발은 이미 다음 장면을 고른다.'],
            quoteOrigin: creativeOrigin(WORLD_SOURCE),
          },
          {
            slug: 'jude-bellingham', name: '주드 벨링엄',
            epithet: '박스까지 달리는 중원', epithetEn: 'The Midfielder Who Reaches the Box',
            lines: ['중원을 가로지르는 추진력', '필요한 곳에 나타나는 움직임', '득점까지 이어지는 침투'],
            linesEn: ['Drive through the middle', 'Movement toward where he is needed', 'Runs that finish in goals'],
            quote: '중원에서 기다릴 생각은 없다. 공이 필요한 곳으로 가고, 골이 필요한 순간에는 박스 안까지 간다.',
            quoteChunks: ['중원에서 기다릴 생각은 없다.', '공이 필요한 곳으로 가고,', '골이 필요한 순간에는 박스 안까지 간다.'],
            quoteOrigin: creativeOrigin(WORLD_SOURCE),
          },
        ],
      },
      {
        name: '공격수', color: '#E11D48', part: 4,
        tagline: '한 번의 틈을 골로 바꾸는 세 칼날',
        taglineEn: 'Three blades that turn one gap into a goal',
        people: [
          {
            slug: 'lionel-messi', name: '리오넬 메시',
            epithet: '마지막 선택의 설계자', epithetEn: 'The Architect of the Final Choice',
            lines: ['공과 함께 바꾸는 방향', '좁은 틈을 읽는 시야', '마지막 패스와 마무리'],
            linesEn: ['Changing direction with the ball', 'Vision inside the smallest gap', 'The final pass and finish'],
            quote: '공이 발에 붙으면 선택지는 많아진다. 나는 가장 짧은 길로 수비를 지나 마지막 한 번을 만든다.',
            quoteChunks: ['공이 발에 붙으면 선택지는 많아진다.', '나는 가장 짧은 길로 수비를 지나', '마지막 한 번을 만든다.'],
            quoteOrigin: creativeOrigin(WORLD_SOURCE),
          },
          {
            slug: 'erling-haaland', name: '엘링 홀란드',
            epithet: '골문을 향한 직선', epithetEn: 'The Straight Line to Goal',
            lines: ['수비 뒤를 노리는 첫걸음', '문전에서 끝내는 힘', '공보다 먼저 도착하는 움직임'],
            linesEn: ['The first step behind the defence', 'Power that finishes in the box', 'Movement arriving before the ball'],
            quote: '공이 오기 전부터 골문까지의 길을 잰다. 한 걸음 먼저 들어가면 수비수는 이미 늦었다.',
            quoteChunks: ['공이 오기 전부터', '골문까지의 길을 잰다.', '한 걸음 먼저 들어가면 수비수는 이미 늦었다.'],
            quoteOrigin: creativeOrigin(WORLD_SOURCE),
          },
          {
            slug: 'kylian-mbappe', name: '킬리안 음바페',
            epithet: '첫걸음의 폭발', epithetEn: 'The Explosion in the First Step',
            lines: ['공간을 찢는 가속', '왼쪽에서 시작하는 돌파', '속도 끝의 침착한 마무리'],
            linesEn: ['Acceleration that tears open space', 'Breaks beginning from the left', 'Calm finishing at full speed'],
            quote: '공간이 보이면 망설이지 않는다. 첫걸음으로 수비를 벌리고, 마지막 걸음은 골문 앞에서 끝낸다.',
            quoteChunks: ['공간이 보이면 망설이지 않는다.', '첫걸음으로 수비를 벌리고,', '마지막 걸음은 골문 앞에서 끝낸다.'],
            quoteOrigin: creativeOrigin(WORLD_SOURCE),
          },
        ],
      },
    ],
  },
  {
    folder: 'nba-21c-club-best',
    loglineEn: 'The defining dynasties of the three winningest NBA franchises since 2000.',
    outroTitle: '세 왕조, 하나의 시대',
    outroNote: '21세기 NBA 3대 제국',
    groups: [
      {
        name: '로스앤젤레스 레이커스', color: '#552583', part: 1,
        tagline: '서로 다른 시대를 우승으로 이은 별들의 계보',
        taglineEn: 'A lineage of stars linking eras through titles',
        people: [
          {
            slug: 'phil-jackson', name: '필 잭슨',
            epithet: '삼각형을 다스린 선승', epithetEn: 'The Zen Master of the Triangle',
            lines: ['세 번의 연속 우승을 지휘', '거대한 자아를 하나로 묶는 감독', '삼각 공격의 질서'],
            linesEn: ['Coach of a three-peat', 'Uniting immense personalities', 'Order through the triangle offence'],
            quote: '우승은 작전판 한 줄로 나오지 않는다. 서로 다른 자존심이 같은 리듬으로 움직일 때 팀이 된다.',
            quoteChunks: ['우승은 작전판 한 줄로 나오지 않는다.', '서로 다른 자존심이 같은 리듬으로 움직일 때', '팀이 된다.'],
            quoteOrigin: creativeOrigin(LAKERS_SOURCE),
          },
          {
            slug: 'kobe-bryant', name: '코비 브라이언트',
            epithet: '마지막 공을 요구한 자', epithetEn: 'The One Who Demanded the Last Shot',
            lines: ['레이커스에서만 보낸 20시즌', '다섯 번의 우승', '마지막 순간을 맡는 집념'],
            linesEn: ['Twenty seasons with one franchise', 'Five championships', 'The will to own the final moment'],
            quote: '마지막 슛이 두렵다면 그 순간을 맡을 수 없다. 나는 실패까지 끌어안고 다시 공을 요구했다.',
            quoteChunks: ['마지막 슛이 두렵다면', '그 순간을 맡을 수 없다.', '나는 실패까지 끌어안고 다시 공을 요구했다.'],
            quoteOrigin: creativeOrigin(LAKERS_SOURCE),
          },
          {
            slug: "shaquille-o'neal", name: '샤킬 오닐',
            epithet: '골밑의 중력', epithetEn: 'Gravity in the Paint',
            lines: ['3연패의 압도적 중심', '림 아래를 바꾼 체격과 힘', '수비 전체를 끌어당긴 존재'],
            linesEn: ['The dominant centre of a three-peat', 'Power that changed the paint', 'A presence pulling in every defender'],
            quote: '골밑에서 내 자리를 내주지 않으면 선택은 둘뿐이다. 버티거나, 비키거나.',
            quoteChunks: ['골밑에서 내 자리를 내주지 않으면', '선택은 둘뿐이다.', '버티거나, 비키거나.'],
            quoteOrigin: creativeOrigin(LAKERS_SOURCE),
          },
          {
            slug: 'lebron-james', name: '르브론 제임스',
            epithet: '코트 전체를 읽는 왕', epithetEn: 'The King Who Reads the Whole Court',
            lines: ['2020년 우승의 중심', '득점과 조율을 겸하는 지휘자', '세대를 잇는 지속력'],
            linesEn: ['The centre of the 2020 title', 'Scorer and floor general', 'Longevity spanning generations'],
            quote: '경기를 지배하려면 득점만 보면 안 된다. 다섯 명이 어디에 있고 다음 장면이 어디서 열릴지 먼저 본다.',
            quoteChunks: ['경기를 지배하려면 득점만 보면 안 된다.', '다섯 명이 어디에 있고', '다음 장면이 어디서 열릴지 먼저 본다.'],
            quoteOrigin: creativeOrigin(LAKERS_SOURCE),
          },
        ],
      },
      {
        name: '샌안토니오 스퍼스', color: '#C4CED4', part: 2,
        tagline: '화려함보다 오래 남은 패스와 기본기',
        taglineEn: 'Passing and fundamentals that outlasted spectacle',
        people: [
          {
            slug: 'gregg-popovich', name: '그레그 포포비치',
            epithet: '패스와 질서의 설계자', epithetEn: 'The Architect of Passing and Order',
            lines: ['다섯 차례 우승을 지휘', '시대에 맞춰 바뀐 시스템', '공유와 규율의 농구'],
            linesEn: ['Coach of five championships', 'A system that evolved with its era', 'Basketball built on trust and discipline'],
            quote: '좋은 농구는 공이 사람보다 빨리 움직인다. 한 명이 멈추면 다섯 명이 멈춘다.',
            quoteChunks: ['좋은 농구는 공이 사람보다 빨리 움직인다.', '한 명이 멈추면', '다섯 명이 멈춘다.'],
            quoteOrigin: creativeOrigin(SPURS_SOURCE),
          },
          {
            slug: 'tim-duncan', name: '팀 던컨',
            epithet: '왕조의 기본기', epithetEn: 'The Fundamentals of a Dynasty',
            lines: ['스퍼스 다섯 우승의 중심', '흔들리지 않는 양쪽 골밑', '조용히 반복한 정답'],
            linesEn: ["The centre of all five Spurs titles", 'Steady at both ends of the floor', 'The right answer, repeated quietly'],
            quote: '기본기는 화려하지 않다. 하지만 같은 자리를 수백 번 지키면 결국 우승이 된다.',
            quoteChunks: ['기본기는 화려하지 않다.', '하지만 같은 자리를 수백 번 지키면', '결국 우승이 된다.'],
            quoteOrigin: creativeOrigin(SPURS_SOURCE),
          },
          {
            slug: 'tony-parker', name: '토니 파커',
            epithet: '페인트존을 가른 속도', epithetEn: 'The Speed That Split the Paint',
            lines: ['수비 사이를 파고든 포인트가드', '속도와 각도로 만든 레이업', '2007 파이널 MVP'],
            linesEn: ['A point guard slicing through defences', 'Finishes built on speed and angles', '2007 Finals MVP'],
            quote: '내 속도는 직선보다 방향에서 나온다. 수비가 한 발 늦는 순간, 페인트존은 열린다.',
            quoteChunks: ['내 속도는 직선보다 방향에서 나온다.', '수비가 한 발 늦는 순간,', '페인트존은 열린다.'],
            quoteOrigin: creativeOrigin(SPURS_SOURCE),
          },
          {
            slug: 'manu-ginobili', name: '마누 지노빌리',
            epithet: '질서를 깨는 왼손', epithetEn: 'The Left Hand That Broke the Pattern',
            lines: ['벤치에서 시작한 경기의 파괴자', '예측을 비트는 왼손', '승리를 위한 역할 수용'],
            linesEn: ['A game-breaker from the bench', 'A left hand that defied prediction', 'Accepting any role required to win'],
            quote: '정해진 길이 막히면 다른 각도로 들어간다. 위험을 피하는 대신 팀이 필요한 틈을 만든다.',
            quoteChunks: ['정해진 길이 막히면', '다른 각도로 들어간다.', '위험을 피하는 대신 팀이 필요한 틈을 만든다.'],
            quoteOrigin: creativeOrigin(SPURS_SOURCE),
          },
        ],
      },
      {
        name: '골든스테이트 워리어스', color: '#1D428A', part: 3,
        tagline: '패스와 슛으로 코트의 경계를 밀어낸 왕조',
        taglineEn: 'The dynasty that pushed the court outward with passing and shooting',
        people: [
          {
            slug: 'steve-kerr', name: '스티브 커',
            epithet: '움직임의 농구를 연 감독', epithetEn: 'The Coach Who Unlocked Motion',
            lines: ['네 차례 우승을 지휘', '패스와 스크린의 연쇄', '슈터를 위한 움직임의 체계'],
            linesEn: ['Coach of four championships', 'Chains of passes and screens', 'A motion system built for shooters'],
            quote: '공은 한 사람보다 빠르다. 다섯 명이 움직이고 슛 하나가 나오면 수비는 누구를 막았는지 잊는다.',
            quoteChunks: ['공은 한 사람보다 빠르다.', '다섯 명이 움직이고 슛 하나가 나오면', '수비는 누구를 막았는지 잊는다.'],
            quoteOrigin: creativeOrigin(WARRIORS_SOURCE),
          },
          {
            slug: 'stephen-curry', name: '스테판 커리',
            epithet: '사거리의 혁명', epithetEn: 'The Range Revolution',
            lines: ['코트의 범위를 넓힌 슈터', '공 없이도 무너뜨리는 수비', '네 차례 우승의 중심'],
            linesEn: ['The shooter who expanded the court', 'Breaking defences without the ball', 'The centre of four championships'],
            quote: '코트의 절반만 공격 범위라고 생각하면 나를 막기 어렵다. 한 걸음 더 물러서도 슛은 같은 리듬이다.',
            quoteChunks: ['코트의 절반만 공격 범위라고 생각하면', '나를 막기 어렵다.', '한 걸음 더 물러서도 슛은 같은 리듬이다.'],
            quoteOrigin: creativeOrigin(WARRIORS_SOURCE),
          },
          {
            slug: 'klay-thompson', name: '클레이 톰프슨',
            epithet: '공을 멈추지 않는 방아쇠', epithetEn: 'The Trigger That Never Stops the Ball',
            lines: ['잡는 순간 올라가는 슛', '최고의 가드를 맡는 수비', '스플래시 브라더스의 반쪽'],
            linesEn: ['A shot released on the catch', 'Defending the toughest guards', 'One half of the Splash Brothers'],
            quote: '공을 오래 잡을 필요는 없다. 발을 맞추고, 올라가고, 수비가 닿기 전에 끝낸다.',
            quoteChunks: ['공을 오래 잡을 필요는 없다.', '발을 맞추고, 올라가고,', '수비가 닿기 전에 끝낸다.'],
            quoteOrigin: creativeOrigin(WARRIORS_SOURCE),
          },
          {
            slug: 'kevin-durant', name: '케빈 듀란트',
            epithet: '수비 위로 솟는 득점', epithetEn: 'Scoring Above the Defence',
            lines: ['어디서든 올라가는 슛', '연속 우승을 완성한 득점력', '두 차례 파이널 MVP'],
            linesEn: ['A shot available from anywhere', 'Scoring that completed back-to-back titles', 'Two-time Finals MVP'],
            quote: '수비가 누구든 림은 같은 높이에 있다. 내가 원하는 지점에 서면 슛은 단순해진다.',
            quoteChunks: ['수비가 누구든 림은 같은 높이에 있다.', '내가 원하는 지점에 서면', '슛은 단순해진다.'],
            quoteOrigin: creativeOrigin(WARRIORS_SOURCE),
          },
        ],
      },
    ],
  },
]
