# 前端安全检查清单

## XSS（跨站脚本攻击）

### 高危操作检查
```tsx
// 危险：直接将用户输入注入 HTML
element.innerHTML = userInput  // 高危！
document.write(userInput)      // 高危！
<div dangerouslySetInnerHTML={{ __html: userInput }} />  // 高危！

// 安全做法：使用文本节点或转义
element.textContent = userInput  // 安全
// 或使用专业库进行 HTML 净化
import DOMPurify from 'dompurify'
element.innerHTML = DOMPurify.sanitize(userInput)  // 净化后安全
```

### eval 类函数检查
```js
// 高危：动态执行代码
eval(userInput)
new Function(userInput)
setTimeout(userInput, 0)   // 字符串形式高危

// 安全做法
setTimeout(() => {}, 0)  // 函数形式安全
```

### URL 参数注入
```tsx
// 危险：直接将 URL 参数用作链接
const { redirect } = useSearchParams()
<a href={redirect}>返回</a>  // 可能被注入 javascript: 协议

// 安全做法：验证 URL 协议
function isSafeUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.origin)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
<a href={isSafeUrl(redirect) ? redirect : '/'}>返回</a>
```

---

## 敏感信息泄漏

### 检查清单
- [ ] 源代码中不含 API Key、密钥、Token、数据库凭证
- [ ] `console.log` 中不含敏感用户数据（生产环境）
- [ ] LocalStorage / SessionStorage 不存储明文密码、Token
- [ ] 前端代码不暴露内部 API 地址、数据库结构
- [ ] Git 历史中没有提交过敏感信息（使用 git-secrets 检查）

```bash
# 检查敏感信息
npm install -g git-secrets
git secrets --scan

# 常见敏感信息正则
# API Key: /[A-Za-z0-9]{32,}/
# JWT: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/
# AWS: /AKIA[0-9A-Z]{16}/
```

### 环境变量规范
```bash
# .env（提交到 git，存放默认配置）
NEXT_PUBLIC_APP_NAME=MyApp
NEXT_PUBLIC_API_URL=https://api.example.com

# .env.local（不提交到 git，存放真实密钥）
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-key

# 确保 .env.local 在 .gitignore 中
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

---

## CSRF（跨站请求伪造）

```tsx
// 检查：敏感操作是否添加了 CSRF 保护？
// 方案 1：同源检测（Referer + Origin 头）
// 方案 2：CSRF Token

// React 中在请求头中携带 CSRF Token
async function apiRequest(url: string, options: RequestInit) {
  const csrfToken = document.cookie
    .split(';')
    .find(c => c.trim().startsWith('csrf-token='))
    ?.split('=')[1]

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': csrfToken ?? '',
    },
  })
}
```

---

## 权限控制

```tsx
// 前端权限校验（仅用于 UI 展示，后端必须同样校验！）

// 路由级权限保护
function ProtectedRoute({ children, requiredRole }: Props) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && !user.roles.includes(requiredRole)) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}

// 按钮级权限控制
function DeleteButton({ resourceId }: Props) {
  const { user } = useAuth()
  const canDelete = user?.permissions.includes('resource:delete')

  if (!canDelete) return null  // 无权限不显示

  return (
    <button onClick={() => handleDelete(resourceId)}>
      删除
    </button>
  )
}

// 警告：前端权限控制只是 UI 层面，API 请求必须由后端验证权限！
```

---

## 第三方依赖安全

```bash
# 检查已知安全漏洞
npm audit

# 修复低风险漏洞
npm audit fix

# 查看详细报告
npm audit --json > audit-report.json

# 使用 Snyk 进行更全面的安全扫描
npx snyk test

# CI 中自动检查（GitHub Actions）
- name: Security audit
  run: npm audit --audit-level=high
```

### 依赖锁定
```bash
# 使用 lockfile 锁定依赖版本（不要删除 package-lock.json 或 yarn.lock）
# 定期升级依赖修复安全漏洞
npm update
npx npm-check-updates -u  # 查看可升级的包
```

---

## Content Security Policy（CSP）

```html
<!-- 通过 HTTP 头或 meta 标签配置 CSP -->
<meta http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' 'nonce-{RANDOM}';
    style-src 'self' 'unsafe-inline';
    img-src 'self' https: data:;
    connect-src 'self' https://api.example.com;
    font-src 'self' https://fonts.gstatic.com;
    frame-ancestors 'none';
  ">
```

**CSP 配置原则**：
- `default-src 'self'`：默认只允许同源资源
- 禁止 `'unsafe-eval'`：防止 XSS 利用 eval
- 限制 `connect-src`：防止数据被发送到外部域
- `frame-ancestors 'none'`：防止点击劫持

---

## Clickjacking（点击劫持）

```nginx
# Nginx 配置防止被嵌入 iframe
add_header X-Frame-Options "DENY";
# 或更现代的 CSP
add_header Content-Security-Policy "frame-ancestors 'none'";
```

---

## 安全审查总结

| 风险等级 | 问题类型 | 必须修复 |
|----------|----------|----------|
| 严重 | XSS（innerHTML + 用户输入） | 是 |
| 严重 | 硬编码敏感信息（API Key、密码） | 是 |
| 高 | 权限校验仅在前端 | 是 |
| 高 | 依赖中含高危漏洞（npm audit high） | 是 |
| 中 | 未设置 CSRF 防护 | 建议 |
| 中 | 缺少 CSP 配置 | 建议 |
| 低 | console.log 打印敏感数据 | 建议 |
