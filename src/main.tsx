import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { bootstrapLabTheme } from './theme/LabThemeContext'
import './styles.css'
import './styles/animation.css'

bootstrapLabTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
