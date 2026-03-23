# OWASP Top 10 详细检查清单

## A01 — 访问控制失效

**扫描策略**：枚举所有 API 端点，逐一检查是否有授权校验。

检查项：
- [ ] 每个需要认证的端点是否有身份校验中间件/注解？
- [ ] 资源操作（读/写/删）是否校验当前用户是否拥有该资源？
- [ ] 管理端点是否有独立的角色校验？
- [ ] 目录遍历：静态文件服务是否限制了访问范围？
- [ ] 功能开关：禁用的功能是否在 API 层也做了拦截？

**Python/Django 示例**：
```python
# 危险：缺少所有权校验
def delete_document(request, doc_id):
    doc = Document.objects.get(id=doc_id)
    doc.delete()  # 任何登录用户都能删除任何文档！

# 安全：检查所有权
def delete_document(request, doc_id):
    doc = get_object_or_404(Document, id=doc_id, owner=request.user)
    doc.delete()
```

---

## A02 — 加密失败

检查项：
- [ ] 传输中数据：HTTP 是否强制跳转 HTTPS？
- [ ] 存储中的敏感数据（密码、信用卡号）是否加密？
- [ ] 是否使用了弱哈希（MD5、SHA1）存储密码？（应使用 bcrypt/argon2）
- [ ] 加密密钥是否硬编码或存储在版本控制中？
- [ ] 是否使用了弱随机数生成器（`random` 而非 `secrets`）？
- [ ] TLS 版本是否 ≥ 1.2？是否禁用了 RC4、DES？

---

## A03 — 注入

检查项：
- [ ] 所有 SQL 查询是否使用参数化（不允许字符串拼接）？
- [ ] 用于系统命令的参数是否经过严格白名单校验？
- [ ] XML 处理是否禁用了外部实体（XXE）？
- [ ] LDAP 查询是否对特殊字符进行了转义？
- [ ] 模板渲染是否对用户输入做了转义（防止 SSTI）？

**Java/MyBatis 示例**：
```xml
<!-- 危险：${}会导致SQL注入 -->
<select id="findUser">SELECT * FROM user WHERE name='${name}'</select>

<!-- 安全：#{}预编译参数 -->
<select id="findUser">SELECT * FROM user WHERE name=#{name}</select>
```

---

## A04 — 不安全设计

检查项：
- [ ] 敏感操作是否有限速（登录、密码重置、验证码）？
- [ ] 多步骤流程是否验证了每步的前置条件？（不能跳步）
- [ ] 关键业务操作是否有审计日志？
- [ ] 错误处理是否区分了客户端错误和服务端错误？

---

## A05 — 安全配置错误

检查项：
- [ ] 是否关闭了不必要的功能（默认账号、示例应用、不需要的服务）？
- [ ] 错误信息是否在生产环境中包含了堆栈跟踪？
- [ ] 框架安全头是否配置（CSP、X-Frame-Options、HSTS）？
- [ ] CORS 是否仅允许必要的来源？
- [ ] Spring Boot Actuator 是否暴露了敏感端点？

---

## A06 — 自身存在漏洞和过时的组件

检查项：
- [ ] 所有依赖是否为最新稳定版（或有 CVE 修复的版本）？
- [ ] 是否运行依赖扫描工具？（`pip audit`、`npm audit`、`mvn dependency-check`）
- [ ] 是否有直接引入的不再维护的库？

**快速扫描命令**：
```bash
pip audit                    # Python
npm audit                    # Node.js
mvn dependency-check:check   # Java Maven
govulncheck ./...            # Go
```

---

## A07 — 身份认证和验证失败

检查项：
- [ ] 是否允许弱密码（长度 < 8、无复杂度要求）？
- [ ] 登录失败次数是否有限制？（防暴力破解）
- [ ] 密码重置流程是否安全？（Token 是否一次性、有效期短）
- [ ] 是否在 URL 中传递 Session ID？
- [ ] 是否记录并监控认证失败日志？
- [ ] 多因素认证是否对敏感操作强制启用？

---

## A08 — 软件和数据完整性失败

检查项：
- [ ] 反序列化是否处理不可信数据？（pickle/yaml.load/JSON 类型不安全反序列化）
- [ ] CI/CD 管道是否防止未授权修改？
- [ ] npm/pip 包是否验证了来源完整性？

**Python 危险示例**：
```python
# 危险：pickle 可执行任意代码
import pickle
obj = pickle.loads(user_input)  # RCE！

# 安全替代
import json
data = json.loads(user_input)
```

---

## A09 — 安全日志和监控失败

检查项：
- [ ] 登录、登录失败、权限拒绝是否有日志记录？
- [ ] 日志是否包含了足够的上下文（时间、用户、IP、操作）？
- [ ] 日志是否包含了敏感数据（密码、token、信用卡号）？（不应记录）
- [ ] 是否有针对可疑行为的告警机制？

---

## A10 — 服务端请求伪造（SSRF）

检查项：
- [ ] 所有服务端发出的 HTTP 请求，目标 URL 是否有用户可控部分？
- [ ] 是否对目标 IP 进行了内网地址过滤？
- [ ] 是否限制了允许的协议（仅 http/https）？
- [ ] 是否有 DNS 重绑定防护（先解析 IP 再校验）？

**Go 示例**：
```go
// 危险：直接使用用户提供的URL
func fetchURL(w http.ResponseWriter, r *http.Request) {
    url := r.URL.Query().Get("url")
    resp, _ := http.Get(url)  // SSRF！
}

// 安全：校验目标地址
func fetchURL(w http.ResponseWriter, r *http.Request) {
    url := r.URL.Query().Get("url")
    if !isAllowedURL(url) {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }
    resp, _ := http.Get(url)
}
```
