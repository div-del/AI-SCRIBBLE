import { ScoreboardEntry } from '@/types';

interface Props {
  entries: ScoreboardEntry[];
  currentDrawerId?: string;
}

export default function Scoreboard({ entries, currentDrawerId }: Props) {
  const sortedEntries = [...entries].sort((a, b) => a.rank - b.rank);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Scoreboard</h3>
      <div className="space-y-2">
        {sortedEntries.map((entry) => (
          <div
            key={entry.playerId}
            className={`flex justify-between items-center p-2 rounded ${
              entry.playerId === currentDrawerId ? 'bg-blue-100' : 'bg-gray-50'
            }`}
          >
            <span className="font-medium">
              #{entry.rank} {entry.name}
            </span>
            <span className="text-gray-600">{entry.currentPoints} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}