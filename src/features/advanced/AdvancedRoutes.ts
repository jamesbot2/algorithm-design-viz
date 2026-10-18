import { createElement, lazy, Suspense, type ReactNode } from 'react'
import { Route } from 'react-router-dom'

const AdvancedHome = lazy(() => import('./pages/AdvancedHome'))
const SectionIndex = lazy(() => import('./pages/IndexPage').then((m) => ({ default: m.SectionIndex })))
const TemplateIndex = lazy(() => import('./pages/IndexPage').then((m) => ({ default: m.TemplateIndex })))
const TopicPage = lazy(() => import('./pages/TopicPage'))
const TemplatePage = lazy(() => import('./pages/TemplatePage'))

const wrap = (el: ReactNode) => createElement(Suspense, { fallback: createElement('div', { className: 'page muted' }, '加载中…') }, el)
const r = (path: string, el: ReactNode) => createElement(Route, { key: path, path, element: wrap(el) })

/** Route elements for the 高阶算法 module; every page is a lazy chunk so the home bundle does not carry them. */
export const advancedRoutes = [
  r('advanced', createElement(AdvancedHome)),
  r('advanced/stl', createElement(SectionIndex, { section: 'stl' })),
  r('advanced/stl/:topicId', createElement(TopicPage, { section: 'stl' })),
  r('advanced/algorithms', createElement(SectionIndex, { section: 'algorithms' })),
  r('advanced/algorithms/:topicId', createElement(TopicPage, { section: 'algorithms' })),
  r('advanced/templates', createElement(TemplateIndex)),
  r('advanced/templates/:templateId', createElement(TemplatePage)),
]
