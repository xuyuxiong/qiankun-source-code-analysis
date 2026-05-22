# 常见问题

## 样式相关

### Q: 子应用样式会污染主应用？

**A:** 开启样式隔离

```typescript
start({
  sandbox: {
    experimentalStyleIsolation: true,
  },
});
```

或者在子应用中使用 CSS Modules / CSS-in-JS。

### Q: 子应用样式不生效？

**A:** 检查以下几点：

1. 确保子应用的 CSS 已正确加载
2. 检查样式选择器的优先级
3. 确认没有开启严格的样式隔离导致冲突

```typescript
// 子应用样式使用更具体的选择器
.app1-container .button {
  /* 而不是只写 .button */
}
```

### Q: 主应用和子应用都使用 antd，样式冲突？

**A:** 使用独立的 CSS 前缀或版本

```less
// 方案 1：使用 CSS Modules
@import '~antd/dist/antd.less';

// 方案 2：使用 Less 变量覆盖
@primary-color: #1890ff;

// 方案 3：配置 webpack 别名
resolve: {
  alias: {
    'antd': path.resolve(__dirname, '../node_modules/antd'),
  },
}
```

## 路由相关

### Q: 子应用路由不工作？

**A:** 检查 base 配置

```typescript
// Vue Router
const router = createRouter({
  history: createWebHistory('/app1'), // 必须与 activeRule 匹配
  routes,
});

// React Router
<BrowserRouter basename="/app1">
  <Routes />
</BrowserRouter>
```

### Q: 刷新后 404？

**A:** 服务端需要配置路由回退

```nginx
# Nginx 配置
location /app1 {
  try_files $uri $uri/ /app1/index.html;
}
```

```apache
# Apache .htaccess
RewriteRule ^app1(.*)$ /app1/index.html [QSA,L]
```

### Q: 子应用之间的路由跳转？

**A:** 使用主应用统一导航

```typescript
// 子应用通过 props 获取导航方法
export async function mount(props) {
  const { navigate } = props;
  
  // 跳转到另一个子应用
  navigate('/app2/home');
}
```

## 通信相关

### Q: 子应用之间如何通信？

**A:** 通过 GlobalState

```typescript
// app1
actions.setGlobalState({
  sharedData: data,
});

// app2
actions.onGlobalStateChange((state) => {
  console.log('Data from app1:', state.sharedData);
});
```

### Q: props 传递的数据如何更新？

**A:** props 是初始化时传递的，如需动态更新，使用 GlobalState

```typescript
// 主应用可以使用 GlobalState 传递动态数据
actions.setGlobalState({
  userData: newUserData,
});

// 子应用订阅 GlobalState
actions.onGlobalStateChange((state) => {
  console.log('User updated:', state.userData);
});
```

## 生命周期相关

### Q: 子应用卸载后定时任务还在执行？

**A:** 需要在 unmount 中清理

```typescript
let timer = null;

export async function mount() {
  timer = setInterval(() => {
    doSomething();
  }, 1000);
}

export async function unmount() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
```

### Q: 子应用卸载后事件监听还在？

**A:** 在 unmount 中移除监听器

```typescript
export async function mount() {
  window.addEventListener('resize', handleResize);
}

export async function unmount() {
  window.removeEventListener('resize', handleResize);
}
```

### Q: 子应用重新进入后状态丢失？

**A:** 这是预期行为，需要在 GlobalState 或本地存储持久化

```typescript
let cachedState = localStorage.getItem('appState');

export async function mount() {
  // 从缓存恢复状态
  if (cachedState) {
    restoreState(JSON.parse(cachedState));
  }
}

export async function unmount() {
  // 保存状态
  localStorage.setItem('appState', JSON.stringify(currentState));
}
```

## 跨域相关

### Q: 子应用跨域请求失败？

**A:** 配置代理或 CORS

```javascript
// webpack devServer
devServer: {
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
  proxy: {
    '/api': {
      target: 'http://backend.com',
      changeOrigin: true,
    },
  },
},
```

### Q: 主应用和子应用域名不同？

**A:** 确保 CORS 配置正确

```javascript
// 后端配置 CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});
```

## 性能相关

### Q: 子应用加载慢？

**A:** 优化建议：

1. 启用预加载
2. 使用 CDN 分发资源
3. 代码分割
4. 资源压缩
5. 开启 gzip

```typescript
start({
  prefetch: true,
});
```

### Q: 内存占用过高？

**A:** 检查：

1. 是否有未清理的定时器
2. 是否有未移除的事件监听
3. 是否有内存泄漏
4. 是否缓存了过多数据

## 构建相关

### Q: 子应用构建失败？

**A:** 检查 webpack 配置

```javascript
// publicPath 配置
output: {
  publicPath: 'auto', // 或者具体的 CDN 地址
  library: 'app1',
  libraryTarget: 'umd',
}
```

### Q: 子应用部署后资源 404？

**A:** 静态资源路径问题

```javascript
// Vite 配置
export default {
  base: '/app1/', // 部署路径
};

// Webpack 配置
output: {
  publicPath: '/app1/',
},
```

## 框架特定问题

### React

**Q: React 18 严格模式导致双重挂载？**

```typescript
// 使用 createRoot
export async function mount(props) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
  
  // 保存 root 引用用于 unmount
  return () => root.unmount();
}
```

### Vue

**Q: Vue 3 如何正确卸载？**

```typescript
let instance = null;

export async function mount(props) {
  instance = createApp(App);
  instance.mount('#app');
}

export async function unmount() {
  instance.unmount();
  instance = null;
}
```

### Angular

**Q: Angular 如何集成？**

```typescript
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

let app: PlatformRef;

export async function mount(props) {
  app = await platformBrowserDynamic().bootstrapModule(AppModule);
}

export async function unmount() {
  if (app) {
    app.destroy();
    app = null;
  }
}
```

## 调试技巧

### 开启调试日志

```typescript
start({
  sandbox: {
    experimentalStyleIsolation: true,
  },
});

// 在控制台添加更多日志
console.log('[qiankun] Active apps:', getMountedApps());
```

### 检查沙箱状态

```typescript
// 检查全局变量是否被污染
console.log('Global variables:', getGlobalVariables());

// 检查样式冲突
console.log('Styles:', document.styleSheets);
```

## 其他

### Q: qiankun 支持 IE 吗？

**A:** qiankun 2.x 支持 IE11+（需要使用快照沙箱），3.x 不再支持 IE。

### Q: 如何升级 qiankun 版本？

**A:** 查看官方迁移指南

```bash
# 升级
npm install qiankun@latest

# 检查破坏性变更
# 参考：https://github.com/umijs/qiankun/releases
```

### Q: 遇到问题时如何排查？

**A:** 排查步骤：

1. 查看控制台错误信息
2. 检查网络请求状态
3. 确认生命周期钩子正确导出
4. 验证路由配置
5. 检查跨域配置
6. 查看官方文档和 Issue

## 资源

- [官方文档](https://qiankun.umijs.org/)
- [GitHub Issues](https://github.com/umijs/qiankun/issues)
- [示例项目](https://github.com/umijs/qiankun/tree/master/examples)