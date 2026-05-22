# 快速开始

## 主应用配置

### 1. 安装依赖

```bash
npm install qiankun
# 或
yarn add qiankun
# 或
pnpm add qiankun
```

### 2. 注册微应用

```javascript
import { registerMicroApps, start } from 'qiankun';

registerMicroApps([
  {
    name: 'reactApp',
    entry: '//localhost:3000',
    container: '#container',
    activeRule: '/app-react',
  },
  {
    name: 'vueApp',
    entry: '//localhost:8080',
    container: '#container',
    activeRule: '/app-vue',
  },
]);

// 启动 qiankun
start({
  sandbox: {
    strictStyleIsolation: true, // 开启严格样式隔离
  },
});
```

### 3. 添加容器元素

```html
<!-- 主应用的 HTML -->
<div id="container"></div>
```

## 子应用配置

### React 子应用

#### 1. 配置 webpack

```javascript
// webpack.config.js
module.exports = {
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};
```

#### 2. 导出生命周期钩子

```javascript
// src/microApp.js
export async function bootstrap() {
  console.log('react app bootstraped');
}

export async function mount(props) {
  console.log('props from main app', props);
  ReactDOM.render(<App />, document.getElementById('root'));
}

export async function unmount() {
  ReactDOM.unmountComponentAtNode(document.getElementById('root'));
}
```

### Vue 子应用

#### 1. 配置 vue.config.js

```javascript
module.exports = {
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};
```

#### 2. 导出生命周期钩子

```javascript
// src/main.js
let instance = null;

function render(props = {}) {
  const { container } = props;
  instance = new Vue({
    el: container ? container.querySelector('#app') : '#app',
    render: h => h(App),
  });
}

if (!window.__POWERED_BY_QIANKUN__) {
  render();
}

export async function bootstrap() {
  console.log('vue app bootstraped');
}

export async function mount(props) {
  render(props);
}

export async function unmount() {
  instance.$destroy();
  instance.$el.innerHTML = '';
  instance = null;
}
```

## 运行示例

### 启动主应用

```bash
cd main-app
npm install
npm run dev
```

### 启动子应用

```bash
cd child-app
npm install
npm run dev
```

访问 `http://localhost:7000/app-react` 即可看到 React 子应用加载。

## 核心 API

### registerMicroApps(apps, lifeCycles)

注册微应用列表。

**参数:**
- `apps`: 微应用配置数组
  - `name`: 应用名称（唯一）
  - `entry`: 应用入口（URL 或配置对象）
  - `container`: 容器元素（CSS 选择器或 DOM 节点）
  - `activeRule`: 激活规则（URL 路径或函数）
  - `props`: 传递给子应用的属性
- `lifeCycles`: 全局生命周期钩子

### start(options)

启动 qiankun。

**参数:**
- `options`: 配置选项
  - `sandbox`: 沙箱配置
  - `jsSandbox`: JS 沙箱类型
  - `singular`: 是否单例模式
  - `prefetch`: 预加载配置

### loadMicroApp(app, configuration, lifeCycles)

手动加载一个微应用。

## 常见问题

### 跨域问题

确保子应用的开发服务器配置了正确的 CORS 头。

### 样式冲突

使用 `strictStyleIsolation: true` 开启严格样式隔离。

### 路由冲突

使用 `base` 配置子应用的基础路径。

## 下一步

- [源码结构](/guide/structure) - 深入了解代码组织
- [整体架构](/architecture/overview) - 理解架构设计