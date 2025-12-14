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
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
          <path
            d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
          />
          <path
            d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
            fill="none"
            stroke={getColor()}
            strokeWidth="3"
            strokeDasharray={`${percentage}, 100`}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{timeLeft}</div>
            <div className="text-sm text-purple-200">seconds</div>
          </div>
        </div>
      </div>
    </div>
  );
}