# Mock 使用指南

## 基本原则

**Mock 是必要的妥协，不是第一选择。** 能用真实实现的就用真实实现。

过度 Mock 的危害：
- 测试变成"期望 mock 被调用"，而不是"验证结果正确"
- 重构时测试大量失败（因为 mock 了实现细节）
- 无法发现真实的集成问题

---

## 何时应该 Mock

### 必须 Mock 的情形

| 场景 | 原因 | 示例 |
|------|------|------|
| 外部 HTTP 请求 | 网络不稳定、有成本 | 第三方 API、Webhook |
| 数据库（单元测试） | 速度慢、需要环境 | PostgreSQL、Redis |
| 文件系统（非临时） | 测试后需要清理 | 生产环境文件路径 |
| 时间 / 随机数 | 不确定性 | `datetime.now()`、`random.random()` |
| 第三方付费服务 | 成本和副作用 | 短信、邮件、支付 |
| 异步/后台任务 | 难以同步等待 | Celery task、后台线程 |

### 不应该 Mock 的情形

| 场景 | 原因 |
|------|------|
| 自己写的业务类 | 应测试真实集成 |
| 纯函数 | 直接调用即可 |
| 值对象/数据类 | 没有副作用 |
| 接受参数注入的类 | 直接传入测试替代 |

---

## Mock 层次

从最真实到最虚假：

1. **真实对象**：直接使用（最佳）
2. **Fake**：功能简化的真实实现（如 InMemoryRepository）
3. **Stub**：返回预设值（不验证交互）
4. **Mock**：验证是否被调用（可能过度耦合实现）
5. **Spy**：包装真实对象并记录调用

**优先选择 Fake，而非 Mock。**

---

## Python Mock 示例

### 使用 Fake 替代数据库（推荐）

```python
# 定义接口
class UserRepository(Protocol):
    def find_by_email(self, email: str) -> Optional[User]: ...
    def save(self, user: User) -> int: ...

# 真实实现（用于生产）
class PostgresUserRepository:
    def __init__(self, db_session):
        self._session = db_session
    
    def find_by_email(self, email: str) -> Optional[User]:
        return self._session.query(User).filter_by(email=email).first()

# Fake 实现（用于测试）
class InMemoryUserRepository:
    def __init__(self):
        self._users: dict[str, User] = {}
        self._next_id = 1
    
    def find_by_email(self, email: str) -> Optional[User]:
        return self._users.get(email)
    
    def save(self, user: User) -> int:
        user.id = self._next_id
        self._users[user.email] = user
        self._next_id += 1
        return user.id

# 测试（干净，不需要数据库）
def test_register_user_with_duplicate_email_raises_error():
    repo = InMemoryUserRepository()
    repo.save(User(email="alice@example.com", ...))
    service = UserService(repo)
    
    with pytest.raises(DuplicateEmailError):
        service.register({"email": "alice@example.com", ...})
```

### Mock 外部 HTTP 请求

```python
# 使用 unittest.mock.patch
def test_fetch_user_profile_calls_external_api():
    with patch('myapp.services.requests.get') as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"name": "Alice"}
        
        service = ProfileService()
        profile = service.fetch_profile("alice")
    
    assert profile.name == "Alice"

# 更好：使用 responses 库（更直观）
import responses

@responses.activate
def test_fetch_user_profile_calls_external_api():
    responses.add(
        responses.GET,
        'https://api.example.com/users/alice',
        json={"name": "Alice"},
        status=200
    )
    
    service = ProfileService()
    profile = service.fetch_profile("alice")
    assert profile.name == "Alice"
```

### Mock 时间

```python
from unittest.mock import patch
from datetime import datetime

def test_token_expires_correctly():
    fake_now = datetime(2024, 1, 1, 12, 0, 0)
    with patch('myapp.auth.datetime') as mock_dt:
        mock_dt.now.return_value = fake_now
        
        token = Token.create(expires_in_hours=1)
        assert token.expires_at == datetime(2024, 1, 1, 13, 0, 0)
```

---

## 过度 Mock 的警告信号

- Mock 中的 `assert_called_with` 验证了具体的参数格式（绑定实现）
- 测试中 mock 的数量超过了 assert 的数量
- 重构内部代码后，所有测试都失败
- 测试代码比被测代码更复杂
- 每个测试都需要 10+ 行的 mock setup

遇到上述情况，考虑：
1. 改用 Fake
2. 用集成测试替代
3. 重新设计接口让其更可测试
