# DOM 沙箱

## 概述

DOM 沙箱负责隔离微应用的 DOM 操作，确保子应用只能在自己的容器内修改 DOM。

## DOM 操作拦截

### createElement 补丁

**源码位置:** `packages/sandbox/src/patchers/dynamicAppend/forStandardSandbox.ts`

```typescript
function patchHTMLElement(
  sandbox: StandardAppSandbox,
  container: HTMLElement,
  appName: string,
): AppInstance {
  const rawCreateElement = document.createElement;
  document.createElement = function(
    tagName: string,
    options?: ElementCreationOptions,
  ): HTMLElement {
    const element = rawCreateElement.call(document, tagName, options);
    
    // 标记为沙箱元素
    element.setAttribute('data-qiankun', appName);
    
    return element;
  };
  
  return () => {
    document.createElement = rawCreateElement;
  };
}
```

### appendChild 补丁

```typescript
function patchAppendChild(
  container: HTMLElement,
  appName: string,
): () => void {
  const rawAppendChild = Node.prototype.appendChild;
  
  Node.prototype.appendChild = function<T extends Node>(
    child: T,
  ): T {
    // 检查元素是否属于当前应用
    if (child.getAttribute('data-qiankun') !== appName) {
      console.warn('[qiankun] DOM operation restricted');
      return child;
    }
    
    return rawAppendChild.call(this, child) as T;
  };
  
  return () => {
    Node.prototype.appendChild = rawAppendChild;
  };
}
```

### removeChild 补丁

```typescript
function patchRemoveChild(<Node> parent, appInstance: AppInstance): () => void {
  const rawRemoveChild = Node.prototype.removeChild;
  
  Node.prototype.removeChild = function<T extends Node>(child: T): T {
    if (child.getAttribute('data-qiankun') !== appInstance.name) {
      console.warn('[qiankun] Cannot remove element from other apps');
      return child;
    }
    
    return rawRemoveChild.call(this, child) as T;
  };
  
  return () => {
    Node.prototype.removeChild = rawRemoveChild;
  };
}
```

## 动态 DOM 管理

### 动态脚本加载

```typescript
function patchDynamicScript(
  sandbox: SandboxInstance,
  appName: string,
): () => void {
  const rawCreateElement = document.createElement;
  
  document.createElement = function(tagName) {
    const element = rawCreateElement.call(document, tagName);
    
    if (tagName.toUpperCase() === 'SCRIPT') {
      // 标记为沙箱脚本
      element.setAttribute('data-qiankun-script', appName);
    }
    
    return element;
  };
  
  return () => {
    document.createElement = rawCreateElement;
  };
}
```

### 动态样式加载

```typescript
function patchDynamicStyle(
  container: HTMLElement,
  appName: string,
): () => void {
  const rawQuerySelector = Document.prototype.querySelector;
  
  Document.prototype.querySelector = function(selectors) {
    const element = rawQuerySelector.call(this, selectors);
    
    if (element?.tagName === 'LINK' || element?.tagName === 'STYLE') {
      // 检查样式是否属于当前应用
      if (element.getAttribute('data-qiankun') !== appName) {
        return null;
      }
    }
    
    return element;
  };
  
  return () => {
    Document.prototype.querySelector = rawQuerySelector;
  };
}
```

## 容器管理

### 容器元素创建

```typescript
function createContainerElement(
  appName: string,
): HTMLElement {
  const container = document.createElement('div');
  container.className = `qiankun-container-${appName}`;
  container.setAttribute('data-qiankun-app', appName);
  
  // 创建内部 head 和 body
  const head = document.createElement('head');
  const body = document.createElement('body');
  
  container.appendChild(head);
  container.appendChild(body);
  
  return container;
}
```

### 容器清理

```typescript
function cleanupContainer(container: HTMLElement, appName: string): void {
  // 移除所有属于该应用的元素
  const appElements = container.querySelectorAll(
    `[data-qiankun-app="${appName}"]`
  );
  
  appElements.forEach(element => {
    element.remove();
  });
  
  // 清理样式
  const styles = container.querySelectorAll('style');
  styles.forEach(style => {
    if (style.textContent.includes(`[data-qiankun="${appName}"]`)) {
      style.remove();
    }
  });
}
```

## 元素标记

### 属性标记

```typescript
function markElement(element: Element, appName: string): void {
  element.setAttribute('data-qiankun', appName);
  element.setAttribute('data-timestamp', Date.now().toString());
}
```

### Symbol 标记

```typescript
const elementAppSymbol = Symbol('qiankun-app');

function setElementApp(element: Element, appName: string): void {
  Object.defineProperty(element, elementAppSymbol, {
    value: appName,
    writable: true,
    enumerable: false,
    configurable: true,
  });
}

function getElementApp(element: Element): string | null {
  return element[elementAppSymbol] || null;
}
```

## 事件处理

### 事件代理

```typescript
function setupEventDelegation(
  container: HTMLElement,
  appName: string,
): () => void {
  const eventHandler = (event: Event) => {
    const target = event.target as Element;
    const targetApp = target.closest('[data-qiankun-app]');
    
    if (targetApp?.getAttribute('data-qiankun-app') !== appName) {
      // 阻止事件冒泡到其他应用
      event.stopPropagation();
    }
  };
  
  container.addEventListener('click', eventHandler, true);
  container.addEventListener('change', eventHandler, true);
  
  return () => {
    container.removeEventListener('click', eventHandler, true);
    container.removeEventListener('change', eventHandler, true);
  };
}
```

## 历史状态管理

### History 补丁

**源码位置:** `packages/sandbox/src/patchers/historyListener.ts`

```typescript
export function patchHistoryListener(
  sandbox: Sandbox,
  appName: string,
): Rebox {
  const rawPushState = history.pushState;
  const rawReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    const result = rawPushState.apply(this, args);
    
    // 检查是否是当前应用的操作
    if (getCurrentApp() === appName) {
      // 允许修改
    } else {
      console.warn('[qiankun] History manipulation restricted');
    }
    
    return result;
  };
  
  return () => {
    history.pushState = rawPushState;
    history.replaceState = rawReplaceState;
  };
}
```

## 卸载清理

### DOM 清理

```typescript
function cleanupDOM(appName: string): void {
  // 移除应用相关的所有 DOM 元素
  const appElements = document.querySelectorAll(
    `[data-qiankun="${appName}"]`
  );
  
  appElements.forEach(element => {
    element.remove();
  });
  
  // 恢复被修改的原型方法
  restorePrototypeMethods();
}
```

### 事件清理

```typescript
function cleanupEvents(appName: string): void {
  // 移除事件监听器
  const markedElements = document.querySelectorAll(
    `[data-qiankun-event="${appName}"]`
  );
  
  markedElements.forEach(element => {
    // 获取存储的事件信息
    const events = element._qiankunEvents || [];
    events.forEach(({ type, handler }) => {
      element.removeEventListener(type, handler);
    });
  });
}
```

### 定时器清理

```typescript
export function patchInterval(sandbox: SandboxInstance): () => void {
  const rawSetInterval = window.setInterval;
  const rawClearInterval = window.clearInterval;
  
  const timerMap = new Map<number, { appName: string; callback: Function }>();
  
  window.setInterval = function(
    callback: Function,
    delay?: number,
    ...args: any[]
  ): number {
    const id = rawSetInterval.call(
      window,
      wrapperCallback(callback, sandbox.name),
      delay,
      ...args
    );
    timerMap.set(id, { appName: sandbox.name, callback });
    return id;
  };
  
  return () => {
    window.setInterval = rawSetInterval;
    window.clearInterval = rawClearInterval;
    
    // 清理定时器
    timerMap.forEach(({ appName }, id) => {
      if (appName === sandbox.name) {
        window.clearInterval(id);
      }
    });
  };
}
```

## 实际应用

### 完整 DOM 隔离流程

```typescript
function isolationDOMFlow(appName: string, container: HTMLElement) {
  // 1. 创建容器标记
  container.setAttribute('data-qiankun-app', appName);
  
  // 2. 应用 DOM 补丁
  const unpatchFunctions = [
    patchDocument(container, appName),
    patchHTMLElement(container, appName),
    patchNode(container, appName),
  ];
  
  // 3. 设置事件代理
  const unbindDelegation = setupEventDelegation(container, appName);
  
  // 4. 返回清理函数
  return () => {
    unpatchFunctions.forEach(unpatch => unpatch());
    unbindDelegation();
    cleanupContainer(container, appName);
  };
}
```

## 最佳实践

### 1. 及时清理 DOM

```typescript
export async function unmount() {
  // 清理定时器
  if (this.timer) {
    clearInterval(this.timer);
  }
  
  // 清理事件监听
  this.offGlobalStateChange?.();
  
  // 清理 DOM 引用
  this.container = null;
}
```

### 2. 避免直接操作 document

```typescript
// ❌ 不好的做法
document.body.appendChild(this.element);

// ✅ 好的做法
this.props.container.appendChild(this.element);
```

### 3. 使用事件委托

```typescript
// ❌ 给每个元素添加事件
buttons.forEach(btn => btn.addEventListener('click', handler));

// ✅ 事件委托
container.addEventListener('click', e => {
  if (e.target.matches('.btn')) {
    handler(e);
  }
});
```

## 下一步

- [JS 执行器](/core/js-executor) - 学习脚本执行
- [生命周期管理](/core/lifecycle-management) - 了解应用生命周期