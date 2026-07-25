/**
 * 에피소드 사진·영상 표시 주소 — 세력도와 가상 담화가 함께 쓴다.
 *
 * 외부 주소는 그대로 두고, 슬래시가 있으면 에피소드 폴더 하위, 파일명만 있으면 images/ 하위로 본다.
 * 파일을 내주는 창구(api/[series]/media/[episode]/[...path])와 같은 규칙이다.
 */
export function imageSrc(series: string, episodeName: string, image?: string): string | undefined {
  if (!image) return undefined
  if (/^https?:\/\//.test(image)) return image
  const rel = image.includes('/') ? image : `images/${image}`
  return `/api/${series}/media/${episodeName}/${rel}`
}
