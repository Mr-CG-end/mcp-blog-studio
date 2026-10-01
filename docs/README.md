# MCP Blog Studio 文档中心

> **项目版本路线**：**v0 普通博客（已就绪） → v1 远程 MCP（设计就绪） → v2 WebMCP（未来规划）**。  
> 本目录收录系统的需求设计、架构设计、MCP 工具协议契约以及开发测试部署指南。

---

## 1. 核心设计与产品规划

| 文档 | 核心受众 | 核心内容与范围 |
| :--- | :--- | :--- |
| **[需求文档 (requirements.md)](requirements.md)** | 开发者、产品负责人 | 系统目标、角色权限体系（访客/作者/管理员/Agent）、v0~v2 阶段演进边界 |
| **[总体技术设计 (technical-design.md)](technical-design.md)** | 全栈工程师 | Next.js 16 + Payload CMS 3 + PostgreSQL 架构、集合建模、事务与版本并发锁 |
| **[版本演进路线 (roadmap.md)](roadmap.md)** | 架构师、开发者 | 各阶段里程碑规划、准入/准出准则、依赖项与交付物全景图 |
| **[双人分工与协作方案 (work-allocation.md)](work-allocation.md)** | 开发者、协作团队 | 责任域划分、A/B 角色模块拆解、12 个工具归属与联调交接标准 |

---

## 2. 协议规范与契约

| 文档 | 核心受众 | 核心内容与范围 |
| :--- | :--- | :--- |
| **[v1 MCP 工具协议契约 (mcp-tools.md)](mcp-tools.md)** | AI Agent 工程师 | 12 个 Streamable HTTP 工具契约、输入输出 DTO 定义、Revision 乐观锁防撞规范 |

---

## 3. 使用手册、测试与运维部署

| 文档 | 核心受众 | 核心内容与范围 |
| :--- | :--- | :--- |
| **[博客使用与管理手册 (user-guide.md)](user-guide.md)** | 管理员、写作者 | 后台登录、文章撰写/置顶、分类管理、站点设置、开站日期与名言配置 |
| **[测试方案与用例规范 (testing.md)](testing.md)** | 测试工程师、QA | 单元测试、PostgreSQL 权限集成测试与 Playwright 自动化回归规范 |
| **[部署与生产迁移指南 (deployment.md)](deployment.md)** | DevOps 运维 | Vercel+Neon 云端部署、本地 Docker 启动、数据备份与生产环境变量配置 |

