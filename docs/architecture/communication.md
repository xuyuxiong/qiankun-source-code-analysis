# 通信系统

## 通信需求

在微前端架构中，需要解决以下通信需求：

1. **主应用 → 子应用**: 传递配置、全局状态
2. **子应用 → 主应用**: 上报数据、请求导航
3. **子应用 ↔ 子应用**: 跨应用数据共享

## 通信方案

### 1. Props（主应用 → 子应用）

最简单的通信方式，在加载微应用时通过 props 传递。

```typescript
// 主应用
loadMicroApp({
  name: 'reactApp',
  entry: '//localhost:3000',
  container: '#container',
  props: {
    apiPrefix: '/api/v1',
    user: {
      id: '123',
      name: '张三',
    },
  },
});

// 子应用
export async function mount(props) {
  console.log(props.apiPrefix); // /api/v1
  console.log(props.user); // { id: '123', name: '张三' }
}
```

**特点:**
- ✅ 简单直接
- ✅ 类型安全
- ✅ 支持初始化传递
- ❌ 单向通信
- ❌ 不支持动态更新

### 2. GlobalState（全局状态）

qiankun 提供的官方状态管理方案。

**源码位置:** `packages/qiankun/src/apis/effects.ts`

**使用方式:**

```typescript
// 主应用 - 创建全局状态
import { initGlobalState } from 'qiankun';

const state = {
  user: { id: '123', name: '张三' },
  theme: 'light',
};

const actions = initGlobalState(state);

// 更新状态
actions.setGlobalState({
  theme: 'dark',
});
```

```typescript
// 子应用 - 监听状态变化
export async function mount(props) {
  const { onGlobalStateChange, setGlobalState } = props;
  
  // 监听全局状态变化
  onGlobalStateChange((newState) => {
    console.log('Global state changed:', newState);
  });
  
  // 设置全局状态（需要 onBeforeSet 回调确认）
  setGlobalState({
    visitedList: [...visitedList, { app: 'react', time: Date.now() }],
  });
}
```

**源码实现:**

```typescript
// packages/qiankun/src/apis/effects.ts
interface Actions {
  getGlobalState<T extends Record<string, unknown>>(): T;
  setGlobalState(s: Partial<T>): boolean;
  onGlobalStateChange(callback: StateCallback, fireImmediately?: boolean): void;
  offGlobalStateChange(): boolean;
}

export function initGlobalState(state = {}) {
  let globalState = { ...state };
  const listeners = new Map<() => void, StateCallback>();
  
  const actions = {
    getGlobalState() {
      return globalState;
    },
    
    setGlobalState(newS) {
      const newState = { ...globalState, ...newS };
      const result = onBeforeSet(globalState, newState);
      
      globalState = result || newState;
      
      // 通知所有订阅者
      listeners.forEach(cb => cb(globalState));
      return true;
    },
    
    onGlobalStateChange(callback, fireImmediately = false) {
      listeners.set(callback, callback);
      if (fireImmediately) callback(globalState);
    },
    
    offGlobalStateChange() {
      // ... 清理逻辑
    },
  };
  
  return actions;
}
```

### 3. CustomEvent（自定义事件）

使用浏览器原生的事件系统。

```typescript
// 子应用 A - 发布事件
const event = new CustomEvent('user-login', {
  detail: { userId: '123' },
});
window.dispatchEvent(event);

// 子应用 B - 监听事件
window.addEventListener('user-login', (event: CustomEvent) => {
  console.log('User logged in:', event.detail.userId);
});
```

**特点:**
- ✅ 符合 Web 标准
- ✅ 支持任意层级通信
- ❌ 没有类型检查
- ❌ 需要手动管理监听器

### 4. State Management（独立状态管理）

使用 Redux、Zustand、Pinia 等独立的状态管理库。

```typescript
// 独立的状态管理（不依赖 qiankun）
import { createStore } from 'zustand';

export const useStore = createStore((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

## 通信方案对比

| 方案 | 方向 | 复杂度 | 实时性 | 适用场景 |
|-----|------|--------|--------|---------|
| Props | 主 → 子 | 简单 | 初始化 | 配置传递 |
| GlobalState | 双向 | 中等 | 实时 | 全局状态共享 |
| CustomEvent | 任意 | 简单 | 实时 | 一次性通知 |
| 第三方库 | 任意 | 复杂 | 实时 | 复杂状态管理 |

## 最佳实践

### 1. 避免过度通信

```typescript
// ❌ 不好的做法：频繁设置全局状态
globalActions.setGlobalState({ user: newUser });
globalActions.setGlobalState({ theme: newTheme });
globalActions.setGlobalState({ lang: newLang });

// ✅ 好的做法：合并设置
globalActions.setGlobalState({
  user: newUser,
  theme: newTheme,
  lang: newLang,
});
```

### 2. 合理设计接口

```typescript
// ✅ 明确定义 props 类型
interface AppProps {
  apiPrefix: string;
  user: { id: string; name: string };
  logout: () => void;
}

export async function mount(props: AppProps) {
  // ...
}
```

### 3. 及时清理监听器

```typescript
export async function unmount() {
  // 清除全局状态监听
  props?.offGlobalStateChange?.();
  
  // 清理事件监听
  window.removeEventListener('user-login', handleLogin);
}
```

## 通信流程图

```
┌─────────────────┐
│   主应用         │
│  ┌───────────┐  │
│  │GlobalState│  │
│  └─────┬─────┘  │
└────────┼────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│子应用 A│ │子应用 B│
└────────┘ └────────┘
     │           │
     └────┬──────┘
          │
     自定义事件
```

## 下一步

- [应用加载](/core/app-loading) - 深入核心流程
- [路由系统](/core/routing-system) - 学习路由机制