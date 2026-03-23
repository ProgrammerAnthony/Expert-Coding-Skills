# 技能铸造师

元技能——指导你创建高质量的 AI Agent 技能（SKILL.md），从需求理解到架构设计到打包发布。

## 安装

```bash
npx skills add <username>/expert-coding-skills --path skills/skill-smith
```

## 使用方式

```
/创建技能
```

或：

```
/skill-smith
```

## 帮你完成什么

1. **理解需求**：通过 3 个具体使用示例，真正理解你的技能要解决什么问题
2. **架构规划**：决定什么放在 SKILL.md，什么放在 references/，保持文件简洁
3. **编写 SKILL.md**：触发词优化、铁律设定、工作流设计、确认门控
4. **编写 References**：高质量的参考文档（清单、模板、规范）
5. **质量检查**：发布前的完整检查清单

## 好技能的标准

| 标准 | 说明 |
|------|------|
| SKILL.md < 500 行 | 精简，不写废话 |
| 触发词丰富 | 描述中 10-20 个触发关键词 |
| 有铁律 | 最重要的行为约束明确写出 |
| 有确认门控 | 关键决策前等待用户批准 |
| 按需加载 | References 在需要时才加载 |
| 有反模式 | 告诉 AI 不该做什么 |

## 技能目录结构

```
skill-name/
├── SKILL.md          # 主文件（< 500 行）
├── README.md         # 安装和使用说明
└── references/       # 按需加载的参考文档
    ├── checklist.md
    └── template.md
```
