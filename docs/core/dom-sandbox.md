# DOM 沙箱

> 动态 DOM 管理与副作用隔离

**源码位置**: `packages/sandbox/src/patchers/dynamicAppend/`

---

## 📖 概述

DOM 沙箱负责管理微应用的动态 DOM 操作，主要包括：

1. **动态脚本/样式加载** - `document.createElement` 补丁
2. **容器管理** - `createSandboxContainer` 工厂
3. **副作用清理** - 事件监听器、定时器清理
4. **History 同步** - 路由状态管理

---

## 🔧 动态 DOM 补丁

### patchDocument

**源码位置**: `packages/sandbox/src/patchers/dynamicAppend/forStdSandbox.ts`

```typescript
import { checkURLL, rebaseOrRecordBase } from './common';
import type { Sandbox } from '../../core/sandbox';

export function patchDocument(
  appName: string,
  getContainer: () => HTMLElement | null,
): Free {
  const rawCreateElement = document.createElement;
  const rawHeadAppendChild = HTMLHeadElement.prototype.appendChild;
  const rawBodyAppendChild = HTMLBodyElement.prototype.appendChild;
  
  // 补丁 createElement
  document.createElement = function<T extends HTMLElement>(
    tagName: string,
    options?: ElementCreationOptions
  ): T {
    const element = rawCreateElement.call(document, tagName, options);
    
    // 标记为 qiankun 元素
    element.setAttribute('data-qiankun', appName);
    
    return element;
  };
  
  // 补丁 head.appendChild
  HTMLHeadElement.prototype.appendChild = function<T extends Node>(node: T): T {
    const container = getContainer();
    
    // 如果是 link/script/style 元素，重定向到容器
    if (
      isLinkOrScriptOrStyle(node) && 
      container && 
      !isHijackingTag(node, container)
    ) {
      rawHeadAppendChild.call(container, node);
      return node;
    }
    
    return rawHeadAppendChild.call(this, node);
  };
  
  // 返回清理函数
  return function free() {
    document.createElement = rawCreateElement;
    HTMLHeadElement.prototype.appendChild = rawHeadAppendChild;
    HTMLBodyElement.prototype.appendChild = rawBodyAppendChild;
  };
}
```

### 关键功能

| 功能 | 说明 |
|------|------|
| **元素标记** | 添加 `data-qiankun` 属性标识归属 |
| **重定向到容器** | 动态 link/script/style 追加到应用容器 |
| **Base URL 处理** | 记录或重写 `<base>` 标签 |

---

## 🗂️ 容器管理

### createSandboxContainer

**源码位置**: `packages/sandbox/src/core/sandbox/index.ts`

```typescript
export function createSandboxContainer(
  appName: string,
  getContainer: () => HTMLElement,
  opts: {
    globalContext?: WindowProxy;
    extraGlobals?: Endowments;
    fetch?: typeof window.fetch;
    nodeTransformer?: (node: HTMLElement) => HTMLElement;
    styleIsolation?: boolean;
  },
) {
  const { globalContext, extraGlobals = {}, ...sandboxCfg } = opts;
  
  // 创建沙箱实例
  let sandbox: Sandbox;
  if (window.Proxy) {
    sandbox = new StandardSandbox(appName, extraGlobals, globalContext);
  }

  // bootstrapping 阶段的副作用补丁
  const bootstrappingFrees = patchAtBootstrapping(
    appName,
    getContainer,
    { sandbox, ...sandboxCfg }
  );
  
  let mountingFrees: Free[] = [];
  let sideEffectsRebuilds: Rebuild[] = [];

  return {
    instance: sandbox,

    /**
     * Mount - 应用挂载
     */
    async mount(container: HTMLElement) {
      // 1. 激活沙箱
      sandbox.active();

      const sideEffectsRebuildsAtBootstrapping = sideEffectsRebuilds.slice(
        0,
        bootstrappingFrees.length
      );
      const sideEffectsRebuildsAtMounting = sideEffectsRebuilds.slice(
        bootstrappingFrees.length
      );

      // 重建 bootstrapping 阶段的副作用
      if (sideEffectsRebuildsAtBootstrapping.length) {
        for (const rebuildSideEffects of sideEffectsRebuildsAtBootstrapping) {
          await rebuildSideEffects(container);
        }
      }

      // 2. 应用 mounting 阶段补丁
      mountingFrees = patchAtMounting(
        appName,
        getContainer,
        { sandbox, ...sandboxCfg }
      );

      // 3. 重置初始化副作用
      if (sideEffectsRebuildsAtMounting.length) {
        for (const rebuildSideEffects of sideEffectsRebuildsAtMounting) {
          await rebuildSideEffects(container);
        }
      }

      sideEffectsRebuilds = [];
    },

    /**
     * Unmount - 应用卸载
     */
    async unmount() {
      // 记录副作用重建函数
      sideEffectsRebuilds = [
        ...bootstrappingFrees,
        ...mountingFrees,
      ].map((free) => free());

      // 失活沙箱
      sandbox.inactive();
    },
  };
}
```

### Mount/Unmount 流程

```
┌─────────────────────────────────────────────────┐
│                    Mount                        │
│  1. sandbox.active() 激活沙箱                   │
│  2. 重建 bootstrapping 副作用                   │
│  3. 应用 mounting 补丁                          │
│  4. 重置 mounting 副作用                        │
└─────────────────────────────────────────────────┘
                         ↓
                  应用运行中...
                         ↓
┌─────────────────────────────────────────────────┐
│                   Unmount                       │
│  1. 记录副作用重建函数                          │
│  2. sandbox.inactive() 失活沙箱                 │
└─────────────────────────────────────────────────┘
```

---

## 🔌 补丁类型

### patchAtBootstrapping

**源码位置**: `packages/sandbox/src/patchers/index.ts`

```typescript
export function patchAtBootstrapping(
  appName: string,
  getContainer: () => HTMLElement,
  cfg: SandboxConfig,
): Free[] {
  const { sandbox, fetch, nodeTransformer, styleIsolation } = cfg;

  const bootstrappingFrees = [];

  // 1. 动态文档补丁
  bootstrappingFrees.push(
    patchDocument(appName, getContainer)
  );

  // 2. History 补丁
  bootstrappingFrees.push(
    patchHistoryListener(appName)
  );

  // 3. 窗口监听器补丁 (resize/scroll 等)
  bootstrappingFrees.push(
    patchWindowListener(appName)
  );

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
  const { sandbox, fetch, nodeTransformer, styleIsolation } = cfg;

  const mountingFrees = [];

  // 1. 间隔器补丁 (setInterval/setTimeout)
  mountingFrees.push(
    patchInterval(sandbox)
  );

  // 2. 使用方自定义补丁
  // ...

  return mountingFrees;
}
```

---

## 📁 补丁文件结构

```
packages/sandbox/src/patchers/
├── dynamicAppend/          # 动态 DOM 管理
│   ├── forStdSandbox.ts    # 标准沙箱补丁
│   ├── common.ts           # 公共工具
│   ├── types.ts            # 类型定义
│   └── index.ts
├── historyListener.ts      # History 补丁
├── windowListener.ts       # 窗口监听器补丁
├── interval.ts             # 定时器补丁
├── index.ts                # 补丁入口
├── types.ts                # 补丁类型
└── consts.ts               # 常量
```

---

## 🕰️ History 补丁

**源码位置**: `packages/sandbox/src/patchers/historyListener.ts`

```typescript
import type { Rebuild } from './types';

export function patchHistoryListener(
  appName: string,
): Rebuild {
  const rawPushState = history.pushState;
  const rawReplaceState = history.replaceState;

  let currentPath = location.pathname;

  history.pushState = function(...args) {
    const result = rawPushState.apply(this, args);
    currentPath = location.pathname;
    // qiankun 3.x 不再限制 History 操作
    return result;
  };

  history.replaceState = function(...args) {
    const result = rawReplaceState.apply(this, args);
    currentPath = location.pathname;
    return result;
  };

  // 返回重建函数
  return () => {
    history.pushState = rawPushState;
    history.replaceState = rawReplaceState;
  };
}
```

---

## ⏱️ 定时器补丁

**源码位置**: `packages/sandbox/src/patchers/interval.ts`

```typescript
import type { Free } from './types';
import type { Sandbox } from '../core/sandbox';

export function patchInterval(sandbox: Sandbox): Free {
  const rawSetInterval = window.setInterval;
  const rawClearInterval = window.clearInterval;
  const rawSetTimeout = window.setTimeout;
  const rawClearTimeout = window.clearTimeout;

  // 记录定时器 ID
  const intervalIDs = new Set<number>();
  const timeoutIDs = new Set<number>();

  window.setInterval = function(...args) {
    const id = rawSetInterval.apply(this, args);
    intervalIDs.add(id);
    return id;
  };

  window.clearInterval = function(id) {
    intervalIDs.delete(id);
    return rawClearInterval(id);
  };

  window.setTimeout = function(...args) {
    const id = rawSetTimeout.apply(this, args);
    timeoutIDs.add(id);
    return id;
  };

  window.clearTimeout = function(id) {
    timeoutIDs.delete(id);
    return rawClearTimeout(id);
  };

  return () => {
    // 恢复原生方法
    window.setInterval = rawSetInterval;
    window.clearInterval = rawClearInterval;
    window.setTimeout = rawSetTimeout;
    window.clearTimeout = rawClearTimeout;

    // 清理定时器
    intervalIDs.forEach(id => rawClearInterval(id));
    timeoutIDs.forEach(id => rawClearTimeout(id));
  };
}
```

---

## 🧹 副作用清理

### Rebuild 机制

```typescript
// packages/sandbox/src/patchers/types.ts
export type Free = () => void;
export type Rebuild = () => Free; // 返回清理函数
```

### 清理时机

```typescript
async function unmount() {
  // 1. 生成重建函数
  sideEffectsRebuilds = [
    ...bootstrappingFrees,  // bootstrapping 阶段补丁
    ...mountingFrees,        // mounting 阶段补丁
  ].map((free) => free());   // 执行清理，获取重建函数

  // 2. 失活沙箱
  sandbox.inactive();
}

async function mount() {
  // ...
  
  // 3. 重建副作用
  if (sideEffectsRebuilds.length) {
    for (const rebuildSideEffects of sideEffectsRebuilds) {
      await rebuildSideEffects(container); // 执行重建
    }
  }
}
```

---

## 🎯 最佳实践

### 1. 使用 container 而非 document

```typescript
// ❌ 不推荐
document.body.appendChild(this.element);

// ✅ 推荐
this.props.container.appendChild(this.element);
```

### 2. 及时清理定时器

```typescript
export async function unmount() {
  if (this.timer) {
    clearInterval(this.timer);
    this.timer = null;
  }
}
```

### 3. 清理事件监听

```typescript
export async function unmount() {
  if (this.offGlobalStateChange) {
    this.offGlobalStateChange();
    this.offGlobalStateChange = null;
  }
}
```

---

## ➡️ 下一步

- [JS 执行器](/core/js-executor) - 学习脚本执行
- [生命周期管理](/core/lifecycle-management) - 了解应用生命周期
- [沙箱总览](/core/sandbox-overview) - 架构图解