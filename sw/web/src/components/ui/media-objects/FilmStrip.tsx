import type { ReactNode } from 'react'
import { FILM_FACES, filmFaceStyle } from './filmGeometry'

// 모든 조각이 같은 정면 좌표를 공유한다. 도착 시 DOM·클리핑·렌더링 방식을 바꾸지 않는다.
export default function FilmStrip({ cover }: { cover: ReactNode }) {
  const surface = <div className="mo-film">
    <div className="mo-film-stock" />
    <div className="mo-film-neighbor mo-film-neighbor-before"><span>00</span></div>
    <div className="mo-film-frame">{cover}</div>
    <div className="mo-film-neighbor mo-film-neighbor-after"><span>02</span></div>
    <span className="mo-film-edge-code">35 mm · 01 ▷</span>
    <span className="mo-film-frame-code">01 A ▷</span>
  </div>

  return <div className="mo-film-strip">
    {FILM_FACES.map((face, row) => <div className="mo-film-face" key={row} style={filmFaceStyle(face)}>
      <div className="mo-film-facet">{surface}</div>
      {row === 0 && <div className="mo-film-continuation mo-film-continuation-before"><div className="mo-film-stock" /></div>}
      {row === FILM_FACES.length - 1 && <div className="mo-film-continuation mo-film-continuation-after"><div className="mo-film-stock" /></div>}
    </div>)}
  </div>
}
