import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSocket } from '@/hooks/useSocket';
import DrawingCanvas from '@/components/Canvas/DrawingCanvas';
import GuessInput from '@/components/Game/GuessInput';
import ChatFeed from '@/components/Game/ChatFeed';
import Scoreboard from '@/components/Game/Scoreboard';
import GameTimer from '@/components/Game/GameTimer';
import RoundHeader from '@/components/Game/RoundHeader';
import FinalRankingsModal from '@/components/Game/FinalRankingsModal';

export default function GamePage() {
  const [playerName, setPlayerName] = useState('');
  const { socket, isConnected, startGame, submitGuess } = useSocket();
  const {
    gameStarted,
    currentRound,
    currentDrawer,
    scoreboard,
    messages,
    drawCommands,
    timeLeft,
    wordHint,
    finalRankings,
    isRoundActive,
  } = useGameStore();

  const handleStartGame = () => {
    if (playerName.trim()) {
      startGame(playerName.trim());
    }
  };

  const handleGuessSubmit = (guess: string) => {
    submitGuess(guess);
  };

  const handleCloseModal = () => {
    // Reset game
    useGameStore.getState().resetGame();
  };

  if (!gameStarted && finalRankings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-6">AI Drawing Game</h1>
          <div className="space-y-4">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleStartGame}
              disabled={!playerName.trim() || !isConnected}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isConnected ? 'Start Game' : 'Connecting...'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <RoundHeader round={currentRound} drawer={currentDrawer} wordLength={wordHint.split(' ').length} />
        <GameTimer timeLeft={timeLeft} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <DrawingCanvas commands={drawCommands} />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Scoreboard entries={scoreboard} currentDrawerId={currentDrawer?.id} />
            <div className="bg-white rounded-lg shadow h-64">
              <ChatFeed messages={messages} />
            </div>
            <GuessInput
              onSubmit={handleGuessSubmit}
              isDisabled={!isRoundActive || currentDrawer?.isAI === false}
            />
          </div>
        </div>
      </div>

      <FinalRankingsModal
        rankings={finalRankings}
        isOpen={finalRankings.length > 0}
        onClose={handleCloseModal}
      />
    </div>
  );
}