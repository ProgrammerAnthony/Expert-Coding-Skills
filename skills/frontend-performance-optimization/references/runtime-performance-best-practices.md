# 运行时性能最佳实践

## 长任务优化

长任务（Long Task）是指在主线程执行时间超过 50ms 的任务，会直接导致页面卡顿和输入延迟。

### 识别长任务
```js
// 使用 PerformanceObserver 监控长任务
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Long Task:', entry.duration, 'ms', entry)
  }
})
observer.observe({ type: 'longtask', buffered: true })
```

### 拆分长任务
```js
// 不推荐：同步处理大量数据，阻塞主线程
function processLargeData(data) {
  return data.map(item => heavyTransform(item))
}

// 推荐：分批处理，用 scheduler 让浏览器有机会响应交互
async function processLargeDataAsync(data) {
  const results = []
  const BATCH_SIZE = 100

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE)
    results.push(...batch.map(item => heavyTransform(item)))

    // 每处理一批后让出主线程
    await new Promise(resolve => setTimeout(resolve, 0))
    // 或使用 scheduler.yield()（更优，仅 Chrome 支持）
    // if ('scheduler' in window) await scheduler.yield()
  }

  return results
}
```

### Web Worker 处理大计算
```js
// worker.js
self.onmessage = function(e) {
  const result = heavyComputation(e.data)
  self.postMessage(result)
}

// main.js
const worker = new Worker('./worker.js')
worker.postMessage(largeData)
worker.onmessage = (e) => {
  console.log('计算结果:', e.data)
}
```

---

## 防抖与节流

```ts
// 防抖（Debounce）：停止触发后延迟执行 — 适合搜索输入、窗口 resize
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return function(...args: Parameters<T>) {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// 节流（Throttle）：固定间隔执行 — 适合 scroll、mousemove
function throttle<T extends (...args: any[]) => any>(fn: T, interval: number) {
  let lastTime = 0
  return function(...args: Parameters<T>) {
    const now = Date.now()
    if (now - lastTime >= interval) {
      lastTime = now
      fn(...args)
    }
  }
}

// React 中使用
const handleSearch = useMemo(
  () => debounce((value: string) => searchApi(value), 300),
  []
)

const handleScroll = useMemo(
  () => throttle(() => updateScrollPosition(), 16), // 60fps
  []
)
```

---

## 渲染性能优化

### 避免强制同步布局（Layout Thrashing）
```js
// 不推荐：读写交替，触发多次布局计算
elements.forEach(el => {
  const height = el.offsetHeight  // 读（触发布局）
  el.style.height = height * 2 + 'px'  // 写
})

// 推荐：先读后写，批量操作
const heights = elements.map(el => el.offsetHeight)  // 统一读
elements.forEach((el, i) => {
  el.style.height = heights[i] * 2 + 'px'  // 统一写
})

// 或使用 requestAnimationFrame
requestAnimationFrame(() => {
  elements.forEach(el => {
    el.style.height = el.offsetHeight * 2 + 'px'
  })
})
```

### CSS 动画优化
```css
/* 推荐：使用 transform 和 opacity 做动画（GPU 加速，不触发布局） */
.card {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.card:hover {
  transform: translateY(-4px);
  opacity: 0.9;
}

/* 不推荐：直接修改 top/left/width/height 触发重排 */
.card:hover {
  top: -4px;  /* 触发 layout */
  margin-top: -4px;  /* 触发 layout */
}

/* will-change 提前告知浏览器（慎用，占用内存） */
.animated-element {
  will-change: transform;  /* 只在需要时加，动画结束后移除 */
}
```

### 虚拟滚动（大列表）
```tsx
// 使用 react-window
import { FixedSizeList } from 'react-window'

const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
  <div style={style}>第 {index} 行</div>
)

function VirtualList({ items }: { items: any[] }) {
  return (
    <FixedSizeList
      height={600}
      width="100%"
      itemCount={items.length}
      itemSize={50}  // 每行高度
    >
      {Row}
    </FixedSizeList>
  )
}
```

---

## 内存泄漏排查

### 常见内存泄漏场景
```tsx
// 1. 未清理的定时器
useEffect(() => {
  const timer = setInterval(() => fetchData(), 5000)
  return () => clearInterval(timer)  // 必须清理
}, [])

// 2. 未移除的事件监听
useEffect(() => {
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])

// 3. 未取消的异步请求（组件卸载后更新 state）
useEffect(() => {
  const controller = new AbortController()

  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(data => setData(data))
    .catch(err => {
      if (err.name !== 'AbortError') console.error(err)
    })

  return () => controller.abort()  // 组件卸载时取消请求
}, [])

// 4. 闭包导致的引用无法释放
// 确保 useCallback 依赖正确，避免持有过期引用
```

### 使用 Chrome DevTools 排查
1. 打开 Memory 面板
2. 拍摄堆快照（Heap Snapshot）
3. 进行可疑操作后再拍一次快照
4. 对比两次快照，查看 `Comparison` 视图
5. 查找数量持续增加的对象类型

---

## 网络请求优化

```tsx
// 1. 请求去重（避免重复接口请求）
const cache = new Map<string, Promise<any>>()

function dedupeRequest(key: string, fetcher: () => Promise<any>) {
  if (cache.has(key)) return cache.get(key)!
  const promise = fetcher().finally(() => cache.delete(key))
  cache.set(key, promise)
  return promise
}

// 2. 接口数据本地缓存
function useUserData(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000,   // 5 分钟内使用缓存
    gcTime: 30 * 60 * 1000,     // 30 分钟后从内存清除
  })
}

// 3. 接口合并（BFF 聚合层）
// 避免页面加载时发出 10+ 个小请求
// 改为 1 个 BFF 接口返回页面所需的所有数据
```
