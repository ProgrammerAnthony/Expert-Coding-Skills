# 深模块设计原则

来源于 John Ousterhout《A Philosophy of Software Design》的核心思想。

## 深模块 vs 浅模块

**深模块**：接口简单，隐藏了复杂的实现
**浅模块**：接口复杂，提供的功能有限

```
深模块 ■             浅模块 ■■■■■■■■■■
       ■             ■
       ■■■■■■■■■■    ■

（接口=顶部宽度，功能=面积）
```

**浅模块是警告信号**：调用者需要了解太多内部细节

---

## 识别浅接口

```python
# 浅接口：暴露实现细节，调用者负担重
class FileStorage:
    def open_file(self, path): ...
    def read_chunk(self, size): ...
    def close_file(self): ...
    def parse_header(self): ...
    def get_next_record(self): ...

# 深接口：隐藏复杂性，调用者轻松
class FileStorage:
    def get_records(self, path) -> list[Record]: ...
```

---

## 信息隐藏原则

**好的模块应该隐藏：**
- 数据结构（调用者不需要知道内部用 dict 还是 list）
- 算法（调用者不需要知道排序用什么算法）
- 外部依赖（调用者不需要知道用了什么数据库）
- 错误细节（将内部错误转换为有意义的业务异常）

```python
# 暴露实现细节（差）
class UserService:
    def get_user_from_redis_cache(self, user_id) -> dict: ...
    def get_user_from_postgres(self, user_id) -> User: ...

# 隐藏实现细节（好）
class UserService:
    def get_user(self, user_id) -> User: ...  # 内部决定从哪里取
```

---

## 提供有意义的错误处理

**浅**：直接将底层异常传播出去
```python
# 差：暴露底层实现的异常
def save_user(user):
    try:
        db.execute("INSERT INTO users ...")
    except psycopg2.IntegrityError as e:
        raise  # 调用者需要了解 PostgreSQL 才能处理
```

**深**：将底层异常转换为业务异常
```python
# 好：业务层的语义
def save_user(user):
    try:
        db.execute("INSERT INTO users ...")
    except psycopg2.IntegrityError:
        raise DuplicateEmailError(f"邮箱 {user.email} 已存在")
```

---

## 深模块检查清单

完成模块设计后检查：

- [ ] 接口方法数量是否 ≤ 5？（越少越好）
- [ ] 调用者是否需要关心内部实现的细节才能正确使用？
- [ ] 模块是否将相关的复杂性聚合在一起，而不是分散给调用者？
- [ ] 错误处理是否在模块内部完成，而不是让调用者处理底层异常？
- [ ] 模块的功能面积（提供的价值）是否远大于接口面积（使用成本）？

---

## 避免"意义不大的类"

```python
# 意义不大（几乎不隐藏任何东西）
class EmailValidator:
    def validate(self, email: str) -> bool:
        return '@' in email

# 这样的类可以直接是个函数，不需要封装为类
def is_valid_email(email: str) -> bool:
    return '@' in email
```

类/模块的价值在于封装**状态 + 行为**的复杂性，而不是为了"面向对象而面向对象"。

---

## 实践：从浅到深重构示例

```python
# 重构前：浅接口（调用者知道太多）
class DatabaseConnection:
    def connect(self): ...
    def execute_query(self, sql): ...
    def fetch_results(self): ...
    def commit(self): ...
    def rollback(self): ...
    def close(self): ...

# 使用侧（负担重）
conn = DatabaseConnection()
conn.connect()
try:
    conn.execute_query("SELECT ...")
    results = conn.fetch_results()
    conn.commit()
except:
    conn.rollback()
finally:
    conn.close()

# 重构后：深接口（复杂性内化）
class UserRepository:
    def find_by_id(self, user_id: int) -> Optional[User]: ...
    def save(self, user: User) -> int: ...
    def find_all(self, filters: dict) -> list[User]: ...

# 使用侧（简洁）
repo = UserRepository()
user = repo.find_by_id(123)  # 所有数据库细节被隐藏
```
