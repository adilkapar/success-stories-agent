"""SAP customer success stories client — fetches stories from the SAP.com Solr
search endpoint used by https://www.sap.com/about/customer-stories.html.
"""

import json
import logging

from curl_cffi import requests

logger = logging.getLogger(__name__)

_BASE = "https://www.sap.com/bin/sapdx/solrsearch"
_PAGE_SIZE = 100
_HEADERS = {"Referer": "https://www.sap.com/about/customer-stories.html"}
_STATIC_PARAMS = {
    "showEmptyTags": "false",
    "isResourceCenter": "true",
    "highlighting": "false",
    "hideFacets": "true",
    "additionalProcess": "false",
    "showEventInfo": "true",
    "isDateRange": "false",
    "isEventPeriod": "false",
    "fuzzySearch": "false",
    "isFullTextSearch": "false",
    "pageLocale": "en_us",
}
_JSON_BASE = {
    "componentPath": (
        "/content/sapdx/countries/en_us/about/customer-stories/jcr:content/par/"
        "responsivegrid_1151803927/section/section-par/resourcecenterdynamic_copy/"
        "items/item_1594287740507"
    ),
    "search": [],
    "pagePath": "/content/sapdx/countries/en_us/about/customer-stories",
    "isMultiselectSearch": False,
}


def _to_str(value: object) -> str:
    if isinstance(value, list):
        return " ".join(str(v) for v in value if v)
    return str(value) if value else ""


def _parse_story(r: dict) -> dict:
    basic_url = r.get("basicUrl") or ""
    pub_url = r.get("publicUrl") or ""
    title = r.get("title") or r.get("titleNotTokenized") or ""
    if basic_url.startswith("/"):
        content_link = "https://www.sap.com" + basic_url
    elif basic_url.startswith("//"):
        content_link = "https:" + basic_url
    elif basic_url:
        content_link = basic_url
    elif pub_url.startswith("//"):
        content_link = "https:" + pub_url
    else:
        content_link = pub_url
    url_for_id = basic_url or pub_url
    return {
        "Id": url_for_id.rstrip("/").split("/")[-1],
        "CustomerName": title.split(": ")[0] if ": " in title else title,
        "Title": title,
        "Description": r.get("description") or r.get("descriptionNotTokenized") or "",
        "FullText": _to_str(r.get("fullText")),
        "Products": _to_str(r.get("keywords")),
        "ContentLink": content_link,
        "ImportedAt": r.get("pubDate") or r.get("creationDate") or "",
    }


def _fetch_all_stories(
    search_text: str | None = None,
    order_by: str | None = None,
    limit: int | None = None,
) -> list[dict]:
    parts = (order_by or "score desc").split()
    sort_name = "pubDate" if parts[0] == "ImportedAt" else parts[0]
    sort_type = parts[1].lower() if len(parts) > 1 else "desc"
    page_size = min(limit, _PAGE_SIZE) if limit else _PAGE_SIZE
    stories: list[dict] = []
    total: int | None = None

    for page in range(1, 10_000):
        body = {**_JSON_BASE, "page": page, "pageCount": page_size, "sortName": sort_name, "sortType": sort_type}
        if search_text:
            body["searchText"] = search_text
        params = {**_STATIC_PARAMS, "json": json.dumps(body, separators=(",", ":"))}

        resp = requests.get(_BASE, headers=_HEADERS, params=params, impersonate="chrome120", timeout=30)
        resp.raise_for_status()
        data = resp.json()

        if total is None:
            total = data.get("count", 0)

        results = data.get("results", [])
        if not results:
            break

        stories.extend(_parse_story(r) for r in results)

        if (limit and len(stories) >= limit) or len(results) < page_size or (total and len(stories) >= total):
            break

    # Deduplicate: Solr can return the same story under multiple index paths
    seen: set[str] = set()
    unique = [s for s in stories if not (s["Title"] in seen or seen.add(s["Title"]))]  # type: ignore[func-returns-value]
    return unique[:limit] if limit else unique


_STOPWORDS = {"a", "an", "the", "in", "of", "to", "and", "or", "for", "with", "on", "at", "by", "is", "are", "was", "were", "be", "as", "it", "its"}


def _for_output(stories: list[dict]) -> list[dict]:
    return [{k: v for k, v in s.items() if k != "FullText"} for s in stories]


def _score(story: dict, terms: list[str]) -> int:
    haystack = " ".join([
        story.get("CustomerName", ""),
        story.get("Title", ""),
        story.get("Description", ""),
        story.get("FullText", ""),
        story.get("Products", ""),
    ]).lower()
    signal = [t for t in terms if t not in _STOPWORDS and len(t) > 2]
    return sum(1 for t in signal if t in haystack)


def search_success_stories(
    use_case_description: str,
    customer_name: str | None = None,
    top: int = 3,
) -> list[dict]:
    """Find the top SAP customer success stories that best match a described use case.

    When customer_name is given, filters server-side by name then ranks by use case.
    Otherwise passes the use case directly to Solr for single-request relevance search.

    Args:
        use_case_description: Natural language description of the customer use case.
        customer_name: Optional customer name to filter by (e.g. "Amadeus").
        top: Maximum number of stories to return (default 3).

    Returns:
        List of dicts with keys: Id, CustomerName, Title, Description, Products, ContentLink.
    """
    try:
        if customer_name:
            stories = _fetch_all_stories(search_text=customer_name, limit=50)
            terms = use_case_description.lower().split()
            ranked = sorted(stories, key=lambda s: _score(s, terms), reverse=True)[:top]
            return _for_output(ranked)
        results = _fetch_all_stories(search_text=use_case_description, limit=top * 3)
        if len(results) < top:
            pool = _fetch_all_stories(limit=500)
            terms = use_case_description.lower().split()
            results = sorted(pool, key=lambda s: _score(s, terms), reverse=True)
        return _for_output(results[:top])
    except Exception as exc:
        logger.error("Discovery Center fetch failed: %s", exc)
        return []


def list_all_stories(limit: int | None = None) -> list[dict]:
    """Return the full catalogue of SAP customer success stories.

    Returns:
        List of dicts with keys: Id, CustomerName, Title, Description, Products, ContentLink.
    """
    try:
        return _for_output(_fetch_all_stories(limit=limit))
    except Exception as exc:
        logger.error("Discovery Center list failed: %s", exc)
        return []


def get_latest_stories(top: int = 10) -> list[dict]:
    """Return the most recently added SAP customer success stories.

    Args:
        top: Number of stories to return (default 10).

    Returns:
        List of dicts with keys: Id, CustomerName, Title, Description, Products, ContentLink, ImportedAt.
    """
    try:
        return _for_output(_fetch_all_stories(order_by="ImportedAt desc", limit=top))
    except Exception as exc:
        logger.error("Discovery Center latest fetch failed: %s", exc)
        return []
