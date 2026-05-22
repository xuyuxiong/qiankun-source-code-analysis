# 性能优化

## 概述

性能是微前端架构的关键考量。本节介绍 qiankun 应用的性能优化技巧。

## 加载性能优化

### 1. 资源预加载

```typescript
// 启用预加载
start({
  prefetch: true,
});

// 或者配置关键应用预加载
start({
  prefetch: ['app1', 'app2'],
});

// 手动预加载
function prefetchOnHover() {
  document.querySelectorAll('[data-app-name]').forEach(el => {
    el.addEventListener('mouseenter', () => {
      const appName = el.dataset.appName;
      importHTML(getAppEntry(appName));
    });
  });
}
```

### 2. 资源分包

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
        },
        common: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
  },
};
```

### 3. 懒加载子应用

```typescript
// 只在需要时加载
const loadAppOnDemand = (appName) => {
  const app = apps.find(a => a.name === appName);
  if (app && !app.loaded) {
    loadMicroApp(app);
  }
};
```

### 4. 资源压缩

```javascript
// webpack.config.js
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
        },
      }),
    ],
  },
};
```

## 运行时性能优化

### 1. 沙箱性能

```typescript
// 选择高性能沙箱
start({
  sandbox: {
    strictStyleIsolation: false, // 使用 Scoped CSS 而非 Shadow DOM
  },
});

// 单例应用可以使用快照沙箱
start({
  singular: true,
});
```

### 2. 样式优化

```css
/* 避免全局选择器 */
/* ❌ 不好的做法 */
* {
  box-sizing: border-box;
}

/* ✅ 好的做法 */
.app-container * {
  box-sizing: border-box;
}

/* 避免深层嵌套 */
/* ❌ 不好的做法 */
.page .section .article .content .text {
  color: red;
}

/* ✅ 好的做法 */
.app-text {
  color: red;
}
```

### 3. DOM 操作优化

```typescript
// 批量更新 DOM
function batchUpdate(container, items) {
  const fragment = document.createDocumentFragment();
  
  items.forEach(item => {
    const el = createItemElement(item);
    fragment.appendChild(el);
  });
  
  container.appendChild(fragment); // 只触发一次重排
}

// 避免频繁读取布局信息
function updateElements(elements) {
  // ❌ 不好的做法：强制同步布局
  elements.forEach(el => {
    el.style.width = '100px';
    el.offsetHeight; // 强制重排
    el.style.height = '200px';
  });
  
  // ✅ 好的做法：批量读写
  let heights = elements.map(el => el.offsetHeight);
  elements.forEach((el, i) => {
    el.style.height = `${heights[i] + 100}px`;
  });
}
```

### 4. 事件优化

```typescript
// 使用事件委托
// ❌ 每个按钮单独绑定
buttons.forEach(btn => {
  btn.addEventListener('click', handler);
});

// ✅ 事件委托
container.addEventListener('click', (e) => {
  if (e.target.matches('.btn')) {
    handler(e);
  }
});

// 防抖和节流
const debounceHandler = debounce(handler, 300);
const throttleHandler = throttle(handler, 1000);
```

## 内存优化

### 1. 及时清理副作用

```typescript
export async function unmount() {
  // 清除定时器
  if (timerRef.current) {
    clearInterval(timerRef.current);
  }
  
  // 清理事件监听
  document.removeEventListener('resize', handleResize);
  window.removeEventListener('storage', handleStorage);
  
  // 清理订阅
  subscription?.unsubscribe();
  
  // 清理引用
  containerRef.current = null;
}
```

### 2. 避免内存泄漏

```typescript
// 使用 WeakMap 缓存
const cache = new WeakMap();

function getCachedData(obj) {
  if (cache.has(obj)) {
    return cache.get(obj);
  }
  const data = computeData(obj);
  cache.set(obj, data);
  return data;
}

// 避免闭包引用
function setupListener() {
  const data = fetchData(); // 大数据
  
  // ❌ 不好的做法：闭包引用 data
  window.addEventListener('click', () => {
    processData(data);
  });
}
```

### 3. 图片优化

```typescript
// 懒加载图片
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});

document.querySelectorAll('img[data-src]').forEach(img => {
  observer.observe(img);
});
```

## 性能监控

### 1. Performance API

```typescript
// 测量加载时间
const observer = new PerformanceObserver((entries) => {
  entries.forEach(entry => {
    console.log('Resource loaded:', {
      name: entry.name,
      duration: entry.duration,
      initiatorType: entry.initiatorType,
    });
  });
});

observer.observe({ entryTypes: ['resource'] });
```

### 2. FCP/FID 监控

```typescript
// First Contentful Paint
const fcpObserver = new PerformanceObserver((entries) => {
  entries.forEach(entry => {
    console.log('FCP:', entry.startTime);
    reportMetric('FCP', entry.startTime);
  });
});

fcpObserver.observe({ entryTypes: ['paint'] });

// First Input Delay
const fidObserver = new PerformanceObserver((entries) => {
  entries.forEach(entry => {
    reportMetric('FID', entry.processingStart - entry.startTime);
  });
});

fidObserver.observe({ entryTypes: ['first-input'] });
```

### 3. 自定义指标

```typescript
// 应用加载时间
function measureAppLoad(appName) {
  const markName = `${appName}-load`;
  performance.mark(`${markName}-start`);
  
  return {
    end: () => {
      performance.mark(`${markName}-end`);
      performance.measure(markName, `${markName}-start`, `${markName}-end`);
      
      const measure = performance.getEntriesByName(markName)[0];
      console.log(`${appName} load time:`, measure.duration);
      return measure.duration;
    },
  };
}

// 使用
const measure = measureAppLoad('react-app');
await loadApp();
measure.end();
```

## 优化检查清单

### 加载优化

- [ ] 启用资源预加载
- [ ] 使用代码分割
- [ ] 压缩 JS/CSS
- [ ] 使用 CDN 分发资源
- [ ] 启用 HTTP/2
- [ ] 配置缓存策略

### 运行时优化

- [ ] 选择适当的沙箱类型
- [ ] 使用 Scoped CSS
- [ ] 优化 DOM 操作
- [ ] 实现虚拟滚动
- [ ] 使用 Web Workers
- [ ] 减少重排重绘

### 内存优化

- [ ] 及时清理副作用
- [ ] 避免闭包泄漏
- [ ] 使用 WeakMap/WeakSet
- [ ] 图片懒加载
- [ ] 大数据分页加载

### 监控优化

- [ ] 配置 PerformanceObserver
- [ ] 监控核心指标 (FCP/LCP/FID)
- [ ] 设置性能告警
- [ ] 定期性能测试

## 性能基准

### 目标值

| 指标 | 目标 | 警戒线 |
|-----|------|--------|
| 首次加载 | < 2s | > 5s |
| 路由切换 | < 300ms | > 1s |
| 应用激活 | < 500ms | > 1s |
| 内存占用 | < 100MB | > 500MB |

### 性能测试

```typescript
// 自动化性能测试
async function runPerformanceTest() {
  const results = [];
  
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await loadApp();
    const end = performance.now();
    results.push(end - start);
    await unloadApp();
  }
  
  const avg = results.reduce((a, b) => a + b) / results.length;
  console.log('Average load time:', avg);
  
  return {
    average: avg,
    min: Math.min(...results),
    max: Math.max(...results),
  };
}
```

## 下一步

- [最佳实践](/advanced/best-practices) - 学习最佳实践
- [常见问题](/advanced/faq) - 查看 FAQ