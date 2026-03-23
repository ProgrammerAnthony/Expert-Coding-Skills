# TDD 开发大师

严格的测试驱动开发工作流，结合竖向 tracer bullet 切片与 RED-GREEN-REFACTOR 铁律，确保高质量、可维护的代码。

## 安装

```bash
npx skills add <username>/expert-coding-skills --path skills/tdd-master
```

## 使用方式

```
/tdd
```

或：

```
/测试驱动
```

## 核心工作流

```
规划阶段（获得用户批准前禁止写代码）
  ↓
设计公共接口
  ↓
拆解行为清单
  ↓
用户确认
  ↓
RED-GREEN-REFACTOR 循环（逐行为）
  ├── RED：写最小失败测试 → 强制验证失败
  ├── GREEN：写最小实现 → 强制验证通过
  └── REFACTOR：仅在全绿时重构
  ↓
全部行为完成 → 深模块设计检查
```

## 关键原则

1. **没有红色测试，不写生产代码**
2. **竖向切片**：每次完成一个完整行为，而非先写所有测试
3. **测试行为，而非实现**：重构不应导致测试失败
4. **GREEN 前不重构**：保持专注，不混淆阶段

## 示例

```
用户：帮我用 TDD 实现一个用户注册功能

TDD 大师：
1. 接口设计：
   - register_user(name, email, password) -> UserID
   - 前置条件：email 唯一，密码长度 ≥ 8
   - 后置条件：返回新用户 ID，用户存入数据库

2. 行为清单：
   - [ ] 正常注册返回用户 ID
   - [ ] 邮箱已存在时抛出 DuplicateEmailError
   - [ ] 密码过短时抛出 WeakPasswordError
   - [ ] 返回的用户 ID 在数据库中可查到

[用户确认后，开始第一个 RED-GREEN-REFACTOR 循环...]
```
