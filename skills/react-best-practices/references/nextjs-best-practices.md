# Next.js 开发最佳实践

## App Router vs Pages Router

Next.js 13+ 推荐使用 **App Router**，新项目应默认选择 App Router。

| 对比项 | App Router | Pages Router |
|--------|-----------|--------------|
| 渲染模式 | Server Components（默认） + Client Components | 客户端渲染为主 |
| 数据获取 | fetch + async/await（组件内） | getServerSideProps / getStaticProps |
| 代码分割 | 自动按路由分割 | 自动按页面分割 |
| 流式渲染 | 支持（Suspense） | 不支持 |
| 稳定性 | 稳定（Next.js 14+） | 成熟稳定 |

---

## Server Components vs Client Components

```tsx
// Server Component（默认）：在服务端渲染，不发送 JS 到客户端
// 适合：数据获取、静态内容、访问后端资源
async function UserProfile({ userId }: { userId: string }) {
  const user = await db.user.findUnique({ where: { id: userId } })  // 直接访问数据库
  return <div>{user.name}</div>
}

// Client Component：加 'use client' 指令
// 适合：交互、浏览器 API、useState/useEffect
'use client'
function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false)
  return <button onClick={() => setLiked(!liked)}>{liked ? '已赞' : '点赞'}</button>
}
```

**原则**：尽量让组件保持 Server Component，只在必须使用交互/状态时才加 `'use client'`，且尽量将 Client Component 下沉到叶子节点。

---

## 渲染模式选择

| 渲染模式 | 适用场景 | 配置方式 |
|----------|----------|----------|
| SSG（静态生成） | 内容不频繁变化（博客、文档、营销页） | `export const dynamic = 'force-static'` |
| ISR（增量静态再生） | 内容定期更新（新闻、电商列表） | `export const revalidate = 3600` |
| SSR（服务端渲染） | 内容实时更新、个性化内容 | `export const dynamic = 'force-dynamic'` |
| CSR（客户端渲染） | 高度交互的仪表盘、后台管理 | 使用 `'use client'` + useEffect 获取数据 |

---

## 数据获取最佳实践

```tsx
// 1. 并行请求（避免瀑布流）
async function Dashboard() {
  // 不推荐：串行请求
  // const user = await fetchUser()
  // const posts = await fetchPosts(user.id)

  // 推荐：并行请求
  const [user, posts] = await Promise.all([
    fetchUser(),
    fetchPosts(),
  ])

  return <div>...</div>
}

// 2. 利用 fetch 缓存
async function fetchUser(id: string) {
  const res = await fetch(`/api/users/${id}`, {
    next: { revalidate: 60 },  // 60 秒后重新验证
  })
  return res.json()
}

// 3. Server Actions（表单提交）
async function createUser(formData: FormData) {
  'use server'
  const name = formData.get('name')
  await db.user.create({ data: { name } })
  revalidatePath('/users')
}
```

---

## 路由与导航

```tsx
// 文件系统路由结构
app/
├── layout.tsx           # 根布局（所有页面共享）
├── page.tsx             # 首页 /
├── (marketing)/         # 路由分组（不影响 URL）
│   ├── about/page.tsx   # /about
│   └── blog/page.tsx    # /blog
├── dashboard/
│   ├── layout.tsx       # 仪表盘布局
│   └── page.tsx         # /dashboard
└── api/
    └── users/route.ts   # API 路由 /api/users

// 动态路由
app/users/[id]/page.tsx  // /users/123
app/blog/[...slug]/page.tsx  // /blog/a/b/c
```

```tsx
// 导航
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// 声明式导航（推荐）
<Link href="/about" prefetch>关于</Link>

// 编程式导航
const router = useRouter()
router.push('/dashboard')
router.replace('/login')  // 不保留历史记录
```

---

## 图片与字体优化

```tsx
// 图片优化：使用 next/image
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority          // 首屏图片加 priority，触发 preload
  placeholder="blur"  // 模糊占位，避免布局偏移
/>

// 字体优化：使用 next/font
import { Inter, Noto_Sans_SC } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
const notoSansSC = Noto_Sans_SC({
  subsets: ['chinese-simplified'],
  weight: ['400', '700'],
  display: 'swap',  // 避免 FOIT
})
```

---

## 环境变量规范

```bash
# .env.local（本地开发，不提交 git）
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...

# 前端可访问的变量必须加 NEXT_PUBLIC_ 前缀
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

```tsx
// 访问方式
const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL  // 客户端可访问
const dbUrl = process.env.DATABASE_URL               // 仅服务端可访问
```

---

## Middleware 使用

```tsx
// middleware.ts（项目根目录）
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')

  // 未登录重定向到登录页
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],  // 只匹配需要鉴权的路由
}
```

---

## 性能优化检查清单

- [ ] Server Components 比例 > 80%，减少客户端 JS
- [ ] 首屏图片添加 `priority` 属性
- [ ] 非首屏图片使用懒加载（默认）
- [ ] 使用 `next/font` 避免字体布局偏移
- [ ] 路由使用 `<Link>` 自动 prefetch
- [ ] API 路由使用合理的 Cache-Control 策略
- [ ] 使用 `next build && next start` 测试生产环境性能
