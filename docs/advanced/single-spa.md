# single-spa 核心解析

> qiankun 基于 single-spa 构建，理解 single-spa 是掌握 qiankun的关键

**源码位置**: `https://github.com/single-spa/single-spa`

---

## 📖 概述

single-spa 是一个**微前端框架**，用于将多个应用组合成一个前端应用。

qiankun 在 single-spa 基础上增加了：
- 📦 沙箱隔离 (StandardSandbox)
- 🎨 样式隔离
- 📥 资源加载优化
- 🔌 丰富的插件生态

---

## 🏗️ 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                     single-spa                             │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  应用注册模块   │  │   导航系统      │  │  生命周期   │ │
│  │   (apps.js)     │  │  (reroute.js)   │  │ (lifecycles)│ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│            │                   │                  │         │
│            │                   │                  │         │
│            ▼                   ▼                  ▼         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              应用状态机 (app.helpers.js)             │   │
│  │  NOT_LOADED → LOADING → NOT_BOOTSTRAPPED → MOUNTED  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 源码结构

```
single-spa/src/
├── applications/          # 应用管理
│   ├── apps.js           # 应用注册、状态查询
│   ├── app.helpers.js    # 辅助函数、状态常量
│   ├── app-errors.js     # 错误处理
│   └── timeouts.js       # 超时配置
├── lifecycles/           # 生命周期
│   ├── load.js           # 加载阶段
│   ├── bootstrap.js      # 引导阶段
│   ├── mount.js          # 挂载阶段
│   ├── unmount.js        # 卸载阶段
│   ├── unload.js         # 卸载阶段
│   └── lifecycle.helpers.js
├── navigation/           # 导航系统
│   ├── reroute.js        # 核心重路由逻辑
│   ├── navigation-events.js
│   └── route-deps.js
├── parcels/             # 包裹机制
│   └── mount-parcel.js
├── devtools/            # 开发工具
├── utils/               # 工具函数
└── single-spa.js        # 主入口
```

---

## 🎯 核心 API

### 1. registerApplication

**源码位置**: `applications/apps.js`

```typescript
export function registerApplication(
  appNameOrConfig,
  appOrLoadApp,
  activeWhen,
  customProps
) {
  const registration = sanitizeArguments(
    appNameOrConfig,
    appOrLoadApp,
    activeWhen,
    customProps
  );

  // 检查应用是否已存在
  if (getAppNames().indexOf(registration.name) !== -1)
    throw Error(
      formatErrorMessage(
        21,
        __DEV__ && `There is already an app registered with name ${registration.name}`,
        registration.name
      )
    );

  // 添加到应用列表
  apps.push(
    assign(
      {
        loadErrorTime: null,
        status: NOT_LOADED,
        parcels: {},
        devtools: {
          overlays: { options: {}, selectors: [] },
        },
      },
      registration
    )
  );

  if (isInBrowser) {
    ensureJQuerySupport();
    reroute(); // 触发路由重计算
  }
}
```

**使用示例**:

```typescript
import { registerApplication } from 'single-spa';

registerApplication({
  name: 'app1',
  app: () => import('./app1/main.js'),
  activeWhen: ['/app1'],
  customProps: {
    // 传递给子应用的 props
  },
});
```

---

### 2. start

**源码位置**: `start.js`

```typescript
let isStarted = false;

export function start(opts) {
  isStarted = true;
  
  // 覆盖原生的 pushState/replaceState
  if (isInBrowser) {
    override军中 StateAndPushState(opts);
    ensureJQuerySupport();
    reroute(); // 触发初始路由
  }
}

export function isStarted() {
  return isStarted;
}
```

**作用**:
- 标记 single-spa 已启动
- 覆盖 `history.pushState/replaceState`
- 触发首次路由计算

---

### 3. navigateToUrl

**源码位置**: `navigation/navigation-events.js`

```typescript
export function navigateToUrl(url, opts) {
  if (typeof url === 'object') {
    // 阻止表单提交
    if (url.preventDefault) {
      url.preventDefault();
    }
    url = url.currentTarget.href;
  }
  
  if (isPrefixingValues) {
    url = toAbsoluteUrl(url);
  }
  
  pushHistoryState(url, opts);
}

function pushHistoryState(url, opts) {
  history.pushState(opts, '', url);
  // 触发路由重计算
  reroute();
}
```

---

## 🔄 核心流程：reroute

**源码位置**: `navigation/reroute.js`

reroute 是 single-spa 的**核心函数**，负责：
1. 计算哪些应用需要加载/挂载/卸载
2. 按顺序执行生命周期
3. 处理并发和错误

### reroute 流程

```typescript
function reroute(pendingPromises = [], eventArguments) {
  if (appChangeUnderway) {
    // 如果正在执行，加入等待队列
    return new Promise((resolve, reject) => {
      peopleWaitingOnAppChange.push({ resolve, reject, eventArguments });
    });
  }

  const { appsToUnload, appsToUnmount, appsToLoad, appsToMount } = getAppChanges();
  
  if (isStarted()) {
    appChangeUnderway = true;
    return performAppChanges();
  } else {
    return loadApps(); // start() 之前只加载不挂载
  }
}
```

### performAppChanges

```typescript
function performAppChanges() {
  return Promise.resolve().then(() => {
    // 1. 发送 before-app-change 事件
    window.dispatchEvent(new CustomEvent('single-spa:before-app-change', detail));
    
    // 2. 发送 before-routing-event (可取消导航)
    window.dispatchEvent(
      new CustomEvent('single-spa:before-routing-event', { cancelNavigation })
    );
    
    if (navigationIsCanceled) {
      finishUpAndReturn();
      navigateToUrl(oldUrl); // 回滚
      return;
    }

    // 3. 并行执行：卸载 + 加载
    const unloadPromises = appsToUnload.map(toUnloadPromise);
    
    const unmountUnloadPromises = appsToUnmount
      .map(toMountPromise)
      .map(p => p.then(toUnloadPromise));
    
    const unmountAllPromise = Promise.all([...unloadPromises, ...unmountUnloadPromises]);
    
    // 4. 加载并挂载新应用
    const loadThenMountPromises = appsToLoad.map(app => {
      return toLoadPromise(app).then(app =>
        tryToBootstrapAndMount(app, unmountAllPromise)
      );
    });
    
    // 5. 等待所有操作完成
    return Promise.all([...loadThenMountPromises, unmountAllPromise]).then(
      finishUpAndReturn
    );
  });
}
```

### 流程图

```
reroute()
    │
    ├─► getAppChanges()
    │   ├─ appsToUnload (需要卸载的应用)
    │   ├─ appsToUnmount (需要卸载的应用)
    │   ├─ appsToLoad   (需要加载的应用)
    │   └─ appsToMount  (需要挂载的应用)
    │
    ├─► before-app-change 事件
    │
    ├─► before-routing-event 事件 (可取消)
    │
    ├─► 并行执行:
    │   ├─ appsToUnload.map(toUnloadPromise)
    │   ├─ appsToUnmount.map(toUnmountPromise → toUnloadPromise)
    │   └─ appsToLoad.map(toLoadPromise → toBootstrapPromise → toMountPromise)
    │
    └─► finishUpAndReturn()
        └─► 返回 mounted apps
```

---

## 📊 应用状态机

**源码位置**: `applications/app.helpers.js`

```typescript
// 应用状态常量
export const NOT_LOADED = 'NOT_LOADED';
export const LOADING_SOURCE_CODE = 'LOADING_SOURCE_CODE';
export const NOT_BOOTSTRAPPED = 'NOT_BOOTSTRAPPED';
export const BOOTSTRAPPING = 'BOOTSTRAPPING';
export const NOT_MOUNTED = 'NOT_MOUNTED';
export const MOUNTING = 'MOUNTING';
export const MOUNTED = 'MOUNTED';
export const UPDATING = 'UPDATING';
export const UNMOUNTING = 'UNMOUNTING';
export const SKIP_BECAUSE_BROKEN = 'SKIP_BECAUSE_BROKEN';
export const LOAD_ERROR = 'LOAD_ERROR';
```

### 状态流转图

```
NOT_LOADED
    │
    ▼ (registerApplication + activeWhen = true)
LOADING_SOURCE_CODE
    │
    ▼ (loadApp 完成)
NOT_BOOTSTRAPPED
    │
    ▼ (bootstrap())
NOT_MOUNTED
    │
    ▼ (mount())
MOUNTED ═════════════════════╗
    │                        ║
    ├─ (活性检查失败)         ║
    ▼                        ║
UNMOUNTING                   ║
    │                        ║
    ▼ (unmount() 完成)        ║
NOT_MOUNTED ────────────────╣
                            ║
    LOAD_ERROR ─────────────╣ (错误 200ms 后重试)
                            ║
    SKIP_BECAUSE_BROKEN ◄───╣ (连续失败)
```

---

## 🧩 生命周期

### Load 阶段

**源码位置**: `lifecycles/load.js`

```typescript
export function toLoadPromise(app) {
  return Promise.resolve().then(() => {
    if (app.loadPromise) {
      return app.loadPromise;
    }

    if (app.status !== NOT_LOADED && app.status !== LOAD_ERROR) {
      return app;
    }

    app.status = LOADING_SOURCE_CODE;

    return (app.loadPromise = Promise.resolve()
      .then(() => {
        // 调用用户提供的 loadApp 函数
        const loadPromise = app.loadApp(getProps(app));
        
        // 验证返回的是 Promise
        if (!smellsLikeAPromise(loadPromise)) {
          throw Error(
            formatErrorMessage(33, 'loading function did not return a promise')
          );
        }
        
        return loadPromise.then(val => {
          // 验证生命周期函数
          if (!validLifecycleFn(val.bootstrap)) {
            throw Error('does not export a valid bootstrap function');
          }
          if (!validLifecycleFn(val.mount)) {
            throw Error('does not export a mount function');
          }
          if (!validLifecycleFn(val.unmount)) {
            throw Error('does not export a unmount function');
          }
          
          // 更新应用配置
          app.status = NOT_BOOTSTRAPPED;
          app.bootstrap = flattenFnArray(val, 'bootstrap');
          app.mount = flattenFnArray(val, 'mount');
          app.unmount = flattenFnArray(val, 'unmount');
          
          return app;
        });
      })
    );
  });
}
```

### Bootstrap 阶段

**源码位置**: `lifecycles/bootstrap.js`

```typescript
export function toBootstrapPromise(app) {
  return Promise.resolve().then(() => {
    if (app.status !== NOT_BOOTSTRAPPED) {
      return app;
    }

    app.status = BOOTSTRAPPING;

    return Promise.resolve()
      .then(() => app.bootstrap(getProps(app)))
      .then(() => {
        app.status = NOT_MOUNTED;
        return app;
      })
      .catch(err => {
        handleAppError(err, app, BOOTSTRAPPING);
        throw err;
      });
  });
}
```

### Mount 阶段

**源码位置**: `lifecycles/mount.js`

```typescript
export function toMountPromise(app) {
  return Promise.resolve().then(() => {
    if (app.status !== NOT_MOUNTED) {
      return app;
    }

    app.status = MOUNTING;

    return Promise.resolve()
      .then(() => app.mount(getProps(app)))
      .then(() => {
        app.status = MOUNTED;
        return app;
      })
      .catch(err => {
        handleAppError(err, app, MOUNTING);
        throw err;
      });
  });
}
```

### Unmount 阶段

**源码位置**: `lifecycles/unmount.js`

```typescript
export function toUnmountPromise(app) {
  return Promise.resolve().then(() => {
    if (app.status !== MOUNTED) {
      return app;
    }

    app.status = UNMOUNTING;

    return Promise.resolve()
      .then(() => app.unmount(getProps(app)))
      .then(() => {
        app.status = NOT_MOUNTED;
        return app;
      })
      .catch(err => {
        handleAppError(err, app, UNMOUNTING);
        throw err;
      });
  });
}
```

### Unload 阶段

**源码位置**: `lifecycles/unload.js`

```typescript
export function toUnloadPromise(app) {
  return Promise.resolve().then(() => {
    if (app.status !== NOT_MOUNTED && app.status !== LOAD_ERROR) {
      return app;
    }

    app.status = NOT_LOADED;
    
    // 清理 loadApp 的缓存
    delete app.loadPromise;
    delete app.bootstrap;
    delete app.mount;
    delete app.unmount;
    
    return app;
  });
}
```

---

## 🔍 应用活性检查

**源码位置**: `applications/app.helpers.js`

```typescript
export function shouldBeActive(app) {
  try {
    return app.activeWhen(app.location);
  } catch (err) {
    handleAppError(err, app, SKIP_BECAUSE_BROKEN);
    return false;
  }
}

export function toActiveWhenString(activeWhen) {
  const routes = Array.isArray(activeWhen) ? activeWhen : [activeWhen];
  
  return function(location) {
    return routes.some(route => pathToActiveWhen(route)(location));
  };
}

export function pathToActiveWhen(path) {
  return function(location) {
    const url = ensureTrailingSlash(location.pathname);
    const appRoute = ensureTrailingSlash(path);
    return url === appRoute || url.startsWith(appRoute);
  };
}
```

---

## 🧪 Parcel 机制

**源码位置**: `parcels/mount-parcel.js`

Parcel 是**独立挂载**的微前端单元，可以脱离应用存在：

```typescript
export function mountRootParcel(parcelConfig, parcelProps) {
  // 1. 验证配置
  const validLifecycleProps = validateParcelConfig(parcelConfig);
  
  // 2. 创建 parcel 状态
  let parcel = {
    status: NOT_BOOTSTRAPPED,
    ...validLifecycleProps,
    unmountPromise: Promise.resolve(),
  };
  
  // 3. 执行生命周期
  const bootstrapPromise = toBootstrapPromise(parcel);
  const mountPromise = bootstrapPromise.then(() => toMountPromise(parcel));
  
  // 4. 返回 parcel API
  return {
    mount: () => mountPromise,
    unmount: () => toUnmountPromise(parcel),
    unmountPromise: parcel.unmountPromise,
    getStatus: () => parcel.status,
    loadPromise,
    bootstrapPromise,
    mountPromise,
    unmountPromise,
    unloadPromise,
  };
}
```

---

## 🛠️ 与 qiankun 的对比

| 特性 | single-spa | qiankun |
|------|------------|---------|
| **应用加载** | 原生 ES Module | HTML Entry (webpack 插件) |
| **沙箱隔离** | ❌ 无 | ✅ StandardSandbox |
| **样式隔离** | ❌ 无 | ✅ Shadow DOM / Scoped CSS |
| **资源预加载** | ❌ 基础 prefetch | ✅ 智能预加载策略 |
| **通信机制** | customProps | GlobalState |
| **生命周期** | load/bootstrap/mount/unmount | 同 left + 更多 hooks |

---

## 📝 最佳实践

### 1. 应用拆分

```typescript
// ✅ 推荐：按业务域拆分
registerApplication('app-users', loadUsersApp, pathToActiveWhen('/users'));
registerApplication('app-orders', loadOrdersApp, pathToActiveWhen('/orders'));

// ❌ 避免：过度拆分
registerApplication('app-header', loadHeaderApp, () => true);
registerApplication('app-footer', loadFooterApp, () => true);
```

### 2. 路由配置

```typescript
// ✅ 推荐：使用 pathToActiveWhen
registerApplication('app1', () => import('./app1'), pathToActiveWhen('/app1'));

// ✅ 推荐：自定义活性检查
registerApplication('app2', () => import('./app2'), {
  activeWhen: (location) => location.pathname.startsWith('/app2')
});

// ❌ 避免：在 activeWhen 中执行复杂逻辑
registerApplication('app3', loadApp3, () => {
  // 复杂 DOM 操作
  return document.querySelector('#app3-root') !== null;
});
```

### 3. 错误处理

```typescript
import { addErrorHandler } from 'single-spa';

addErrorHandler((err) => {
  console.error('single-spa error:', err);
  // 上报错误监控平台
  reportError(err);
});
```

---

## 📚 相关文档

- [single-spa 官方文档](https://single-spa.js.org)
- [qiankun 基于 single-spa 的扩展](/architecture/overview)
- [应用生命周期](/core/lifecycle-management)

---

**最后更新**: 2026-05-22
**源码版本**: single-spa@5.x