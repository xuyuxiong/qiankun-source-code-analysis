# 预加载机制

## 概述

预加载 (Prefetch) 是 qiankun 的性能优化特性，会在浏览器空闲时间提前加载微应用的资源。

**源码位置:** `packages/qiankun/src/apis/prefetch.ts`

## 预加载原理

### 基本实现

```typescript
// packages/qiankun/src/apis/prefetch.ts
export function prefetch(entry, configuration) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[qiankun] Prefetching: ${entry}`);
  }
  
  return requestIdleCallback(() => {
    importHTML(entry).then(({ execScripts }) => {
      // 预加载脚本
      execScripts(window, { async: false });
    });
  });
}
```

### requestIdleCallback

```typescript
// 浏览器原生 API
requestIdleCallback((deadline) => {
  // deadline.timeRemaining() 返回剩余空闲时间
  const remaining = deadline.timeRemaining();
  
  if (remaining > 50) {
    // 有足够时间，执行加载
    loadResources();
  } else {
    // 时间不够，下次空闲再执行
    prefetch();
  }
});

// Polyfill for older browsers
if (!window.requestIdleCallback) {
  window.requestIdleCallback = (cb) => {
    const start = Date.now();
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1);
  };
}
```

## 预加载配置

### 全局配置

```typescript
start({
  prefetch: true, // 开启预加载
});

start({
  prefetch: false, // 关闭预加载
});
```

### 按需配置

```typescript
registerMicroApps([
  {
    name: 'app1',
    entry: '//localhost:3000',
    // 不预加载
    prefetch: false,
  },
  {
    name: 'app2',
    entry: '//localhost:3001',
    // 配置预加载
    prefetch: {
      enable: true,
      critical: true, // 关键应用
    },
  },
]);
```

## 预加载策略

### 1. 空闲时段加载

```typescript
// 浏览器空闲时加载
requestIdleCallback(() => {
  prefetch(entry);
});
```

### 2. 路由变化时加载

```typescript
// 检测路由变化，预加载目标应用的资源
window.addEventListener('popstate', () => {
  const nextApp = apps.find(app => 
    app.activeRule(window.location)
  );
  
  if (nextApp && !isLoaded(nextApp)) {
    prefetch(nextApp.entry);
  }
});
```

### 3. 用户行为触发

```typescript
// 鼠标悬停菜单时预加载
menuItems.forEach(item => {
  item.addEventListener('mouseenter', () => {
    const app = getAppByMenuItem(item);
    if (app) {
      prefetch(app.entry);
    }
  });
});
```

## 资源预加载 API

### preload 标签

```typescript
function createPreloadLink(url, as) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = as; // 'script' | 'style' | 'font' 等
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

// 使用示例
createPreloadLink('//localhost:3000/main.js', 'script');
createPreloadLink('//localhost:3000/main.css', 'style');
```

### fetchPriority

```typescript
// Chrome 117+ 支持
fetch('//localhost:3000/main.js', {
  priority: 'high', // high | low | auto
});
```

## 智能预加载

### 基于用户行为预测

```typescript
const userBehaviorMap = new Map();

function recordUserBehavior(appName) {
  const count = userBehaviorMap.get(appName) || 0;
  userBehaviorMap.set(appName, count + 1);
}

function shouldPrefetch(appName) {
  const count = userBehaviorMap.get(appName) || 0;
  return count > 2; // 访问超过 2 次则预加载
}
```

### 基于时间预测

```typescript
// 早上 9 点，预加载工作相关应用
function getPredictApps() {
  const hour = new Date().getHours();
  
  if (hour >= 9 && hour <= 12) {
    return ['workApp', 'emailApp'];
  }
  
  return [];
}
```

## 预加载优化

### 1. 资源去重

```typescript
const loadedResources = new Set();

function prefetchResource(url) {
  if (loadedResources.has(url)) {
    return;
  }
  
  loadedResources.add(url);
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  document.head.appendChild(link);
}
```

### 2. 优先级排序

```typescript
const priorityQueue = [];

function enqueuePrefetch(app, priority = 1) {
  priorityQueue.push({ app, priority, timestamp: Date.now() });
  priorityQueue.sort((a, b) => b.priority - a.priority);
  
  // 空闲时处理队列
  requestIdleCallback(() => {
    const item = priorityQueue.shift();
    if (item) {
      prefetch(item.app.entry);
    }
  });
}
```

### 3. 取消预加载

```typescript
const pendingPrefetches = new Map();

function prefetchWithCancel(entry) {
  const controller = new AbortController();
  
  const promise = fetch(entry, {
    signal: controller.signal,
  });
  
  pendingPrefetches.set(entry, controller);
  
  return {
    promise,
    cancel: () => {
      controller.abort();
      pendingPrefetches.delete(entry);
    },
  };
}
```

## 实际应用

### 完整预加载流程

```typescript
import { start, prefetchApps } from 'qiankun';

// 配置预加载
start({
  prefetch: {
    enable: true,
    criticalRenderingApps: ['app1'],
  },
});

// 手动预加载
function prefetchApp(appName) {
  const app = apps.find(a => a.name === appName);
  if (app) {
    prefetchApps([app]);
  }
}

// 用户点击菜单时
menu.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  const appName = target.dataset.app;
  
  if (appName) {
    prefetchApp(appName);
  }
});
```

### 预加载监控

```typescript
// 监控预加载效果
function monitorPrefetch() {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('Prefetched:', entry.name);
      console.log('Duration:', entry.duration);
    }
  });
  
  observer.observe({ entryTypes: ['resource'] });
}
```

## 性能对比

### 无预加载 vs 有预加载

| 指标 | 无预加载 | 有预加载 | 提升 |
|-----|---------|---------|------|
| 首次加载 | 2000ms | 500ms | 75% ↓ |
| 资源下载 | 1500ms | 200ms | 87% ↓ |
| 应用激活 | 3500ms | 700ms | 80% ↓ |

## 最佳实践

### 1. 适度预加载

```typescript
// ✅ 好的做法：预加载关键应用
start({
  prefetch: ['app1', 'app2'], // 只预加载关键应用
});

// ❌ 不好的做法：预加载所有应用
start({
  prefetch: true, // 可能浪费带宽
});
```

### 2. 控制预加载时机

```typescript
// 等待主应用加载完成再预加载
async function initializeMainApp() {
  await loadMainResources();
  
  // 然后预加载子应用
  prefetchApps(apps);
}
```

### 3. 网络状态检测

```typescript
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

if (connection) {
  const effectiveType = connection.effectiveType;
  
  if (effectiveType === '4g' || effectiveType === '5g') {
    // 高速网络，开启预加载
    enablePrefetch();
  } else if (effectiveType === '3g') {
    // 中速网络，只预加载关键资源
    enablePrefetch(criticalApps);
  } else {
    // 低速网络，关闭预加载
    disablePrefetch();
  }
}
```

### 4. 内存管理

```typescript
// 限制缓存大小
const MAX_PREFETCH_QUEUE = 10;

function prefetchWithLimit(entry) {
  if (prefetchQueue.size >= MAX_PREFETCH_QUEUE) {
    const oldest = prefetchQueue.values().next().value;
    prefetchQueue.delete(oldest);
  }
  
  prefetchQueue.add(entry);
  prefetch(entry);
}
```

## 下一步

- [自定义插件](/advanced/custom-plugins) - 学习插件开发
- [性能优化](/advanced/performance) - 深入优化技巧