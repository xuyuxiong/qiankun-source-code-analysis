# 源码结构

## Monorepo 布局

qiankun 采用 Monorepo 架构组织代码，使用 pnpm 作为包管理器。

```
qiankun/
├── packages/
│   ├── qiankun/          # 核心运行时
│   │   └── src/
│   │       ├── apis/     # 对外暴露的 API
│   │       ├── core/     # 核心逻辑
│   │       ├── addons/   # 插件系统
│   │       ├── types.ts  # 类型定义
│   │       └── utils.ts  # 工具函数
│   │
│   ├── sandbox/          # 沙箱实现
│   │   └── src/
│   │       ├── core/
│   │       │   ├── sandbox/    # 沙箱主逻辑
│   │       │   ├── compartment # 隔离舱
│   │       │   └── membrane/   # 膜系统
│   │       └── patchers/       # 各种 Patch
│   │
│   ├── loader/           # 资源加载器
│   │   └── src/
│   │       ├── index.ts
│   │       ├── parser.ts
│   │       └── writable-dom/
│   │
│   ├── shared/           # 共享工具
│   │   └── src/
│   │       ├── fetch-utils/
│   │       ├── module-resolver/
│   │       ├── reporter/
│   │       └── assets-transpilers/
│   │
│   ├── ui-bindings/      # UI 框架绑定
│   ├── create-qiankun/   # CLI 工具
│   └── bundler-plugin/   # 构建插件
│
├── docs/                 # 官方文档
├── examples/             # 示例项目
└── scripts/              # 构建脚本
```

## 核心包详解

### packages/qiankun

主包，包含 qiankun 的核心运行时逻辑。

**目录结构:**

```
apis/
├── loadMicroApp.ts      # 加载微应用 API
├── registerMicroApps.ts # 注册微应用 API
├── prefetch.ts          # 预加载功能
├── effects.ts           # 副作用管理
└── errorHandler.ts      # 错误处理

core/
└── loadApp.ts           # 应用加载核心逻辑

addons/
├── index.ts             # 插件入口
├── engineFlag.ts        # 引擎标识
└── runtimePublicPath.ts # 运行时路径
```

**核心入口文件:**

```typescript
// packages/qiankun/src/index.ts
export * from './apis/loadMicroApp';
export * from './apis/registerMicroApps';
export * from './apis/prefetch';
export * from './apis/errorHandler';
export * from './apis/isRuntimeCompatible';
```

### packages/sandbox

沙箱实现包，提供 JS 和样式隔离能力。

**目录结构:**

```
core/
├── sandbox/
│   ├── SnapshotSandbox.ts      # 快照沙箱
│   ├── LegacyProxySandbox.ts   # 旧代理沙箱
│   ├── ProxySandbox.ts         # 代理沙箱
│   └── StandardAppSandbox.ts   # 标准应用沙箱
│
├── compartment/
│   └── Compartment.ts          # 隔离舱实现
│
└── membrane/
    └── membrane.ts             # 膜系统

patchers/
├── css.ts                      # CSS 补丁
├── dynamicAppend/              # 动态 DOM 补丁
├── historyListen.ts            # 历史监听
└── interval.ts                 # 定时器补丁
```

**核心功能:**

- **快照沙箱**: 记录修改前后的状态快照
- **代理沙箱**: 使用 Proxy 实现变量隔离
- **CSS 补丁**: 处理样式表插入和修改
- **DOM 补丁**: 处理动态 DOM 操作

### packages/loader

资源加载器，负责加载和解析子应用的 HTML、JS、CSS。

**核心类:**

- `TagTransformStream`: 标签转换流
- `parser.ts`: HTML 解析器
- `writable-dom/`: 可写 DOM 实现

### packages/shared

共享工具包，提供通用功能。

**模块:**

- `fetch-utils/`: 资源获取工具
- `module-resolver/`: 模块解析器
- `reporter/`: 错误报告
- `assets-transpilers/`: 资源转译器

## 关键文件源码位置

| 功能 | 源码路径 |
|------|----------|
| 应用加载 | `packages/qiankun/src/core/loadApp.ts` |
| API 暴露 | `packages/qiankun/src/apis/` |
| 沙箱实现 | `packages/sandbox/src/core/sandbox/` |
| CSS 隔离 | `packages/sandbox/src/patchers/css.ts` |
| 资源加载 | `packages/loader/src/index.ts` |
| 错误处理 | `packages/shared/src/reporter/` |

## 依赖关系

```
qiankun (主包)
├── sandbox (沙箱)
├── loader (加载器)
└── shared (共享工具)
```

## 源码阅读建议

1. **从入口开始**: `packages/qiankun/src/index.ts`
2. **理解 API**: 阅读 `apis/loadMicroApp.ts` 和 `apis/registerMicroApps.ts`
3. **深入核心**: 研究 `core/loadApp.ts` 的应用加载流程
4. **探索沙箱**: 查看 `sandbox/src/core/sandbox/` 中的各种沙箱实现
5. **理解加载器**: 阅读 `loader/src/index.ts` 了解资源加载机制

## 下一步

- [调试指南](/guide/debugging) - 学习如何调试源码
- [整体架构](/architecture/overview) - 理解设计思想