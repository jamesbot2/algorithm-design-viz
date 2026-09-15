import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Chapter from './pages/Chapter'
import AlgoPage from './pages/AlgoPage'
import KnapsackUnit from './pages/teaching/KnapsackUnit'
import PracticePage from './pages/practice/PracticePage'
import ExperimentPage from './pages/experiment/ExperimentPage'
import LabKnapsackDijkstraQueens from './content/labs/LabKnapsackDijkstraQueens'
import { MotionProvider } from './theme/MotionContext'
import { LabThemeProvider } from './theme/LabThemeContext'

export default function App() {
  return (
    <LabThemeProvider>
    <MotionProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="chapter/:id" element={<Chapter />} />
            <Route path="algo/:id" element={<AlgoPage />} />
            <Route path="teach/knapsack" element={<KnapsackUnit />} />
            <Route path="practice" element={<PracticePage />} />
            <Route path="experiment" element={<ExperimentPage />} />
            <Route path="lab/core" element={<LabKnapsackDijkstraQueens />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </MotionProvider>
    </LabThemeProvider>
  )
}
