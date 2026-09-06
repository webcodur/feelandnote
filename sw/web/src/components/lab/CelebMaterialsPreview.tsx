import CelebWorldBanner from "@/components/features/celeb/CelebWorldBanner";
import CelebWorldMaterialScope from "@/components/features/celeb/CelebWorldMaterialScope";
import { getWorldMaterial, type WorldMaterialDefinition } from "@/lib/celeb/worldMaterial";
import { formatSectionNumber, getWorldStyle } from "@/lib/celeb/worldStyle";
import styles from "./CelebMaterialsPreview.module.css";

interface MaterialSample {
  worldId: string;
  worldLabel: string;
  person: string;
  years: string;
  direction: string;
}

type TextureId =
  | "ink-hanji"
  | "tuff"
  | "scorched-plaster"
  | "dust-concrete"
  | "smoked-glass"
  | "lacquered-wood"
  | "limestone"
  | "dark-oak"
  | "matte-steel"
  | "coated-paper"
  | "matte-brass"
  | "patinated-bronze"
  | "hammered-iron"
  | "oxidized-copper"
  | "cold-aluminum";

interface TextureSample {
  id: TextureId;
  name: string;
  world: string;
  note: string;
}

interface TextureGroup {
  role: string;
  title: string;
  description: string;
  samples: readonly TextureSample[];
}

const TEXTURE_GROUPS: readonly TextureGroup[] = [
  {
    role: "BACKGROUND MATERIALS",
    title: "바깥 배경 재질",
    description: "화면의 가장 넓은 면이다. 형태보다 공기와 미세한 결만 남겨야 한다.",
    samples: [
      { id: "ink-hanji", name: "먹빛 한지", world: "조선", note: "긴 섬유와 먹의 농담" },
      { id: "tuff", name: "거친 응회암", world: "로마", note: "다공성 돌 입자와 음영" },
      { id: "scorched-plaster", name: "그을린 회벽", world: "중세 유럽", note: "불균질한 회칠과 그을음" },
      { id: "dust-concrete", name: "분진 콘크리트", world: "산업혁명기", note: "건조한 분진과 눌린 얼룩" },
      { id: "smoked-glass", name: "훈연 유리", world: "현대 미국", note: "짙은 반사와 차가운 격자" },
    ],
  },
  {
    role: "READING SURFACES",
    title: "본문 박스 재질",
    description: "글이 올라오는 기록 면이다. 바깥 배경보다 고르고 조용해야 한다.",
    samples: [
      { id: "lacquered-wood", name: "옻칠 목재", world: "조선", note: "어두운 목리와 얕은 광택" },
      { id: "limestone", name: "다듬은 석회암", world: "로마", note: "고운 석분과 얕은 홈" },
      { id: "dark-oak", name: "짙은 참나무", world: "중세 유럽", note: "두꺼운 판재와 긴 목리" },
      { id: "matte-steel", name: "무광 강철", world: "산업혁명기", note: "눌린 수평 결의 철판" },
      { id: "coated-paper", name: "무광 코팅지", world: "현대 미국", note: "빛을 삼키는 평평한 면" },
    ],
  },
  {
    role: "JOINERY & EDGES",
    title: "테두리 재질",
    description: "장식색이 아니라 박스와 구획을 붙드는 결구다. 좁은 면에서만 사용한다.",
    samples: [
      { id: "matte-brass", name: "무광 황동", world: "조선", note: "따뜻하고 억제된 금속선" },
      { id: "patinated-bronze", name: "산화 청동", world: "로마", note: "갈색 바탕과 녹청 반점" },
      { id: "hammered-iron", name: "망치질한 흑철", world: "중세 유럽", note: "찌그러진 철 표면과 못자리" },
      { id: "oxidized-copper", name: "산화 구리", world: "산업혁명기", note: "그을린 구리와 청록 산화" },
      { id: "cold-aluminum", name: "냉간 알루미늄", world: "현대 미국", note: "차가운 은색의 미세 결" },
    ],
  },
] as const;

const MATERIAL_SAMPLES: readonly MaterialSample[] = [
  {
    worldId: "joseon",
    worldLabel: "조선",
    person: "이순신",
    years: "1545–1598",
    direction: "한지의 잔섬유를 바깥에 두고, 기록 상자는 짙은 목재처럼 눌러 배너의 궁궐 목구조를 이어간다.",
  },
  {
    worldId: "rome",
    worldLabel: "로마",
    person: "마르쿠스 아우렐리우스",
    years: "121–180",
    direction: "바깥은 거친 석벽, 본문은 더 곱게 다듬은 돌판으로 층위를 나누고 청동만 얇게 사용한다.",
  },
  {
    worldId: "medieval-europe",
    worldLabel: "중세 유럽",
    person: "잔 다르크",
    years: "1412–1431",
    direction: "불균질한 회벽 안에 묵직한 목재 기록함을 놓고, 모서리의 흑철 결구로 화면을 붙든다.",
  },
  {
    worldId: "industrial-europe",
    worldLabel: "산업혁명기 유럽",
    person: "찰스 다윈",
    years: "1809–1882",
    direction: "분진이 밴 콘크리트 위에 얇은 강철 패널을 얹고, 구리선을 정보 계층을 가르는 용도로만 쓴다.",
  },
  {
    worldId: "modern-america",
    worldLabel: "현대 미국",
    person: "스티브 잡스",
    years: "1955–2011",
    direction: "도시 야경의 빛은 바깥 유리에만 남기고, 읽는 면은 빛을 삼키는 코팅지처럼 평평하게 정리한다.",
  },
  {
    worldId: "modern-latin-america",
    worldLabel: "근현대 라틴아메리카",
    person: "글로리아 에스테판",
    years: "1957–",
    direction: "바깥은 그늘 속 콘크리트로 두고 기록면만 코발트로 칠해, 벽에 색을 입히는 이 지역의 건축을 화면 안으로 들인다.",
  },
  {
    worldId: "modern-africa",
    worldLabel: "근현대 아프리카",
    person: "넬슨 만델라",
    years: "1918–2013",
    direction: "검은 목재 위에 말라카이트 결의 기록면을 놓고, 놋쇠는 면을 결구하는 얇은 선으로만 남긴다.",
  },
] as const;

function MaterialLegend({ material }: { material: WorldMaterialDefinition }) {
  return (
    <dl className={styles.legend}>
      <div>
        <dt>바깥 배경</dt>
        <dd>{material.backgroundMaterial}</dd>
      </div>
      <div>
        <dt>본문 박스</dt>
        <dd>{material.panelMaterial}</dd>
      </div>
      <div>
        <dt>테두리</dt>
        <dd>{material.edgeMaterial}</dd>
      </div>
    </dl>
  );
}

function TextureLibrary() {
  return (
    <section className={styles.library}>
      <div className={styles.sectionLead}>
        <p>RAW MATERIAL LIBRARY</p>
        <h2>재질 원형 15종</h2>
        <span>아래 낱장을 먼저 보고, 서로 어울리는 재질만 세계 조합으로 묶는다.</span>
      </div>

      <div className={styles.textureGroups}>
        {TEXTURE_GROUPS.map((group) => (
          <section className={styles.textureGroup} key={group.role}>
            <header className={styles.textureGroupHeader}>
              <p>{group.role}</p>
              <h3>{group.title}</h3>
              <span>{group.description}</span>
            </header>
            <div className={styles.textureGrid}>
              {group.samples.map((sample) => (
                <article className={styles.textureCard} key={sample.id}>
                  <div className={styles.textureSwatch} data-texture={sample.id} aria-hidden="true">
                    <span>RAW</span>
                  </div>
                  <div className={styles.textureCopy}>
                    <div>
                      <h4>{sample.name}</h4>
                      <span>{sample.world}</span>
                    </div>
                    <p>{sample.note}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function MaterialPreview({ sample }: { sample: MaterialSample }) {
  const worldStyle = getWorldStyle(sample.worldId);
  const material = getWorldMaterial(sample.worldId);

  return (
    <CelebWorldMaterialScope worldId={sample.worldId} className={styles.preview} as="article">
      <div className={styles.banner}>
        <CelebWorldBanner worldId={sample.worldId} compact />
        <div className={styles.bannerLabel}>
          <span>{sample.worldLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{material.labelKo}</span>
        </div>
      </div>

      <div className={styles.canvas}>
        <div className={styles.identity}>
          <div className={styles.portraitWell} aria-label={`${sample.person} 대표 화보 자리`}>
            <span>{sample.person.charAt(0)}</span>
          </div>
          <div className={styles.identityCopy}>
            <p className={styles.eyebrow}>LEGACY ARCHIVE · {sample.years}</p>
            <h3>{sample.person}</h3>
            <p>{sample.direction}</p>
          </div>
        </div>

        <section className={styles.primarySurface}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionNumber}>{formatSectionNumber(1, worldStyle.numerals)}</span>
            <div>
              <p>인물 소개</p>
              <span>세계의 재질이 기록 화면까지 이어지는가</span>
            </div>
          </div>

          <p className={styles.bodyCopy}>
            배너는 시대를 보여주고, 바깥 바탕은 그 공간의 공기를 이어받는다. 기록 상자는 같은 재료를 반복하지 않고 한 단계 더 다듬어진 표면으로 올라온다.
          </p>

          <div className={styles.innerGrid}>
            <div className={styles.innerSurface}>
              <span>기록물</span>
              <strong>읽고 본 작품</strong>
              <p>긴 본문이 올라오는 안쪽 표면의 밝기와 결을 확인한다.</p>
            </div>
            <div className={styles.innerSurface}>
              <span>인연</span>
              <strong>관계와 행적</strong>
              <p>테두리가 정보보다 먼저 보이지 않는지 함께 살핀다.</p>
            </div>
          </div>
        </section>

        <MaterialLegend material={material} />
      </div>
    </CelebWorldMaterialScope>
  );
}

export default function CelebMaterialsPreview() {
  return (
    <div className={styles.lab}>
      <section className={styles.intro}>
        <p className={styles.kicker}>MATERIAL STUDY 01</p>
        <h2>색이 아니라 재질로 시대를 잇는다</h2>
        <p>
          직군은 화면 색을 결정하지 않는다. 세계 배너 아래에 주재질 하나, 보조재질 하나, 금속 포인트 하나만 두고 바깥 배경과 UI 박스가 같은 장소에서 나온 것처럼 연결되는지 본다.
        </p>
        <div className={styles.ruleGrid}>
          <div><span>01</span><strong>배경은 공기</strong><p>넓고 낮은 대비의 질감만 남긴다.</p></div>
          <div><span>02</span><strong>박스는 기록 면</strong><p>글이 읽히도록 더 고르고 조용하다.</p></div>
          <div><span>03</span><strong>금속은 경계</strong><p>강조색이 아니라 구조를 붙드는 데 쓴다.</p></div>
        </div>
      </section>

      <TextureLibrary />

      <div className={styles.sectionLead}>
        <p>COMBINATION PROTOTYPES</p>
        <h2>세계 조합 5종</h2>
        <span>위에서 확인한 바깥 배경·본문 박스·테두리를 실제 상세 화면 구조에 함께 놓는다.</span>
      </div>

      <div className={styles.previewGrid}>
        {MATERIAL_SAMPLES.map((sample) => (
          <MaterialPreview key={sample.worldId} sample={sample} />
        ))}
      </div>
    </div>
  );
}
