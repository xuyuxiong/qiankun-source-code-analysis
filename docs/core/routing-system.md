# 路由系统

## 概述

qiankun 的路由系统基于 single-spa 并进行了大量优化，支持多种路由模式。

## Active Rule 机制

微应用的激活依赖于 URL 变化，通过 `activeRule` 判断是否应该加载某个应用。

### activeRule 函数

```typescript
type ActiveRule = (location: Location) => string | boolean | Promise<string | boolean>;
```

**源码位置:** `packages/qiankun/src/apis/registerMicroApps.ts`

### 内置 Active Rule

#### 1. 字符串匹配

```typescript
registerMicroApps([
  {
    name: 'app1',
    entry: '//localhost:3000',
    activeRule: '/app1', // 当 URL 以 /app1 开头时激活
  },
]);
```

#### 2. 正则表达式

```typescript
registerMicroApps([
  {
    name: 'app1',
    entry: '//localhost:3000',
    activeRule: /^\/app1(\/|$)/, // 正则匹配
  },
]);
```

#### 3. 自定义函数

```typescript
function customActiveRule(location: Location) {
  // 自走判断逻辑
  return location.pathname.startsWith('/app1');
}

registerMicroApps([
  {
    name: 'app1',
    entry: '//localhost:3000',
    activeRule: customActiveRule,
  },
]);
```

## 源码实现

### 路径匹配逻辑

```typescript
// packages/qiankun/src/apis/registerMicroApps.ts (简化版)
function getActiveRule(rule: ActiveRule): (location: Location) => string | boolean {
  if (typeof rule === 'string') {
    // 字符串规则
    return (location: Location) => location.pathname.startsWith(rule);
  }
  
  if (rule instanceof RegExp) {
    // 正则规则
    return (location: Location) => rule.test(location.pathname);
  }
  
  if (typeof rule === 'function') {
    // 自定义函数
    return rule;
  }
  
  return () => false;
}
```

### 路由监听

qiankun 监听浏览器的路由变化事件。

```typescript
// 监听 URL 变化
function sideEffectsRebuilt() {
  const patchedHistoryMethods = patchSubAppHistory();
  
  return {
    removeSideEffects: () => {
      // 恢复被劫持的历史方法
      patchedHistoryMethods.forEach(method => restore(method));
    },
  };
}
```

### History 补丁

**源码位置:** `packages/sandbox/src/patchers/historyListen.ts`

```typescript
export function patchHistoryListener(proxy: WindowProxy) {
  const rawHistoryPushState = history.pushState;
  const rawHistoryReplaceState = history.replaceState;
  
  // 劫持 pushState
  history.pushState = function(...args) {
    const result = rawHistoryPushState.apply(this, args);
    // 触发路由变化检查
    checkActiveApps(location);
    return result;
  };
  
  // 劫持 replaceState
  history.replaceState = function(...args) {
    const result = rawHistoryReplaceState.apply(this, args);
    checkActiveApps(location);
    return result;
  };
  
  // 恢复方法
  return () => {
    history.pushState = rawHistoryPushState;
    history.replaceState = rawHistoryReplaceState;
  };
}
```

### popState 监听

```typescript
window.addEventListener('popstate', () => {
  // URL 改变时重新检查活跃应用
  checkActiveApps(location);
});
```

## 应用激活流程

```typescript
// 检查并激活应用
function checkActiveApps(location) {
  const activating = apps.filter(app => {
    const active = app.activeRule(location);
    return active;
  });
  
  const unMounting = apps.filter(app => {
    const active = app.activeRule(location);
    return !active && app.status === 'MOUNTED';
  });
  
  // 卸载不在活跃列表的应用
  unMounting.forEach(app => app.unmount());
  
  // 激活新的应用
  activating.forEach(app => {
    if (app.status !== 'MOUNTED') {
      app.mount();
    }
  });
}
```

## 子应用路由跳转

### Router Base 配置

```typescript
// Vue Router
const router = createRouter({
  history: createWebHistory('/app1'), // base 路径
  routes,
});

// React Router
<BrowserRouter basename="/app1">
  <App />
</BrowserRouter>
```

### Link 组件处理

```typescript
// Vue
<router-link to="/home">首页</router-link>

// React
<Link to="/app1/home">首页</Link>
```

### 动态跳转

```typescript
// Vue
this.$router.push('/home');

// React
navigate('/home');

// 原生
history.pushState(null, '', '/app1/home');
```

## Base 路由问题

### 问题场景

当主应用和子应用都使用 History 模式时，可能出现路由分配错误。

### 解决方案

```typescript
// 主应用路由配置
const routes = [
  {
    path: '/app1/:pathMatch(.*)',
    component: () => <div id="container" />,
  },
];

// 子应用配置 base
const router = createRouter({
  history: createWebHistory('/app1'), // 与 activeRule 一致
  routes: [
    { path: '/home', component: Home },
  ],
});
```

## React Router v6 特殊处理

```typescript
// 子应用内
import { useNavigate, useLocation } from 'react-router-dom';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 处理带 base 的路由
  const match = location.pathname.match(/^\/app1(.*)$/);
  const path = match ? match[1] : '/';
  
  return (
    <Routes>
      <Route path={path} element={<Home />} />
    </Routes>
  );
}
```

## 最佳实践

### 1. Active Rule 明确性

```typescript
// ✅ 好的做法：明确的 activeRule
activeRule: '/app1'

// ❌ 不好的做法：过于宽泛
activeRule: '/'
```

### 2. 避免重复匹配

```typescript
// ✅ 明确指定子应用路径
{
  name: 'app1',
  entry: '//localhost:3000',
  activeRule: '/app1',
}

// ❌ 可能冲突
{
  name: 'app1',
  entry: '//localhost:3000',
  activeRule: '/app',  // 会匹配 /app, /app1, /app2
}
```

### 3. 使用函数形式

```typescript
// 复杂场景下使用函数
activeRule: (location) => {
  return !isBlackList(location.pathname) && 
         location.pathname.startsWith('/app1');
}
```

## 路由模式对比

| 模式 | 优点 | 缺点 | 适用场景 |
|-----|------|------|---------|
| History | URL 美观 | 需要服务端配置 | 现代 SPA |
| Hash | 兼容性好 | URL 带 # | 老旧浏览器支持 |
| Memory | 无 URL 变化 | 不支持浏览器前进后退 | 特殊场景 |

## 下一步

- [资源加载器](/core/resource-loader) - 学习资源加载
- [沙箱机制](/core/sandbox-overview) - 深入沙箱原理