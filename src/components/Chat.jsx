import { useState, useRef, useEffect } from 'react';
import './Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input, id: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentStreamingMessage('');

    try {
      const response = await fetch('http://localhost:8001/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          thread_id: 'default',
          run_id: `run-${Date.now()}`,
          messages: [...messages, userMessage].map(msg => ({
            id: msg.id.toString(),
            role: msg.role,
            content: msg.content
          })),
          tools: []
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let messageId = null;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              
              if (eventData.type === 'TEXT_MESSAGE_START') {
                messageId = eventData.message_id || eventData.messageId;
              } else if (eventData.type === 'TEXT_MESSAGE_CONTENT') {
                assistantMessage += eventData.delta;
                setCurrentStreamingMessage(assistantMessage);
              } else if (eventData.type === 'TEXT_MESSAGE_END') {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: assistantMessage,
                  id: messageId || Date.now()
                }]);
                setCurrentStreamingMessage('');
              } else if (eventData.type === 'RUN_ERROR') {
                console.error('Run error:', eventData.message);
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: `Error: ${eventData.message}`,
                  id: Date.now()
                }]);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Request failed:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        id: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="logo-container">
          {/* <img 
            src="Indigo-logo.png" 
            alt="IndiGo Airlines" 
            className="airline-logo"
          /> */}
          <h2>FlightOps Assistant</h2>
        </div>
        <div className="sidebar-info">
          <p>Welcome to IndiGo FlightOps!</p>
          <p>Ask me about:</p>
          <ul>
            <li>Flight status</li>
            <li>Delay information</li>
            <li>Equipment details</li>
            <li>Fuel summaries</li>
            <li>Passenger info</li>
            <li>Crew details</li>
          </ul>
        </div>
      </div>

      <div className="chat-main">
        <div className="messages-container">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-content">
                {msg.content}
              </div>
            </div>
          ))}
          
          {currentStreamingMessage && (
            <div className="message assistant streaming">
              <div className="message-content">
                {currentStreamingMessage}
                <span className="cursor">▊</span>
              </div>
            </div>
          )}
          
          {isLoading && !currentStreamingMessage && (
            <div className="message assistant">
              <div className="message-content typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about flights... (e.g., 'delay info for 6E 215 on 2024-11-04')"
            disabled={isLoading}
            rows="1"
          />
          <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;