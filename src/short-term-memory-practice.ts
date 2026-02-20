import "dotenv/config";
import { z } from "zod";
import {
  createAgent,
  createMiddleware,
  tool,
  ToolMessage,
  type ToolRuntime,
} from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { Command, MemorySaver } from "@langchain/langgraph";
import { RemoveMessage, SystemMessage } from "@langchain/core/messages";
import { REMOVE_ALL_MESSAGES } from "@langchain/langgraph";

// 自定义状态架构：直接使用 Zod 对象定义
// 所有字段都设为可选，以便在 invoke 时不需要提供所有字段
const customStateSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  cart: z.array(z.object({
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
  })).optional().default([]),
  totalSpent: z.number().optional().default(0),
  conversationSummary: z.string().optional(),
});

type CustomState = z.infer<typeof customStateSchema>;

type CartItem = { name: string; price: number; quantity: number };

// 商品目录
const productCatalog: Record<string, { price: number; description: string }> = {
  "iphone": { price: 999, description: "最新款 iPhone，搭载 A18 芯片" },
  "macbook": { price: 1999, description: "MacBook Pro 14英寸 M4 版" },
  "airpods": { price: 249, description: "AirPods Pro 第二代" },
  "ipad": { price: 799, description: "iPad Air M2 版" },
  "apple watch": { price: 399, description: "Apple Watch Series 10" },
};

// 从工具中读取短期记忆：通过 config.state 访问用户信息、购物车等状态
const getUserInfo = tool(
  async (_, config: ToolRuntime<CustomState>) => {
    const userId = config.state.userId;
    const userName = config.state.userName;
    const cart = config.state.cart || [];
    const totalSpent = config.state.totalSpent || 0;

    const cartSummary = cart.length > 0
      ? cart.map((item: CartItem) => `${item.name} x${item.quantity} (¥${item.price * item.quantity})`).join(", ")
      : "空";

    return `用户ID: ${userId || "未知"}, 姓名: ${userName || "游客"}, 购物车: ${cartSummary}, 累计消费: ¥${totalSpent}`;
  },
  {
    name: "get_user_info",
    description: "获取当前用户信息，包括购物车和消费历史",
    schema: z.object({}),
  }
);

// 从工具写入短期记忆：使用 Command 返回状态更新，修改购物车
// 支持一次添加多个商品（用逗号分隔），避免并行调用时的状态冲突
const addToCart = tool(
  async (input, config: ToolRuntime<CustomState>) => {
    const { products } = input;
    const productList = products.split(",").map((p) => p.trim());
    
    let currentCart = [...(config.state.cart || [])];
    const results: string[] = [];
    
    for (const productEntry of productList) {
      // 解析 "2x airpods" 或 "airpods" 格式
      const match = productEntry.match(/^(\d+)\s*[xX×]\s*(.+)$/) || productEntry.match(/^(.+?)\s*[xX×]\s*(\d+)$/);
      let quantity = 1;
      let productName: string;
      
      if (match) {
        if (/^\d+$/.test(match[1])) {
          quantity = parseInt(match[1], 10);
          productName = match[2].trim();
        } else {
          productName = match[1].trim();
          quantity = parseInt(match[2], 10);
        }
      } else {
        productName = productEntry.trim();
      }
      
      const product = productCatalog[productName.toLowerCase()];
      
      if (!product) {
        results.push(`商品 "${productName}" 未找到`);
        continue;
      }
      
      const existingIndex = currentCart.findIndex(
        (item: CartItem) => item.name.toLowerCase() === productName.toLowerCase()
      );
      
      if (existingIndex >= 0) {
        currentCart[existingIndex] = {
          ...currentCart[existingIndex],
          quantity: currentCart[existingIndex].quantity + quantity,
        };
      } else {
        currentCart.push({ name: productName, price: product.price, quantity });
      }
      
      results.push(`已添加 ${quantity}x ${productName} (单价 ¥${product.price})`);
    }
    
    const cartTotal = currentCart.reduce(
      (sum: number, item: CartItem) => sum + item.price * item.quantity,
      0
    );

    // ============================================================================
    // 通过 Command 同时更新状态和消息历史
    // ============================================================================
    // 
    // 为什么需要 ToolMessage？
    // --------------------------
    // 在 Agent 的工具调用流程中：
    //   1. 用户发送消息 → HumanMessage
    //   2. 模型决定调用工具 → AIMessage（包含 tool_calls）
    //   3. 工具执行并返回结果 → ToolMessage（必须！）
    //   4. 模型看到工具结果后生成回复 → AIMessage
    // 
    // ToolMessage 是"工具向模型报告执行结果"的方式，不是"调用模型"。
    // 如果不返回 ToolMessage，模型不知道工具执行的结果，无法继续对话。
    // 
    // 为什么不能只更新状态？
    // --------------------------
    // - 状态更新（如 cart）是给工具之间传递数据用的
    // - ToolMessage 是给模型看的，让它知道操作是否成功、结果是什么
    // - 两者目的不同：状态用于持久化，ToolMessage 用于对话流
    // 
    // tool_call_id 必须与 AIMessage 中的 tool_call.id 匹配，
    // 这样模型才能将工具结果与对应的调用关联起来
    // ============================================================================
    return new Command({
      update: {
        cart: currentCart,
        messages: [
          new ToolMessage({
            content: `${results.join("；")}。购物车总计: ¥${cartTotal}`,
            tool_call_id: config.toolCall?.id ?? "",
          }),
        ],
      },
    });
  },
  {
    name: "add_to_cart",
    description: "添加商品到购物车。支持一次添加多个商品，用逗号分隔，如：'iPhone, 2x AirPods' 或 'MacBook, iPad'",
    schema: z.object({
      products: z.string().describe("要添加的商品，支持数量格式如 '2x AirPods'，多个商品用逗号分隔"),
    }),
  }
);

// 结账工具：读取购物车状态，计算总价，更新累计消费，清空购物车
const checkout = tool(
  async (_, config: ToolRuntime<CustomState>) => {
    const cart = config.state.cart || [];
    const previousTotal = config.state.totalSpent || 0;

    if (cart.length === 0) {
      return new Command({
        update: {
          messages: [
            new ToolMessage({
              content: "购物车为空！请先添加商品。",
              tool_call_id: config.toolCall?.id ?? "",
            }),
          ],
        },
      });
    }

    const cartTotal = cart.reduce(
      (sum: number, item: CartItem) => sum + item.price * item.quantity,
      0
    );
    const newTotalSpent = previousTotal + cartTotal;

    const orderSummary = cart
      .map((item: CartItem) => `${item.name} x${item.quantity}: ¥${item.price * item.quantity}`)
      .join("\n");

    // 更新状态：清空购物车，累加消费总额
    return new Command({
      update: {
        cart: [],
        totalSpent: newTotalSpent,
        messages: [
          new ToolMessage({
            content: `订单提交成功！\n\n订单详情:\n${orderSummary}\n\n订单总计: ¥${cartTotal}\n累计消费: ¥${newTotalSpent}`,
            tool_call_id: config.toolCall?.id ?? "",
          }),
        ],
      },
    });
  },
  {
    name: "checkout",
    description: "完成购买并结账",
    schema: z.object({}),
  }
);

// 列出商品目录
const listProducts = tool(
  async () => {
    const productList = Object.entries(productCatalog)
      .map(([name, info]) => `- ${name}: ¥${info.price} - ${info.description}`)
      .join("\n");
    return `可选商品:\n${productList}`;
  },
  {
    name: "list_products",
    description: "列出所有可购买的商品",
    schema: z.object({}),
  }
);

// 总结消息中间件：当消息过多时，自动总结早期对话并替换为摘要
const summarizeConversation = createMiddleware({
  name: "SummarizeConversation",
  afterModel: async (state) => {
    const messages = state.messages;

    // 当消息超过10条时触发总结
    if (messages.length > 10) {
      const model = new ChatOpenAI({
        model: "deepseek/deepseek-v3.2-251201",
        configuration: { baseURL: process.env.OPENAI_BASE_URL },
      });

      const conversationText = messages
        .slice(0, -4)
        .map((m) => `${m.getType()}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
        .join("\n");

      const summaryResponse = await model.invoke([
        new SystemMessage("你是一个对话总结助手。请简洁地总结对话的关键要点。"),
        { role: "user", content: `请总结以下对话:\n${conversationText}` },
      ]);

      const summaryText = typeof summaryResponse.content === 'string'
        ? summaryResponse.content
        : "对话进行中";

      const messagesToRemove = messages.slice(0, -4);
      const recentMessages = messages.slice(-4);

      // 删除旧消息，插入摘要系统消息，保留最近4条消息
      return {
        conversationSummary: summaryText,
        messages: [
          ...messagesToRemove.map((m) => new RemoveMessage({ id: m.id! })),
          new SystemMessage(`之前的对话摘要: ${summaryText}`),
          ...recentMessages,
        ],
      };
    }

    return;
  },
});

// 消息修剪中间件：在调用模型前，限制消息数量以管理上下文窗口
const trimMessagesMiddleware = createMiddleware({
  name: "TrimMessages",
  beforeModel: (state) => {
    const messages = state.messages;

    // 消息数量不超过6条时无需修剪
    if (messages.length <= 6) {
      return;
    }

    // 保留系统消息和最近6条非系统消息
    const systemMessages = messages.filter((m) => m.getType() === "system");
    const recentMessages = messages.filter((m) => m.getType() !== "system").slice(-6);

    return {
      messages: [
        new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
        ...systemMessages,
        ...recentMessages,
      ],
    };
  },
});

async function main() {
  console.log("\n🛒 === 智能购物助手演示 ===\n");

  // 使用 MemorySaver 作为 checkpointer 实现短期记忆持久化
  const checkpointer = new MemorySaver();

  const agent = createAgent({
    model: new ChatOpenAI({
      model: "deepseek/deepseek-v3.2-251201",
      configuration: { baseURL: process.env.OPENAI_BASE_URL },
    }),
    tools: [getUserInfo, addToCart, checkout, listProducts],
    // stateSchema 定义了 Agent 的状态结构
    // 定义后，invoke 时可以传入这些字段，工具也可以通过 config.state 读取/写入
    stateSchema: customStateSchema,
    middleware: [trimMessagesMiddleware],
    // checkpointer 负责持久化状态，使用 thread_id 区分不同对话
    checkpointer,
    systemPrompt: `你是一个苹果商店的购物助手。
你帮助用户浏览商品、管理购物车和完成购买。
请始终保持友好，并提供有用的推荐。
当用户询问个人信息时，使用 get_user_info 工具。
当用户想添加商品时，使用 add_to_cart 工具。
当用户想结账时，使用 checkout 工具。
当用户想查看商品时，使用 list_products 工具。`,
  });

  // 使用 thread_id 标识对话线程，同一线程共享记忆
  // 相同 thread_id 的调用会共享状态，不同 thread_id 的调用状态隔离
  const config = {
    configurable: { thread_id: "shopping-session-1" },
  };

  // ============================================================================
  // 初始状态说明：
  // ============================================================================
  // 当 Agent 配置了 stateSchema 后，invoke 的第一个参数除了 messages 外，
  // 还可以传入 stateSchema 中定义的任意字段。
  // 
  // 这些字段会被合并到 Agent 的初始状态中，工具可以通过 config.state 访问：
  //   - userId: 用户唯一标识
  //   - userName: 用户姓名
  //   - cart: 购物车数组
  //   - totalSpent: 累计消费金额
  // 
  // 工作流程：
  // 1. 首次调用：传入 initialState，这些值会被存入 checkpointer
  // 2. 后续调用：只需传入 messages，checkpointer 会自动恢复之前的状态
  // 3. 工具更新状态：工具通过返回 Command({ update: {...} }) 更新状态
  // 4. 状态持久化：每次状态变更后，checkpointer 自动保存
  // ============================================================================
  const initialState = {
    userId: "user_12345",
    userName: "小明",
    cart: [],
    totalSpent: 150,
  };

  console.log("📱 用户: 你好！有什么商品？");
  // 首次调用：传入 messages + initialState（初始化用户状态）
  // 这里的 ...initialState 会将 userId, userName, cart, totalSpent 传入 Agent
  // Agent 内部会将这些值存储到状态中，并通过 checkpointer 持久化
  const response1 = await agent.invoke({
    messages: [{ role: "user", content: "你好！有什么商品？" }],
    ...initialState,
  }, config);
  console.log("🤖 助手:", response1.messages.at(-1)?.content);
  console.log("\n---\n");

  // ============================================================================
  // 后续调用说明：
  // ============================================================================
  // 由于配置了 checkpointer 和相同的 thread_id，后续调用无需再传入状态字段。
  // checkpointer 会自动从存储中恢复该线程的完整状态（包括 userId, cart 等）。
  // 这就是"短期记忆"的核心机制：状态在同一线程的多次调用间自动保持。
  // ============================================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invokeWithMessages = (content: string) => agent.invoke({
    messages: [{ role: "user", content }],
  } as any, config);

  console.log("📱 用户: 帮我加一个 iPhone 和 2 个 AirPods 到购物车");
  const response2 = await invokeWithMessages("帮我加一个 iPhone 和 2 个 AirPods 到购物车");
  console.log("🤖 助手:", response2.messages.at(-1)?.content);
  console.log("🛒 当前购物车:", JSON.stringify(response2.cart, null, 2));
  console.log("\n---\n");

  console.log("📱 用户: 我的购物车里有什么？我之前总共消费了多少？");
  const response3 = await invokeWithMessages("我的购物车里有什么？我之前总共消费了多少？");
  console.log("🤖 助手:", response3.messages.at(-1)?.content);
  console.log("\n---\n");

  console.log("📱 用户: 我要结账");
  const response4 = await invokeWithMessages("我要结账");
  console.log("🤖 助手:", response4.messages.at(-1)?.content);
  console.log("💰 新的累计消费:", response4.totalSpent);
  console.log("🛒 结账后购物车:", JSON.stringify(response4.cart, null, 2));
  console.log("\n---\n");

  console.log("📱 用户: 我叫什么名字？我总共花了多少钱？");
  const response5 = await invokeWithMessages("我叫什么名字？我总共花了多少钱？");
  console.log("🤖 助手:", response5.messages.at(-1)?.content);

  console.log("\n✅ === 演示完成 ===\n");
  console.log("演示的核心功能:");
  console.log("1. ✅ 从工具读取状态 (get_user_info)");
  console.log("2. ✅ 从工具写入状态 (add_to_cart, checkout)");
  console.log("3. ✅ 自定义状态架构 (userId, cart, totalSpent)");
  console.log("4. ✅ 跨对话轮次的记忆持久化");
  console.log("5. ✅ 消息修剪中间件管理上下文窗口");
}

main().catch(console.error);
