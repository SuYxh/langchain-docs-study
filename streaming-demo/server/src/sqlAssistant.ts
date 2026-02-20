import { ChatOpenAI } from "@langchain/openai";
import { Annotation, StateGraph, interrupt, MemorySaver } from "@langchain/langgraph";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { MessagesAnnotation } from "@langchain/langgraph";

const model = new ChatOpenAI({
  model: "deepseek/deepseek-v3.2-251201",
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

interface SQLQuery {
  sql: string;
  description: string;
  affectedTable: string;
  operationType: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "DROP" | "CREATE" | "ALTER";
  estimatedRows?: number;
  riskLevel: "low" | "medium" | "high" | "critical";
}

interface HITLRequest {
  type: "hitl_request";
  query: SQLQuery;
  message: string;
  allowedDecisions: ("approve" | "edit" | "reject")[];
}

interface HITLDecision {
  type: "approve" | "edit" | "reject";
  editedSQL?: string;
  rejectReason?: string;
}

const SQLAssistantState = Annotation.Root({
  ...MessagesAnnotation.spec,
  userRequest: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  generatedSQL: Annotation<SQLQuery | null>({ reducer: (_, b) => b, default: () => null }),
  hitlRequest: Annotation<HITLRequest | null>({ reducer: (_, b) => b, default: () => null }),
  hitlDecision: Annotation<HITLDecision | null>({ reducer: (_, b) => b, default: () => null }),
  executionResult: Annotation<string | null>({ reducer: (_, b) => b, default: () => null }),
  currentStage: Annotation<string>({ reducer: (_, b) => b, default: () => "idle" }),
  isComplete: Annotation<boolean>({ reducer: (_, b) => b, default: () => false }),
});

const MOCK_DATABASE = {
  orders: [
    { id: 1, customer: "张三", amount: 150, status: "completed", created_at: "2025-12-01" },
    { id: 2, customer: "李四", amount: 280, status: "pending", created_at: "2025-12-15" },
    { id: 3, customer: "王五", amount: 95, status: "cancelled", created_at: "2024-06-01" },
    { id: 4, customer: "赵六", amount: 420, status: "completed", created_at: "2024-01-15" },
    { id: 5, customer: "钱七", amount: 180, status: "pending", created_at: "2024-03-20" },
  ],
  users: [
    { id: 1, name: "张三", email: "zhangsan@example.com", role: "admin" },
    { id: 2, name: "李四", email: "lisi@example.com", role: "user" },
    { id: 3, name: "王五", email: "wangwu@example.com", role: "user" },
  ],
  products: [
    { id: 1, name: "笔记本电脑", price: 5999, stock: 50, category: "电子产品" },
    { id: 2, name: "无线鼠标", price: 99, stock: 200, category: "配件" },
    { id: 3, name: "机械键盘", price: 399, stock: 80, category: "配件" },
  ],
};

function detectOperationType(sql: string): SQLQuery["operationType"] {
  const upperSQL = sql.trim().toUpperCase();
  if (upperSQL.startsWith("SELECT")) return "SELECT";
  if (upperSQL.startsWith("INSERT")) return "INSERT";
  if (upperSQL.startsWith("UPDATE")) return "UPDATE";
  if (upperSQL.startsWith("DELETE")) return "DELETE";
  if (upperSQL.startsWith("DROP")) return "DROP";
  if (upperSQL.startsWith("CREATE")) return "CREATE";
  if (upperSQL.startsWith("ALTER")) return "ALTER";
  return "SELECT";
}

function detectRiskLevel(operationType: SQLQuery["operationType"], sql: string): SQLQuery["riskLevel"] {
  const upperSQL = sql.toUpperCase();
  
  if (operationType === "DROP") return "critical";
  if (operationType === "DELETE" && !upperSQL.includes("WHERE")) return "critical";
  if (operationType === "UPDATE" && !upperSQL.includes("WHERE")) return "critical";
  if (operationType === "DELETE") return "high";
  if (operationType === "UPDATE") return "medium";
  if (operationType === "ALTER") return "medium";
  if (operationType === "INSERT") return "low";
  if (operationType === "CREATE") return "low";
  return "low";
}

function extractTableName(sql: string): string {
  const upperSQL = sql.toUpperCase();
  const patterns = [
    /FROM\s+(\w+)/i,
    /INTO\s+(\w+)/i,
    /UPDATE\s+(\w+)/i,
    /TABLE\s+(\w+)/i,
    /DROP\s+TABLE\s+(\w+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = sql.match(pattern);
    if (match) return match[1].toLowerCase();
  }
  return "unknown";
}

function estimateAffectedRows(sql: string, table: string): number {
  const upperSQL = sql.toUpperCase();
  const operationType = detectOperationType(sql);
  
  const tableData = MOCK_DATABASE[table as keyof typeof MOCK_DATABASE] || [];
  
  if (operationType === "SELECT" || operationType === "DELETE" || operationType === "UPDATE") {
    if (!upperSQL.includes("WHERE")) {
      return tableData.length;
    }
    return Math.ceil(tableData.length * 0.3);
  }
  
  if (operationType === "INSERT") return 1;
  
  return tableData.length;
}

function executeMockSQL(sql: string): string {
  const operationType = detectOperationType(sql);
  const table = extractTableName(sql);
  const tableData = MOCK_DATABASE[table as keyof typeof MOCK_DATABASE];
  
  if (operationType === "SELECT") {
    if (!tableData) {
      return `❌ 错误: 表 "${table}" 不存在`;
    }
    
    const results = tableData.slice(0, 5);
    return `✅ 查询成功！\n\n返回 ${results.length} 条记录:\n\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\``;
  }
  
  if (operationType === "DELETE") {
    const affected = estimateAffectedRows(sql, table);
    return `✅ 删除成功！\n\n已删除 ${affected} 条记录。\n\n⚠️ 注意：这是模拟执行，实际数据未被修改。`;
  }
  
  if (operationType === "UPDATE") {
    const affected = estimateAffectedRows(sql, table);
    return `✅ 更新成功！\n\n已更新 ${affected} 条记录。\n\n⚠️ 注意：这是模拟执行，实际数据未被修改。`;
  }
  
  if (operationType === "INSERT") {
    return `✅ 插入成功！\n\n已插入 1 条记录到 ${table} 表。\n\n⚠️ 注意：这是模拟执行，实际数据未被修改。`;
  }
  
  if (operationType === "DROP") {
    return `✅ 表 "${table}" 已删除。\n\n⚠️ 注意：这是模拟执行，实际数据未被修改。`;
  }
  
  return `✅ SQL 执行成功！\n\n⚠️ 注意：这是模拟执行。`;
}

async function analyzeRequest(state: typeof SQLAssistantState.State) {
  const userRequest = state.userRequest;
  
  const systemPrompt = `你是一个 SQL 专家助手。用户会用自然语言描述他们的需求，你需要生成相应的 SQL 语句。

可用的数据库表：
1. orders 表 - 订单信息
   - id (整数, 主键)
   - customer (字符串, 客户名)
   - amount (数字, 订单金额)
   - status (字符串: completed/pending/cancelled)
   - created_at (日期)

2. users 表 - 用户信息
   - id (整数, 主键)
   - name (字符串, 用户名)
   - email (字符串, 邮箱)
   - role (字符串: admin/user)

3. products 表 - 产品信息
   - id (整数, 主键)
   - name (字符串, 产品名)
   - price (数字, 价格)
   - stock (整数, 库存)
   - category (字符串, 分类)

请根据用户需求生成 SQL，并以 JSON 格式返回：
{
  "sql": "生成的SQL语句",
  "description": "这条SQL的中文说明",
  "reasoning": "为什么这样写SQL的简短解释"
}

只返回 JSON，不要其他内容。`;

  const response = await model.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: userRequest },
  ]);

  let sqlData: { sql: string; description: string; reasoning?: string };
  try {
    const content = typeof response.content === "string" ? response.content : "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      sqlData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found");
    }
  } catch {
    sqlData = {
      sql: "SELECT * FROM orders LIMIT 10",
      description: "查询订单表的前10条记录",
    };
  }

  const operationType = detectOperationType(sqlData.sql);
  const table = extractTableName(sqlData.sql);
  const riskLevel = detectRiskLevel(operationType, sqlData.sql);
  const estimatedRows = estimateAffectedRows(sqlData.sql, table);

  const generatedSQL: SQLQuery = {
    sql: sqlData.sql,
    description: sqlData.description,
    affectedTable: table,
    operationType,
    estimatedRows,
    riskLevel,
  };

  const aiMessage = new AIMessage({
    content: `📊 **SQL 分析完成**\n\n我已根据您的需求生成了以下 SQL：\n\n\`\`\`sql\n${generatedSQL.sql}\n\`\`\`\n\n**说明**: ${generatedSQL.description}\n**目标表**: ${generatedSQL.affectedTable}\n**操作类型**: ${generatedSQL.operationType}\n**预估影响**: ${generatedSQL.estimatedRows} 行\n**风险等级**: ${generatedSQL.riskLevel === "critical" ? "🔴 严重" : generatedSQL.riskLevel === "high" ? "🟠 高" : generatedSQL.riskLevel === "medium" ? "🟡 中" : "🟢 低"}`,
  });

  return {
    messages: [aiMessage],
    generatedSQL,
    currentStage: "analyzed",
  };
}

async function checkApproval(state: typeof SQLAssistantState.State) {
  const generatedSQL = state.generatedSQL;
  
  if (!generatedSQL) {
    return {
      currentStage: "error",
      executionResult: "❌ 错误：没有生成 SQL",
    };
  }

  if (generatedSQL.riskLevel === "low" && generatedSQL.operationType === "SELECT") {
    return {
      hitlRequest: null,
      hitlDecision: { type: "approve" } as HITLDecision,
      currentStage: "auto_approved",
    };
  }

  const riskEmoji = generatedSQL.riskLevel === "critical" ? "🔴" : 
                    generatedSQL.riskLevel === "high" ? "🟠" : 
                    generatedSQL.riskLevel === "medium" ? "🟡" : "🟢";

  const hitlRequest: HITLRequest = {
    type: "hitl_request",
    query: generatedSQL,
    message: `${riskEmoji} **需要人工审批**\n\n此操作具有 ${generatedSQL.riskLevel === "critical" ? "严重" : generatedSQL.riskLevel === "high" ? "高" : "中等"} 风险，需要您的批准才能执行。\n\n**操作**: ${generatedSQL.operationType}\n**目标表**: ${generatedSQL.affectedTable}\n**预估影响**: ${generatedSQL.estimatedRows} 行`,
    allowedDecisions: generatedSQL.riskLevel === "critical" 
      ? ["approve", "reject"]
      : ["approve", "edit", "reject"],
  };

  const interruptValue = interrupt(hitlRequest);

  return {
    hitlRequest,
    hitlDecision: interruptValue as HITLDecision,
    currentStage: "waiting_approval",
  };
}

async function executeSQL(state: typeof SQLAssistantState.State) {
  const decision = state.hitlDecision;
  const generatedSQL = state.generatedSQL;

  if (!decision) {
    return {
      currentStage: "error",
      executionResult: "❌ 错误：没有收到决策",
      isComplete: true,
    };
  }

  if (decision.type === "reject") {
    const aiMessage = new AIMessage({
      content: `❌ **操作已拒绝**\n\n原因: ${decision.rejectReason || "用户选择不执行此操作"}\n\n如果您需要不同的查询，请告诉我您的新需求。`,
    });

    return {
      messages: [aiMessage],
      executionResult: `操作被拒绝: ${decision.rejectReason || "用户选择不执行"}`,
      currentStage: "rejected",
      isComplete: true,
    };
  }

  let sqlToExecute = generatedSQL?.sql || "";
  
  if (decision.type === "edit" && decision.editedSQL) {
    sqlToExecute = decision.editedSQL;
  }

  const result = executeMockSQL(sqlToExecute);

  const aiMessage = new AIMessage({
    content: `${decision.type === "approve" ? "✅ **SQL 已执行**" : "✏️ **修改后的 SQL 已执行**"}\n\n${decision.type === "edit" ? `**原始 SQL**:\n\`\`\`sql\n${generatedSQL?.sql}\n\`\`\`\n\n**修改后 SQL**:\n\`\`\`sql\n${sqlToExecute}\n\`\`\`\n\n` : ""}\n**执行结果**:\n${result}`,
  });

  return {
    messages: [aiMessage],
    executionResult: result,
    currentStage: "executed",
    isComplete: true,
  };
}

function routeAfterAnalysis(state: typeof SQLAssistantState.State): string {
  return "check_approval";
}

function routeAfterApproval(state: typeof SQLAssistantState.State): string {
  const decision = state.hitlDecision;
  if (decision) {
    return "execute_sql";
  }
  return "__end__";
}

const checkpointer = new MemorySaver();

const workflow = new StateGraph(SQLAssistantState)
  .addNode("analyze_request", analyzeRequest)
  .addNode("check_approval", checkApproval)
  .addNode("execute_sql", executeSQL)
  .addEdge("__start__", "analyze_request")
  .addConditionalEdges("analyze_request", routeAfterAnalysis)
  .addConditionalEdges("check_approval", routeAfterApproval)
  .addEdge("execute_sql", "__end__");

export const sqlAssistantGraph = workflow.compile({ checkpointer });

export type { SQLQuery, HITLRequest, HITLDecision };
