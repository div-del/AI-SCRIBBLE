import { FinalRanking } from '@/types';

interface Props {
  rankings: FinalRanking[];
  isOpen: boolean;
  onClose: () => void;
}

const getRankEmoji = (rank: number) => {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return `#${rank}`;
  }
};

export default function FinalRankingsModal({ rankings, isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">🏆 Final Rankings</h2>
          <p className="text-purple-200">Game Complete!</p>
        </div>
        <div className="space-y-3 mb-6">
          {rankings.map((ranking) => (
            <div
              key={ranking.playerId}
              className="flex justify-between items-center p-4 rounded-xl backdrop-blur-sm border border-white/20 bg-white/5"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">
                  {getRankEmoji(ranking.rank)}
                </span>
                <span className="font-semibold text-white text-lg">{ranking.name}</span>
              </div>
              <span className="text-white font-bold text-xl">{ranking.totalPoints} pts</span>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105"
        >
          🎮 Play Again
        </button>
      </div>
    </div>
  );
}