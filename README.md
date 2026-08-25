# luluKing 个人工作台

一个本地优先的 Windows 桌面应用，用于在同一处管理任务、日程、项目、目标、习惯、计划、复盘、收件箱和知识库。

## 当前能力

- 任务管理：今日、待办池、逾期、重点任务、清单、批量操作和标签筛选。
- 组织与回顾：项目、目标、习惯、周期计划、周/月复盘与日程；周计划承诺可在复盘中完成、顺延、回待办池或放弃。
- 信息沉淀：收件箱、知识笔记、主题、标签、`[[笔记链接]]` 和 FTS5 全局搜索。
- AI 辅助：支持标准 HTTPS OpenAI 兼容接口生成可编辑的复盘草稿。
- 数据安全：数据库迁移、JSON 备份、导入预览、自动安全备份与原子恢复。
- 可靠反馈：核心数据和 AI 操作提供失败说明、重试、表单保留与二次确认。

## 技术栈

- 桌面端：Tauri 2、Rust、SQLite
- 前端：React 19、TypeScript、Vite、Tailwind CSS、React Router
- 数据访问：Repository 层、TanStack Query；局部 UI 状态使用 React state/context
- 测试与交付：Vitest、Testing Library、Rust 测试、Windows GitHub Actions

## 开发环境

需要已安装 Node.js、Rust 与 Windows C++ 构建工具。

```bash
npm install
npm run tauri dev
```

仅查看前端界面可运行：

```bash
npm run dev
```

注意：浏览器模式没有 Tauri 数据库与本地文件能力，核心数据功能需要通过桌面端运行。

## 常用命令

```bash
# 类型检查与生产构建
npm run build

# 全量自动化测试
npm test

# Rust 后端测试
npm run test:rust

# 合并/发布前全量验证
npm run verify

# 生成 Windows NSIS 安装包
npm run release:windows
```

安装包生成位置：

```text
src-tauri/target/release/bundle/nsis/
```

## 数据与备份

- SQLite 数据库与 AI 设置位于 `%APPDATA%\com.yi.luluKing\`。
- JSON 备份位于 `%APPDATA%\com.yi.luluKing\luluKing\backups\`。
- 卸载程序不会删除上述用户数据；彻底清理前请先通过设置页创建备份。
- 当前备份不包含附件、AI 配置和 API Key；存在附件记录时，恢复会安全拒绝。
- 恢复是全量覆盖，恢复前会自动创建安全备份；详细步骤见 `docs/current/恢复说明-v0.1.md`。
- AI 地址仅支持 HTTPS 标准端口；HTTP、本机地址和自定义端口会被拒绝。

## Windows 发布说明

当前发布使用简体中文、当前用户范围的 NSIS 安装程序。首次安装如缺少 WebView2 Runtime，需要联网下载 Microsoft Edge WebView2 引导程序。

安装包目前未进行代码签名，Windows 可能显示来源提示；请仅从可信发布渠道获取。

详细的构建记录、安装验收项和已知限制见：

- `docs/current/R0-04-Windows打包与安装验证技术设计-v0.1.md`
- `docs/current/桌面端手工测试清单-v0.1.md`
- `docs/current/技术架构与运行说明-v0.1.md`
- `docs/current/恢复说明-v0.1.md`
- `CHANGELOG.md`

## 文档约定

后续开发只以 `docs/current/` 中的文档为依据；`docs/archive/` 仅保留历史，不作为日常实现依据。

总体升级路线见 `docs/current/升级实施计划-v0.1.md`。
