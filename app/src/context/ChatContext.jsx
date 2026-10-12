import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import * as a2a from '../services/a2aService.js';

function parseAgentContent(raw) {
  try {
    // strip optional ```json ... ``` fences the LLM sometimes adds
    const text = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && 'stories' in parsed) {
      return { content: parsed.summary || '', stories: parsed.stories ?? [] };
    }
  } catch {}
  return { content: raw, stories: null };
}



const initState = {
  messages: [],
  contextId: null,
  isLoading: false,
  statusMessage: '',
  agentStatus: 'Offline'
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_AGENT_STATUS':   return { ...state, agentStatus: action.status };
    case 'SET_LOADING':        return { ...state, isLoading: action.value };
    case 'SET_STATUS_MSG':     return { ...state, statusMessage: action.msg };
    case 'SET_CONTEXT':        return { ...state, contextId: action.id };
    case 'APPEND_USER':        return { ...state, messages: [...state.messages, { role: 'user', content: action.text }] };
    case 'APPEND_AGENT':       return { ...state, messages: [...state.messages, { role: 'agent', content: '' }] };
    case 'UPDATE_LAST_AGENT': {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'agent') msgs[msgs.length - 1] = { ...last, content: action.content };
      else msgs.push({ role: 'agent', content: action.content });
      return { ...state, messages: msgs };
    }
    case 'NEW_THREAD': return { ...initState, agentStatus: state.agentStatus };
    default: return state;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initState);

  // Check agent availability on mount
  useEffect(() => {
    a2a.getAgentCard()
      .then(() => dispatch({ type: 'SET_AGENT_STATUS', status: 'Online' }))
      .catch(() => dispatch({ type: 'SET_AGENT_STATUS', status: 'Offline' }));
  }, []);

  const sendChat = useCallback(async (text) => {
    dispatch({ type: 'APPEND_USER', text });
    dispatch({ type: 'SET_LOADING', value: true });
    dispatch({ type: 'SET_STATUS_MSG', msg: 'Searching stories…' });

    try {
      let finalResponse = '';
      const { contextId } = await a2a.streamMessage(text, state.contextId, (chunk, isDone, ctxId) => {
        if (isDone) {
          finalResponse = chunk;
        } else {
          dispatch({ type: 'SET_STATUS_MSG', msg: chunk });
        }
        if (ctxId) dispatch({ type: 'SET_CONTEXT', id: ctxId });
      });
      dispatch({ type: 'UPDATE_LAST_AGENT', content: finalResponse });
      if (contextId) dispatch({ type: 'SET_CONTEXT', id: contextId });
    } catch (err) {
      dispatch({ type: 'UPDATE_LAST_AGENT', content: 'Error: ' + err.message });
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
      dispatch({ type: 'SET_STATUS_MSG', msg: '' });
    }
  }, [state.contextId]);

  const newThread = useCallback(() => dispatch({ type: 'NEW_THREAD' }), []);

  const refreshStatus = useCallback(() => {
    a2a.getAgentCard()
      .then(() => dispatch({ type: 'SET_AGENT_STATUS', status: 'Online' }))
      .catch(() => dispatch({ type: 'SET_AGENT_STATUS', status: 'Offline' }));
  }, []);

  return (
    <ChatContext.Provider value={{ ...state, sendChat, newThread, refreshStatus }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() { return useContext(ChatContext); }
