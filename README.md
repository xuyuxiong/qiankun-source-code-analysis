# qiankun 源码深度解析

> 微前端框架 qiankun 源码学习指南

[![Status](https://img.shields.io/badge/status-complete-brightgreen)](https://github.com/xuyuxiong/qiankun-source-code-analysis)
[![qiankun](https://img.shields.io/badge/qiankun-3.x-ff6a00)](https://qiankun.umijs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Chapters](https://img.shields.io/badge/chapters-20-orange)](https://xuyuxiong.github.io/qiankun-source-code-analysis/)

---

## 📖 项目简介

本项目是一本完整的 qiankun 源码学习指南，共 **20 章**，深入解析沙箱机制、通信系统、应用加载、路由系统等核心机制。

相比其他教程，本项目的特点：
- 🔍 **源码级深度** — 逐行分析核心源码，不仅讲"是什么"，更讲"为什么"
- 📊 **架构图丰富** — 每章配备架构图、流程图、时序图
- 🧩 **qiankun 3.x** — 覆盖沙箱机制、通信系统、应用加载等核心功能
- 🧪 **示例完整** — 每章包含可运行示例、最佳实践、常见问题
- 📱 **暗色模式** — VitePress 驱动，支持亮色/暗色切换

👉 **在线阅读**：[https://xuyuxiong.github.io/qiankun-source-code-analysis/](https://xuyuxiong.github.io/qiankun-source-code-analysis/)

---

## ✅ 完成情况

| 部分 | 章节数 | 状态 |
|------|--------|------|
| 📘 指南篇 | 4/4 | ✅ 已完成 |
| 📗 架构篇 | 4/4 | ✅ 已完成 |
| 🧩 核心篇 | 8/8 | ✅ 已完成 |
| 💎 进阶篇 | 4/4 | ✅ 已完成 |
| **总计** | **20/20** | **✅ 全部完成** |

---

## 📚 内容目录

### 📘 指南篇 — 入门准备
| # | 章节 | 关键词 |
|---|------|--------|
| 1 | 项目概览 | 技术栈、核心特性 |
| 2 | 快速开始 | 安装、基础使用 |
| 3 | 源码结构 | Monorepo 布局、包组织 |
| 4 | 调试指南 | 环境搭建、调试技巧 |

### 📗 架构篇 — 整体架构
| # | 章节 | 关键词 |
|---|------|--------|
| 5 | 整体架构 | 分层设计、核心理念 |
| 6 | Monorepo 结构 | packages/、子包依赖 |
| 7 | 沙箱机制 | JS 沙箱、样式沙箱、DOM 沙箱 |
| 8 | 通信系统 | 全局状态、事件系统 |

### 🧩 核心篇 — 核心机制

**应用加载（3 章）**

| # | 章节 | 关键词 |
|---|------|--------|
| 9 | 应用概述 | 应用注册、生命周期 |
| 10 | 资源加载器 | HTML 解析、资源预加载 |
| 11 | 路由系统 | 路由拦截、子应用路由 |

**沙箱实现（4 章）**

| # | 章节 | 关键词 |
|---|------|--------|
| 12 | JS 沙箱 | Proxy、快照沙箱 |
| 13 | 样式隔离 | CSS 作用域、Shadow DOM |
| 14 | DOM 沙箱 | DOM 隔离、事件代理 |
| 15 | 执行器 | JS 执行、模块系统 |

**模块系统（1 章）**

| # | 章节 | 关键词 |
|---|------|--------|
| 16 | 模块系统 | ESM、CJS、模块加载 |

### 💎 进阶篇 — 高级主题
| # | 章节 | 关键词 |
|---|------|--------|
| 17 | 插件系统 | 自定义插件、扩展机制 |
| 18 | 性能优化 | 预加载、缓存策略 |
| 19 | 最佳实践 | 常见问题、解决方案 |
| 20 | 实战案例 | 生产环境部署 |

---

## 🚀 快速开始

```bash
# 克隆项目
git clone https://github.com/xuyuxiong/qiankun-source-code-analysis.git
cd qiankun-source-code-analysis

# 安装依赖
npm install

# 启动开发服务器
npm run docs:dev
```

访问 http://localhost:5173/qiankun-source-code-analysis/

```bash
# 构建静态文件
npm run docs:build

# 预览构建结果
npm run docs:preview
```

---

## 🛠️ 技术栈

| 项目 | 技术 |
|------|------|
| 文档框架 | [VitePress](https://vitepress.dev) |
| 构建工具 | Vite |
| 代码高亮 | Shiki |
| 图表 | ASCII 文本图 + Mermaid |
| 部署 | GitHub Actions + GitHub Pages |

---

## 📁 项目结构

```
qiankun-source-code-analysis/
├── docs/
│   ├── .vitepress/          # VitePress 配置
│   │   └── config.mts       # 侧边栏、导航栏配置
│   ├── guide/               # 📘 指南篇 (4 章)
│   ├── architecture/        # 📗 架构篇 (4 章)
│   ├── core/                # 🧩 核心篇 (8 章)
│   ├── advanced/            # 💎 进阶篇 (4 章)
│   ├── index.md             # 首页
│   └── README.md
├── .github/
│   └── workflows/
│       └── deploy-gh-pages.yml  # GitHub Actions 自动部署
├── package.json
└── README.md
```

---

## 🗺️ 学习路线

```
指南篇 (入门准备) → 架构篇 (设计思想) → 核心篇 (核心机制)
    → 进阶篇 (高级主题)
```

建议按顺序阅读，每章包含：
- 📊 **架构图** — 模块关系和数据流
- 🔧 **源码解析** — 逐行分析核心实现
- 💡 **关键细节** — 容易忽略的实现要点
- 📖 **实战示例** — 可运行的代码示例
- 🐛 **常见问题** — FAQ 解答
- ✅ **最佳实践** — 推荐用法和陷阱

---

## 🎯 适合人群

- ✅ 有 1-2 年 React/Vue 使用经验
- ✅ 熟悉前端工程化和模块化
- ✅ 对微前端架构有好奇心
- ✅ 准备面试或技术分享，需要源码级理解

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

[MIT License](LICENSE)

---

## 👋 关于作者

本项目由 [xuyuxiong](https://github.com/xuyuxiong) 创作并维护。

如果你从中受益，欢迎给项目一个 ⭐ Star！