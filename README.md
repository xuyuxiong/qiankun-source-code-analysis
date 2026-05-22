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
│   │   ├── resource-loader.md # 资源加载器
│   │   └── prefetch.md       # 预加载机制
│   │
│   ├── advanced/             # 进阶篇
│   │   ├── custom-plugins.md # 自定义插件
│   │   ├── performance.md    # 性能优化
│   │   ├── best-practices.md # 最佳实践
│   │   ├── single-spa.md     # single-spa 集成
│   │   └── faq.md            # 常见问题
│   │
│   └── index.md              # 首页
│
├── package.json              # 项目配置
├── package-lock.json         # 依赖锁定
└── README.md                 # 项目说明
```

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
# 启动开发服务器
npm run docs:dev

# 构建静态站点
npm run docs:build

# 预览构建结果
npm run docs:preview
```

访问 http://localhost:5173 查看文档。

## 📖 内容大纲

### 📋 指南篇 - 入门必读
1. **[概览](docs/guide/overview.md)** - qiankun 简介、核心特性、适用场景
2. **[快速开始](docs/guide/quick-start.md)** - 主应用和子应用的完整配置指南
3. **[源码结构](docs/guide/structure.md)** - Monorepo 项目组织、核心包解析
4. **[调试指南](docs/guide/debugging.md)** - 本地开发环境搭建、调试技巧

### 🏗️ 架构篇 - 深入理解
1. **[整体架构](docs/architecture/overview.md)** - 架构图、核心组件、数据流设计
2. **[Monorepo 结构](docs/architecture/monorepo.md)** - pnpm workspace 配置、包依赖关系
3. **[沙箱机制](docs/architecture/sandbox.md)** - 快照沙箱 vs 代理沙箱、样式隔离原理
4. **[通信系统](docs/architecture/communication.md)** - Props、GlobalState、事件通信机制

### ⚙️ 核心篇 - 源码剖析
1. **[应用加载](docs/core/app-loading.md)** - loadApp 函数、importHTML、脚本执行流程
2. **[路由系统](docs/core/routing-system.md)** - Active Rule、History 补丁、base 配置
3. **[沙箱概览](docs/core/sandbox-overview.md)** - 沙箱体系架构、各类型沙箱对比
4. **[JS 沙箱](docs/core/js-sandbox.md)** - ProxySandbox 实现、多实例隔离机制
5. **[样式隔离](docs/core/style-isolation.md)** - Scoped CSS、Shadow DOM、CSS 补丁实现
6. **[DOM 沙箱](docs/core/dom-sandbox.md)** - DOM 隔离、元素补丁、事件处理
7. **[JS 执行器](docs/core/js-executor.md)** - 脚本执行环境、全局变量处理
8. **[模块系统](docs/core/module-system.md)** - ES Modules 支持、模块解析机制
9. **[生命周期](docs/core/lifecycle-management.md)** - bootstrap/mount/unmount 完整流程
10. **[状态管理](docs/core/state-management.md)** - GlobalState 实现、状态共享机制
11. **[资源加载器](docs/core/resource-loader.md)** - HTML Entry 解析、资源获取策略
12. **[预加载机制](docs/core/prefetch.md)** - Prefetch 机制、性能优化策略

### 🚀 进阶篇 - 高级应用
1. **[自定义插件](docs/advanced/custom-plugins.md)** - 插件 API、插件开发完整指南
2. **[性能优化](docs/advanced/performance.md)** - 加载优化、运行时优化、内存优化
3. **[最佳实践](docs/advanced/best-practices.md)** - 项目结构、状态管理、错误处理
4. **[single-spa 集成](docs/advanced/single-spa.md)** - qiankun 与 single-spa 的关系和集成
5. **[常见问题](docs/advanced/faq.md)** - FAQ、调试技巧、常见错误解决

## 🎯 适合人群

- 🆕 **初学者**: 想了解微前端架构原理的开发者
- 🔧 **使用者**: 正在使用 qiankun 的前端工程师
- 📚 **进阶者**: 想深入学习 JavaScript 高级特性
- 🏗️ **架构师**: 对前端工程化感兴趣的技术人员

## 📚 配套资源

### 官方资源
- [📖 qiankun 官方文档](https://qiankun.umijs.org/)
- [🐙 qiankun GitHub](https://github.com/umijs/qiankun)
- [📑 single-spa 官方文档](https://single-spa.js.org/)

### 学习路径
1. **新手入门**: 指南篇 → 架构篇 → 核心篇
2. **进阶学习**: 核心篇 → 进阶篇 → 实战项目
3. **源码贡献**: 架构篇 → 核心篇 → 调试指南

## 🤝 参与贡献

我们欢迎所有形式的贡献！

### 如何贡献
- 🐛 [提交 Issue](https://github.com/xuyuxiong/qiankun-source-code-analysis/issues) - 报告 bug 或建议改进
- 📝 [提交 PR](https://github.com/xuyuxiong/qiankun-source-code-analysis/pulls) - 直接贡献代码或文档
- 💡 [发起讨论](https://github.com/xuyuxiong/qiankun-source-code-analysis/discussions) - 分享想法和经验

### 贡献指南
1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 License

本项目采用 [MIT](https://github.com/xuyuxiong/qiankun-source-code-analysis/blob/main/LICENSE) 开源协议。

---

<div align="center">

**与 Vue、LangChainJS、Ant Design X 源码解析项目保持一致风格**

Made with ❤️ by 林傒

</div>