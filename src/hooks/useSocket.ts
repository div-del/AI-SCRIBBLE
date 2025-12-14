import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '@/store/gameStore';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const {
    startGame,
    submitGuess,
    addDrawCommand,
    addMessage,
    updateScoreboard,
    setTimeLeft,
    setWordHint,
    setCurrentRound,
    setCurrentDrawer,
    setIsRoundActive,
    endGame,
  } = useGameStore();

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001');

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to backend');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from backend');
    });

    newSocket.on('round_start', (data) => {
      setCurrentRound(data.round);
      setCurrentDrawer(data.drawer);
      setTimeLeft(data.timeLimit);
      setWordHint(data.wordHint);
      setIsRoundActive(true);
      // Clear previous draw commands
      useGameStore.getState().drawCommands = [];
    });

    newSocket.on('draw_command', (data) => {
      addDrawCommand(data);
    });

    newSocket.on('guess_submitted', (data) => {
      addMessage({
        type: 'guess',
        playerId: data.playerId,
        playerName: data.playerName,
        text: data.guess,
        timestamp: Date.now(),
      });
    });

    newSocket.on('correct_guess', (data) => {
      addMessage({
        type: 'correct',
        playerId: data.playerId,
        playerName: data.playerName,
        text: `Correct! +${data.points} pts`,
        timestamp: Date.now(),
      });
    });

    newSocket.on('scoreboard_update', (data) => {
      updateScoreboard(data.scoreboard);
    });

    newSocket.on('round_end', (data) => {
      setIsRoundActive(false);
      addMessage({
        type: 'system',
        playerId: 'system',
        playerName: 'System',
        text: `Round ${data.round} ended. Word was: ${data.word}`,
        timestamp: Date.now(),
      });
    });

    newSocket.on('game_end', (data) => {
      endGame(data.finalRankings);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleStartGame = (playerName: string) => {
    if (socket) {
      socket.emit('start_game', { playerName });
      startGame(playerName);
    }
  };

  const handleSubmitGuess = (guess: string) => {
    if (socket) {
      socket.emit('submit_guess', { guess });
      submitGuess(guess);
    }
  };

  return {
    socket,
    isConnected,
    startGame: handleStartGame,
    submitGuess: handleSubmitGuess,
  };
};