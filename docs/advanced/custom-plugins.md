# 自定义插件

## 概述

qiankun 支持通过插件扩展功能。插件可以在应用生命周期的各个阶段执行自定义逻辑。

## 插件 API

### 基本插件结构

```typescript
interface QiankunPlugin {
  name: string;
  version?: string;
  
  async bootstrap?(app: any): Promise<void>;
  async mount?(app: any): Promise<void>;
  async unmount?(app: any): Promise<void>;
  async update?(app: any): Promise<void>;
  
  onLoad?(start: () => void, app: any): void;
  onMount?(start: () => void, app: any): void;
  onUnmount?(start: () => void, app: any): void;
}
```

## 插件示例

### 1. 错误监控插件

```typescript
const errorTrackerPlugin = {
  name: 'error-tracker',
  
  async mount(app) {
    // 拦截错误
    const rawHandleError = app.handleError;
    app.handleError = (event) => {
      // 发送错误到监控服务
      sendToSentry({
        appName: app.name,
        error: event.error,
        message: event.message,
      });
      
      return rawHandleError(event);
    };
  },
  
  async unmount(app) {
    // 恢复
    app.handleError = app._originalHandleError;
  },
};

// 使用插件
start({
  plugins: [errorTrackerPlugin],
});
```

### 2. Analytics 插件

```typescript
const analyticsPlugin = {
  name: 'analytics',
  
  async bootstrap(app) {
    console.log('[Analytics] Bootstrap:', app.name);
  },
  
  async mount(app) {
    console.log('[Analytics] Mount:', app.name);
    
    // 上报页面访问
    analytics.track('app_mount', {
      appName: app.name,
      timestamp: Date.now(),
    });
  },
  
  async unmount(app) {
    console.log('[Analytics] Unmount:', app.name);
    
    analytics.track('app_unmount', {
      appName: app.name,
    });
  },
};
```

### 3. 权限插件

```typescript
const permissionPlugin = {
  name: 'permission',
  
  onLoad(start, app) {
    // 加载前检查权限
    const hasPermission = checkPermission(app.name);
    
    if (!hasPermission) {
      console.warn(`[Permission] No access to ${app.name}`);
      // 阻止加载
      return;
    }
    
    start();
  },
  
  onMount(start, app) {
    // 挂载前再次验证
    const hasPermission = checkPermission(app.name);
    
    if (!hasPermission) {
      // 卸载应用
      app.unmount();
      return;
    }
    
    start();
  },
};
```

### 4. 国际化插件

```typescript
const i18nPlugin = {
  name: 'i18n',
  
  async mount(app) {
    // 注入国际化的全局方法
    app.proxy.i18n = {
      t: (key) => translate(key),
      locale: getCurrentLocale(),
      setLocale: (locale) => changeLocale(locale),
    };
  },
  
  async unmount(app) {
    // 清理
    delete app.proxy.i18n;
  },
};
```

### 5. 性能监控插件

```typescript
const performancePlugin = {
  name: 'performance',
  
  async bootstrap(app) {
    app._bootstrapStart = performance.now();
  },
  
  async mount(app) {
    app._mountStart = performance.now();
  },
  
  async update(app) {
    const metrics = {
      name: app.name,
      bootstrapTime: app._mountStart - app._bootstrapStart,
      mountTime: performance.now() - app._mountStart,
    };
    
    performanceReport.report(metrics);
  },
};
```

## 插件开发指南

### 插件注册

```typescript
import { start } from 'qiankun';

const myPlugin = {
  name: 'my-plugin',
  
  // 在加载阶段执行
  onLoad(start, app) {
    console.log('Loading app:', app.name);
    start();
  },
  
  // 在挂载阶段执行
  onMount(start, app) {
    console.log('Mounting app:', app.name);
    start();
  },
  
  // 生命周期钩子
  async bootstrap(app) {
    // 初始化逻辑
  },
  
  async mount(app) {
    // 挂载逻辑
  },
  
  async unmount(app) {
    // 卸载逻辑
  },
};

start({
  plugins: [myPlugin],
});
```

### 插件组合

```typescript
const plugins = [
  errorTrackerPlugin,
  analyticsPlugin,
  permissionPlugin,
];

start({
  plugins,
});

// 或者动态添加插件
function addPlugin(plugin) {
  plugins.push(plugin);
}
```

## 插件与生命周期

### 执行顺序

```
App 加载:
  Plugin.onLoad
  → App.bootstrap
  → Plugin.bootstrap
  
App 挂载:
  Plugin.onMount
  → App.mount
  → Plugin.mount
  
App 卸载:
  Plugin.onUnmount
  → App.unmount
  → Plugin.unmount
```

### 插件间协作

```typescript
// 插件 1：设置数据
const dataPlugin = {
  name: 'data',
  
  async mount(app) {
    app.data = await loadData(app.name);
  },
};

// 插件 2：使用数据
const renderPlugin = {
  name: 'render',
  
  mountOrder: 2, // 在 data 插件之后执行
  
  async mount(app) {
    if (app.data) {
      renderWithMata(app.data);
    }
  },
};
```

## 高级插件模式

### 插件工厂

```typescript
function createPlugin(options) {
  return {
    name: `plugin-${options.name}`,
    
    async mount(app) {
      // 使用 options 配置
      if (options.enableFeature) {
        enableFeature(app, options);
      }
    },
  };
}

// 使用工厂
const plugin1 = createPlugin({ name: 'auth', enableFeature: true });
const plugin2 = createPlugin({ name: 'log', level: 'debug' });
```

### 依赖注入

```typescript
const diPlugin = {
  name: 'dependency-injection',
  
  injections: new Map(),
  
  provide(key, value) {
    this.injections.set(key, value);
  },
  
  inject(app, key) {
    app.proxy[key] = this.injections.get(key);
  },
};

// 使用依赖注入
diPlugin.provide('api', apiClient);
diPlugin.provide('store', store);
```

## 实际应用

### 完整的监控插件

```typescript
const monitorPlugin = {
  name: 'monitor',
  
  config: {
    reportUrl: '/api/report',
    enable: true,
  },
  
  configure(config) {
    this.config = { ...this.config, ...config };
  },
  
  async bootstrap(app) {
    if (!this.config.enable) return;
    
    const start = performance.now();
    app._performanceMetrics = { bootstrap: { start } };
  },
  
  async mount(app) {
    if (!this.config.enable) return;
    
    const start = performance.now();
    app._performanceMetrics.mount = { start };
    
    // 上报加载时间
    const bootstrapTime = start - app._performanceMetrics.bootstrap.start;
    this.report('bootstrap', {
      appName: app.name,
      duration: bootstrapTime,
    });
  },
  
  async unmount(app) {
    if (!this.config.enable) return;
    
    // 上报卸载时间
    if (app._performanceMetrics.mount) {
      const mountTime = performance.now() - app._performanceMetrics.mount.start;
      this.report('mount', {
        appName: app.name,
        duration: mountTime,
      });
    }
  },
  
  report(event, data) {
    fetch(this.config.reportUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    });
  },
};
```

## 最佳实践

### 1. 插件职责单一

```typescript
// ✅ 好的做法：每个插件关注一个领域
const errorPlugin = { name: 'error', ... };
const analyticsPlugin = { name: 'analytics', ... };
const i18nPlugin = { name: 'i18n', ... };

// ❌ 不好的做法：一个插件做太多事
const allInOnePlugin = {
  name: 'everything',
  // 包含错误处理、统计、国际化...
};
```

### 2. 插件可配置

```typescript
// ✅ 好的做法
function createPlugin(customConfig) {
  const config = { ...defaultConfig, ...customConfig };
  return { /* ... */ };
}

// ❌ 不好的做法
const config = { /* 硬编码配置 */ };
```

### 3. 插件可测试

```typescript
// ✅ 好的做法：纯函数，易于测试
const plugin = {
  name: 'testable',
  
  async mount(app) {
    // 逻辑清晰，无副作用
    const result = processData(app.data);
    app.data = result;
  },
};

// ❌ 不好的做法：难以测试
const plugin = {
  async mount() {
    // 直接操作 DOM，难以 mock
    document.body.innerHTML = '...';
  },
};
```

## 下一步

- [性能优化](/advanced/performance) - 学习优化技巧
- [最佳实践](/advanced/best-practices) - 了解最佳实践