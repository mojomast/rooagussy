import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './RagChat.module.css';

interface Source {
  title: string;
  url: string;
  section: string;
  relevance: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp: Date;
}

interface ChatResponse {
  answer: string;
  sources: Source[];
  conversationId: string;
}

const STORAGE_KEY = 'roo-rag-chat';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function loadSession(): { conversationId: string | null; messages: Message[] } {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        conversationId: data.conversationId || null,
        messages: (data.messages || []).map((m: Message) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      };
    }
  } catch {
    // Ignore storage errors
  }
  return { conversationId: null, messages: [] };
}

function saveSession(conversationId: string | null, messages: Message[]): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ conversationId, messages })
    );
  } catch {
    // Ignore storage errors
  }
}

export default function RagChat(): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load session on mount
  useEffect(() => {
    const session = loadSession();
    setConversationId(session.conversationId);
    setMessages(session.messages);
  }, []);

  // Save session on change
  useEffect(() => {
    saveSession(conversationId, messages);
  }, [conversationId, messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Use environment variable for API URL, fallback to same host as current page
      const apiBaseUrl = (import.meta as any).env?.VITE_RAG_API_URL ||
        `http://${window.location.hostname}:3001`;
      const response = await fetch(`${apiBaseUrl}/rag/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedInput,
          ...(conversationId && { conversationId }),
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      setConversationId(data.conversationId);

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.titleIcon}>💬</span>
          Ask about Roo Code
        </h1>
        <p className={styles.subtitle}>
          Get answers from the documentation powered by AI
        </p>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className={styles.clearButton}
            aria-label="Clear conversation"
          >
            Clear Chat
          </button>
        )}
      </div>

      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🦘</div>
            <h2>Welcome to Roo Code Documentation Chat</h2>
            <p>Ask me anything about Roo Code!</p>
            <div className={styles.suggestions}>
              <p>Try asking:</p>
              <ul>
                <li>How do I install Roo Code?</li>
                <li>What are custom modes?</li>
                <li>How do I configure an API provider?</li>
                <li>What MCP servers can I use?</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map(message => (
              <div
                key={message.id}
                className={`${styles.message} ${styles[message.role]}`}
              >
                <div className={styles.messageContent}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageRole}>
                      {message.role === 'user' ? '👤 You' : '🦘 Roo'}
                    </span>
                    <span className={styles.messageTime}>
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={styles.messageText}>
                    {message.content}
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <div className={styles.sources}>
                      <span className={styles.sourcesLabel}>📚 Sources:</span>
                      <ul className={styles.sourcesList}>
                        {message.sources.map((source, idx) => (
                          <li key={idx}>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {source.title}
                              {source.section && ` › ${source.section}`}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className={`${styles.message} ${styles.assistant}`}>
                <div className={styles.messageContent}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageRole}>🦘 Roo</span>
                  </div>
                  <div className={styles.loadingDots}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className={styles.inputContainer}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about Roo Code..."
          className={styles.input}
          rows={1}
          disabled={isLoading}
          aria-label="Chat message input"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className={styles.sendButton}
          aria-label="Send message"
        >
          {isLoading ? '...' : '→'}
        </button>
      </div>
    </div>
  );
}
