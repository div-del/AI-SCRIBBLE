import { useState, KeyboardEvent } from 'react';

interface Props {
  onSubmit: (guess: string) => void;
  isDisabled?: boolean;
}

export default function GuessInput({ onSubmit, isDisabled = false }: Props) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    const guess = input.trim().toLowerCase();
    if (guess && !isDisabled) {
      onSubmit(guess);
      setInput('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2 p-4 bg-white border-t border-gray-200">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your guess..."
        disabled={isDisabled}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      />
      <button
        onClick={handleSubmit}
        disabled={isDisabled || !input.trim()}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Guess
      </button>
    </div>
  );
}