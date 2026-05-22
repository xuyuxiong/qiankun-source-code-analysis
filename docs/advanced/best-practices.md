# 最佳实践

## 概述

基于社区实践和经验总结的 qiankun 最佳实践指南。

## 项目结构

### 主应用结构

```
main-app/
├── src/
│   ├── layouts/           # 布局组件
│   ├── pages/             # 页面组件
│   ├── components/        # 公共组件
│   ├── micro-apps/        # 微应用配置
│   │   ├── config.ts      # 微应用配置
│   │   └── index.tsx      # 微应用加载器
│   ├── utils/             # 工具函数
│   ├── store/             # 状态管理
│   └── styles/            # 全局样式
├── public/
├── package.json
└── tsconfig.json
```

### 子应用结构

```
sub-app/
├── src/
│   ├── components/        # 组件
│   ├── pages/             # 页面
│   ├── utils/             # 工具
│   ├── store/             # 状态
│   ├── micro-app/         # 微应用入口
│   │   ◂── lifecycle.ts   # 生命周期
│   │   └── index.ts       # 导出
│   └── index.tsx          # 应用入口
├── public/
├── package.json
└── .eslintrc.js
```

## 路由配置

### 主应用路由

```typescript
// routes.ts
export const routes = [
  {
    path: '/app1/*',
    component: () => <div id="container1" />,
  },
  {
    path: '/app2/*',
    component: () => <div id="container2" />,
  },
];
```

### 子应用路由

```typescript
// 使用 browserHistory
const router = createRouter({
  history: createWebHistory('/app1'), // 与 activeRule 匹配
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
});
```

## 状态管理

### 全局状态设计

```typescript
// 主应用
import { initGlobalState } from 'qiankun';

// 只存储全局需要的状态
const initialState = {
  // 用户信息
  user: { id: '', name: '', avatar: '' },
  
  // 认证状态
  isAuthenticated: false,
  token: '',
  
  // 系统配置
  theme: 'light',
  locale: 'zh-CN',
  
  // 权限
  permissions: [],
};

const actions = initGlobalState(initialState);
```

### 避免状态过度共享

```typescript
// ❌ 不好的做法：所有状态都共享
actions.setGlobalState({
  user,
  productList,      // 不应该共享
  shoppingCart,     // 不应该共享
  userPreferences,  // 不应该共享
});

// ✅ 好的做法：只共享必要的
actions.setGlobalState({
  user,
  theme,
  locale,
});

// 子应用自己的状态自己管理
const localState = reactive({
  productList: [],
  shoppingCart: [],
});
```

## 通信模式

### Props 传递

```typescript
// 主应用
loadMicroApp({
  name: 'app1',
  entry: '//localhost:3000',
  props: {
    // 基础配置
    baseURL: '/api',
    token: getToken(),
    
    // 回调函数
    onLogout: () => handleLogout(),
    onNavigate: (path) => navigate(path),
    
    // 用户信息
    user: getCurrentUser(),
  },
});
```

### 事件通信

```typescript
// 定义事件类型
interface AppEvents {
  'user:login': User;
  'user:logout': void;
  'theme:change': 'dark' | 'light';
}

// 发布事件
function emitEvent<K extends keyof AppEvents>(
  type: K,
  detail: AppEvents[K]
) {
  const event = new CustomEvent(type, { detail });
  window.dispatchEvent(event);
}

// 订阅事件
function subscribeEvent<K extends keyof AppEvents>(
  type: K,
  handler: (detail: AppEvents[K]) => void
) {
  const handlerWrapper = (e: CustomEvent) => handler(e.detail);
  window.addEventListener(type, handlerWrapper);
  return () => window.removeEventListener(type, handlerWrapper);
}
```

## 错误处理

### 全局错误边界

```typescript
// 注册微应用
registerMicroApps(
  [
    {
      name: 'app1',
      entry: '//localhost:3000',
    },
  ],
  {
    async beforeLoad(app) {
      try {
        await loadDependencies(app);
      } catch (error) {
        console.error(`Error loading ${app.name}:`, error);
        throw error;
      }
    },
    
    async beforeMount(app) {
      try {
        await validateApp(app);
      } catch (error) {
        console.error(`Error mounting ${app.name}:`, error);
        throw error;
      }
    },
  }
);
```

### 子应用错误处理

```typescript
// 错误边界组件
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error, info) {
    // 上报错误
    reportError(error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorPage />;
    }
    return this.props.children;
  }
}

// 使用
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

## 样式隔离

### CSS Modules

```typescript
// styles.module.css
.button {
  color: red;
}

// App.tsx
import styles from './styles.module.css';

<button className={styles.button}>Click</button>
```

### CSS-in-JS

```typescript
import styled from 'styled-components';

const Button = styled.button`
  color: red;
  &:hover {
    color: blue;
  }
`;
```

### Scoped 样式配置

```typescript
start({
  sandbox: {
    experimentalStyleIsolation: true, // CSS 作用域
    strictStyleIsolation: false,      // 不使用 Shadow DOM
  },
});
```

## 构建配置

### Webpack 配置

```javascript
// webpack.config.js
module.exports = {
  output: {
    publicPath: 'auto', // 自动判断
    library: 'app1',    // 库名称
    libraryTarget: 'umd',
    globalObject: 'window',
  },
  
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    historyApiFallback: true,
  },
  
  externals: {
    // 共享依赖
    'react': 'React',
    'react-dom': 'ReactDOM',
  },
};
```

### Babel 配置

```javascript
// .babelrc
{
  "presets": [
    "@babel/preset-env",
    "@babel/preset-react"
  ],
  "plugins": [
    ["@babel/plugin-transform-runtime"],
    ["import", { "libraryName": "antd" }]
  ]
}
```

## 部署策略

### 独立部署

```
CDN/
├── main-app/          # 主应用
│   └── index.html
├── app1/              # 子应用 1
│   └── index.html
└── app2/              # 子应用 2
    └── index.html
```

### 主应用配置

```typescript
registerMicroApps([
  {
    name: 'app1',
    entry: '//cdn.example.com/app1/index.html',
    container: '#container',
    activeRule: '/app1',
  },
]);
```

## 测试策略

### 单元测试

```typescript
// lifecycle.test.ts
describe('MicroApp Lifecycle', () => {
  it('should bootstrap successfully', async () => {
    const mockProps = {};
    await bootstrap(mockProps);
    expect(initialized).toBe(true);
  });
  
  it('should mount successfully', async () => {
    const container = document.createElement('div');
    await mount({ container });
    expect(container.children.length).toBeGreaterThan(0);
  });
  
  it('should cleanup on unmount', async () => {
    await unmount();
    expect(hasMemoryLeaks()).toBe(false);
  });
});
```

### E2E 测试

```typescript
// e2e/micro-app.spec.ts
test('should load micro app', async () => {
  await page.goto('/app1');
  await page.waitForSelector('#app1-container');
  expect(await page.textContent('#app1-container')).toContain('Welcome');
});
```

## 监控告警

### 性能监控

```typescript
// 上报性能指标
function reportPerformance() {
  const metrics = {
    fcp: getFCP(),
    lcp: getLCP(),
    fid: getFID(),
    cls: getCLS(),
  };
  
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify({
      appName,
      metrics,
      timestamp: Date.now(),
    }),
  });
}
```

### 错误监控

```typescript
// 错误上报
window.onerror = function(message, source, lineno, colno, error) {
  fetch('/api/error', {
    method: 'POST',
    body: JSON.stringify({
      message,
      source,
      lineno,
      colno,
      stack: error?.stack,
      appName,
    }),
  });
};
```

## 文档规范

### README 模板

```markdown
# 微应用名称

## 简介
应用描述...

## 技术栈
- React 18
- TypeScript
- Ant Design

## 开发
```bash
npm install
npm run dev
```

## 生命周期
- bootstrap: 初始化
- mount: 挂载渲染
- unmount: 卸载清理

## Props
| 名称 | 类型 | 说明 |
|-----|------|------|
| token | string | 认证 Token |
| user | User | 用户信息 |
```

## 检查清单

### 上线前检查

- [ ] 样式隔离正确
- [ ] 无全局变量污染
- [ ] 侧效应完全清理
- [ ] 错误边界完善
- [ ] 性能达标
- [ ] 文档完整
- [ ] 监控配置

### 日常维护

- [ ] 依赖及时更新
- [ ] 性能持续监控
- [ ] 错误及时处理
- [ ] 文档持续完善

## 下一步

- [常见问题](/advanced/faq) - 查看 FAQ