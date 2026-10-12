"""Discovery Center MCP server — exposes SAP customer success story search as MCP tools via FastMCP.

Run modes:
  stdio (default, for MCP clients):  python discovery_center_mcp_server.py
  HTTP  (for remote clients):        python discovery_center_mcp_server.py --http
"""

import sys

from dotenv import find_dotenv, load_dotenv
from mcp.server.fastmcp import FastMCP

# Import the actual REST logic, keeping tool declarations thin (same pattern as rpt1_mcp_server.py)
from discovery_center_tools import (
    get_latest_stories as _get_latest_stories,
    list_all_stories as _list_all_stories,
    search_success_stories as _search_success_stories,
)

load_dotenv(find_dotenv())

# Connecting to MCP for the Discovery Center via FastMCP
mcp = FastMCP(
    "SAP Customer Success Stories",
    instructions=(
        "Search SAP customer success stories from the SAP.com customer stories catalogue. "
        "Use search_success_stories to find relevant stories by use case or customer name. "
        "Use get_latest_stories to retrieve the most recently added stories. "
        "Use list_all_stories to browse all available stories, optionally with a limit."
    ),
)


@mcp.tool()
def search_success_stories(
    use_case_description: str,
    customer_name: str | None = None,
    top: int = 3,
) -> list[dict]:
    """Find the top SAP customer success stories that best match a described use case.

    Fetches stories from the SAP.com customer stories catalogue and ranks them by
    keyword overlap. Optionally filter by customer name before scoring.

    Args:
        use_case_description: Natural language description of the customer use case,
            e.g. "invoice automation" or "document AI".
        customer_name: Optional customer name to restrict results to, e.g. "Amadeus".
        top: Maximum number of stories to return (default 3).

    Returns:
        List of dicts, each with keys:
            - Id: unique story identifier
            - CustomerName: company name
            - Description: use case summary
            - Products: pipe-delimited SAP products used
            - ContentLink: SAP Discovery Center URL
    """
    return _search_success_stories(
        use_case_description=use_case_description,
        customer_name=customer_name,
        top=top,
    )


@mcp.tool()
def list_all_stories(limit: int | None = None) -> list[dict]:
    """Return SAP customer success stories without ranking.

    Use this when you need to browse all available stories or when the use case
    is too broad for semantic search to be meaningful.

    Args:
        limit: Maximum number of stories to return. If omitted, returns all stories.

    Returns:
        List of dicts with keys: Id, CustomerName, Title, Description, Products, ContentLink.
    """
    return _list_all_stories(limit=limit)


@mcp.tool()
def get_latest_stories(top: int = 10) -> list[dict]:
    """Return the most recently added SAP customer success stories.

    Args:
        top: Number of stories to return (default 10).

    Returns:
        List of dicts with keys: Id, CustomerName, Title, Description, Products, ContentLink, ImportedAt.
    """
    return _get_latest_stories(top=top)


if __name__ == "__main__":
    transport = "streamable-http" if "--http" in sys.argv else "stdio"
    mcp.run(transport=transport)
