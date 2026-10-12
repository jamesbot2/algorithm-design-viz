/** V32: four tiny inline stroke icons (no icon library). currentColor, 18px. */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
export type NavIconName = 'home' | 'catalog' | 'practice' | 'lab' | 'notes' | 'expand' | 'collapse'
export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg className="nav-icon" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      {name === 'home' && <path {...P} d="M3.5 9 10 3.5 16.5 9v7a1 1 0 0 1-1 1h-3.5v-5h-4v5H4.5a1 1 0 0 1-1-1z" />}
      {name === 'catalog' && <path {...P} d="M4 5h1M8 5h8M4 10h1M8 10h8M4 15h1M8 15h8" />}
      {name === 'practice' && <path {...P} d="M4 16.5V4.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v12M7 8l2 2 4-4M7 13.5h6" />}
      {name === 'lab' && <path {...P} d="M8 3.5h4M9 3.5v5L4.5 15.5a1 1 0 0 0 .9 1.5h9.2a1 1 0 0 0 .9-1.5L11 8.5v-5M6.5 12.5h7" />}
      {name === 'notes' && <path {...P} d="M5 3.5h7l3 3v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1zM7 9h6M7 12h6" />}
      {name === 'expand' && <path {...P} d="M8 5l5 5-5 5" />}
      {name === 'collapse' && <path {...P} d="M12 5l-5 5 5 5" />}
    </svg>
  )
}
