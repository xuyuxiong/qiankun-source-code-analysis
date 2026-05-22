# JS 沙箱实现

> qiankun 3.x 使用 **StandardSandbox** 基于 Membrane 模式实现高效上下文隔离

**源码位置**: `packages/sandbox/src/core/sandbox/StandardSandbox.ts`

---

## 📖 概述

qiankun 3.x 的沙箱系统相比 2.x 有重大改进：

| 对比项 | qiankun 2.x | qiankun 3.x |
|--------|-------------|-------------|
| 沙箱类型 | ProxySandbox / SnapshotSandbox | **StandardSandbox** |
| 实现方式 | Proxy 拦截 / 快照对比 | **Membrane (膜) 模式** |
| 多实例 | Proxy 支持 | ✅ 支持 |
| 性能 | O(n) 快照开销 | O(1) 解锁/锁定 |

**核心改进**:
- ✅ 统一使用 `StandardSandbox`，废弃多种沙箱类型
- ✅ 基于 `Membrane` 膜模式，更高效的上下文切换
- ✅ 使用 `Compartment` (隔离舱) 包装全局对象

---

## 🔧 StandardSandbox 实现

### 核心代码

```typescript
// packages/sandbox/src/core/sandbox/StandardSandbox.ts
import { hasOwnProperty } from '@qiankunjs/shared';
import { without } from 'lodash';
import { Compartment } from '../compartment';
import { globalsInES2015 } from '../globals';
import type { Endowments } from '../membrane';
import { Membrane } from '../membrane';
import type { Sandbox } from './types';
import { SandboxType } from './types';

const whitelistBOMAPIs = ['requestAnimationFrame', 'cancelAnimationFrame'];

export class StandardSandbox extends Compartment implements Sandbox {
  private readonly membrane: Membrane;

  readonly type = SandboxType.Standard;

  readonly name: string;

  constructor(
    name: string,
    globals: Endowments,
    incubatorContext: WindowProxy = window
  ) {
    // 1. 定义获取沙箱全局对象的方法
    const getRealmGlobal = () => realmGlobal;
    
    // 2. 处理 top/parent 逃逸
    const getTopValue = (p: 'top' | 'parent'): WindowProxy => {
      if (incubatorContext === incubatorContext.parent) {
        return realmGlobal;
      }
      return incubatorContext[p]!;
    };

    // 3. 定义沙箱内建属性 (intrinsics)
    const intrinsics: Record<string, PropertyDescriptor> = {
      // 防止 window.self / window.window 逃逸
      window: { get: getRealmGlobal, enumerable: true, configurable: false },
      self: { get: getRealmGlobal, enumerable: true, configurable: false },
      globalThis: { get: getRealmGlobal, enumerable: false, configurable: true },

      // hasOwnProperty 特殊处理
      hasOwnProperty: {
        value: function hasOwnPropertyImpl(this: unknown, key: PropertyKey): boolean {
          if (this !== realmGlobal && this !== null && typeof this === 'object') {
            return hasOwnProperty(this, key);
          }
          return hasOwnProperty(target, key) || hasOwnProperty(incubatorContext, key);
        },
        writable: true,
        enumerable: false,
        configurable: true,
      },

      // eval 保持原生行为
      eval: { value: eval, writable: true, enumerable: false, configurable: true },

      // top/parent 处理
      top: {
        get() { return getTopValue('top'); },
        configurable: false,
        enumerable: true,
      },
      parent: {
        get() { return getTopValue('parent'); },
        configurable: false,
        enumerable: true,
      },

      // document 临时占用
      document: { value: document, writable: true, enumerable: true, configurable: true },
    };

    // 4. 计算常量名称列表
    const constantNames = Array.from(
      new Set(
        Object.keys(intrinsics)
          .concat(globalsInES2015)
          .concat(whitelistBOMAPIs)
      )
    );

    // 5. 创建 Membrane
    const unscopables = array2TruthyObject(
      without(constantNames, ...Object.keys(intrinsics))
    );
    
    const membrane = new Membrane(incubatorContext, unscopables, {
      whitelist: [],
      endowments: { ...intrinsics, ...globals },
    });

    const { realmGlobal, target } = membrane;

    // 6. 调用父类构造函数
    super(realmGlobal);

    this.name = name;
    this.membrane = membrane;

    this.addConstantIntrinsicNames(constantNames);
  }

  // 获取最后设置的属性（用于调试）
  get latestSetProp() {
    return this.membrane.latestSetProp;
  }

  // 添加内建属性
  addIntrinsics(intrinsics: Record<string, PropertyDescriptor>) {
    this.membrane.addIntrinsics(intrinsics);
  }

  // 激活沙箱
  active() {
    this.membrane.unlock();
  }

  // 失活沙箱
  inactive() {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[qiankun:sandbox] ${this.name} modified global properties restore...`, [
        ...this.membrane.modifications.keys(),
      ]);
    }
    this.membrane.lock();
  }
}
```

---

## 🎯 Membrane (膜) 机制

### 什么是 Membrane？

Membrane 是一种**上下文隔离模式**，在 qiankun 3.x 中用于实现高效的沙箱：

```typescript
interface Membrane {
  realmGlobal: WindowProxy;      // 沙箱全局对象
  target: WindowProxy;            // 原生 window
  unlock(): void;                 // 激活沙箱
  lock(): void;                   // 失活沙箱
  modifications: Map<PropertyKey, any>; // 修改追踪
}
```

### 工作原理

```
┌───────────────────────────────────────────┐
│              Membrane (膜)                 │
│                                           │
│  ┌─────────────────┐    ┌──────────────┐ │
│  │  realmGlobal    │    │    target    │ │
│  │  (沙箱上下文)    │◄──►│  (原生window)│ │
│  └─────────────────┘    └──────────────┘ │
│           ▲                      ▲        │
│           │                      │        │
│  ┌─────────────────────────────────────┐ │
│  │         modifications (修改追踪)     │ │
│  │  Map<PropertyKey, originalValue>    │ │
│  └─────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

### 激活/失活流程

```typescript
// 创建沙箱
const sandbox = new StandardSandbox('myApp', {});

// 激活
sandbox.active();
// → membrane.unlock()
// → 允许访问沙箱上下文
// → 开始追踪修改

// 失活
sandbox.inactive();
// → membrane.lock()
// → 恢复全局状态
// → 输出修改追踪（开发环境）
```

---

## 📊 与旧版本对比

### qiankun 2.x (已废弃)

```typescript
// ❌ ProxySandbox - 已废弃
export class ProxySandbox {
  private proxy: WindowProxy;
  
  constructor(name: string) {
    this.proxy = new Proxy({}, {
      get: (target, p) => {/* ... */},
      set: (target, p, value) => {/* ... */},
    });
  }
}

// ❌ SnapshotSandbox - 已废弃
export class SnapshotSandbox {
  private windowSnapshot: Record<PropertyKey, any>;
  
  active() {
    // O(n) 快照开销
    for (const prop in window) {
      this.windowSnapshot[prop] = window[prop];
    }
  }
}
```

### qiankun 3.x (当前版本)

```typescript
// ✅ StandardSandbox
export class StandardSandbox extends Compartment {
  private readonly membrane: Membrane;
  
  active() {
    this.membrane.unlock(); // O(1) 操作
  }
  
  inactive() {
    this.membrane.lock(); // O(1) 操作
  }
}
```

---

## 🔍 关键特性

### 1. Intrinsics (内建属性)

StandardSandbox 定义了一组内建属性，确保沙箱行为正确：

| 属性 | 行为 |
|------|------|
| `window` / `self` | 返回 `realmGlobal` (沙箱自身) |
| `globalThis` | 返回 `realmGlobal` |
| `eval` | 保持原生 `eval` |
| `top` / `parent` | 根据 iframe 上下文决定 |
| `hasOwnProperty` | 特殊处理，支持跨上下文检查 |
| `document` | 临时占用，后续可能被修改 |

### 2. Compartment (隔离舱)

`StandardSandbox` 继承自 `Compartment`：

```typescript
// packages/sandbox/src/core/compartment/index.ts
export class Compartment {
  protected readonly globalObject: WindowProxy;
  
  constructor(globalObject: WindowProxy) {
    this.globalObject = globalObject;
  }
  
  // 提供evaluate等方法
  evaluate(code: string) {
    // 在隔离上下文中执行代码
  }
}
```

### 3. 常量名称追踪

```typescript
const constantNames = Array.from(
  new Set(
    Object.keys(intrinsics)
      .concat(globalsInES2015)
      .concat(whitelistBOMAPIs)
  )
);

// 用于 hasOwnProperty 和 for...in 遍历
```

---

## 🧪 使用示例

```typescript
import { createSandboxContainer } from '@qiankunjs/sandbox';

// 创建沙箱容器
const sandboxContainer = createSandboxContainer(
  'myApp',
  () => document.getElementById('app1'),
  { 
    extraGlobals: { customGlobal: 'value' },
    styleIsolation: true,
  }
);

// Mount
await sandboxContainer.mount(container);

// 沙箱内代码可以安全访问 window, self, top 等
// 不会影响主应用

// Unmount
await sandboxContainer.unmount();
// 沙箱自动失活，恢复全局状态
```

---

## 📁 相关文件

| 文件 | 说明 |
|------|------|
| `StandardSandbox.ts` | 沙箱主实现 |
| `Membrane.ts` | 膜模式实现 |
| `Compartment.ts` | 隔离舱基类 |
| `globals.ts` | ES2015 全局变量列表 |
| `index.ts` | `createSandboxContainer` 工厂函数 |

---

## 🎯 最佳实践

### 1. 调试沙箱

```typescript
const sandbox = new StandardSandbox('debug-app', {});

// 观察沙箱激活/失活
console.log('Activating...');
sandbox.active();

// 执行代码
sandbox.evaluate(`
  window.test = 'sandbox value';
`);

console.log('Deactivating...');
sandbox.inactive();
// 输出：[qiankun:sandbox] debug-app modified global properties restore...
```

### 2. 检查沙箱状态

```typescript
// 检查沙箱类型
console.log(sandbox.type); // SandboxType.Standard

// 检查修改追踪
console.log(sandbox.membrane.modifications.keys());
```

---

## ➡️ 下一步

- [样式隔离](/core/style-isolation) - 探索 CSS 隔离
- [DOM 沙箱](/core/dom-sandbox) - 学习 DOM 隔离
- [沙箱总览](/core/sandbox-overview) - 架构图解