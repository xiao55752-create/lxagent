# lxagent · 项目立项智能平台

**对话驱动的立项体验**：立项单为流程主对象，自然语言采集 + 智能体后台执行，材料实时归档，合规矩阵与 AI 预审，三级审批后正式归档并写入历史参考库。

左侧「立项能力模块」为**独立功能**，可在同一对话窗口按需切换，无需按固定顺序推进。

## 核心能力

| 模块 | 说明 |
|------|------|
| **立项单** | 流程主对象，含编号、状态、版本、采集字段 |
| **自然语言对话** | 统一 `/chat` 入口，跨模块全局提取字段 |
| **立项能力模块** | 市场分析、产品方案、资源预算等独立能力，可自由切换 focus |
| **智能体监督台** | 活动流、行动回执、执行计划、自主度三档、撤销快照 |
| **材料归档** | 草稿 → 已确认 → 已锁定；支持材料溯源（对话片段 / 字段 / 规则依据） |
| **合规矩阵 + AI 预审** | 提交前矩阵校验 + 预审报告（建议、风险、冲突、通过率预测） |
| **Go/No-Go 评分** | 七维度立项可行性评估 |
| **三级审批** | L1/L2/L3 留痕，附条件通过支持 |
| **审批效能看板** | 漏斗、KPI、缺失项 Top、最近审批 |
| **历史案例复用** | 归档写入 KB，工作台相似案例匹配与「参考此案例」 |
| **规则标准库** | 立项制度、审批规则、技术合规、模板、历史案例（5 类 RAG） |

## 启动

```bash
npm install
npm run dev:all
```

- 前端：http://localhost:5173
- 后端：http://localhost:8787
- 健康检查：http://localhost:8787/api/health

若端口被占用，先停止旧进程再重启。

## 使用路径

1. **立项管理** → 新建立项单
2. 在对话区用自然语言描述项目（或点击左侧能力模块聚焦上下文）
3. 智能体自动采集字段、生成材料 → 右侧确认纳入归档
4. 查看 **Go/No-Go 评分**、**材料溯源**、**相似历史案例**
5. **合规矩阵预检** → **提交三级审批**
6. 审批通过 → **正式归档**（写入历史参考库，供后续立项复用）

## 智能体自主度

| 档位 | 行为 |
|------|------|
| 建议 | 仅提示下一步，不自动写库 |
| 草稿 | 自动生成材料草稿，需人工确认 |
| 自动 | 就绪模块可一键执行计划并归档 |

## 规则标准库（5 类）

| 类型 | 用途 |
|------|------|
| policy_process | 立项制度与流程规范 |
| policy_approval | 审批规则与关注点 |
| standard_tech_compliance | 技术与合规标准 |
| template_format | 报告模板与格式 |
| reference_case | 历史立项参考（含归档摘要） |

## API

### 立项单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/initiations | 立项单列表 |
| POST | /api/initiations | 创建立项单 |
| GET | /api/initiations/:id | 立项单详情 |
| POST | /api/initiations/:id/chat | **主入口**：自然语言对话 |
| POST | /api/initiations/:id/focus | 切换聚焦能力模块 |
| POST | /api/initiations/:id/autonomy | 设置自主度（suggest / draft / auto） |
| POST | /api/initiations/:id/execute-plan | 一键执行计划 |
| POST | /api/initiations/:id/execute-plan-step | 执行单步 |
| POST | /api/initiations/:id/skip-plan-step | 跳过计划步骤 |
| POST | /api/initiations/:id/dismiss-plan | 关闭计划 |
| POST | /api/initiations/:id/rollback | 撤销最近一次智能体操作 |
| POST | /api/initiations/:id/confirm-material | 确认单份材料 |
| POST | /api/initiations/:id/prepare-approval | 合规矩阵 + AI 预审 |
| POST | /api/initiations/:id/assess-go-nogo | Go/No-Go 评分 |
| POST | /api/initiations/:id/submit | 提交三级审批 |
| POST | /api/initiations/:id/approve | 审批操作 |
| POST | /api/initiations/:id/ask | 规则/标准问答 |
| GET | /api/initiations/:id/compliance | 合规检查 |
| GET | /api/initiations/:id/similar-cases | 相似历史案例 |

### 分析与知识库

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/analytics/approval | 审批效能看板数据 |
| GET | /api/config/approval-roles | 三级审批角色配置（含部门→L1 映射） |
| PUT | /api/config/approval-roles | 更新审批角色（审批人、关注要点、部门映射） |
| GET | /api/config/integrations | Jira / 飞书推送地址配置 |
| PUT | /api/config/integrations | 更新集成配置 |
| GET | /api/health | 服务与 LLM 配置状态 |
| GET | /api/kb/documents | 知识库文档列表 |
| GET | /api/kb/documents/:id | 单篇文档详情 |
| GET | /api/kb/search | 知识库检索 |
| POST | /api/kb/documents | 新增文档 |

### 工作台增强

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/initiations/:id/context-rules | 当前模块相关规则片段 |
| POST | /api/initiations/:id/push-integration | 归档后推送 Jira / 飞书（Mock） |

### 兼容接口（旧版前端）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/initiations/:id/answer | 转发至 chat |
| POST | /api/initiations/:id/advance | 确认材料并推进 |

## 项目结构

```
server/src/
  services/initiationService.ts   # 立项单 + 状态机 + 归档
  agents/                         # orchestrator, planner, preReview, goNoGo, similarCases
  workflow/                       # modules, compliance, provenance, phases
  analytics/approvalMetrics.ts    # 审批看板
  kb/                             # 规则标准库 RAG
src/
  pages/                          # Home, InitiationList, Workspace, KnowledgeBase
  components/
    agent/                        # 监督台、计划、审批门、撤销
    analytics/                    # ApprovalDashboard
    workspace/                    # GoNoGo, SimilarCases, MaterialTrace
  store/useInitiationStore.ts
```

## LLM 配置（可选）

```bash
cp .env.example .env
# LLM_API_KEY=sk-...
```

未配置时使用规则库增强生成，仍会引用制度与标准文档；预审与 Go/No-Go 以规则引擎为主，LLM 可增强分析表述。
