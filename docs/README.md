# MCP Blog Studio 文档导航中心

> **项目版本路线**：**v0 普通博客（已就绪） → v1 远程 MCP（设计冻结） → v2 WebMCP（未来规划）**。  
> 本目录收录系统的需求设计、架构决策、前端设计系统适配、源数据溯源记录以及测试部署指南。

---

## 1. 核心设计与产品规划

| 文档 | 核心受众 | 核心内容与范围 |
| :--- | :--- | :--- |
| **[需求文档 (requirements.md)](requirements.md)** | 开发者、产品负责人 | 系统目标、角色权限体系（访客/作者/管理员/Agent）、v0~v2 边界 |
| **[总体技术设计 (technical-design.md)](technical-design.md)** | 全栈工程师 | Next.js 16 + Payload CMS 3 + PostgreSQL 架构、集合建模、事务与版本锁 |
| **[版本演进路线 (roadmap.md)](roadmap.md)** | 架构师、开发者 | 各阶段里程碑、进入/退出准则、依赖项与交付物清单 |
| **[技术决策记录 (decisions.md)](decisions.md)** | 架构师、交接人 | 核心技术选型（Turbopack、Lexical、Docker Postgres、Spring 动效等）决策日志 |

---

## 2. 协议规范、前端适配与开源溯源

| 文档 | 核心受众 | 核心内容与范围 |
| :--- | :--- | :--- |
| **[v1 MCP 工具协议契约 (mcp-tools.md)](mcp-tools.md)** | Agent 工程师 | 12 个 Streamable HTTP 工具契约、输入输出 DTO、Revision 乐观锁规范 |
| **[前端设计系统适配 (frontend-adaptation.md)](frontend-adaptation.md)** | 前端工程师 | Innei Shiro / Yohaku 极简纸面美学基因、常驻居中胶囊导航、动画参数 |
| **[源数据与开源溯源记录 (PROVENANCE.md)](PROVENANCE.md)** | 合规审计、开发者 | 快照基准（`20261001`）、死数据彻底解耦明细、AGPL-3.0 授权、16 处 Whiteboard 审计 |
| **[Yohaku 深度转换记录 (yohaku-conversion.md)](yohaku-conversion.md)** | 转换工程师 | 30 篇基准文章转换、Lexical 富文本映射、官方删改与差异清单收尾 |

---

## 3. 使用手册、测试与运维

| 文档 | 核心受众 | 核心内容与范围 |
| :--- | :--- | :--- |
| **[博客使用与管理手册 (user-guide.md)](user-guide.md)** | 管理员、写作者 | 后台登录、文章撰写/置顶、分类管理、站点设置、开站日期与名言配置 |
| **[测试方案与用例规范 (testing.md)](testing.md)** | 测试工程师、QA | 单元测试、集成测试与 Playwright E2E 跨端动效回归测试规范 |
| **[系统终验与测试记录 (acceptance.md)](acceptance.md)** | 验收人、客户 | 24 项全量自动化测试矩阵（100% 通过）实测结果与验证报告 |
| **[部署与生产迁移指南 (deployment.md)](deployment.md)** | DevOps 运维 | 本地 Docker 启动、数据备份/恢复、生产编译与环境变量配置 |

---

## 4. 历史与阶段性归档（docs/archive/）

以下文档记录了开发过程中的阶段性分工与过渡审计，已做归档处理，保留供历史溯源：

- **[archive/yohaku-handoff.md](archive/yohaku-handoff.md)**：开发过程中的阶段性任务交接记录；
- **[archive/yohaku-visual-report.md](archive/yohaku-visual-report.md)**：早期阶段多视口/深浅色矩阵截图审查单；
- **[archive/yohaku-interaction-report.md](archive/yohaku-interaction-report.md)**：早期阶段导航、目录、搜索动效回归实测报告；
- **[archive/work-allocation.md](archive/work-allocation.md)**：立项初期双人开发 A/B 模块归属分工表；
- **[archive/shiro-integration-guide.md](archive/shiro-integration-guide.md)**：早期 Shiro 单一模板适配指引（已被 Yohaku 体系覆盖）。
