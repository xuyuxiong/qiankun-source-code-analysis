# JS 沙箱实现

## ProxySandbox 实现原理

### 核心代码

**源码位置:** `packages/sandbox/src/core/sandbox/ProxySandbox.ts`

```typescript
export class ProxySandbox {
  private sandboxRunning: boolean;
  private latestSetProp: PropertyKey | null = null;
  private proxy: WindowProxy;
  private globalContext: Window;
  private name: string;
  
  constructor(name: string, globalContext = window) {
    this.name = name;
    this.globalContext = globalContext;
    this.proxy = this.createSandboxProxy(globalContext);
  }
  
  active() {
    this.sandboxRunning = true;
  }
  
  inactive() {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[qiankun:sandbox] ${this.name} modified global values restored`);
    }
    this.sandboxRunning = false;
  }
  
  private createSandboxProxy(globalContext: Window) {
    const sandbox = this;
    const fakeWindow = {};
    
    return new Proxy(fakeWindow, {
      set: (target: typeof fakeWindow, p: PropertyKey, value: any): boolean => {
        if (sandbox.sandboxRunning) {
          // 在沙箱中设置属性
          fastTarget[target] = value;
          sandbox.latestSetProp = p;
        }
        return true;
      },
      
      get: (target: typeof fakeWindow, p: PropertyKey): any => {
        // 特殊的 window 处理
        if (p === 'window') return sandbox.proxy;
        if (p === 'globalThis') return sandbox.proxy;
        if (p === 'top' || p === 'parent') return window;
        
        // 优先从沙箱中获取
        if (fastTarget[target]?.[p]) {
          return fastTarget[target][p];
        }
        
        // 回退到真实 window
        return globalContext[p];
      },
      
      has: (target: typeof fakeWindow, p: PropertyKey): boolean => {
        return p in fastTarget[target] || p in globalContext;
      },
    });
  }
}
```

### Proxy 拦截器详解

#### Set 拦截器

```typescript
set: (target, p, value) => {
  // 1. 检查沙箱是否激活
  if (!sandbox.sandboxRunning) {
    return true;
  }
  
  // 2. 在沙箱对象中设置属性
  target[p] = value;
  
  // 3. 记录最后设置的属性（用于快照对比）
  sandbox.latestSetProp = p;
  
  return true;
}
```

#### Get 拦截器

```typescript
get: (target, p) => {
  // 特殊属性处理
  if (p === 'window' || p === 'globalThis') {
    return sandbox.proxy; // 返回代理自身
  }
  
  if (p === 'top' || p === 'parent') {
    return window; // top 和 parent 始终指向真实 window
  }
  
  // 优先从沙箱中获取
  if (p in target) {
    return target[p];
  }
  
  // 回退到真实 window
  return window[p];
}
```

## 多实例支持

### 实例隔离

```typescript
// 创建多个沙箱实例
const sandbox1 = new ProxySandbox('app1');
const sandbox2 = new ProxySandbox('app2');

// 在沙箱 1 中设置
sandbox1.proxy.user = { name: '张三' };

// 在沙箱 2 中设置
sandbox2.proxy.user = { name: '李四' };

// 互不影响
console.log(sandbox1.proxy.user); // 张三
console.log(sandbox2.proxy.user); // 李四
```

### 内存管理

```typescript
interface SandboxMemory {
  proxy: WindowProxy;
  runningTargets: WeakMap<WindowProxy, Record<string, any>>;
}
```

## SnapshotSandbox 实现

### 核心代码

**源码位置:** `packages/sandbox/src/core/sandbox/SnapshotSandbox.ts`

```typescript
export class SnapshotSandbox {
  private sandboxRunning = false;
  private rawWindowContext: Window;
  private windowSnapshot: Record<PropertyKey, any>;
  private modifyPropsMap: Record<PropertyKey, any>;
  
  constructor() {
    this.rawWindowContext = window;
    this.windowSnapshot = {};
    this.modifyPropsMap = {};
  }
  
  active() {
    // 记录当前 window 快照
    this.windowSnapshot = {};
    for (const prop in window) {
      if (window.hasOwnProperty(prop)) {
        this.windowSnapshot[prop] = window[prop];
      }
    }
    this.sandboxRunning = true;
  }
  
  inactive() {
    // 对比快照，找出被修改的属性
    this.modifyPropsMap = {};
    for (const prop in window) {
      if (window.hasOwnProperty(prop)) {
        if (window[prop] !== this.windowSnapshot[prop]) {
          this.modifyPropsMap[prop] = window[prop];
          // 恢复到原始值
          window[prop] = this.windowSnapshot[prop];
        }
      }
    }
    this.sandboxRunning = false;
  }
  
  patch(temporaryPatch = false) {
    if (temporaryPatch) {
      // 临时恢复修改
      Object.assign(window, this.modifyPropsMap);
    }
  }
}
```

## 沙箱对比

### SnapshotSandbox vs ProxySandbox

| 对比项 | SnapshotSandbox | ProxySandbox |
|-------|----------------|--------------|
| 实现方式 | 快照对比 | Proxy 拦截 |
| 激活开销 | O(n) | O(1) |
| 内存占用 | 高 | 低 |
| 多实例 | 不支持 | 支持 |
| 兼容性 | 所有浏览器 | 现代浏览器 |

### 性能实测

```javascript
// 快照沙箱激活
const start1 = performance.now();
snapshotSandbox.active();
const end1 = performance.now();
console.log(`Snapshot active: ${end1 - start1}ms`); // ~50ms

// 代理沙箱激活
const start2 = performance.now();
proxySandbox.active();
const end2 = performance.now();
console.log(`Proxy active: ${end2 - start2}ms`); // ~5ms
```

## 特殊属性处理

### window / globalThis

```typescript
// 必须返回代理自身
get: (target, p) => {
  if (p === 'window' || p === 'globalThis') {
    return sandbox.proxy;
  }
}
```

### top / parent

```typescript
// 始终指向真实 window，防止 iframe 逃逸
get: (target, p) => {
  if (p === 'top' || p === 'parent') {
    return window;
  }
}
```

### eval

```typescript
// 沙箱中的 eval 需要在代理上下文中执行
const rawEval = eval;
const scopedEval = (code) => {
  return rawEval.call(sandbox.proxy, code);
};
```

## 边界情况处理

### Symbol 属性

```typescript
const sym = Symbol('test');
sandbox.proxy[sym] = 'value';
console.log(sandbox.proxy[sym]); // 'value'
```

### 不可枚举属性

```typescript
Object.defineProperty(sandbox.proxy, 'hidden', {
  value: 'secret',
  enumerable: false,
  writable: true,
});
```

### Proxy 陷阱

```typescript
// Object.keys 只会返回沙箱中定义的属性
Object.keys(sandbox.proxy);

// for...in 会遍历原型链
for (const key in sandbox.proxy) {}
```

## 调试技巧

### 观察沙箱操作

```typescript
const sandbox = new ProxySandbox('debug-app');
const proxy = sandbox.proxy;

// 添加日志
new Proxy(proxy, {
  get(target, p) {
    console.log('[GET]', p);
    return target[p];
  },
  set(target, p, value) {
    console.log('[SET]', p, '=', value);
    target[p] = value;
    return true;
  },
});
```

### 检查变量隔离

```typescript
// 主窗口
window.test = 'main';

// 沙箱 1
sandbox1.proxy.test = 'app1';
console.log(sandbox1.proxy.test); // app1
console.log(window.test); // main

// 沙箱 2
sandbox2.proxy.test = 'app2';
console.log(sandbox2.proxy.test); // app2
```

## 下一步

- [样式隔离](/core/style-isolation) - 探索 CSS 隔离
- [DOM 沙箱](/core/dom-sandbox) - 学习 DOM 隔离