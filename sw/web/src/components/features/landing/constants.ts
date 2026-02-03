
import { Briefcase, Globe, Award } from "lucide-react";
// @ts-ignore - 패키지 alias 인식 문제 회피 (실제 빌드는 됨)
import { 
  EXPLORE_PROFESSION_PRESETS, 
  EXPLORE_NATIONALITY_PRESETS, 
  EXPLORE_CONTENT_PRESETS 
} from "@feelandnote/shared/constants/explore-presets";

export const EXPLORE_PRESETS = [
  {
    id: "profession",
    label: "직업으로 탐색",
    sub: "By Profession",
    icon: Briefcase,
    items: EXPLORE_PROFESSION_PRESETS.map((p: any) => ({
      ...p,
      query: "profession"
    }))
  },
  {
    id: "nationality",
    label: "국가로 탐색",
    sub: "By Nationality",
    icon: Globe,
    items: EXPLORE_NATIONALITY_PRESETS.map((p: any) => ({
      ...p,
      query: "nationality"
    }))
  },
  {
    id: "content",
    label: "콘텐츠로 탐색",
    sub: "By Collection",
    icon: Award,
    items: EXPLORE_CONTENT_PRESETS.map((p: any) => ({
      ...p,
      query: "contentType"
    }))
  }
];
