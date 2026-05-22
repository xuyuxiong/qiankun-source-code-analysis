# Monorepo 结构

## 项目组织

qiankun 采用 Monorepo 架构，将相关但独立的模块组织在一个仓库中。

### 根目录结构

```
qiankun/
├── .changeset/           # 版本变更管理
├── .github/              # GitHub 配置
├── docs/                 # 官方文档
├── examples/             # 示例项目
├── packages/             # 核心包
├── scripts/              # 构建脚本
├── package.json          # 根配置
├── pnpm-lock.yaml        # 依赖锁定
├── pnpm-workspace.yaml   # 工作空间配置
├── tsconfig.json         # TypeScript 配置
└── .dumirc.ts            # 文档配置
```

## 核心包详解

### packages/qiankun

**核心运行时包**

```
packages/qiankun/
├── src/
│   ├── apis/                  # 公共 API
│   │   ├── loadMicroApp.ts   # 加载微应用 API
│   │   ├── registerMicroApps.ts # 注册 API
│   │   ├── prefetch.ts        # 预加载 API
│   │   ├── effects.ts         # 副作用管理
│   │   └── errorHandler.ts    # 错误处理
│   ├── core/
│   │   └── loadApp.ts         # 应用加载核心
│   ├── addons/                # 插件系统
│   ├── types.ts              # 类型定义
│   ├── utils.ts              # 工具函数
│   └── index.ts              # 入口文件
├── package.json
└── README.md
```

**源码入口:**

```typescript
// src/index.ts
export * from './apis/loadMicroApp';
export * from './apis/registerMicroApps';
export * from './apis/prefetch';
export * from './apis/errorHandler';
```

### packages/sandbox

**沙箱隔离包**

```
packages/sandbox/
├── src/
│   ├── core/
│   │   ├── sandbox/           # 沙箱实现
│   │   │   ├── SnapshotSandbox.ts
│   │   │   ├── ProxySandbox.ts
│   │   │   └── StandardAppSandbox.ts
│   │   ├── compartment/       # 隔离舱
│   │   │   └── Compartment.ts
│   │   └── membrane/          # 膜系统
│   └── patchers/              # 补丁系统
│       ├── css.ts            # CSS 补丁
│       ├── dynamicAppend/     # DOM 补丁
│       └── historyListen.ts   # 历史监听
├── package.json
└── README.md
```

**沙箱类型对比:**

| 沙箱类型 | 实现原理 | 适用场景 | 性能 |
|---------|---------|---------|------|
| SnapshotSandbox | 快照对比 | 单实例应用 | 中 |
| LegacyProxySandbox | Proxy + 记录 | 兼容旧环境 | 低 |
| ProxySandbox | Proxy + 沙箱对象 | 多实例应用 | 高 |

### packages/loader

**资源加载器**

```
packages/loader/
├── src/
│   ├── index.ts               # 主入口
│   ├── TagTransformStream.ts  # 标签转换流
│   ├── parser.ts              # HTML 解析器
│   └── writable-dom/          # 可写 DOM 实现
├── package.json
└── README.md
```

**核心功能:**

```typescript
importHTML(url, opts) {
  // 1. 获取 HTML 内容
  const html = await fetch(url);
  
  // 2. 解析 HTML 结构
  const { scripts, styles } = parseHTML(html);
  
  // 3. 创建沙箱上下文
  const execScripts = (sandbox) => {
    scripts.forEach(script => {
      sandbox.exec(script);
    });
  };
  
  return { execScripts };
}
```

### packages/shared

**共享工具包**

```
packages/shared/
├── src/
│   ├── fetch-utils/           # 资源获取
│   │   ├── fetchWithDegrade.ts
│   │   └── index.ts
│   ├── module-resolver/       # 模块解析
│   │   └── resolvers/
│   ├── reporter/              # 错误报告
│   │   ├── defaultReporter.ts
│   │   └── index.ts
│   ├── assets-transpilers/    # 资源转译
│   │   └── script.ts
│   └── index.ts
└── package.json
```

### packages/create-qiankun

**CLI 初始化工具**

```
packages/create-qiankun/
├── src/
│   └── index.ts              # CLI 主入口
├── templates/                 # 项目模板
└── package.json
```

### packages/ui-bindings

**UI 框架绑定**

```
packages/ui-bindings/
├── src/
│   ├── vue/                  # Vue 绑定
│   └── react/                # React 绑定
└── package.json
```

## 包依赖关系

```
qiankun (主包)
├── @qiankunjs/sandbox ^2.0.0
├── @qiankunjs/loader ^1.0.0
└── @qiankunjs/shared ^1.0.0
```

## pnpm 工作空间配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'examples/*'
```

## 构建配置

### 根 package.json

```json
{
  "scripts": {
    "dev": "dumi dev",
    "build": "father build",
    "test": "vitest",
    "prepare": "husky install",
    "release": "changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.26.0",
    "dumi": "^2.2.0",
    "father": "^4.3.0",
    "husky": "^8.0.0",
    "vitest": "^1.0.0"
  }
}
```

### 子包配置示例

```json
{
  "name": "@qiankunjs/qiankun",
  "version": "3.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "dependencies": {
    "@qiankunjs/sandbox": "workspace:*",
    "@qiankunjs/loader": "workspace:*",
    "@qiankunjs/shared": "workspace:*"
  }
}
```

## 版本管理

### Changeset 工作流

1. **添加变更描述:**
   ```bash
   pnpm changeset
   ```

2. **提交变更:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **版本发布:**
   ```bash
   pnpm release
   ```

### 版本号规则

- `major`: 破坏性变更
- `minor`: 新功能
- `patch`: 补丁修复

## 开发工作流

### 1. 本地开发主包

```bash
cd packages/qiankun
pnpm run build
pnpm link --global
```

### 2. 在示例项目中使用

```bash
cd examples/main
pnpm link --global @qiankunjs/qiankun
```

### 3. 测试修改

```bash
pnpm test
pnpm run dev
```

## 下一步

- [沙箱机制](/architecture/sandbox) - 深入理解隔离
- [通信系统](/architecture/communication) - 学习数据流动