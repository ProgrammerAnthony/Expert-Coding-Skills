# 安全重构指南

## 重构的黄金规则

**重构 = 在不改变外部可观察行为的前提下改善代码内部结构**

安全重构步骤：
1. 确认所有测试全部通过（绿色）
2. 做一个最小的结构改变
3. 立即运行所有测试
4. 通过 → 继续下一步；失败 → 撤销上一步（`git diff` 查看刚才做了什么）

---

## 重构前的准备

- [ ] 所有测试都在通过状态
- [ ] 已提交当前工作（git commit，以便回滚）
- [ ] 清楚地知道要改什么，以及为什么改

---

## 常用重构手法

### 提取方法（Extract Method）

适用：函数过长，某段代码有清晰的意图

```python
# 重构前
def process_order(order):
    # 验证订单
    if not order.items:
        raise ValueError("订单不能为空")
    if order.total <= 0:
        raise ValueError("金额必须大于0")
    
    # 计算折扣
    discount = 0
    if order.user.is_vip:
        discount = order.total * 0.1
    if order.total > 1000:
        discount += 50
    
    # 创建支付记录
    payment = Payment(amount=order.total - discount)
    payment.save()
    return payment

# 重构后（提取两个方法）
def validate_order(order):
    if not order.items:
        raise ValueError("订单不能为空")
    if order.total <= 0:
        raise ValueError("金额必须大于0")

def calculate_discount(order):
    discount = 0
    if order.user.is_vip:
        discount = order.total * 0.1
    if order.total > 1000:
        discount += 50
    return discount

def process_order(order):
    validate_order(order)
    discount = calculate_discount(order)
    payment = Payment(amount=order.total - discount)
    payment.save()
    return payment
```

### 引入参数对象（Introduce Parameter Object）

适用：函数参数超过 3-4 个，且参数经常一起出现

```python
# 重构前
def create_user(name, email, password, phone, address, city, country):
    ...

# 重构后
@dataclass
class UserRegistrationData:
    name: str
    email: str
    password: str
    phone: str
    address: str
    city: str
    country: str

def create_user(data: UserRegistrationData):
    ...
```

### 以卫语句替换嵌套条件（Guard Clauses）

适用：多层嵌套 if，主逻辑被埋在深处

```python
# 重构前（"箭头代码"）
def process_payment(payment):
    if payment:
        if payment.is_valid():
            if payment.amount > 0:
                if not payment.is_expired():
                    # 真正的处理逻辑在这里...
                    do_process(payment)

# 重构后（提前返回，主逻辑一目了然）
def process_payment(payment):
    if not payment:
        return
    if not payment.is_valid():
        raise InvalidPaymentError()
    if payment.amount <= 0:
        raise ValueError("金额必须大于0")
    if payment.is_expired():
        raise PaymentExpiredError()
    
    do_process(payment)  # 主逻辑清晰可见
```

### 以策略模式替换条件分支

适用：根据类型做不同处理，且经常需要添加新类型

```python
# 重构前（难以扩展）
def calculate_discount(order, user_type):
    if user_type == "vip":
        return order.total * 0.1
    elif user_type == "new":
        return 20.0
    elif user_type == "regular":
        return 0.0

# 重构后（开闭原则）
class DiscountStrategy(Protocol):
    def calculate(self, order) -> float: ...

class VipDiscount:
    def calculate(self, order) -> float:
        return order.total * 0.1

class NewUserDiscount:
    def calculate(self, order) -> float:
        return 20.0

class NoDiscount:
    def calculate(self, order) -> float:
        return 0.0

def calculate_discount(order, strategy: DiscountStrategy) -> float:
    return strategy.calculate(order)
```

---

## 重构安全检查清单

每次重构完成后：

- [ ] 运行全部测试：`pytest -v`（或对应框架命令）
- [ ] 全部通过？（是 → 可以继续；否 → 撤销并检查）
- [ ] 行为是否与重构前完全一致？
- [ ] 代码是否更易读、更易理解？
- [ ] 是否引入了新的复杂性？（如果是，是否值得？）

---

## 不要做的重构

- **边重构边加功能**：先完成重构，再加功能，不要混在一起
- **大重构**：把重构拆成很多小步，每步都运行测试
- **红灯下重构**：有测试失败时不重构，先让测试通过
- **"顺便"重构不相关代码**：当前任务边界之外的代码不重构
