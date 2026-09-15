import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Chapter from './pages/Chapter'
import AlgoPage from './pages/AlgoPage'
import KnapsackUnit from './pages/teaching/KnapsackUnit'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="chapter/:id" element={<Chapter />} />
          <Route path="algo/:id" element={<AlgoPage />} />
          <Route path="teach/knapsack" element={<KnapsackUnit />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
