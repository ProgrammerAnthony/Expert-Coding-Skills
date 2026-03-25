# React 组件设计指南

## 组件分层架构

```
src/
├── components/          # 基础通用组件（无业务逻辑）
│   ├── Button/
│   ├── Input/
│   └── Modal/
├── features/            # 业务功能模块（含业务逻辑）
│   ├── user/
│   └── order/
└── pages/               # 页面组件（仅做组合和路由）
    ├── HomePage.tsx
    └── UserPage.tsx
```

**设计原则**：
- 基础组件：只负责 UI 呈现，通过 Props 接收所有数据和回调
- 业务组件：处理业务逻辑，可调用接口、使用全局状态
- 页面组件：负责布局和路由，不写业务逻辑

---

## Props 设计规范

### 语义化命名
```tsx
// 不推荐
<Modal open={true} cb={handleClose} txt="确认删除？" />

// 推荐
<Modal isOpen={true} onClose={handleClose} content="确认删除？" />
```

### 合理使用默认值
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: () => void
}

function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
}: ButtonProps) {
  // ...
}
```

### 避免 Props Drilling（超过 2 层需警觉）
```tsx
// 问题：Props 一层层传递
<Page userId={userId}>
  <Section userId={userId}>
    <UserCard userId={userId} />
  </Section>
</Page>

// 解决方案 1：Context
const UserContext = createContext<string>('')
<UserContext.Provider value={userId}>
  <Page />
</UserContext.Provider>

// 解决方案 2：组件组合
<Page>
  <Section>
    <UserCard userId={userId} />  {/* 直接在顶层传 */}
  </Section>
</Page>
```

---

## 组件复用模式

### 1. Render Props
```tsx
// 适合：需要共享状态逻辑但 UI 完全不同的场景
interface MouseTrackerProps {
  render: (position: { x: number; y: number }) => React.ReactNode
}

function MouseTracker({ render }: MouseTrackerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  return <div onMouseMove={e => setPosition({ x: e.clientX, y: e.clientY })}>
    {render(position)}
  </div>
}
```

### 2. 组合模式（Compound Components）
```tsx
// 适合：多个子组件需要共享状态的复合 UI
function Select({ children, value, onChange }: SelectProps) {
  return (
    <SelectContext.Provider value={{ value, onChange }}>
      <div className="select">{children}</div>
    </SelectContext.Provider>
  )
}

Select.Option = function Option({ value, label }: OptionProps) {
  const { value: selected, onChange } = useContext(SelectContext)
  return <div onClick={() => onChange(value)}>{label}</div>
}

// 使用方式
<Select value={selected} onChange={setSelected}>
  <Select.Option value="a" label="选项A" />
  <Select.Option value="b" label="选项B" />
</Select>
```

### 3. 高阶组件（HOC）
```tsx
// 适合：横切关注点，如权限控制、埋点、错误边界
function withAuth<T extends object>(WrappedComponent: React.ComponentType<T>) {
  return function AuthComponent(props: T) {
    const { isAuthenticated } = useAuth()
    if (!isAuthenticated) return <Navigate to="/login" />
    return <WrappedComponent {...props} />
  }
}
```

---

## Error Boundary 配置

```tsx
class ErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('组件渲染错误:', error, info)
    // 上报错误监控
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div>页面出现错误，请刷新重试</div>
    }
    return this.props.children
  }
}

// 使用
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

---

## 表单处理最佳实践

推荐使用 `react-hook-form`，避免受控组件频繁触发重渲染：

```tsx
import { useForm } from 'react-hook-form'

interface FormValues {
  username: string
  email: string
}

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>()

  const onSubmit = (data: FormValues) => {
    console.log(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('username', { required: '用户名不能为空' })} />
      {errors.username && <span>{errors.username.message}</span>}
      <button type="submit">提交</button>
    </form>
  )
}
```
