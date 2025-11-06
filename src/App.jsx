import React, { useState, useRef, useEffect } from 'react';
import { Send, Plane, Clock, User, Wifi, AlertTriangle, Menu, X } from 'lucide-react';
import './App.css';

// Import Indigo logo - make sure to place indigo-logo.png in src/assets
import indigoLogo from './assets/indigo-logo.png';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check server health on component mount
  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      setConnectionStatus('connecting');
      const response = await fetch('/api/health');
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        const errorMessage = {
          id: Date.now() + 1,
          type: 'error',
          content: `Error: ${data.error}`,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
        const assistantMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: data.summary?.summary || 'No summary available',
          rawData: data,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: `Failed to connect to server. Please make sure the backend is running. Error: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
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

  const clearChat = () => {
    setMessages([]);
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="status-icon connected" size={16} />;
      case 'connecting':
        return <Clock className="status-icon connecting" size={16} />;
      case 'error':
        return <AlertTriangle className="status-icon error" size={16} />;
      default:
        return <Wifi className="status-icon disconnected" size={16} />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected to FlightOps';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const quickQuestions = [
    "Show me basic info for flight 6E 215",
    "What equipment was used on flight 6E 101?",
    "Get delay summary for flight 6E 215",
    "Show fuel summary for flight 6E 304",
    "Check passenger info for flight 6E 512"
  ];

  const handleQuickQuestion = (question) => {
    setInput(question);
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={indigoLogo} alt="Indigo Airlines" className="indigo-logo" />
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        {sidebarOpen && (
          <div className="sidebar-content">
            <div className="welcome-section">
              <h3>Welcome to Indigo FlightOps!</h3>
              <p>Your intelligent assistant for flight operations data.</p>
            </div>

            <div className="quick-questions">
              <h4>Quick Questions</h4>
              <div className="question-buttons">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    className="question-btn"
                    onClick={() => handleQuickQuestion(question)}
                    disabled={isLoading}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            <div className="flight-info">
              <h4>Flight Data Available</h4>
              <ul>
                <li>✓ Basic Flight Information</li>
                <li>✓ Aircraft Equipment Details</li>
                <li>✓ Operation Times & Delays</li>
                <li>✓ Fuel Consumption Data</li>
                <li>✓ Passenger Information</li>
                <li>✓ Crew Connections</li>
              </ul>
            </div>

            <div className="connection-status">
              <div className="status-indicator">
                {getStatusIcon()}
                <span>{getStatusText()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className={`main-content ${!sidebarOpen ? 'expanded' : ''}`}>
        <header className="app-header">
          <div className="header-content">
            <div className="logo">
              <Plane className="logo-icon" size={24} />
              <h1>Indigo FlightOps Assistant</h1>
            </div>
            <div className="status">
              {getStatusIcon()}
              <span className="status-text">{getStatusText()}</span>
            </div>
          </div>
        </header>

        <div className="chat-container">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                <img src={indigoLogo} alt="Indigo Airlines" className="empty-logo" />
                <h2>Welcome to Indigo FlightOps Assistant</h2>
                <p>Ask me about flight information, equipment details, delays, fuel data, and more for Indigo Airlines flights.</p>
                <div className="example-queries">
                  <h4>Try asking about:</h4>
                  <div className="example-cards">
                    <div className="example-card">
                      <Plane size={20} />
                      <span>Flight 6E 215 basic info</span>
                    </div>
                    <div className="example-card">
                      <Clock size={20} />
                      <span>Delays for flight 6E 304</span>
                    </div>
                    <div className="example-card">
                      <User size={20} />
                      <span>Passenger count on 6E 512</span>
                    </div>
                    <div className="example-card">
                      <Wifi size={20} />
                      <span>Aircraft equipment details</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`message ${message.type}`}>
                  <div className="message-header">
                    <div className="message-sender">
                      {message.type === 'user' ? (
                        <User size={16} />
                      ) : message.type === 'error' ? (
                        <AlertTriangle size={16} />
                      ) : (
                        <Plane size={16} />
                      )}
                      <span>
                        {message.type === 'user' ? 'You' : 
                         message.type === 'error' ? 'Error' : 'FlightOps Assistant'}
                      </span>
                    </div>
                    <span className="message-time">{message.timestamp}</span>
                  </div>
                  <div className="message-content">
                    {message.content}
                  </div>
                  {message.rawData && message.rawData.plan && (
                    <div className="message-tools">
                      <details>
                        <summary>Tools Used ({message.rawData.plan.length})</summary>
                        <div className="tools-list">
                          {message.rawData.plan.map((step, index) => (
                            <div key={index} className="tool-item">
                              <strong>{step.tool}</strong>
                              {step.arguments && Object.keys(step.arguments).length > 0 && (
                                <div className="tool-args">
                                  {Object.entries(step.arguments).map(([key, value]) => (
                                    <span key={key} className="tool-arg">
                                      {key}: {String(value)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="message assistant">
                <div className="message-header">
                  <div className="message-sender">
                    <Plane size={16} />
                    <span>FlightOps Assistant</span>
                  </div>
                </div>
                <div className="message-content loading">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-container">
            <div className="input-wrapper">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about Indigo flight information, equipment, delays, fuel data..."
                disabled={isLoading}
                rows={1}
              />
              <button 
                onClick={sendMessage} 
                disabled={!input.trim() || isLoading}
                className="send-button"
              >
                <Send size={18} />
              </button>
            </div>
            {messages.length > 0 && (
              <button onClick={clearChat} className="clear-button">
                Clear Chat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;