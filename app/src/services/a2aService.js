// A2A JSON-RPC 2.0 + SSE client — mirrors the pattern from SCOREwithSAP/a2aService.js
const AGENT_BASE = '/api/agent';

function rpcId() { return 'rpc-' + Date.now() + '-' + Math.floor(Math.random() * 10000); }
function msgId() { return 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 10000); }

function extractText(task) {
  if (task.artifacts?.length) {
    for (const artifact of task.artifacts) {
      for (const part of artifact.parts || []) {
        if (part.kind === 'text' && part.text) return part.text;
      }
    }
  }
  const msg = task.status?.message;
  if (msg?.parts) {
    for (const part of msg.parts) {
      if (part.kind === 'text' && part.text) return part.text;
    }
  }
  return '';
}

// Fetch the agent card — used to check agent availability
export async function getAgentCard() {
  const resp = await fetch(AGENT_BASE + '/.well-known/agent.json');
  if (!resp.ok) throw new Error('Agent card request failed: ' + resp.status);
  return resp.json();
}

// Blocking message/send — fallback when SSE is unavailable
export async function sendMessage(text, contextId) {
  const params = {
    message: { kind: 'message', messageId: msgId(), role: 'user', parts: [{ kind: 'text', text }] },
    configuration: { blocking: true }
  };
  if (contextId) params.message.contextId = contextId;
  const resp = await fetch(AGENT_BASE + '/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: rpcId(), method: 'message/send', params })
  });
  if (!resp.ok) throw new Error('Agent request failed (' + resp.status + ')');
  const data = await resp.json();
  if (data.error) throw new Error('[A2A error ' + data.error.code + '] ' + data.error.message);
  const task = data.result;
  return { text: extractText(task), contextId: task.contextId || contextId || '', taskId: task.id || '' };
}

// Streaming message/stream via SSE — falls back to sendMessage if unavailable
export async function streamMessage(text, contextId, onChunk) {
  const params = {
    message: { kind: 'message', messageId: msgId(), role: 'user', parts: [{ kind: 'text', text }] }
  };
  if (contextId) params.message.contextId = contextId;

  let resp;
  try {
    resp = await fetch(AGENT_BASE + '/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: rpcId(), method: 'message/stream', params })
    });
  } catch {
    const result = await sendMessage(text, contextId);
    onChunk(result.text, true, result.contextId);
    return { contextId: result.contextId };
  }

  const contentType = resp.headers.get('content-type') || '';
  if (!resp.ok || !resp.body || !contentType.includes('text/event-stream')) {
    const result = await sendMessage(text, contextId);
    onChunk(result.text, true, result.contextId);
    return { contextId: result.contextId };
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalContextId = contextId || '';
  let isDoneFired = false;
  let lastArtifactText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const event = JSON.parse(raw);
        const result = event.result;
        if (!result) continue;
        if (result.contextId) finalContextId = result.contextId;
        if (result.status?.state === 'working') {
          const statusText = extractText({ status: result.status });
          if (statusText) onChunk(statusText, false, finalContextId);
        }
        if (result.artifact) {
          const t = extractText({ artifacts: [result.artifact] });
          if (t) {
            lastArtifactText = t;
            if (result.artifact.lastChunk === true) {
              isDoneFired = true;
              onChunk(t, true, finalContextId);
            } else {
              onChunk(t, false, finalContextId);
            }
          }
        }
        if (result.status?.state === 'completed' && !isDoneFired) {
          const t = extractText(result) || lastArtifactText;
          isDoneFired = true;
          onChunk(t, true, finalContextId);
        }
      } catch { /* malformed SSE event — skip */ }
    }
  }

  if (!isDoneFired) {
    const result2 = await sendMessage(text, contextId);
    onChunk(result2.text, true, result2.contextId);
    return { contextId: result2.contextId };
  }
  return { contextId: finalContextId };
}
