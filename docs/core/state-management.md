# 状态管理

## 概述

qiankun 提供了全局状态管理方案，用于在主应用和微应用之间共享状态。

**源码位置:** `packages/qiankun/src/apis/effects.ts`

## GlobalState API

### 初始化

```typescript
import { initGlobalState } from 'qiankun';

const actions = initGlobalState({
  user: { id: '123', name: '张三' },
  theme: 'light',
  locale: 'zh-CN',
});
```

### 状态操作

```typescript
// 获取全局状态
const state = actions.getGlobalState();
console.log(state.user); // { id: '123', name: '张三' }

// 设置全局状态
actions.setGlobalState({
  theme: 'dark',
});

// 监听状态变化
actions.onGlobalStateChange((newState) => {
  console.log('State changed:', newState);
});

// 移除监听
actions.offGlobalStateChange();
```

## 源码实现

### 完整实现

```typescript
// packages/qiankun/src/apis/effects.ts
interface MicroAppStateActions<T extends Record<string, any>> {
  getGlobalState(): T;
  setGlobalState(state: Partial<T>): boolean;
  onGlobalStateChange(
    callback: (state: T, prevState: T) => void,
    fireImmediately?: boolean
  ): void;
  offGlobalStateChange(): boolean;
}

export function initGlobalState<T extends Record<string, any> = any>(
  state: T = {} as T,
): MicroAppStateActions<T> {
  let globalState = { ...state };
  const deps = new WeakMap<object, (state: T, prevState: T) => void>();
  
  function notify(state: T, prevState: T) {
    deps.forEach((callback) => {
      callback(state, prevState);
    });
  }
  
  return {
    getGlobalState() {
      return globalState;
    },
    
    setGlobalState(state = {}) {
      const prevState = globalState;
      globalState = { ...prevState, ...state };
      
      // 通知所有订阅者
      notify(globalState, prevState);
      
      return true;
    },
    
    onGlobalStateChange(callback, fireImmediately = false) {
      // 检查是否已存在
      if (deps.has(callback)) {
        console.warn('[qiankun] Duplicate onGlobalStateChange');
        return;
      }
      
      deps.set(callback, callback);
      
      // 是否立即触发
      if (fireImmediately) {
        callback(globalState, globalState);
      }
    },
    
    offGlobalStateChange() {
      // 移除回调需要根据上下文确定
      return false;
    },
  };
}
```

## 主应用状态管理

### 创建全局状态

```typescript
// main.ts
import { initGlobalState } from 'qiankun';

// 定义初始状态
const state = {
  user: {
    id: '',
    name: '',
    avatar: '',
  },
  permissions: [],
  theme: 'light',
  locale: 'zh-CN',
};

// 初始化全局状态
const microAppState = initGlobalState(state);

// 主应用可以订阅状态变化
microAppState.onGlobalStateChange((state, prevState) => {
  console.log('Global state changed:', state);
  
  // 更新主应用的状态
  if (state.theme !== prevState.theme) {
    updateTheme(state.theme);
  }
}, true);

// 登录成功后更新用户信息
function login(token: string) {
  const userInfo = await fetchUserInfo(token);
  microAppState.setGlobalState({ user: userInfo });
}

// 登出时清空状态
function logout() {
  microAppState.setGlobalState({
    user: { id: '', name: '', avatar: '' },
    permissions: [],
  });
}
```

## 子应用状态管理

### 获取 Actions

```typescript
// 子应用通过 props 获取 actions
export async function mount(props) {
  const {
    onGlobalStateChange,
    setGlobalState,
  } = props;
  
  // 获取初始状态
  const currentState = getCurrentState();
  
  // 监听全局状态变化
  onGlobalStateChange((newState) => {
    handleStateChange(newState);
  });
}
```

### 状态同步

```typescript
// 子应用状态管理
let localState = {
  visitedHistory: [],
  cache: {},
};

export async function mount(props) {
  // 订阅全局状态
  props.onGlobalStateChange(
    (newState) => {
      console.log('Global state:', newState);
      
      // 同步主题
      if (newState.theme) {
        document.body.className = newState.theme;
      }
      
      // 同步语言
      if (newState.locale) {
        i18n.locale = newState.locale;
      }
    },
    true // 立即触发
  );
  
  // 上报本地状态
  props.setGlobalState({
    visitedHistory: [...localState.visitedHistory, {
      app: 'sub-app',
      time: Date.now(),
    }],
  });
}
```

## 状态共享模式

### 模式一：主应用管理

```typescript
// 主应用作为状态中心
// 优点：状态集中管理，易于调试
// 缺点：主应用压力较大

// 主应用
const actions = initGlobalState({
  user: userInfo,
  menu: menuConfig,
});

// 子应用只读取状态
props.onGlobalStateChange((state) => {
  console.log('User:', state.user);
});
```

### 模式二：分布式管理

```typescript
// 多个应用都可以修改状态
// 优点：灵活，解耦
// 缺点：状态修改来源分散

// 子应用 A
actions.setGlobalState({
  moduleAData: data,
});

// 子应用 B
actions.setGlobalState({
  moduleBData: data,
});
```

### 模式三：混合模式

```typescript
// 核心状态由主应用管理
// 业务状态由各模块管理

// 主应用管理核心状态
actions.setGlobalState({
  user,
  permissions,
});

// 子应用管理业务状态
actions.setGlobalState({
  selectedItems: [],
  filters: {},
});
```

## 状态变更拦截

### OnBeforeSet 回调

```typescript
export function initGlobalState(state = {}) {
  let globalState = { ...state };
  const listeners = [];
  let onBeforeSetStateCallback: ((prevState, newState) => any) = null;
  
  return {
    setGlobalState(statePatch) {
      const newState = { ...globalState, ...statePatch };
      
      // 拦截状态变更
      if (onBeforeSetStateCallback) {
        const result = onBeforeSetStateCallback(globalState, newState);
        if (result === false) {
          return false; // 取消变更
        }
        globalState = result || newState;
      } else {
        globalState = newState;
      }
      
      // 通知监听者
      listeners.forEach(cb => cb(globalState));
      return true;
    },
    
    onBeforeSetGlobalState(callback) {
      onBeforeSetStateCallback = callback;
    },
  };
}
```

### 使用示例

```typescript
// 拦截非法状态变更
actions.onBeforeSetGlobalState((prevState, newState) => {
  // 检查权限
  if (newState.permissions && !currentUser.isAdmin) {
    console.warn('Permission denied');
    return false; // 拒绝变更
  }
  
  // 验证数据格式
  if (!validateUser(newState.user)) {
    console.warn('Invalid user data');
    return false;
  }
  
  return newState; // 允许变更
});
```

## 性能优化

### 1. 选择性通知

```typescript
// 只通知相关状态变化的订阅者
function notifySelective(state, changedKeys) {
  listeners.forEach(({ callback, watchKeys }) => {
    if (!watchKeys || watchKeys.some(k => changedKeys.includes(k))) {
      callback(state);
    }
  });
}
```

### 2. 防抖通知

```typescript
const notify = debounce((state) => {
  listeners.forEach(cb => cb(state));
}, 100);

actions.setGlobalState = (patch) => {
  globalState = { ...globalState, ...patch };
  notify(globalState);
};
```

### 3. 状态拆分

```typescript
// 将状态拆分为多个独立部分
const userActions = initGlobalState({ user: {} });
const themeActions = initGlobalState({ theme: 'light' });
const localeActions = initGlobalState({ locale: 'zh-CN' });
```

## 实际应用

### 用户认证

```typescript
// 主应用
const actions = initGlobalState({
  token: '',
  user: null,
  isAuthenticated: false,
});

// 登录
async function login(credentials) {
  const response = await api.login(credentials);
  actions.setGlobalState({
    token: response.token,
    user: response.user,
    isAuthenticated: true,
  });
}

// 登出
function logout() {
  actions.setGlobalState({
    token: '',
    user: null,
    isAuthenticated: false,
  });
}

// 子应用
export async function mount(props) {
  props.onGlobalStateChange((state) => {
    if (state.isAuthenticated) {
      // 显示登录后的内容
      showAuthenticatedContent();
    } else {
      // 显示登录页
      showLoginPage();
    }
  }, true);
}
```

### 主题切换

```typescript
// 主应用
const actions = initGlobalState({ theme: 'light' });

function toggleTheme() {
  const newTheme = actions.getGlobalState().theme === 'light' 
    ? 'dark' 
    : 'light';
  actions.setGlobalState({ theme: newTheme });
  document.body.className = newTheme;
}

// 子应用
export async function mount(props) {
  props.onGlobalStateChange((state) => {
    document.documentElement.setAttribute(
      'data-theme',
      state.theme
    );
  });
}
```

### 多语言

```typescript
const actions = initGlobalState({ locale: 'zh-CN' });

// 切换语言
function switchLocale(locale) {
  actions.setGlobalState({ locale });
  i18n.locale = locale;
}

// 子应用
export async function mount(props) {
  props.onGlobalStateChange((state) => {
    i18n.locale = state.locale;
    // 重新渲染组件
    forceUpdate();
  }, true);
}
```

## 最佳实践

### 1. 状态命名规范

```typescript
// ✅ 好的命名
setGlobalState({
  userInfo: { name: '张三' },
  permissions: ['read', 'write'],
});

// ❌ 不好的命名
setGlobalState({
  data: { a: 1 },
  x: ['read'],
});
```

### 2. 最小化状态

```typescript
// ✅ 只存储必要的状态
setGlobalState({
  userId: '123',
});

// ❌ 存储过多状态
setGlobalState({
  allUsers: [...], // 应该子应用自己管理
  cacheData: {...}, // 应该子应用自己管理
});
```

### 3. 及时清理

```typescript
let unsubscribe = null;

export async function mount(props) {
  unsubscribe = props.onGlobalStateChange(handleChange);
}

export async function unmount(props) {
  // 清理订阅
  props.offGlobalStateChange?.();
  unsubscribe = null;
}
```

## 下一步

- [预加载机制](/core/prefetch) - 了解资源预加载