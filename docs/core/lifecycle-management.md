# 生命周期管理

## 概述

qiankun 通过生命周期钩子管理微应用的启动、挂载和卸载。

## 生命周期钩子

### 三个核心钩子

```typescript
interface MicroAppLifecycle {
  /** 初始化，只调用一次 */
  bootstrap(): Promise<void>;
  
  /** 挂载应用，可多次调用 */
  mount(props?: object): Promise<void>;
  
  /** 卸载应用，可多次调用 */
  unmount(props?: object): Promise<void>;
}
```

### 生命周期状态

```
     ┌─────────┐
     │ BOOTSTRAP│
     └────┬────┘
          │
          ▼
     ┌─────────┐
     │  MOUNT  │◄──────┐
     └────┬────┘       │
          │            │
          ▼            │
    ┌──────────┐       │
    │ MOUNTED  │───────┘
    └────┬─────┘
         │
         ▼
     ┌──────────┐
     │ UNMOUNT  │
     └────┬─────┘
          │
          ▼
     ┌──────────┐
     │ UNMOUNTED│
     └──────────┘
```

## 源码实现

### 生命周期执行

**源码位置:** `packages/qiankun/src/core/loadApp.ts`

```typescript
async function loadApp(
  appConfig: AppConfig,
  configuration: ImportEntryOpts,
  lifeCycles?: LifeCycles,
): Promise<LoadedApp> {
  const { template, execScripts } = await importHTML(
    appConfig.entry,
    configuration,
  );
  
  // 执行脚本获取生命周期
  const { bootstrap, mount, unmount } = await getLifeCycles(
    execScripts,
    lifeCycles,
  );
  
  return {
    name: appConfig.name,
    mount: () => mount(appConfig),
    unmount: () => unmount(appConfig),
    bootstrap: () => bootstrap(appConfig),
  };
}
```

### getLifeCycles 实现

```typescript
async function getLifeCycles(
  execScripts: Function,
  lifeCycles?: LifeCycles,
): Promise<MicroAppLifecycle> {
  let bootstrap, mount, unmount;
  
  // 等待脚本执行完成
  await execScripts(window, {
    afterExec: (exports) => {
      // 从 exports 中提取生命周期
      bootstrap = exports?.bootstrap;
      mount = exports?.mount;
      unmount = exports?.unmount;
      
      // 如果没有导出，使用默认空函数
      if (!bootstrap) bootstrap = async () => {};
      if (!mount) mount = async () => {};
      if (!unmount) unmount = async () => {};
    },
  });
  
  return { bootstrap, mount, unmount };
}
```

## 各框架生命周期实现

### React 应用

```typescript
let root = null;

export async function bootstrap() {
  console.log('React app bootstraped');
}

export async function mount(props) {
  root = ReactDOM.createRoot(
    document.getElementById('root')
  );
  root.render(<App />);
}

export async function unmount() {
  if (root) {
    root.unmount();
    root = null;
  }
}
```

### Vue 应用

```typescript
let instance = null;

function render(props = {}) {
  const { container } = props;
  instance = createApp(App);
  instance.mount(
    container ? container.querySelector('#app') : '#app'
  );
}

export async function bootstrap() {
  console.log('Vue app bootstraped');
}

export async function mount(props) {
  render(props);
}

export async function unmount() {
  instance.unmount();
  instance = null;
}
```

### Angular 应用

```typescript
let app: PlatformRef;

export async function bootstrap() {
  console.log('Angular app bootstraped');
}

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

## 生命周期执行流程

### 完整的执行链

```typescript
// packages/qiankun/src/effects.ts
async function doMount(app: LoadedApp) {
  // 1. 激活沙箱
  app.getSandbox().active();
  
  // 2. 执行 bootstrap（如果还没执行过）
  if (!app.bootstraped) {
    await app.bootstrap();
    app.bootstraped = true;
  }
  
  // 3. 执行 mount
  await app.mount();
  
  // 4. 更新状态
  app.status = 'MOUNTED';
}

async function doUnmount(app: LoadedApp) {
  // 1. 执行 unmount
  await app.unmount();
  
  // 2. 停用沙箱
  app.getSandbox().inactive();
  
  // 3. 清理 DOM
  removeDOM(app.container);
  
  // 4. 更新状态
  app.status = 'UNMOUNTED';
}
```

## 全局生命周期

### 配置全局钩子

```typescript
import { start } from 'qiankun';

start({
  // 全局生命周期钩子
  jsSandbox: true,
});

// 注册应用时也可以指定
registerMicroApps([
  {
    name: 'app1',
    entry: '//localhost:3000',
  },
], {
  beforeLoad: async app => {
    console.log('Before load:', app.name);
  },
  beforeMount: async app => {
    console.log('Before mount:', app.name);
  },
  afterMount: async app => {
    console.log('After mount:', app.name);
  },
  beforeUnmount: async app => {
    console.log('Before unmount:', app.name);
  },
  afterUnmount: async app => {
    console.log('After unmount:', app.name);
  },
});
```

### 全局钩子类型

```typescript
interface LifeCycles<T extends object> {
  beforeLoad?: (app: T) => Promise<any>;
  beforeMount?: (app: T) => Promise<any>;
  afterMount?: (app: T) => Promise<any>;
  beforeUnmount?: (app: T) => Promise<any>;
  afterUnmount?: (app: T) => Promise<any>;
}
```

## 错误处理

### 生命周期错误捕获

```typescript
async function executeLifecycle(
  lifecycle: Function,
  app: LoadedApp,
): Promise<void> {
  try {
    await lifecycle(app);
  } catch (error) {
    console.error(
      `[qiankun] Lifecycle ${lifecycle.name} of ${app.name} failed`,
      error,
    );
    throw error;
  }
}
```

### 超时处理

```typescript
function executeWithTimeout(
  fn: Function,
  timeout = 5000,
): Promise<void> {
  return Promise.race([
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Lifecycle timeout')), timeout)
    ),
    fn(),
  ]);
}
```

## 实际应用

### 完整示例

```typescript
// 主应用
import { registerMicroApps, start } from 'qiankun';

registerMicroApps(
  [
    {
      name: 'reactApp',
      entry: '//localhost:3000',
      container: '#container',
      activeRule: '/react',
    },
  ],
  {
    beforeLoad: app => {
      console.log('Loading app:', app.name);
    },
    beforeMount: app => {
      console.log('Mounting app:', app.name);
    },
    afterUnmount: app => {
      console.log('Unmounted app:', app.name);
    },
  }
);

start();
```

### 子应用

```typescript
// src/microApp.ts
let app: any = null;

export async function bootstrap() {
  console.log('[MicroApp] Bootstrap');
}

export async function mount(props: any) {
  console.log('[MicroApp] Mount', props);
  
  app = new App({
    container: props.container || document.querySelector('#app'),
    props,
  });
  
  app.mount();
}

export async function unmount() {
  console.log('[MicroApp] Unmount');
  
  if (app) {
    app.unmount();
    app = null;
  }
  
  // 清理全局副作用
  props?.onGlobalStateChange?.(null, true);
}
```

## 最佳实践

### 1. 保持幂等性

```typescript
// ✅ 好的做法：幂等的 mount
let instance = null;

export async function mount(props) {
  if (instance) {
    return; // 已经挂载，避免重复
  }
  instance = createApp(App);
  instance.mount('#app');
}

// ❌ 不好的做法：可能重复挂载
export async function mount(props) {
  const instance = createApp(App);
  instance.mount('#app');
}
```

### 2. 彻底清理

```typescript
// ✅ 好的做法：完整清理
export async function unmount(props) {
  instance.unmount();
  instance = null;
  
  // 清理事件监听
  document.removeEventListener('click', handleClick);
  
  // 清理定时器
  if (timer) {
    clearInterval(timer);
  }
}
```

### 3. 处理 Props

```typescript
export async function mount(props) {
  const { container, basePath, user } = props;
  
  // 使用 container 作为挂载点
  const el = container ? container.querySelector('#app') : '#app';
  
  // 配置基础路径
  history.pushState(null, '', basePath);
  
  // 使用用户信息
  initializeApp(user);
}
```

## 下一步

- [状态管理](/core/state-management) - 学习状态共享
- [预加载机制](/core/prefetch) - 了解资源预加载