import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import {
  createRoom, getRoom, addPlayerToRoom, removePlayerFromRoom,
  startNewRound, setDrawing, recordGuess, endCurrentRound, getScoreboard,
  resetGame, nextTurn, startRoundTimer, stopRoundTimer, Player
} from './gameManager';
import { generateSVGDrawing, guessFromImage } from './aiService';

const PORT = process.env.PORT || 3000;

// Check for required environment variable on startup
if (!process.env.VERCEL_AI_GATEWAY_TOKEN) {
  console.error('FATAL: VERCEL_AI_GATEWAY_TOKEN environment variable not set.');
  process.exit(1);
}

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://ai-scribble-kjbf.vercel.app',
      'https://ai-scribble-kjbf-git-main-nameetas-projects.vercel.app',
      /^https:\/\/.*\.vercel\.app$/
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// --- HTTP API ---

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.status(200).send({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/rooms', (req: Request, res: Response) => {
  try {
    const { roomId } = req.body;
    if (!roomId) {
      return res.status(400).send({ error: 'Room ID is required.' });
    }
    const room = createRoom(roomId);
    res.status(201).send({ message: `Room ${roomId} created.`, room: { id: room.id, status: room.status } });
  } catch (error) {
    res.status(409).send({ error: error instanceof Error ? error.message : 'Could not create room.' });
  }
});

// --- Socket.IO Game Logic ---

io.on('connection', (socket: Socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Tracks the room the player is currently in
  let currentRoomId: string | null = null;

  socket.on('joinRoom', ({ roomId, playerName }: { roomId: string, playerName: string }) => {
    if (!roomId || !playerName) {
      return socket.emit('roomError', 'Room ID and player name are required.');
    }

    // Auto-create room for testing simplicity
    if (!getRoom(roomId)) {
      console.log(`Auto-creating room ${roomId}`);
      createRoom(roomId);
    }

    try {
      const players = addPlayerToRoom(roomId, socket.id, playerName);
      currentRoomId = roomId;

      socket.join(roomId);
      console.log(`${playerName} (${socket.id}) joined room ${roomId}`);

      // Broadcast updated player list and scoreboard
      io.to(roomId).emit('playerList', players);
      io.to(roomId).emit('scoreboard', getScoreboard(roomId));
      socket.emit('roomJoined', { roomId, players });
    } catch (error) {
      console.error(`Error joining room ${roomId}:`, error);
      socket.emit('roomError', error instanceof Error ? error.message : 'Failed to join room.');
    }
  });

  socket.on('startRound', ({ roomId }: { roomId: string }) => {
    // This is now "Start Game" effectively
    startNextRoundAuto(roomId);
  });

  socket.on('resetGame', ({ roomId }: { roomId: string }) => {
    try {
      const room = resetGame(roomId);
      io.to(roomId).emit('gameReset', room);
      io.to(roomId).emit('scoreboard', getScoreboard(roomId));
    } catch (error) {
      socket.emit('roomError', 'Failed to reset game.');
    }
  });

  /* 
   * Anti-Duplicate Mechanism:
   * Track if a round is currently transitioning to prevent double-starts.
   */
  const activeRoundTransitions = new Set<string>();

  const startNextRoundAuto = (roomId: string) => {
    if (activeRoundTransitions.has(roomId)) {
      console.log(`Round transition already active for room ${roomId}. Skipping duplicate call.`);
      return;
    }
    activeRoundTransitions.add(roomId);

    // Delay before next round
    setTimeout(async () => {
      const next = nextTurn(roomId);
      if (!next) return;

      try {
        // Simple word selection (in production, use a library or AI to generate words)
        const words = ["cat", "dog", "sun", "tree", "house", "car", "robot", "alien", "pizza", "dragon"];
        const randomWord = words[Math.floor(Math.random() * words.length)];

        const newRound = startNewRound(roomId, next.drawerId, randomWord, next.modelId || 'mock');

        // Only simple drawer name needed for frontend
        const drawerName = next.drawerId.startsWith('ai-') ?
          (getRoom(roomId)?.players.get(next.drawerId)?.name || 'AI') :
          (getRoom(roomId)?.players.get(next.drawerId)?.name || 'Player');

        io.to(roomId).emit('roundStarted', { round: newRound, drawer: drawerName });

        // If AI, generate drawing
        if (next.drawerId.startsWith('ai-')) {
          const { svg, pngBase64 } = await generateSVGDrawing(next.modelId, randomWord);
          setDrawing(roomId, svg, pngBase64!);
          io.to(roomId).emit('drawingReady', {
            drawer: drawerName,
            svg: svg,
            pngBase64: pngBase64
          });
        } else {
          // Player turn notification
          io.to(roomId).emit('drawingInstruction', { word: randomWord });
        }

        // Start the timer
        startRoundTimer(roomId, {
          onTick: (timeLeft) => {
            io.to(roomId).emit('timerUpdate', timeLeft);
          },
          onTimeUp: () => {
            const endedRound = endCurrentRound(roomId);
            io.to(roomId).emit('roundEnded', { round: endedRound, reason: 'Time is up!' });
            io.to(roomId).emit('scoreboard', getScoreboard(roomId));
            startNextRoundAuto(roomId);
          },
          onAIGuess: (playerId, guess) => {
            const room = getRoom(roomId);
            if (!room) return;

            const { correct } = recordGuess(roomId, playerId, guess);
            const player = room.players.get(playerId);

            // Broadcast masking logic: 
            // 1. To the guesser (AI doesn't care, but for consistency): see full message
            // 2. To others: if correct, see "****" or "Guessed the word!"

            // For now, simple masking for everyone if it's correct (since AI logic is server side)
            // But wait, user needs to see *their own* correct guess? 
            // For AI guesses, we usually just show them. But user wants to HIDE them if correct.
            // If AI guesses correctly, we should show "AI (Gemini) guessed the word!"

            if (correct) {
              io.to(roomId).emit('newGuess', {
                playerId: playerId,
                playerName: player?.name,
                guess: "Guessed the word!", // Masked
                isCorrect: true
              });
              io.to(roomId).emit('scoreboard', getScoreboard(roomId));
            } else {
              io.to(roomId).emit('newGuess', {
                playerId: playerId,
                playerName: player?.name,
                guess: guess,
                isCorrect: false
              });
            }

            // Check end condition (same logic as playerGuess)
            const numPlayers = Array.from(room.players.values()).filter(p => !(p as any).isAI).length;
            const correctGuessesCount = room.currentRound?.guesses.filter(g => g.correct).length || 0;

            // Allow round to continue for a bit or end if everyone (even AI) has guessed? 
            // For AI battle, we just wait for time usually, but if everyone guessed we can speed up.
            // Let's just keep the time running for AI battles to let others guess, unless ALL have guessed.
          }
        });

      } catch (error) {
        console.error(`Error starting auto-round:`, error);
      } finally {
        activeRoundTransitions.delete(roomId);
      }
    }, 5000); // 5 second cool-down
  };

  socket.on('playerGuess', ({ roomId, guess }: { roomId: string, guess: string }) => {
    const room = getRoom(roomId);
    if (!room || !room.currentRound) return;

    try {
      const { correct } = recordGuess(roomId, socket.id, guess);
      const player = room.players.get(socket.id);

      // Special handling: Send explicit confirmation to the GUESSER, masked to others
      // Since socket.emit only goes to sender, and io.to goes to room.

      if (correct) {
        // To everyone else: "Player guessed correctly"
        socket.broadcast.to(roomId).emit('newGuess', {
          playerId: socket.id,
          playerName: player?.name,
          guess: "Guessed the word!",
          isCorrect: true
        });

        // To the guesser: "You guessed the word! (word)"
        socket.emit('newGuess', {
          playerId: socket.id,
          playerName: "You",
          guess: `Yesss! The word was ${guess}`,
          isCorrect: true
        });

        io.to(roomId).emit('scoreboard', getScoreboard(roomId));
      } else {
        // Standard wrong guess broadcast
        io.to(roomId).emit('newGuess', {
          playerId: socket.id,
          playerName: player?.name,
          guess: guess,
          isCorrect: false
        });
      }

      // Check end condition
      const numPlayers = Array.from(room.players.values()).filter(p => !(p as any).isAI).length; // Real players only?
      // Or just check matches. Logic: if everyone guessed (minus drawer?)
      const correctGuessesCount = room.currentRound.guesses.filter(g => g.correct).length;

      // Simple rule: if at least one person guessed right, end round quickly? 
      // Or wait for all? Skribbl.io waits for everyone or time limit.
      // For now, let's auto-end if *everyone* guessed.
      if (correctGuessesCount > 0 && correctGuessesCount >= numPlayers) {
        const endedRound = endCurrentRound(roomId);
        io.to(roomId).emit('roundEnded', { round: endedRound, reason: 'Round Ended' });
        io.to(roomId).emit('scoreboard', getScoreboard(roomId));

        // Trigger next round
        startNextRoundAuto(roomId);
      }

    } catch (error) {
      console.error(`Error processing guess in room ${roomId}:`, error);
    }
  });

  socket.on('askAIToGuess', async ({ roomId, imageType }: { roomId: string, imageType: 'svg' | 'png' }) => {
    const room = getRoom(roomId);
    if (!room || !room.currentRound) return socket.emit('roundError', 'No active round to ask AI to guess.');

    try {
      // Use the PNG base64 URL for the multimodal model
      const imageRef = room.currentRound.pngBase64;
      if (!imageRef) return socket.emit('roundError', 'No drawing image available for AI guessing.');

      // TODO: Replace with a multimodal model ID that supports image input
      const aiGuessModel = 'vercel-ai/google/gemini-1.5-flash';
      const aiGuess = await guessFromImage(aiGuessModel, imageRef);

      const isCorrect = aiGuess === room.currentRound.word;

      io.to(roomId).emit('aiGuess', {
        guess: aiGuess,
        isCorrect: isCorrect,
        correctWord: room.currentRound.word,
        model: aiGuessModel
      });

    } catch (error) {
      console.error(`Error asking AI to guess in room ${roomId}:`, error);
      socket.emit('roundError', `AI Guessing Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoomId) {
      const players = removePlayerFromRoom(currentRoomId, socket.id);
      console.log(`Player disconnected: ${socket.id} from room ${currentRoomId}`);
      io.to(currentRoomId).emit('playerList', players);
      io.to(currentRoomId).emit('scoreboard', getScoreboard(currentRoomId));

      // TODO: Handle room cleanup if empty
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`\n🎉 AI Scribble Backend running on http://localhost:${PORT}`);
  console.log(`Health check at http://localhost:${PORT}/health`);
  console.log(`Socket.IO listening for connections.`);
});
