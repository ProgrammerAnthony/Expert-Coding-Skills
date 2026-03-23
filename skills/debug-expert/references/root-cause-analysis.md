# 根因分析工具和框架

## 5 Why 分析法

不断追问"为什么"，直到找到根本原因：

```
示例：生产环境 API 超时

为什么超时？        → 数据库查询耗时超过 30 秒
为什么查询耗时高？  → 全表扫描，没走索引
为什么没走索引？    → WHERE 子句使用了函数（DATE(created_at) = '2024-01-01'）
为什么这样写？      → 开发者不了解索引失效的场景
为什么不了解？      → 团队缺少数据库最佳实践的规范文档

根因：团队缺少数据库使用规范，导致开发者不了解索引失效场景。

修复：
- 立即：添加函数索引或改写查询语句
- 长期：建立数据库使用规范文档和 Code Review 检查点
```

**注意**：5 Why 不是要追问 5 次，而是要追问到根本原因（可能是 3 次，也可能是 7 次）。

---

## 故障树分析

对于复杂问题，用树状结构分析所有可能的原因：

```
问题：用户无法登录
├── 后端问题
│   ├── 认证服务宕机？（先 ping 服务确认）
│   ├── 数据库连接失败？（检查连接池状态）
│   └── 密码验证逻辑 bug？（看最近的代码改动）
├── 网络问题
│   ├── 负载均衡故障？（检查 LB 健康状态）
│   └── DNS 解析错误？（nslookup 验证）
└── 客户端问题
    ├── Cookie/Token 损坏？（清除后重试）
    └── 前端 bug？（检查 Console 错误）
```

从最可能的分支开始验证，快速排除。

---

## 二分法定位

对于"代码路径长但不知道问题在哪里"的情形：

```python
# 步骤 1：确认问题的入口和出口
def complex_process(input_data):
    step1_result = step1(input_data)     # 在这里加检查点
    step2_result = step2(step1_result)   # 在这里加检查点
    step3_result = step3(step2_result)   # 在这里加检查点
    return step4(step3_result)

# 步骤 2：在中间点添加断言/日志
print(f"step1_result = {step1_result!r}")
assert step1_result is not None, "step1 返回了空值"

# 步骤 3：判断问题在前半段（step1）还是后半段（step2-4）
# 重复直到定位到具体函数
```

---

## 变更分析（最常见的根因）

60% 以上的 Bug 与最近的变更相关：

```bash
# 找出最近的代码变更
git log --oneline -20

# 查看某次变更的内容
git show <commit-hash>

# 找出某个文件的最近变更
git log --oneline -10 -- path/to/file.py

# 对比两个版本
git diff HEAD~3 HEAD -- path/to/file.py

# 二分法找出引入 bug 的提交
git bisect start
git bisect bad HEAD          # 当前版本有问题
git bisect good v1.2.0       # 这个版本没问题
# git bisect 会自动切换到中间提交，你验证并告诉它好/坏
git bisect good/bad
# 最终会找到第一个引入 bug 的提交
```

---

## 日志分析技巧

```bash
# 过滤关键词
grep "ERROR\|Exception\|FATAL" app.log | tail -50

# 按时间范围过滤（Linux grep）
grep "2024-01-15 14:" app.log

# 查看错误前后的上下文
grep -B 5 -A 10 "NullPointerException" app.log

# 实时跟踪日志
tail -f app.log | grep --line-buffered "ERROR"

# 统计错误类型频率
grep "Exception" app.log | awk '{print $NF}' | sort | uniq -c | sort -rn
```

---

## 环境差异排查

当"本地可以，测试/生产不行"时：

```bash
# 1. 对比 Python 依赖版本
pip freeze > local_deps.txt
ssh production 'pip freeze' > prod_deps.txt
diff local_deps.txt prod_deps.txt

# 2. 对比环境变量（注意过滤敏感信息）
env | grep APP_ | sort > local_env.txt

# 3. 对比配置文件
diff local.env staging.env

# 4. 确认资源权限
ls -la /path/to/directory
# 对比文件权限是否一致

# 5. 检查网络访问
curl -v http://internal-service:8080/health
```

---

## 常见错误模式速查

| 错误类型 | 首先检查 | 常见根因 |
|----------|----------|----------|
| NullPointerException / AttributeError | 哪个变量为空，为什么 | 没有 None 检查，数据初始化顺序问题 |
| IndexError / ArrayOutOfBounds | 数组长度和访问的索引 | 边界条件未处理 |
| 连接超时 | 网络、服务状态、超时配置 | 目标服务慢、网络不通、连接池耗尽 |
| 权限拒绝 | 用户、文件/目录权限 | 生产环境权限配置与本地不同 |
| 数据库唯一键冲突 | 是否有重复提交 | 幂等性未处理、并发竞态 |
| 内存溢出 | 堆内存使用趋势 | 内存泄漏、大对象未释放 |
| 死锁 | 锁的获取顺序 | 多个事务/线程以不同顺序获取多把锁 |
