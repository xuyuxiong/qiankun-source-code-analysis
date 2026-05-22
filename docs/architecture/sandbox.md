# 沙箱机制

## 为什么需要沙箱？

在微前端场景下，多个微应用共享同一个浏览器的全局环境（window 对象），这会导致以下问题：

1. **全局变量污染**: 微应用 A 修改了 `window.a = 1`，微应用 B 读取到的就是修改后的值
2. **全局事件冲突**: 多个应用都监听 `window.onload`，互相覆盖
3. **样式全局性**: 子应用的样式会污染主应用

沙箱的目标是：**让每个微应用都感觉自己独占 window 对象**。

## 沙箱类型

### 1. SnapshotSandbox (快照沙箱)

**实现位置:** `packages/sandbox/src/core/sandbox/SnapshotSandbox.ts`

**原理:**
```typescript
class SnapshotSandbox {
  private snapshot = {};  // 快照
  private modifyLevel = 0; // 修改层级

  constructor() {
    this.snapshot = { ...window };
  }

  active() {
    // 激活时记录当前快照
    this.modifyLevel++;
  }

  inactive() {
    // 卸载时对比差异并恢复
    for (const key in window) {
      if (this.snapshot[key] !== window[key]) {
        // 恢复原始值
        window[key] = this.snapshot[key];
      }
    }
  }
}
```

**特点:**
- ✅ 实现简单
- ✅ 兼容性好
- ❌ 性能开销大（需要遍历所有 window 属性）
- ❌ 只支持单例

### 2. ProxySandbox (代理沙箱)

**实现位置:** `packages/sandbox/src/core/sandbox/ProxySandbox.ts`

**原理:**
```typescript
class ProxySandbox {
  private proxy: WindowProxy;
  private rawWindow: Window;
  
  constructor(windowName: string) {
    const rawWindow = {};
    this.rawWindow = rawWindow;
    
    this.proxy = new Proxy(rawWindow, {
      set: (target, key, value) => {
        // 拦截赋值操作
        target[key] = value;
        return true;
      },
      get: (target, key) => {
        // 拦截读取操作
        if (key === 'window') return this.proxy;
        if (key in target) return target[key];
        return window[key]; // 回退到真实 window
      }
    });
  }
}
```

**特点:**
- ✅ 性能好（O(1) 时间复杂度）
- ✅ 支持多实例
- ✅ 隔离性好
- ❌ 需要浏览器支持 Proxy (IE 不支持)

### 3. StandardAppSandbox (标准应用沙箱)

**新一代沙箱实现**

**特点:**
- 基于 ES Modules 标准
- 使用 `Compartments` API
- 更彻底的隔离

## 样式隔离

### CSS 补丁

**实现位置:** `packages/sandbox/src/patchers/css.ts`

```typescript
function patchCSS(sandbox: SandboxInstance) {
  const rawCSSStyleSheetInsertRule = StyleSheet.prototype.insertRule;
  
  StyleSheet.prototype.insertRule = function(cssText, index) {
    // 添加作用域前缀
    const scopedCssText = addScopedPrefix(cssText, sandbox.name);
    return rawCSSStyleSheetInsertRule.call(this, scopedCssText, index);
  };
}
```

### Scoped CSS

**原理:**
```css
/* 原始 CSS */
.button { color: red; }

/* 添加作用域前缀后 */
[data-qiankun="react-app"] .button { color: red; }
```

### Shadow DOM

```javascript
start({
  sandbox: {
    strictStyleIsolation: true, // 开启严格样式隔离（使用 Shadow DOM）
  },
});
```

## 动态 DOM 补丁

```typescript
// packages/sandbox/src/patchers/dynamicAppend/
// 拦截动态添加的 JS/CSS

function patchDocument(sandbox) {
  const rawCreateElement = Document.prototype.createElement;
  
  Document.prototype.createElement = function(tagName) {
    const element = rawCreateElement.call(this, tagName);
    
    if (tagName === 'script' || tagName === 'style') {
      // 标记为沙箱元素
      element.setAttribute('data-qiankun', sandbox.name);
    }
    
    return element;
  };
}
```

## 通信机制

### 1. Props 传递

```typescript
// 主应用
loadMicroApp({
  name: 'app1',
  entry: '//localhost:3000',
  props: {
    token: 'xxx',
    user: { name: '张三' },
  },
});

// 子应用
export async function mount(props) {
  console.log(props.token); // xxx
}
```

### 2. GlobalState

```typescript
import { initGlobalState } from 'qiankun';

// 主应用
const actions = initGlobalState({
  user: { name: '张三' },
});

actions.setGlobalState({
  user: { name: '李四' },
});

// 子应用
actions.onGlobalStateChange((newState) => {
  console.log(newState);
});
```

## 沙箱选择策略

```typescript
function createSandbox(appName: string, useLoose?: boolean) {
  if (useLoose) {
    // 宽松模式：快照沙箱
    return new SnapshotSandbox(appName);
  }
  
  if (window.Proxy) {
    // 现代浏览器：代理沙箱
    return new ProxySandbox(appName);
  }
  
  // 降级方案
  return new SnapshotSandbox(appName);
}
```

## 沙箱性能对比

| 指标 | SnapshotSandbox | ProxySandbox | StandardAppSandbox |
|-----|----------------|--------------|-------------------|
| 激活时间 | ~50ms | ~5ms | ~10ms |
| 内存占用 | 中 | 低 | 中 |
| 兼容性 | 所有浏览器 | 现代浏览器 | 最新浏览器 |

## 下一步

- [通信系统](/architecture/communication) - 学习应用间通信
- [应用加载](/core/app-loading) - 深入核心流程