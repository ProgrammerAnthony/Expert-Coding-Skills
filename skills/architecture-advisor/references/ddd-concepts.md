# 领域驱动设计（DDD）核心概念

## 什么时候考虑 DDD

DDD 适合**复杂业务领域**，以下情形引入 DDD 更有价值：
- 业务规则复杂，技术人员和业务人员沟通困难
- 多个团队协作同一个大型系统
- 业务概念在代码中混乱或表达不清

**不适合 DDD 的情形**：CRUD 为主的简单系统、小型团队、早期 MVP。

---

## 战略设计

### 领域（Domain）划分

```
核心域（Core Domain）：
  - 业务的核心竞争力所在
  - 值得投入最多资源
  - 例：电商的商品推荐算法、交易撮合引擎

支撑域（Supporting Domain）：
  - 支撑核心域运转，但不是竞争优势
  - 可以外包或使用开源方案
  - 例：用户认证、权限管理、消息通知

通用域（Generic Domain）：
  - 通用能力，直接用现成方案
  - 例：日志、监控、配置中心
```

### 限界上下文（Bounded Context）

每个限界上下文：
- 有自己的领域模型（同一词汇在不同上下文可以有不同含义）
- 有清晰的边界（外部交互通过接口而非直接访问内部）
- 对应一个或多个微服务（或单体中的模块）

```
示例：电商系统的限界上下文

用户上下文：User（关注登录、权限）
            ↓ 上下文映射
订单上下文：Customer（关注地址、购买历史）
            ↓ 上下文映射
支付上下文：Payer（关注支付方式、余额）
```

**注意**：同一个"用户"在不同上下文中是不同的对象，不要试图建一个统一的 User 对象满足所有上下文。

---

## 战术设计

### 聚合（Aggregate）

聚合是一组相关对象的集合，作为一个整体来维护业务不变量：
- **聚合根（Aggregate Root）**：聚合的入口点，外部只能通过聚合根访问聚合内的对象
- 聚合内对象的一致性由聚合根保证
- 聚合之间通过 ID 引用，不直接引用对象

```python
# 聚合根示例
class Order:  # 聚合根
    def __init__(self, order_id: OrderId, customer_id: CustomerId):
        self._id = order_id
        self._customer_id = customer_id
        self._items: list[OrderItem] = []
        self._status = OrderStatus.PENDING
    
    def add_item(self, product_id: ProductId, quantity: int, price: Money):
        # 业务不变量：已支付的订单不能添加商品
        if self._status != OrderStatus.PENDING:
            raise OrderAlreadyPlacedError()
        self._items.append(OrderItem(product_id, quantity, price))
    
    def place(self):
        if not self._items:
            raise EmptyOrderError()
        self._status = OrderStatus.PLACED
        # 发布领域事件
        self._events.append(OrderPlaced(self._id))
```

### 值对象（Value Object）

没有身份标识，通过属性值判断相等性：

```python
@dataclass(frozen=True)  # 不可变
class Money:
    amount: Decimal
    currency: str
    
    def __add__(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise CurrencyMismatchError()
        return Money(self.amount + other.amount, self.currency)
```

### 领域事件（Domain Event）

描述领域中已经发生的事情：

```python
@dataclass
class OrderPlaced:
    order_id: str
    customer_id: str
    total_amount: Money
    occurred_at: datetime
    
    # 命名规则：过去时态，描述已发生的事
    # OrderPlaced（好）vs PlaceOrder（差，是命令而非事件）
```

---

## 上下文映射模式

| 模式 | 说明 | 使用场景 |
|------|------|----------|
| 防腐层（Anti-Corruption Layer） | 将外部模型翻译为内部模型 | 集成老系统或第三方服务 |
| 开放主机服务（Open Host Service） | 提供协议供他人集成 | 核心域对外提供 API |
| 共享内核（Shared Kernel） | 两个上下文共享部分模型 | 关系密切的上下文 |
| 客户/供应商（Customer/Supplier） | 下游要求上游满足需求 | 有明确依赖关系的上下文 |

---

## DDD 实施检查清单

- [ ] 是否识别了核心域、支撑域、通用域？
- [ ] 每个限界上下文是否有清晰的边界和负责团队？
- [ ] 上下文之间的集成是否使用了防腐层？
- [ ] 聚合是否足够小（一次事务操作一个聚合）？
- [ ] 领域模型是否使用了统一语言（Ubiquitous Language）？
- [ ] 是否避免了"贫血模型"（只有数据没有行为的实体）？
