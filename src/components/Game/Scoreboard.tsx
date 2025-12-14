import { ScoreboardEntry } from '@/types';

interface Props {
  entries: ScoreboardEntry[];
  currentDrawerId?: string;
}

export default function Scoreboard({ entries, currentDrawerId }: Props) {
  const sortedEntries = [...entries].sort((a, b) => a.rank - b.rank);

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Leaderboard
      </h3>
      <div className="space-y-3">
        {sortedEntries.map((entry) => (
          <div
            key={entry.playerId}
            className={`flex justify-between items-center p-3 rounded-xl backdrop-blur-sm border transition-all duration-200 ${
              entry.playerId === currentDrawerId
                ? 'bg-purple-500/30 border-purple-400/50 shadow-lg'
                : 'bg-white/10 border-white/20 hover:bg-white/15'
            }`}
          >
            <div className="flex items-center">
              <span className={`text-sm font-bold mr-3 px-2 py-1 rounded-full ${
                entry.rank === 1 ? 'bg-yellow-500 text-black' :
                entry.rank === 2 ? 'bg-gray-400 text-black' :
                entry.rank === 3 ? 'bg-orange-600 text-white' :
                'bg-white/20 text-white'
              }`}>
                #{entry.rank}
              </span>
              <span className="font-medium text-white">{entry.name}</span>
              {entry.playerId === currentDrawerId && (
                <svg className="w-4 h-4 ml-2 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
            </div>
            <span className="text-white font-bold">{entry.currentPoints} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}