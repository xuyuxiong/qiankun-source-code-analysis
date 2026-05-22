# qiankun 源码深度解析

<div align="center">

![qiankun Logo](https://gw.alipayobjects.com/zos/bmw-prod/8a74c1d3-16f3-4719-be63-15e467a68a24/km0cv8vn_w500_h500.png)

**全面解析蚂蚁集团微前端解决方案 qiankun 的源码实现**

[📖 在线阅读](https://xuyuxiong.github.io/qiankun-source-code-analysis/) | [🐛 问题反馈](https://github.com/xuyuxiong/qiankun-source-code-analysis/issues)

</div>

## 📖 系列项目

本项目与以下源码解析项目保持一致风格：

- [Vue 源码深度解析](https://github.com/xuyuxiong/vue-source-code-analysis)
- [LangChainJS 源码深度解析](https://github.com/xuyuxiong/langchainjs-source-code-analysis)
- [Ant Design X 源码深度解析](https://github.com/xuyuxiong/ant-design-x-source-code-analysis)

## 🌟 项目特点

- **全面深入**: 覆盖 qiankun 所有核心模块
- **图文并茂**: 大量架构图和流程图帮助理解
- **实战导向**: 结合真实场景的源码解析
- **持续更新**: 跟随 qiankun 版本迭代更新

## 📚 目录结构

```
qiankun-source-code-analysis/
├── docs/                      # 文档目录
│   ├── .vitepress/           # VitePress 配置
│   ├── guide/                # 指南篇
│   │   ├── overview.md       # 概览
│   │   ├── quick-start.md    # 快速开始
│   │   ├── structure.md      # 源码结构
│   │   └── debugging.md      # 调试指南
│   │
│   ├── architecture/         # 架构篇
│   │   ├── overview.md       # 整体架构
│   │   ├── monorepo.md       # Monorepo 结构
│   │   ├── sandbox.md        # 沙箱机制
│   │   └── communication.md  # 通信系统
│   │
│   ├── core/                 # 核心篇
│   │   ├── app-loading.md    # 应用加载
│   │   ├── routing-system.md # 路由系统
│   │   ├── sandbox-overview.md # 沙箱概览
│   │   ├── js-sandbox.md     # JS 沙箱
│   │   ├── style-isolation.md # 样式隔离
│   │   ├── dom-sandbox.md    # DOM 沙箱
│   │   ├── js-executor.md    # JS 执行器
│   │   ├── module-system.md  # 模块系统
│   │   ├── lifecycle-management.md # 生命周期
│   │   ├── state-management.md # 状态管理
│   │   └── prefetch.md       # 预加载机制
│   │
│   ├── advanced/             # 进阶篇
│   │   ├── custom-plugins.md # 自定义插件
│   │   ├── performance.md    # 性能优化
│   │   ├── best-practices.md # 最佳实践
│   │   └── faq.md            # 常见问题
│   │
│   └── index.md              # 首页
│
├── .github/                   # GitHub 配置
│   └── workflows/
│       └── deploy.yml        # 部署配置
│
├── package.json              # 项目配置
└── README.md                 # 项目说明
```

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run docs:dev
```

访问 http://localhost:5173 查看文档。

### 构建

```bash
npm run docs:build
```

### 预览

```bash
npm run docs:preview
```

## 📖 内容大纲

### 指南篇

1. **概览** - 了解 qiankun 是什么，核心特性，适用场景
2. **快速开始** - 主应用和子应用的配置方法
3. **源码结构** - Monorepo 项目组织，核心包解析
4. **调试指南** - 本地开发环境搭建，调试技巧

### 架构篇

1. **整体架构** - 架构图，核心组件，数据流设计
2. **Monorepo 结构** - pnpm workspace 配置，包依赖关系
3. **沙箱机制** - 快照沙箱 vs 代理沙箱，样式隔离
4. **通信系统** - Props、GlobalState、事件通信

### 核心篇

1. **应用加载** - loadApp 函数，importHTML，脚本执行
2. **路由系统** - Active Rule，History 补丁，base 配置
3. **JS 沙箱** - ProxySandbox 实现，多实例隔离
4. **样式隔离** - Scoped CSS, Shadow DOM, CSS 补丁
5. **资源加载器** - HTML Entry 解析，资源获取
6. **模块系统** - ES Modules 支持，模块解析
7. **生命周期** - bootstrap/mount/unmount 完整流程
8. **状态管理** - GlobalState 实现，状态共享
9. **预加载** - Prefetch 机制，性能优化

### 进阶篇

1. **自定义插件** - 插件 API，插件开发指南
2. **性能优化** - 加载优化，运行时优化，内存优化
3. **最佳实践** - 项目结构，状态管理，错误处理
4. **常见问题** - FA Q，调试技巧

## 🎯 适合人群

- 想了解微前端架构原理的开发者
- 正在使用 qiankun 的前端工程师
- 想深入学习 JavaScript 高级特性
- 对前端工程化感兴趣的技术人员

## 📚 配套资源

- [qiankun 官方文档](https://qiankun.umijs.org/)
- [qiankun GitHub](https://github.com/umijs/qiankun)
- [single-spa 官方文档](https://single-spa.js.org/)

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

[MIT](https://github.com/xuyuxiong/qiankun-source-code-analysis/blob/main/LICENSE)

---

<div align="center">

**与 Vue、LangChainJS、Ant Design X 源码解析项目保持一致风格**

Made with ❤️ by 林傒

</div>