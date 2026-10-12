import { useState } from 'react';
import { Button } from '@ui5/webcomponents-react';
import '@ui5/webcomponents-icons/dist/ai.js';
import '@ui5/webcomponents-icons/dist/decline.js';
import { useChat } from '../context/ChatContext.jsx';
import ChatPanel from '../components/ChatPanel.jsx';

export default function ChatPage() {
  const [chatOpen, setChatOpen] = useState(false);
  const { sendChat } = useChat();

  return (
    <div className="appPage">
      {/* Hero banner — branding and intro text */}
      <div className="appHero">
        <div className="appHeroInner">
          <div className="appHeroTitle">SAP Success Stories</div>
          <div className="appHeroSub">Describe your use case and find the most relevant SAP customer stories powered by AI</div>
        </div>
      </div>

      {/* Main content area — shown when chat is closed */}
      <div className="appContent">
        <div className="appInner">
          <div className="appLanding">
            <div className="appLandingIcon">🔍</div>
            <div className="appLandingTitle">Find stories that match your challenge</div>
            <div className="appLandingText">
              Use the chat assistant to describe your business challenge or digital transformation goal.
              The agent will search over 400 real SAP customer stories and surface the most relevant ones for your use case.
            </div>
            <Button
              design="Emphasized"
              icon="ai"
              className="appStartBtn"
              onClick={() => setChatOpen(true)}
            >
              Start searching
            </Button>
          </div>
        </div>
      </div>

      {/* Floating action button — toggles the chat panel */}
      <Button
        className="chatFab"
        design={chatOpen ? 'Negative' : 'Emphasized'}
        icon={chatOpen ? 'decline' : 'ai'}
        onClick={() => setChatOpen(v => !v)}
        tooltip="Find success stories"
      >
        {chatOpen ? 'Close' : 'Find Stories'}
      </Button>

      {chatOpen && <ChatPanel />}
    </div>
  );
}
