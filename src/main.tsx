import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { bootstrapLabTheme } from './theme/LabThemeContext'
import './styles.css'
import './styles/animation.css'
import './styles/scene.css'
import './styles/layout.css'
import * as strictGraphVisibility from './utils/strictGraphVisibility'

// V16-03: single detector bridge for E2E + DOM (fault inject mutates page only)
declare global {
  interface Window {
    __algoVizStrictVisibility?: typeof strictGraphVisibility
  }
}
if (typeof window !== 'undefined') {
  window.__algoVizStrictVisibility = strictGraphVisibility
}

bootstrapLabTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
