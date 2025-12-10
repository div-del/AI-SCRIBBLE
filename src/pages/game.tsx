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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">AI Scribble</h1>
            <p className="text-purple-200">Draw, Guess, Compete with AI!</p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm"
              />
            </div>
            <button
              onClick={handleStartGame}
              disabled={!playerName.trim() || !isConnected}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isConnected ? '🎮 Start Game' : '🔄 Connecting...'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-4">
          <RoundHeader round={currentRound} drawer={currentDrawer} wordLength={wordHint.split(' ').length} />
          <div className="flex justify-center mt-4">
            <GameTimer timeLeft={timeLeft} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-2xl">
              <DrawingCanvas commands={drawCommands} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-2xl">
              <Scoreboard entries={scoreboard} currentDrawerId={currentDrawer?.id} />
            </div>
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-2xl h-80">
              <ChatFeed messages={messages} />
            </div>
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-2xl">
              <GuessInput
                onSubmit={handleGuessSubmit}
                isDisabled={!isRoundActive || currentDrawer?.isAI === false}
              />
            </div>
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