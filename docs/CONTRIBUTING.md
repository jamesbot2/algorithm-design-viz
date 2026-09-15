# Contributing（简要）

## 开发

```bash
npm ci          # 或 npm install
npm run dev
npm run lint
npm run test:run
npm run build
```

## 改算法

按 `docs/TRACE_PROTOCOL.md`：实现 → `algorithms/index` → `registry` → 导航/章节 → 测试。

## PR 期望

- CI（lint / test / build）应绿  
- 不引入用户内容的 HTML 直渲  
- 复杂度与实现一致；失败语义显式  
- 不强制改 `deploy-pages.yml`；Pages 与 CI 当前独立  

## 提交与推送

本地 commit 可按需进行。**推送到 `origin` / 触发 Pages 需仓库维护者明确授权**（本项目约定默认不 push）。
