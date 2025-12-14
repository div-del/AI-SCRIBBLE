import { Player } from '@/types';

interface Props {
  round: number;
  drawer: Player | null;
  wordLength: number;
}

export default function RoundHeader({ round, drawer, wordLength }: Props) {
  const generateWordHint = (length: number) => {
    return '_ '.repeat(length).trim();
  };

  return (
    <div className="text-center">
      <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 mb-4">
        <svg className="w-5 h-5 mr-2 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-white font-semibold">Round {round}/6</span>
      </div>
      {drawer && (
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white mb-2">{drawer.name} is drawing...</h2>
          <div className="inline-block bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-6 py-3">
            <div className="text-xl font-mono text-white tracking-wider">
              {generateWordHint(wordLength)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}