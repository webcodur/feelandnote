import type { JourneyId } from "./catalog";

export interface JourneySelection {
  format: "lp" | "cd";
  device: "switch" | "switch2";
  owned: boolean;
  subscription: boolean;
  material: "paper" | "canvas";
  size: "small" | "medium" | "large" | "xl";
}
export const INITIAL_SELECTION: JourneySelection = {
  format: "lp", device: "switch", owned: false, subscription: false, material: "paper", size: "small",
};
// 판매 페이지의 image size(인치). 용지/액자의 외경과 다르다.
export const PRINT_SIZES = [
  { id: "small", label: "Small", dimensions: "16 × 12⅝ in", cm: "약 40.6 × 32.1 cm", width: 52 },
  { id: "medium", label: "Medium", dimensions: "22 × 17⅜ in", cm: "약 55.9 × 44.1 cm", width: 65 },
  { id: "large", label: "Large", dimensions: "30 × 23¾ in", cm: "약 76.2 × 60.3 cm", width: 80 },
  { id: "xl", label: "Extra large", dimensions: "40 × 31⅝ in", cm: "약 101.6 × 80.3 cm", width: 94 },
] as const;
export interface JourneyOffer {
  title: string;
  summary: string;
  facts: string[];
  note: string;
  link?: string;
  linkLabel?: string;
  seller: string;
  evidenceUrl: string;
  evidence: string;
  status: "product" | "guide" | "unavailable";
}

const nintendoGuide = "https://www.nintendo.com/kr/games/zelda/botw/edition/guide/";
const met = "https://customprints.metmuseum.org/detail/489070/van-gogh-wheat-field-with-cypresses";
export function getJourneyOffer(id: JourneyId, selection: JourneySelection): JourneyOffer {
  if (id === "low-end-theory") {
    if (selection.format === "cd") return {
      title: "CD · 현재 연결할 상품이 없습니다", summary: "CD로 듣고 싶다면 이 작품을 보관해두세요.",
      facts: ["확인한 YES24 2019년 발매 CD는 절판 표시", "다른 판매처의 CD 재고까지 확인된 것은 아닙니다"],
      note: "위의 감상 링크로 먼저 음악을 들을 수 있습니다.",
      seller: "YES24", evidenceUrl: "https://www.yes24.com/product/author/goods/9448", evidence: "CD 절판 표시 · 판매처 작가 목록 확인", status: "unavailable",
    };
    return {
      title: "The Low End Theory · 2LP", summary: "재킷과 두 장의 레코드로 소장하는 앨범.",
      facts: ["Sony Music / Jive Legacy · 2024년 발매 상품", "LP 2장 · 턴테이블 필요", "Excursions · Check the Rhime · Scenario 등 수록"],
      note: "이미 가지고 있는 재생 장비를 먼저 확인하세요. 가격과 현재 배송일은 판매처에서 확인합니다.",
      link: "https://www.yes24.com/product/goods/129990621", linkLabel: "이 2LP를 YES24에서 보기", seller: "YES24",
      evidenceUrl: "https://www.yes24.com/product/goods/129990621", evidence: "실제 상품 페이지의 판매중 표시·2LP 구성 확인", status: "product",
    };
  }
  if (id === "breath-of-the-wild") {
    if (selection.owned) {
      if (selection.device === "switch") return {
        title: "가지고 있는 본편으로 즐기세요", summary: "Switch에서는 본편을 다시 살 필요가 없습니다.",
        facts: ["Switch 2 Edition과 업그레이드 패스는 Switch 2 전용", "Switch / OLED / Lite에서 Switch용 본편 이용"],
        note: "추가 콘텐츠인 익스팬션 패스와 Switch 2 업그레이드 패스는 다른 상품입니다.",
        link: nintendoGuide, linkLabel: "공식 버전 안내 보기", seller: "Nintendo", evidenceUrl: nintendoGuide, evidence: "공식 기종·본편 보유 조건 확인", status: "guide",
      };
      return {
        title: selection.subscription ? "가입 혜택부터 확인하세요" : "본편 대신 업그레이드 패스",
        summary: selection.subscription ? "본편과 Nintendo Switch Online + 추가 팩이 있다면 가입 기간 중 추가 요금 없이 이용할 수 있습니다." : "Switch용 본편이 있다면 업그레이드 패스만으로 Switch 2 Edition을 이용할 수 있습니다.",
        facts: ["Nintendo Switch 2와 Switch용 본편 필요", selection.subscription ? "구독 종료 후에는 업그레이드 이용 권한도 종료" : "본편을 포함하지 않는 업그레이드 상품"],
        note: "저장 데이터와 이용 조건을 공식 안내에서 확인한 뒤 선택하세요.",
        link: nintendoGuide, linkLabel: selection.subscription ? "추가 요금 없는 이용 방법 보기" : "공식 업그레이드 구입 안내 보기", seller: "Nintendo",
        evidenceUrl: nintendoGuide, evidence: "공식 구입 가이드의 보유·구독별 분기 확인", status: "guide",
      };
    }
    if (selection.device === "switch2") return {
      title: "Nintendo Switch 2 Edition · 다운로드", summary: "본편이 없다면 Switch 2 전용 에디션을 선택할 수 있습니다.",
      facts: ["한국어 지원 · 1인 플레이", "Switch 2 전용 · 실물 패키지가 배송되지 않음", "그래픽·프레임 레이트 향상, ZELDA NOTES 대응"],
      note: "Switch / OLED / Lite에서는 이 에디션을 플레이할 수 없습니다. 한국닌텐도 계정과 다운로드 조건은 판매처에서 확인하세요.",
      link: "https://store.nintendo.co.kr/70010000096819", linkLabel: "이 에디션을 Nintendo에서 보기", seller: "Nintendo",
      evidenceUrl: "https://store.nintendo.co.kr/70010000096819", evidence: "공식 상품의 구매 가능 표시·기종·언어 확인", status: "product",
    };
    return {
      title: "Nintendo Switch · 한국어 본편 패키지", summary: "Switch / OLED / Lite로 처음 시작하는 본편.",
      facts: ["Nintendo Switch용 본편 · 실물 게임 카드", "추가 콘텐츠·업그레이드 패스와 구별", "한국어판 상품인지 최종 옵션 확인"],
      note: "판매자·옵션과 배송일은 쿠팡에서 다시 확인하세요. 기존 상품 시안의 주소이며 이번 조사에서 현재 재고는 재확인하지 못했습니다.",
      link: "https://www.coupang.com/vp/products/6225165843?itemId=12479742076&vendorItemId=3520535365", linkLabel: "이 본편 패키지를 쿠팡에서 보기", seller: "쿠팡",
      evidenceUrl: nintendoGuide, evidence: "공식 기종 확인 · 기존 시안 상품 URL, 현재 재고 미확인", status: "product",
    };
  }
  const size = PRINT_SIZES.find((item) => item.id === selection.size) ?? PRINT_SIZES[0];
  return {
    title: `${selection.material === "paper" ? "페이퍼" : "캔버스"} 프린트 · ${size.label}`,
    summary: "The Met 소장 작품의 미술관 승인 복제 프린트.",
    facts: [`그림 부분 ${size.dimensions} · ${size.cm}`, "원화가 아닌 복제 인쇄물", "액자·매트 포함 여부에 따라 전체 크기가 달라짐"],
    note: "선택한 소재와 크기는 판매처에 자동 전달되지 않습니다. 판매처에서 같은 옵션을 다시 고르고 한국 배송 가능 여부·배송비를 확인하세요.",
    link: met, linkLabel: "The Met에서 같은 옵션 고르기", seller: "The Met",
    evidenceUrl: met, evidence: "페이퍼·캔버스 및 네 가지 이미지 규격 확인 · 한국 배송 미확인", status: "product",
  };
}
