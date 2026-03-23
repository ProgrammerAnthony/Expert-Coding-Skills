# 安全漏洞检查清单

## D1 — 注入类漏洞

### SQL 注入
- [ ] 是否有字符串拼接 SQL？（`"SELECT * FROM users WHERE id=" + user_id`）
- [ ] ORM 查询是否使用了原生 SQL 且参数未参数化？
- [ ] MyBatis `${}` 是否用于用户输入？（应使用 `#{}`）
- [ ] 动态排序字段是否对用户输入做了白名单校验？

### 命令注入
- [ ] `subprocess.run`、`os.system`、`exec()` 等是否包含用户输入？
- [ ] shell=True 是否配合用户可控字符串使用？

### 模板注入（SSTI）
- [ ] Jinja2、Freemarker、Thymeleaf 模板是否渲染了用户输入的字符串？
- [ ] 是否有 `eval()`、`exec()` 执行用户输入？

### LDAP/XPath 注入
- [ ] LDAP 过滤器是否包含未转义的用户输入？

---

## D2 — 认证与会话

- [ ] Token/Cookie 是否有有效期校验？
- [ ] JWT 算法是否指定为强算法（RS256/HS256），是否接受 `alg: none`？
- [ ] 密码是否使用强哈希（bcrypt/argon2）而非 MD5/SHA1？
- [ ] 敏感操作是否要求重新验证身份（如修改密码、转账）？
- [ ] 登录失败是否有次数限制（防暴力破解）？
- [ ] 会话 ID 是否在登录后更新（防会话固定）？

---

## D3 — 授权与访问控制

- [ ] API 是否在业务层校验当前用户对资源的访问权限？
- [ ] 是否存在水平越权风险（用户 A 可访问用户 B 的资源）？
- [ ] 是否存在垂直越权（普通用户执行管理员操作）？
- [ ] 批量 API 是否有分页保护（防止导出全量数据）？
- [ ] CORS 策略是否过于宽松（`Access-Control-Allow-Origin: *` + 凭证）？

---

## D5 — 文件操作

- [ ] 文件路径是否包含用户输入且未做规范化和白名单？（`../../../etc/passwd`）
- [ ] 上传文件是否校验 MIME 类型和文件头（Magic Bytes）而非仅文件扩展名？
- [ ] 上传文件是否存储在 Web 可访问目录且未限制执行权限？
- [ ] 文件下载是否允许指定任意路径？

---

## D6 — SSRF（服务端请求伪造）

- [ ] 服务端是否根据用户提供的 URL 发起 HTTP 请求？
- [ ] 是否对目标地址进行了内网 IP 过滤（127.0.0.1、10.x、172.x、192.168.x）？
- [ ] 是否限制了允许的协议（防止 file://、dict://、gopher://）？

---

## D7 — 加密与密钥管理

- [ ] 是否使用了 DES、MD5、SHA1 等弱加密算法？
- [ ] 密钥/密码是否硬编码在源码或配置文件中？
- [ ] 生成随机 token 是否使用了密码学安全的随机数（`secrets` 模块 / `SecureRandom`）？
- [ ] HTTPS 是否在所有敏感接口强制启用？
- [ ] 加密是否使用了 ECB 模式？（应使用 GCM/CBC + 随机 IV）

---

## D8 — 配置与信息暴露

- [ ] 错误响应是否包含堆栈跟踪、数据库结构等内部信息？
- [ ] debug=True 是否在生产环境启用？
- [ ] 是否有敏感信息（密码、token）写入日志？
- [ ] 是否暴露了不必要的管理接口（Actuator、phpinfo、.env 文件）？
- [ ] 依赖库是否有已知 CVE？

---

## D9 — 业务逻辑

- [ ] 是否存在竞态条件（如并发扣款、重复提交）？
- [ ] 价格/金额是否在服务端校验（不信任客户端传来的价格）？
- [ ] 状态机转换是否有完整性校验（防止非法状态跳转）？
- [ ] 批量操作是否有上限保护（防止 DoS）？

---

## 高危代码模式速查（中文项目常见）

```python
# Python 高危
eval(user_input)
os.system(f"ping {host}")
subprocess.run(cmd, shell=True)
open(f"/data/{filename}")              # 路径穿越

# Java/Spring 高危  
@Query("SELECT * FROM user WHERE name='" + name + "'")  # SQL 注入
Runtime.getRuntime().exec(cmd)         # 命令注入
new File(basePath + userPath)          # 路径穿越

# Go 高危
exec.Command("sh", "-c", userInput)   # 命令注入
ioutil.ReadFile(userPath)             # 路径穿越
```
