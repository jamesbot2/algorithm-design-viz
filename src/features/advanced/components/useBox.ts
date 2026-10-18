import { useLayoutEffect, useRef, useState } from 'react'

/** Measured content box (px) of an element; scenes lay out in real pixels so text stays legible on phones. */
export function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const w = Math.floor(el.clientWidth)
      const h = Math.floor(el.clientHeight)
      setBox((b) => (b.w === w && b.h === h ? b : { w, h }))
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, box] as const
}
