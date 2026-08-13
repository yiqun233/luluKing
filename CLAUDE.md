# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

"个人工作台"——一个本地优先的桌面应用，把任务、日程、目标、项目、知识沉淀、复盘整合在一处。技术栈：Tauri 2.0（Rust 后端）+ React 19 + TypeScript + SQLite。窗口 1200×800，中文界面。

## 常用命令

```bash
npm run tauri dev      # 完整桌面开发（Rust + 前端，SQLite 可用，主要开发方式）
npm run dev            # 仅前端 vite（浏览器预览，Tauri API 不可用，SQLite 调用会失败）
npm run tauri build    # 打包桌面应用
npm test               # vitest run，跑全部测试
npm run test:watch     # vitest 监听模式
npx vitest run src/repositories/taskRepo.test.ts   # 跑单个测试文件
npx vitest run -t "动态 SET"                        # 按测试名跑
npx tsc --noEmit       # 类型检查（tsconfig 已排除 test 文件，不含测试类型）
```

无 ESLint/Prettier 配置；类型检查靠 `tsc --noEmit`，测试靠 vitest。提交前应三者全绿（tsc + test + `npx vite build`）。

**提交约定：** git commit message 中**不要**包含 `Co-Authored-By` 尾注。

## 架构

**数据流（核心，改动前必读）：**
```
页面 (src/pages) → hooks (src/hooks, TanStack Query) → repositories (src/repositories) → db/client → tauri-plugin-sql → SQLite
```
- `src/db/client.ts` 封装 `execute`/`select`/`selectOne`，每个调用都带错误日志（SQL + 参数），定位 IPC 权限问题很关键。
- repositories 是纯数据访问层，不含 React 依赖，可独立单测。
- hooks 用 TanStack Query 管理全部服务端状态；项目无全局客户端状态库（zustand 虽在依赖中但未使用）。

**Tauri 后端：**
- `src-tauri/src/lib.rs` 注册插件（sql/http/store/fs/opener）并挂载 SQLite 迁移。
- 数据库 `sqlite:app.db`，迁移在 **Rust 端执行**（`src-tauri/migrations/*.sql`，lib.rs 的 `Migration` vec），不走 JS 权限系统。
- Schema 见 `001_initial.sql`（17 张表，全部含 `created_at/updated_at/deleted_at/synced_at`）。实体类型在 `src/types/entities.ts`。

**前端：**
- HashRouter，11 条路由在 `src/App.tsx`。所有页面在 `src/pages/index.tsx` 统一 re-export——新增页面在此 re-export，并保留 `HabitsPage` 占位。
- UI 基础组件在 `src/components/ui/`（shadcn/ui new-york 风格，基于 Radix 原语）。业务组件按模块分目录：`src/components/{tasks,calendar,goals,projects,plans,inbox,knowledge,reviews}/`。
- Tailwind v4 + `class-variance-authority`。日期用 date-fns v4（含 zhCN locale）。路径别名 `@` → `./src/*`。

## 关键约定

**软删除：** 所有数据表用 `deleted_at`。repo 的 `delete*` 函数执行 `UPDATE ... SET deleted_at = datetime('now')`；所有查询都加 `WHERE deleted_at IS NULL`。

**Tauri SQL 权限（重要教训）：** `tauri-plugin-sql` 的 `sql:default` 只含 load/close，**不含 execute/select**。前端 `db.execute`/`db.select` 走 IPC 会被权限拦截。必须在 `src-tauri/capabilities/default.json` 显式声明 `sql:allow-execute` 和 `sql:allow-select`。Rust 端迁移不受此限。如果前端 SQL 调用静默失败，先查这里。

**原生 `<select>`：** 表单下拉用原生 `<select>` + Tailwind 样式类（见各 EditDialog 的 `selectClass` 常量），不引入 `@radix-ui/react-select`。

**Repository 模式：** 每个实体一个 repo 文件，导出 `Create*Input`/`Update*Input` 接口 + CRUD 函数。`update*` 动态构造 SET 子句（`fields[]` + `values[]`，按代码内 if 顺序），空输入不调 execute，末尾固定加 `updated_at = datetime('now')`。

**Hooks 模式：** 每个实体一个 hooks 文件。`*Keys` 对象是 query key 工厂（`all`/子查询）。`useCreate*`/`useUpdate*`/`useDelete*` 用 `onSuccess: invalidateQueries({queryKey: *.all})`。乐观更新（如 `useToggleTaskStatus`）用 `onMutate` + `getQueriesData`/`setQueryData` 遍历更新 + `onError` 回滚。

**双模式弹窗：** `*EditDialog` 组件同时支持新建（`entity=null`）和编辑。用 `useEffect` 在 `open=true` 时根据 entity 重置表单（新建用默认值），避免上层管理重置。编辑模式显示删除按钮，新建模式不显示。

**测试模式：** vitest + jsdom + @testing-library/react。
- repo 测试：`vi.mock("@/db/client")` 只验证 SQL 构造与参数绑定（不连真实 DB）。用 `expect.stringContaining("INSERT INTO ...")` 匹配多行模板字符串 SQL；动态 SET 的字段顺序按 repo 代码内 if 顺序断言；无参数查询不写第二个参数。
- 组件测试：`vi.mock("@/hooks/useXxx")`，用 `userEvent` 模拟交互，验证 `mutate` 调用参数。Radix Dialog/Checkbox 在 jsdom 下正常工作。
- `tsconfig.json` 排除 test 文件，所以类型检查不覆盖测试；测试编译由 vitest 处理。

**FTS5：** 底层 rusqlite bundled SQLite 默认未编译 FTS5。**不要在迁移里建 FTS5 虚拟表**（会导致整个迁移失败、数据库无法初始化）。全局搜索当前用 LIKE 实现。

## 文档

项目文档归类到 `docs/` 下按类型分目录（当前有 `docs/design/` 设计文档、`docs/test/` 测试文档），不散落根目录。`README.md` 是唯一例外。新增文档按类型放入对应子目录，遇到新类型在 `docs/` 下建新子目录。
