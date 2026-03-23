---
name: tdd-master
description: "严格的测试驱动开发（TDD）工作流，采用竖向 tracer bullet 切片，强制 RED-GREEN-REFACTOR 循环，接口设计优先，禁止先写生产代码。触发词：tdd、测试驱动、测试驱动开发、先写测试、红绿重构、单元测试、test driven、TDD开发。"
---

# TDD 开发大师

铁律：**没有失败的测试，不写一行生产代码。** 先写代码再补测试的，必须删掉先写的代码重来。

## 核心哲学

### 竖向切片，而非横向切片

**反模式（横向切片）**：先把所有测试写完，再一口气写所有实现
- 问题：测试套件成为规格书，不是活文档；实现阶段难以获得快速反馈

**正确做法（竖向 tracer bullet 切片）**：每次选一个最小可验证行为，完成 RED→GREEN→REFACTOR 完整循环
- 每个切片都是端到端的最小功能（一个完整行为）
- 通过测试可以立即运行并得到结果

### 测试测行为，而非测实现

```python
# 错误：测试内部实现（脆弱，重构即失效）
def test_calls_validate_method():
    service = UserService()
    with patch.object(service, '_validate') as mock:
        service.create_user(data)
    mock.assert_called_once()

# 正确：测试可观察行为（稳健，重构不影响）
def test_create_user_returns_user_id():
    service = UserService()
    user_id = service.create_user({"name": "Alice", "email": "a@example.com"})
    assert isinstance(user_id, int)
    assert user_id > 0
```

---

## 工作流

### 阶段一：规划（获得用户批准前禁止写代码）

#### 1.1 接口设计

先设计公共接口，不暴露内部实现细节：

```
询问用户：这个功能/模块需要提供什么公共接口？
输出：函数/方法签名 + 输入/输出类型 + 前置/后置条件
```

加载 `references/testing-principles.md` 检查接口设计原则。

#### 1.2 行为清单

将功能拆解为可测试的行为列表：

```
待实现的行为：
- [ ] 正常路径：[描述]
- [ ] 边界条件：[描述]
- [ ] 错误路径：[描述]
- [ ] 并发场景：[如适用]
```

每个行为必须是：**独立可测试** + **有明确期望结果** + **最小粒度**

#### 1.3 可测试性检查

评估设计是否可测试（加载 `references/testing-principles.md`）：
- 依赖是否可以被替换（Mock/Stub）？
- 是否有隐藏的全局状态？
- 是否混合了业务逻辑和 I/O？

**将设计展示给用户确认，批准后才开始实现。**

---

### 阶段二：RED-GREEN-REFACTOR 循环

每次选一个行为（从行为清单第一项开始）：

#### RED 阶段

1. **写最小的失败测试**：
   - 测试名称描述行为（`test_用户注册成功返回用户ID`）
   - 只测一个行为
   - 使用尽可能真实的代码（避免过度 mock）
   
2. **强制验证 RED**（不可跳过）：
   ```bash
   pytest tests/test_user.py::test_用户注册成功返回用户ID -v
   ```
   确认：测试因**正确原因**失败（功能未实现），而非因测试代码错误失败

3. **RED 失败则停止**：如果无法让测试变红，说明测试本身有问题，先修复测试

#### GREEN 阶段

1. **写最小的实现**：只写让当前测试通过所需的最少代码
   - 可以暂时硬编码（如 `return 42`），只要测试通过
   - 禁止超前实现"以后会用到的"功能

2. **强制验证 GREEN**（不可跳过）：
   ```bash
   pytest tests/test_user.py -v
   ```
   确认：全部测试通过，包括之前的测试

3. **GREEN 失败则停止**：回到实现代码修复，**不重构，不写新测试**

#### REFACTOR 阶段

**只在全绿时重构**，RED 状态下严禁重构。

加载 `references/refactoring-guide.md` 进行安全重构：
- 消除重复代码
- 改善命名
- 提取方法（不改变外部行为）

每次重构后立即运行全部测试：全绿则继续，失败则撤销上一步修改。

#### 完成一个行为后

勾选清单，选下一个行为，重复循环。

---

### 阶段三：深模块设计检查

所有行为实现完成后，加载 `references/deep-modules.md`：
- 接口是否足够简单（浅接口是警告信号）？
- 是否可以进一步内化复杂性？
- 模块边界是否清晰？

---

## Mock 使用原则

加载 `references/mocking-guide.md` 获取详细指引。

**何时使用 Mock**：
- 外部 I/O（网络请求、数据库、文件系统）
- 时间相关（`datetime.now()`、`time.sleep()`）
- 随机数
- 第三方付费 API

**何时不用 Mock**：
- 自己写的代码（测试真实集成）
- 简单的值对象
- 不涉及副作用的纯函数

---

## 反模式警告

| 反模式 | 识别特征 | 处理方式 |
|--------|----------|----------|
| 横向切片 | "先把所有测试写完" | 立刻停止，改为逐行为切片 |
| 测试实现细节 | `patch.object` 内部方法 | 重写为测试行为 |
| 巨型测试 | 一个测试验证多个行为 | 拆分为多个测试 |
| 跳过 RED 验证 | "我知道测试会失败" | 必须执行，有时会有惊喜 |
| GREEN 阶段重构 | 测试刚过就大改 | 先让所有测试通过再重构 |
| 过度 Mock | Mock 了自己写的类 | 测试真实集成 |
| 无意义测试名 | `test_it_works` | 改为行为描述 |

---

## 参考资源

- `references/testing-principles.md` — 测试原则与可测试性设计
- `references/mocking-guide.md` — Mock 使用指南
- `references/refactoring-guide.md` — 安全重构技术
- `references/deep-modules.md` — 深模块设计原则
