# 测试原则与可测试性设计

## 好测试的特征（FIRST 原则）

| 特征 | 说明 |
|------|------|
| **Fast（快速）** | 单元测试应在毫秒级完成，整个测试套件应在分钟内完成 |
| **Isolated（隔离）** | 测试之间不应相互依赖，可以任意顺序运行 |
| **Repeatable（可重复）** | 无论何时、何地运行，结果都应一致 |
| **Self-validating（自验证）** | 测试结果明确（通过/失败），不需要人工判断 |
| **Timely（及时）** | 在生产代码之前或同时编写测试 |

---

## 好的测试命名

测试名称应该描述：**在什么条件下，做了什么，期望什么结果**

```python
# 差：无法从名称推断失败原因
def test_user():
    ...

def test_user_works():
    ...

# 好：条件+行为+期望
def test_register_user_with_duplicate_email_raises_duplicate_email_error():
    ...

def test_register_user_with_valid_data_returns_positive_user_id():
    ...

# 中文命名也可以（更直观）
def test_注册用户_邮箱重复_抛出重复邮箱异常():
    ...
```

---

## 测试结构（AAA 模式）

每个测试应清晰地分为三部分：

```python
def test_register_user_with_valid_data_returns_positive_user_id():
    # Arrange（准备）
    repo = InMemoryUserRepository()
    service = UserService(repo)
    user_data = {"name": "Alice", "email": "alice@example.com", "password": "secure123"}
    
    # Act（执行）
    user_id = service.register(user_data)
    
    # Assert（断言）
    assert isinstance(user_id, int)
    assert user_id > 0
```

---

## 可测试性设计原则

### 依赖注入（优先级最高）

**问题**：函数内部直接创建依赖，无法替换
```python
# 不可测试
class OrderService:
    def place_order(self, items):
        db = Database()          # 直接创建，无法替换
        email = EmailSender()    # 同上
        ...

# 可测试：通过构造函数注入
class OrderService:
    def __init__(self, db: Database, email: EmailSender):
        self._db = db
        self._email = email
    
    def place_order(self, items):
        ...
```

### 分离 I/O 与业务逻辑

```python
# 混合（难以单元测试）
def process_users():
    with open('users.csv') as f:          # I/O
        lines = f.readlines()
    
    result = []
    for line in lines:
        name, age = line.strip().split(',')
        if int(age) >= 18:                # 业务逻辑
            result.append(name)
    
    with open('adults.csv', 'w') as f:    # I/O
        f.write('\n'.join(result))

# 分离（业务逻辑可独立测试）
def filter_adults(users: list[dict]) -> list[str]:  # 纯业务逻辑
    return [u['name'] for u in users if u['age'] >= 18]

def process_users():                                  # 仅编排 I/O
    users = read_csv('users.csv')
    adults = filter_adults(users)
    write_csv('adults.csv', adults)
```

### 避免全局状态和时间依赖

```python
# 难以测试：依赖全局状态和当前时间
def is_expired(token):
    return datetime.now() > token.expires_at  # 不确定性！

# 可测试：将时间作为参数传入
def is_expired(token, now=None):
    if now is None:
        now = datetime.now()
    return now > token.expires_at

# 测试中
def test_expired_token_returns_true():
    token = Token(expires_at=datetime(2020, 1, 1))
    assert is_expired(token, now=datetime(2021, 1, 1))
```

---

## 测试金字塔

```
        /\
       /  \
      / E2E\         # 少量：验证完整用户流程
     /------\
    / 集成测试 \      # 适量：验证模块间协作
   /----------\
  /   单元测试  \    # 大量：验证每个函数/方法的行为
 /--------------\
```

- **单元测试**：快速、隔离、覆盖所有边界条件
- **集成测试**：验证真实数据库/HTTP 调用
- **E2E 测试**：验证用户场景，数量少但覆盖关键路径

---

## 接口设计检查清单

设计公共接口时检查：

- [ ] 接口名称是否描述了"做什么"而非"怎么做"？
- [ ] 参数数量是否 ≤ 4？（超过时考虑封装为对象）
- [ ] 返回值是否明确且一致（不要有时返回值有时 None）？
- [ ] 是否有清晰的错误契约（什么条件抛什么异常）？
- [ ] 接口是否暴露了内部实现细节？（如返回了内部数据结构）
- [ ] 使用这个接口的代码是否能轻松单元测试？
