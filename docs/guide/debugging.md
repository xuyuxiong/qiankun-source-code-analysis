# 调试指南

## 环境搭建

### 1. 克隆源码

```bash
git clone https://github.com/kuitos/qiankun.git
cd qiankun
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 构建项目

```bash
pnpm run build
```

### 4. 链接到本地项目

```bash
cd packages/qiankun
pnpm link --global
```

然后在你的项目中使用：

```bash
pnpm link --global qiankun
```

## VSCode 调试配置

### .vscode/launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug qiankun",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:7000",
      "webRoot": "${workspaceFolder}",
      "sourceMaps": true
    },
    {
      "name": "Node.js: Attach",
      "type": "node",
      "request": "attach",
      "port": 9229
    }
  ]
}
```

### .vscode/settings.json

```json
{
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/dist": true,
    "**/lib": true,
    "**/es": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/lib": true
  }
}
```

## 调试技巧

### 1. 使用 Source Map

在开发模式下，qiankun 会生成 Source Map 文件。确保你的浏览器 DevTools 已启用 Source Map。

**Chrome DevTools 设置:**
- 打开 DevTools (F12)
- 点击右上角设置图标
- 在 Preferences 中勾选 `Enable JavaScript source maps`

### 2. 关键断点位置

#### 应用加载流程

```javascript
// packages/qiankun/src/core/loadApp.ts
// 在 loadApp 函数入口处设置断点
export async function loadApp(
  appConfig: AppConfig,
  configuration: ImportEntryOpts = {},
  lifeCycles?: LifeCycles<any>,
): Promise<LoadedApp> {
  // 在这里设置断点
  debugger;
  // ...
}
```

#### 沙箱创建

```javascript
// packages/sandbox/src/core/sandbox/ProxySandbox.ts
constructor(name: string, globalContext = globalThis) {
  // 在这里设置断点观察沙箱创建
  debugger;
  // ...
}
```

#### 资源加载

```javascript
// packages/loader/src/index.ts
export default async function importHTML(
  url: string,
  opts?: ImportHTMLResultOptions,
): Promise<ImportHTMLResult> {
  // 在这里设置断点观察 HTML 加载
  debugger;
  // ...
}
```

### 3. 使用 console.log 追踪

在关键函数中添加日志：

```typescript
// 在 loadApp.ts 中
console.log('[qiankun] loadApp called with:', appConfig);
console.log('[qiankun] entry:', appConfig.entry);
console.log('[qiankun] container:', appConfig.container);
```

### 4. 利用浏览器 Network 面板

观察资源加载情况：

- 查看 HTML Entry 请求
- 检查 JS/CSS 资源加载
- 分析加载时间和顺序

## 调试示例项目

### 使用官方 examples

```bash
cd examples
pnpm install
pnpm run start:main
# 在另一个终端
pnpm run start:react16
```

访问 `http://localhost:7000/` 查看示例。

### 创建最小调试项目

**主应用:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Debug Main</title>
</head>
<body>
  <div id="container"></div>
  <script type="module">
    import { registerMicroApps, start } from 'qiankun';
    
    registerMicroApps([
      {
        name: 'reactApp',
        entry: '//localhost:3000',
        container: '#container',
        activeRule: '/react',
      },
    ]);
    
    start();
  </script>
</body>
</html>
```

## 常见问题排查

### 样式隔离失效

检查沙箱配置：

```javascript
start({
  sandbox: {
    strictStyleIsolation: true,
    experimentalStyleIsolation: true,
  },
});
```

### 微应用不加载

1. 检查 `activeRule` 是否匹配当前 URL
2. 查看控制台是否有跨域错误
3. 确认子应用正确导出了生命周期钩子

### 沙箱报错

查看错误信息，确认是否使用了不支持的浏览器特性。

## 性能分析

### 使用 Performance API

```javascript
const startTime = performance.now();

await loadMicroApp({
  name: 'app1',
  entry: '//localhost:3000',
  container: '#container',
});

const endTime = performance.now();
console.log(`加载耗时：${endTime - startTime}ms`);
```

### Chrome DevTools Performance

1. 打开 DevTools
2. 选择 Performance 面板
3. 点击录制按钮
4. 执行操作
5. 停止录制并分析

## 下一步

- [整体架构](/architecture/overview) - 理解设计思想
- [应用加载流程](/core/app-loading) - 深入核心逻辑