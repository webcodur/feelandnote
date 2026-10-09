import type { ProfessionBookCategory } from '@feelandnote/shared/constants/profession-books'

export interface ProfessionBookOverview {
  title: string
  paragraphs: readonly string[]
}

type Guide = Record<ProfessionBookCategory, Record<'ko' | 'en', ProfessionBookOverview>>

/** 현재 선정 목록을 관통하는 독서 목적. 교재의 순서와 관점·현장 기록의 차이를 설명한다. */
export const PROFESSION_BOOK_GUIDES: Readonly<Record<string, Guide>> = {
  // 조직의 사람·성과·구조를 함께 본다: https://www.hbs.edu/faculty/units/ob/Pages/curriculum.aspx
  leader: {
    train: {
      ko: { title: '자기 관리에서 조직의 운영으로', paragraphs: [
        '지도자의 일을 사람을 움직이는 말솜씨보다 목표와 시간을 관리하고 조직이 일하게 만드는 과정으로 보았습니다. 자기경영에서 출발해 목표 설정, 성과 관리, 회의와 위임, 조직 운영으로 이어지는 책들을 골랐습니다.',
        '드러커의 관리 원리를 그로브의 운영 방식과 함께 읽으면 목표가 실제 업무로 바뀌는 과정을 비교할 수 있습니다. 뒤의 책들은 조직이 커졌을 때 필요한 제도와 관리 체계를 살펴보도록 배치했습니다.',
      ] },
      en: { title: 'From managing yourself to running an organization', paragraphs: [
        'We approach leadership as the work of setting objectives, using time well and enabling an organization to function. The books move from self-management to performance, meetings, delegation and organizational operations.',
        'Reading Drucker alongside Grove connects management principles with everyday operating decisions. The later books examine the systems and practices needed as an organization grows.',
      ] },
    },
    become: {
      ko: { title: '성과를 만드는 사람과 관계를 이해하기', paragraphs: [
        '훈련이 조직을 운영하는 방법을 다룬다면, 이 목록은 사람들이 어떤 조건에서 신뢰하고 협력하는지를 묻습니다. 안전감과 용기, 팀의 갈등, 구성원의 역량, 조직의 지속성을 다루는 서로 다른 접근을 모았습니다.',
        '개인의 의욕만으로 조직의 문제를 설명하지 않도록 사회 구조를 보는 관점도 함께 두었습니다. 한 가지 리더십 유형을 정답으로 삼기보다 각 설명이 어떤 문제를 드러내고 무엇을 놓치는지 비교하며 읽습니다.',
      ] },
      en: { title: 'Understanding the people and relationships behind results', paragraphs: [
        'Where training addresses how organizations operate, this shelf asks what makes people trust and cooperate. It brings together approaches to safety, courage, team conflict, individual capability and organizational endurance.',
        'A perspective on social structures broadens explanations that rely only on motivation or personality. Compare the problems each approach reveals, rather than treating one leadership style as a universal answer.',
      ] },
    },
    about: {
      ko: { title: '서로 다른 현장에서 지도자의 판단을 읽기', paragraphs: [
        '정치 지도자의 전기와 회고록에 기업·군대·스포츠 조직의 경험을 나란히 놓았습니다. 이해관계가 충돌하고 기존 방식이 통하지 않을 때, 지도자가 누구와 협력하고 무엇을 바꾸었는지 읽기 위한 구성입니다.',
        '전기는 바깥의 시선으로, 회고록은 당사자의 설명으로 판단을 보여 줍니다. 결과를 안 뒤의 성공담에만 기대지 않고 당시의 제약과 선택의 대가를 함께 살펴봅니다.',
      ] },
      en: { title: 'Reading leadership decisions across different settings', paragraphs: [
        'Political biographies and memoirs sit alongside accounts from business, military and sporting organizations. Together they show decisions made when interests clash and established methods stop working.',
        'Biographies offer an outside account; memoirs offer a participant’s explanation. Read both for the constraints, alliances and costs of a decision, rather than taking success after the fact as proof of a universal formula.',
      ] },
    },
  },
  // 제도·권력·집단 행동을 먼저 이해한다: https://ocw.mit.edu/courses/17-20-introduction-to-american-politics-spring-2013/pages/syllabus/
  politician: {
    train: {
      ko: { title: '제도를 이해하고 주장과 합의를 다루기', paragraphs: [
        '정치학과 경제학으로 국가·제도·정책의 기본 개념을 익힌 뒤, 전략적 상호작용과 협상, 수사학으로 나아갑니다.',
        '상대의 선택을 예상하고, 이해관계를 조정하고, 청중에게 주장을 설명하는 서로 다른 능력을 교재와 구체적인 방법서로 익힙니다.',
      ] },
      en: { title: 'Understanding institutions, arguments and agreement', paragraphs: [
        'Start with political science and economics to understand states, institutions and policy, then move to strategic interaction, negotiation and rhetoric.',
        'Textbooks and practical guides develop three distinct skills: anticipating others’ choices, reconciling interests and explaining an argument to an audience.',
      ] },
    },
    become: {
      ko: { title: '권력은 어떻게 정당해지고 제한되는가', paragraphs: [
        '정치 수업의 중심을 권력의 정당성, 자유와 평등, 제도의 안정성에 두었습니다. 국가와 시민의 관계를 다룬 고전을 민주주의의 성립과 쇠퇴를 분석하는 현대 저작과 함께 읽도록 모았습니다.',
        '저자들은 같은 질문에 같은 답을 내리지 않습니다. 정치적 입장을 하나로 맞추기보다 각 주장과 반론을 비교하고, 국내 제도를 둘러싼 질문을 국가 사이의 질서까지 넓혀 보는 목록입니다.',
      ] },
      en: { title: 'How power becomes legitimate—and how it is constrained', paragraphs: [
        'This shelf centers on legitimate authority, liberty and equality, and institutional stability. Classics on the relationship between state and citizen sit alongside modern accounts of democracy’s development and decline.',
        'The authors do not agree on the answers. Read their arguments against one another, then extend questions about domestic institutions to the order between states, rather than adopting a single political position from the list.',
      ] },
    },
    about: {
      ko: { title: '정치적 판단이 실제 권력과 만나는 곳', paragraphs: [
        '정치인의 회고, 권력자의 전기, 외교와 국가의 사례, 재판 현장을 다룬 기록을 함께 골랐습니다. 공적인 명분이 실제 결정과 집행 과정에서 어떻게 바뀌는지 읽기 위해서입니다.',
        '당사자가 설명하는 의도와 외부 관찰자가 드러내는 권력의 작동을 나란히 살펴봅니다. 이 목록은 정치인의 성공 비법보다 정책을 움직이는 관계와 제약, 그 결정의 책임을 탐구하는 데 중심을 둡니다.',
      ] },
      en: { title: 'Where political judgment meets the exercise of power', paragraphs: [
        'Political memoirs, biographies and accounts of diplomacy, states and a trial bring public arguments into contact with actual decisions. They reveal how intentions change through negotiation and implementation.',
        'Set participants’ explanations alongside outside accounts of how power works. The focus is on relationships, constraints and responsibility, rather than a collection of politicians’ recipes for success.',
      ] },
    },
  },
  // 전술·작전·정치의 관계: https://www.usmcu.edu/Outreach/Marine-Corps-University-Press/Expeditions-with-MCUP-digital-journal/The-Finely-Honed-Blade/
  commander: {
    train: {
      ko: { title: '목적과 수단을 연결하는 전략의 기초', paragraphs: [
        '전술을 외우기보다 무엇을 위해 어떤 수단을 쓸 것인지 판단하는 틀을 먼저 골랐습니다. 손자와 클라우제비츠의 서로 다른 전쟁 이해에서 출발해 간접 접근, 문제 진단, 상대의 대응을 고려하는 전략적 사고로 이어집니다.',
        '군사 고전과 일반 전략서를 함께 둔 이유는 전장의 구체적인 기술을 넘어 목표·자원·불확실성의 관계를 읽기 위해서입니다. 각 시대의 전쟁 조건을 구분하면서 개념을 비교합니다.',
      ] },
      en: { title: 'Connecting objectives and means through strategy', paragraphs: [
        'The starting point is a framework for choosing means to serve an objective. Sun Tzu and Clausewitz offer different accounts of war, followed by indirect approaches, diagnosis and strategic interaction.',
        'Military classics sit beside general strategy books to examine objectives, resources and uncertainty beyond individual battlefield techniques. Compare their concepts while keeping the conditions of each historical period in view.',
      ] },
    },
    become: {
      ko: { title: '전쟁을 정치와 역사 속에서 바라보기', paragraphs: [
        '작전의 성패만으로 전쟁을 설명하지 않도록 대전략, 전략 사상, 전쟁사, 국제정치를 함께 묶었습니다. 전장에서 이기는 일과 국가의 목적을 이루는 일이 어떤 관계에 있는지 살피는 목록입니다.',
        '긴 역사적 시야와 개별 전쟁의 기록을 오가며 자원과 동맹, 정치적 목표가 전략을 어떻게 제한하는지 읽습니다. 한 이론으로 모든 전쟁을 설명하기보다 서로 다른 설명의 전제와 한계를 비교합니다.',
      ] },
      en: { title: 'Placing war within politics and history', paragraphs: [
        'Grand strategy, strategic thought, military history and international politics widen the view beyond operational success. The central question is how victory on the battlefield relates to a state’s political objectives.',
        'Move between long historical perspectives and particular wars to examine resources, alliances and political constraints. Compare the assumptions and limits of each explanation rather than applying one theory to every conflict.',
      ] },
    },
    about: {
      ko: { title: '지휘관의 계획과 전장의 경험 사이', paragraphs: [
        '지휘관의 일기와 회고에 전쟁을 분석한 역사서, 병사와 여성 참전자의 기록을 함께 두었습니다. 명령을 내리는 자리와 그 명령을 겪는 자리의 차이가 드러나도록 고른 구성입니다.',
        '판단의 배경과 실패를 읽되 회고록의 자기 정당화도 함께 살펴봅니다. 서로 다른 기록을 대조하면서 지휘의 책임, 현장의 불확실성, 공식 전쟁 서술에서 빠지는 경험을 탐구합니다.',
      ] },
      en: { title: 'Between a commander’s plan and experience on the ground', paragraphs: [
        'Commanders’ diaries and memoirs are joined by military histories and accounts from soldiers and women who served. This arrangement reveals the distance between giving an order and living with its consequences.',
        'Read for the circumstances of judgment and failure, including a memoir’s tendency toward self-justification. Contrasting accounts bring command responsibility, uncertainty and experiences omitted from official narratives into view.',
      ] },
    },
  },
  // 고객·시장·사업 모델·조직을 연결한다: https://ocw.mit.edu/courses/15-390-new-enterprises-spring-2013/pages/syllabus/
  entrepreneur: {
    train: {
      ko: { title: '고객의 문제에서 지속 가능한 사업으로', paragraphs: [
        '아이디어가 좋다는 확신보다 고객·수익·비용·경쟁을 연결해서 이해하는 일을 앞에 두었습니다. 경제와 경영의 기본 개념을 읽고, 고객 인터뷰와 사업 모델, 창업 과정, 경쟁전략으로 이어지도록 골랐습니다.',
        '앞부분은 사업의 가정을 확인하는 데, 뒷부분은 차별성을 유지하고 조직을 운영하는 데 중심을 둡니다. 창업자의 기질을 흉내 내기보다 어떤 질문과 근거로 사업을 판단하는지 배우는 순서입니다.',
      ] },
      en: { title: 'From a customer’s problem to a sustainable business', paragraphs: [
        'The foundation is connecting customers, revenue, costs and competition rather than simply believing in an idea. The books proceed from economics and business basics to customer interviews, business models, venture creation and competitive strategy.',
        'The earlier books help examine business assumptions; the later ones address differentiation and organizational operations. The sequence teaches questions and evidence for decisions rather than the imitation of a founder’s personality.',
      ] },
    },
    become: {
      ko: { title: '기업이 성장하고 기존 강자가 흔들리는 이유', paragraphs: [
        '새로운 사업을 시험하는 법, 시장을 만드는 법, 조직을 시스템으로 운영하는 법을 서로 다른 관점에서 읽습니다. 스타트업의 출발과 기존 기업의 혁신 문제가 함께 보이도록 실험·차별화·시장 확산·지속성을 다룬 책들을 묶었습니다.',
        '작은 실험을 강조하는 접근과 독자적인 시장을 강조하는 접근 사이에도 긴장이 있습니다. 모든 책을 하나의 성공 공식으로 합치지 않고, 사업의 단계와 조건에 따라 어떤 설명이 유효한지 비교합니다.',
      ] },
      en: { title: 'Why businesses grow—and why established leaders falter', paragraphs: [
        'These books offer different accounts of testing a venture, creating a market and building a business that runs as a system. Experimentation, differentiation, market adoption and endurance connect startup questions with the problems of established companies.',
        'Approaches built around small experiments and those emphasizing a distinctive market can pull in different directions. Compare their relevance to a business’s stage and conditions rather than combining them into one success formula.',
      ] },
    },
    about: {
      ko: { title: '기업의 결과 뒤에 있는 갈등과 선택', paragraphs: [
        '창업자의 회고와 전기, 조직 내부를 취재한 기록, 기업의 개별 사건을 함께 골랐습니다. 제품을 만들고 사람을 고용하며 위기를 견디는 과정이 완성된 성공담보다 구체적으로 보이기 때문입니다.',
        '기술 기업뿐 아니라 스포츠 브랜드와 창작 조직, 환경적 가치를 내세운 기업도 함께 읽습니다. 같은 성장이라는 말 아래 서로 다른 자금 사정과 조직 문화, 우선순위가 놓인다는 점을 살펴봅니다.',
      ] },
      en: { title: 'The conflicts and choices behind a company’s results', paragraphs: [
        'Founders’ memoirs and biographies sit alongside reporting from inside organizations and accounts of particular business events. Together they make product development, hiring and crises more concrete than a polished success story.',
        'Technology companies are joined by sporting brands, creative organizations and a business built around environmental values. Compare the finances, cultures and priorities that make growth mean different things in different companies.',
      ] },
    },
  },
  // 금융의 기본 교재와 투자 판단을 잇는다: https://ocw.mit.edu/courses/15-433-investments-spring-2003/
  investor: {
    train: {
      ko: { title: '시장과 자산을 이해한 뒤 기업을 평가하기', paragraphs: [
        '종목 추천보다 경제와 금융시장의 구조, 위험과 수익의 관계를 먼저 배울 수 있는 책을 골랐습니다. 경제학과 투자론을 바탕으로 가치 평가와 기업 분석을 읽고, 재무제표의 왜곡과 경쟁우위까지 살펴보도록 이어집니다.',
        '포트폴리오를 다루는 교재와 개별 기업을 분석하는 고전은 질문의 크기가 다릅니다. 두 관점을 연결해 기업이 좋아 보이는 이유와 투자로서 감수하는 위험을 구분하며 읽습니다.',
      ] },
      en: { title: 'Understanding markets and assets before evaluating companies', paragraphs: [
        'The starting point is economics, financial markets and the relationship between risk and return. Investment theory leads into valuation and company analysis, followed by financial-statement distortions and competitive advantage.',
        'A portfolio textbook and a classic on analyzing individual companies work at different scales. Reading them together helps distinguish the merits of a business from the risks of holding it as an investment.',
      ] },
    },
    become: {
      ko: { title: '서로 다른 투자관과 판단의 한계를 비교하기', paragraphs: [
        '개별 기업을 고르는 접근과 시장 전체를 보유하는 접근을 함께 두었습니다. 위험 관리, 시장 효율성, 돈을 대하는 태도와 인지 편향을 읽어 투자 판단의 여러 전제를 비교하기 위한 목록입니다.',
        '저명한 투자자의 의견도 같은 결론으로 모이지 않습니다. 어떤 전략이 늘 이긴다는 이야기를 찾기보다 비용과 정보, 시간, 불확실성을 각 저자가 어떻게 다루는지 살펴봅니다.',
      ] },
      en: { title: 'Comparing investment philosophies and the limits of judgment', paragraphs: [
        'Company selection sits alongside the case for owning the market. Books on risk, market efficiency, attitudes to money and cognitive biases expose different assumptions behind an investment decision.',
        'Well-known investors do not all reach the same conclusions. Examine how each author treats costs, information, time and uncertainty rather than looking for a strategy that always wins.',
      ] },
    },
    about: {
      ko: { title: '확신이 성과와 실패로 이어지는 과정을 읽기', paragraphs: [
        '투자자의 전기와 인터뷰에 금융위기, 펀드의 붕괴, 위험 관리의 역사, 기업의 사건을 함께 묶었습니다. 투자 아이디어가 실제 시장과 조직 안에서 실행될 때 어떤 문제가 생기는지 읽는 구성입니다.',
        '성과를 낸 사람의 설명과 크게 실패한 사례를 나란히 봅니다. 정교한 모델이나 남다른 통찰이 있어도 자금의 조건과 레버리지, 조직의 확신이 결과를 바꿀 수 있다는 점을 탐구합니다.',
      ] },
      en: { title: 'Following conviction into both results and failure', paragraphs: [
        'Investor biographies and interviews are paired with financial crises, fund collapses, the history of risk and business cases. The selection follows investment ideas as they encounter real markets and institutions.',
        'Read successful practitioners alongside major failures. Models and insight are part of the story, but financing conditions, leverage and collective conviction can also determine the outcome.',
      ] },
    },
  },
  // 세부 전공 전의 공통 기반: https://ocw.mit.edu/collections/introductory-science-and-math/
  scientist: {
    train: {
      ko: { title: '공통 기초에서 연구의 질문과 근거로', paragraphs: [
        '세부 전공을 정하기 전의 공통 바탕으로 미적분·일반물리·일반화학·생명과학 교재를 앞에 두었습니다. 수학은 현상을 표현하는 언어이며, 물리·화학·생물은 서로 다른 대상을 설명하는 기초 과목으로 나란히 읽습니다.',
        '통계 입문 교재로 자료의 분포와 표본, 확률과 추정의 기초를 익힌 뒤 연구 질문과 논문 작성으로 이어집니다. 마지막 인과 추론서는 앞의 통계 기초를 다진 뒤 연구 방법을 더 깊이 읽을 때 이어갈 책입니다.',
      ] },
      en: { title: 'From shared foundations to research questions and evidence', paragraphs: [
        'Calculus, physics, chemistry and biology provide common foundations before specialization. Mathematics supplies a language for describing phenomena; the science textbooks develop parallel foundations for understanding different kinds of phenomena.',
        'An introductory statistics textbook establishes distributions, sampling, probability and estimation before the books turn to choosing research questions and writing scientific papers. The sequence connects subject knowledge with the methods needed to investigate and explain a problem.',
      ] },
    },
    become: {
      ko: { title: '과학적 설명은 어떻게 만들어지고 바뀌는가', paragraphs: [
        '과학의 큰 그림을 발견의 결과뿐 아니라 설명을 만드는 방식에서 찾았습니다. 연구자의 조언과 통계 오류를 다룬 책에 과학철학·과학사, 생명과 우주를 설명하는 대표 저작을 함께 두었습니다.',
        '검증과 반증, 이론의 변화, 객관성을 둘러싼 논의를 비교하며 과학이 지식을 쌓는 방식을 읽습니다. 분야를 넓게 소개하는 책과 한 문제를 깊게 파고드는 책이 서로 다른 역할을 하도록 고른 목록입니다.',
      ] },
      en: { title: 'How scientific explanations are made and revised', paragraphs: [
        'The broad view of science includes how explanations are made, not just what has been discovered. Researchers’ advice and statistical pitfalls sit alongside philosophy and history of science, and major works on life and the cosmos.',
        'Compare accounts of testing, falsification, theoretical change and objectivity. Broad surveys provide orientation, while works centered on one problem show what sustained scientific argument looks like.',
      ] },
    },
    about: {
      ko: { title: '발견을 둘러싼 사람과 연구의 현실', paragraphs: [
        '실험실의 회고와 과학자의 전기에 대규모 연구의 역사와 환경 문제를 제기한 조사서를 함께 두었습니다. 개인의 호기심과 경쟁, 연구를 지속하는 조건, 국가와 사회의 요구가 만나는 장면을 읽기 위해서입니다.',
        '당사자의 기억과 역사가의 재구성을 구분해 읽습니다. 발견을 한 사람의 재능으로만 설명하지 않고 동료의 기여, 연구 환경, 결과가 사회에 미친 영향까지 살펴보는 목록입니다.',
      ] },
      en: { title: 'The people and conditions surrounding discovery', paragraphs: [
        'Laboratory memoirs and scientists’ biographies are joined by a history of large-scale research and an environmental investigation. They reveal encounters between curiosity, competition, working conditions and public demands.',
        'Distinguish a participant’s memory from a historian’s reconstruction. Read discoveries through colleagues’ contributions, research environments and social consequences as well as individual talent.',
      ] },
    },
  },
  // 연구 질문·자료·논증: https://press.uchicago.edu/ucp/books/book/chicago/C/bo215874008.html
  humanities_scholar: {
    train: {
      ko: { title: '읽은 내용을 근거 있는 논증으로 만들기', paragraphs: [
        '인문학 연구의 공통 기반을 독해·논증·연구 설계·학술 글쓰기에서 찾았습니다. 먼저 텍스트를 읽고 주장을 구분하는 법을 익힌 뒤, 질문을 좁히고 자료를 평가하며 논문으로 연결하는 책들을 배치했습니다.',
        '분야마다 연구 대상은 달라도 다른 저자의 주장과 자신의 해석을 구분해야 한다는 점은 같습니다. 독서법과 연구 안내서를 함께 읽어 인용을 모으는 일에서 근거를 설명하는 일로 나아갑니다.',
      ] },
      en: { title: 'Turning close reading into a supported argument', paragraphs: [
        'Reading, argument, research design and scholarly writing form a common foundation across the humanities. The sequence moves from understanding texts and claims to narrowing questions, evaluating sources and building a paper.',
        'Subjects differ, but distinguishing another author’s argument from your own interpretation remains essential. Reading and research guides connect the collection of quotations with the explanation of evidence.',
      ] },
    },
    become: {
      ko: { title: '해석의 도구와 지식이 만들어지는 조건', paragraphs: [
        '무엇을 읽을 것인가와 함께 어떻게 해석할 것인가를 묻는 책들을 골랐습니다. 철학·역사·문학의 입문과 지식, 권력, 재현을 비판적으로 다루는 저작이 함께 놓입니다.',
        '한 사상가의 체계를 전체 인문학의 답으로 삼지 않도록 개념을 소개하는 책과 그 개념을 흔드는 책을 나란히 읽습니다. 텍스트의 의미뿐 아니라 누가 어떤 조건에서 지식을 만들었는지도 살펴봅니다.',
      ] },
      en: { title: 'Tools of interpretation and the conditions of knowledge', paragraphs: [
        'The selection asks how to interpret as well as what to read. Introductions to philosophy, history and literature sit beside critical accounts of knowledge, power and representation.',
        'Conceptual introductions and works that challenge their assumptions are read together, rather than making one thinker stand for the humanities as a whole. Consider who produced a text and under what conditions, alongside what it means.',
      ] },
    },
    about: {
      ko: { title: '사료와 현장을 만나는 연구자의 시선', paragraphs: [
        '역사가의 성찰, 고문헌을 추적한 이야기, 인류학자의 현장 기록, 재판을 관찰한 저작을 함께 두었습니다. 인문학의 질문이 자료와 사람, 구체적인 사건을 만나 어떻게 달라지는지 읽기 위한 목록입니다.',
        '연구자는 기록을 찾고 관찰하는 동시에 자신의 위치와 해석을 돌아봅니다. 완성된 이론보다 자료를 대하는 태도와 타인을 서술하는 책임에 주목하며 읽습니다.',
      ] },
      en: { title: 'The researcher’s view of sources and encounters', paragraphs: [
        'The pursuit of an old manuscript, an anthropologist’s field account and reporting from a trial bring humanities questions into contact with sources, people and events. The books follow how encounters with evidence change an investigation.',
        'Researchers find and interpret material while also confronting their own position. Read for their treatment of evidence and the responsibility of representing others, alongside their eventual conclusions.',
      ] },
    },
  },
  // 사례·비교·추론의 연결: https://www.jstor.org/stable/j.ctt7sfxj
  social_scientist: {
    train: {
      ko: { title: '사회에 대한 질문을 조사와 추론으로 바꾸기', paragraphs: [
        '관찰한 사회 현상을 조사할 수 있는 질문으로 바꾸는 데 중심을 두었습니다. 조사방법과 통계 기초에서 출발해 연구 설계, 사례연구와 학술 글쓰기를 읽고, 계량 분석과 인과 추론으로 깊이를 더하는 구성입니다.',
        '사례를 깊이 읽는 방법과 여러 관찰을 비교하는 방법은 다른 강점과 한계를 가집니다. 정치학 교재는 하나의 연구 분야를 펼쳐 보는 데 쓰며, 계량·인과 추론서는 확률과 통계의 기초를 갖춘 뒤 읽습니다.',
      ] },
      en: { title: 'Turning social questions into inquiry and inference', paragraphs: [
        'The focus is making observations about society into questions that can be investigated. Social research methods and basic statistics establish foundations for research design, followed by comparison of statistical and case-based inquiry.',
        'Close study of cases and comparison across observations have different strengths and limits. Read the statistics textbook before the more demanding discussion of inference in Designing Social Inquiry; political science then provides one substantive field to explore.',
      ] },
    },
    become: {
      ko: { title: '개인의 경험을 제도와 역사에 연결하기', paragraphs: [
        '일상에서 겪는 일을 사회적 관계와 제도의 문제로 다시 바라보는 책들을 골랐습니다. 사회학의 기본 시선에서 시작해 종교와 경제, 증여와 부채, 계층과 취향, 공동 자원의 운영까지 질문을 넓힙니다.',
        '저자마다 시장과 문화, 권력과 협력의 관계를 다르게 설명합니다. 여러 분야를 얕게 훑기보다 서로 다른 이론이 같은 사회 현상을 어떻게 해석하는지 비교할 수 있도록 구성했습니다.',
      ] },
      en: { title: 'Connecting personal experience with institutions and history', paragraphs: [
        'These books reframe everyday experiences as questions about social relationships and institutions. Sociological perspectives lead into religion and economic life, gifts and debt, and class and taste.',
        'The authors offer different accounts of markets, culture, power and cooperation. The purpose is to compare interpretations of social phenomena rather than merely collect an introduction to each field.',
      ] },
    },
    about: {
      ko: { title: '사례를 깊이 읽으며 설명이 만들어지는 과정 보기', paragraphs: [
        '사회과학의 탐구에는 연구자의 회고뿐 아니라 하나의 문제를 끝까지 분석한 연구도 포함했습니다. 자살과 일상적 상호작용, 국가의 계획, 자본과 불평등, 도시의 빈곤과 주거를 다룬 책들을 묶었습니다.',
        '통계와 비교로 설명하는 연구를 참여 관찰과 현장 기록에 나란히 놓았습니다. 결과에 동의하는지를 넘어 어떤 자료를 모았고 누구의 경험을 설명에 담았는지 읽는 목록입니다.',
      ] },
      en: { title: 'Following a problem through a sustained investigation', paragraphs: [
        'Exploration includes completed investigations as well as researchers’ personal accounts. The books examine suicide, everyday interaction, state planning, capital and inequality, urban poverty and housing.',
        'Statistical and comparative studies sit alongside participant observation and field accounts. Look beyond agreement with a conclusion to the evidence collected and the experiences included in the explanation.',
      ] },
    },
  },
  // 영화의 언어와 제작 판단: https://ocw.mit.edu/courses/21l-011-the-film-experience-fall-2013/pages/syllabus/
  director: {
    train: {
      ko: { title: '영화의 언어에서 장면과 편집의 판단으로', paragraphs: [
        '영화의 형식과 표현을 이해하는 교재를 출발점으로 삼았습니다. 이야기의 구성, 쇼트와 장면 설계, 배우 연출, 편집을 다룬 책들이 한 장면을 만드는 여러 판단으로 연결되도록 골랐습니다.',
        '카메라 앞에서 배우가 겪는 문제를 다룬 책도 함께 두었습니다. 감독의 의도를 설명하는 일과 실제 화면에서 그 의도가 전달되는 일을 나란히 이해하기 위한 구성입니다.',
      ] },
      en: { title: 'From film language to decisions about scenes and editing', paragraphs: [
        'A textbook on film form establishes the starting vocabulary. Books on story, shot and scene design, directing actors and editing then connect the different decisions involved in constructing a scene.',
        'A book on screen acting adds the performer’s side of the process. The selection links articulating a director’s intention with understanding how that intention reaches the screen.',
      ] },
    },
    become: {
      ko: { title: '이야기와 이미지를 읽는 시야 넓히기', paragraphs: [
        '영화를 만드는 기술을 작품을 읽는 시야와 연결하기 위해 영화 입문, 시학, 사진 비평을 함께 두었습니다. 영화의 형식, 이야기의 작동, 이미지가 현실을 보여 주는 방식을 서로 다른 거리에서 살펴봅니다.',
        '사진에 관한 질문이 영화의 모든 문제를 대신하지는 않지만, 카메라가 무엇을 선택하고 관객이 어떻게 보는지 다시 묻게 합니다. 작품을 기술의 결과이면서 해석의 대상으로 읽는 목록입니다.',
      ] },
      en: { title: 'Broadening the view of stories and images', paragraphs: [
        'An introduction to film, poetics and photographic criticism connect production skills with interpretation. They examine form, narrative and the representation of reality from different distances.',
        'Photography cannot answer every question about cinema, but it helps ask what a camera selects and how an audience sees. Read a film as both the result of technical decisions and an object of interpretation.',
      ] },
    },
    about: {
      ko: { title: '감독의 미학이 제작 현장에서 형성되는 과정', paragraphs: [
        '감독의 작업 기록과 인터뷰, 자서전과 전기에 각본가의 경험과 저예산 제작기를 함께 두었습니다. 완성된 작품의 스타일을 실제 제작 과정의 선택과 제약 속에서 읽기 위해서입니다.',
        '서로 다른 국가와 제작 환경의 기록을 비교하면 같은 연출 문제에도 다른 답이 나옵니다. 감독의 자기 설명을 비평과 전기의 시선에 함께 놓고 작품 세계가 만들어진 과정을 탐구합니다.',
      ] },
      en: { title: 'How a director’s aesthetics take shape in production', paragraphs: [
        'Working accounts, interviews, autobiographies and biographies are joined by a screenwriter’s experience and a low-budget production diary. Finished styles become decisions made under concrete production constraints.',
        'Different countries and production settings yield different answers to similar directing problems. Read directors’ explanations alongside critics and biographers to examine how a body of work takes shape.',
      ] },
    },
  },
  // 화성·대위·편곡의 공통 바탕: https://college.berklee.edu/composition/tonal-harmony-and-counterpoint-core
  musician: {
    train: {
      ko: { title: '음악의 구조를 읽고 만드는 기본 언어', paragraphs: [
        '화성과 선율의 관계를 배우는 교재를 앞에 두고 대위법으로 여러 성부의 움직임을 살펴봅니다. 전통 화성학과 실용음악 화성학은 서로 다른 음악적 맥락을 비교하며 읽을 수 있도록 함께 골랐습니다.',
        '이 바탕을 곡 쓰기와 연습의 운영, 악기와 편성의 이해로 이어갑니다. 모든 음악인의 길이 같다고 보기보다 이론·창작·연주가 만나는 공통 지식을 책으로 쌓는 구성입니다.',
      ] },
      en: { title: 'A shared language for reading and making music', paragraphs: [
        'The English-language selection brings together counterpoint, songwriting, practice and orchestration. Counterpoint examines interacting voices and assumes some familiarity with notation and harmony; it is a starting point for deeper study rather than a first introduction to musical notation.',
        'The other books connect musical structure with creating a song, organizing practice and understanding instruments. Read them for the shared questions across theory, creation and performance, while recognizing that musicians follow different paths.',
      ] },
    },
    become: {
      ko: { title: '음악을 구조와 경험, 역사로 함께 이해하기', paragraphs: [
        '음악의 구조만으로 설명되지 않는 듣기와 연주의 경험을 함께 읽습니다. 뇌와 음악의 관계, 연주자의 집중과 태도, 음악의 역사와 작곡가의 미학을 다룬 책들을 골랐습니다.',
        '연주자의 비유와 성찰을 과학적 설명이나 역사 서술과 같은 종류의 주장으로 읽지는 않습니다. 서로 다른 설명 방식을 비교하면서 음악을 이해하는 언어를 넓히는 목록입니다.',
      ] },
      en: { title: 'Understanding music through structure, experience and history', paragraphs: [
        'Listening and performing involve more than musical structure. The selection brings together the brain and music, performers’ attention and attitudes, musical history and a composer’s aesthetics.',
        'A performer’s metaphors are not the same kind of claim as a scientific explanation or a historical account. Compare these different ways of understanding music to expand the language available for thinking about it.',
      ] },
    },
    about: {
      ko: { title: '음악가의 작업과 시대를 함께 읽기', paragraphs: [
        '연주자와 나눈 대화, 대중음악가의 회고, 작곡가를 다룬 전기와 기록을 함께 두었습니다. 혼자 만드는 음악과 동료와의 작업, 공연과 생활, 시대의 압력이 만나는 지점을 읽기 위해서입니다.',
        '클래식과 대중음악의 경험을 비교하되 회고와 전기의 시선을 구분합니다. 쇼스타코비치의 회고로 제시된 《증언》은 진위 논쟁이 있는 기록이라는 점을 함께 고려하며 읽습니다.',
      ] },
      en: { title: 'Reading musicians’ work within their times', paragraphs: [
        'Conversations with a performer, popular musicians’ memoirs and accounts of composers connect individual creation with collaboration, performance, everyday life and historical pressures.',
        'Compare classical and popular music while distinguishing conversations, memoirs and biography. A musician’s account of their own work and a historian’s reconstruction offer different kinds of evidence about the relationship between music and a life.',
      ] },
    },
  },
  // 지각·형태·색의 기초: https://steinhardt.nyu.edu/courses/interdiscipline-ug-proj-studio-artcolor-theory
  visual_artist: {
    train: {
      ko: { title: '관찰에서 형태, 색과 빛의 이해로', paragraphs: [
        '미술의 기초를 도구의 사용법보다 무엇을 어떻게 보고 표현하는지에서 찾았습니다. 관찰과 드로잉에서 출발해 인체의 비례와 형태, 색의 상호작용, 빛과 색의 관계를 읽도록 골랐습니다.',
        '색채 교재와 빛을 다룬 책을 함께 두면 같은 색이 주변과 조명에 따라 달라 보이는 문제를 다른 방식으로 살필 수 있습니다. 회화와 일러스트레이션을 중심으로 여러 시각 작업에 이어지는 기초 목록입니다.',
      ] },
      en: { title: 'From observation to form, color and light', paragraphs: [
        'The foundation is how to see and represent, rather than simply how to use tools. Figure drawing develops human proportions and form, followed by the interaction of colors and the relationship between light and color.',
        'A color textbook and a book on light offer different ways to understand changes in appearance. Painting and illustration provide the focus, with foundations that can carry into other visual practices.',
      ] },
    },
    become: {
      ko: { title: '작품이 만들어지고 보이는 조건을 생각하기', paragraphs: [
        '미술사와 보는 방식에 관한 책을 창작자의 태도, 재현과 지각, 복제와 이미지의 윤리를 다룬 저작과 함께 묶었습니다. 작품을 잘 만드는 문제에서 무엇을 어떻게 보여 주는가라는 문제로 시야를 넓힙니다.',
        '예술가의 선언과 미술사가의 설명, 이미지에 대한 비판은 서로 다른 역할을 합니다. 한 미학을 정답으로 삼기보다 작품과 관객, 사회의 관계를 설명하는 여러 관점을 비교하며 읽습니다.',
      ] },
      en: { title: 'Thinking about the conditions of making and seeing art', paragraphs: [
        'Art history and ways of seeing sit alongside artists’ attitudes, representation and perception, reproduction and the ethics of images. The view expands from making an effective work to asking what and how it shows.',
        'Artists’ declarations, historical explanations and critiques of images serve different purposes. Compare accounts of the relationship between artwork, audience and society rather than adopting one aesthetic as the answer.',
      ] },
    },
    about: {
      ko: { title: '예술가의 작업과 미술계의 현실을 연결하기', paragraphs: [
        '예술가의 편지와 전기, 오래된 미술가 평전, 동시대 미술계를 취재한 기록을 함께 골랐습니다. 작품 밖에서 생활과 관계, 인정과 거래가 예술가의 작업에 어떻게 연결되는지 읽는 목록입니다.',
        '당사자의 목소리를 후대의 전기와 미술계의 관찰에 나란히 놓았습니다. 예술가를 고립된 천재로만 보기보다 그가 작업을 지속한 조건과 작품의 가치가 형성되는 과정을 살펴봅니다.',
      ] },
      en: { title: 'Connecting an artist’s work with the realities of the art world', paragraphs: [
        'Letters and biographies, historical artists’ lives and reporting on contemporary art connect work with livelihoods, relationships, recognition and exchange.',
        'An artist’s own voice sits alongside later biographies and observation of the art world. Read for the conditions that sustain a practice and shape the value of its work, rather than viewing artists only as isolated geniuses.',
      ] },
    },
  },
  // 문장·시점·서사의 작법: https://www.ursulakleguin.com/steering-the-craft
  author: {
    train: {
      ko: { title: '쓰는 습관에서 문장과 서사의 판단으로', paragraphs: [
        '글을 시작하고 지속하는 문제에서 출발해 명료한 문장, 시점, 장면과 서사의 구성으로 이어지는 책을 골랐습니다. 글쓰기 전반의 안내와 소설 작법을 함께 두어 표현의 작은 선택이 전체 이야기와 연결되도록 했습니다.',
        '작법서마다 좋은 문장과 소설에 대한 기준은 다릅니다. 가드너와 랜드의 소설론도 각 작가의 미학으로 비교하며, 하나의 규칙을 모든 글에 적용하기보다 쓰고 고치는 판단을 넓히는 데 중심을 둡니다.',
      ] },
      en: { title: 'From a writing habit to decisions about prose and narrative', paragraphs: [
        'The sequence starts with beginning and sustaining the work, then develops clear prose, point of view, scenes and narrative. General writing guides and fiction manuals connect small expressive choices with the whole story.',
        'The manuals do not share a single aesthetic. Gardner and Rand also present particular visions of fiction; compare them to broaden revision decisions rather than applying one set of rules to every kind of writing.',
      ] },
    },
    become: {
      ko: { title: '글의 형식과 작가가 놓인 조건을 함께 읽기', paragraphs: [
        '작가의 조언에 문학의 형식과 해석, 언어와 사회, 쓰는 사람의 물질적 조건을 묻는 책을 함께 두었습니다. 글을 잘 쓰는 방법을 넘어 어떤 글을 왜 쓰고 읽는지 생각하는 목록입니다.',
        '작가가 자신의 작업을 설명하는 목소리와 문학을 분석하는 관점을 비교합니다. 글쓰기의 기술이 작품의 의미와 작가의 삶을 전부 설명하지는 않는다는 점에서 수업의 중심을 잡았습니다.',
      ] },
      en: { title: 'Reading literary form alongside the conditions of authorship', paragraphs: [
        'Writers’ advice is joined by questions about literary form, interpretation, language and society, and the material conditions of writing. The shelf asks what we write and read, and why, beyond the pursuit of technique.',
        'Compare writers’ explanations of their practice with perspectives that analyze literature. Craft matters, but it does not by itself explain a work’s meaning or the conditions of an author’s life.',
      ] },
    },
    about: {
      ko: { title: '한 작가가 자기 작업을 지속하는 방식', paragraphs: [
        '작가의 직업적 성찰과 회고, 기억과 에세이를 함께 골랐습니다. 성장과 생활, 시대에 대한 판단, 반복되는 일상이 글을 쓰는 일과 어떻게 연결되는지 읽기 위한 구성입니다.',
        '같은 작가의 다른 기록은 작업과 생활을 서로 다른 각도에서 보여 줍니다. 성공한 작가의 일과를 그대로 따르기보다 자기 경험을 어떤 이야기와 문체로 만들었는지 살펴봅니다.',
      ] },
      en: { title: 'How a writer sustains and understands their own work', paragraphs: [
        'Reflections on writing as a profession, memoirs, memories and essays connect the work with growing up, everyday life and judgments about an era.',
        'Different accounts by the same writer reveal different relationships between life and practice. Read for how experience becomes narrative and voice, rather than simply adopting a successful author’s daily routine.',
      ] },
    },
  },
  // 상상력·상대와의 관계·몸의 훈련: https://tisch.nyu.edu/drama/about/studios/the-meisner-studio/curriculum
  actor: {
    train: {
      ko: { title: '행동과 상상력에서 카메라 앞의 연기로', paragraphs: [
        '배우가 상황과 목적을 이해하고 상대에게 반응하는 방법을 중심으로 교재를 골랐습니다. 스타니스랍스키와 하겐의 작업에서 출발해 상상력과 신체, 상대와의 관계를 다루는 서로 다른 접근을 읽고 화면 연기로 이어갑니다.',
        '연기 기법들은 하나를 끝내면 다음 기법으로 올라가는 단계가 아닙니다. 앞의 책에서 공통 질문을 익힌 뒤 각 접근을 비교하고, 무대와 카메라의 조건이 표현을 어떻게 바꾸는지 살펴보는 순서입니다.',
      ] },
      en: { title: 'From action and imagination to acting for the camera', paragraphs: [
        'The manuals center on understanding circumstances and objectives, and responding to another performer. Stanislavski and Hagen lead into contrasting approaches to imagination, physical expression and interaction, followed by screen acting.',
        'Acting techniques are not successive levels to complete. Establish shared questions, compare the approaches, and then examine how stage and camera conditions change the work.',
      ] },
    },
    become: {
      ko: { title: '배역을 넘어 작품과 공연 전체를 읽기', paragraphs: [
        '배우 개인의 표현에서 작품과 공연 전체로 시야를 넓히는 책들을 골랐습니다. 아들러의 희곡 해석을 연극의 공간과 관계를 묻는 브룩, 극의 구성을 분석하는 시학과 함께 읽습니다.',
        '대사를 어떻게 말할 것인지에 앞서 어떤 세계와 사건 안에서 말하는지를 이해하기 위한 목록입니다. 연기자의 관점과 연극을 보는 관점을 비교하며 배역을 작품 전체에 놓고 생각합니다.',
      ] },
      en: { title: 'Reading the play and performance beyond your role', paragraphs: [
        'This selection widens the view from an individual performance to the whole play and theatrical event. Adler’s interpretation of plays sits alongside Brook’s questions about theatrical space and relationships, and poetics on dramatic structure.',
        'Before asking how to deliver a line, ask what world and action it belongs to. Compare the performer’s perspective with perspectives on theatre to place a role within the work as a whole.',
      ] },
    },
    about: {
      ko: { title: '배우의 일과 생활을 서로 다른 시선으로 읽기', paragraphs: [
        '오디션과 구직을 다룬 안내, 배우의 회고와 전기, 인터뷰와 작업 기록을 함께 골랐습니다. 배역을 연기하는 기술과 일을 얻고 계속 살아가는 현실이 함께 보이도록 한 구성입니다.',
        '연극과 영화, 텔레비전과 코미디의 경험을 비교합니다. 배우가 자신의 삶을 설명하는 목소리와 취재자가 바라보는 시선을 나란히 읽으며 동료와의 작업, 불안정성, 오래 지속되는 경력을 살펴봅니다.',
      ] },
      en: { title: 'Reading an actor’s working life from different perspectives', paragraphs: [
        'Accounts of auditions and finding work are joined by memoirs, biographies, interviews and working records. The selection connects performing a role with the realities of getting work and sustaining a life.',
        'Theatre, film, television and comedy bring different conditions into view. Read actors’ own accounts alongside reporting to examine collaboration, insecurity and the development of a lasting career.',
      ] },
    },
  },
  // 제작 방법과 미디어 구조를 구분한다: https://ocw.mit.edu/courses/21l-015-introduction-to-media-studies-fall-2003/pages/readings/
  influencer: {
    train: {
      ko: { title: '메시지를 만들고 꾸준히 전달하는 기본기', paragraphs: [
        '플랫폼의 유행보다 메시지를 이해시키는 구조와 콘텐츠를 지속해서 만드는 방법에 중심을 두었습니다. 기억에 남는 설명, 이야기의 구성, 콘텐츠 기획과 운영을 읽고 글쓰기와 말하기의 기본기로 이어집니다.',
        '홍보와 마케팅에서 나온 방법서는 창작자의 모든 목적을 대신하지 않습니다. 무엇을 전달하고 누구에게 필요한지 묻는 데 활용하며, 반응을 얻는 기술과 내용의 명료함을 함께 비교합니다.',
      ] },
      en: { title: 'Building messages and sustaining their delivery', paragraphs: [
        'The focus is understandable messages and sustained production rather than platform trends. Memorable explanations, story structure and content planning are joined by foundations in writing and speaking.',
        'Methods drawn from promotion and marketing do not define every creator’s purpose. Use them to ask what a message offers and to whom, while comparing techniques for attracting a response with clarity of content.',
      ] },
    },
    become: {
      ko: { title: '관심과 유통을 만드는 미디어의 구조', paragraphs: [
        '콘텐츠의 영향력을 개인의 표현력만으로 설명하지 않도록 마케팅과 확산, 플랫폼과 미디어, 주의력과 판단을 함께 다루는 책을 골랐습니다. 만드는 사람의 시선에서 출발해 메시지가 유통되고 받아들여지는 조건으로 질문을 넓힙니다.',
        '영향력을 넓히려는 책과 그 영향력의 비용을 비판하는 책을 나란히 두었습니다. 더 많은 노출을 당연한 목표로 삼기보다 관심과 신뢰가 어떤 구조 안에서 만들어지는지 비교하며 읽습니다.',
      ] },
      en: { title: 'The media structures behind attention and distribution', paragraphs: [
        'Marketing and diffusion, platforms and media, attention and judgment broaden explanations based only on a creator’s expressive skill. The question moves from making a message to the conditions of its circulation and reception.',
        'Books on increasing influence sit alongside critiques of its costs. Compare how attention and trust are produced rather than assuming that more exposure is always the objective.',
      ] },
    },
    about: {
      ko: { title: '플랫폼과 자기 연출의 현실을 들여다보기', paragraphs: [
        '플랫폼을 취재한 기록과 온라인 자아를 다룬 에세이, 브랜드와 노동에 대한 조사, 공적 글쓰기의 성찰을 함께 골랐습니다. 영향력을 만드는 일이 개인의 생활과 기업의 수익 구조, 사회적 결과에 어떻게 연결되는지 읽습니다.',
        '모든 책이 인플루언서의 자서전은 아닙니다. 당사자의 경험과 구조를 추적하는 취재를 함께 읽어 콘텐츠의 성과 뒤에 있는 의존과 책임을 살펴보는 탐구 목록입니다.',
      ] },
      en: { title: 'Looking inside platforms and public self-presentation', paragraphs: [
        'Reporting on video and social platforms, investigations of branding and labor, and reflections on public writing connect influence with everyday life, corporate revenue and social consequences.',
        'The books extend beyond influencers’ autobiographies. Personal accounts and structural reporting together expose the dependencies and responsibilities behind a piece of content’s apparent success.',
      ] },
    },
  },
  // 운동과학을 훈련 설계로 연결한다: https://www.nsca.com/certification/cscs/essentials-of-strength-training-and-conditioning-5th-edition/
  athlete: {
    train: {
      ko: { title: '몸을 이해한 뒤 훈련을 설계하기', paragraphs: [
        '특정 종목의 기술에 앞서 몸이 움직이고 에너지를 쓰며 훈련에 적응하는 과정을 이해하도록 골랐습니다. 운동생리학·영양학·생체역학을 바탕으로 체력 관리와 훈련 주기화로 이어지는 구성입니다.',
        '그 뒤에는 집중과 경기 수행을 다루는 심리 훈련서를 두었습니다. 테니스를 사례로 한 책도 이 단계에서 읽으며, 여러 종목에 공통으로 쓰이는 신체와 훈련의 지식을 먼저 쌓습니다.',
      ] },
      en: { title: 'Understanding the body before designing training', paragraphs: [
        'Before sport-specific technique, the books explain movement, energy use and adaptation. Exercise physiology, nutrition and biomechanics provide the foundation for strength and conditioning and training periodization.',
        'Psychological training on attention and performance follows those foundations. A tennis-based book belongs at this later stage, after the shared knowledge of the body and training that carries across sports.',
      ] },
    },
    become: {
      ko: { title: '경기력을 재능과 노력만으로 설명하지 않기', paragraphs: [
        '선수의 마음가짐과 지속 가능한 수행을 재능, 적응, 지구력, 전문화의 문제와 함께 읽도록 구성했습니다. 경기력이 좋아지는 이유를 하나의 습관이나 타고난 능력으로만 설명하지 않기 위해서입니다.',
        '실천을 제안하는 책과 연구를 소개하며 통념을 묻는 책은 설명 방식이 다릅니다. 여러 관점을 비교하면서 자신의 종목과 조건에 따라 무엇을 다시 생각해야 하는지 읽습니다.',
      ] },
      en: { title: 'Looking beyond talent and effort to explain performance', paragraphs: [
        'Mindset and sustained performance are considered alongside talent, adaptation, endurance and specialization. The selection resists explaining improvement through one habit or innate ability alone.',
        'Books offering practical approaches differ from books presenting research and questioning assumptions. Compare those perspectives against the conditions of a particular sport rather than treating every claim as a universal rule.',
      ] },
    },
    about: {
      ko: { title: '선수와 지도자가 경기 밖에서 겪는 일', paragraphs: [
        '서로 다른 종목의 선수 회고와 전기, 지도자의 기록, 달리기의 경험을 함께 골랐습니다. 경기 결과 뒤에 있는 훈련의 일상과 관계, 압박과 팀 운영이 다른 위치에서 보이도록 한 구성입니다.',
        '정상급 선수의 이야기에 생활 속 달리기와 현장 취재를 함께 두어 경험의 폭을 넓혔습니다. 뛰어난 성적을 낸 사람의 태도를 그대로 정답으로 삼기보다 그 선택이 이루어진 조건을 읽습니다.',
      ] },
      en: { title: 'What athletes and coaches experience beyond the result', paragraphs: [
        'Memoirs and biographies across sports are joined by coaches’ accounts and experiences of running. Training routines, relationships, pressure and team management become visible from different positions.',
        'Elite careers sit alongside running within everyday life and reported accounts. Examine the conditions surrounding a choice rather than treating a successful athlete’s attitude as an answer for everyone.',
      ] },
    },
  },
}

export function getProfessionBookOverview(profession: string | null | undefined, category: ProfessionBookCategory, locale: string): ProfessionBookOverview | undefined {
  return profession ? PROFESSION_BOOK_GUIDES[profession]?.[category][locale === 'en' ? 'en' : 'ko'] : undefined
}
