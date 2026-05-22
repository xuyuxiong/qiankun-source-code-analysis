# 样式隔离

## 概述

样式隔离是微前端的关键挑战之一。qiankun 提供了三种样式隔离方案：

1. **Scoped CSS** - CSS 作用域前缀
2. **Shadow DOM** - 浏览器原生隔离
3. **Strict CSS Isolation** - 严格的 CSS 作用域

## Scoped CSS 原理

### Scoped 前缀

```css
/* 原始 CSS */
.button {
  color: red;
  background: blue;
}

/* 添加Scoped前缀 */
[data-qiankun="react-app"] .button {
  color: red;
  background: blue;
}
```

### Scoped 实现

**源码位置:** `packages/sandbox/src/patchers/dynamicAppend/common.ts`

```typescript
const ATTR_PREFIX = 'data-';

function getStyledElementCSSRules(element: HTMLStyleElement): CSSRuleList {
  return styledComponentCSSRulesMap.get(element);
}

function validateStyleElement(
  element: HTMLStyleElement,
  containerElement: Element,
  scoped: boolean,
): void {
  if (scoped) {
    // 添加作用域前缀
    const scopedCSS = convertCSSRules(
      element,
      qiankunHeadElement,
      containerElement,
      [];
    );
    applyScopedCSS(a, b);
  }
}
```

### 样式转换

```typescript
function convertScopedCSS(
  cssText: string,
  appInstanceId: string,
): string {
  // 使用正则替换选择器
  return cssText.replace(/([^{}]+)\{([^}]+)\}/g, (match, selector, rules) => {
    const scopedSelector = `[data-qiankun="${appInstanceId}"] ${selector}`;
    return `${scopedSelector}{${rules}}`;
  });
}
```

## Shadow DOM

### 配置

```typescript
start({
  sandbox: {
    strictStyleIsolation: true,
  },
});
```

### 实现原理

```typescript
// packages/sandbox/src/core/sandbox/StandardAppSandbox.ts
class StandardAppSandbox {
  private shadowContainer: ShadowRoot;
  
  constructor(appName: string, container: Element) {
    // 创建 Shadow Root
    const shadowDOM = container.attachShadow({ mode: 'open' });
    shadowDOM.className = `qiankun-micro-app-${appName}`;
    this.shadowContainer = shadowDOM;
  }
  
  // Shadow DOM 中样式自动隔离
}
```

### 使用示例

```html
<!-- 主应用 -->
<div id="container"></div>
<script>
  mountReactApp('#container');
</script>
```

```html
<!-- 子应用在 Shadow DOM 中的表现 -->
app1-host-element
  shadowRoot
    ├── div.app1-content
    │   └── .button { color: red; }  <!-- 只在 Shadow DOM 内生效 -->
```

## Scoped CSS 与 Shadow DOM 对比

| 特性 | Scoped CSS | Shadow DOM |
|-----|-----------|------------|
| 兼容性 | 所有浏览器 | 现代浏览器 |
| 隔离性 | 中等 | 完全 |
| 性能 | 高 | 中 |
| 复杂度 | 低 | 中 |

## CSS 补丁

### 查找样式表

**源码位置:** `packages/sandbox/src/patchers/dynamicAppend/common.ts`

```typescript
function lookupStyleSheetElements() {
  return Array.from(document.getElementsByTagName('link')).filter(
    element => 
      element.tagName === 'LINK' &&
      element.getAttribute('rel') === 'stylesheet'
  );
}
```

### 样式注入

```typescript
function appendStyleToContainer(
  styleElement: HTMLStyleElement,
  container: Element,
): void {
  const head = container.querySelector('head') || container;
  head.appendChild(styleElement);
}
```

## 样式冲突检测

### 重复样式检测

```typescript
function detectDuplicateStyles(styles: HTMLStyleElement[]) {
  const styleMap = new Map();
  
  styles.forEach(style => {
    const hash = hashCode(style.textContent);
    const existing = styleMap.get(hash);
    
    if (existing) {
      console.warn('Duplicate style detected:', style, existing);
    } else {
      styleMap.set(hash, style);
    }
  });
}
```

### 样式覆盖率分析

```typescript
function analyzeCSSCoverage(stylesheets) {
  return stylesheets.map(sheet => ({
    totalRules: sheet.cssRules.length,
    usedRules: sheet.cssRules.filter(rule => 
      isRuleUsed(rule)
    ).length,
    coverage: (usedRules / totalRules) * 100,
  }));
}
```

## 最佳实践

### 1. 避免全局样式

```css
/* ❌ 不好的做法 */
* {
  box-sizing: border-box;
}

/* ✅ 好的做法 */
.app1-content * {
  box-sizing: border-box;
}
```

### 2. 使用 CSS Modules

```typescript
// styles.module.css
.button {
  color: red;
}

// App.tsx
import styles from './styles.module.css';

<button className={styles.button}>Click</button>
```

### 3. CSS-in-JS

```typescript
// styled-components
const Button = styled.button`
  color: red;
  &:hover {
    color: blue;
  }
`;
```

## 实际应用

### 启用严格样式隔离

```typescript
import { start } from 'qiankun';

start({
  sandbox: {
    strictStyleIsolation: true, // 启用 Shadow DOM
    experimentalStyleIsolation: true, // 使用 Scoped CSS 补丁
  },
});
```

### Scoped 样式示例

```html
<!-- 子应用的样式 -->
<style>
.button {
  color: red;
}

[data-qiankun="react-app"] .button {
  /* 添加作用域前缀 */
  color: red;
}
</style>
```

## 性能优化

### 1. 样式去重

```typescript
const loadedStyles = new Set();

function loadStyleIfNotLoaded(url) {
  if (loadedStyles.has(url)) {
    return;
  }
  loadStyle(url);
  loadedStyles.add(url);
}
```

### 2. 关键 CSS 内联

```html
<head>
  <!-- 关键样式内联 -->
  <style>
    .critical { display: block; }
  </style>
</head>
```

### 3. 懒加载非关键样式

```typescript
// 懒加载非关键样式
requestIdleCallback(() => {
  loadNonCriticalCSS();
});
```

## 下一步

- [DOM 沙箱](/core/dom-sandbox) - 学习 DOM 隔离
- [应用加载](/core/app-loading) - 回顾加载流程