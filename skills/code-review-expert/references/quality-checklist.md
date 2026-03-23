# 代码质量检查清单

## 错误处理

- [ ] 是否有裸露的 `except Exception: pass` 吞掉所有异常？
- [ ] 错误是否被正确传播或转换（不要把底层异常直接暴露给调用方）？
- [ ] 是否对外部 API 调用（HTTP、数据库、文件 IO）设置了超时？
- [ ] 资源（文件、连接、锁）是否在异常路径中也能被正确释放？（`finally`/`with`/`defer`）
- [ ] 错误消息是否对调试有意义，而不是泛化的 "操作失败"？

### 常见反模式
```python
# 危险：吞掉所有异常
try:
    process()
except:
    pass

# 危险：忽略返回值中的错误
result, _ = do_something()

# 改进：明确处理
try:
    process()
except ValueError as e:
    logger.error("参数错误: %s", e)
    raise
except Exception as e:
    logger.exception("未预期异常")
    raise InternalError("处理失败") from e
```

---

## 性能热点

- [ ] 是否在循环中执行数据库查询？（N+1 问题）
- [ ] 是否对大型集合做了不必要的全量加载？（应分页或流式处理）
- [ ] 高频调用的路径是否有适当的缓存？
- [ ] 是否存在重复计算（可以提前计算并复用结果）？
- [ ] 字符串拼接是否在循环中使用 `+`？（Python 应使用 `join`，Java 使用 `StringBuilder`）
- [ ] 数据库查询是否有必要的索引支撑？（检查 WHERE 条件字段）

### N+1 问题识别
```python
# 危险：N+1 查询
orders = Order.query.all()
for order in orders:
    print(order.user.name)  # 每次循环触发一次查询

# 改进：预加载
orders = Order.query.options(joinedload(Order.user)).all()
```

---

## 边界条件

- [ ] 空值/None 输入是否有处理？（避免 NullPointerException）
- [ ] 空列表/空字符串是否与 None 分别处理？
- [ ] 整数溢出风险（金额计算、索引计算）？
- [ ] 并发场景下的竞态条件（计数器、状态更新）？
- [ ] 递归是否有终止条件和深度限制？
- [ ] 用户输入的长度是否有上限校验（防止内存耗尽）？

---

## 可测试性

- [ ] 函数是否有隐藏的副作用（全局状态、随机数、时间依赖）？
- [ ] 依赖是否可以被 mock/stub 替换（测试隔离）？
- [ ] 函数参数是否过多（>4 个通常意味着需要重构）？
- [ ] 是否混合了业务逻辑和 I/O 操作（难以单元测试）？

---

## 可读性与命名

- [ ] 变量名是否能准确描述其内容？（避免 `data`、`result`、`tmp`）
- [ ] 布尔变量是否以 `is_`、`has_`、`can_` 开头？
- [ ] 函数名是否描述了动作+对象？（`get_user_by_id` 优于 `getUserData`）
- [ ] 常量是否命名（避免魔法数字 `if status == 3`）？
- [ ] 注释是否解释了"为什么"而非"做什么"？（代码本身应表达"做什么"）

---

## 并发安全

- [ ] 共享状态是否有适当的锁保护？
- [ ] 异步代码是否正确处理了并发异常？
- [ ] 是否存在死锁风险（多个锁的获取顺序不一致）？
- [ ] 线程池大小是否合理配置（避免无限制创建线程）？
