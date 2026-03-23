---
name: security-audit
description: "对项目代码进行专业的白盒安全审计，覆盖 10 个安全维度（注入、认证、授权、反序列化、文件操作、SSRF、加密、配置、业务逻辑、供应链），支持 Quick/Standard/Deep 三种扫描模式。触发词：安全审计、security audit、代码安全、安全扫描、漏洞检测、安全检查、渗透测试、安全评估。"
---

# 安全审计专家

铁律：所有发现必须有**代码路径证据**，禁止无中生有。报告结论基于静态分析事实，不做无证据的推测。

## 扫描模式选择

启动时询问用户选择模式（默认 Standard）：

```
请选择扫描模式：
1. Quick（快速扫描，约 5-10 分钟）— 高危漏洞 + 敏感信息 + 已知 CVE
2. Standard（标准扫描，约 30 分钟）— OWASP Top 10 + 认证授权 + 加密
3. Deep（深度扫描，约 1-2 小时）— 全维度覆盖 + 数据流追踪 + 业务逻辑
```

## 审计工作流

### 阶段一：侦察与建模（约 10% 工时）

收集项目基础信息：

```bash
# 技术栈识别
ls -la                          # 项目根结构
find . -name "*.toml" -o -name "requirements.txt" -o -name "package.json" -o -name "pom.xml" | head -20
# 入口点识别
rg "router|app.route|@RequestMapping|@Controller" --type py --type java -l
# 敏感文件识别
rg -i "password|secret|api_key|token|credential" --type py --type java --type go -l
```

输出：
- 技术栈与框架版本
- 攻击面清单（对外 API 端点列表）
- 数据流边界（外部输入来源）

### 阶段二：并行模式匹配（约 30% 工时）

按 10 个安全维度并行扫描，加载 `references/owasp-checklist.md`。

**Sink-driven 扫描**（有危险函数的维度）：
- D1 注入：搜索危险函数 → 追踪数据流 → 验证是否有防护
- D4 反序列化：搜索反序列化调用 → 确认数据来源
- D5 文件操作：搜索文件 API → 确认路径是否用户可控
- D6 SSRF：搜索 HTTP 客户端 → 确认 URL 是否用户可控

**Control-driven 扫描**（缺少安全控制的维度）：
- D3 授权：枚举所有 API 端点 → 验证每个端点是否有权限校验
- D9 业务逻辑：枚举状态变更操作 → 验证是否有完整性校验

**Config-driven 扫描**（配置错误的维度）：
- D2 认证：检查认证配置
- D7 加密：检查加密算法和密钥管理
- D8 配置：检查调试配置、错误处理、日志
- D10 供应链：检查依赖版本的已知 CVE

### 阶段三：数据流追踪（仅 Standard/Deep 模式）

对阶段二发现的高危点，进行完整的污点追踪：
- 识别数据入口（Source）：HTTP 参数、请求头、文件内容、数据库读取
- 识别危险操作（Sink）：SQL 执行、命令执行、文件写入、反序列化
- 追踪 Source 到 Sink 的完整路径
- 识别路径上是否有净化/校验操作（Sanitizer）

加载 `references/data-flow-patterns.md` 获取常见模式。

### 阶段四：漏洞验证

对每个发现的疑似漏洞：
1. **确认数据可达性**：外部输入能否到达危险操作（不做假设，找代码证据）
2. **确认防护缺失**：净化函数是否真的有效，是否有绕过可能
3. **评估可利用性**：利用是否需要特定权限或条件

**防幻觉规则**：
- 未找到完整调用链 → 标记为"可疑，需人工验证"，不列为确认漏洞
- 找到防护代码 → 标记为"已有缓解措施"，说明防护是否充分
- 不确定版本是否受影响 → 说明不确定性，提供排查方向

### 阶段五：生成报告

加载 `references/report-template.md` 生成结构化报告。

## 严重度分级

| 级别 | 描述 | 示例 |
|------|------|------|
| **Critical** | 无需特权，可直接利用，影响系统安全 | SQL 注入获取数据、RCE |
| **High** | 有一定利用条件，高影响 | 越权访问、文件路径穿越 |
| **Medium** | 需要特定条件或影响有限 | 信息泄露、弱加密 |
| **Low** | 影响微小或极难利用 | 非敏感信息暴露、最佳实践偏差 |

## 10 个安全维度速查

| # | 维度 | 方法 | 关键 Sink |
|---|------|------|-----------|
| D1 | 注入 | Sink-driven | execute/query/eval/system |
| D2 | 认证 | Config-driven | 登录/Token验证配置 |
| D3 | 授权 | Control-driven | 每个 API 端点 |
| D4 | 反序列化 | Sink-driven | pickle/yaml.load/ObjectInputStream |
| D5 | 文件操作 | Sink-driven | open/read/write/upload |
| D6 | SSRF | Sink-driven | requests.get/urllib/HttpClient |
| D7 | 加密 | Config-driven | 算法选择/密钥存储 |
| D8 | 配置 | Config-driven | DEBUG/日志/错误处理 |
| D9 | 业务逻辑 | Control-driven | 状态变更/金额操作 |
| D10 | 供应链 | Config-driven | 依赖版本/CVE库 |

## 参考资源

- `references/owasp-checklist.md` — OWASP Top 10 详细检查项
- `references/data-flow-patterns.md` — 数据流追踪常见模式
- `references/report-template.md` — 审计报告模板
