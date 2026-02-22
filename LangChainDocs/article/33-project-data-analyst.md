# 33. 项目实战：数据分析助手

## 项目概述

### 简单来说

构建一个智能数据分析平台，用户只需用自然语言描述分析需求，系统就能自动：
- 将自然语言转换为 SQL 查询
- 执行查询并获取数据
- 生成数据可视化图表
- 整合多个数据源
- 生成完整的分析报告

### 核心功能

| 功能 | 描述 |
|------|------|
| 自然语言转 SQL | 理解用户问题，自动生成正确的 SQL 查询 |
| 多数据源支持 | 支持 MySQL、PostgreSQL、SQLite 等数据库 |
| 数据可视化 | 自动选择合适的图表类型，生成可视化 |
| 统计分析 | 自动进行趋势分析、对比分析、异常检测 |
| 报告生成 | 整合查询结果、图表、分析结论生成报告 |
| 交互式探索 | 支持追问和深入分析 |

### 技术亮点

```
┌─────────────────────────────────────────────────────────────────┐
│                    数据分析助手技术架构                            │
├─────────────────────────────────────────────────────────────────┤
│  前端：React 18 + TypeScript + Ant Design + ECharts + Zustand   │
│  后端：Express + Prisma + MySQL + Redis                         │
│  AI：LangChain 1.x + Router + Subagents + 结构化输出             │
│  数据库连接：多数据源适配器                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 一、系统架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               前端层                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  查询界面  │  │ 图表展示  │  │  报告预览  │  │ 数据源管理 │  │  历史记录  │      │
│  │          │  │ (ECharts) │  │          │  │          │  │          │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       └──────────────┴──────────────┴──────────────┴──────────────┘          │
│                                     │                                        │
│                              ┌──────┴───────┐                                │
│                              │ Zustand Store │  ← 状态管理                    │
│                              └──────┬────────┘                                │
└─────────────────────────────────────┼────────────────────────────────────────┘
                                      │ HTTP/SSE
┌─────────────────────────────────────┼────────────────────────────────────────┐
│                                     ▼              后端层                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Express API Server                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │  │
│  │  │ /analyze │  │ /query   │  │ /report  │  │/datasource│              │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘              │  │
│  └───────┼──────────────┼──────────────┼──────────────┼──────────────────┘  │
│          │              │              │              │                      │
│  ┌───────┴──────────────┴──────────────┴──────────────┴──────────────────┐  │
│  │                         Service Layer                                 │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │  │
│  │  │AnalyzeService│ │QueryService │ │ReportService│ │DataSourceService│  │  │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘     │  │
│  └─────────┼───────────────┼───────────────┼───────────────┼────────────┘  │
│            │               │               │               │               │
│  ┌─────────┴───────────────┴───────────────┴───────────────┴────────────┐  │
│  │                    AI Agent Layer (核心)                              │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                    Router (意图路由器)                           │ │  │
│  │  │                                                                 │ │  │
│  │  │   分析用户意图，路由到对应的 Sub-Agent：                         │ │  │
│  │  │   ┌──────────────┬──────────────┬──────────────┬─────────────┐ │ │  │
│  │  │   │ 数据查询意图  │ 可视化意图   │ 分析意图     │ 报告意图    │ │ │  │
│  │  │   └──────┬───────┴──────┬───────┴──────┬───────┴──────┬──────┘ │ │  │
│  │  └──────────┼──────────────┼──────────────┼──────────────┼────────┘ │  │
│  │             ▼              ▼              ▼              ▼          │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                    Sub-Agents (专业 Agent)                       │ │  │
│  │  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │ │  │
│  │  │  │ SQL Agent │ │Viz Agent  │ │Stats Agent│ │Report Agent│       │ │  │
│  │  │  │ 自然语言   │ │数据可视化  │ │统计分析   │ │报告生成   │       │ │  │
│  │  │  │ 转 SQL    │ │生成图表   │ │趋势/异常  │ │整合输出   │       │ │  │
│  │  │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘       │ │  │
│  │  └────────┼─────────────┼─────────────┼─────────────┼─────────────┘ │  │
│  └───────────┼─────────────┼─────────────┼─────────────┼───────────────┘  │
│              │             │             │             │                   │
│  ┌───────────┴─────────────┴─────────────┴─────────────┴───────────────┐  │
│  │                    Data Source Adapter Layer                        │  │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │  │
│  │   │ MySQL   │ │PostgreSQL│ │ SQLite  │ │ClickHouse│ │  CSV    │      │  │
│  │   │Adapter  │ │ Adapter │ │ Adapter │ │ Adapter │ │ Adapter │      │  │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                                      ▼            数据层                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ 系统数据库    │  │    Redis     │  │  用户数据库   │  │  文件存储    │    │
│  │  (Prisma)    │  │   (缓存)     │  │  (多数据源)   │  │  (图表/报告) │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心概念解析

#### 什么是 Router + Subagents 模式？

这是一种**两层架构**：
- **Router（路由层）**：分析用户意图，决定将任务分发给哪个 Sub-Agent
- **Subagents（执行层）**：专门处理特定类型任务的专业 Agent

```
┌─────────────────────────────────────────────────────────────────┐
│               Router + Subagents 架构                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  用户: "帮我分析上个月的销售数据，做成图表"                        │
│              │                                                   │
│              ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      Router (路由器)                         ││
│  │                                                             ││
│  │  意图分析:                                                  ││
│  │  1. "分析上个月的销售数据" → 需要 SQL 查询                   ││
│  │  2. "做成图表" → 需要数据可视化                              ││
│  │                                                             ││
│  │  路由决策: SQL Agent → Viz Agent (串行执行)                  ││
│  └─────────────────────────────────────────────────────────────┘│
│              │                                                   │
│     ┌────────┴────────┐                                         │
│     ▼                 ▼                                         │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │ SQL Agent   │  │ Viz Agent   │                               │
│  │             │  │             │                               │
│  │ 生成 SQL:   │  │ 接收数据    │                               │
│  │ SELECT ...  │→ │ 生成柱状图  │                               │
│  │ 执行查询    │  │             │                               │
│  └─────────────┘  └─────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**与 Handoffs 的区别：**

| 特性 | Router + Subagents | Handoffs |
|-----|-------------------|----------|
| 控制权 | Router 始终保持控制 | Agent 之间转移控制权 |
| 任务分配 | 主动分配，可并行/串行 | 被动交接，线性流转 |
| 适用场景 | 任务可分解为独立子任务 | 需要专家协作对话 |
| 复杂度 | 较低，易于理解 | 较高，需要设计交接逻辑 |

#### Custom Workflow（自定义工作流）

数据分析场景需要灵活的工作流：

```
┌─────────────────────────────────────────────────────────────────┐
│               Custom Workflow 示例                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  场景: "对比今年和去年的销售趋势，生成分析报告"                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    自定义工作流                              ││
│  │                                                             ││
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐                 ││
│  │  │ SQL     │    │ SQL     │    │         │                 ││
│  │  │ Agent   │    │ Agent   │    │ Stats   │                 ││
│  │  │ (今年)  │    │ (去年)  │───→│ Agent   │                 ││
│  │  └────┬────┘    └────┬────┘    │ (对比)  │                 ││
│  │       │              │         └────┬────┘                 ││
│  │       │   并行执行    │              │                      ││
│  │       └──────┬───────┘              │                      ││
│  │              │                      │                      ││
│  │              ▼                      ▼                      ││
│  │         ┌─────────┐           ┌─────────┐                  ││
│  │         │ Viz     │           │ Report  │                  ││
│  │         │ Agent   │──────────→│ Agent   │                  ││
│  │         │ (趋势图)│           │ (报告)  │                  ││
│  │         └─────────┘           └─────────┘                  ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  特点：                                                          │
│  • 可并行执行多个 SQL 查询                                       │
│  • 可串行执行依赖任务                                            │
│  • 灵活组合不同 Agent                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 核心流程

```
用户输入 "上个月哪个产品销量最好？"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Router 分析意图                                         │
│  意图: 数据查询                                                  │
│  需要: SQL Agent                                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: SQL Agent 生成查询                                      │
│                                                                  │
│  1. 获取数据库 Schema                                            │
│  2. 生成 SQL:                                                    │
│     SELECT product_name, SUM(quantity) as total                 │
│     FROM orders                                                  │
│     WHERE order_date >= '2024-12-01'                            │
│     GROUP BY product_name                                        │
│     ORDER BY total DESC                                          │
│     LIMIT 1                                                      │
│  3. 执行查询，获取结果                                           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: 生成回答                                                │
│  "上个月销量最好的产品是 [产品名]，                               │
│   共售出 [数量] 件。"                                            │
└───────────────────────────────────────────────────────────────────┘
```

---

## 二、数据库设计

### 2.1 ER 图

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      users       │       │   data_sources   │       │     queries      │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ email            │───────│ userId (FK)      │───────│ userId (FK)      │
│ name             │       │ name             │       │ dataSourceId(FK) │
│ role             │       │ type             │       │ naturalLanguage  │
│ createdAt        │       │ config           │       │ generatedSQL     │
└──────────────────┘       │ schema           │       │ result           │
                           │ status           │       │ executionTime    │
                           │ createdAt        │       │ createdAt        │
                           └──────────────────┘       └──────────────────┘
                                   │
                                   │
┌──────────────────┐       ┌──────┴───────────┐       ┌──────────────────┐
│  visualizations  │       │     reports      │       │   conversations  │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ queryId (FK)     │       │ userId (FK)      │       │ userId (FK)      │
│ chartType        │       │ title            │       │ dataSourceId(FK) │
│ chartConfig      │       │ content          │       │ threadId         │
│ imageUrl         │       │ queries[]        │       │ createdAt        │
│ createdAt        │       │ visualizations[] │       └──────────────────┘
└──────────────────┘       │ createdAt        │
                           └──────────────────┘
```

### 2.2 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  name          String
  role          UserRole       @default(USER)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  dataSources   DataSource[]
  queries       Query[]
  reports       Report[]
  conversations Conversation[]
}

enum UserRole {
  USER
  ANALYST
  ADMIN
}

model DataSource {
  id        String           @id @default(uuid())
  userId    String
  name      String
  type      DataSourceType
  config    Json             // 连接配置（加密存储）
  schema    Json?            // 数据库 Schema 缓存
  status    DataSourceStatus @default(PENDING)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
  
  user          User           @relation(fields: [userId], references: [id])
  queries       Query[]
  conversations Conversation[]
}

enum DataSourceType {
  MYSQL
  POSTGRESQL
  SQLITE
  CLICKHOUSE
  CSV
}

enum DataSourceStatus {
  PENDING     // 待验证
  CONNECTED   // 已连接
  ERROR       // 连接错误
}

model Query {
  id              String    @id @default(uuid())
  userId          String
  dataSourceId    String
  naturalLanguage String    @db.Text
  generatedSQL    String    @db.Text
  result          Json?     // 查询结果
  rowCount        Int?
  executionTime   Int?      // 毫秒
  error           String?   @db.Text
  createdAt       DateTime  @default(now())
  
  user          User           @relation(fields: [userId], references: [id])
  dataSource    DataSource     @relation(fields: [dataSourceId], references: [id])
  visualizations Visualization[]
}

model Visualization {
  id          String    @id @default(uuid())
  queryId     String
  chartType   ChartType
  chartConfig Json      // ECharts 配置
  imageUrl    String?   // 导出的图片 URL
  createdAt   DateTime  @default(now())
  
  query Query @relation(fields: [queryId], references: [id])
}

enum ChartType {
  LINE      // 折线图
  BAR       // 柱状图
  PIE       // 饼图
  SCATTER   // 散点图
  AREA      // 面积图
  HEATMAP   // 热力图
  TABLE     // 表格
}

model Report {
  id        String   @id @default(uuid())
  userId    String
  title     String
  content   String   @db.LongText  // Markdown 内容
  queries   Json     // 关联的查询 ID 列表
  charts    Json     // 关联的图表 ID 列表
  status    ReportStatus @default(DRAFT)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id])
}

enum ReportStatus {
  DRAFT      // 草稿
  PUBLISHED  // 已发布
}

model Conversation {
  id           String   @id @default(uuid())
  userId       String
  dataSourceId String
  threadId     String   @unique
  title        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  user       User       @relation(fields: [userId], references: [id])
  dataSource DataSource @relation(fields: [dataSourceId], references: [id])
  messages   Message[]
}

model Message {
  id             String      @id @default(uuid())
  conversationId String
  role           MessageRole
  content        String      @db.LongText
  metadata       Json?       // SQL、图表配置等
  createdAt      DateTime    @default(now())
  
  conversation Conversation @relation(fields: [conversationId], references: [id])
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}
```

---

## 三、数据源适配器

### 3.1 适配器接口设计

```typescript
// src/datasource/types.ts

export interface DatabaseSchema {
  tables: TableSchema[];
  views?: ViewSchema[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKey?: string[];
  foreignKeys?: ForeignKeySchema[];
  indexes?: IndexSchema[];
  rowCount?: number;
  sampleData?: Record<string, unknown>[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  comment?: string;
}

export interface ForeignKeySchema {
  column: string;
  references: {
    table: string;
    column: string;
  };
}

export interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface ViewSchema {
  name: string;
  definition: string;
  columns: ColumnSchema[];
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
}

export interface DataSourceAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;
  getSchema(): Promise<DatabaseSchema>;
  executeQuery(sql: string): Promise<QueryResult>;
  explainQuery(sql: string): Promise<string>;
}

export interface DataSourceConfig {
  type: "mysql" | "postgresql" | "sqlite" | "clickhouse" | "csv";
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  filePath?: string;  // 用于 SQLite 和 CSV
}
```

### 3.2 MySQL 适配器实现

```typescript
// src/datasource/adapters/mysql.adapter.ts
import mysql, { Pool, PoolConnection } from "mysql2/promise";
import {
  DataSourceAdapter,
  DataSourceConfig,
  DatabaseSchema,
  QueryResult,
  TableSchema,
  ColumnSchema,
} from "../types";

export class MySQLAdapter implements DataSourceAdapter {
  private pool: Pool | null = null;
  private config: DataSourceConfig;

  constructor(config: DataSourceConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port || 3306,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const connection = await this.pool!.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getSchema(): Promise<DatabaseSchema> {
    const tables: TableSchema[] = [];
    
    // 获取所有表
    const [tableRows] = await this.pool!.query(`
      SELECT TABLE_NAME, TABLE_ROWS
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_TYPE = 'BASE TABLE'
    `, [this.config.database]);

    for (const table of tableRows as any[]) {
      const tableName = table.TABLE_NAME;
      
      // 获取列信息
      const [columnRows] = await this.pool!.query(`
        SELECT 
          COLUMN_NAME, DATA_TYPE, IS_NULLABLE, 
          COLUMN_DEFAULT, COLUMN_COMMENT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [this.config.database, tableName]);

      const columns: ColumnSchema[] = (columnRows as any[]).map((col) => ({
        name: col.COLUMN_NAME,
        type: col.DATA_TYPE,
        nullable: col.IS_NULLABLE === "YES",
        defaultValue: col.COLUMN_DEFAULT,
        comment: col.COLUMN_COMMENT,
      }));

      // 获取主键
      const [pkRows] = await this.pool!.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ? 
          AND TABLE_NAME = ?
          AND CONSTRAINT_NAME = 'PRIMARY'
      `, [this.config.database, tableName]);

      // 获取外键
      const [fkRows] = await this.pool!.query(`
        SELECT 
          COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [this.config.database, tableName]);

      // 获取示例数据
      const [sampleRows] = await this.pool!.query(
        `SELECT * FROM \`${tableName}\` LIMIT 3`
      );

      tables.push({
        name: tableName,
        columns,
        primaryKey: (pkRows as any[]).map((pk) => pk.COLUMN_NAME),
        foreignKeys: (fkRows as any[]).map((fk) => ({
          column: fk.COLUMN_NAME,
          references: {
            table: fk.REFERENCED_TABLE_NAME,
            column: fk.REFERENCED_COLUMN_NAME,
          },
        })),
        rowCount: table.TABLE_ROWS,
        sampleData: sampleRows as Record<string, unknown>[],
      });
    }

    return { tables };
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    const startTime = Date.now();
    
    const [rows, fields] = await this.pool!.query(sql);
    
    const executionTime = Date.now() - startTime;
    const columns = fields ? (fields as any[]).map((f) => f.name) : [];
    
    return {
      columns,
      rows: rows as Record<string, unknown>[],
      rowCount: Array.isArray(rows) ? rows.length : 0,
      executionTime,
    };
  }

  async explainQuery(sql: string): Promise<string> {
    const [rows] = await this.pool!.query(`EXPLAIN ${sql}`);
    return JSON.stringify(rows, null, 2);
  }
}
```

### 3.3 适配器工厂

```typescript
// src/datasource/factory.ts
import { DataSourceAdapter, DataSourceConfig } from "./types";
import { MySQLAdapter } from "./adapters/mysql.adapter";
import { PostgreSQLAdapter } from "./adapters/postgresql.adapter";
import { SQLiteAdapter } from "./adapters/sqlite.adapter";

export function createDataSourceAdapter(
  config: DataSourceConfig
): DataSourceAdapter {
  switch (config.type) {
    case "mysql":
      return new MySQLAdapter(config);
    case "postgresql":
      return new PostgreSQLAdapter(config);
    case "sqlite":
      return new SQLiteAdapter(config);
    default:
      throw new Error(`Unsupported data source type: ${config.type}`);
  }
}
```

---

## 四、AI Agent 核心实现

### 4.1 State 定义

```typescript
// src/agents/types.ts
import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { DatabaseSchema, QueryResult } from "../datasource/types";

export type IntentType =
  | "query"        // 数据查询
  | "visualize"    // 数据可视化
  | "analyze"      // 统计分析
  | "report"       // 生成报告
  | "schema"       // 查询结构
  | "general";     // 一般问题

export interface IntentAnalysis {
  primary: IntentType;
  secondary?: IntentType[];
  entities: {
    tables?: string[];
    columns?: string[];
    timeRange?: { start: string; end: string };
    metrics?: string[];
    dimensions?: string[];
    filters?: string[];
  };
  confidence: number;
}

export interface GeneratedSQL {
  sql: string;
  explanation: string;
  complexity: "simple" | "moderate" | "complex";
  warnings?: string[];
}

export interface ChartConfig {
  type: "line" | "bar" | "pie" | "scatter" | "area" | "heatmap" | "table";
  title: string;
  xAxis?: { field: string; label: string };
  yAxis?: { field: string; label: string };
  series?: { field: string; label: string }[];
  options?: Record<string, unknown>;
}

export interface AnalysisResult {
  summary: string;
  insights: string[];
  trends?: {
    direction: "up" | "down" | "stable";
    percentage: number;
    description: string;
  };
  anomalies?: {
    value: unknown;
    expectedRange: { min: number; max: number };
    description: string;
  }[];
  recommendations?: string[];
}

export const DataAnalystState = Annotation.Root({
  ...MessagesAnnotation.spec,
  
  // 数据源信息
  dataSourceId: Annotation<string>(),
  databaseSchema: Annotation<DatabaseSchema | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  
  // 意图分析结果
  intent: Annotation<IntentAnalysis | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  
  // SQL 相关
  generatedSQL: Annotation<GeneratedSQL | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  queryResult: Annotation<QueryResult | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  
  // 可视化相关
  chartConfig: Annotation<ChartConfig | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  
  // 分析结果
  analysisResult: Annotation<AnalysisResult | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  
  // 工作流步骤
  workflowSteps: Annotation<string[]>({
    default: () => [],
    reducer: (_, v) => v,
  }),
  currentStep: Annotation<number>({
    default: () => 0,
    reducer: (_, v) => v,
  }),
});

export type DataAnalystStateType = typeof DataAnalystState.State;
```

### 4.2 结构化输出 Schema

```typescript
// src/agents/schemas.ts
import { z } from "zod";

// 意图分析 Schema
export const IntentAnalysisSchema = z.object({
  primary: z.enum(["query", "visualize", "analyze", "report", "schema", "general"]),
  secondary: z.array(z.enum(["query", "visualize", "analyze", "report", "schema", "general"])).optional(),
  entities: z.object({
    tables: z.array(z.string()).optional(),
    columns: z.array(z.string()).optional(),
    timeRange: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
    metrics: z.array(z.string()).optional(),
    dimensions: z.array(z.string()).optional(),
    filters: z.array(z.string()).optional(),
  }),
  confidence: z.number().min(0).max(1),
});

// SQL 生成 Schema
export const SQLGenerationSchema = z.object({
  sql: z.string().describe("生成的 SQL 语句"),
  explanation: z.string().describe("SQL 逻辑解释"),
  complexity: z.enum(["simple", "moderate", "complex"]),
  warnings: z.array(z.string()).optional().describe("潜在问题警告"),
});

// 图表配置 Schema
export const ChartConfigSchema = z.object({
  type: z.enum(["line", "bar", "pie", "scatter", "area", "heatmap", "table"]),
  title: z.string().describe("图表标题"),
  xAxis: z.object({
    field: z.string(),
    label: z.string(),
  }).optional(),
  yAxis: z.object({
    field: z.string(),
    label: z.string(),
  }).optional(),
  series: z.array(z.object({
    field: z.string(),
    label: z.string(),
  })).optional(),
  options: z.record(z.unknown()).optional(),
  recommendation: z.string().describe("选择此图表类型的原因"),
});

// 数据分析 Schema
export const DataAnalysisSchema = z.object({
  summary: z.string().describe("数据摘要"),
  insights: z.array(z.string()).describe("关键洞察"),
  trends: z.object({
    direction: z.enum(["up", "down", "stable"]),
    percentage: z.number(),
    description: z.string(),
  }).optional(),
  anomalies: z.array(z.object({
    value: z.unknown(),
    expectedRange: z.object({
      min: z.number(),
      max: z.number(),
    }),
    description: z.string(),
  })).optional(),
  recommendations: z.array(z.string()).optional(),
});

// 报告生成 Schema
export const ReportGenerationSchema = z.object({
  title: z.string(),
  sections: z.array(z.object({
    heading: z.string(),
    content: z.string(),
    chartId: z.string().optional(),
    tableData: z.array(z.record(z.unknown())).optional(),
  })),
  conclusion: z.string(),
  methodology: z.string().optional(),
});
```

### 4.3 Router 实现

```typescript
// src/agents/router.ts
import { ChatOpenAI } from "@langchain/openai";
import { IntentAnalysisSchema } from "./schemas";
import { IntentAnalysis, DataAnalystStateType } from "./types";
import { DatabaseSchema } from "../datasource/types";

export class IntentRouter {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0,
    });
  }

  async analyzeIntent(
    userMessage: string,
    schema: DatabaseSchema | null
  ): Promise<IntentAnalysis> {
    const schemaDescription = schema
      ? this.formatSchemaForPrompt(schema)
      : "数据库 Schema 未加载";

    const result = await this.model
      .withStructuredOutput(IntentAnalysisSchema)
      .invoke([
        {
          role: "system",
          content: `你是一个数据分析意图识别器。根据用户输入和数据库结构，分析用户的意图。

## 意图类型
- query: 数据查询（如：查询、找出、列出、多少）
- visualize: 数据可视化（如：图表、趋势图、饼图、柱状图）
- analyze: 统计分析（如：分析、对比、趋势、异常、预测）
- report: 生成报告（如：报告、总结、汇总）
- schema: 查询结构（如：有哪些表、字段是什么）
- general: 一般问题

## 数据库结构
${schemaDescription}

## 任务
1. 识别主要意图和次要意图
2. 提取涉及的表、字段、时间范围、指标、维度、过滤条件
3. 评估识别置信度`,
        },
        { role: "user", content: userMessage },
      ]);

    return result as IntentAnalysis;
  }

  private formatSchemaForPrompt(schema: DatabaseSchema): string {
    return schema.tables
      .map((table) => {
        const columns = table.columns
          .map((col) => `  - ${col.name} (${col.type})${col.comment ? `: ${col.comment}` : ""}`)
          .join("\n");
        return `表: ${table.name}\n${columns}`;
      })
      .join("\n\n");
  }

  determineWorkflow(intent: IntentAnalysis): string[] {
    const steps: string[] = [];

    switch (intent.primary) {
      case "query":
        steps.push("sql_agent");
        break;
        
      case "visualize":
        steps.push("sql_agent", "viz_agent");
        break;
        
      case "analyze":
        steps.push("sql_agent", "stats_agent");
        if (intent.secondary?.includes("visualize")) {
          steps.push("viz_agent");
        }
        break;
        
      case "report":
        steps.push("sql_agent", "stats_agent", "viz_agent", "report_agent");
        break;
        
      case "schema":
        steps.push("schema_agent");
        break;
        
      default:
        steps.push("general_agent");
    }

    return steps;
  }
}
```

### 4.4 SQL Agent 实现

```typescript
// src/agents/sql-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SystemMessage } from "@langchain/core/messages";
import { SQLGenerationSchema } from "./schemas";
import { DatabaseSchema, QueryResult } from "../datasource/types";
import { DataSourceAdapter } from "../datasource/types";
import { GeneratedSQL, DataAnalystStateType } from "./types";

export class SQLAgent {
  private model: ChatOpenAI;
  private adapter: DataSourceAdapter;
  private schema: DatabaseSchema;

  constructor(adapter: DataSourceAdapter, schema: DatabaseSchema) {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0,
    });
    this.adapter = adapter;
    this.schema = schema;
  }

  async generateSQL(userQuery: string): Promise<GeneratedSQL> {
    const schemaPrompt = this.formatSchemaForSQL();

    const result = await this.model
      .withStructuredOutput(SQLGenerationSchema)
      .invoke([
        {
          role: "system",
          content: `你是一个专业的 SQL 生成专家。根据用户的自然语言问题，生成正确的 SQL 查询。

## 数据库结构
${schemaPrompt}

## SQL 生成规则
1. 只使用存在的表和字段
2. 使用正确的 JOIN 条件
3. 日期字段使用正确的格式
4. 大数据量查询添加 LIMIT
5. 避免 SELECT *，明确列出需要的字段
6. 使用有意义的别名

## 输出要求
1. 生成可执行的 SQL
2. 解释 SQL 逻辑
3. 评估查询复杂度
4. 如有潜在问题（如全表扫描），给出警告`,
        },
        { role: "user", content: userQuery },
      ]);

    return result as GeneratedSQL;
  }

  async executeSQL(sql: string): Promise<QueryResult> {
    return this.adapter.executeQuery(sql);
  }

  async generateAndExecute(
    userQuery: string
  ): Promise<{ sql: GeneratedSQL; result: QueryResult }> {
    const sql = await this.generateSQL(userQuery);
    const result = await this.executeSQL(sql.sql);
    return { sql, result };
  }

  private formatSchemaForSQL(): string {
    return this.schema.tables
      .map((table) => {
        const columns = table.columns
          .map((col) => {
            let def = `  ${col.name} ${col.type}`;
            if (!col.nullable) def += " NOT NULL";
            if (col.comment) def += ` -- ${col.comment}`;
            return def;
          })
          .join(",\n");

        const pk = table.primaryKey?.length
          ? `\n  PRIMARY KEY (${table.primaryKey.join(", ")})`
          : "";

        const fks = table.foreignKeys
          ?.map(
            (fk) =>
              `\n  FOREIGN KEY (${fk.column}) REFERENCES ${fk.references.table}(${fk.references.column})`
          )
          .join("") || "";

        return `CREATE TABLE ${table.name} (\n${columns}${pk}${fks}\n);`;
      })
      .join("\n\n");
  }
}

// 创建 SQL Agent 节点
export async function sqlAgentNode(
  state: DataAnalystStateType,
  adapter: DataSourceAdapter
): Promise<Partial<DataAnalystStateType>> {
  if (!state.databaseSchema) {
    return {
      messages: [{ role: "assistant", content: "请先连接数据源" }],
    };
  }

  const agent = new SQLAgent(adapter, state.databaseSchema);
  const lastMessage = state.messages[state.messages.length - 1];
  const userQuery = lastMessage.content as string;

  try {
    const { sql, result } = await agent.generateAndExecute(userQuery);

    return {
      generatedSQL: sql,
      queryResult: result,
      currentStep: state.currentStep + 1,
    };
  } catch (error) {
    return {
      generatedSQL: null,
      queryResult: null,
      messages: [
        {
          role: "assistant",
          content: `SQL 执行失败: ${(error as Error).message}`,
        },
      ],
    };
  }
}
```

### 4.5 可视化 Agent 实现

```typescript
// src/agents/viz-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { ChartConfigSchema } from "./schemas";
import { ChartConfig, DataAnalystStateType } from "./types";
import { QueryResult } from "../datasource/types";

export class VizAgent {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.2,
    });
  }

  async selectChartType(
    userQuery: string,
    queryResult: QueryResult
  ): Promise<ChartConfig> {
    const dataPreview = this.formatDataPreview(queryResult);

    const result = await this.model
      .withStructuredOutput(ChartConfigSchema)
      .invoke([
        {
          role: "system",
          content: `你是一个数据可视化专家。根据用户需求和数据特征，选择最合适的图表类型并生成配置。

## 图表选择指南
- line（折线图）：展示时间序列趋势
- bar（柱状图）：对比不同类别的数值
- pie（饼图）：展示占比分布（适合 < 10 个类别）
- scatter（散点图）：展示两个变量的关系
- area（面积图）：展示累积趋势
- heatmap（热力图）：展示矩阵数据的密度
- table（表格）：展示详细数据或复杂结构

## 数据概览
${dataPreview}

## 任务
1. 分析数据特征
2. 选择最合适的图表类型
3. 配置坐标轴和系列
4. 说明选择原因`,
        },
        { role: "user", content: userQuery },
      ]);

    return result as ChartConfig;
  }

  generateEChartsConfig(chartConfig: ChartConfig, data: QueryResult): unknown {
    const baseConfig = {
      title: { text: chartConfig.title },
      tooltip: { trigger: "axis" },
      legend: {},
    };

    switch (chartConfig.type) {
      case "line":
        return {
          ...baseConfig,
          xAxis: {
            type: "category",
            data: data.rows.map((r) => r[chartConfig.xAxis!.field]),
          },
          yAxis: { type: "value", name: chartConfig.yAxis?.label },
          series: chartConfig.series?.map((s) => ({
            name: s.label,
            type: "line",
            data: data.rows.map((r) => r[s.field]),
          })) || [{
            type: "line",
            data: data.rows.map((r) => r[chartConfig.yAxis!.field]),
          }],
        };

      case "bar":
        return {
          ...baseConfig,
          xAxis: {
            type: "category",
            data: data.rows.map((r) => r[chartConfig.xAxis!.field]),
          },
          yAxis: { type: "value", name: chartConfig.yAxis?.label },
          series: chartConfig.series?.map((s) => ({
            name: s.label,
            type: "bar",
            data: data.rows.map((r) => r[s.field]),
          })) || [{
            type: "bar",
            data: data.rows.map((r) => r[chartConfig.yAxis!.field]),
          }],
        };

      case "pie":
        return {
          ...baseConfig,
          series: [
            {
              type: "pie",
              radius: "50%",
              data: data.rows.map((r) => ({
                name: r[chartConfig.xAxis!.field],
                value: r[chartConfig.yAxis!.field],
              })),
            },
          ],
        };

      case "scatter":
        return {
          ...baseConfig,
          xAxis: { type: "value", name: chartConfig.xAxis?.label },
          yAxis: { type: "value", name: chartConfig.yAxis?.label },
          series: [
            {
              type: "scatter",
              data: data.rows.map((r) => [
                r[chartConfig.xAxis!.field],
                r[chartConfig.yAxis!.field],
              ]),
            },
          ],
        };

      case "table":
        return {
          columns: data.columns.map((col) => ({
            title: col,
            dataIndex: col,
            key: col,
          })),
          dataSource: data.rows.map((row, index) => ({
            ...row,
            key: index,
          })),
        };

      default:
        return baseConfig;
    }
  }

  private formatDataPreview(result: QueryResult): string {
    const preview = {
      columns: result.columns,
      rowCount: result.rowCount,
      sampleRows: result.rows.slice(0, 5),
      columnTypes: this.inferColumnTypes(result),
    };
    return JSON.stringify(preview, null, 2);
  }

  private inferColumnTypes(
    result: QueryResult
  ): Record<string, "number" | "string" | "date" | "boolean"> {
    const types: Record<string, "number" | "string" | "date" | "boolean"> = {};

    for (const col of result.columns) {
      const sampleValues = result.rows.slice(0, 10).map((r) => r[col]);
      types[col] = this.inferType(sampleValues);
    }

    return types;
  }

  private inferType(
    values: unknown[]
  ): "number" | "string" | "date" | "boolean" {
    for (const value of values) {
      if (value === null || value === undefined) continue;

      if (typeof value === "number") return "number";
      if (typeof value === "boolean") return "boolean";

      const strValue = String(value);
      if (/^\d{4}-\d{2}-\d{2}/.test(strValue)) return "date";
      if (!isNaN(Number(strValue))) return "number";
    }

    return "string";
  }
}

// 创建可视化 Agent 节点
export async function vizAgentNode(
  state: DataAnalystStateType
): Promise<Partial<DataAnalystStateType>> {
  if (!state.queryResult) {
    return {
      chartConfig: null,
      messages: [{ role: "assistant", content: "没有数据可用于可视化" }],
    };
  }

  const agent = new VizAgent();
  const lastMessage = state.messages[state.messages.length - 1];
  const userQuery = lastMessage.content as string;

  const chartConfig = await agent.selectChartType(userQuery, state.queryResult);
  const echartsConfig = agent.generateEChartsConfig(
    chartConfig,
    state.queryResult
  );

  return {
    chartConfig: {
      ...chartConfig,
      options: echartsConfig as Record<string, unknown>,
    },
    currentStep: state.currentStep + 1,
  };
}
```

### 4.6 统计分析 Agent 实现

```typescript
// src/agents/stats-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { DataAnalysisSchema } from "./schemas";
import { AnalysisResult, DataAnalystStateType } from "./types";
import { QueryResult } from "../datasource/types";

export class StatsAgent {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.1,
    });
  }

  async analyzeData(
    userQuery: string,
    queryResult: QueryResult
  ): Promise<AnalysisResult> {
    // 计算基础统计量
    const stats = this.calculateBasicStats(queryResult);

    const result = await this.model
      .withStructuredOutput(DataAnalysisSchema)
      .invoke([
        {
          role: "system",
          content: `你是一个数据分析专家。根据查询结果进行深入分析，提供有价值的洞察。

## 分析维度
1. 数据摘要：总体情况描述
2. 关键洞察：最重要的发现
3. 趋势分析：上升/下降/稳定
4. 异常检测：异常值识别
5. 建议：基于数据的行动建议

## 基础统计量
${JSON.stringify(stats, null, 2)}

## 原始数据（前 20 行）
${JSON.stringify(queryResult.rows.slice(0, 20), null, 2)}

## 任务
根据用户问题和数据，提供专业的分析结果。`,
        },
        { role: "user", content: userQuery },
      ]);

    return result as AnalysisResult;
  }

  private calculateBasicStats(result: QueryResult): Record<string, unknown> {
    const stats: Record<string, unknown> = {
      rowCount: result.rowCount,
      columns: result.columns,
    };

    // 计算数值列的统计量
    for (const col of result.columns) {
      const values = result.rows
        .map((r) => r[col])
        .filter((v) => typeof v === "number") as number[];

      if (values.length > 0) {
        stats[col] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          sum: values.reduce((a, b) => a + b, 0),
          count: values.length,
        };
      }
    }

    return stats;
  }

  // 异常检测（使用 IQR 方法）
  detectAnomalies(
    data: number[]
  ): { value: number; isAnomaly: boolean }[] {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return data.map((value) => ({
      value,
      isAnomaly: value < lowerBound || value > upperBound,
    }));
  }

  // 趋势分析（简单线性回归）
  analyzeTrend(data: number[]): {
    direction: "up" | "down" | "stable";
    slope: number;
    rSquared: number;
  } {
    const n = data.length;
    const xMean = (n - 1) / 2;
    const yMean = data.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (data[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = numerator / denominator;

    // 计算 R²
    let ssTot = 0;
    let ssRes = 0;
    for (let i = 0; i < n; i++) {
      const predicted = yMean + slope * (i - xMean);
      ssTot += (data[i] - yMean) ** 2;
      ssRes += (data[i] - predicted) ** 2;
    }
    const rSquared = 1 - ssRes / ssTot;

    const direction =
      Math.abs(slope) < 0.01 ? "stable" : slope > 0 ? "up" : "down";

    return { direction, slope, rSquared };
  }
}

// 创建统计分析 Agent 节点
export async function statsAgentNode(
  state: DataAnalystStateType
): Promise<Partial<DataAnalystStateType>> {
  if (!state.queryResult) {
    return {
      analysisResult: null,
      messages: [{ role: "assistant", content: "没有数据可供分析" }],
    };
  }

  const agent = new StatsAgent();
  const lastMessage = state.messages[state.messages.length - 1];
  const userQuery = lastMessage.content as string;

  const analysisResult = await agent.analyzeData(userQuery, state.queryResult);

  return {
    analysisResult,
    currentStep: state.currentStep + 1,
  };
}
```

### 4.7 报告生成 Agent 实现

```typescript
// src/agents/report-agent.ts
import { ChatOpenAI } from "@langchain/openai";
import { ReportGenerationSchema } from "./schemas";
import { DataAnalystStateType } from "./types";

export class ReportAgent {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.3,
    });
  }

  async generateReport(state: DataAnalystStateType): Promise<string> {
    const context = this.buildContext(state);

    const result = await this.model
      .withStructuredOutput(ReportGenerationSchema)
      .invoke([
        {
          role: "system",
          content: `你是一个数据分析报告撰写专家。根据提供的分析结果，生成专业的分析报告。

## 报告结构
1. 标题：简洁明了
2. 执行摘要：核心发现的概述
3. 数据概览：数据来源和范围
4. 详细分析：分模块展示分析结果
5. 图表说明：解释每个图表的含义
6. 结论与建议：总结发现并提出建议

## 写作要求
1. 语言专业、清晰
2. 数据支撑结论
3. 突出关键发现
4. 提供可操作的建议`,
        },
        {
          role: "user",
          content: `请根据以下分析结果生成报告：\n\n${context}`,
        },
      ]);

    return this.formatReportAsMarkdown(result);
  }

  private buildContext(state: DataAnalystStateType): string {
    const parts: string[] = [];

    // SQL 和查询结果
    if (state.generatedSQL) {
      parts.push(`## SQL 查询\n\`\`\`sql\n${state.generatedSQL.sql}\n\`\`\``);
      parts.push(`**解释**: ${state.generatedSQL.explanation}`);
    }

    // 数据结果
    if (state.queryResult) {
      parts.push(`## 查询结果`);
      parts.push(`- 返回行数: ${state.queryResult.rowCount}`);
      parts.push(`- 执行时间: ${state.queryResult.executionTime}ms`);
      parts.push(`\n数据预览:\n\`\`\`json\n${JSON.stringify(state.queryResult.rows.slice(0, 10), null, 2)}\n\`\`\``);
    }

    // 分析结果
    if (state.analysisResult) {
      parts.push(`## 分析结果`);
      parts.push(`**摘要**: ${state.analysisResult.summary}`);
      parts.push(`**洞察**:\n${state.analysisResult.insights.map((i) => `- ${i}`).join("\n")}`);
      
      if (state.analysisResult.trends) {
        parts.push(`**趋势**: ${state.analysisResult.trends.description}`);
      }
      
      if (state.analysisResult.recommendations) {
        parts.push(`**建议**:\n${state.analysisResult.recommendations.map((r) => `- ${r}`).join("\n")}`);
      }
    }

    // 图表配置
    if (state.chartConfig) {
      parts.push(`## 可视化`);
      parts.push(`- 图表类型: ${state.chartConfig.type}`);
      parts.push(`- 标题: ${state.chartConfig.title}`);
    }

    return parts.join("\n\n");
  }

  private formatReportAsMarkdown(report: any): string {
    let markdown = `# ${report.title}\n\n`;

    for (const section of report.sections) {
      markdown += `## ${section.heading}\n\n`;
      markdown += `${section.content}\n\n`;

      if (section.chartId) {
        markdown += `![图表](chart://${section.chartId})\n\n`;
      }

      if (section.tableData) {
        markdown += this.formatTableAsMarkdown(section.tableData);
        markdown += "\n\n";
      }
    }

    markdown += `## 结论\n\n${report.conclusion}\n`;

    if (report.methodology) {
      markdown += `\n---\n\n*方法论: ${report.methodology}*\n`;
    }

    return markdown;
  }

  private formatTableAsMarkdown(data: Record<string, unknown>[]): string {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const headerRow = `| ${headers.join(" | ")} |`;
    const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
    const dataRows = data.map(
      (row) => `| ${headers.map((h) => String(row[h] ?? "")).join(" | ")} |`
    );

    return [headerRow, separatorRow, ...dataRows].join("\n");
  }
}

// 创建报告生成 Agent 节点
export async function reportAgentNode(
  state: DataAnalystStateType
): Promise<Partial<DataAnalystStateType>> {
  const agent = new ReportAgent();
  const report = await agent.generateReport(state);

  return {
    messages: [
      ...state.messages,
      { role: "assistant", content: report },
    ],
    currentStep: state.currentStep + 1,
  };
}
```

### 4.8 Graph 组装

```typescript
// src/agents/graph.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { DataAnalystState, DataAnalystStateType, IntentType } from "./types";
import { IntentRouter } from "./router";
import { sqlAgentNode } from "./sql-agent";
import { vizAgentNode } from "./viz-agent";
import { statsAgentNode } from "./stats-agent";
import { reportAgentNode } from "./report-agent";
import { createDataSourceAdapter } from "../datasource/factory";
import prisma from "../lib/prisma";

// Router 节点
async function routerNode(
  state: DataAnalystStateType
): Promise<Partial<DataAnalystStateType>> {
  const router = new IntentRouter();
  const lastMessage = state.messages[state.messages.length - 1];
  const userMessage = lastMessage.content as string;

  const intent = await router.analyzeIntent(userMessage, state.databaseSchema);
  const workflowSteps = router.determineWorkflow(intent);

  return {
    intent,
    workflowSteps,
    currentStep: 0,
  };
}

// 加载数据库 Schema 节点
async function loadSchemaNode(
  state: DataAnalystStateType
): Promise<Partial<DataAnalystStateType>> {
  const dataSource = await prisma.dataSource.findUnique({
    where: { id: state.dataSourceId },
  });

  if (!dataSource) {
    return {
      databaseSchema: null,
      messages: [
        new AIMessage({ content: "数据源不存在" }),
      ],
    };
  }

  // 如果已缓存 Schema，直接使用
  if (dataSource.schema) {
    return {
      databaseSchema: dataSource.schema as any,
    };
  }

  // 否则获取 Schema
  const adapter = createDataSourceAdapter(dataSource.config as any);
  await adapter.connect();

  const schema = await adapter.getSchema();
  
  // 缓存 Schema
  await prisma.dataSource.update({
    where: { id: state.dataSourceId },
    data: { schema: schema as any },
  });

  await adapter.disconnect();

  return {
    databaseSchema: schema,
  };
}

// SQL Agent 节点包装
async function sqlAgentWrapper(
  state: DataAnalystStateType
): Promise<Partial<DataAnalystStateType>> {
  const dataSource = await prisma.dataSource.findUnique({
    where: { id: state.dataSourceId },
  });

  if (!dataSource) {
    return {
      messages: [new AIMessage({ content: "数据源不存在" })],
    };
  }

  const adapter = createDataSourceAdapter(dataSource.config as any);
  await adapter.connect();

  const result = await sqlAgentNode(state, adapter);

  await adapter.disconnect();

  return result;
}

// 响应格式化节点
async function formatResponseNode(
  state: DataAnalystStateType
): Promise<Partial<DataAnalystStateType>> {
  const parts: string[] = [];

  // SQL 结果
  if (state.generatedSQL && state.queryResult) {
    parts.push(`**查询语句**:\n\`\`\`sql\n${state.generatedSQL.sql}\n\`\`\``);
    parts.push(`**结果** (${state.queryResult.rowCount} 行, ${state.queryResult.executionTime}ms):`);
    
    // 如果结果不多，显示表格
    if (state.queryResult.rowCount <= 20) {
      const headers = state.queryResult.columns;
      const headerRow = `| ${headers.join(" | ")} |`;
      const separator = `| ${headers.map(() => "---").join(" | ")} |`;
      const dataRows = state.queryResult.rows.map(
        (row) => `| ${headers.map((h) => String(row[h] ?? "")).join(" | ")} |`
      );
      parts.push([headerRow, separator, ...dataRows].join("\n"));
    } else {
      parts.push(`数据量较大，仅显示前 10 行...`);
      const sample = state.queryResult.rows.slice(0, 10);
      parts.push(`\`\`\`json\n${JSON.stringify(sample, null, 2)}\n\`\`\``);
    }
  }

  // 分析结果
  if (state.analysisResult) {
    parts.push(`\n**分析结果**:`);
    parts.push(state.analysisResult.summary);
    
    if (state.analysisResult.insights.length > 0) {
      parts.push(`\n**关键洞察**:`);
      parts.push(state.analysisResult.insights.map((i) => `- ${i}`).join("\n"));
    }

    if (state.analysisResult.recommendations?.length) {
      parts.push(`\n**建议**:`);
      parts.push(state.analysisResult.recommendations.map((r) => `- ${r}`).join("\n"));
    }
  }

  // 图表配置
  if (state.chartConfig) {
    parts.push(`\n**图表**: ${state.chartConfig.title} (${state.chartConfig.type})`);
    parts.push(`\`\`\`json:chart\n${JSON.stringify(state.chartConfig.options, null, 2)}\n\`\`\``);
  }

  const response = parts.join("\n\n");

  return {
    messages: [...state.messages, new AIMessage({ content: response })],
  };
}

// Schema 查询节点
async function schemaAgentNode(
  state: DataAnalystStateType
): Promise<Partial<DataAnalystStateType>> {
  if (!state.databaseSchema) {
    return {
      messages: [new AIMessage({ content: "数据库 Schema 未加载" })],
    };
  }

  const schemaDescription = state.databaseSchema.tables
    .map((table) => {
      const columns = table.columns
        .map((col) => `  - ${col.name}: ${col.type}${col.comment ? ` (${col.comment})` : ""}`)
        .join("\n");
      return `**${table.name}** (${table.rowCount || "?"} 行)\n${columns}`;
    })
    .join("\n\n");

  return {
    messages: [
      ...state.messages,
      new AIMessage({
        content: `## 数据库结构\n\n${schemaDescription}`,
      }),
    ],
    currentStep: state.currentStep + 1,
  };
}

// 通用回复节点
async function generalAgentNode(
  state: DataAnalystStateType
): Promise<Partial<DataAnalystStateType>> {
  const { ChatOpenAI } = await import("@langchain/openai");
  
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.3,
  });

  const response = await model.invoke([
    {
      role: "system",
      content: `你是一个数据分析助手。帮助用户理解数据、回答数据相关问题。
如果用户的问题需要查询数据库，请引导他们提供更具体的查询需求。`,
    },
    ...state.messages,
  ]);

  return {
    messages: [...state.messages, response],
  };
}

// 工作流路由函数
function workflowRouter(state: DataAnalystStateType): string {
  const { workflowSteps, currentStep } = state;

  if (currentStep >= workflowSteps.length) {
    return "format_response";
  }

  return workflowSteps[currentStep];
}

// 创建 Graph
export function createDataAnalystGraph() {
  const workflow = new StateGraph(DataAnalystState)
    // 添加节点
    .addNode("load_schema", loadSchemaNode)
    .addNode("router", routerNode)
    .addNode("sql_agent", sqlAgentWrapper)
    .addNode("viz_agent", vizAgentNode)
    .addNode("stats_agent", statsAgentNode)
    .addNode("report_agent", reportAgentNode)
    .addNode("schema_agent", schemaAgentNode)
    .addNode("general_agent", generalAgentNode)
    .addNode("format_response", formatResponseNode)

    // 添加边
    .addEdge(START, "load_schema")
    .addEdge("load_schema", "router")
    
    // 工作流路由
    .addConditionalEdges("router", workflowRouter, {
      sql_agent: "sql_agent",
      viz_agent: "viz_agent",
      stats_agent: "stats_agent",
      report_agent: "report_agent",
      schema_agent: "schema_agent",
      general_agent: "general_agent",
      format_response: "format_response",
    })
    
    // Agent 之间的流转
    .addConditionalEdges("sql_agent", workflowRouter, {
      viz_agent: "viz_agent",
      stats_agent: "stats_agent",
      report_agent: "report_agent",
      format_response: "format_response",
    })
    .addConditionalEdges("stats_agent", workflowRouter, {
      viz_agent: "viz_agent",
      report_agent: "report_agent",
      format_response: "format_response",
    })
    .addConditionalEdges("viz_agent", workflowRouter, {
      report_agent: "report_agent",
      format_response: "format_response",
    })
    
    .addEdge("report_agent", END)
    .addEdge("schema_agent", END)
    .addEdge("general_agent", END)
    .addEdge("format_response", END);

  const checkpointer = new MemorySaver();

  return workflow.compile({ checkpointer });
}

export type DataAnalystGraph = ReturnType<typeof createDataAnalystGraph>;
```

### 4.9 使用示例

```typescript
// src/agents/example.ts
import { HumanMessage } from "@langchain/core/messages";
import { createDataAnalystGraph } from "./graph";

async function main() {
  const graph = createDataAnalystGraph();

  // 示例 1: 简单数据查询
  console.log("=== 示例 1: 数据查询 ===");
  let result = await graph.invoke(
    {
      messages: [new HumanMessage("上个月销量最高的 10 个产品是什么？")],
      dataSourceId: "ds-001",
    },
    { configurable: { thread_id: "session-1" } }
  );
  console.log("AI:", result.messages[result.messages.length - 1].content);

  // 示例 2: 数据可视化
  console.log("\n=== 示例 2: 数据可视化 ===");
  result = await graph.invoke(
    {
      messages: [new HumanMessage("用柱状图展示各部门的人员分布")],
      dataSourceId: "ds-001",
    },
    { configurable: { thread_id: "session-2" } }
  );
  console.log("AI:", result.messages[result.messages.length - 1].content);
  console.log("图表配置:", JSON.stringify(result.chartConfig, null, 2));

  // 示例 3: 数据分析
  console.log("\n=== 示例 3: 数据分析 ===");
  result = await graph.invoke(
    {
      messages: [new HumanMessage("分析今年的销售趋势，有什么异常吗？")],
      dataSourceId: "ds-001",
    },
    { configurable: { thread_id: "session-3" } }
  );
  console.log("AI:", result.messages[result.messages.length - 1].content);

  // 示例 4: 生成报告
  console.log("\n=== 示例 4: 生成报告 ===");
  result = await graph.invoke(
    {
      messages: [
        new HumanMessage(
          "生成一份本季度销售分析报告，包含趋势分析和对比上季度的变化"
        ),
      ],
      dataSourceId: "ds-001",
    },
    { configurable: { thread_id: "session-4" } }
  );
  console.log("AI:", result.messages[result.messages.length - 1].content);

  // 示例 5: 查询数据库结构
  console.log("\n=== 示例 5: 查询结构 ===");
  result = await graph.invoke(
    {
      messages: [new HumanMessage("这个数据库有哪些表？")],
      dataSourceId: "ds-001",
    },
    { configurable: { thread_id: "session-5" } }
  );
  console.log("AI:", result.messages[result.messages.length - 1].content);
}

main().catch(console.error);
```

---

## 五、项目结构

```
data-analyst/
├── src/
│   ├── datasource/                # 数据源适配器
│   │   ├── types.ts               # 类型定义
│   │   ├── factory.ts             # 适配器工厂
│   │   └── adapters/              # 各数据库适配器
│   │       ├── mysql.adapter.ts
│   │       ├── postgresql.adapter.ts
│   │       ├── sqlite.adapter.ts
│   │       └── csv.adapter.ts
│   ├── agents/                    # AI Agent 核心
│   │   ├── types.ts               # 状态类型
│   │   ├── schemas.ts             # 结构化输出 Schema
│   │   ├── router.ts              # 意图路由器
│   │   ├── sql-agent.ts           # SQL 生成 Agent
│   │   ├── viz-agent.ts           # 可视化 Agent
│   │   ├── stats-agent.ts         # 统计分析 Agent
│   │   ├── report-agent.ts        # 报告生成 Agent
│   │   ├── graph.ts               # Graph 组装
│   │   └── example.ts             # 使用示例
│   ├── controllers/               # 控制器
│   │   ├── analyze.controller.ts
│   │   ├── datasource.controller.ts
│   │   ├── query.controller.ts
│   │   └── report.controller.ts
│   ├── routes/                    # 路由
│   │   ├── analyze.routes.ts
│   │   ├── datasource.routes.ts
│   │   ├── query.routes.ts
│   │   ├── report.routes.ts
│   │   └── index.ts
│   ├── services/                  # 服务层
│   │   ├── datasource.service.ts
│   │   ├── query.service.ts
│   │   ├── visualization.service.ts
│   │   └── report.service.ts
│   ├── lib/                       # 库
│   │   ├── prisma.ts
│   │   └── redis.ts
│   ├── types/                     # TypeScript 类型
│   │   └── index.ts
│   ├── utils/                     # 工具函数
│   │   ├── encryption.ts          # 数据库密码加密
│   │   └── sql-sanitizer.ts       # SQL 安全检查
│   └── app.ts                     # 应用入口
├── prisma/
│   └── schema.prisma
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 六、总结

### 技术要点回顾

| 模块 | 技术栈 | 说明 |
|------|-------|------|
| **架构模式** | Router + Subagents | Router 分析意图，分发给专业 Sub-Agent |
| **意图路由** | withStructuredOutput | 识别查询/可视化/分析/报告意图 |
| **SQL 生成** | withStructuredOutput | 自然语言转 SQL，带解释和警告 |
| **数据可视化** | ECharts + LLM | 自动选择图表类型，生成配置 |
| **统计分析** | LLM + 数学计算 | 趋势分析、异常检测、洞察提取 |
| **报告生成** | 结构化输出 | 整合数据、图表、分析生成报告 |
| **多数据源** | 适配器模式 | 支持 MySQL/PostgreSQL/SQLite 等 |

### 架构亮点

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           项目架构亮点                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Router + Subagents - 意图驱动的任务分发                                  │
│     ┌───────────────────────────────────────────────────────────────────┐   │
│     │   用户输入 → Router 分析意图 → 确定工作流 → 依次执行 Sub-Agent      │   │
│     │                                                                   │   │
│     │   "分析销售趋势并做图" →                                           │   │
│     │   [SQL Agent] → [Stats Agent] → [Viz Agent]                       │   │
│     └───────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  2. Custom Workflow - 灵活的工作流编排                                       │
│     • 可串行执行依赖任务                                                     │
│     • 可并行执行独立任务                                                     │
│     • 根据意图动态组合 Agent                                                 │
│                                                                              │
│  3. 自然语言转 SQL - 智能查询生成                                            │
│     • 基于 Schema 生成准确 SQL                                               │
│     • 自动处理 JOIN 关系                                                     │
│     • 复杂度评估和警告提示                                                   │
│                                                                              │
│  4. 智能可视化 - 自动图表选择                                                │
│     • 分析数据特征（时序/类别/数值）                                         │
│     • 推荐最合适的图表类型                                                   │
│     • 生成 ECharts 配置                                                      │
│                                                                              │
│  5. 多数据源支持 - 适配器模式                                                │
│     ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│     │ MySQL   │ │PostgreSQL│ │ SQLite  │ │  CSV    │                        │
│     │Adapter  │ │ Adapter │ │ Adapter │ │ Adapter │                        │
│     └─────────┘ └─────────┘ └─────────┘ └─────────┘                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 项目亮点

1. **Router + Subagents 架构**：意图驱动的任务分发，灵活组合
2. **自然语言转 SQL**：基于 Schema 生成准确查询，带解释和警告
3. **智能可视化**：自动分析数据特征，选择最合适的图表
4. **统计分析**：趋势分析、异常检测、洞察提取
5. **报告生成**：整合数据、图表、分析，生成专业报告
6. **多数据源**：适配器模式支持多种数据库

### 扩展方向

- 添加 **更多数据源**（ClickHouse、BigQuery、MongoDB）
- 支持 **自然语言修改 SQL**（追问和调整）
- 添加 **数据预测**（基于历史数据预测趋势）
- 支持 **定时报告**（自动生成周报/月报）
- 添加 **数据血缘**（追踪数据来源）
- 支持 **团队协作**（共享查询和报告）
- 添加 **权限控制**（表/字段级别访问控制）
