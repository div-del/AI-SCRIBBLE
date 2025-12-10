interface Props {
  timeLeft: number;
}

export default function GameTimer({ timeLeft }: Props) {
  const percentage = (timeLeft / 120) * 100;

  const getColor = () => {
    if (timeLeft > 60) return 'bg-green-500';
    if (timeLeft > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
      <div
        className={`h-4 rounded-full transition-all duration-1000 ${getColor()}`}
        style={{ width: `${percentage}%` }}
      />
      <div className="text-center text-2xl font-bold mt-2">
        {timeLeft}s
      </div>
    </div>
  );
}