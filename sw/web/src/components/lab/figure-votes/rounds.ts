type CandidateSeed = {
  id: string;
  people: readonly string[];
  label: string;
  detail: string;
  book?: { title: string; note: string; href: string };
};

type RoundSeed = {
  id: string;
  mode: "duel" | "rank" | "pick";
  pool: string;
  question: string;
  intro: string;
  atlasHref: string;
  candidates: readonly CandidateSeed[];
};

export const FIGURE_VOTE_ROUNDS: readonly RoundSeed[] = [
  {
    id: "agi",
    mode: "duel",
    pool: "인공지능",
    question: "누가 가장 먼저 인류를 AGI로 이끌까?",
    intro: "일단 한 사람을 고르세요. 다른 후보를 만나도 첫 선택이 남을까요?",
    atlasHref: "/explore/faction?section=ai",
    candidates: [
      { id: "openai", people: ["sam-altman"], label: "OpenAI", detail: "ChatGPT로 범용 AI를 대중의 일상에 들인 팀." },
      { id: "anthropic", people: ["dario-amodei"], label: "Anthropic", detail: "Claude를 만드는 팀. 모델의 능력과 안전성을 함께 연구한다." },
      { id: "xai", people: ["elon-musk"], label: "xAI", detail: "Grok을 X와 연결해 AI와 실시간 정보의 접점을 넓힌 팀." },
      { id: "google", people: ["sundar-pichai"], label: "Google", detail: "Gemini를 만들고 검색부터 업무 도구까지 여러 제품에 적용한 팀." },
      { id: "meta", people: ["mark-zuckerberg"], label: "Meta", detail: "Llama 모델의 가중치를 공개해 외부 개발자들이 활용할 길을 넓힌 팀." },
      { id: "deepseek", people: ["liang-wenfeng"], label: "DeepSeek", detail: "DeepSeek-R1으로 추론 모델을 공개한 팀." },
    ],
  },
  {
    id: "duos",
    mode: "rank",
    pool: "기업의 원투펀치",
    question: "최고의 원투펀치는?",
    intro: "함께 이룬 일을 보고 내 TOP 3를 정하세요. 다시 누르면 순위에서 빠집니다.",
    atlasHref: "/explore/faction/home-computer-wars",
    candidates: [
      { id: "microsoft", people: ["bill-gates", "paul-allen"], label: "마이크로소프트", detail: "알테어용 BASIC을 함께 만들고 마이크로소프트를 세웠다." },
      { id: "apple", people: ["steve-jobs", "steve-wozniak"], label: "애플", detail: "워즈니악은 초기 애플 컴퓨터를 설계했고, 잡스는 제품을 팔고 투자자를 모았다." },
      { id: "google", people: ["larry-page", "sergey-brin"], label: "구글", detail: "스탠퍼드에서 함께 만든 검색 엔진을 구글로 키웠다." },
      {
        id: "berkshire", people: ["warren-buffett", "charlie-munger"], label: "버크셔 해서웨이",
        detail: "함께 버크셔를 키웠고, 해마다 주주총회에서 투자자의 질문에 나란히 답했다.",
        book: { title: "워런 버핏 라이브", note: "두 사람이 같은 투자 질문에 어떻게 답했는지 읽어보세요.", href: "https://m.yes24.com/goods/detail/71050619" },
      },
    ],
  },
  {
    id: "odyssey",
    mode: "pick",
    pool: "오디세이아 · 귀향을 도운 인물",
    question: "오디세우스의 귀향에 가장 큰 공을 세운 인물은?",
    intro: "바다에서 구한 사람, 집을 지킨 사람, 마지막에 함께 싸운 사람이 있습니다.",
    atlasHref: "/explore/myth/homer-odyssey",
    candidates: [
      { id: "athena", people: ["athena"], label: "귀향의 조력자", detail: "신들의 회의에서 귀향을 밀어주고, 이타카에 돌아온 그에게 변장과 계책을 마련해준다." },
      { id: "penelope", people: ["penelope"], label: "이타카를 지킨 사람", detail: "낮에 짠 베를 밤마다 풀어 구혼자들의 재혼 압박을 미룬다." },
      { id: "telemachus", people: ["telemachus"], label: "함께 싸운 아들", detail: "아버지의 소식을 찾아 나서고, 돌아온 오디세우스와 함께 구혼자들에 맞선다." },
      { id: "nausicaa", people: ["nausicaa"], label: "낯선 이를 거둔 사람", detail: "난파당한 오디세우스에게 옷과 먹을 것을 주고 왕궁으로 가는 길을 알려준다." },
      { id: "alcinous", people: ["alcinous"], label: "귀향선을 내어준 왕", detail: "오디세우스의 이야기를 듣고 그를 이타카까지 데려갈 배를 내준다." },
      { id: "eumaeus", people: ["eumaeus"], label: "돌아온 주인의 편", detail: "거지로 변장한 오디세우스를 집에 들이고, 정체를 안 뒤에도 곁에서 싸운다." },
    ],
  },
];

export type VotePerson = {
  slug: string;
  name: string;
  portrait: string | null;
  avatar: string | null;
};

export type VoteCandidate = Omit<CandidateSeed, "people"> & { people: VotePerson[] };
export type VoteRound = Omit<RoundSeed, "candidates"> & { candidates: VoteCandidate[] };
