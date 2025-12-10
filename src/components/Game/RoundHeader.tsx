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
    <div className="text-center mb-4">
      <h2 className="text-2xl font-bold mb-2">Round {round}/6</h2>
      {drawer && (
        <p className="text-lg mb-2">{drawer.name} is drawing...</p>
      )}
      <p className="text-xl font-mono bg-gray-100 p-2 rounded">
        {generateWordHint(wordLength)}
      </p>
    </div>
  );
}