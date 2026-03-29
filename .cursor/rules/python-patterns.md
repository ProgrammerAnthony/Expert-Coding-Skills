---
description: "Python 模式：Protocol、数据类 DTO、上下文管理与生成器"
globs: ["**/*.py", "**/*.pyi"]
alwaysApply: false
---
# Python 模式

> 在通用模式规则基础上，补充 Python 惯用法。

## Protocol（结构化鸭子类型）

```python
from typing import Protocol

class Repository(Protocol):
    def find_by_id(self, id: str) -> dict | None: ...
    def save(self, entity: dict) -> dict: ...
```

## 数据类作为 DTO

```python
from dataclasses import dataclass

@dataclass
class CreateUserRequest:
    name: str
    email: str
    age: int | None = None
```

## 上下文管理器与生成器

- 用上下文管理器（`with`）管理需要释放的资源
- 用生成器做惰性求值与省内存的迭代

## 延伸阅读

项目中若存在 **python-patterns** 等技能，可结合装饰器、并发、包结构等专题一起使用。
