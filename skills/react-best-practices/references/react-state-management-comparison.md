# React 状态管理方案对比

## 选型决策树

```
你的项目需要全局状态管理吗？
│
├─ 否 → 使用 useState / useReducer（组件内状态）
│
└─ 是
   │
   ├─ 状态更新频率高、组件数量多？
   │  ├─ 否（中小项目） → Context API + useReducer
   │  └─ 是 → 考虑专业状态管理库
   │
   ├─ 团队规模 / 项目复杂度？
   │  ├─ 小团队 / 中型项目 → Zustand（轻量简洁）
   │  ├─ 中团队 / 大型项目 → Redux Toolkit（成熟生态）
   │  └─ 原子化状态偏好 → Jotai / Recoil
   │
   └─ 服务端数据（接口请求结果）→ TanStack Query / SWR（不要放进全局store）
```

---

## 方案详细对比

| 方案 | 适用规模 | 学习成本 | 性能 | 生态 | 推荐场景 |
|------|----------|----------|------|------|----------|
| useState + useReducer | 小型 | 极低 | 优 | React内置 | 组件级状态 |
| Context API | 小~中型 | 低 | 中（需优化） | React内置 | 低频全局状态（主题/语言） |
| Zustand | 中型 | 低 | 优 | 丰富 | 中型项目，追求简洁 |
| Jotai | 中型 | 低 | 优 | 一般 | 细粒度原子状态 |
| Redux Toolkit | 大型 | 中 | 优 | 极丰富 | 大型复杂业务，多人协作 |
| TanStack Query | 任意 | 中 | 优 | 丰富 | 服务端数据管理 |

---

## Context API 使用规范

```tsx
// 拆分 Context，避免大 Context 导致全局重渲染
// 不推荐：一个 Context 塞所有状态
const AppContext = createContext({ user, theme, cart, ... })

// 推荐：按关注点拆分
const UserContext = createContext<User | null>(null)
const ThemeContext = createContext<'light' | 'dark'>('light')

// 配合 useReducer 使用
function UserProvider({ children }: { children: ReactNode }) {
  const [user, dispatch] = useReducer(userReducer, null)
  return (
    <UserContext.Provider value={{ user, dispatch }}>
      {children}
    </UserContext.Provider>
  )
}
```

**Context 适用场景**：主题切换、国际化语言、用户登录状态（低频更新）  
**Context 不适合**：高频更新的状态（如实时数据、表单状态）

---

## Zustand 最佳实践

```tsx
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UserStore {
  user: User | null
  setUser: (user: User) => void
  logout: () => void
}

// 使用 devtools + persist 中间件
const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        setUser: (user) => set({ user }),
        logout: () => set({ user: null }),
      }),
      { name: 'user-store' }
    )
  )
)

// 使用 selector 避免不必要的重渲染
function UserAvatar() {
  const avatar = useUserStore(state => state.user?.avatar)  // 只订阅 avatar
  return <img src={avatar} />
}
```

---

## Redux Toolkit 最佳实践

```tsx
// store/userSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const fetchUser = createAsyncThunk(
  'user/fetchUser',
  async (userId: string) => {
    const response = await api.getUser(userId)
    return response.data
  }
)

const userSlice = createSlice({
  name: 'user',
  initialState: { data: null, loading: false, error: null } as UserState,
  reducers: {
    logout: (state) => {
      state.data = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => { state.loading = true })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? '请求失败'
      })
  },
})
```

---

## TanStack Query（服务端状态）

```tsx
// 服务端状态不要放进 Redux/Zustand，使用 TanStack Query 管理
import { useQuery, useMutation } from '@tanstack/react-query'

// 查询
function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
    staleTime: 5 * 60 * 1000,  // 5 分钟内不重新请求
  })
  // ...
}

// 变更（增删改）
function DeleteUser() {
  const mutation = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })  // 自动刷新列表
    },
  })
  // ...
}
```
