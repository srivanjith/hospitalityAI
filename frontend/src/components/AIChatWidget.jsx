import { useState, useRef, useEffect } from 'react';
import { BrainCircuit, X, Send, ChevronDown, Sparkles, Bot, User, Loader2, MessageSquare } from 'lucide-react';
import api from '../services/api';

const QUICK_PROMPTS = [
  "What is today's occupancy rate?",
  "Which department needs more staff?",
  "Show me this week's revenue trend",
  "Are there any staffing shortages?",
  "What's our peak booking period?",
  "explain about our hotel experiance",
];

const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}>
      {/* Avatar */}
      {isUser ? (
        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-luxury-navy dark:bg-slate-700 text-white">
          <User className="w-3.5 h-3.5" />
        </div>
      ) : (
        <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 shadow-sm">
          <img src="/chatbot-logo.png" alt="AI Chatbot Logo" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Bubble */}
      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
        isUser
          ? 'bg-luxury-navy dark:bg-slate-700 text-white rounded-tr-sm'
          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-sm'
      }`}>
        {msg.content}
      </div>
    </div>
  );
};

// ─── Typing indicator ───────────────────────────────────────────────
const TypingIndicator = () => (
  <div className="flex gap-2.5 items-start">
    <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 shadow-sm">
      <img src="/chatbot-logo.png" alt="AI Chatbot Logo" className="w-full h-full object-cover" />
    </div>
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
      <div className="flex gap-1.5 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

// ─── Main Widget ────────────────────────────────────────────────────
const AIChatWidget = ({ currentPage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hello! I'm HospitalityAI Assistant. I have access to your live hotel data — bookings, occupancy, staff schedules, and forecasts.\n\nAsk me anything about your hotel's performance!",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async (text) => {
    const messageText = (text || inputValue).trim();
    if (!messageText || isLoading) return;

    setInputValue('');
    setError('');

    // Add user message
    const newMessages = [...messages, { role: 'user', content: messageText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Build conversation history for context (exclude first greeting)
      const conversationHistory = newMessages
        .slice(1) // skip the greeting
        .slice(-8) // last 8 messages
        .map(m => ({ role: m.role, content: m.content }));

      const data = await api.aiChat(messageText, currentPage, conversationHistory);

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ]);
    } catch (err) {
      const errMsg = err.message || 'Something went wrong. Please try again.';
      setError(errMsg);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ ${errMsg}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat cleared! How can I help you with your hotel operations?",
      },
    ]);
    setError('');
  };

  return (
    <>
      {/* ─── Floating Trigger Button ─── */}
      {!isOpen && (
        <button
          id="ai-chat-trigger"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-white dark:bg-slate-800 border-2 border-amber-500/20 shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group p-1"
          title="Open AI Assistant"
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 flex items-center justify-center">
            <img src="/chatbot-logo.png" alt="AI Chatbot Logo" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
          </div>
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-25 pointer-events-none" />
        </button>
      )}

      {/* ─── Chat Panel ─── */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 transition-all duration-300 overflow-hidden ${
            isMinimized ? 'w-72 h-14' : 'w-96 h-[580px]'
          }`}
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-luxury-navy to-slate-800 dark:from-slate-800 dark:to-slate-900 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white overflow-hidden flex items-center justify-center shadow-inner border border-slate-700/50">
                <img src="/chatbot-logo.png" alt="AI Chatbot Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-none">HospitalityAI</p>
                <p className="text-amber-300 text-[10px] leading-none mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Live data connected
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-[10px] font-medium px-2"
                title="Clear chat"
              >
                Clear
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* ── Messages Area ── */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                {messages.map((msg, idx) => (
                  <MessageBubble key={idx} msg={msg} />
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Quick Prompts ── */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <p className="w-full text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Suggested questions
                  </p>
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(prompt)}
                      disabled={isLoading}
                      className="text-xs px-2.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Input Area ── */}
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
                {error && (
                  <p className="text-xs text-red-500 mb-2 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-lg">
                    ⚠️ {error}
                  </p>
                )}
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    id="ai-chat-input"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder="Ask about occupancy, staff, revenue…"
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all disabled:opacity-60"
                    style={{ maxHeight: '80px', overflowY: 'auto' }}
                    onInput={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
                    }}
                  />
                  <button
                    id="ai-chat-send"
                    onClick={() => sendMessage()}
                    disabled={isLoading || !inputValue.trim()}
                    className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-md"
                  >
                    {isLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />
                    }
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                  Powered by Groq • llama-3.3-70b-versatile
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
