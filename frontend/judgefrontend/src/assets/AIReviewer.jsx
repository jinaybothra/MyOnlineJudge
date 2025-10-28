import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function AIReviewer({ code, language, selectedProblem, isVisible, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I\'m Claude, your AI Code Reviewer. I can help you with:\n\n• **Code review** - Get detailed feedback on your solution\n• **Bug detection** - Find and fix issues in your code\n• **Optimization** - Improve performance and efficiency\n• **Algorithm explanation** - Understand how your code works\n• **Best practices** - Learn industry standards\n\nWhat would you like help with today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    { 
      label: '🔍 Review Code', 
      prompt: 'Please review my code and provide detailed feedback on:\n- Code quality and readability\n- Potential bugs or issues\n- Time and space complexity\n- Suggestions for improvement'
    },
    { 
      label: '🐛 Find Bugs', 
      prompt: 'Can you help me identify any bugs, edge cases I might have missed, or potential runtime errors in my code?'
    },
    { 
      label: '⚡ Optimize', 
      prompt: 'How can I optimize this code for better time and space complexity? Please suggest specific improvements.'
    },
    { 
      label: '📖 Explain Logic', 
      prompt: 'Can you explain the algorithm and logic behind this code step by step?'
    },
  ];

  async function handleSend(customPrompt = null) {
    const userMessage = customPrompt || input.trim();
    if (!userMessage) return;

    const newMessages = [
      ...messages,
      { role: 'user', content: userMessage }
    ];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8080/api/ai-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          problem: selectedProblem?.statement || '',
          userMessage,
          conversationHistory: newMessages
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: data.response }
        ]);
      } else {
        setMessages([
          ...newMessages,
          { 
            role: 'assistant', 
            content: `❌ ${data.error || 'Sorry, I couldn\'t process your request. Please try again.'}`
          }
        ]);
      }
    } catch (error) {
      console.error('AI Review error:', error);
      setMessages([
        ...newMessages,
        { 
          role: 'assistant', 
          content: '❌ Error connecting to AI service. Please check your internet connection and try again.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleQuickAction(action) {
    handleSend(action.prompt);
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: 100 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: 100 }}
      transition={{ type: 'spring', duration: 0.5 }}
      className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <div className="w-3 h-3 bg-green-400 rounded-full animate-ping absolute top-0 left-0" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Gemini AI</h3>
            <p className="text-xs text-purple-100">Code Reviewer</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-white/20 rounded-full p-2 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none shadow-md'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
              }`}
            >
              <div 
                className="text-sm whitespace-pre-wrap prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: msg.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>')
                    .replace(/\n/g, '<br/>')
                }}
              />
            </div>
          </motion.div>
        ))}
        
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white text-gray-800 border border-gray-200 p-4 rounded-2xl rounded-bl-none shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-3 bg-white border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
              className="text-xs px-3 py-2 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 rounded-lg hover:from-purple-100 hover:to-blue-100 transition disabled:opacity-50 font-medium border border-purple-200"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your code..."
            disabled={isLoading}
            rows={1}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 resize-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </motion.div>
  );
}

export default AIReviewer;