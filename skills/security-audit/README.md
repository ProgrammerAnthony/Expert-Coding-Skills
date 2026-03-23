# 安全审计专家

专业的白盒静态安全审计技能，覆盖 10 个安全维度，支持三种扫描模式，所有发现均要求代码路径证据。

## 安装

```bash
npx skills add <username>/expert-coding-skills --path skills/security-audit
```

## 使用方式

```
/安全审计
```

或：

```
/security-audit
```

## 扫描模式

| 模式 | 适用场景 | 时间 | 覆盖维度 |
|------|----------|------|----------|
| Quick | CI/CD、快速验证 | 5-10 分钟 | 高危漏洞 + 敏感信息 + CVE |
| Standard | 常规审计 | 30 分钟 | OWASP Top 10 + 认证授权 + 加密 |
| Deep | 重要项目、上线前审计 | 1-2 小时 | 全维度 + 数据流追踪 + 业务逻辑 |

## 10 个安全维度

| # | 维度 | 典型漏洞 |
|---|------|----------|
| D1 | 注入 | SQL注入、命令注入、SSTI |
| D2 | 认证 | 弱密码策略、Session 固定 |
| D3 | 授权 | 水平越权、垂直越权、IDOR |
| D4 | 反序列化 | Pickle RCE、YAML 注入 |
| D5 | 文件操作 | 路径穿越、恶意文件上传 |
| D6 | SSRF | 内网探测、协议滥用 |
| D7 | 加密 | 弱算法、硬编码密钥 |
| D8 | 配置 | 调试模式、信息泄露 |
| D9 | 业务逻辑 | 竞态条件、价格篡改 |
| D10 | 供应链 | 已知CVE、依赖劫持 |

## 支持的技术栈

- **Python**：Django、Flask、FastAPI
- **Java**：Spring Boot、MyBatis、Shiro
- **Go**：Gin、Echo、Fiber
- **Node.js**：Express、Koa、NestJS

## 防幻觉机制

所有漏洞发现必须附带：
- 具体文件路径和行号
- 完整的数据流路径（Source → Sink）
- 实际利用条件说明

无完整证据的疑似漏洞会标记为"待人工验证"而非直接列为确认漏洞。
