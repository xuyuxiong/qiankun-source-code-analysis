# 应用加载流程

## 概述

应用加载是 qiankun 的核心功能，负责将微应用的资源加载到沙箱中执行。

**源码位置:** `packages/qiankun/src/core/loadApp.ts`

## 加载流程图

```
┌──────────────┐
│ loadMicroApp │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   创建沙箱   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  加载资源    │
│  (HTML/JS)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  执行脚本    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   挂载应用   │
└──────────────┘
```

## 核心源码解析

### loadApp 函数

```typescript
// packages/qiankun/src/core/loadApp.ts (简化版)
export async function loadApp(
  appConfig: AppConfig,
  configuration: ImportEntryOpts = {},
  lifeCycles?: LifeCycles<any>,
): Promise<LoadedApp> {
  const { entry } = appConfig;
  
  // 1. 加载 HTML Entry
  const { template, execScripts, getExternalScripts, getExternalStyles } = 
    await importHTML(entry, configuration);
  
  // 2. 创建沙箱
  const sandbox = createSandbox(appConfig.name, configuration?.sandbox);
  
  // 3. 准备执行上下文
  const finalSandbox = sandbox?.proxy ?? window;
  
  // 4. 执行脚本
  const { promise: scriptsInappPromise, async: firstScriptExec } = 
    execScripts(finalSandbox, appConfig.strictStyleIsolation);
  
  // 5. 获取生命周期
  const { bootstrap, mount, unmount } = await getExports(
    scriptsInappPromise,
    lifeCycles?.getMicroAppScriptsExports,
  );
  
  // 6. 返回应用实例
  return {
    name: appConfig.name,
    mount: () => mount(appConfig),
    unmount: () => unmount(appConfig),
    getSandbox: () => sandbox,
    bootstrap: () => bootstrap(appConfig),
  };
}
```

### importHTML 函数

加载 HTML 并返回可执行的脚本。

**源码位置:** `packages/loader/src/index.ts`

```typescript
export default async function importHTML(
  url: string,
  opts?: ImportHTMLResultOptions,
): Promise<ImportHTMLResult> {
  // 1. 获取 HTML 内容
  const html = await fetchHTML(url);
  
  // 2. 解析 HTML 结构
  const getExternalScripts = () => 
    getExternalScriptSrcFromHtml(html);
  
  const getExternalStyles = () => 
    getExternalStyleSrcFromHtml(html);
  
  // 3. 创建执行脚本的函数
  const execScripts = (sandbox, execScriptOpts) => 
    exec scripts in sandbox;
  
  return {
    template: html,
    execScripts,
    getExternalScripts,
    getExternalStyles,
  };
}
```

### 脚本执行机制

**源码位置:** `packages/sandbox/src/core/sandbox/ProxySandbox.ts`

```typescript
// 在沙箱中执行脚本
execScripts(context, options) {
  scripts.forEach(script => {
    // 在沙箱上下文中执行
    const source = script.src ? src2ScriptContent(script.src) : script.content;
    
    // 使用 eval 或 new Function 执行
    window.ScriptTransformer = globalEvalWithScope(
      transformScriptWithQKSourceUrl(source, script), 
      context
    );
  });
}
```

### 生命周期提取

从子应用的执行结果中提取生命周期钩子。

```typescript
async function getExports(
  promise: Promise<any>,
  getExportsFn?: Function,
) {
  const exports = await promise;
  
  // 获取生命周期函数
  const bootstrap = exports?.bootstrap;
  const mount = exports?.mount;
  const unmount = exports?.unmount;
  
  return { bootstrap, mount, unmount };
}
```

## 加载策略

### 预加载 (Prefetch)

```typescript
// 在空闲时间预加载资源
if (configuration.prefetch !== false) {
  await prefetch(entry, configuration);
}
```

**源码位置:** `packages/qiankun/src/apis/prefetch.ts`

```typescript
export function prefetch(entry, configuration) {
  return requestIdleCallback(() => {
    // 预加载外部脚本
    getExternalScripts().then(() => {
      // 预加载外部样式
      getExternalStyles();
    });
  });
}
```

### 缓存机制

```typescript
const appCache = new Map<string, LoadedApp>();

// 检查缓存
if (appCache.has(appName)) {
  return appCache.get(appName);
}

// 加载并缓存
const app = await loadApp(appConfig);
appCache.set(appName, app);
```

### 并行加载

```typescript
// 同时加载多个资源
const [scripts, styles] = await Promise.all([
  getExternalScripts(),
  getExternalStyles(),
]);
```

## 错误处理

```typescript
try {
  const app = await loadApp(appConfig);
} catch (error) {
  // 错误处理
  console.error(`[qiankun] Load app failed:`, error);
}
```

## 实际应用示例

### 完整加载流程

```typescript
import { loadMicroApp } from 'qiankun';

// 加载微应用
const app = await loadMicroApp({
  name: 'reactApp',
  entry: '//localhost:3000',
  container: '#container',
  props: {
    basePath: '/react',
  },
});

// 手动挂载
await app.mount();

// 手动卸载
await app.unmount();
```

## 性能优化

### 1. 懒加载

只在需要时加载微应用，而不是一开始就全部加载。

### 2. 预加载

在用户可能访问之前预加载资源。

```typescript
// 在页面空闲时预加载
requestIdleCallback(() => {
  prefetch全包 (entry);
});
```

### 3. 缓存结果

```typescript
let cachedResources;

async function loadWithCache(entry) {
  if (cachedResources) {
    return cachedResources;
  }
  
  cachedResources = await importHTML(entry);
  return cachedResources;
}
```

## 下一步

- [路由系统](/core/routing-system) - 探索路由机制
- [沙箱实现](/core/sandbox-overview) - 深入沙箱原理