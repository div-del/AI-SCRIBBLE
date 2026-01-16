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
    // Use port 3001 as agreed
    // Use port 3001 as agreed
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001', {
      transports: ['websocket'], // Force websocket to avoid 308 redirects with polling
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to backend');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from backend');
    });

    newSocket.on('roomJoined', (data) => {
      console.log('Joined room:', data);
      // Could update explicit player list if needed, but scoreboard covers it mostly
    });

    newSocket.on('roundStarted', (data) => {
      // data: { round: number, drawer: string }
      // Backend doesn't send timeLimit/wordHint/etc in start event clearly in code?
      // Checking backend: io.to(roomId).emit('roundStarted', { round: newRound, drawer: drawerId === 'ai' ? 'AI' : room.players.get(drawerId)?.name });
      // newRound object in backend has: id, drawerId, word, guesses, startTime
      // We need to sync timeLimit (default 60s?), wordHint (from word).
      const roundData = data.round;
      setCurrentRound(data.round.id || 1);
      // Drawer logic
      // if drawer is AI, set special AI player?
      const drawerName = data.drawer;
      setCurrentDrawer({ id: roundData.drawerId, name: drawerName, isAI: roundData.drawerId === 'ai' });

      setTimeLeft(60); // Default or from config? Backend doesn't seem to emit it.
      setWordHint('_ '.repeat(roundData.word.length)); // Naive hint
      setIsRoundActive(true);

      useGameStore.getState().clearRoundState();
    });

    newSocket.on('timerUpdate', (timeLeft: number) => {
      setTimeLeft(timeLeft);
    });

    newSocket.on('drawingReady', (data) => {
      // data: { drawer: 'AI', svg: string, pngBase64: string }
      if (data.svg) {
        useGameStore.getState().setCurrentImage(data.svg);
      } else if (data.pngBase64) {
        useGameStore.getState().setCurrentImage(data.pngBase64);
      }
    });

    // newGuess: { playerId, playerName, guess, isCorrect }
    newSocket.on('newGuess', (data) => {
      addMessage({
        type: data.isCorrect ? 'correct' : 'guess',
        playerId: data.playerId,
        playerName: data.playerName || 'Unknown',
        text: data.guess,
        timestamp: Date.now(),
      });
      if (data.isCorrect) {
        // Maybe show a special notification or toast?
      }
    });

    // scoreboard: ScoreboardEntry[]
    newSocket.on('scoreboard', (data) => {
      updateScoreboard(data);
    });

    newSocket.on('roundEnded', (data) => {
      setIsRoundActive(false);
      addMessage({
        type: 'system',
        playerId: 'system',
        playerName: 'System',
        text: 'Round Ended.',
        timestamp: Date.now(),
      });
    });

    // AI Guess event
    newSocket.on('aiGuess', (data) => {
      addMessage({
        type: data.isCorrect ? 'correct' : 'guess',
        playerId: 'ai',
        playerName: `AI (${data.model})`,
        text: `I guess it's ${data.guess}!`,
        timestamp: Date.now()
      });
    });

    newSocket.on('gameReset', () => {
      addMessage({
        type: 'system',
        playerId: 'system',
        playerName: 'System',
        text: 'Game has been reset.',
        timestamp: Date.now()
      });
      useGameStore.getState().resetGame();
    });

    newSocket.on('roomError', (msg) => {
      console.error('Room Error:', msg);
      alert(`Room Error: ${msg}`); // Simple alert for now
    });

    newSocket.on('roundError', (msg) => {
      console.error('Round Error:', msg);
      alert(`Round Error: ${msg}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleStartGame = (playerName: string) => {
    if (socket) {
      // Hardcoded room for now as per original intention or random
      const roomId = "test-room";
      socket.emit('joinRoom', { roomId, playerName });
      startGame(playerName);
    }
  };

  const handleStartRound = () => {
    if (socket) {
      // Starts the game loop
      socket.emit('startRound', { roomId: "test-room" });
    }
  };

  const handleResetGame = () => {
    if (socket) {
      socket.emit('resetGame', { roomId: "test-room" });
    }
  };

  const handleSubmitGuess = (guess: string) => {
    if (socket) {
      socket.emit('playerGuess', { roomId: "test-room", guess }); // Backend expects playerGuess matches listener
      submitGuess(guess);
    }
  };

  return {
    socket,
    isConnected,
    startGame: handleStartGame,
    startRound: handleStartRound,
    resetGame: handleResetGame,
    submitGuess: handleSubmitGuess,
  };
};