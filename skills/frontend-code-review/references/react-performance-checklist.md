# React 性能优化检查清单

## 渲染优化

### React.memo 使用检查
```tsx
// 检查点：子组件是否因父组件渲染而频繁重渲染？
// 使用 React DevTools Profiler 录制渲染情况

// 适用场景：
// 1. 纯展示型子组件（无内部状态）
// 2. 渲染代价高的组件
// 3. 在列表中被渲染多次的组件

// 不适用场景：
// 1. 组件本身渲染非常轻量
// 2. Props 每次都是新对象/数组（memo 无效）

const UserCard = React.memo(({ user }: { user: User }) => {
  return <div>{user.name}</div>
})

// 自定义比较函数（当默认浅比较不满足需求时）
const UserCard = React.memo(
  ({ user }: { user: User }) => <div>{user.name}</div>,
  (prevProps, nextProps) => prevProps.user.id === nextProps.user.id
)
```

### useCallback 使用检查
```tsx
// 检查点：传给子组件的回调函数是否每次都是新引用？

// 不推荐：每次渲染都创建新函数，导致子组件重渲染
function Parent() {
  const [count, setCount] = useState(0)

  const handleDelete = (id: string) => {  // 每次都是新引用
    deleteItem(id)
  }

  return <Child onDelete={handleDelete} />
}

// 推荐：使用 useCallback 缓存函数引用
function Parent() {
  const [count, setCount] = useState(0)

  const handleDelete = useCallback((id: string) => {
    deleteItem(id)
  }, [])  // 依赖不变，引用稳定

  return <Child onDelete={handleDelete} />
}
```

### useMemo 使用检查
```tsx
// 检查点：是否有昂贵的计算在每次渲染时重复执行？

// 不推荐：每次渲染都重新计算
function ProductList({ products, filter }: Props) {
  const filteredProducts = products.filter(p =>  // 可能很耗时
    p.category === filter && p.price < 1000
  )
  return <ul>{filteredProducts.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}

// 推荐：缓存过滤结果
function ProductList({ products, filter }: Props) {
  const filteredProducts = useMemo(
    () => products.filter(p => p.category === filter && p.price < 1000),
    [products, filter]
  )
  return <ul>{filteredProducts.map(p => <li key={p.id}>{p.name}</li>)}</ul>
}
```

---

## useEffect 常见问题

### 无限循环检查
```tsx
// 危险：依赖数组中有对象/数组，每次渲染都是新引用
useEffect(() => {
  fetchData(options)
}, [options])  // options 是对象，每次渲染都不同 → 无限循环

// 修复方案 1：将基础类型值放入依赖
useEffect(() => {
  fetchData({ page: options.page, size: options.size })
}, [options.page, options.size])

// 修复方案 2：useMemo 稳定引用
const stableOptions = useMemo(() => options, [options.page, options.size])
useEffect(() => {
  fetchData(stableOptions)
}, [stableOptions])
```

### 依赖缺失检查
```tsx
// 危险：依赖不完整，逻辑可能出错
function Counter({ step }: { step: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(count + step)  // 使用了 step 但未放入依赖
    }, 1000)
    return () => clearInterval(timer)
  }, [])  // 缺少 step 和 count → step 变化不生效

  // 修复：
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => c + step)  // 函数式更新消除对 count 的依赖
    }, 1000)
    return () => clearInterval(timer)
  }, [step])  // 只需要 step
}
```

---

## 列表渲染检查清单

- [ ] 列表 key 是否稳定且唯一（禁止用 index）
  ```tsx
  // 不推荐
  {items.map((item, index) => <Item key={index} />)}

  // 推荐
  {items.map(item => <Item key={item.id} />)}
  ```

- [ ] 列表长度 > 100 是否使用虚拟滚动
  ```tsx
  import { FixedSizeList } from 'react-window'
  // 或 import { VirtualList } from '@tanstack/react-virtual'
  ```

- [ ] 列表项组件是否用 React.memo 包裹（避免单项更新触发全列表重渲染）

- [ ] 列表数据变更是否使用不可变更新
  ```tsx
  // 不推荐（直接修改）
  list.push(newItem)
  setList(list)

  // 推荐（不可变更新）
  setList(prev => [...prev, newItem])
  ```

---

## 状态设计检查

### 避免冗余状态
```tsx
// 不推荐：total 是冗余状态，可以从 items 计算得出
const [items, setItems] = useState<Item[]>([])
const [total, setTotal] = useState(0)  // 冗余！

// 推荐：从已有状态派生
const [items, setItems] = useState<Item[]>([])
const total = useMemo(() => items.reduce((sum, i) => sum + i.price, 0), [items])
```

### 状态提升检查
```tsx
// 检查点：多个组件需要同一状态，是否提升到公共父组件？
// 常见反模式：每个组件独自维护相同数据的副本
```

---

## React DevTools 使用

### Profiler 分析
1. 安装 React DevTools 浏览器扩展
2. 打开 `Profiler` 面板
3. 点击 `Record` 开始录制
4. 进行页面操作
5. 停止录制
6. 查看哪些组件渲染最频繁、耗时最长
7. 火焰图中灰色 = 未重渲染，其他颜色 = 重渲染（越深越慢）

### 组件高亮
在 React DevTools 中开启"Highlight updates when components render"，页面上重渲染的组件会闪烁高亮，直观发现不必要的重渲染。
