# 沙箱总览

> qiankun 3.x 沙箱架构解析

**核心源码**: `packages/sandbox/src/core/sandbox/`

---

## 📖 概述

qiankun 3.x 的沙箱系统相比 2.x 有重大改进：

### qiankun 2.x (已废弃)

```
┌──────────────────────────────────────────┐
│            qiankun 2.x 沙箱              │
│                                          │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ ProxySandbox │  │SnapshotSandbox  │  │
│  │ (Proxy 拦截)  │  │ (快照对比)      │  │
│  └──────────────┘  └─────────────────┘  │
│                                          │
│  ❌ 多实例支持不完整                      │
│  ❌ 快照模式 O(n) 开销                    │
└──────────────────────────────────────────┘
```

### qiankun 3.x (当前版本)

```
┌──────────────────────────────────────────┐
│            qiankun 3.x 沙箱              │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │       StandardSandbox              │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │      Membrane (膜)           │ │  │
│  │  │  ┌────────────────────────┐  │ │  │
│  │  │  │    realmGlobal         │  │ │  │
│  │  │  │    (沙箱全局对象)       │  │ │  │
│  │  │  └────────────────────────┘  │ │  │
│  │  │  ┌────────────────────────┐  │ │  │
│  │  │  │    modifications       │  │ │  │
│  │  │  │    (修改追踪)          │  │ │  │
│  │  │  └────────────────────────┘  │ │  │
│  │  └──────────────────────────────┘ │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ✅ 统一沙箱类型                          │
│  ✅ O(1) 激活/失活                        │
│  ✅ 完整多实例支持                        │
└──────────────────────────────────────────┘
```

---

## 🔧 核心组件

### StandardSandbox

**源码位置**: `packages/sandbox/src/core/sandbox/StandardSandbox.ts`

```typescript
export class StandardSandbox extends Compartment implements Sandbox {
  private readonly membrane: Membrane;
  readonly type = SandboxType.Standard;
  readonly name: string;

  constructor(
    name: string,
    globals: Endowments,
    incubatorContext: WindowProxy = window
  ) {
    // 定义沙箱内建属性
    const intrinsics: Record<string, PropertyDescriptor> = {
      window: { get: getRealmGlobal, enumerable: true, configurable: false },
      self: { get: getRealmGlobal, enumerable: true, configurable: false },
      globalThis: { get: getRealmGlobal, enumerable: false, configurable: true },
      hasOwnProperty: { /* 特殊处理 */ },
      eval: { value: eval, /* ... */ },
      top: { get: getTopValue('top'), /* ... */ },
      parent: { get: getTopValue('parent'), /* ... */ },
      document: { value: document, /* ... */ },
    };

    // 创建 Membrane
    const membrane = new Membrane(incubatorContext, unscopables, {
      whitelist: [],
      endowments: { ...intrinsics, ...globals },
    });

    this.membrane = membrane;
    this.name = name;
  }

  active() {
    this.membrane.unlock();
  }

  inactive() {
    this.membrane.lock();
  }
}
```

### Membrane (膜)

**源码位置**: `packages/sandbox/src/core/membrane/`

```typescript
interface Membrane {
  realmGlobal: WindowProxy;      // 沙箱全局对象
  target: WindowProxy;            // 原生 window
  unlock(): void;                 // 激活沙箱
  lock(): void;                   // 失活沙箱
  modifications: Map<PropertyKey, any>; // 修改追踪
}
```

### Compartment (隔离舱)

**源码位置**: `packages/sandbox/src/core/compartment/`

```typescript
export class Compartment {
  protected readonly globalObject: WindowProxy;
  
  constructor(globalObject: WindowProxy) {
    this.globalObject = globalObject;
  }
  
  evaluate(code: string) {
    // 在隔离上下文中执行代码
  }
}
```

---

## 🏗️ 架构设计

### 类层次结构

```
┌─────────────────────────────────────────┐
│            Compartment                  │
│  (隔离舱基类)                            │
│  - globalObject: WindowProxy            │
│  + evaluate(code: string): any          │
└─────────────────────────────────────────┘
                  ▲
                  │ extends
┌─────────────────────────────────────────┐
│         StandardSandbox                 │
│  (标准沙箱)                              │
│  - membrane: Membrane                   │
│  - name: string                         │
│  - type: SandboxType.Standard           │
│  + active(): void                       │
│  + inactive(): void                     │
└─────────────────────────────────────────┘
```

### 生命周期

```typescript
// 1. 创建沙箱容器
const sandboxContainer = createSandboxContainer(
  'myApp',
  () => document.getElementById('app1'),
  { 
    extraGlobals: { customGlobal: 'value' },
    styleIsolation: true,
  }
);

// 2. Mount
await sandboxContainer.mount(container);
// → sandbox.active() 激活沙箱
// → 应用 DOM 补丁
// → 应用 mounting 阶段补丁

// 3. 应用运行...

// 4. Unmount
await sandboxContainer.unmount();
// → 记录副作用重建函数
// → sandbox.inactive() 失活沙箱
```

---

## 📊 补丁系统

### patchAtBootstrapping

**源码位置**: `packages/sandbox/src/patchers/index.ts`

```typescript
export function patchAtBootstrapping(
  appName: string,
  getContainer: () => HTMLElement,
  cfg: SandboxConfig,
): Free[] {
  const bootstrappingFrees = [];

  // 1. 动态文档补丁
  bootstrappingFrees.push(patchDocument(appName, getContainer));

  // 2. History 补丁
  bootstrappingFrees.push(patchHistoryListener(appName));

  // 3. 窗口监听器补丁
  bootstrappingFrees.push(patchWindowListener(appName));

  return bootstrappingFrees;
}
```

### patchAtMounting

```typescript
export function patchAtMounting(
  appName: string,
  getContainer: () => HTMLElement,
  cfg: SandboxConfig,
): Free[] {
  const mountingFrees = [];

  // 1. 定时器补丁
  mountingFrees.push(patchInterval(sandbox));

  // 2. 自定义补丁
  // ...

  return mountingFrees;
}
```

---

## 🧪 调试技巧

### 观察沙箱激活

```typescript
const sandboxContainer = createSandboxContainer('myApp', () => container);

// 添加日志
const originalActive = sandboxContainer.instance.active;
sandboxContainer.instance.active = function() {
  console.log('[Sandbox] Active!');
  return originalActive.call(this);
};
```

### 检查修改追踪

```typescript
// 开发环境下，inactive 会输出修改追踪
sandbox.inactive();
// 输出：[qiankun:sandbox] myApp modified global properties restore...
// [arrayOfModifiedKeys]
```

---

## 📁 文件结构

```
packages/sandbox/src/
├── core/
│   ├── sandbox/
│   │   ├── StandardSandbox.ts    # 标准沙箱实现
│   │   ├── index.ts              # createSandboxContainer 工厂
│   │   └── types.ts              # Sandbox 类型定义
│   ├── compartment/
│   │   └── index.ts              # 隔离舱基类
│   ├── membrane/
│   │   └── index.ts              # 膜模式实现
│   └── globals.ts                # ES2015 全局变量列表
├── patchers/
│   ├── dynamicAppend/            # 动态 DOM 管理
│   ├── historyListener.ts        # History 补丁
│   ├── windowListener.ts         # 窗口监听器补丁
│   ├── interval.ts               # 定时器补丁
│   └── index.ts                  # 补丁入口
└── index.ts
```

---

## 🎯 最佳实践

### 1. 使用沙箱 container

```typescript
// ✅ 推荐
const sandboxContainer = createSandboxContainer('app1', () => container);
await sandboxContainer.mount(container);

// ❌ 避免直接使用全局 window
window.customProp = 'value';

// ✅ 使用沙箱全局上下文
sandbox.instance.proxy.customProp = 'value';
```

### 2. 及时清理副作用

```typescript
export async function unmount() {
  // 清理定时器
  if (this.timer) {
    clearInterval(this.timer);
  }
  
  // 清理事件监听
  if (this.offGlobalStateChange) {
    this.offGlobalStateChange();
  }
  
  // 清理 DOM 引用
  this.container = null;
}
```

---

## ➡️ 相关文档

- [JS 沙箱](/core/js-sandbox) - StandardSandbox 详解
- [DOM 沙箱](/core/dom-sandbox) - 动态 DOM 管理
- [样式隔离](/core/style-isolation) - CSS 作用域