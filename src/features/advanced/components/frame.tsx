import type { ReactNode } from 'react'
import { useBox } from './useBox'

/** Shared scene frame: header strip + a measured SVG canvas (layout happens in real pixels). */
export function Frame({ head, children }: { head: ReactNode; children: (w: number, h: number) => ReactNode }) {
  const [ref, box] = useBox<HTMLDivElement>()
  return (
    <div className="adv-frame">
      <div className="adv-head" data-testid="adv-head">
        {head}
      </div>
      <div className="adv-canvas" ref={ref}>
        {box.w > 0 && box.h > 0 && (
          <svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} role="img" aria-label="高阶算法主场景">
            {children(box.w, box.h)}
          </svg>
        )}
      </div>
    </div>
  )
}

