# 模块系统

## 概述

qiankun 的模块系统负责处理微应用的模块加载和依赖管理，支持多种模块规范：

1. **UMD**: 传统通用模块
2. **ES Modules**: 现代模块系统
3. **CommonJS**: Node.js 模块规范

## ES Modules 支持

### import 和 export

```javascript
// 子应用
export const user = { name: '张三' };
export function greet() {
  console.log('Hello');
}
export default App;

// 动态导入
const module = await import('//localhost:3000/app.js');
console.log(module.default);
console.log(module.greet());
```

### qiankun 中的 Module 处理

**源码位置:** `packages/shared/src/module-resolver/resolvers/`

```typescript
// 导入外部模块
async function importModule(url: string): Promise<any> {
  const response = await fetch(url);
  const code = await response.text();
  
  // 创建 Blob URL
  const blob = new Blob([code], { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  
  // 动态导入
  const module = await import(blobUrl);
  
  // 清理
  URL.revokeObjectURL(blobUrl);
  
  return module;
}
```

## 模块解析

### 路径解析

```typescript
function resolveModulePath(
  moduleId: string,
  baseUrl: string
): string {
  // 处理相对路径
  if (moduleId.startsWith('./') || moduleId.startsWith('../')) {
    return new URL(moduleId, baseUrl).href;
  }
  
  // 处理绝对路径
  if (moduleId.startsWith('/')) {
    return new URL(moduleId, baseUrl).href;
  }
  
  // 处理 npm 包（需要配置映射）
  if (moduleId.startsWith('@')) {
    const mappedPath = moduleMap.get(moduleId);
    return mappedPath || moduleId;
  }
  
  return moduleId;
}
```

### 模块映射

```typescript
const moduleMap = new Map<string, string>();

// 配置模块映射
moduleMap.set('react', 'https://cdn.example.com/react.js');
moduleMap.set('vue', 'https://cdn.example.com/vue.js');

function getModulePath(moduleId: string): string {
  return moduleMap.get(moduleId) || moduleId;
}
```

## 模块缓存

### 缓存实现

```typescript
interface ModuleCache {
  [url: string]: {
    promise: Promise<any>;
    module?: any;
    error?: Error;
  };
}

const moduleCache: ModuleCache = {};

async function loadModule(url: string): Promise<any> {
  // 检查缓存
  if (moduleCache[url]?.module) {
    return moduleCache[url].module;
  }
  
  // 如果有进行中的加载，等待它
  if (moduleCache[url]?.promise) {
    return moduleCache[url].promise;
  }
  
  // 创建加载 promise
  moduleCache[url] = {
    promise: (async () => {
      const response = await fetch(url);
      const code = await response.text();
      const blob = new Blob([code], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      const module = await import(blobUrl);
      URL.revokeObjectURL(blobUrl);
      return module;
    })(),
  };
  
  try {
    moduleCache[url].module = await moduleCache[url].promise;
  } catch (error) {
    moduleCache[url].error = error;
    throw error;
  }
  
  return moduleCache[url].module;
}
```

### 缓存清理

```typescript
function clearModuleCache(): void {
  // 清理所有缓存的模块
  Object.keys(moduleCache).forEach(url => {
    delete moduleCache[url];
  });
}

function clearModuleCacheByApp(appName: string): void {
  const pattern = new RegExp(appName);
  Object.keys(moduleCache).forEach(url => {
    if (pattern.test(url)) {
      delete moduleCache[url];
    }
  });
}
```

## Webpack 模块粒度

### Module Federation

```javascript
// 子应用配置
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'remoteApp',
      filename: 'remoteEntry.js',
      exposes: {
        './Button': './src/Button',
        './Dialog': './src/Dialog',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
};

// 主应用配置
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      remotes: {
        remoteApp: 'remoteApp@http://localhost:3000/remoteEntry.js',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
};
```

### 使用暴露的模块

```javascript
// 主应用
import Button from 'remoteApp/Button';

function App() {
  return <Button>Click me</Button>;
}
```

## 模块分析

### 静态分析

```typescript
function analyzeModuleDependencies(code: string): string[] {
  const imports: string[] = [];
  
  // 匹配 import 语句
  const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  
  // 匹配 require() 调用
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  while ((match = requireRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}
```

### 动态导入检测

```typescript
function detectDynamicImports(code: string): string[] {
  const dynamicImports: string[] = [];
  
  // 匹配 import() 调用
  const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = dynamicImportRegex.exec(code)) !== null) {
    dynamicImports.push(match[1]);
  }
  
  return dynamicImports;
}
```

## 模块生命周期

### 加载生命周期

```
解析路径 → 检查缓存 → 下载代码 → 编译 → 执行 → 缓存结果
```

### 卸载清理

```typescript
function unloadModule(url: string): void {
  const cached = moduleCache[url];
  
  if (cached?.module) {
    // 调用模块的卸载钩子（如果存在）
    if (cached.module._unload) {
      cached.module._unload();
    }
    
    // 清理缓存
    delete moduleCache[url];
  }
}
```

## 模块隔离

### 作用域隔离

```typescript
function createModuleScope(sandbox: WindowProxy, appName: string): object {
  return {
    exports: {},
    module: { exports: {} },
    require: (id: string) => {
      const resolved = resolveModulePath(id, appName);
      return getModuleFromCache(resolved);
    },
    ...sandbox,
  };
}
```

### 命名空间隔离

```typescript
// 每个应用有自己的命名空间
const appNamespaces = new Map<string, object>();

function getAppNamespace(appName: string): object {
  if (!appNamespaces.has(appName)) {
    appNamespaces.set(appName, {});
  }
  return appNamespaces.get(appName)!;
}
```

## 模块热更新

### HMR 支持

```typescript
// 监听模块变化
if (module.hot) {
  module.hot.accept('./Button', () => {
    const NewButton = require('./Button').default;
    updateComponent(NewButton);
  });
}
```

### 强制刷新

```typescript
function forceRefreshModule(url: string): Promise<void> {
  // 清除缓存
  delete moduleCache[url];
  
  // 重新加载
  return loadModule(url);
}

// 刷新所有模块
function refreshAllModules(): Promise<void[]> {
  const urls = Object.keys(moduleCache);
  return Promise.all(urls.map(url => forceRefreshModule(url)));
}
```

## 实际应用

### 子应用模块导出

```javascript
// 子应用入口
export const name = 'reactApp';

export async function bootstrap() {
  console.log('bootstraped');
}

export async function mount(props) {
  console.log('mount', props);
}

export async function unmount() {
  console.log('unmount');
}

export default App;
```

### 主应用模块导入

```typescript
import { loadMicroApp } from 'qiankun';

const app = await loadMicroApp({
  name: 'reactApp',
  entry: '//localhost:3000',
});

// 获取应用导出的模块
const exports = await app.getExports();
console.log(exports.name); // reactApp
```

## 最佳实践

### 1. 模块化设计

```javascript
// ✅ 好的做法：清晰的模块导出
export { Button } from './components/Button';
export { Dialog } from './components/Dialog';
export default App;

// ❌ 不好的做法：挂载全局
window.Button = Button;
window.Dialog = Dialog;
```

### 2. 懒加载

```javascript
// 按需加载模块
async function loadModuleOnDemand(moduleId) {
  const module = await import(moduleId);
  return module;
}
```

### 3. 错误处理

```javascript
try {
  const module = await import('./some-module');
} catch (error) {
  console.error('Module load failed:', error);
  // 提供降级方案
  return fallbackModule;
}
```

## 下一步

- [生命周期管理](/core/lifecycle-management) - 了解应用生命周期
- [状态管理](/core/state-management) - 学习状态管理