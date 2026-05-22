# 沙箱机制概览

## 为什么需要沙箱？

在微前端场景下，多个微应用共享同一个浏览器环境，会带来以下问题：

### 1. 全局变量冲突

```javascript
// 应用 A
window.isLogin = true;

// 应用 B
window.isLogin = false; // 覆盖了 A 的值

// 应用 C 读取
console.log(window.isLogin); // false，被污染了
```

### 2. 定时器泄漏

```javascript
// 应用 A
setInterval(() => {
  fetchData();
}, 1000);

// 卸载后定时器仍在运行！
```

### 3. 事件监听器冲突

```javascript
// 多个应用添加同一个事件
window.addEventListener('resize', handleResizeA);
window.addEventListener('resize', handleResizeB);
// 无法区分属于哪个应用
```

### 4. 样式污染

```css
/* 应用 A */
.button { color: red; }

/* 应用 B */
.button { color: blue; }
/* 后加载的会覆盖先加载的 */
```

## 沙箱的本质

沙箱的本质是：**为每个微应用创建一个独立的运行时环境**，使其感觉像是独占 window 对象。

```
┌─────────────────────────────────────┐
│            沙箱环境                 │
│  ┌─────────────────────────────┐   │
│  │      Micro App 1            │   │
│  │  ┌───────────────────────┐  │   │
│  │  │  sandbox.proxy        │  │   │
│  │  │  ├── window.a = 1     │  │   │
│  │  │  └── window.b = 2     │  │   │
│  │  └───────────────────────┘  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Micro App 2            │   │
│  │  ┌───────────────────────┐  │   │
│  │  │  sandbox.proxy        │  │   │
│  │  ├── window.a = 10       │  │   │
│  │  └── window.c = 20       │  │   │
│  │  └───────────────────────┘  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 沙箱类型

qiankun 提供了多种沙箱实现：

### 1. SnapshotSandbox

**实现原理:** 记录和恢复 window 状态快照

**适用场景:** 单例应用（同时只有一个应用活跃）

### 2. ProxySandbox

**实现原理:** 使用 ES6 Proxy 创建代理

**适用场景:** 多实例应用（可以同时运行多个）

### 3. LegacyProxySandbox

**实现原理:** 早期版本的代理沙箱

**适用场景:** 需要兼容旧环境

### 4. StandardAppSandbox

**实现原理:** 基于 ES Modules 标准

**适用场景:** 现代浏览器环境

## 沙箱 API

### 基本接口

```typescript
interface SandboxInstance {
  /** 激活沙箱 */
  active(): void;
  
  /** 停用沙箱 */
  inactive(): void;
  
  /** 创建代理对象 */
  createSandboxProxy(globalContext: Window): WindowProxy;
}
```

### 生命周期

```
创建沙箱 → 激活 → 执行代码 → 停用 → 恢复
        ↑                                    ↓
        └────────── 重新激活 ───────────────┘
```

## 源码结构

### 沙箱目录

```
packages/sandbox/src/core/sandbox/
├── SnapshotSandbox.ts      # 快照沙箱
├── ProxySandbox.ts         # 代理沙箱
├── LegacyProxySandbox.ts   # 旧代理沙箱
└── StandardAppSandbox.js   # 标准沙箱
```

### 核心文件

```typescript
// packages/sandbox/src/core/sandbox/ProxySandbox.ts
export class ProxySandbox {
  private active = false;
  private proxy: WindowProxy;
  private globalContext: Window;
  
  constructor(name: string, globalContext = window) {
    this.globalContext = globalContext;
    this.proxy = this.createSandboxProxy(globalContext);
  }
  
  active() {
    this.active = true;
  }
  
  inactive() {
    this.active = false;
    // 清理代理
  }
}
```

## 沙箱选择策略

```typescript
function createSandbox(name, useLoose = false) {
  // 宽松模式：强制使用快照
  if (useLoose) {
    return new SnapshotSandbox(name);
  }
  
  // 优先使用代理沙箱
  if (window.Proxy) {
    return new ProxySandbox(name);
  }
  
  // 降级到快照
  return new SnapshotSandbox(name);
}
```

## 性能对比

| 沙箱类型 | 激活时间 | 内存占用 | 兼容性 |
|---------|---------|---------|--------|
| SnapshotSandbox | ~50ms | 中 | 全部 |
| ProxySandbox | ~5ms | 低 | 现代浏览器 |
| LegacyProxySandbox | ~20ms | 中 | 大部分 |

## 最佳实践

### 1. 选择合适的沙箱

- 单例应用 → SnapshotSandbox
- 多实例应用 → ProxySandbox
- 兼容性要求高 → SnapshotSandbox

### 2. 最小化全局变量

```javascript
// ❌ 不好的做法
window.utils = {
  formatDate: () => {},
  formatMoney: () => {},
};

// ✅ 好的做法
import { formatDate, formatMoney } from 'utils';
```

### 3. 及时清理副作用

```javascript
export async function unmount() {
  // 清除定时器
  if (this.timer) {
    clearInterval(this.timer);
  }
  
  // 移除事件监听
  window.removeEventListener('resize', this.handleResize);
}
```

## 下一步

- [JS 沙箱](/core/js-sandbox) - 深入 JS 隔离
- [样式隔离](/core/style-isolation) - 学习 CSS 隔离