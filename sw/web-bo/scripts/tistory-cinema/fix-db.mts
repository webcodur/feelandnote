/**
 * 통독에서 걸린 review 를 DB에서 고친다. 블로그에서만 다듬으면 사이트는 그대로이므로
 * **원본을 고쳐 두 곳이 함께 좋아지게** 한다. 고칠 것과 고친 뒤 값을 코드에 적어 두어
 * 무엇을 왜 손댔는지 이력에 남긴다.
 *
 *   pnpm tsx scripts/tistory-cinema/fix-db.mts        # 미리보기
 *   pnpm tsx scripts/tistory-cinema/fix-db.mts --yes  # 반영
 */
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
const DRY = !process.argv.includes('--yes')

/** slug + 작품 제목으로 찾아 review 를 바꾼다. 사유를 반드시 적는다. */
const FIXES = [
  {
    slug: 'park-chan-wook',
    title: '현기증',
    why: '주어가 없이 「1982년 …」으로 시작해 다른 감상과 형식이 어긋난다',
    from: '1982년 서강대학교 3학년 겨울방학,',
    to: '박찬욱은 1982년 서강대학교 3학년 겨울방학,',
  },
  {
    slug: 'james-watson',
    title: '시민 케인',
    why: '「왓슨이 … 영화다」라는 명사구로 시작해 다른 감상과 형식이 어긋난다',
    from: '왓슨이 자서전에서 언급한, 그에게 영감을 준 영화다.',
    to: '제임스 왓슨은 자서전에서 이 영화를 자신에게 영감을 준 작품으로 꼽았다.',
  },
  /**
   * 🔴 **인용부호 안이 통째로 지어내진 경우다(26.09.07).** 출처인 ESPN 기사
   * (Welt am Sonntag 인터뷰 인용)에는 「대부 시리즈의 큰 팬」이라는 한 줄뿐이고,
   * 「1편을 가장 좋아한다」도 「가족 중심의 리더십과 충성심이라는 주제가 제 철학과
   * 맞닿아 있습니다」라는 인용도 **없다.** 돈 코를레오네에 빗댄 마지막 문장도 근거가 없다.
   *
   * 꼬리만 자르는 것으로는 모자라 **본문을 실제 발언으로 갈아 끼운다.** 같은 인터뷰에서
   * 그가 실제로 한 말(영화감독에 빗댄 대목)이 있어 100자 기준을 채운다.
   */
  {
    slug: 'carlo-ancelotti',
    title: '대부',
    why: '없는 인용문과 없는 선호(1편)를 지어냈다. 출처 기사에 있는 실제 발언으로 바꾼다',
    from: '카를로 안첼로티는 독일 언론 인터뷰에서 대부 시리즈의 열렬한 팬이라고 밝혔다. 특히 1편을 가장 좋아한다고 말했다. "가족 중심의 리더십과 충성심이라는 주제가 제 철학과 맞닿아 있습니다"라고 덧붙였다. 안첼로티는 자신의 감독 스타일을 영화감독에 비유하며, 대부의 돈 코를레오네처럼 선수들과의 관계를 가족적으로 구축하는 방식을 추구한다.',
    to: '카를로 안첼로티는 독일 주간지 벨트 암 존탁 인터뷰에서 자신이 영화광이며 「대부」 시리즈의 큰 팬이라고 밝혔다. 같은 인터뷰에서 그는 감독의 일을 영화감독에 견주었다. "내 일은 분명히 영화감독과 견줄 만하다. 그들처럼 나도 많은 사람과 가까이 일하며 팀을 만들어야 한다. 때로는 영화 속에서처럼, 배우들에게 내 생각을 설명하는 것 같다."',
  },
]

/**
 * 🔴 **꼬리 문장 도려내기.**
 *
 * 26.09.05 통독에서 같은 결함이 37곳 나왔다. 감상 끝에 **화자 귀속이 없는 해설 한 문장**이
 * 붙어 있다. 「…의 기준점이 되었다」·「…와 맞닿아 있다」·「…영향을 미쳤다」처럼 영향과
 * 의미를 단정하는데, 누가 언제 어디서 그렇게 말했는지가 없다. 기계가 그럴듯하게 채운
 * 문장이고, 「누가 꼽았나」를 파는 이 채널에서는 나머지 사실까지 의심하게 만든다.
 *
 * 앞의 사실 문장은 그대로 두고 꼬리만 자른다. 문장을 그대로 키로 삼아 어느 인물의
 * 어느 작품이든 한 번에 걷는다 — 같은 감상이 인물 편과 목록 편에 함께 실리기 때문이다.
 */
const CUTS: { why: string; cut: string; to?: string }[] = [
  /** 26.09.07 발행 순 통독 — 화자가 그 작품에 대해 한 말 없이 해설만 붙은 자리 */
  { why: '박찬욱 배드 캅 — 「맞닿아 있다」 해설 꼬리', cut: '구원 없는 세계에서 구원을 갈망하는 인간의 처절한 몸부림은 박찬욱 영화의 단골 주제와 맞닿아 있다.' },
  { why: '스튜어트 러셀 2001 — 확인되지 않는 인터뷰 + 책 논점 단정', cut: " 러셀은 영화 평론가들과 함께 인터뷰에서 '2001'이 AI를 다룬 어떤 영화보다 정확하다고 평가했고, HAL의 자기 보존 본능을 '설계 결함'이 아닌 '잘못된 목적 함수가 낳는 논리적 귀결'로 읽어내는 것이 책의 핵심 논점이다." },
  { why: '박찬욱 사냥꾼의 밤 — 영화사 일반론', cut: '독일 표현주의적 그림자와 동화적 이미지의 결합은 영화사에서 유일무이한 시각 세계를 창조했다.' },
  { why: '박찬욱 의혹의 그림자 — 히치콕 평가 + 교과서 단정', cut: '히치콕 스스로 자신의 최고작으로 꼽았던 이 영화는 일상 속 공포를 연출하는 교과서적 작품이다.' },
  /**
   * 🔴 **시점이 뒤집힌 해설이다.** 손택의 「재난의 상상력」은 **1965년** 글이고 「2001」은
   *    **1968년** 영화다. 1965년 에세이가 이 영화를 다룰 수 없는데 「그녀의 비평적 틀을
   *    넘어서는 작품이었다」고 단정했다. 손택이 이 영화를 두고 한 말은 확인되지 않으며,
   *    남는 사실은 **1977년 목록에서 2위에 올렸다**는 것뿐이다.
   *    꼬리를 자르면 100자에 못 미쳐 글에서 빠진다 — 그래야 맞다.
   */
  { why: '수전 손택 2001 — 목록 배치 위에 얹은 창작 해석 전부', cut: '이 배치는 주목할 만하다—손택은 유럽 예술영화 감독들을 선호했지만, 큐브릭의 SF 서사시를 그들과 동등한 반열에 올려놓았다. 그녀의 1965년 에세이 「재난의 상상력」은 1950~60년대 SF 영화들이 핵시대의 공포를 다루는 방식을 분석했는데, 「2001」은 이런 장르적 관습을 완전히 전복시킨 작품이었다. 손택은 이 에세이에서 대부분의 SF 영화가 "외계인 침략을 통해 비인격성의 공포"를 표현한다고 주장했지만, 「2001」의 HAL 9000은 인간보다 더 인간적으로 묘사되어 그녀의 비평적 틀을 넘어서는 작품이었다.' },
  { why: '박찬욱 현기증 — 서술자의 교훈', cut: '한 편의 영화가 한 사람의 인생 진로를 결정지을 수 있다는 것을 보여주는 사례다.' },
  { why: '박찬욱 쳐다보지 마라 — 영화사 일반론', cut: '뢰그 특유의 비선형 편집과 붉은색의 반복 사용은 후대 공포영화에 큰 영향을 미쳤다.' },
  { why: '박찬욱 천국과 지옥 — 근거 없는 영향 단정', cut: '구로사와의 치밀한 서스펜스 구축은 박찬욱이 평생 참조한 영화적 문법이다.' },
  { why: '박찬욱 순응자 — 일반론 + 영향 단정', cut: '비토리오 스토라로의 촬영은 빛과 그림자를 통해 인물의 심리를 시각화하는 교본이 되었다. 박찬욱의 화면 미학에 지대한 영향을 끼친 작품이다.' },
  { why: '마틴 스콜세지 시민 케인 — 서술자의 인상평', cut: '거의 낭만적인 방식으로 이 영화에 대한 찬사를 표현했다.' },
  { why: '제임스 카메론 대부 — 작품 일반 소개', cut: '말론 브란도와 알 파치노가 출연한 이 마피아 서사시는 가족, 권력, 충성심이라는 주제를 다루며 미국 영화사의 정점으로 평가받는다.' },
  { why: '덴젤 워싱턴 대부 — 영향 단정', cut: '다층적 인물 구축과 긴장감 있는 서사가 그의 연기 철학에 깊은 영향을 미쳤다.' },
  { why: '척 노리스 카사블랑카 — 영향 단정', cut: '소년 시절의 이 영화 체험이 그에게 스크린이 주는 힘을 각인시켰다.' },
  { why: '폴 토마스 앤더슨 분노의 주먹 — 영향 단정', cut: '드니로의 몰입 연기와 스코세이지의 격렬한 연출 스타일은 앤더슨이 배우와 협업하는 방식에 영향을 주었다.' },
  { why: '게리 올드만 화양연화 — 심경 추정', cut: '말로 표현할 수 없는 감정을 영상과 음악으로 전달하는 왕가위의 연출에 매료된 것이다.' },
  { why: '미라 무라티 2001 — 서술자의 해석 두 문장', cut: 'AI를 만드는 사람이 인공지능 HAL 9000이 인간을 배신하는 영화에서 영감을 받는다는 점은 그녀의 안전 의식과 무관하지 않다. 영화 속 HAL은 무라티가 ChatGPT 출시 직후부터 줄곧 강조해온 \'정렬되지 않은 AGI\'의 우화에 가깝다.' },
  { why: '리안 2001 — 후속작 영향 단정', cut: '큐브릭의 순수 시각 언어가 시대를 한참 앞질러 갔다는 점, 이야기보다 이미지로 사유를 끌고 가는 방식이 후일 \'라이프 오브 파이\'의 표류 연출과 \'제미니 맨\'의 고프레임 실험으로 이어지는 토대가 되었다.' },
  { why: '리들리 스콧 2001 — 작품 일반 평가', cut: '이 작품은 SF 영화가 가질 수 있는 시각적 완성도와 서사적 깊이를 새롭게 정의했으며, 스콧에게도 장르 영화의 가능성을 근본적으로 재인식하게 하는 계기가 되었다.' },
  { why: '폴 디랙 2001 — 「추정된다」로 끝나는 창작', cut: '우주와 인류 진화에 대한 큐브릭의 철학적 비전이 수학적 아름다움을 추구하던 물리학자의 감성과 공명한 것으로 추정된다.' },
  { why: '데이비드 보위 2001 — 문장 뒷도막의 영향 단정', cut: '사용했으며, 우주와 인간 진화에 대한 장대한 비전은 보위의 우주적 페르소나 형성에 결정적 영향을 미쳤다.', to: '사용했다.' },
  { why: '스티븐 스필버그 2001 — 의미 부여', cut: '이 작품은 그에게 영화가 단순한 오락을 넘어선 경험을 줄 수 있음을 보여주었다.' },
  { why: '잭 스나이더 2001 — 영향 단정', cut: '큐브릭의 시각적 완벽주의와 인류 진화를 다룬 거대한 서사가 스나이더의 신화적 영화 미학에 근본적 영향을 주었다.' },
  { why: '마크 월버그 택시 드라이버 — 「있었을 것이다」 추측', cut: '보스턴 빈민가 출신으로 10대에 범죄와 마약에 빠졌던 자신의 과거와 트래비스 비클의 어둠이 겹치는 부분이 있었을 것이다.' },
  { why: '제임스 카메론 택시 드라이버 — 작품 일반 소개 두 문장', cut: '로버트 드 니로가 연기한 정신적으로 불안정한 베트남전 참전용사 트래비스 비클의 이야기는 대도시의 어둠과 인간 소외를 다룬다. 드 니로의 즉흥 연기 "나한테 말하는 거야?"는 영화사에서 가장 상징적인 대사 중 하나가 되었다.' },
  { why: '디카프리오 아라비아의 로렌스 — 사용자가 지목한 창작 문장', cut: '데이비드 린 감독의 웅장한 서사와 피터 오툴의 카리스마 넘치는 연기는 디카프리오가 추구하는 서사적 영화의 기준점이 되었다.' },
  { why: '디카프리오 선셋 대로 — 작품 일반 소개', cut: '할리우드의 어두운 이면을 그린 빌리 와일더의 걸작으로, 영화 산업 안에서 살아가는 인물들의 집착과 몰락을 날카롭게 포착한다.' },
  { why: '로저 페더러 글래디에이터 — 서술자의 비유', cut: '검투사 막시무스의 비극과 결투 미학이, 코트 위에서 한 점 한 점을 칼끝처럼 다루는 페더러의 감수성과 맞닿아 있다.' },
  { why: '우사인 볼트 글래디에이터 — 서술자의 비유', cut: '콜로세움에서 사슬을 끊고 황제와 맞서는 막시무스의 서사가, 매번 결승선 앞에서 자기 한계와 정면으로 부딪쳐 온 자메이카 단거리 황제의 미감과 정확히 맞물린다.' },
  { why: '비벡 라마스와미 글래디에이터 — 서술자의 비유', cut: '노예로 전락한 장군 막시무스가 복수가 아니라 원칙을 위해 싸우는 서사는, 비벡이 공개 인터뷰에서 반복해 강조해 온 사명과 결단의 가치와 맞닿아 있다.' },
  { why: '조코비치 글래디에이터 — 서술자의 해석', cut: '24개의 메이저 트로피를 쌓으면서도 빅3 시대 내내 \'미움받는 챔피언\'이라는 평을 들어온 그가, 적을 짓밟는 검투사가 아니라 \'좋은 사람이 될 위험\'을 묻는 인물에게 자기 자신을 비춰 본다는 사실이 이 한 줄에 박혀 있다.' },
  { why: '조니 캐시 글래디에이터 — 동기 추정', cut: '로마사에 대한 깊은 관심이 이 영화 사랑으로 이어졌다.' },
  { why: '리처드 닉슨 아라비아의 로렌스 — 정치 해석 창작', cut: '제국의 야망과 사막의 고독한 영웅이라는 주제가 닉슨의 외교 철학, 특히 중동 정책에 대한 관심과 맞닿아 있었다.' },
  { why: '데이비드 핀처 아라비아의 로렌스 — 작품 영향 단정', cut: '린의 서사적 스케일과 인물의 내면을 동시에 포착하는 능력은 핀처가 조디악과 소셜 네트워크에서 추구한 방향과 일치한다.' },
  { why: '데니 빌뇌브 아라비아의 로렌스 — 서술자의 비유', cut: '아라키스의 황금빛 모래 능선과 권력 다툼의 호흡은 린에게 진 빚을 숨기지 않는다.' },
  { why: '데니 빌뇌브 현기증 — 서술자의 헌사 해석', cut: '토론토의 노란 안개와 거대한 거미는 \'현기증\'의 강박을 21세기 시네마로 옮겨 적은 헌사다.' },
  { why: '오즈 야스지로 바람과 함께 사라지다 — 작법 변화 단정', cut: '그는 이후 한 시대의 끝과 새 출발을 같은 평면에 놓는 자신의 결말 화법을 다듬어 갔다.' },
  { why: '빈 디젤 바람과 함께 사라지다 — 근거 없는 반응 서술', cut: '액션 장르 배우인 그가 1939년 로맨스 대서사시를 최고로 선택한 점이 의외로 받아들여졌다.' },
  { why: '손흥민 기생충 — 서술자의 의미 부여 두 덩어리', cut: '고 짧게 답했는데, 한국인 최초로 EPL 최고의 아시아 선수 반열에 오른 그가 한국인 최초의 아카데미 작품상 수상작을 꺼내든 장면이라 의미가 컸다. 런던 생활에서 한국 콘텐츠가 자랑이자 위안이라는 그의 평소 태도가 그대로 묻어났다.', to: '고 짧게 답했다.' },
  { why: '이드리스 엘바 기생충 — 감상 효과 단정', cut: '계급 불평등에 대한 신랄한 풍자가 그에게 깊은 감정적 울림을 주었다.' },
  { why: '나오미 왓츠 기생충 — 취향 일반화', cut: '어둡고 복잡한 소재에 본능적으로 끌리는 그녀의 취향을 반영하는 선택이다.' },
  { why: '가즈오 이시구로 동경 이야기 — 자기 작품 대비 해석', cut: '\'나를 보내지 마\'의 학생들이 그 짧은 인생을 단정한 슬픔으로 받아들이는 장면들은, \'동경 이야기\'의 마지막 시퀀스와 같은 거리감 위에 서 있다.' },
  { why: '페데리코 펠리니 2001 — 두 감독 비교 창작', cut: '인간의 진화 한 단계 한 단계를 거의 대사 없이 영상과 음악만으로 통과하는 큐브릭의 방법은, 「8과 1/2」 마지막 원무 장면에서 펠리니가 시도한 「언어 너머의 시네마」와 같은 야심을 갖고 있었다. 두 감독은 다른 좌표에서 출발해 같은 결승점, 즉 영상만이 다다를 수 있는 형이상학을 향해 걸어갔다.' },
  { why: '페드로 알모도바르 시민 케인 — 지명 오기', cut: '매드리드 자취방에서', to: '마드리드 자취방에서' },
  { why: '페드로 알모도바르 블루 벨벳 — 지명 오기(두 곳)', cut: '자기 영화의 매드리드가', to: '자기 영화의 마드리드가' },
  { why: '페드로 알모도바르 블루 벨벳 — 지명 오기(두 곳)', cut: '이후의 매드리드 영화로', to: '이후의 마드리드 영화로' },
  { why: '이드리스 엘바 좋은 친구들 — 문장 사이에 깨진 문자가 끼었다', cut: '덧붙였다Jean 복잡한 스토리텔링과 연기 교과서적 장면들이 그에게 영감을 주었다.', to: '덧붙였다.' },
]

/**
 * 🔴 **2차 도려내기 — 「출처없음」 356건 통독(26.09.05).**
 *
 * 필터에서 「말한 것은 맞는데 언제 어디서가 없다」로 떨어진 356건을 모두 읽었다. 절반 넘게
 * 살릴 만했지만, 상당수 끝에 1차와 같은 결함이 붙어 있었다 — 「…의 토대가 됐다」·「…에
 * 영감을 주었다」·「…와 맞닿아 있다」처럼 **화자가 말한 적 없는 영향을 단정하는 문장**이다.
 *
 * 1차와 달리 문장이 아니라 **기록 id** 로 지정한다. 같은 문구가 여럿에 걸치지 않고 하나씩
 * 다르기 때문이다. `drop` 은 잘라 낼 자리다 — `last` 끝 문장, `last2` 끝 두 문장, `s2`·`s3`
 * 그 번째 문장, `{ from, to }` 는 문장 가운데 한 절만 고칠 때 쓴다.
 *
 * 자르면 100자 아래로 내려가 결국 글에 못 실리는 것도 많다. 그래도 자른다. 이 값은 블로그
 * 이전에 **서비스가 보여 주는 감상**이고, 근거 없는 문장을 남겨 둘 자리가 없다.
 */
type Trim = { id: string; who: string; drop: 'last' | 'last2' | 's2' | 's3' | { from: string; to: string } }
/**
 * 🔴 **차수로 나눈다. 이미 반영한 차수는 다시 돌리지 않는다.**
 *
 * `drop: 'last'` 는 **멱등이 아니다.** 이미 꼬리를 자른 기록에 다시 걸면 그다음 문장까지
 * 잘라 내고, 두 문장짜리였던 것은 **0자가 된다**(26.09.05 미리보기에서 케빈 파이기 4건과
 * 잭 스나이더 4건이 그렇게 비었다). 자를 문장을 원문 그대로 적어 두는 `CUTS` 와 달리 여기는
 * 자리로 지정하기 때문이다.
 *
 * 그래서 반영이 끝난 차수는 `applied: true` 로 닫는다. 목록은 이력으로 남기고 실행에서만
 * 뺀다 — 무엇을 왜 잘랐는지가 이 파일의 존재 이유다.
 */
const TRIM_WAVES: { why: string; applied: boolean; rows: Trim[] }[] = [
  {
    why: '2차 — 「출처없음」 356건 통독(26.09.05)',
    applied: true,
    rows: [

  { id: '114f4ef5-117b-4882-b7d7-057d8a84a2f4', who: '양조위 차이나타운', drop: 'last' },
  { id: '3335cc6d-f64a-4fa2-aef6-5607683a1cb2', who: '찰리 허냄 드라이브', drop: 'last' },
  { id: 'c1c9b41f-fdcf-4f55-b81c-176388c5579d', who: '다프트 펑크 천국의 유령', drop: 'last' },
  { id: 'c3f97f92-c3d1-4b91-9312-097b67e4e4b4', who: '워쇼스키 자매 2001 스페이스 오디세이', drop: 'last' },
  { id: '02bf4ee9-f24e-4a97-8e76-61a23ab9d183', who: '워쇼스키 자매 아키라', drop: 'last' },
  { id: '3629e4ad-eab8-4341-a433-a3cb1e05b7da', who: '리처드 닉슨 콰이강의 다리', drop: 'last' },
  { id: '037d62f2-2da6-43f1-8fe3-ca01cf31ccc0', who: '커스틴 던스트 가위손', drop: 'last' },
  { id: '15f27571-10c5-48b7-b59b-1d50b27104a9', who: '마크 러팔로 8과 1/2', drop: 'last' },
  { id: '16387d8c-b151-4e78-9495-5b6b0d057bc6', who: '마이클 매드슨 폭력 탈옥', drop: 'last' },
  { id: '03d7c660-e27a-44d5-bc32-495e02346069', who: '제임스 카메론 죠스', drop: 'last' },
  { id: '1741e817-0b4d-41d5-9f57-3f0c122bd3a2', who: '앤디 워홀 메트로폴리스', drop: 'last' },
  { id: '1790b1e0-5e7e-42ef-8a39-c4c8fdca2729', who: '리들리 스콧 제7의 봉인', drop: 'last' },
  { id: '18dbc643-f188-4b8b-86d8-6a75494c806b', who: '베네딕트 컴버배치 황무지', drop: 'last' },
  { id: '1952e5cb-2526-4ba4-85f4-f3a3bdacbc76', who: '나발 라비칸트 파이트 클럽', drop: 'last' },
  { id: 'e6958fdf-3107-42fd-88b6-c4041e4fb29c', who: '조 샐다나 니키타', drop: 'last' },
  { id: '1d571527-7cbd-4045-bac8-d8164e5ab988', who: '데니스 리처즈 플래툰', drop: 'last' },
  { id: '09695e5c-fadc-478d-aedd-335b33cf2f6d', who: '사무엘 L. 잭슨 무사 쥬베이', drop: 'last' },
  { id: '09b2c049-6b3e-460a-be0e-33df54aa8218', who: '코엔 형제 닥터 스트레인지러브', drop: 'last' },
  { id: 'edf0414b-cad6-4161-9b0e-870b5404ad4d', who: '크리스토퍼 놀란 12명의 성난 사람들', drop: 's2' },
  { id: '7292f330-6b94-4e65-9856-cb53360d4875', who: '조 샐다나 에이리언', drop: { from: '중 하나로 언급하며 강인한 여성 액션 캐릭터에 대한 열정을 드러냈다.', to: '중 하나로 언급했다.' } },
  { id: '0a61fd87-9cda-422b-8c39-c9eff5a6489d', who: '재커리 퀸토 사랑의 기적', drop: 'last' },
  { id: '069719c5-0d10-4a3e-b659-13d022b74604', who: '안드레이 타르콥스키 산딸기', drop: 'last2' },
  { id: 'a943e20d-c64d-4674-9c22-5425fb2870f1', who: '워쇼스키 자매 코난: 바바리안', drop: 'last' },
  { id: 'e0842fd9-83a4-415c-952f-2ee6cc2d9ecf', who: '견자단 맹룡과강', drop: 'last' },
  { id: 'e441b0f9-3fbf-4df8-a919-5805709cb220', who: '앤디 워홀 스파이 대소동', drop: 'last' },
  { id: '4953affa-79a6-48f3-af6a-65a225aece08', who: '마릴린 먼로 세일즈맨의 죽음', drop: 'last' },
  { id: 'adde72a2-9100-4618-9c1e-c1dad13f0fde', who: '케빈 파이기 빽 투 더 퓨쳐 2', drop: 'last' },
  { id: '2c894822-f5db-488a-a306-0379627055d8', who: '리들리 스콧 시민 케인', drop: 'last' },
  { id: 'c12d257f-7aef-4e18-b43a-ec3ecb92a25b', who: '로버트 드 니로 시에라 마드레의 황금', drop: 'last' },
  { id: 'e9319de2-00a2-4aac-8ffe-92720332d847', who: '워쇼스키 자매 공각기동대', drop: 's2' },
  { id: 'b5288596-fd54-4263-80f9-0e517ffcaf0f', who: '트래비스 캘러닉 펄프 픽션', drop: 'last' },
  { id: '558d05e8-c7c5-41d8-81da-0f51325dac8d', who: '데미 무어 테스', drop: 'last' },
  { id: '88d61239-78b1-4fb8-9ade-1f3bd0d6860b', who: '케빈 파이기 스타워즈 4', drop: 'last' },
  { id: 'b9dd0d55-cff2-4ac9-97c2-373fd2682ede', who: '리들리 스콧 길다', drop: 'last' },
  { id: '5862335b-d8d1-4580-a919-060a06b7e971', who: '마이클 조던 무법자 조시 웰즈', drop: { from: '서부극 애호가였으며, 이 취향은 부자간에 공유된 것이다.', to: '서부극 애호가였다.' } },
  { id: '5c77e6b2-d4d5-466f-bb0a-a0c587931fb2', who: '존 트라볼타 더럽혀진 얼굴의 천사', drop: 's2' },
  { id: '907d9793-a44b-4e9a-b1c7-f4b1404a9d1c', who: '박찬욱 포인트 블랭크', drop: 'last' },
  { id: 'caa00780-8c08-4a40-ba1a-b6e7b75aceb5', who: '레이첼 와이즈 레즈', drop: 'last' },
  { id: '92076f6e-4947-4293-9766-327720100ed7', who: '노무현 오아시스', drop: 'last' },
  { id: '9311e3cf-a014-41bf-bf04-4e28411ecd6c', who: '하비 카이텔 영향 아래 있는 여자', drop: 'last' },
  { id: '66d27a58-6065-4030-92e8-3f67e467ee54', who: '데이비드 린치 나의 삼촌', drop: 'last' },
  { id: '9856ff83-9c96-4c6f-bbd1-6fef6694d432', who: '주성치 미스터 부: 반근팔냥', drop: 'last' },
  { id: '9d0bb32d-7c62-40bb-8c9b-2421c153ec77', who: '로버트 드 니로 젊은이의 양지', drop: 'last' },
  { id: '9cb78d91-3081-4bfb-bffd-6f1a52809d27', who: '노암 촘스키 자전거 도둑', drop: 'last' },
  { id: '9e306848-8d8f-44b1-bb24-2e9a59347ecd', who: '주윤발 고독', drop: { from: '알랭 드롱처럼 보인다고 말했을 정도로, 이 영화 속 고독한 킬러의 이미지는 주윤발의 연기 표본이 되었다.', to: '알랭 드롱처럼 보인다고 말했다.' } },
  { id: '9ead51b1-4f59-46dc-8aad-7882c68d438f', who: '노암 촘스키 시티 라이트', drop: 'last' },
  { id: '35b9cdfc-e1c3-4452-82b3-ba668a9f3d31', who: '오즈 야스지로 환타지아', drop: 's2' },
  { id: '6183edda-6f54-4431-bafc-3715fd3e6945', who: '데이비드 핀처 택시 드라이버', drop: 'last' },
  { id: '51023134-a747-444e-b60b-0fcc5e87b6a6', who: '잭 스나이더 살아있는 시체들의 밤', drop: { from: '리메이크한 작품이라는 점에서 그의 영화 인생에 결정적 영향을 준 원작이다.', to: '리메이크한 작품이다.' } },
  { id: 'f963a778-d12a-4314-9df1-f6276fcb793c', who: '데이비드 핀처 찬스', drop: 'last' },
  { id: 'e88d34f2-06c3-4e04-87c4-2554b4aec6a6', who: '로사리오 도슨 네트워크', drop: 'last' },
  { id: '63da1fa6-1102-44b3-9640-027362dd19a8', who: '리들리 스콧 스타워즈 4', drop: 'last' },
  { id: '7abfe800-3ff5-4d1e-b362-df73f5dcabf9', who: '데이비드 핀처 젤리그', drop: 'last' },
  { id: '8ec4451b-d83e-49e8-92f8-56456b39c9e0', who: '잭 스나이더 침실의 표적', drop: 'last' },
  { id: '430e97ef-9c1d-4028-9168-b14256dc3bce', who: '카를로 안첼로티 디어헌터', drop: 'last' },
  { id: '6d50ffde-e87b-42e4-a7df-21951a8d07ab', who: '코엔 형제 천국과 지옥', drop: 'last' },
  { id: '8e726db3-8f4a-4d95-a315-edfc827b5a3f', who: '견자단 당산대형', drop: 'last' },
  { id: '82b2b319-90fc-43e9-9a60-7d35c33f847d', who: '라나 델 레이 아메리칸 뷰티', drop: 'last' },
  { id: 'ead335eb-03b6-45d7-91ec-2dbc09f3f021', who: '우마 서먼 캘러미티 제인', drop: 'last' },
  { id: 'e434dd64-865a-413b-bfdb-b1344eb2f186', who: '워쇼스키 자매 무사 쥬베이', drop: 'last' },
  { id: '5e07623b-1065-4ad5-a525-b2ae0c2cc474', who: '마이클 B. 조던 아키라', drop: 'last' },
  { id: '7ac53327-574c-4f2f-8b3e-94fffb65ede7', who: '존 레논 시민 케인', drop: 'last' },
  { id: 'd606f2cb-d85e-4f7b-8897-2b1e959ac602', who: '양자경 사운드 오브 뮤직', drop: 'last' },
  { id: 'df0f57de-cc93-4d95-a4ac-960eb1ad1430', who: '실베스터 스탤론 마티', drop: 'last' },
  { id: '46c682a4-9be7-4425-b26f-748350e5f051', who: '데이비드 보위 시계태엽 오렌지', drop: 'last' },
  { id: '63d96c19-6651-48f5-97e5-ca2c37750b55', who: '에미넴 시계태엽 오렌지', drop: 'last' },
  { id: 'f6f5eeb1-6cc2-4c8e-9632-0ad6fd7589da', who: '케빈 파이기 보이지 않는 위험', drop: 'last' },
  { id: 'ec82e9cd-4f93-4d06-a9e1-172ecebc7b96', who: '존 트라볼타 대부', drop: 'last' },
  { id: 'ffa94757-3906-4ffd-b0e8-5dbdf71c7401', who: '나발 라비칸트 위플래쉬', drop: 'last' },
  { id: 'e6a93371-7faa-4c6d-a049-753c12a67ab3', who: '로버트 패틴슨 네 멋대로 해라', drop: 'last' },
  { id: '66c59ebf-a109-4917-9f18-9ada45967f39', who: '케빈 파이기 배트맨', drop: { from: '확인한 경험이었으며, 슈퍼히어로 영화에 대한 파이기의 신념을 강화한 작품이었다.', to: '확인한 경험이었다.' } },
  { id: 'd546f738-86a9-4bbf-a08f-fdddda2be8fe', who: '워쇼스키 자매 나의 장미빛 인생', drop: 'last' },
  { id: 'ad6a03a1-22e5-47c9-9b94-070ccc921002', who: '코비 브라이언트 스트레이트 아웃 오브 컴턴', drop: 'last' },
  { id: '695b8861-59ab-43a0-a389-9e81d778fe6f', who: '스티븐 킹 쇼생크 탈출', drop: 'last' },
  { id: 'ad3e7bfb-16ab-48fa-af1a-4a57d55b1116', who: '레이프 파인스 하이 눈', drop: 'last' },
  { id: 'dc36afc7-8070-4c9f-badf-995c5f3d30b4', who: '카를로 안첼로티 원스 어폰 어 타임 인 아메리카', drop: 'last' },
  { id: '82859c79-e3c1-4923-9416-a903e509a47d', who: '노먼 리더스 미드나잇 카우보이', drop: 'last' },
  { id: 'b2cf680c-f620-4d34-9972-7dfded1d4102', who: '폴 토마스 앤더슨 내쉬빌', drop: 'last' },
  { id: 'f6f93c74-3c31-4ee6-be87-96ec9b5f5bc7', who: '코엔 형제 옛날 옛적 서부에서', drop: 'last' },
  { id: 'a8161625-68e0-49f7-a93d-f89a6fad03b1', who: '잭 스나이더 7인의 사무라이', drop: 'last' },
  { id: 'f3d411b3-7af3-4acb-a9f6-1dab38a1a947', who: '이상 시인의 피', drop: 's2' },
  { id: '8bbc5406-9d4c-4a0e-a411-5ce693cf461d', who: '잭 스나이더 거미집의 성', drop: 'last' },
  { id: 'ace1bbd5-6cb3-49dc-b517-37f1c66af6cf', who: '스티븐 킹 소서러', drop: 'last' },
  { id: 'cf55774c-2336-4b42-9678-b4ab6e56ee6b', who: '레이프 파인스 8과 1/2', drop: 'last' },
  { id: '741c7c4e-d0f3-44f6-b02d-0b02b4453b23', who: '케빈 파이기 13일의 금요일', drop: 'last' },
  { id: '297cc489-5e87-4352-a9de-3991c01ba12b', who: '모니카 벨루치 달콤한 인생', drop: 'last' },
  { id: '686d542f-0854-4767-95b0-1fb7316cb513', who: '데브 파텔 악마를 보았다', drop: { from: '힘에 감탄했으며, 자신의 감독 데뷔작에 직접적인 영감을 준 작품이다.', to: '힘에 감탄했다.' } },
  { id: '4904b0ed-5b62-4a12-8b23-e15e9e6dd44c', who: '나발 라비칸트 라이프 오브 브라이언', drop: 'last' },
  { id: '3581eb97-fee4-4b4d-9c98-733c9b73ba14', who: '제니퍼 로렌스 브리짓 존스의 일기', drop: 'last' },
  { id: 'a2281868-c5ae-4acb-a073-f8f038268c12', who: '빌리 아일리시 드라이브', drop: 'last' },
  { id: 'aecd874d-fb5d-471a-a259-94e59ebcfa2f', who: '미키 루크 워터프론트', drop: 'last' },
  { id: '14dab446-5870-432d-a0bc-a1d971c68a77', who: '에드워드 호퍼 워터프론트', drop: 'last2' },
  { id: 'f23a6488-2099-489a-9e43-bc3cf197efb8', who: '앤디 워홀 미녀와 야수', drop: 'last' },
  { id: 'e7e634e8-15de-4f00-ae9b-3c7f6a6f0a63', who: '잭 스나이더 욕망이라는 이름의 전차', drop: 'last' },
  { id: 'e6fb9be3-c41d-48cf-816c-5e6f8db5a09f', who: '마릴린 먼로 욕망이라는 이름의 전차', drop: 's2' },
  { id: '3e93f113-d6b1-4c6a-a9b7-516b257760fa', who: '나발 라비칸트 메멘토', drop: 'last' },
  { id: 'c6acf908-d777-4982-bb41-fc87ad674f80', who: '돌리 파튼 바람과 함께 사라지다', drop: 'last' },
  { id: 'fc1ee918-e65b-4d71-bad9-3351c4f5f394', who: '워쇼스키 자매 블레이드 러너', drop: 'last' },
  { id: '6f468583-7fbd-453f-8cbd-b0074bd23555', who: '제임스 맥어보이 내 이름은 조', drop: 'last' },
  { id: 'd5e1a4c4-3ea0-4684-83c4-79758f11c317', who: '코엔 형제 차이나타운', drop: 'last' },
  { id: '187befb8-e5d2-4f30-8ad6-3bd4c1df87b7', who: '워쇼스키 자매 이웃집 토토로', drop: 'last' },
  { id: '33c545a8-97b6-4d29-925f-785ee1cc38e2', who: '케빈 파이기 레이더스', drop: 'last' },
  { id: '6a6f3cf7-312e-4f56-b1ef-1cdd4f2d04e5', who: '레이프 파인스 안드레이 루블료프', drop: 'last' },
  { id: 'd63f8845-cf05-40be-b0c0-ad784fa06b75', who: '아리아나 그란데 투 웡 푸', drop: 'last' },
  { id: 'c5320bee-c6a4-4fbb-a5d2-97d5132ed077', who: '나발 라비칸트 칠드런 오브 맨', drop: 'last' },
  { id: '46cd8cd3-a453-4f5c-bec3-061e5cc0405c', who: '김연아 물랑루즈', drop: 's3' },
  { id: '3093e339-03cd-41e1-b2f6-0c10d9578559', who: '김연아 파라노말 액티비티', drop: 's3' },
  { id: 'e449ebf0-a7c9-47da-a127-663744e6dfae', who: '안드레이 타르콥스키 모래의 여자', drop: 's2' },
  { id: 'ce55dc34-f638-473c-a2ae-d4e667fdbb4e', who: '오즈 야스지로 역마차', drop: 'last' },
  { id: '66ceaff2-29ef-4a12-be32-7dc185cb9935', who: '오즈 야스지로 분노의 포도', drop: 'last2' },
  { id: '167a6b70-1c2a-47c9-84cc-5c441142b777', who: '오즈 야스지로 부운', drop: 's2' },
  { id: '33ebbb85-ef22-4c72-94a2-34038587a1e2', who: '사비 에르난데스 쇼생크 탈출', drop: { from: '이야기를 선택한 답변은, 경기장에서 인내와 동료의 움직임을 중시해 온 사비의 이미지와도 맞닿지만 그 연결을 과장하지 않고 직접 밝힌 최애 영화라는 사실 자체가 분명하다.', to: '이야기다.' } },
  { id: '55fc475e-d5cf-40c0-a6b5-e9269256c332', who: '에드워드 호퍼 욕망이라는 이름의 전차', drop: 'last' },
    ],
  },
  {
    why: '3차 — 「귀속없음」 87건 통독(26.09.05). 신호를 넓히며 새로 실리게 된 것들',
    applied: true,
    rows: [
  { id: '02f626fa-3851-4c36-bbbc-52b0a014ce0d', who: '잭 스나이더 블레이드 러너', drop: 'last' },
  { id: '7b687198-fc4a-4073-a4f7-107edb19af24', who: '잭 스나이더 세븐', drop: 'last' },
  { id: '1f06639d-c576-43e0-b48f-200c2d35e496', who: '케빈 파이기 제국의 역습', drop: 'last' },
  { id: '702e0753-8368-463c-95b6-e77aa95487e6', who: '케빈 파이기 제다이의 귀환', drop: 'last' },
  { id: 'ce8e2801-2637-4982-89e6-f47f58d509a6', who: '오즈 야스지로 레베카', drop: 'last' },
  { id: '7ff839db-6e12-4f74-8cc2-62804c5cd124', who: '데이비드 핀처 내일을 향해 쏴라', drop: 'last' },
  { id: '4d707e6a-2aa0-463f-9bdb-e5db2a7a21ba', who: '주성치 키드', drop: 'last' },
  { id: 'c4ea23a2-2b38-45cd-a811-a56010dd18cd', who: '주성치 칠십이가방객', drop: 'last' },
  { id: 'da1684b1-a26f-4f75-b0a3-cfdf13b3b6f6', who: '견자단 정무문', drop: 'last' },
  { id: '7c60082d-c3a2-4abb-988b-84e77ffee761', who: '토니 자 Born to Fight', drop: 'last' },
  { id: '7950a08e-cb84-4e47-af70-896e5ce30e31', who: '위켄드 블레이드 러너', drop: 'last' },
  { id: 'dceb0696-ea0c-4237-8cab-e64abae594b5', who: '루니 마라 필라델피아 스토리', drop: 'last' },
  { id: 'a8750a34-6090-43c0-9219-e01342e1f3f4', who: '킴 베이싱어 마이 페어 레이디', drop: 'last' },
  { id: '10d7e79b-0dab-4bab-8cda-85d2ccffeb3d', who: '웨슬리 스나입스 오독', drop: 'last' },
  { id: 'ca2f8cf6-b2e2-4c34-8e4c-bbbcb7564bea', who: '라이언 고슬링 람보', drop: 'last' },
    ],
  },
]


const page = async <T,>(t: string, s: string, f?: (q: any) => any): Promise<T[]> => {
  const out: T[] = []
  for (let i = 0; ; i += 1000) {
    let q = db.from(t).select(s).range(i, i + 999)
    if (f) q = f(q)
    const { data, error } = await q
    if (error) throw error
    out.push(...(data as never[]))
    if (!data!.length || data!.length < 1000) break
  }
  return out
}

const locales = await page<{ content_id: string; title: string; locale: string }>('content_locales', 'content_id, title, locale')
const koTitle = new Map(locales.filter((l) => l.locale === 'ko').map((l) => [l.content_id, l.title]))

for (const fx of FIXES) {
  const { data: c } = await db.from('celebs').select('id, nickname').eq('slug', fx.slug)
  if (!c?.length) { console.log(`인물 없음: ${fx.slug}`); continue }
  const { data: rows } = await db.from('celeb_contents').select('id, content_id, review').eq('celeb_id', c[0].id)
  // 이미 반영된 것을 다시 잡아 두 번 붙이지 않는다
  const hit = (rows ?? []).filter((r) => koTitle.get(r.content_id) === fx.title
    && (r.review ?? '').includes(fx.from) && !(r.review ?? '').includes(fx.to))
  if (!hit.length) { console.log(`손댈 것 없음: ${c[0].nickname} 『${fx.title}』`); continue }
  for (const h of hit) {
    const next = h.review!.replace(fx.from, fx.to)
    console.log(`\n${c[0].nickname} 『${fx.title}』 — ${fx.why}`)
    console.log(`  전: ${h.review!.slice(0, 60)}`)
    console.log(`  후: ${next.slice(0, 60)}`)
    if (!DRY) {
      const { error } = await db.from('celeb_contents').update({ review: next }).eq('id', h.id)
      if (error) throw error
      console.log('  → 반영')
    }
  }
}

// ── 꼬리 문장 도려내기 ────────────────────────────────────────
const all = await page<{ id: string; review: string | null }>('celeb_contents', 'id, review')
let done = 0
let miss = 0
for (const cx of CUTS) {
  const hit = all.filter((r) => (r.review ?? '').includes(cx.cut))
  if (!hit.length) { console.log(`\n대상 없음 — ${cx.why}`); miss++; continue }
  for (const h of hit) {
    // 문장만 빼고 붙어 버린 공백을 정리한다
    const next = h.review!.replace(cx.cut, cx.to ?? '').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim()
    console.log(`\n${cx.why}`)
    console.log(`  ${h.review!.length}자 → ${next.length}자`)
    console.log(`  후: …${next.slice(-70)}`)
    if (!DRY) {
      const { error } = await db.from('celeb_contents').update({ review: next }).eq('id', h.id)
      if (error) throw error
      console.log('  → 반영')
    }
    done++
  }
}
console.log(`\n꼬리 문장 ${done}건 처리 · 못 찾은 항목 ${miss}건`)
console.log(DRY ? '미리보기다. 실제로 고치려면 --yes 를 붙인다.' : '완료')

// ── 2차 도려내기 ─────────────────────────────────────────────
const byId = new Map(all.map((r) => [r.id, r]))
const sents = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean)
let t2 = 0
let t2miss = 0
for (const wave of TRIM_WAVES) {
  if (wave.applied) { console.log(`\n건너뜀 — ${wave.why} (반영 완료)`); continue }
  console.log(`\n${wave.why}`)
  for (const tr of wave.rows) {
  const row = byId.get(tr.id)
  if (!row?.review) { console.log(`\n기록 없음 — ${tr.who}`); t2miss++; continue }
  const cur = row.review.trim()
  let next: string
  if (typeof tr.drop === 'object') {
    if (!cur.includes(tr.drop.from)) { console.log(`\n이미 반영됨 — ${tr.who}`); continue }
    next = cur.replace(tr.drop.from, tr.drop.to)
  } else {
    const s = sents(cur)
    const keep = tr.drop === 'last' ? s.slice(0, -1)
      : tr.drop === 'last2' ? s.slice(0, -2)
      : s.filter((_, i) => i !== (tr.drop === 's2' ? 1 : 2))
    if (keep.length === s.length) { console.log(`\n자를 문장 없음 — ${tr.who}`); t2miss++; continue }
    next = keep.join(' ')
  }
  next = next.replace(/[ \t]{2,}/g, ' ').trim()
  if (next === cur) { console.log(`\n변화 없음 — ${tr.who}`); continue }
  console.log(`\n${tr.who}  ${cur.length}자 → ${next.length}자${next.length < 100 ? '  (100자 미만 — 글에는 안 실린다)' : ''}`)
  console.log(`  후: ${next.slice(0, 110)}`)
  if (!DRY) {
    const { error } = await db.from('celeb_contents').update({ review: next }).eq('id', tr.id)
    if (error) throw error
  }
  t2++
  }
}
console.log(`\n2차 도려내기 ${t2}건 처리 · 건너뜀 ${t2miss}건`)
