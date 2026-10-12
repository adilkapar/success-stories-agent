# SAP Success Stories Agent

An A2A agent that finds relevant SAP customer success stories from the Discovery Center, with a UI5/React chat interface.

## Setup

### 1. Python environment (Version 3.13)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# If litellm fails to import, pin it to a stable version:
pip install "litellm==1.57.11" "httpx>=0.28.1"
```

### 2. Environment variables

Create a `.env` file inside the `agent/` directory (see `agent/.env.example`):
```bash
cp agent/.env.example agent/.env
```

Set the following values in `agent/.env`:

| Variable | Description |
|---|---|
| `AICORE_MODEL` | LLM model identifier (e.g. `gpt-4.1-mini`) |
| `LITELLM_BASE_URL` | Base URL of your LiteLLM proxy (e.g. `http://localhost:6655/litellm/v1`) |
| `LITELLM_API_KEY` | API key for the LiteLLM proxy |

---

## Running

### Option A — Full stack (agent + UI)

**Terminal 1 — Python agent:**
```bash
source .venv/bin/activate
cd agent
python main.py
# Agent running at http://localhost:10010
```

**Terminal 2 — UI frontend:**
```bash
cd app
npm install   # first time only
npm run dev
# UI running at http://localhost:5173
```

Then open **http://localhost:5173** in your browser and type a use case in the chat.

---

### Option B — Agent only (no UI, curl test)

**Terminal 1 — Python agent:**
```bash
source .venv/bin/activate
cd agent
python main.py
```

**Terminal 2 — Send a query:**
```bash
curl -s -X POST http://localhost:10010/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "message/send",
    "params": {
      "message": {
        "kind": "message",
        "messageId": "msg-1",
        "role": "user",
        "parts": [{"kind": "text", "text": "automate invoice processing"}],
        "configuration": {"blocking": true}
      }
    }
  }' | python3 -m json.tool
```

### Option C — Agent + Joule
Check [Joule README](joule/README.md)

---

## Architecture

```
Browser (UI5/React)
    ↓ HTTP POST /api/agent  (Vite proxy)
A2A Agent — port 10010  (Python / LangGraph)
    ↓ stdio subprocess
MCP Server  (FastMCP)
    ↓ HTTPS
www.sap.com/bin/sapdx/solrsearch  (SAP.com customer stories Solr API)
    ↑
LiteLLM Proxy  (LITELLM_BASE_URL)
    ↑
SAP AI Core  (LLM — e.g. gpt-4.1-mini via Gen AI Hub)
```
