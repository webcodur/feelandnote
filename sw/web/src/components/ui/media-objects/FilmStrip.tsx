import type { CSSProperties, ReactNode } from 'react'

const SLICES = 20

function FilmJoint({ row, surface }: { row: number; surface: ReactNode }) {
  return <div className={`mo-film-joint${row === 0 ? ' mo-film-joint-root' : ''}`}
    style={{ '--film-row': row, '--film-weight': Number(((row / (SLICES - 1)) ** 1.4).toFixed(6)) } as CSSProperties}>
    <div className="mo-film-facet"><div className="mo-film-surface">{surface}</div></div>
    {row === 0 && <div className="mo-film-continuation mo-film-continuation-before"><div className="mo-film-stock" /></div>}
    {row < SLICES - 1 && <FilmJoint row={row + 1} surface={surface} />}
    {row === SLICES - 1 && <div className="mo-film-continuation mo-film-continuation-after"><div className="mo-film-stock" /></div>}
  </div>
}

/** Connected horizontal faces bend around their top edge without distorting the poster pixels. */
export default function FilmStrip({ cover }: { cover: ReactNode }) {
  const surface = <div className="mo-film">
    <div className="mo-film-stock" />
    <div className="mo-film-neighbor mo-film-neighbor-before"><span>00</span></div>
    <div className="mo-film-frame">{cover}</div>
    <div className="mo-film-neighbor mo-film-neighbor-after"><span>02</span></div>
    <span className="mo-film-edge-code">35 mm · 01 ▷</span>
    <span className="mo-film-frame-code">01 A ▷</span>
  </div>

  return <div className="mo-film-strip" style={{ '--film-slices': SLICES } as CSSProperties}>
    <FilmJoint row={0} surface={surface} />
  </div>
}
