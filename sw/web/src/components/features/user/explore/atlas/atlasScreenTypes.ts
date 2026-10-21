import type { MythData } from "@/actions/home/mythTypes";
import type { CelebProfile } from "@/types/home";
import type { AtlasTheme, AtlasWorld } from "../myth/atlasNavigationData";

/** 양쪽 페이지는 자료만 전달한다. 화면 모듈과 배치는 AtlasScreen이 조립한다. */
export interface AtlasScreenProps {
  mode: AtlasWorld;
  data: MythData;
  navigationTree?: AtlasTheme[];
  themeId?: string;
  profiles?: CelebProfile[];
  rememberedSlug?: string | null;
}
