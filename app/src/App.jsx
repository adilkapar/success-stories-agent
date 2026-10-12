import { ChatProvider } from './context/ChatContext.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import './styles/app.css';

export default function App() {
  return (
    <ChatProvider>
      <ChatPanel />
    </ChatProvider>
  );
}
