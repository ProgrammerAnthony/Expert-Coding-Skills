# 数据流追踪常见模式

## 基本概念

**Source（数据入口）**：外部可控的数据来源
**Sink（危险操作）**：执行敏感操作的函数/方法
**Sanitizer（净化器）**：对数据进行验证/转义/白名单过滤的代码

污点追踪目标：Source → [可能经过 Sanitizer] → Sink，若路径存在且净化不足 → 漏洞

---

## 常见 Source 识别

### Web 框架请求参数
```python
# Django
request.GET.get('param')
request.POST.get('param')
request.FILES.get('file')
request.META.get('HTTP_X_FORWARDED_FOR')

# Flask
request.args.get('param')
request.form.get('param')
request.json.get('key')
request.files.get('file')
```

```java
// Spring
@RequestParam String name
@PathVariable Long id
@RequestBody UserDTO dto
request.getHeader("X-Custom-Header")
```

```go
// Gin
c.Query("param")
c.PostForm("param")
c.Param("id")
c.GetHeader("X-Custom")
```

---

## 危险 Sink 识别

### 注入类 Sink
```python
# SQL 注入 Sink
cursor.execute(f"SELECT ... {user_input}")      # 危险
cursor.executemany(query, params)               # 安全（参数化）

# 命令注入 Sink
os.system(user_input)                          # 危险
subprocess.run(user_input, shell=True)         # 危险（shell=True + 字符串）
subprocess.run([cmd, arg], shell=False)        # 相对安全（列表形式）

# 模板注入 Sink
jinja2.Template(user_input).render()           # 危险（用户控制模板）
render_template_string(user_input)             # 危险
```

```java
// SQL 注入
Statement.execute("SELECT ... " + userInput)   // 危险
PreparedStatement.setString(1, param)          // 安全

// 命令注入
Runtime.getRuntime().exec(userInput)           // 危险
```

### 文件操作 Sink
```python
open(user_path)                               # 路径穿越
os.path.join(base, user_path)                 # 注意：join 不防穿越
pathlib.Path(base) / user_path                # 同上，不安全

# 安全做法
safe_path = os.path.realpath(os.path.join(base, user_path))
if not safe_path.startswith(os.path.realpath(base)):
    raise ValueError("路径穿越检测")
```

### SSRF Sink
```python
requests.get(user_url)
requests.post(user_url)
urllib.request.urlopen(user_url)
httpx.get(user_url)
```

### 反序列化 Sink
```python
pickle.loads(data)                            # 危险：可执行任意代码
yaml.load(data)                               # 危险（应使用 yaml.safe_load）
yaml.safe_load(data)                          # 相对安全
```

---

## 净化器识别

### 有效净化（阻断污点传播）
```python
# SQL：参数化查询
cursor.execute("SELECT ... WHERE id = %s", (user_id,))

# 命令：白名单过滤
allowed_cmds = {'ls', 'pwd'}
if cmd not in allowed_cmds:
    raise ValueError("不允许的命令")

# 文件：路径规范化 + 限制
safe = os.path.realpath(os.path.join(base, path))
assert safe.startswith(base)

# HTML：转义
html.escape(user_input)
markupsafe.escape(user_input)
```

### 无效/不足的净化（污点仍然传播）
```python
# 仅删除单引号（不足，有大量绕过方式）
safe = user_input.replace("'", "")
cursor.execute(f"SELECT ... WHERE name='{safe}'")  # 仍然危险

# 仅检查前缀（路径穿越仍可能）
if not user_path.startswith("/etc"):
    open(user_path)  # 仍然危险（../../etc/passwd）

# 仅黑名单（容易被绕过）
if '<script>' not in user_input:
    render_html(user_input)  # 仍然危险（大小写/编码绕过）
```

---

## 常见漏洞数据流示例

### SQL 注入完整链
```
Source: request.GET.get('search')      # 用户输入
  ↓ 无净化（直接使用）
Sink: cursor.execute("... LIKE '%" + search + "%'")
结论：确认 SQL 注入漏洞
```

### 路径穿越完整链
```
Source: request.GET.get('filename')    # 用户输入 "../../etc/passwd"
  ↓ os.path.join('/uploads/', filename)  # 不安全！join 不防穿越
Sink: open(file_path, 'rb').read()
结论：确认路径穿越漏洞
```

### 已有缓解示例
```
Source: request.GET.get('user_id')
  ↓ int(user_id)                        # 类型强制转换（净化器）
Sink: cursor.execute("SELECT ... WHERE id = %s", (uid,))
结论：净化充分，无注入风险（整数转换后不含 SQL 特殊字符）
```

---

## 追踪技巧

1. **从 Sink 向上追踪**：先找所有危险函数调用，再向上找参数来源
2. **关注赋值链**：`x = a; y = x; sink(y)` 中 a → y 是同一污点
3. **注意返回值**：函数返回值也可携带污点
4. **跨函数追踪**：不要因为函数边界而停止追踪
5. **数据库往返**：从用户输入存入数据库，再读出使用 → 二次污染
