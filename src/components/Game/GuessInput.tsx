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
    <div>
      <label className="block text-sm font-medium text-white mb-3">Your Guess</label>
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your guess..."
          disabled={isDisabled}
          className="flex-1 px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={isDisabled || !input.trim()}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          🎯 Guess
        </button>
      </div>
    </div>
  );
}