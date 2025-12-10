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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-center mb-4">🏆 Final Rankings</h2>
        <div className="space-y-3">
          {rankings.map((ranking) => (
            <div
              key={ranking.playerId}
              className="flex justify-between items-center p-3 bg-gray-50 rounded"
            >
              <span className="font-medium">
                {getRankEmoji(ranking.rank)} {ranking.name}
              </span>
              <span className="text-gray-600">{ranking.totalPoints} pts</span>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}