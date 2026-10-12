import logging
import os

from langchain_mcp_adapters.client import MultiServerMCPClient

logger = logging.getLogger(__name__)


async def get_mcp_client() -> MultiServerMCPClient:
    config = {
        "discovery_center": {
            "transport": "stdio",
            "command": "python",
            "args": ["mcp/discovery_center_mcp_server.py"],
            "cwd": os.path.dirname(__file__),
            "env": {**os.environ},
        }
    }

    mcp_url = os.getenv("DISCOVERY_CENTER_MCP_URL")
    if mcp_url:
        config["discovery_center"] = {"transport": "streamable_http", "url": mcp_url}

    return MultiServerMCPClient(config)
