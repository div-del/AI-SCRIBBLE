import { useEffect, useRef } from 'react';
import { Message } from '@/types';

interface Props {
  messages: Message[];
}

export default function ChatFeed({ messages }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getMessageStyle = (type: Message['type']) => {
    switch (type) {
      case 'correct':
        return 'text-green-600 font-semibold';
      case 'system':
        return 'text-blue-600 italic';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Chat
      </h3>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-2"
      >
        {messages.map((message, index) => (
          <div key={index} className={`p-3 rounded-xl backdrop-blur-sm border ${
            message.type === 'correct'
              ? 'bg-green-500/20 border-green-400/30 text-green-100'
              : message.type === 'system'
              ? 'bg-blue-500/20 border-blue-400/30 text-blue-100'
              : 'bg-white/10 border-white/20 text-white'
          }`}>
            <div className="text-sm">
              <span className="font-semibold">{message.playerName}:</span> {message.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}