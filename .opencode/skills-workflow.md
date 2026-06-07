# Superpowers 开发工作流程标准

> 基于 [Superpowers](https://github.com/obra/superpowers) 官方文档
> 记录日期：2026-06-02

## 核心原则

- **Test-Driven Development** - 先写测试，再写代码
- **Systematic over ad-hoc** - 流程优于猜测
- **Complexity reduction** - 简单性是首要目标
- **Evidence over claims** - 验证后才能宣称成功

---

## 基本工作流程 (The Basic Workflow)

### 1. brainstorming (头脑风暴)
**触发时机**: 写代码之前

**流程**:
- 通过问题细化粗糙想法
- 探索替代方案
- 分段展示设计供验证
- 保存设计文档

### 2. using-git-worktrees (Git Worktree)
**触发时机**: 设计批准后

**流程**:
- 在新分支上创建隔离工作区
- 运行项目设置
- 验证干净的测试基线

### 3. writing-plans (编写计划)
**触发时机**: 有批准的设计时

**流程**:
- 将工作分解为小任务（每个2-5分钟）
- 每个任务包含：
  - 精确的文件路径
  - 完整代码
  - 验证步骤

### 4. subagent-driven-development 或 executing-plans
**触发时机**: 有计划时

**流程**:
- 为每个任务分发新的子代理
- 两阶段审查：
  1. 规范合规性
  2. 代码质量
- 或在检查点进行批量执行

### 5. test-driven-development (测试驱动开发)
**触发时机**: 实现阶段

**流程** (RED-GREEN-REFACTOR):
1. 写失败的测试
2. 观察测试失败
3. 写最少代码
4. 观察测试通过
5. 提交
- 删除在测试之前写的代码

### 6. requesting-code-review (代码审查)
**触发时机**: 任务之间

**流程**:
- 对照计划审查
- 按严重程度报告问题
- 关键问题阻止进度

### 7. finishing-a-development-branch (完成开发分支)
**触发时机**: 任务完成时

**流程**:
- 验证测试
- 展示选项（合并/PR/保留/丢弃）
- 清理 worktree

---

## 技能库 (Skills Library)

### 测试 (Testing)
| 技能 | 描述 |
|------|------|
| **test-driven-development** | RED-GREEN-REFACTOR 循环（包含测试反模式参考） |

### 调试 (Debugging)
| 技能 | 描述 |
|------|------|
| **systematic-debugging** | 4阶段根因过程（包含根因追踪、纵深防御、条件等待技术） |
| **verification-before-completion** | 确保问题真正修复 |

### 协作 (Collaboration)
| 技能 | 描述 |
|------|------|
| **brainstorming** | 苏格拉底式设计细化 |
| **writing-plans** | 详细实现计划 |
| **executing-plans** | 带检查点的批量执行 |
| **dispatching-parallel-agents** | 并发子代理工作流 |
| **requesting-code-review** | 预审查清单 |
| **receiving-code-review** | 响应反馈 |
| **using-git-worktrees** | 并行开发分支 |
| **finishing-a-development-branch** | 合并/PR 决策工作流 |
| **subagent-driven-development** | 快速迭代与两阶段审查 |

### 元技能 (Meta)
| 技能 | 描述 |
|------|------|
| **writing-skills** | 按照最佳实践创建新技能 |
| **using-superpowers** | 技能系统介绍 |

---

## 执行规则

1. **代理在任何任务前检查相关技能** - 强制工作流，非建议
2. **用户指令最优先** - 用户指示 > 技能规则 > 默认行为
3. **技能优先级**:
   - 流程技能优先（brainstorming, debugging）
   - 实现技能其次（frontend-design, mcp-builder）

---

## 常见场景

| 场景 | 流程 |
|------|------|
| "构建 X" | brainstorming → writing-plans → implementation |
| "修复 bug" | systematic-debugging → implementation |
| "添加功能" | brainstorming → writing-plans → test-driven-development |
| "代码审查" | requesting-code-review |

---

## 快速参考

```
用户请求
    ↓
检查技能 (using-superpowers)
    ↓
流程技能? → brainstorming / systematic-debugging
    ↓
实现计划? → writing-plans
    ↓
执行? → executing-plans / subagent-driven-development
    ↓
验证? → test-driven-development / verification-before-completion
    ↓
完成? → requesting-code-review → finishing-a-development-branch
```

---

## 注意事项

- 技能是**强制性工作流**，不是建议
- 每次任务前必须检查是否有适用的技能
- 即使只有 1% 的可能适用，也要调用技能检查
- 技能会演进，始终读取当前版本
- 简单任务也可能变复杂，使用技能防止浪费
