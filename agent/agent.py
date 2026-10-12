import logging
import os
from collections import defaultdict, deque

from dotenv import find_dotenv, load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_litellm import ChatLiteLLM
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

import mcp_client_connector

load_dotenv(find_dotenv())

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are an SAP expert who helps customers find relevant success stories "
    "from the SAP Discovery Center. When a user describes a business challenge or use case, "
    "call search_success_stories with their description.\n\n"
    "OUTPUT: Respond ONLY with valid JSON — no markdown fences, no extra text:\n"
    '{"summary":"<1-2 sentence intro about the results>","stories":['
    '{"company":"<CustomerName>","title":"<Title>","description":"<Description>",'
    '"products":["<product1>","<product2>"],"relevance":"<1 sentence why relevant to the query>"}'
    "]}\n\n"
    "Rules:\n"
    "- Split pipe-delimited Products strings into individual array items.\n"
    "- Do NOT include ContentLink or any URLs anywhere in your output.\n"
    "- Do not invent stories — only use data the tool returns.\n"
    "- If no stories are found, return: {\"summary\":\"No matching stories found.\",\"stories\":[]}"
)

_mcp_client = None


class SuccessStoriesAgent:
    SUPPORTED_CONTENT_TYPES = ["text", "text/plain"]
    MAX_HISTORY_MESSAGES = 100

    def __init__(self, model: str = os.getenv("AICORE_MODEL", "gpt-4.1-mini")):
        self.llm = ChatLiteLLM(
            model=model,
            max_tokens=500,
            api_base=os.getenv("LITELLM_BASE_URL"),
            api_key=os.getenv("LITELLM_API_KEY"),
            custom_llm_provider="openai",
        )
        self.graph = None
        self._history: dict[str, deque] = defaultdict(lambda: deque(maxlen=self.MAX_HISTORY_MESSAGES))

    async def _build_graph(self) -> StateGraph:
        global _mcp_client

        if _mcp_client is None:
            _mcp_client = await mcp_client_connector.get_mcp_client()
            logger.info("MCP client initialized")

        mcp_tools = await _mcp_client.get_tools()
        logger.info("Loaded %d MCP tools: %s", len(mcp_tools), [t.name for t in mcp_tools])

        llm_with_tools = self.llm.bind_tools(mcp_tools)

        async def call_model(state: MessagesState):
            return {"messages": [await llm_with_tools.ainvoke(state["messages"])]}

        builder = StateGraph(MessagesState)
        builder.add_node("model", call_model)
        builder.add_node("tools", ToolNode(mcp_tools))
        builder.add_edge(START, "model")
        builder.add_conditional_edges("model", tools_condition, {"tools": "tools", END: END})
        builder.add_edge("tools", "model")
        return builder.compile()

    async def ainvoke(self, query: str, context_id: str) -> dict:
        if self.graph is None:
            self.graph = await self._build_graph()

        try:
            self._history[context_id].append(HumanMessage(content=query))
            messages = [SystemMessage(content=SYSTEM_PROMPT), *self._history[context_id]]
            result = await self.graph.ainvoke({"messages": messages})
            assistant_msg = result["messages"][-1]
            self._history[context_id].append(assistant_msg)
            return {"is_task_complete": True, "require_user_input": False, "content": assistant_msg.content}

        except Exception:
            logger.exception("Error processing request")
            return {"is_task_complete": True, "require_user_input": False, "content": "Sorry, something went wrong. Please try again."}
