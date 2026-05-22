---
layout: home

hero:
  name: qiankun 源码深度解析
  text: 微前端框架 qiankun 源码学习指南
  tagline: 从架构设计到沙箱实现，全面掌握 qiankun 核心机制
  image:
    src: /qiankun-logo.svg
    alt: qiankun Logo
  actions:
    - theme: brand
      text: 开始学习
      link: /guide/overview
    - theme: alt
      text: GitHub
      link: https://github.com/xuyuxiong/qiankun-source-code-analysis

features:
  - icon: 🧩
    title: qiankun 3.x
    details: 全面覆盖 qiankun 3.x 最新版本，包括沙箱机制、通信系统、应用加载等
  - icon: 📚
    title: 渐进式学习
    details: 从指南篇 → 架构篇 → 核心篇 → 进阶篇，自顶向下，符合认知规律
  - icon: 🔍
    title: 源码调试
    details: 手把手教你搭建调试环境，深入理解每一行代码
  - icon: 🎯
    title: 图解丰富
    details: 大量架构图、流程图、时序图，让抽象概念可视化
  - icon: ⚙️
    title: 沙箱机制
    details: 深入解析 JS 沙箱、样式沙箱、DOM 沙箱等核心设计
  - icon: 🌙
    title: 暗色模式
    details: 支持亮色/暗色主题切换，舒适阅读体验

---

## 📖 为什么学习 qiankun 源码？

<div class="why-learn">

**很多同学有这样的困惑：**

- 微前端架构如何设计？子应用如何隔离？
- JS 沙箱是如何实现的？Proxy 怎么用？
- 样式隔离如何做到？Shadow DOM 还是 CSS 作用域？
- 主应用与子应用如何通信？
- 应用如何加载和卸载？

**学习源码能帮你：**

1. ✅ 理解微前端架构设计理念，构建更优雅的前端架构
2. ✅ 掌握沙箱机制和隔离方案，避免应用间冲突
3. ✅ 信心满满地解决微前端集成问题
4. ✅ 甚至成为 qiankun 贡献者

</div>

## 🗺️ 学习路线

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   指南篇    │ ──► │   架构篇    │ ──► │   核心篇    │
│  入门准备   │     │  设计思想   │     │  核心机制   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                    ┌─────────────┐
                                    │   进阶篇    │
                                    │  高级主题   │
                                    └─────────────┘
```

## 📋 内容概览

### 指南篇
学习前的准备工作，包括环境搭建、调试方法、源码结构等

### 架构篇
理解 qiankun 为什么这样设计，整体架构、沙箱机制、通信系统等

### 核心篇
逐个解析应用加载、路由系统、JS 沙箱、样式隔离、DOM 沙箱等核心功能

### 进阶篇
自定义插件、性能优化、最佳实践等高级主题

## 👥 谁适合学习？

- ✅ 有 1-2 年 React/Vue 使用经验
- ✅ 熟悉前端工程化和模块化
- ✅ 对微前端架构有热情
- ✅ 愿意投入时间深入学习源码

## 📝 关于本项目

本项目系统性解析 qiankun 源码架构和核心实现。

相比其他资料，本项目的特点：
- 🆕 **内容完整**：覆盖所有核心模块和子包
- 📊 **图解更多**：大量可视化架构图和流程图
- ⚙️ **深度解析**：详细解析沙箱机制、通信系统等核心设计
- 📱 **现代化体验**：响应式设计、暗色模式、代码高亮

<style>
.why-learn {
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  padding: 24px;
  margin: 24px 0;
}
</style>