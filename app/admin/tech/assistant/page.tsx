'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import { ChatMessage } from '@/types';
import {
  Send,
  User,
  Loader2,
  Sparkles,
  ArrowLeft,
  Wrench,
  Thermometer,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

const SUGGESTIONS = [
  'AC not cooling — compressor running, fan running, but warm air',
  'Walk-in freezer alarm, temperature rising, compressor short cycling',
  'Furnace 3 flashes on control board, what does that mean?',
  'How do I check superheat and subcooling on a TXV system?',
  'Capacitor testing — how to check with a multimeter',
  'Mini split error code E1 on Mitsubishi — what do I check?',
  'Ice machine not making ice, water flowing but no freeze cycle',
  'How to properly evacuate and charge a system after coil replacement',
];

export default function TechAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const allMessages = [...messages, { role: 'user', content: userMessage }];
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, bot: 'tech' }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantMessage += decoder.decode(value);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantMessage };
          return updated;
        });
      }
    } catch (error) {
      console.error('Tech bot error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <Link
          href="/admin/tech"
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 border border-red-200">
          <Sparkles className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900">Tech Assistant</h2>
          <p className="text-xs text-gray-500">GPT-5.4 HVAC & Refrigeration troubleshooting</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 py-4 -mx-1 px-1">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-50 border border-red-200 mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Tech Assistant</h2>
            <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
              Your AI troubleshooting partner. Describe symptoms, error codes, or ask diagnostic questions.
            </p>

            {/* Quick category buttons */}
            <div className="flex justify-center gap-2 mb-4">
              <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                <Thermometer className="w-3 h-3" /> HVAC
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold">
                <Wrench className="w-3 h-3" /> Refrigeration
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold">
                <Zap className="w-3 h-3" /> Electrical
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
                <AlertTriangle className="w-3 h-3" /> Error Codes
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto px-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-3 py-2.5 text-sm bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-lg text-gray-700 transition-colors border border-red-200 text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-2xl px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-sm sm:text-base ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
              {message.role === 'user' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-red-600" />
            </div>
            <div className="bg-gray-100 px-4 py-3 rounded-2xl">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-gray-200">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the problem or ask a question..."
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={!input.trim() || isLoading}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
