# JS 执行器

## 概述

JS 执行器负责在沙箱环境中执行微应用的 JavaScript 代码。qiankun 提供了多种执行方式：

1. **eval**: 简单但功能有限
2. **new Function**: 更灵活
3. **with**: 创建特殊作用域

## 执行原理

### 基本执行模式

**源码位置:** `packages/sandbox/src/core/sandbox/StandardAppSandbox.js`

```typescript
// packages/sandbox/src/core/sandbox/StandardAppSandbox.js
class StandardAppSandbox {
  execScript(code: string, filename?: string): void {
    const scriptSource = wrapScriptWithSourceURL(code, filename);
    
    // 使用 eval 执行
    eval.call(this.proxy, scriptSource);
  }
  
  execScripts(scripts: Array<{ src?: string; content: string }>): void {
    scripts.forEach(script => {
      const code = script.src 
        ? this.fetchScript(script.src) 
        : script.content;
      
      this.execScript(code, script.src);
    });
  }
}
```

### eval 执行

```typescript
function executeWithEval(
  code: string, 
  sandbox: WindowProxy
): void {
  // eval 在指定上下文中执行
  eval.call(sandbox, code);
}
```

**优缺点:**
- ✅ 简单直接
- ✅ 可以访问沙箱对象
- ❌ 作用域限制
- ❌ 性能相对较低

### new Function 执行

```typescript
function executeWithFunction(code: string, context: object): void {
  const fn = new Function(`
    with (this) {
      (function() {
        ${code}
      }).call(this);
    }
  `);
  
  fn.call(context);
}
```

**优缺点:**
- ✅ 更灵活的控制
- ✅ 可以定制作用域
- ❌ 需要 with 支持
- ❌ 代码可读性差

## Source URL 处理

### 添加调试信息

**源码位置:** `packages/shared/src/assets-transpilers/script.ts`

```typescript
export function transformScriptWithQKSourceUrl(
  scriptCode: string,
  scriptElement: ScriptElement,
): string {
  const sourcemapInfo = scriptElement.getAttribute('data-source-map');
  
  let source = scriptCode;
  
  if (!scriptCode.includes('sourceMappingURL')) {
    if (scriptElement.src) {
      source = `${scriptCode}\n//# sourceURL=${scriptElement.src}`;
    } else {
      source = `${scriptCode}\n//# sourceURL=${scriptElement.innerText.substring(0, 64)}.js`;
    }
  }
  
  if (sourcemapInfo && !scriptCode.includes('sourceMappingURL')) {
    source += `\n//# sourceMappingURL=${sourcemapInfo}`;
  }
  
  return source;
}
```

### 调试支持

```typescript
// 添加 sourceURL 后，浏览器 DevTools 会显示原始文件名
const code = `
  console.log('from micro-app');
  // sourceURL=http://localhost:3000/static/js/main.js
`;
```

## 异步脚本处理

### async/await 支持

```typescript
async function execAsyncScripts(
  scripts: Array<{ src: string }>,
  sandbox: WindowProxy
): Promise<void> {
  const promises = scripts.map(script => 
    fetch(script.src).then(res => res.text()).then(code => {
      eval.call(sandbox, code);
    })
  );
  
  await Promise.all(promises);
}
```

### module 脚本处理

```typescript
function isModuleScript(script: HTMLScriptElement): boolean {
  return script.type === 'module';
}

async function execModuleScript(
  script: HTMLScriptElement,
  sandbox: WindowProxy
): Promise<void> {
  if (script.src) {
    // 动态导入模块
    await import(script.src);
  } else {
    // 内联模块脚本
    const blob = new Blob([script.textContent], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    await import(url);
    URL.revokeObjectURL(url);
  }
}
```

## 错误处理

### 捕获执行错误

```typescript
function executeWithCapture(code: string, sandbox: WindowProxy): void {
  try {
    eval.call(sandbox, code);
  } catch (error) {
    console.error('[qiankun] Execution error:', error);
    throw error;
  }
}
```

### 错误报告

**源码位置:** `packages/shared/src/reporter/index.ts`

```typescript
interface Reporter {
  report(error: Error, info: { appName: string; scriptUrl?: string }): void;
}

export function createReporter(appName: string): Reporter {
  return {
    report(error, info) {
      console.error(`[qiankun:${appName}] Error:`, error);
      
      // 发送到错误收集服务
      sendToErrorService({
        appName,
        error: error.message,
        stack: error.stack,
        ...info,
      });
    },
  };
}
```

## 脚本加载策略

### 同步加载

```typescript
function syncLoadScript(url: string, sandbox: WindowProxy): void {
  const code = fetchSync(url);
  eval.call(sandbox, code);
}
```

### 异步加载

```typescript
async function asyncLoadScript(url: string, sandbox: WindowProxy): Promise<void> {
  const response = await fetch(url);
  const code = await response.text();
  eval.call(sandbox, code);
}
```

### 预加载

```typescript
function preloadScript(url: string): Promise<string> {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = url;
  document.head.appendChild(link);
  
  return fetch(url).then(res => res.text());
}
```

## 性能优化

### 1. 脚本缓存

```typescript
const scriptCache = new Map<string, string>();

async function loadScriptWithCache(
  url: string, 
  sandbox: WindowProxy
): Promise<void> {
  let code = scriptCache.get(url);
  
  if (!code) {
    const response = await fetch(url);
    code = await response.text();
    scriptCache.set(url, code);
  }
  
  eval.call(sandbox, code);
}
```

### 2. 并发加载

```typescript
async function loadScriptsConcurrently(
  urls: string[], 
  sandbox: WindowProxy
): Promise<void> {
  const scripts = await Promise.all(
    urls.map(url => fetch(url).then(res => res.text()))
  );
  
  scripts.forEach(code => {
    eval.call(sandbox, code);
  });
}
```

### 3. 懒加载

```typescript
function lazyLoadScript(url: string, sandbox: WindowProxy): void {
  requestIdleCallback(() => {
    fetch(url).then(res => res.text()).then(code => {
      eval.call(sandbox, code);
    });
  });
}
```

## 特殊处理

### UMD 模块

```typescript
function loadUMDModule(code: string, sandbox: WindowProxy): void {
  // UMD 模块会检查 exports 和 module
  // qiankun 提供简化的 exports 对象
  const exports = {};
  const module = { exports };
  
  const wrappedCode = `
    (function(exports, module) {
      ${code}
    })(${JSON.stringify(exports)}, ${JSON.stringify(module)});
  `;
  
  eval.call(sandbox, wrappedCode);
}
```

### CommonJS 模块

```typescript
function requireModule(moduleName: string, sandbox: WindowProxy): any {
  // 简单的 require 实现
  const modulePath = resolveModulePath(moduleName);
  const code = fetchSync(modulePath);
  
  const module = { exports: {} };
  const require = (name) => requireModule(name, sandbox);
  
  const wrappedCode = `
    (function(module, require, exports) {
      ${code}
    })(module, require, module.exports);
  `;
  
  eval.call(sandbox, wrappedCode);
  return module.exports;
}
```

## 实际应用

### 完整的脚本执行流程

```typescript
async function executeAppScripts(
  entry: string,
  sandbox: WindowProxy
): Promise<void> {
  // 1. 获取 HTML Entry
  const html = await fetch(entry).then(res => res.text());
  
  // 2. 解析脚本
  const scripts = parseScriptsFromHTML(html);
  
  // 3. 按顺序执行
  for (const script of scripts) {
    if (script.src) {
      // 外部脚本
      await fetch(script.src).then(res => res.text()).then(code => {
        eval.call(sandbox, code);
      });
    } else {
      // 内联脚本
      eval.call(sandbox, script.content);
    }
  }
}
```

## 最佳实践

### 1. 错误边界

```typescript
function safeExecute(code: string, sandbox: WindowProxy): void {
  try {
    eval.call(sandbox, code);
  } catch (error) {
    console.error('Execution failed:', error);
    // 可以降级处理或跳过
  }
}
```

### 2. 超时处理

```typescript
function executeWithTimeout(
  code: string, 
  sandbox: WindowProxy,
  timeout = 5000
): Promise<void> {
  return Promise.race([
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    ),
    new Promise(resolve => {
      eval.call(sandbox, code);
      resolve();
    }),
  ]);
}
```

### 3. 代码验证

```typescript
function validateScript(code: string): boolean {
  // 检查恶意代码
  if (code.includes('eval(') || code.includes('Function(')) {
    console.warn('Potentially unsafe code detected');
  }
  return true;
}
```

## 下一步

- [模块系统](/core/module-system) - 了解模块加载
- [应用加载](/core/app-loading) - 回顾完整流程