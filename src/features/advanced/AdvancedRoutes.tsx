import { lazy, Suspense } from 'react'
import { Route } from 'react-router-dom'

const AdvancedHome = lazy(() => import('./pages/AdvancedHome'))
const SectionIndex = lazy(() => import('./pages/IndexPage').then((m) => ({ default: m.SectionIndex })))
const TemplateIndex = lazy(() => import('./pages/IndexPage').then((m) => ({ default: m.TemplateIndex })))
const TopicPage = lazy(() => import('./pages/TopicPage'))
const TemplatePage = lazy(() => import('./pages/TemplatePage'))

const wrap = (el: React.ReactNode) => <Suspense fallback={<div className="page muted">加载中…</div>}>{el}</Suspense>

/** Route elements for the 高阶算法 module; every page is a lazy chunk so the home bundle does not carry them. */
export const advancedRoutes = (
  <>
    <Route path="advanced" element={wrap(<AdvancedHome />)} />
    <Route path="advanced/stl" element={wrap(<SectionIndex section="stl" />)} />
    <Route path="advanced/stl/:topicId" element={wrap(<TopicPage section="stl" />)} />
    <Route path="advanced/algorithms" element={wrap(<SectionIndex section="algorithms" />)} />
    <Route path="advanced/algorithms/:topicId" element={wrap(<TopicPage section="algorithms" />)} />
    <Route path="advanced/templates" element={wrap(<TemplateIndex />)} />
    <Route path="advanced/templates/:templateId" element={wrap(<TemplatePage />)} />
  </>
)
