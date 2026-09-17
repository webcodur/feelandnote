// 신화 화면을 특정 신화를 고른 채 여는 주소. 신화 화면은 이 이름으로 신화를 읽고, 화면에서 고른 신화도 같은 이름으로 주소에 남긴다.
export const MYTH_PARAM = "myth";

export const mythHref = (slug: string) => `/explore/myth?${MYTH_PARAM}=${encodeURIComponent(slug)}`;
