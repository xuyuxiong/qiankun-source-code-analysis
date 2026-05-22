# 整体架构

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        主应用 (Main App)                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    qiankun Runtime                       │  │
│  │  ┌────────────┐  ┌──────────┐  ┌─────────────────────┐  │  │
│  │  │  注册系统  │  │ 路由系统 │  │     生命周期管理    │  │  │
│  │  └────────────┘  └──────────┘  └─────────────────────┘  │  │
│  │  ┌────────────┐  ┌──────────┐  ┌─────────────────────┐  │  │
│  │  │  加载系统  │  │ 沙箱系统 │  │      通信系统       │  │  │
│  │  └────────────┘  └──────────┘  └─────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  微应用 1     │  │  微应用 2     │  │  微应用 3     │
│  (React)      │  │  (Vue)        │  │  (Angular)    │
└───────────────┘  └───────────────┘  └───────────────┘
```

## 核心组件

### 1. 注册系统

负责微应用的注册和配置管理。

**核心文件:** `packages/qiankun/src/apis/registerMicroApps.ts`

**功能:**
- 应用配置存储
- 路由规则管理
- 激活状态跟踪

```typescript
// 简化示例
const microApps = new Map<string, AppConfig>();

export function registerMicroApps(apps: Array<RegistrableApp>, lifeCycles?: LifeCycles) {
  apps.forEach(app => {
    microApps.set(app.name, app);
  });
}
```

### 2. 路由系统

根据 URL 变化自动激活/卸载微应用。

**核心文件:** `packages/qiankun/src/core/loadApp.ts`

**功能:**
- URL 匹配
- 应用激活判断
- 路由状态同步

### 3. 加载系统

负责加载和解析微应用的资源。

**核心模块:**
- `packages/loader/` - 资源加载器
- `packages/shared/fetch-utils/` - 资源获取

**流程:**
```
HTML Entry → 解析 → 提取 JS/CSS → 执行/应用
```

### 4. 沙箱系统

提供 JS 和样式隔离。

**核心模块:**
- `packages/sandbox/` - 沙箱实现

**沙箱类型:**
- SnapshotSandbox - 快照沙箱（单例）
- ProxySandbox - 代理沙箱（多例）
- LegacyProxySandbox - 旧版代理沙箱

### 5. 通信系统

微应用之间以及主应用与微应用之间的通信。

**核心文件:** `packages/qiankun/src/apis/effects.ts`

**通信方式:**
- props - 主应用向子应用传递
- GlobalState - 全局状态
- CustomEvent - 自定义事件

## 生命周期

### 完整生命周期流程

```
     ┌─────────────┐
     │   bootstrap │
     └──────┬──────┘
            │
            ▼
     ┌─────────────┐
     │    mount    │
     └──────┬──────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
运行中           卸载中
    │               │
    ▼               ▼
     ┌─────────────┐
     │   unmount   │
     └─────────────┘
```

### 各阶段说明

**bootstrap 阶段:**
- 应用初始化
- 只需执行一次

**mount 阶段:**
- 渲染应用
- 绑定事件
- 可多次执行

**unmount 阶段:**
- 清理副作用
- 卸载组件
- 恢复全局状态

## 数据流

```
用户访问路由 → 路由匹配 → 加载应用 → 创建沙箱 → 执行代码 → 渲染 UI
                                         │
                                         ▼
                                   注入全局变量
                                         │
                                         ▼
                                   拦截修改操作
                                         │
                                         ▼
                                   卸载时恢复
```

## 关键设计原则

### 1. 侵入性最小化

- 子应用无需修改代码即可接入
- 支持多种框架（React、Vue、Angular 等）
- 通过标准生命周期钩子集成

### 2. 隔离性优先

- JS 沙箱隔离全局变量
- CSS 隔离防止样式污染
- 运行时隔离避免冲突

### 3. 灵活性

- 支持多种路由模式
- 可定制生命周期
- 支持插件扩展

### 4. 性能考虑

- 预加载机制
- 资源缓存
- 懒加载支持

## 模块依赖关系

```
qiankun (主包)
├── @qiankunjs/sandbox    # 沙箱依赖
├── @qiankunjs/loader      # 加载器依赖
└── @qiankunjs/shared      # 共享工具

shared
├── fetch-utils            # 资源获取
├── module-resolver        # 模块解析
└── reporter              # 错误报告
```

## 核心流程源码追踪

### 应用加载流程

```typescript
// 1. 用户访问 URL
window.location.href = '/app1/home';

// 2. qiankun 检查 activeRule
const activated = apps.filter(app => app.activeRule(location));

// 3. 加载应用资源
const { scriptExports } = await importEntry(entry);

// 4. 创建沙箱
const sandbox = new ProxySandbox(appName);

// 5. 执行生命周期
await bootstrap(app);
await mount(app);
```

## 下一步

- [Monorepo 结构](/architecture/monorepo) - 深入了解项目组织
- [沙箱机制](/architecture/sandbox) - 探索隔离原理