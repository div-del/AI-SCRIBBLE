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
    <div className="flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto p-4 space-y-2 bg-gray-50"
      >
        {messages.map((message, index) => (
          <div key={index} className={`text-sm ${getMessageStyle(message.type)}`}>
            <span className="font-medium">{message.playerName}:</span> {message.text}
          </div>
        ))}
      </div>
    </div>
  );
}