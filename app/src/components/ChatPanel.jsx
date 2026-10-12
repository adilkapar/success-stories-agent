import { Button, Dialog, List, ListItemStandard } from '@ui5/webcomponents-react';
import { useChat } from '../context/ChatContext.jsx';
import '@ui5/webcomponents-icons/dist/paper-plane.js';
import '@ui5/webcomponents-icons/dist/overflow.js';
import { useRef, useEffect, useState } from 'react';
import { BusyIndicator, TextArea } from '@ui5/webcomponents-react';

const SUGGESTIONS = [
  { icon: '🧾', text: 'Show me stories about invoice automation' },
  { icon: '🔗', text: 'Which companies improved supply chain with SAP BTP?' },
  { icon: '🛍️', text: 'Examples of SAP Integration Suite in retail' },
  { icon: '🏭', text: 'How did manufacturers use SAP to reduce costs?' },
  { icon: '👥', text: 'Stories about HR transformation with SAP SuccessFactors' },
  { icon: '☁️', text: 'Companies that moved to SAP S/4HANA in the cloud' },
  { icon: '📊', text: 'Examples of SAP Analytics Cloud in finance' },
  { icon: '🤝', text: 'Which companies used SAP to improve customer experience?' },
];

function mdToHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br/>');
}

export default function ChatPanel() {
  const { messages, isLoading, statusMessage, agentStatus, sendChat } = useChat();
  const [inputText, setInputText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const isOnline = agentStatus === 'Online';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusMessage]);

  function handleSend() {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText('');
    sendChat(text);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSuggestionClick(suggestion) {
    setDialogOpen(false);
    sendChat(suggestion);
  }

  return (
    <div className="chatShell">
      <div className="chatHeader">
        <div className="chatHeaderLeft">
          <div className="chatHeaderLogo">SAP</div>
          <div>
            <div className="chatHeaderTitle">Success Stories Agent</div>
            <span className={'chatAgentStatus ' + (isOnline ? 'online' : 'offline')}>
              <span className="chatAgentDot" />
              {agentStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="chatMessages">
        <div className="chatThread">
          {messages.length === 0 && (
            <div className="chatEmpty">
              <div className="chatEmptyBadge">🔍</div>
              <div className="chatEmptyTitle">Find SAP customer success stories</div>
              <div className="chatEmptyText">
                Describe your business challenge and I'll surface the most relevant SAP customer stories for you.
              </div>
              <div className="chatSuggestions">
                {SUGGESTIONS.slice(0, 6).map((s, i) => (
                  <div key={i} className="chatSuggestionCard" onClick={() => !isLoading && sendChat(s.text)}>
                    <span className="chatSuggestionIcon">{s.icon}</span>
                    {s.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={'chatBubble ' + (msg.role === 'user' ? 'chatBubbleUser' : 'chatBubbleAI')}>
              {msg.role === 'agent'
                ? <span dangerouslySetInnerHTML={{ __html: mdToHtml(msg.content) }} />
                : msg.content}
            </div>
          ))}

          {isLoading && (
            <div className="chatBubbleLoading">
              <BusyIndicator active size="S" />
              {statusMessage && <span className="chatStatus">{statusMessage}</span>}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="chatInputArea">
        <div className="chatInputInner">
          <TextArea
            className="chatInput"
            placeholder="Describe your use case, e.g. 'automate invoice processing'…"
            value={inputText}
            rows={1}
            growing
            growingMaxRows={5}
            onInput={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <Button
            icon="paper-plane"
            design="Emphasized"
            className="chatSendBtn"
            onClick={handleSend}
            disabled={isLoading || !inputText.trim()}
            tooltip="Send"
          />
          <Button
            design="Default"
            className="chatMoreBtn"
            onClick={() => setDialogOpen(true)}
            tooltip="Example prompts"
          >
            ...
          </Button>
        </div>
      </div>

      <div className="chatDisclaimer">Powered by SAP BTP · Results based on semantic similarity</div>

      <Dialog
        open={dialogOpen}
        headerText="Example prompts"
        onClose={() => setDialogOpen(false)}
        style={{ width: 'min(580px, 90vw)' }}
      >
        <List onItemClick={e => handleSuggestionClick(e.detail.item.dataset.text)}>
          {SUGGESTIONS.map((s, i) => (
            <ListItemStandard key={i} data-text={s.text} style={{ whiteSpace: 'normal', paddingBlock: '10px' }}>{s.icon} {s.text}</ListItemStandard>
          ))}
        </List>
        <div slot="footer" style={{ padding: '8px 16px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button design="Transparent" onClick={() => setDialogOpen(false)}>Close</Button>
        </div>
      </Dialog>
    </div>
  );
}
