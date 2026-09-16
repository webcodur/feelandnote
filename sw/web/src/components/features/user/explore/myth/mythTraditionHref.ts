// 신화 화면을 특정 전승을 고른 채 여는 주소. 신화 화면은 이 이름으로 전승을 읽고, 화면에서 고른 전승도 같은 이름으로 주소에 남긴다.
export const MYTH_TRADITION_PARAM = "tradition";

export const mythTraditionHref = (slug: string) => `/explore/myth?${MYTH_TRADITION_PARAM}=${encodeURIComponent(slug)}`;
