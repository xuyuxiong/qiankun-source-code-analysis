# 资源加载器

## 概述

qiankun 的资源加载器 (loader) 负责加载和解析微应用的 HTML、JS、CSS 资源。

**源码位置:** `packages/loader/src/index.ts`

## HTML Entry 解析

### 基本原理

qiankun 使用 HTML Entry 方式加载微应用，解析 HTML 中的 `<script>` 和 `<style>`/`<link>` 标签。

**源码位置:** `packages/loader/src/parser.ts`

```typescript
// HTML Entry 示例
<!-- http://localhost:3000/index.html -->
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="/static/css/main.css">
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="/static/js/main.js"></script>
  </body>
</html>
```

### 解析流程

```typescript
export function getExternalScriptsAndStylesFromHTML(html) {
  // 1. 使用正则解析 HTML
  const scriptSrcs = matchAll(html, /<script[^>]+src="([^"]+)"[^>]*>/g);
  const styleSrcs = matchAll(html, /<link[^>]+href="([^"]+)"[^>]*\srel="stylesheet"[^>]*>/g);
  const inlineScripts = matchAll(html, /<script[^>]*>([^<]+)<\/script>/g);
  
  // 2. 返回资源列表
  return {
    scripts: scriptSrcs.map(src => ({ src, type: 'external' })),
    styles: styleSrcs.map(src => ({ src, type: 'external' })),
    inlineScripts: inlineScripts.map(code => ({ content: code, type: 'inline' })),
  };
}
```

## 资源获取

### fetchWithDegrade

**源码位置:** `packages/shared/src/fetch-utils/fetchWithDegrade.ts`

```typescript
export function fetchWithDegrade(url: string): Promise<string> {
  return fetch(url)
    .then(response => response.text())
    .catch(() => {
      // 降级处理：使用 XHR
      return fetchByXHR(url);
    });
}
```

### 资源缓存

```typescript
const rawNodeCache = new Map<string, Promise<any>>();

export function getEmbedHTML(appContent, entry) {
  if (rawNodeCache.has(entry)) {
    return rawNodeCache.get(entry);
  }
  
  const promise = fetchAndParse(entry);
  rawNodeCache.set(entry, promise);
  
  return promise;
}
```

## 脚本执行

### eval 执行

```typescript
function evalCode(code: string, sandbox: WindowProxy) {
  // 使用 eval 在沙箱上下文中执行
  eval.call(sandbox, code);
}
```

### async 脚本执行

```typescript
function asyncExecScripts(sandbox, scripts) {
  return Promise.all(
    scripts.map(script => {
      return fetchAndEval(script.src, sandbox);
    })
  );
}
```

### 同步脚本执行

```typescript
function syncExecScripts(sandbox, scripts) {
  scripts.forEach(script => {
    const code = script.src ? fetchCode(script.src) : script.content;
    eval.call(sandbox, code);
  });
}
```

## 样式加载

### CSS 注入

```typescript
function injectCSS(cssContent: string, container: HTMLElement) {
  const styleElement = document.createElement('style');
  styleElement.textContent = cssContent;
  container.appendChild(styleElement);
}
```

### Link 样式加载

```typescript
async function loadLinkStylesheet(href: string, container: HTMLElement) {
  const cssContent = await fetchCSS(href);
  injectCSS(cssContent, container);
}
```

## 资源优先级

### 1. 样式优先

```typescript
// 先加载样式，避免 FOUC
const stylePromises = getExternalStyles().map(style => loadStyle(style));
const scriptPromises = getExternalScripts().map(script => loadScript(script));

await Promise.all(stylePromises);
await Promise.all(scriptPromises);
```

### 2. 关键脚本优先

```typescript
const [initialScripts, asyncScripts] = partitionScripts(scripts);
await Promise.all(initialScripts.map(loadScript));
// async 脚本异步加载
```

## 资源转换

### Script Transpiler

**源码位置:** `packages/shared/src/assets-transpilers/script.ts`

```typescript
export function transformScriptWithQKSourceUrl(
  scriptCode: string,
  scriptElement: ScriptElement,
): string {
  // 添加 sourceURL 便于调试
  return `
    ${scriptCode}
    //# sourceURL=${scriptElement.src || 'inline'}
  `;
}
```

### HTML Template 处理

```typescript
// 将 HTML 模板嵌入到主应用中
function embedHTML(entry, template, sandbox) {
  const container = createElement('div');
  container.innerHTML = template;
  
  // 将容器添加到 DOM
  document.body.appendChild(container);
  
  // 在沙箱中执行脚本
  execScripts(sandbox);
}
```

## 错误处理

### 脚本加载失败

```typescript
async function loadScriptWithErrorHandling(url: string) {
  try {
    return await fetch(url).then(res => res.text());
  } catch (error) {
    console.error(`Failed to load script: ${url}`, error);
    throw new Error(`Script load failed: ${url}`);
  }
}
```

### 超时处理

```typescript
function fetchWithTimeout(url: string, timeout = 10000) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    ),
  ]);
}
```

## 性能优化

### 1. 并行加载

```typescript
const [cssPromise, jsPromise] = await Promise.all([
  loadAllCSS(styles),
  loadAllJS(scripts),
]);
```

### 2. 懒加载

```typescript
// 非关键资源懒加载
function lazyLoad(resource) {
  requestIdleCallback(() => {
    loadResource(resource);
  });
}
```

### 3. 资源预加载

```typescript
// 使用 <link rel="preload">
function preloadResource(url) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  document.head.appendChild(link);
}
```

## 实际应用

### 完整的资源加载

```typescript
import { importHTML } from '@qiankunjs/loader';

const { template, execScripts, getExternalScripts, getExternalStyles } = 
  await importHTML('//localhost:3000/index.html');

console.log('Template:', template);
console.log('Scripts:', await getExternalScripts());
console.log('Styles:', await getExternalStyles());

// 在沙箱中执行脚本
execScripts(window, {
  strictStyleIsolation: false,
});
```

## 下一步

- [沙箱机制](/core/sandbox-overview) - 深入理解隔离
- [JS 沙箱](/core/js-sandbox) - 学习 JS 隔离